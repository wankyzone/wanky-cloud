// src/app/api/servers/create/route.ts

import { createServer } from "@/lib/hetzner";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { userId } = body;

  // fetch user
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user || user.wallet_balance < 3000) {
    return Response.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // create VPS
  const server = await createServer();

  // update wallet
  await supabase
    .from("users")
    .update({ wallet_balance: user.wallet_balance - 3000 })
    .eq("id", userId);

  // store server
  await supabase.from("servers").insert({
    user_id: userId,
    provider: "hetzner",
    provider_server_id: server.id,
    ip_address: server.public_net.ipv4.ip,
    status: "running",
  });

  return Response.json({
    success: true,
    ip: server.public_net.ipv4.ip,
  });
}