#!/usr/bin/env python3
"""
Generate PostgreSQL CREATE TABLE statements from a MySQL schema.

The script:
1. Connects to MySQL over SSL.
2. Reads every base table with SHOW CREATE TABLE.
3. Converts MySQL DDL to PostgreSQL-friendly DDL.
4. Writes the result to /Users/alt./Desktop/pg_schema.sql.

It does not execute the generated SQL against PostgreSQL.
"""

from __future__ import annotations

import re
import sys
import os
from pathlib import Path
from typing import Iterable


MYSQL_CONFIG = {
    "host": os.environ.get("DB_HOST", "school-db.cd6o8awqe4ig.us-east-2.rds.amazonaws.com"),
    "user": os.environ.get("DB_USER", "admin"),
    "password": os.environ.get("DB_PASSWORD", "School123!aws"),
    "database": os.environ.get("DB_NAME", "school"),
    "port": int(os.environ.get("DB_PORT", "3306")),
    "ssl": True,
}

OUTPUT_PATH = Path(
    os.environ.get(
        "PG_SCHEMA_OUTPUT",
        str(Path(__file__).resolve().parent / "scripts" / "pg_schema.sql"),
    )
)


def connect_mysql():
    """Return a MySQL connection using an available client library."""
    try:
        import pymysql

        return pymysql.connect(
            host=MYSQL_CONFIG["host"],
            user=MYSQL_CONFIG["user"],
            password=MYSQL_CONFIG["password"],
            database=MYSQL_CONFIG["database"],
            port=MYSQL_CONFIG["port"],
            ssl={},
            cursorclass=pymysql.cursors.Cursor,
        )
    except ImportError:
        pass

    try:
        import mysql.connector

        return mysql.connector.connect(
            host=MYSQL_CONFIG["host"],
            user=MYSQL_CONFIG["user"],
            password=MYSQL_CONFIG["password"],
            database=MYSQL_CONFIG["database"],
            port=MYSQL_CONFIG["port"],
            ssl_disabled=not MYSQL_CONFIG["ssl"],
        )
    except ImportError as exc:
        raise SystemExit(
            "Missing MySQL client library. Install either 'PyMySQL' or "
            "'mysql-connector-python' before running this script."
        ) from exc


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def split_items(definition_block: str) -> list[str]:
    """Split the CREATE TABLE inner block on top-level commas."""
    items: list[str] = []
    current: list[str] = []
    depth = 0
    in_single_quote = False
    escape_next = False

    for char in definition_block:
        if escape_next:
            current.append(char)
            escape_next = False
            continue

        if char == "\\" and in_single_quote:
            current.append(char)
            escape_next = True
            continue

        if char == "'" and not escape_next:
            in_single_quote = not in_single_quote
            current.append(char)
            continue

        if not in_single_quote:
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            elif char == "," and depth == 0:
                items.append("".join(current).strip())
                current = []
                continue

        current.append(char)

    tail = "".join(current).strip()
    if tail:
        items.append(tail)
    return items


