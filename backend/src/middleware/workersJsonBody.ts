import type { NextFunction, Request, Response } from "express";

/** Keep in sync with `JSON_BODY_LIMIT` in app.ts. */
const MAX_JSON_BODY_BYTES = 100 * 1024 * 1024;

/**
 * Minimal JSON body parser for Cloudflare Workers.
 * Avoids express.json() → body-parser → iconv-lite, which fails on Workers.
 */
export function workersJsonBodyParser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    next();
    return;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  req.on("data", (chunk: Buffer) => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      res.status(413).json({
        error: "Request too large. Try fewer or smaller attachments.",
      });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("error", (err: Error) => {
    next(err);
  });
  req.on("end", () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      (req as Request & { body: unknown }).body =
        raw.trim() === "" ? {} : (JSON.parse(raw) as unknown);
      next();
    } catch (err) {
      next(err);
    }
  });
}
