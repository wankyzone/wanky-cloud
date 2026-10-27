import { listOwnedServers } from "@/lib/owned-data";
import { apiError, authenticateRequest } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { data, error } = await listOwnedServers(auth.client, auth.user.id);

    if (error) {
      return apiError(500, "server_list_failed", "Unable to load servers.");
    }

    return Response.json({ servers: data ?? [] });
  } catch {
    return apiError(500, "server_list_failed", "Unable to load servers.");
  }
}