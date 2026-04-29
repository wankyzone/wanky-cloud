import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, amount } = body;

    if (!email || !amount) {
      return NextResponse.json(
        { error: "Missing email or amount" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // convert to kobo
      }),
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error("PAYSTACK INIT ERROR:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}