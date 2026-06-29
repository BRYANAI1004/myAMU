import { AsyncLocalStorage } from "node:async_hooks";
import { EventEmitter } from "node:events";
import type { NextFunction, Request, Response } from "express";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

export type HyperdriveBinding = {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
};

let poolInstance: mysql.Pool | null = null;
let poolConfig: mysql.PoolOptions | null = null;

/** One MySQL connection per HTTP request on Cloudflare Workers (required by the runtime). */
const requestConnection = new AsyncLocalStorage<mysql.Connection>();

function isWorkersDb(): boolean {
  return poolConfig?.disableEval === true;
}

function defaultPoolConfig(): mysql.PoolOptions {
  return {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    waitForConnections: true,
    /** Lower cap reduces pressure on shared MySQL max_connections when multiple dev processes run. */
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

function resolveConnectionConfig(): mysql.ConnectionOptions {
  const cfg = poolConfig ?? defaultPoolConfig();
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(cfg.disableEval ? { disableEval: true } : {}),
  };
}

async function openWorkersConnection(): Promise<mysql.Connection> {
  return mysql.createConnection(resolveConnectionConfig());
}

/** Configure MySQL pool from a Cloudflare Hyperdrive binding (Workers production). */
export function configureDbFromHyperdrive(hyperdrive: HyperdriveBinding): void {
  poolConfig = {
    host: hyperdrive.host,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    port: hyperdrive.port,
    disableEval: true,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
  poolInstance = null;
}

function getPool(): mysql.Pool {
  if (poolInstance == null) {
    const config = poolConfig ?? defaultPoolConfig();
    poolInstance = mysql.createPool(config);
    poolInstance.on("connection", (connection) => {
      (connection as unknown as EventEmitter).on(
        "error",
        (err: NodeJS.ErrnoException) => {
          console.error("[db] connection error:", err.code ?? err.message);
        },
      );
    });
    (poolInstance as unknown as EventEmitter).on(
      "error",
      (err: NodeJS.ErrnoException) => {
        console.error("[db] pool error:", err.code ?? err.message);
      },
    );
  }
  return poolInstance;
}

function wrapDedicatedConnection(
  connection: mysql.Connection,
): mysql.PoolConnection {
  const wrapped = connection as mysql.PoolConnection;
  wrapped.release = () => {
    void connection.end().catch(() => {});
  };
  return wrapped;
}

async function workersQuery(
  sql: mysql.QueryOptions | string,
  values?: unknown,
): Promise<[unknown, mysql.FieldPacket[]]> {
  const scoped = requestConnection.getStore();
  if (scoped != null) {
    return scoped.query(sql, values) as Promise<[unknown, mysql.FieldPacket[]]>;
  }
  const connection = await openWorkersConnection();
  try {
    return (await connection.query(sql, values)) as [
      unknown,
      mysql.FieldPacket[],
    ];
  } finally {
    await connection.end();
  }
}

async function workersGetConnection(): Promise<mysql.PoolConnection> {
  const scoped = requestConnection.getStore();
  if (scoped != null) {
    return wrapDedicatedConnection(scoped);
  }
  return wrapDedicatedConnection(await openWorkersConnection());
}

function createWorkersPoolFacade(): mysql.Pool {
  return {
    query: workersQuery,
    getConnection: workersGetConnection,
    end: async () => {},
  } as unknown as mysql.Pool;
}

function getDbAccessor(): mysql.Pool {
  if (isWorkersDb()) {
    return createWorkersPoolFacade();
  }
  return getPool();
}

/** Express middleware — attach one Hyperdrive connection per request on Workers. */
export function workersDbMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isWorkersDb()) {
    next();
    return;
  }

  void openWorkersConnection()
    .then((connection) => {
      let closed = false;
      const close = (): void => {
        if (closed) return;
        closed = true;
        void connection.end().catch(() => {});
      };

      requestConnection.run(connection, () => {
        res.once("finish", close);
        res.once("close", close);
        next();
      });
    })
    .catch(next);
}

/** Lazy pool proxy — Hyperdrive uses per-request connections on Workers. */
export const pool: mysql.Pool = new Proxy({} as mysql.Pool, {
  get(_target, prop, receiver) {
    const accessor = getDbAccessor();
    const value = Reflect.get(accessor, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(accessor);
    }
    return value;
  },
});

/**
 * Verifies the pool can reach MySQL (fail fast on startup).
 * Logs structured details on failure for RDS/network/credential issues.
 */
export async function testDatabaseConnection(): Promise<void> {
  if (isWorkersDb()) {
    const connection = await openWorkersConnection();
    try {
      await connection.ping();
    } finally {
      await connection.end();
    }
    return;
  }

  let connection: mysql.PoolConnection | undefined;
  try {
    connection = await getPool().getConnection();
    await connection.ping();
    if ((process.env.NODE_ENV ?? "development") === "development") {
      console.log("[db] connection verified");
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException & Error;
    const cfg = poolConfig ?? defaultPoolConfig();
    console.error("[db] connection failed:", {
      message: e.message,
      code: e.code,
      errno: e.errno,
      syscall: e.syscall,
      host: cfg.host,
      database: cfg.database,
    });
    if (e.stack) console.error("[db] stack:", e.stack);
    throw err;
  } finally {
    connection?.release();
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance != null) {
    await poolInstance.end();
    poolInstance = null;
  }
}
