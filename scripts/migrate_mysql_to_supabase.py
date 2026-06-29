#!/usr/bin/env python3
"""Migrate all MySQL tables from AWS RDS into Supabase Postgres."""

from __future__ import annotations

import csv
import io
import os
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

import psycopg2
import pymysql
from pymysql.constants import CLIENT

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_SQL = ROOT / "scripts" / "pg_schema.sql"
EXPORT_DIR = ROOT / "scripts" / "mysql_exports"

def mysql_config() -> dict:
    return {
        "host": os.environ.get("DB_HOST", "school-db.cd6o8awqe4ig.us-east-2.rds.amazonaws.com"),
        "port": int(os.environ.get("DB_PORT", "3306")),
        "user": os.environ.get("DB_USER", "admin"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "database": os.environ.get("DB_NAME", "school"),
        "charset": "utf8mb4",
        "ssl": {"ssl": {}},
        "client_flag": CLIENT.MULTI_STATEMENTS,
    }


def pg_config() -> dict:
    return {
        "host": os.environ.get("SUPABASE_DB_HOST", "aws-1-us-east-1.pooler.supabase.com"),
        "port": int(os.environ.get("SUPABASE_DB_PORT", "5432")),
        "dbname": os.environ.get("SUPABASE_DB_NAME", "postgres"),
        "user": os.environ.get("SUPABASE_DB_USER", "postgres.okeiftbrwhfehflpxogs"),
        "password": os.environ.get(
            "SUPABASE_DB_PASSWORD",
            "MyAMU@2026_Supabase!",
        ),
        "sslmode": "require",
    }


def load_backend_env() -> None:
    env_path = ROOT / "backend" / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def generate_schema() -> None:
    print("Generating PostgreSQL schema from MySQL …")
    env = os.environ.copy()
    env["PG_SCHEMA_OUTPUT"] = str(SCHEMA_SQL)
    subprocess.run(
        [sys.executable, str(ROOT / "generate_pg_schema.py")],
        check=True,
        env=env,
        cwd=str(ROOT),
    )


def sanitize_pg_schema_sql(sql: str) -> str:
    sql = re.sub(r"\s+CHARACTER SET \w+", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\s+COLLATE \w+", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"decimal\((\d+)\s+,\s*(\d+)\)", r"decimal(\1,\2)", sql, flags=re.IGNORECASE)
    sql = re.sub(r"double\((\d+)\s+,\s*(\d+)\)", r"double precision", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\benum\s*\([^)]*\)", "text", sql, flags=re.IGNORECASE)
    sql = re.sub(r"_utf8mb4'", "'", sql)
    return sql


def split_create_statements(sql: str) -> list[str]:
    statements: list[str] = []
    for chunk in re.split(r"\n(?=CREATE TABLE )", sql):
        chunk = chunk.strip()
        if not chunk.startswith("CREATE TABLE"):
            continue
        if not chunk.endswith(";"):
            chunk += ";"
        statements.append(chunk)
    return statements


def apply_schema(pg_conn) -> None:
    raw_sql = SCHEMA_SQL.read_text(encoding="utf-8")
    print(f"Applying schema from {SCHEMA_SQL} …")
    with pg_conn.cursor() as cur:
        cur.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
    pg_conn.commit()

    statements = split_create_statements(sanitize_pg_schema_sql(raw_sql))
    created = 0
    for statement in statements:
        try:
            with pg_conn.cursor() as cur:
                cur.execute(statement)
            pg_conn.commit()
            created += 1
        except Exception as exc:
            pg_conn.rollback()
            first_line = statement.splitlines()[0]
            print(f"  ! schema skipped: {first_line} ({exc})")
    print(f"Created {created}/{len(statements)} tables in Supabase")


def mysql_tables(mysql_conn, database: str) -> list[str]:
    with mysql_conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """,
            (database,),
        )
        return [row[0] for row in cur.fetchall()]


def safe_text(value):
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        text = value.isoformat()
        if text.startswith("0000"):
            return None
        return text
    if isinstance(value, bytes):
        for enc in ("utf-8", "big5", "latin1"):
            try:
                return value.decode(enc)
            except Exception:
                pass
        return value.decode("utf-8", errors="replace")
    if isinstance(value, str):
        stripped = value.strip()
        if stripped in ("0000-00-00", "0000-00-00 00:00:00", "0000-01-02"):
            return None
        return value
    return value


def relax_not_null_constraints(pg_conn, table: str) -> None:
    with pg_conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND is_nullable = 'NO'
              AND column_name NOT IN (
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass AND i.indisprimary
              )
            """,
            (table, f'public."{table}"'),
        )
        columns = [row[0] for row in cur.fetchall()]
        for column in columns:
            cur.execute(
                f'ALTER TABLE "{table}" ALTER COLUMN "{column}" DROP NOT NULL'
            )
    pg_conn.commit()


def export_table(mysql_conn, table: str) -> Path:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = EXPORT_DIR / f"{table}.csv"
    with mysql_conn.cursor() as cur:
        cur.execute(f"SELECT * FROM `{table}`")
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
    with out_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(columns)
        for row in rows:
            writer.writerow([safe_text(v) for v in row])
    return out_path


def import_table(pg_conn, table: str, csv_path: Path) -> int:
    if csv_path.stat().st_size == 0:
        return 0
    relax_not_null_constraints(pg_conn, table)
    with pg_conn.cursor() as cur:
        cur.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE')
    pg_conn.commit()
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        if not header:
            return 0
        first_row = next(reader, None)
        if first_row is None:
            return 0
        handle.seek(0)
        columns = ", ".join(f'"{col}"' for col in header)
        copy_sql = f'COPY "{table}" ({columns}) FROM STDIN WITH (FORMAT csv, HEADER true)'
        with pg_conn.cursor() as cur:
            cur.copy_expert(copy_sql, handle)
    pg_conn.commit()
    with pg_conn.cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        return int(cur.fetchone()[0])


def main() -> int:
    load_backend_env()
    mysql = mysql_config()
    pg = pg_config()
    if not mysql["password"]:
        print("Missing DB_PASSWORD in backend/.env", file=sys.stderr)
        return 1

    reimport_only = "--reimport-only" in sys.argv
    if not reimport_only:
        generate_schema()
    elif not SCHEMA_SQL.exists():
        print(f"Missing {SCHEMA_SQL}; run full migration first.", file=sys.stderr)
        return 1

    mysql_conn = pymysql.connect(**mysql)
    pg_conn = psycopg2.connect(**pg)

    try:
        if not reimport_only:
            apply_schema(pg_conn)
        tables = mysql_tables(mysql_conn, mysql["database"])
        print(f"Migrating {len(tables)} tables …")

        for index, table in enumerate(tables, start=1):
            if table == "copyright_release_agreement":
                print(f"[{index}/{len(tables)}] skip {table}")
                continue
            print(f"[{index}/{len(tables)}] {table} …", flush=True)
            csv_path = export_table(mysql_conn, table)
            try:
                count = import_table(pg_conn, table, csv_path)
                print(f"  → {count} rows")
            except Exception as exc:
                pg_conn.rollback()
                print(f"  ! failed: {exc}")

        with pg_conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
            )
            table_count = cur.fetchone()[0]
        print(f"Done. Supabase public tables: {table_count}")
        return 0
    finally:
        mysql_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
