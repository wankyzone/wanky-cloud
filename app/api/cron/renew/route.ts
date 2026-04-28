import { supabase } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";

export async function GET() {
  try {
    const now = new Date();

    // 1. Get subscriptions that expired
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*")
      .lte("current_period_end", now.toISOString())
      .eq("status", "active");

    for (const sub of subs || []) {
      const plan = PLANS[sub.plan as keyof typeof PLANS];

      // 2. Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", sub.user_id)
        .single();

      if (!wallet) continue;

      // 3. Check balance
      if (wallet.balance >= plan.price) {
        // ✅ Deduct
        await supabase
          .from("wallets")
          .update({
            balance: wallet.balance - plan.price,
          })
          .eq("user_id", sub.user_id);

        // ✅ Extend subscription
        await supabase
          .from("subscriptions")
          .update({
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          })
          .eq("id", sub.id);

      } else {
        // ❌ Insufficient funds → deactivate
        await supabase
          .from("subscriptions")
          .update({
            status: "inactive",
          })
          .eq("id", sub.id);
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}