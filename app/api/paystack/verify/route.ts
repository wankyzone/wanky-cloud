// /api/paystack/verify/route.ts

import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { reference, plan } = await req.json();

  // ⚠️ normally verify with Paystack API

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // expire old subscription
  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId);

  // create new subscription
  await supabase.from("subscriptions").insert([
    {
      user_id: userId,
      plan,
      status: "active",
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ),
    },
  ]);

  return Response.json({ success: true });
}