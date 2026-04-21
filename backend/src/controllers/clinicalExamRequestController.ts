import type { Request, Response } from "express";
import { env } from "../config/env.js";
import {
  assignClinicalExamRequest,
  createStudentClinicalExamRequest,
  listAdminClinicalExamRequestsApi,
  listStudentClinicalExamRequestsApi,
  type ClinicalExamAssignPatch,
} from "../services/clinicalExamRequestService.js";

function devMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
}

function parseQueryStudentId(req: Request): string | null {
  const raw = req.query.studentId;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function readAdminEmailHeader(req: Request): string | null {
  const idRaw = req.headers["x-admin-email"];
  return typeof idRaw === "string" && idRaw.trim() !== "" ? idRaw.trim() : null;
}

function pathExamRequestId(req: Request): number {
  const v = req.params.id;
  const raw = Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

/**
 * POST /api/student/clinical/exam-request?studentId=
 * Body: { examCode, term, year }
 */
export async function postStudentClinicalExamRequestHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = parseQueryStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: "Query parameter studentId is required." });
      return;
    }
    const body = req.body as Record<string, unknown> | null | undefined;
    if (body == null || typeof body !== "object") {
      res.status(400).json({ error: "JSON body is required." });
      return;
    }
    const examCode = typeof body.examCode === "string" ? body.examCode : "";
    const term = typeof body.term === "string" ? body.term : "";
    const year =
      typeof body.year === "number"
        ? body.year
        : typeof body.year === "string"
          ? Number(body.year)
          : NaN;

    const result = await createStudentClinicalExamRequest(studentId, examCode, term, year);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json(result.request);
  } catch (e) {
    console.error("[student/clinical/exam-request POST] failed:", e);
    const out: { error: string; message?: string } = {
      error: "Failed to create exam request.",
    };
    if (env.nodeEnv === "development") out.message = devMessage(e);
    res.status(500).json(out);
  }
}

/**
 * GET /api/student/clinical/exam-requests?studentId=
 */
export async function getStudentClinicalExamRequestsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = parseQueryStudentId(req);
    if (!studentId) {
      res.status(400).json({ error: "Query parameter studentId is required." });
      return;
    }
    const rows = await listStudentClinicalExamRequestsApi(studentId);
    res.json(rows);
  } catch (e) {
    console.error("[student/clinical/exam-requests GET] failed:", e);
    const out: { error: string; message?: string } = {
      error: "Failed to load exam requests.",
    };
    if (env.nodeEnv === "development") out.message = devMessage(e);
    res.status(500).json(out);
  }
}

/**
 * GET /api/admin/clinical/exam-requests
 */
export async function getAdminClinicalExamRequestsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const rows = await listAdminClinicalExamRequestsApi();
    res.json(rows);
  } catch (e) {
    console.error("[admin/clinical/exam-requests GET] failed:", e);
    const out: { error: string; message?: string } = {
      error: "Failed to load exam requests.",
    };
    if (env.nodeEnv === "development") out.message = devMessage(e);
    res.status(500).json(out);
  }
}

/**
 * POST /api/admin/clinical/exam-requests/:id/assign
 * Body: { assignedExamDate?, assignedExamTime?, notes?, status? }
 */
export async function postAdminClinicalExamRequestAssignHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = pathExamRequestId(req);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid request id." });
      return;
    }
    const body = req.body as Record<string, unknown> | null | undefined;
    if (body == null || typeof body !== "object") {
      res.status(400).json({ error: "JSON body is required." });
      return;
    }

    const patch: ClinicalExamAssignPatch = {};

    if (Object.prototype.hasOwnProperty.call(body, "assignedExamDate")) {
      const v = body.assignedExamDate;
      if (v === null) patch.assignedExamDate = null;
      else if (typeof v === "string") patch.assignedExamDate = v;
      else {
        res.status(400).json({ error: "assignedExamDate must be a string or null." });
        return;
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "assignedExamTime")) {
      const v = body.assignedExamTime;
      if (v === null) patch.assignedExamTime = null;
      else if (typeof v === "string") patch.assignedExamTime = v;
      else {
        res.status(400).json({ error: "assignedExamTime must be a string or null." });
        return;
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "notes")) {
      const v = body.notes;
      if (v === null || v === undefined) patch.notes = "";
      else if (typeof v === "string") patch.notes = v;
      else {
        res.status(400).json({ error: "notes must be a string." });
        return;
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      const v = body.status;
      if (typeof v === "string") patch.status = v;
      else {
        res.status(400).json({ error: "status must be a string." });
        return;
      }
    }

    const assignedBy = readAdminEmailHeader(req);
    const result = await assignClinicalExamRequest(id, patch, assignedBy);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.request);
  } catch (e) {
    console.error("[admin/clinical/exam-requests assign POST] failed:", e);
    const out: { error: string; message?: string } = {
      error: "Failed to update exam request.",
    };
    if (env.nodeEnv === "development") out.message = devMessage(e);
    res.status(500).json(out);
  }
}
