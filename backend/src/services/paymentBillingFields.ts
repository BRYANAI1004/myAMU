const CARDHOLDER_NAME_RE = /^[\p{L}\p{M}'.\- ]{2,64}$/u;

export function normalizeCardholderName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 64) return null;
  if (!CARDHOLDER_NAME_RE.test(name)) return null;
  if (!/[\p{L}\p{M}]/u.test(name)) return null;
  return name;
}

export function normalizeBillingZip(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 5 || digits.length === 9) return digits;
  return null;
}

export function splitCardholderNameForBillTo(name: string): { firstName: string; lastName: string } {
  const lastSpace = name.lastIndexOf(" ");
  if (lastSpace <= 0) {
    return { firstName: name.slice(0, 50), lastName: "." };
  }
  return {
    firstName: name.slice(0, lastSpace).slice(0, 50),
    lastName: name.slice(lastSpace + 1).slice(0, 50),
  };
}

export type PaymentBillingDetails = {
  cardholderName: string;
  billingZip: string;
};

export function parsePaymentBillingDetails(raw: unknown):
  | { ok: true; value: PaymentBillingDetails }
  | { ok: false; error: string } {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const o = raw as Record<string, unknown>;
  const cardholderName = normalizeCardholderName(o.cardholderName);
  if (cardholderName == null) {
    return {
      ok: false,
      error: "cardholderName must be 2–64 characters as printed on the card.",
    };
  }
  const billingZip = normalizeBillingZip(o.billingZip);
  if (billingZip == null) {
    return {
      ok: false,
      error: "billingZip must be a valid 5-digit US ZIP or ZIP+4 code.",
    };
  }
  return { ok: true, value: { cardholderName, billingZip } };
}
