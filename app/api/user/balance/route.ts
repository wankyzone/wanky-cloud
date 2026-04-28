import { supabase } from "@/lib/supabase";

export async function GET() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ balance: 0 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single();

  return Response.json({ balance: data?.balance || 0 });
}