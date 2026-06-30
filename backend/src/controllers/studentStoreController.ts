import type { Request, Response } from "express";
import { verifyStudentAccessToken } from "../lib/studentAuthToken.js";
import {
  commitStoreCartToLedger,
  getStoreCartPayload,
  removeStoreCartLine,
  syncStoreCartLine,
} from "../services/studentStoreCartService.js";
import {
  getStoreCatalogPayload,
  parseStoreCheckoutBody,
  processStoreCheckout,
} from "../services/studentStoreService.js";

function localeFromRequest(req: Request): "en" | "zh" {
  const raw = String(req.query.locale ?? req.headers["accept-language"] ?? "en");
  return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function parseTermYearQuery(req: Request): { term: string; year: number } | null {
  const term = String(req.query.term ?? "").trim();
  const yearRaw = req.query.year;
  const year =
    typeof yearRaw === "number"
      ? Math.trunc(yearRaw)
      : typeof yearRaw === "string"
        ? Math.trunc(Number(yearRaw))
        : Number.NaN;
  if (term === "" || !Number.isFinite(year)) return null;
  return { term, year };
}

export async function getStoreCatalogHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  res.json(getStoreCatalogPayload(localeFromRequest(req)));
}

export async function getStoreCartHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const termYear = parseTermYearQuery(req);
  if (termYear == null) {
    res.status(400).json({ error: "term and year query parameters are required." });
    return;
  }
  try {
    const payload = await getStoreCartPayload({
      studentId: authStudent.studentId,
      term: termYear.term,
      year: termYear.year,
    });
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load cart.";
    res.status(400).json({ error: message });
  }
}

export async function putStoreCartLineHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const body = req.body as Record<string, unknown> | null;
  if (body == null || typeof body !== "object") {
    res.status(400).json({ error: "Request body must be a JSON object." });
    return;
  }
  const term = String(body.term ?? "").trim();
  const yearRaw = body.year;
  const year =
    typeof yearRaw === "number"
      ? Math.trunc(yearRaw)
      : typeof yearRaw === "string"
        ? Math.trunc(Number(yearRaw))
        : Number.NaN;
  const feeCode = String(body.feeCode ?? "").trim();
  const quantity = Math.trunc(Number(body.quantity) || 1);
  const notes = body.notes != null ? String(body.notes) : null;
  if (term === "" || !Number.isFinite(year) || feeCode === "") {
    res.status(400).json({ error: "term, year, and feeCode are required." });
    return;
  }
  try {
    const payload = await syncStoreCartLine({
      studentId: authStudent.studentId,
      term,
      year,
      line: { feeCode, quantity, notes },
    });
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update cart.";
    res.status(400).json({ error: message });
  }
}

export async function postStoreCartCommitHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const termYear = parseTermYearQuery(req);
  if (termYear == null) {
    res.status(400).json({ error: "term and year query parameters are required." });
    return;
  }
  try {
    const payload = await commitStoreCartToLedger({
      studentId: authStudent.studentId,
      term: termYear.term,
      year: termYear.year,
    });
    res.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add cart items to your bill.";
    res.status(400).json({ error: message });
  }
}

export async function deleteStoreCartLineHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const termYear = parseTermYearQuery(req);
  const feeCode = String(req.query.feeCode ?? "").trim();
  if (termYear == null || feeCode === "") {
    res.status(400).json({ error: "term, year, and feeCode are required." });
    return;
  }
  try {
    const payload = await removeStoreCartLine({
      studentId: authStudent.studentId,
      term: termYear.term,
      year: termYear.year,
      feeCode,
    });
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove cart item.";
    res.status(400).json({ error: message });
  }
}

export async function postStoreCheckoutHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const parsed = parseStoreCheckoutBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const result = await processStoreCheckout({
      studentId: authStudent.studentId,
      body: parsed.value,
    });
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Store checkout failed.";
    console.error("[store/checkout]", error);
    if (/cart|term|unknown fee|greater than 0|not available/i.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: "Payment could not be processed." });
  }
}
