import { parsePaystackPurchase } from "@/lib/paystack-security";
import { apiError, authenticateRequest } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const auth = await authenticateRequest(req);

  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_request", "A valid JSON body is required.");
  }

  if (!parsePaystackPurchase(body)) {
    return apiError(400, "invalid_purchase", "A valid payment type and plan are required.");
  }

  return apiError(
    503,
    "payment_storage_unavailable",
    "Payments are temporarily unavailable until pending-payment storage is configured.",
  );
}