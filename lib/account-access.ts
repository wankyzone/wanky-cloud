import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountRole = "owner" | "admin" | "editor" | "viewer";

export function getAccountRole(
  client: SupabaseClient,
  accountId: string,
  userId: string,
) {
  return client
    .from("account_members")
    .select("role")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
}

export function canManageApplications(role: AccountRole | undefined): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}
