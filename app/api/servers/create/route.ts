// src/app/api/servers/create/route.ts

export async function POST() {
  try {
    // 🔥 MOCK SERVER (temporary)
    const server = {
      id: "mock-" + Date.now(),
      public_net: {
        ipv4: {
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        },
      },
    };

    return Response.json({
      success: true,
      ip: server.public_net.ipv4.ip,
      id: server.id,
    });
  } catch (error: any) {
    return Response.json({ error: "Mock failed" }, { status: 500 });
  }
}