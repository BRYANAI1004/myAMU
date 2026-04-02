import type { Request, Response } from "express";
import { getStudentAcademicsPayload } from "../services/studentAcademicsService.js";

function pathStudentId(req: Request): string {
  const v = req.params.studentId;
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export async function getStudentAcademics(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const sid = pathStudentId(req).trim();
    if (sid === "") {
      res.status(400).json({ error: "Missing student id" });
      return;
    }
    const payload = await getStudentAcademicsPayload(sid);
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load student academics" });
  }
}
