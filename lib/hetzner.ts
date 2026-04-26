// src/lib/hetzner.ts
import axios from "axios";

export const hetzner = axios.create({
  baseURL: "https://api.hetzner.cloud/v1",
  headers: {
    Authorization: `Bearer ${process.env.HETZNER_API_KEY}`,
  },
});

export async function createServer() {
  const res = await hetzner.post("/servers", {
    name: "wanky-vps",
    server_type: "cx11",
    image: "ubuntu-22.04",
    location: "fsn1",
  });

  return res.data.server;
}