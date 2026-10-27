import { getOwnedBalance } from "@/lib/owned-data";
import { apiError, authenticateRequest } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { data, error } = await getOwnedBalance(auth.client, auth.user.id);

    if (error) {
      return apiError(500, "balance_load_failed", "Unable to load balance.");
    }

    const balance = data?.balance ?? 0;
    if (typeof balance !== "number" || !Number.isFinite(balance)) {
      return apiError(500, "balance_load_failed", "Unable to load balance.");
    }

    return Response.json({ balance });
  } catch {
    return apiError(500, "balance_load_failed", "Unable to load balance.");
  }
}