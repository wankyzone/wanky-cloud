import { apiError, authenticateRequest } from "@/lib/supabase-server";
import { parseAccountCreationInput, readJsonBody } from "@/lib/api-validation";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.client
    .from("customer_accounts")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return apiError(500, "accounts_load_failed", "Unable to load accounts.");
  }

  return Response.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    return apiError(parsedBody.status, parsedBody.code, parsedBody.message);
  }
  const input = parseAccountCreationInput(parsedBody.value);
  if (!input) {
    return apiError(400, "invalid_account_name", "A valid account name is required; unexpected fields are not allowed.");
  }

  const { data, error } = await auth.client.rpc("create_customer_account", {
    p_name: input.name,
  });
  const result = Array.isArray(data) ? data[0] : null;

  if (error) {
    return apiError(503, "account_create_unavailable", "Account creation is temporarily unavailable.");
  }
  if (result?.allowed === false) {
    return Response.json(
      { error: "Account creation limit reached. Try again later.", code: "rate_limit_exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }
  if (result?.allowed !== true || typeof result.account_id !== "string") {
    return apiError(503, "account_create_unavailable", "Account creation is temporarily unavailable.");
  }

  return Response.json({ account: { id: result.account_id, name: input.name } }, { status: 201 });
}
