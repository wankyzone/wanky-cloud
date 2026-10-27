import { NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/paystack-security";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      return NextResponse.json(
        { error: "Webhook verification is not configured.", code: "server_misconfigured" },
        { status: 503 },
      );
    }

    if (!verifyPaystackSignature(body, signature, secret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature.", code: "invalid_signature" },
        { status: 401 },
      );
    }

    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook payload.", code: "invalid_payload" },
        { status: 400 },
      );
    }

    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return NextResponse.json(
        { error: "Invalid webhook payload.", code: "invalid_payload" },
        { status: 400 },
      );
    }

    if ((event as { event?: unknown }).event === "charge.success") {
      return NextResponse.json(
        { error: "Payment fulfillment is unavailable until idempotent payment storage is configured.", code: "fulfillment_unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed.", code: "webhook_failed" },
      { status: 500 },
    );
  }
}