import type { Request, Response } from "express";
import { env } from "../config/env.js";
import {
  countCoursesByCodePrefix,
  searchCoursesPage,
} from "../repositories/courseRepository.js";

function devMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
}

function parseOptionalStringQuery(
  req: Request,
  key: string,
): string | undefined {
  const raw = req.query[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function parsePositiveIntQuery(
  req: Request,
  key: string,
  fallback: number,
): number {
  const raw = req.query[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.trunc(n);
}

function parsePrefixesQuery(req: Request): string[] | undefined {
  const raw = req.query.prefixes;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return undefined;
  const parts = v
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter((p) => p.length >= 2);
  return parts.length > 0 ? parts : undefined;
}

/** GET /api/admin/courses/catalog/summary — total + counts by code prefix. */
export async function getAdminCourseCatalogSummary(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await countCoursesByCodePrefix();
    res.json(result);
  } catch (e) {
    console.error("[admin/courses/catalog/summary] failed:", e);
    const body: { error: string; message?: string } = {
      error: "Failed to load course catalog summary",
    };
    if (env.nodeEnv === "development") body.message = devMessage(e);
    res.status(500).json(body);
  }
}

/** GET /api/admin/courses/catalog?q=&page=&limit=&prefixes= — paginated master course list. */
export async function getAdminCourseCatalog(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const q = parseOptionalStringQuery(req, "q");
    const prefixes = parsePrefixesQuery(req);
    const page = parsePositiveIntQuery(req, "page", 1);
    const limit = parsePositiveIntQuery(req, "limit", 25);
    const result = await searchCoursesPage({ q, prefixes, page, limit });
    res.json(result);
  } catch (e) {
    console.error("[admin/courses/catalog] list failed:", e);
    const body: { error: string; message?: string } = {
      error: "Failed to load course catalog",
    };
    if (env.nodeEnv === "development") body.message = devMessage(e);
    res.status(500).json(body);
  }
}
