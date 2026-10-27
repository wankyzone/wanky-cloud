import { PLANS, type PlanId } from "@/lib/plans";
import { countOwnedServers, getActiveSubscription } from "@/lib/owned-data";
import { apiError, authenticateRequest } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const auth = await authenticateRequest(req);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { data: subscription, error: subscriptionError } = await getActiveSubscription(
      auth.client,
      auth.user.id,
    );
    if (subscriptionError) {
      return apiError(500, "subscription_check_failed", "Unable to verify subscription.");
    }
    if (!subscription) {
      return apiError(403, "subscription_required", "An active subscription is required.");
    }

    const plan = PLANS[subscription.plan as PlanId];
    if (!plan) {
      return apiError(403, "invalid_subscription", "The active subscription is not eligible.");
    }

    const { count, error: countError } = await countOwnedServers(auth.client, auth.user.id);
    if (countError) {
      return apiError(500, "server_limit_check_failed", "Unable to verify server limit.");
    }
    if ((count ?? 0) >= plan.maxServers) {
      return apiError(403, "server_limit_reached", "Server limit reached.");
    }
  } catch {
    return apiError(500, "server_check_failed", "Unable to verify server eligibility.");
  }

  return apiError(503, "provisioning_unavailable", "Server provisioning is not available yet.");
}