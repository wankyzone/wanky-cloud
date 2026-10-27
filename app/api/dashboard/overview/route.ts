import { randomUUID } from "node:crypto";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { apiError, authenticateRequest } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const overview = await getDashboardOverview(auth.client);
  if (!overview.ok) {
    const response = apiError(overview.status, overview.code, overview.message);
    if (overview.diagnostic) {
      const correlationId = randomUUID();
      console.error("dashboard_overview_failed", JSON.stringify({
        correlationId,
        operation: overview.diagnostic.operation,
        errorCode: overview.diagnostic.errorCode,
      }));
      response.headers.set("x-correlation-id", correlationId);
    }
    return response;
  }

  return Response.json(overview.data);
}
