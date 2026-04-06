import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { listAdminOpenRegistrationCourses } from "../services/adminOpenRegistrationCoursesService.js";

function devMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
}

function parseTermIdQuery(req: Request): string | null {
  const raw = req.query.termId;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** GET /api/admin/courses/open-for-registration?termId= */
export async function getAdminCoursesOpenForRegistration(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const termId = parseTermIdQuery(req);
    if (!termId) {
      res.status(400).json({
        error: "termId query parameter is required.",
      });
      return;
    }
    const rows = await listAdminOpenRegistrationCourses(termId);
    if (rows === null) {
      res.status(400).json({
        error:
          "The selected academic term is not valid or no longer exists. Choose another term.",
      });
      return;
    }
    res.json(rows);
  } catch (e) {
    console.error("[admin/courses/open-for-registration] list failed:", e);
    const body: { error: string; message?: string } = {
      error: "Failed to load open-registration courses",
    };
    if (env.nodeEnv === "development") body.message = devMessage(e);
    res.status(500).json(body);
  }
}
