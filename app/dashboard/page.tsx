"use client";

import { useState } from "react";

export default function Dashboard() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);

  const createVPS = async () => {
    console.log("clicked");

    setLoading(true);
    setIp("");

    try {
      const res = await fetch("/api/servers/create", {
        method: "POST",
      });

      const data = await res.json();
      console.log(data);

      setIp(data.ip);
    } catch (err) {
      console.error("Error creating VPS:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 border rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Wanky Cloud ☁️
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Deploy your server instantly
        </p>

        <button
          onClick={createVPS}
          disabled={loading}
          className="mt-6 w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "🚀 Create VPS"}
        </button>

        {ip && (
          <div className="mt-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-sm text-gray-600">Server IP</p>
            <p className="font-mono text-lg text-gray-900">{ip}</p>
          </div>
        )}
      </div>
    </div>
  );
}