def extract_create_parts(mysql_create: str) -> tuple[str, str]:
    match = re.match(
        r"CREATE TABLE\s+`(?P<table>[^`]+)`\s*\((?P<body>.*)\)\s*(?P<tail>.*)$",
        mysql_create,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if not match:
        raise ValueError("Could not parse SHOW CREATE TABLE output.")
    return match.group("table"), match.group("body")


def normalize_default_booleans(line: str) -> str:
    replacements = {
        "DEFAULT 0": "DEFAULT FALSE",
        "DEFAULT 1": "DEFAULT TRUE",
        "DEFAULT '0'": "DEFAULT FALSE",
        "DEFAULT '1'": "DEFAULT TRUE",
        "DEFAULT b'0'": "DEFAULT FALSE",
        "DEFAULT b'1'": "DEFAULT TRUE",
    }
    for old, new in replacements.items():
        line = re.sub(old, new, line, flags=re.IGNORECASE)
    return line


def strip_mysql_column_clauses(rest: str) -> str:
    rest = re.sub(
        r"\s+CHARACTER SET\s+\w+",
        "",
        rest,
        flags=re.IGNORECASE,
    )
    rest = re.sub(r"\s+COLLATE\s+\w+", "", rest, flags=re.IGNORECASE)
    rest = re.sub(r"\s+COMMENT\s+'(?:\\'|[^'])*'", "", rest, flags=re.IGNORECASE)
    rest = re.sub(r"\s+ON UPDATE\s+CURRENT_TIMESTAMP(?:\(\d+\))?", "", rest, flags=re.IGNORECASE)
    rest = re.sub(r"\s+UNSIGNED\b", "", rest, flags=re.IGNORECASE)
    rest = re.sub(r"\s+ZEROFILL\b", "", rest, flags=re.IGNORECASE)
    rest = re.sub(r"\s+AUTO_INCREMENT\b", "", rest, flags=re.IGNORECASE)
    rest = re.sub(r"\s+", " ", rest).strip()
    return rest


def convert_mysql_type(mysql_type: str, auto_increment: bool) -> str:
    lower = mysql_type.lower().strip()

    if auto_increment:
        if lower.startswith("bigint"):
            return "BIGSERIAL"
        if lower.startswith("smallint"):
            return "SMALLSERIAL"
        return "SERIAL"

    if re.fullmatch(r"tinyint\s*\(\s*1\s*\)", lower):
        return "boolean"

    mapping_patterns: list[tuple[str, str]] = [
        (r"^int(?:\(\d+\))?$", "integer"),
        (r"^integer$", "integer"),
        (r"^mediumint(?:\(\d+\))?$", "integer"),
        (r"^bigint(?:\(\d+\))?$", "bigint"),
        (r"^smallint(?:\(\d+\))?$", "smallint"),
        (r"^tinyint(?:\(\d+\))?$", "smallint"),
        (r"^datetime(?:\(\d+\))?$", "timestamp"),
        (r"^timestamp(?:\(\d+\))?$", "timestamp"),
        (r"^date$", "date"),
        (r"^time(?:\(\d+\))?$", "time"),
        (r"^(tinytext|mediumtext|longtext|text)$", "text"),
        (r"^json$", "jsonb"),
        (r"^enum\(.+\)$", "text"),
        (r"^set\(.+\)$", "text"),
        (r"^(tinyblob|blob|mediumblob|longblob)$", "bytea"),
    ]

    for pattern, pg_type in mapping_patterns:
        if re.fullmatch(pattern, lower, flags=re.IGNORECASE):
            return pg_type

    return re.sub(r"\s+", " ", mysql_type.strip())


def convert_column_definition(item: str) -> str:
    match = re.match(r"`(?P<name>[^`]+)`\s+(?P<type>[^\s,]+(?:\s*\([^)]+\))?)(?P<rest>.*)$", item, flags=re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse column definition: {item}")

    name = match.group("name")
    mysql_type = match.group("type").strip()
    rest = match.group("rest").strip()
    auto_increment = bool(re.search(r"\bAUTO_INCREMENT\b", rest, flags=re.IGNORECASE))

    pg_type = convert_mysql_type(mysql_type, auto_increment)
    rest = strip_mysql_column_clauses(rest)

    if pg_type.lower() == "boolean":
        rest = normalize_default_booleans(rest)

    line = f"{quote_ident(name)} {pg_type}"
    if rest:
        line += f" {rest}"

    line = re.sub(r"\bDEFAULT NULL\b", "", line, flags=re.IGNORECASE)
    line = re.sub(r"\s+", " ", line).strip()
    return line


def normalize_index_columns(column_block: str) -> str:
    columns = []
    for raw_part in split_items(column_block):
        part = raw_part.strip()
        order = ""
        if part.upper().endswith(" DESC"):
            part = part[:-5].strip()
            order = " DESC"
        elif part.upper().endswith(" ASC"):
            part = part[:-4].strip()
            order = " ASC"

        part = re.sub(r"`([^`]+)`\(\d+\)", r'"\1"', part)
        part = re.sub(r"`([^`]+)`", r'"\1"', part)
        part = re.sub(r"\(\d+\)", "", part)
        columns.append(part + order)
    return ", ".join(columns)


def convert_constraint_or_index(item: str, table_name: str) -> tuple[str | None, list[str]]:
    stripped = item.strip()
    extra_statements: list[str] = []

    if stripped.upper().startswith("PRIMARY KEY"):
        stripped = re.sub(r"\s+USING\s+\w+\s*$", "", stripped, flags=re.IGNORECASE)
        converted = re.sub(r"`([^`]+)`", lambda m: quote_ident(m.group(1)), stripped)
        converted = re.sub(r"\(\s*([^)]+?)\s*\)", lambda m: f"({normalize_index_columns(m.group(1))})", converted, count=1)
        return converted, extra_statements

    unique_match = re.match(
        r"UNIQUE KEY\s+`(?P<name>[^`]+)`\s*\((?P<cols>.+?)\)(?:\s+USING\s+\w+)?(?:\s+COMMENT\s+'.*')?$",
        stripped,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if unique_match:
        name = unique_match.group("name")
        cols = normalize_index_columns(unique_match.group("cols"))
        return f"CONSTRAINT {quote_ident(name)} UNIQUE ({cols})", extra_statements

    key_match = re.match(
        r"(?:KEY|INDEX)\s+`(?P<name>[^`]+)`\s*\((?P<cols>.+?)\)(?:\s+USING\s+\w+)?(?:\s+COMMENT\s+'.*')?$",
        stripped,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if key_match:
        index_name = key_match.group("name")
        cols = normalize_index_columns(key_match.group("cols"))
        extra_statements.append(
            f"CREATE INDEX {quote_ident(index_name)} ON {quote_ident(table_name)} ({cols});"
        )
        return None, extra_statements

    fulltext_match = re.match(
        r"(FULLTEXT|SPATIAL)\s+KEY\s+`(?P<name>[^`]+)`\s*\((?P<cols>.+?)\)(?:\s+COMMENT\s+'.*')?$",
        stripped,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if fulltext_match:
        index_name = fulltext_match.group("name")
        extra_statements.append(
            f"-- Skipped unsupported {fulltext_match.group(1).upper()} index {quote_ident(index_name)} on {quote_ident(table_name)}"
        )
        return None, extra_statements

    foreign_match = re.match(
        r"CONSTRAINT\s+`(?P<name>[^`]+)`\s+FOREIGN KEY\s*\((?P<cols>.+?)\)\s+REFERENCES\s+`(?P<ref_table>[^`]+)`\s*\((?P<ref_cols>.+?)\)(?P<rest>.*)$",
        stripped,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if foreign_match:
        name = foreign_match.group("name")
        cols = normalize_index_columns(foreign_match.group("cols"))
        ref_table = foreign_match.group("ref_table")
        ref_cols = normalize_index_columns(foreign_match.group("ref_cols"))
        rest = re.sub(r"`([^`]+)`", lambda m: quote_ident(m.group(1)), foreign_match.group("rest")).strip()
        extra_statements.append(
            f"ALTER TABLE {quote_ident(table_name)} ADD CONSTRAINT {quote_ident(name)} "
            f"FOREIGN KEY ({cols}) REFERENCES {quote_ident(ref_table)} ({ref_cols})"
            + (f" {rest}" if rest else "")
            + ";"
        )
        return None, extra_statements

    fallback = re.sub(r"`([^`]+)`", lambda m: quote_ident(m.group(1)), stripped)
    return fallback, extra_statements


def convert_create_table(mysql_create: str) -> str:
    table_name, body = extract_create_parts(mysql_create)
    items = split_items(body)

    column_lines: list[str] = []
    extra_statements: list[str] = []

    for item in items:
        stripped = item.strip()
        if not stripped:
            continue
        if stripped.startswith("`"):
            column_lines.append(convert_column_definition(stripped))
            continue

        converted, extras = convert_constraint_or_index(stripped, table_name)
        if converted:
            column_lines.append(converted)
        extra_statements.extend(extras)

    create_sql = (
        f"CREATE TABLE {quote_ident(table_name)} (\n    "
        + ",\n    ".join(column_lines)
        + "\n);"
    )

    statements = [create_sql]
    statements.extend(extra_statements)
    return "\n".join(statements)


def fetch_table_names(cursor) -> list[str]:
    cursor.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
    rows = cursor.fetchall()
    return sorted(row[0] for row in rows)


def fetch_create_statement(cursor, table_name: str) -> str:
    cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
    row = cursor.fetchone()
    return row[1]


def render_output(table_statements: Iterable[str]) -> str:
    header = [
        "-- Generated from MySQL SHOW CREATE TABLE output.",
        "-- Source database: school",
        "-- This file contains PostgreSQL DDL only and is not executed by the script.",
        "",
    ]
    return "\n\n".join(["\n".join(header), *table_statements]).rstrip() + "\n"


def main() -> int:
    connection = connect_mysql()
    try:
        cursor = connection.cursor()
        tables = fetch_table_names(cursor)
        statements = []
        for table_name in tables:
            mysql_create = fetch_create_statement(cursor, table_name)
            statements.append(convert_create_table(mysql_create))

        OUTPUT_PATH.write_text(render_output(statements), encoding="utf-8")
        print(f"Wrote PostgreSQL schema for {len(tables)} tables to {OUTPUT_PATH}")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    sys.exit(main())
