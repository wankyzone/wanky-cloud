import type { SupabaseClient } from "@supabase/supabase-js";

export function listOwnedServers(client: SupabaseClient, userId: string) {
  return client
    .from("servers")
    .select("id, ip, status, plan, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export function deleteOwnedServer(client: SupabaseClient, userId: string, serverId: string) {
  return client
    .from("servers")
    .delete()
    .eq("id", serverId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
}

export function getOwnedBalance(client: SupabaseClient, userId: string) {
  return client
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
}

export function getActiveSubscription(client: SupabaseClient, userId: string) {
  return client
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
}

export function countOwnedServers(client: SupabaseClient, userId: string) {
  return client
    .from("servers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
}