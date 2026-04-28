import { supabase } from "@/lib/supabase";

export async function GET() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ servers: [] });
  }

  const { data } = await supabase
    .from("servers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return Response.json({ servers: data || [] });
}