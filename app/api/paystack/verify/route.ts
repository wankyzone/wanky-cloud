import { parsePaystackReference } from "@/lib/paystack-security";
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError(400, "invalid_request", "A transaction reference is required.");
  }

  const reference = parsePaystackReference((body as { reference?: unknown }).reference);
  if (!reference) {
    return apiError(400, "invalid_reference", "A valid transaction reference is required.");
  }

  return apiError(
    503,
    "payment_storage_unavailable",
    "Payment verification is unavailable until pending-payment storage is configured.",
  );
}