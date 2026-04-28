import { supabase } from "@/lib/supabase";
import { PLANS, PlanId } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // ✅ Get subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!sub) {
      return Response.json(
        { error: "No active subscription" },
        { status: 403 }
      );
    }

    const planKey = sub.plan as PlanId;
    const plan = PLANS[planKey];

    if (!plan) {
      return Response.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // ✅ Count servers
    const { data: servers } = await supabase
      .from("servers")
      .select("id")
      .eq("user_id", userId);

    if ((servers?.length || 0) >= plan.maxServers) {
      return Response.json(
        { error: "Server limit reached" },
        { status: 403 }
      );
    }

    // ✅ Create server
    const server = {
      id: "srv-" + Date.now(),
      user_id: userId,
      ip: "Provisioning...",
      status: "creating",
      plan: planKey,
    };

    await supabase.from("servers").insert([server]);

    // simulate provisioning
    setTimeout(async () => {
      await supabase
        .from("servers")
        .update({
          status: "running",
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        })
        .eq("id", server.id);
    }, 4000);

    return Response.json({ success: true });

  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}