import type { Request, Response } from "express";
import { verifyStudentAccessToken } from "../lib/studentAuthToken.js";
import {
  getClinicFeeBillingSummary,
  getCurrentTermBillingSummary,
  getTuitionOnlyBillingSummary,
  parseAuthorizeChargeBody,
  processAuthorizeNetStudentPayment,
} from "../services/studentAuthorizePaymentService.js";

function parseRequestedTerm(req: Request): string {
  const termRaw = req.query.term;
  const yearRaw = req.query.year;
  const term =
    typeof termRaw === "string" && termRaw.trim() !== ""
      ? termRaw.trim()
      : "";
  const yearNum =
    typeof yearRaw === "string" && yearRaw.trim() !== ""
      ? Number(yearRaw)
      : Number.NaN;
  const year = Number.isFinite(yearNum) ? Math.trunc(yearNum) : Number.NaN;
  if (term === "" || !Number.isFinite(year)) {
    return "";
  }
  const suffix =
    term.toUpperCase().startsWith("SPR") ? "SPR"
    : term.toUpperCase().startsWith("SUM") ? "SUM"
    : term.toUpperCase().startsWith("FAL") ? "FAL"
    : term.toUpperCase().startsWith("WIN") ? "WIN"
    : term.trim().slice(0, 3).toUpperCase();
  return `${year}-${suffix}`;
}

export async function getAuthorizeCurrentTermSummaryHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const termInput = parseRequestedTerm(req);
  if (termInput === "") {
    res
      .status(400)
      .json({ error: "Query parameters `term` and `year` are required." });
    return;
  }
  try {
    const summary = await getCurrentTermBillingSummary({
      studentId: authStudent.studentId,
      termInput,
    });
    res.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load payment summary.";
    if (/term|required|format/i.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("[payments/authorize/current-term-summary]", error);
    res.status(500).json({ error: "Unable to load current term billing summary." });
  }
}

export async function getAuthorizeTuitionSummaryHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const termInput = parseRequestedTerm(req);
  if (termInput === "") {
    res
      .status(400)
      .json({ error: "Query parameters `term` and `year` are required." });
    return;
  }
  try {
    const summary = await getTuitionOnlyBillingSummary({
      studentId: authStudent.studentId,
      termInput,
    });
    res.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load tuition summary.";
    if (/term|required|format/i.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("[payments/authorize/tuition-summary]", error);
    res.status(500).json({ error: "Unable to load tuition billing summary." });
  }
}

export async function getAuthorizeClinicFeeSummaryHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const termInput = parseRequestedTerm(req);
  if (termInput === "") {
    res
      .status(400)
      .json({ error: "Query parameters `term` and `year` are required." });
    return;
  }
  try {
    const summary = await getClinicFeeBillingSummary({
      studentId: authStudent.studentId,
      termInput,
    });
    res.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load clinic fee summary.";
    if (/term|required|format/i.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("[payments/authorize/clinic-fee-summary]", error);
    res.status(500).json({ error: "Unable to load clinic fee billing summary." });
  }
}

export async function postAuthorizeNetChargeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const parsed = parseAuthorizeChargeBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const result = await processAuthorizeNetStudentPayment({
      studentId: authStudent.studentId,
      termInput: parsed.value.term,
      amount: parsed.value.amount,
      chargeType: parsed.value.chargeType,
      paymentPlan: parsed.value.paymentPlan,
      installmentCount: parsed.value.installmentCount,
      opaqueData: parsed.value.opaqueData,
      cardBinPrefix: parsed.value.cardBinPrefix,
      cardholderName: parsed.value.cardholderName,
      billingZip: parsed.value.billingZip,
    });
    res.json({
      ok: true,
      amount: result.amount,
      baseAmount: result.baseAmount,
      processingFee: result.processingFee,
      cardFunding: result.cardFunding,
      providerTransactionId: result.providerTransactionId,
      invoiceNumber: result.invoiceNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process payment.";
    if (
      /amount|term|balance|required|format|Authentication|configured/i.test(
        message,
      )
    ) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("[payments/authorize/charge]", error);
    res.status(502).json({ error: "Payment could not be processed." });
  }
}

export async function postAuthorizeNetTuitionChargeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const parsed = parseAuthorizeChargeBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (
    parsed.value.chargeType !== "tuition" &&
    parsed.value.chargeType !== "late_fee"
  ) {
    res.status(400).json({
      error: "Tuition endpoint only accepts tuition or late_fee charges.",
    });
    return;
  }
  if (
    parsed.value.chargeType === "late_fee" &&
    parsed.value.paymentPlan !== "full"
  ) {
    res.status(400).json({
      error: "Late fee can only be paid in full.",
    });
    return;
  }

  try {
    const result = await processAuthorizeNetStudentPayment({
      studentId: authStudent.studentId,
      termInput: parsed.value.term,
      amount: parsed.value.amount,
      chargeType: parsed.value.chargeType,
      paymentPlan: parsed.value.paymentPlan,
      installmentCount: parsed.value.installmentCount,
      opaqueData: parsed.value.opaqueData,
      cardBinPrefix: parsed.value.cardBinPrefix,
      cardholderName: parsed.value.cardholderName,
      billingZip: parsed.value.billingZip,
    });
    res.json({
      ok: true,
      amount: result.amount,
      baseAmount: result.baseAmount,
      processingFee: result.processingFee,
      cardFunding: result.cardFunding,
      providerTransactionId: result.providerTransactionId,
      invoiceNumber: result.invoiceNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process tuition payment.";
    if (
      /amount|term|balance|required|format|Authentication|configured|tuition|late fee/i.test(
        message,
      )
    ) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("[payments/authorize/tuition-charge]", error);
    res.status(502).json({ error: "Tuition payment could not be processed." });
  }
}

export async function postAuthorizeNetClinicFeeChargeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const authStudent = verifyStudentAccessToken(req.headers.authorization);
  if (!authStudent) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const parsed = parseAuthorizeChargeBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (parsed.value.chargeType !== "clinic_fee") {
    res.status(400).json({ error: "Clinic fee endpoint only accepts clinic_fee charges." });
    return;
  }
  if (parsed.value.paymentPlan !== "full") {
    res.status(400).json({ error: "Clinic fee does not support installments." });
    return;
  }

  try {
    const result = await processAuthorizeNetStudentPayment({
      studentId: authStudent.studentId,
      termInput: parsed.value.term,
      amount: parsed.value.amount,
      chargeType: "clinic_fee",
      paymentPlan: "full",
      installmentCount: 1,
      opaqueData: parsed.value.opaqueData,
      cardBinPrefix: parsed.value.cardBinPrefix,
      cardholderName: parsed.value.cardholderName,
      billingZip: parsed.value.billingZip,
    });
    res.json({
      ok: true,
      amount: result.amount,
      baseAmount: result.baseAmount,
      processingFee: result.processingFee,
      cardFunding: result.cardFunding,
      providerTransactionId: result.providerTransactionId,
      invoiceNumber: result.invoiceNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process clinic fee payment.";
    if (
      /amount|term|balance|required|format|Authentication|configured|clinic fee|installment/i.test(
        message,
      )
    ) {
      res.status(400).json({ error: message });
      return;
    }
    console.error("[payments/authorize/clinic-fee-charge]", error);
    res.status(502).json({ error: "Clinic fee payment could not be processed." });
  }
}
