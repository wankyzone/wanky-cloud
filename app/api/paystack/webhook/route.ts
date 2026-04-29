import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.text(); // raw body required
    const signature = req.headers.get("x-paystack-signature");

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    // 🔐 Verify Paystack webhook
    if (hash !== signature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);

    // ✅ Only handle successful payments
    if (event.event === "charge.success") {
      const email = event.data.customer.email;
      const amount = event.data.amount / 100; // convert from kobo

      // 👉 find user by email
      const { data: user } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (!user) {
        return new NextResponse("User not found", { status: 404 });
      }

      // 💰 Update wallet
      await supabase
        .from("profiles")
        .update({
          balance: (user.balance || 0) + amount,
        })
        .eq("id", user.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return new NextResponse("Webhook failed", { status: 500 });
  }
}