import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { listCoursesFromMysql } from "../repositories/courseRepository.js";

export async function getCourses(_req: Request, res: Response): Promise<void> {
  try {
    const courses = await listCoursesFromMysql();
    res.json(courses);
  } catch (e) {
    console.error("[courses] Failed to load courses:", e);
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
    const body: { error: string; message?: string } = {
      error: "Failed to load courses",
    };
    if (env.nodeEnv === "development") {
      body.message = message;
    }
    res.status(500).json(body);
  }
}
