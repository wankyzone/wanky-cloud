import { getDashboardOverview } from "@/lib/dashboard-overview";
import { apiError, authenticateRequest } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const overview = await getDashboardOverview(auth.client);
  if (!overview.ok) {
    return apiError(overview.status, overview.code, overview.message);
  }

  return Response.json(overview.data);
}
