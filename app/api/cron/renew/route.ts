import { supabase } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 🔐 Secure endpoint
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("CRON RUNNING...");

  // 1. Get active subscriptions
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active");

  if (error) {
    console.error(error);
    return Response.json({ error: "Failed to fetch subs" });
  }

  for (const sub of subs || []) {
    const now = new Date();
    const expires = new Date(sub.current_period_end);

    // 2. Check if expired
    if (expires < now) {
      const plan = PLANS[sub.plan as keyof typeof PLANS];

      // 3. Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", sub.user_id)
        .single();

      if (!wallet) continue;

      // 4. Deduct if enough balance
      if (wallet.balance >= plan.price) {
        // deduct
        await supabase
          .from("wallets")
          .update({
            balance: wallet.balance - plan.price,
          })
          .eq("user_id", sub.user_id);

        // extend subscription
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await supabase
          .from("subscriptions")
          .update({
            current_period_end: nextMonth.toISOString(),
          })
          .eq("id", sub.id);

        console.log(`Renewed ${sub.user_id}`);
      } else {
        // expire
        await supabase
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("id", sub.id);

        console.log(`Expired ${sub.user_id}`);
      }
    }
  }

  return Response.json({ success: true });
}