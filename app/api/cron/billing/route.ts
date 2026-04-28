import { supabase } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";

export async function GET(req: Request) {
  try {
    // 🔒 Simple protection (VERY IMPORTANT)
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 🔍 Get expired subscriptions
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*")
      .lte("current_period_end", now)
      .eq("status", "active");

    if (!subs || subs.length === 0) {
      return Response.json({ message: "No renewals needed" });
    }

    for (const sub of subs) {
      const plan = PLANS[sub.plan as keyof typeof PLANS];

      // 💰 Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", sub.user_id)
        .single();

      if (!wallet) continue;

      if (wallet.balance >= plan.price) {
        // ✅ Deduct wallet
        await supabase
          .from("wallets")
          .update({
            balance: wallet.balance - plan.price,
          })
          .eq("user_id", sub.user_id);

        // 🔄 Extend subscription
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);

        await supabase
          .from("subscriptions")
          .update({
            current_period_end: nextDate.toISOString(),
          })
          .eq("id", sub.id);

      } else {
        // ❌ Not enough money → suspend
        await supabase
          .from("subscriptions")
          .update({ status: "inactive" })
          .eq("id", sub.id);
      }
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error(err);
    return Response.json({ error: "Cron failed" }, { status: 500 });
  }
}