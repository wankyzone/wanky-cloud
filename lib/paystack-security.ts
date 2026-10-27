import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, type PlanId } from "./plans.ts";

export type PaystackPurchase =
  | { type: "wallet"; amountKobo: number }
  | { type: "subscription"; planId: PlanId; amountKobo: number };

export function parsePaystackPurchase(value: unknown): PaystackPurchase | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  if (input.type === "wallet") {
    if (Object.keys(input).some((key) => key !== "type")) return null;
    return { type: "wallet", amountKobo: 5000 * 100 };
  }

  if (input.type !== "subscription" || typeof input.planId !== "string") return null;
  if (Object.keys(input).some((key) => key !== "type" && key !== "planId")) return null;
  if (!Object.hasOwn(PLANS, input.planId)) return null;

  const planId = input.planId as PlanId;
  return { type: "subscription", planId, amountKobo: PLANS[planId].price * 100 };
}

export function parsePaystackReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reference = value.trim();
  return /^[A-Za-z0-9_-]{8,128}$/.test(reference) ? reference : null;
}

export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;

  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}