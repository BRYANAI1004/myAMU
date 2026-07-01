import type { Request, Response } from "express";
import {
  AdminLoginEmailError,
  getAdminLoginEmailStatus,
  sendAdminLoginEmailCode,
  verifyAdminLoginEmailCode,
} from "../services/adminLoginEmailService.js";

function readEmail(req: Request): string | null {
  const body = req.body as Record<string, unknown> | null | undefined;
  if (body == null || typeof body !== "object") return null;
  const raw = body.email;
  return typeof raw === "string" ? raw : null;
}

function readCode(req: Request): string | null {
  const body = req.body as Record<string, unknown> | null | undefined;
  if (body == null || typeof body !== "object") return null;
  const raw = body.code;
  return typeof raw === "string" ? raw : null;
}

function handleServiceError(err: unknown, res: Response): void {
  if (err instanceof AdminLoginEmailError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("[admin-login-email]", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

/** GET /api/admin/login-email */
export async function getAdminLoginEmailHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const adminEmail = req.adminUser?.email?.trim() ?? "";
  if (adminEmail === "") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const status = await getAdminLoginEmailStatus(adminEmail);
    res.json(status);
  } catch (err) {
    handleServiceError(err, res);
  }
}

/** POST /api/admin/login-email/send-code */
export async function postAdminLoginEmailSendCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const adminEmail = req.adminUser?.email?.trim() ?? "";
  if (adminEmail === "") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = readEmail(req);
  if (email == null) {
    res.status(400).json({ error: "Request body must include email." });
    return;
  }

  try {
    const result = await sendAdminLoginEmailCode(adminEmail, email);
    res.json({ ok: true, ...result });
  } catch (err) {
    handleServiceError(err, res);
  }
}

/** POST /api/admin/login-email/verify */
export async function postAdminLoginEmailVerifyHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const adminEmail = req.adminUser?.email?.trim() ?? "";
  if (adminEmail === "") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = readEmail(req);
  const code = readCode(req);
  if (email == null || code == null) {
    res.status(400).json({ error: "Request body must include email and code." });
    return;
  }

  try {
    const status = await verifyAdminLoginEmailCode(adminEmail, email, code);
    res.json(status);
  } catch (err) {
    handleServiceError(err, res);
  }
}
