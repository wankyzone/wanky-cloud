import { canManageApplications, getAccountRole } from "@/lib/account-access";
import { apiError, authenticateRequest } from "@/lib/supabase-server";
import { parseApplicationCreationInput, readJsonBody } from "@/lib/api-validation";

const accountIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseAccountId(value: string | null): string | null {
  return value && accountIdPattern.test(value) ? value : null;
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const accountId = parseAccountId(new URL(request.url).searchParams.get("accountId"));
  if (!accountId) return apiError(400, "invalid_account_id", "A valid account ID is required.");

  const { data: membership, error: membershipError } = await getAccountRole(
    auth.client,
    accountId,
    auth.user.id,
  );
  if (membershipError) return apiError(500, "authorization_failed", "Unable to verify account access.");
  if (!membership) return apiError(403, "account_access_denied", "Account access denied.");

  const { data, error } = await auth.client
    .from("applications")
    .select("id, account_id, name, framework, status, created_at, updated_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) return apiError(500, "applications_load_failed", "Unable to load applications.");
  return Response.json({ applications: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    return apiError(parsedBody.status, parsedBody.code, parsedBody.message);
  }
  const input = parseApplicationCreationInput(parsedBody.value);
  if (!input) {
    return apiError(400, "invalid_application", "A valid account ID and application name are required; unexpected fields are not allowed.");
  }

  const { data: membership, error: membershipError } = await getAccountRole(
    auth.client,
    input.accountId,
    auth.user.id,
  );
  if (membershipError) return apiError(500, "authorization_failed", "Unable to verify account access.");
  if (!membership) return apiError(403, "account_access_denied", "Account access denied.");
  if (!canManageApplications(membership.role)) {
    return apiError(403, "application_create_forbidden", "You do not have permission to create applications.");
  }

  const { data: creationData, error: creationError } = await auth.client.rpc(
    "create_customer_application",
    { p_account_id: input.accountId, p_name: input.name },
  );
  const creationResult = Array.isArray(creationData) ? creationData[0] : null;

  if (creationError) {
    if (creationError.code === "22023") {
      return apiError(403, "application_quota_unavailable", "An eligible hosting plan with available application quota is required.");
    }
    return apiError(503, "application_create_unavailable", "Application creation is temporarily unavailable.");
  }
  if (creationResult?.reason === "forbidden") {
    return apiError(403, "application_create_forbidden", "You do not have permission to create applications.");
  }
  if (creationResult?.reason === "rate_limited") {
    return Response.json(
      { error: "Application creation limit reached. Try again later.", code: "rate_limit_exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }
  if (creationResult?.allowed !== true || typeof creationResult.application_id !== "string") {
    return apiError(503, "application_create_unavailable", "Application creation is temporarily unavailable.");
  }

  const { data, error } = await auth.client
    .from("applications")
    .select("id, account_id, name, framework, status, created_at, updated_at")
    .eq("id", creationResult.application_id)
    .eq("account_id", input.accountId)
    .single();

  if (error) {
    return apiError(500, "application_create_failed", "Unable to create application.");
  }

  return Response.json({ application: data }, { status: 201 });
}
