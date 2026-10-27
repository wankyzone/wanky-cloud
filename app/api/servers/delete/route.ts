import { parseServerId } from "@/lib/api-validation";
import { deleteOwnedServer } from "@/lib/owned-data";
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
    return apiError(400, "invalid_request", "A server ID is required.");
  }

  const serverId = parseServerId((body as { id?: unknown }).id);
  if (!serverId) {
    return apiError(400, "invalid_server_id", "A valid server ID is required.");
  }

  try {
    const { data, error } = await deleteOwnedServer(auth.client, auth.user.id, serverId);

    if (error) {
      return apiError(500, "server_delete_failed", "Unable to delete server.");
    }

    if (!data) {
      return apiError(404, "server_not_found", "Server not found.");
    }

    return Response.json({ success: true });
  } catch {
    return apiError(500, "server_delete_failed", "Unable to delete server.");
  }
}