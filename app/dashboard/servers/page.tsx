"use client";

import { useEffect, useState } from "react";

type Server = {
  id: string;
  ip: string;
  status: string;
  plan: string;
};

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/servers/list");
      const data = await res.json();
      setServers(data.servers || []);
    } catch (err) {
      console.error("FETCH SERVERS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  if (loading) {
    return <p className="p-6">Loading servers...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Your Servers</h1>

      {servers.length === 0 ? (
        <p className="text-gray-500">No servers yet.</p>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="p-4 border rounded-lg bg-white shadow-sm"
            >
              <p className="font-mono text-sm">{server.id}</p>
              <p className="text-sm text-gray-500">{server.ip}</p>
              <p className="text-xs text-gray-400 mt-1">
                Plan: {server.plan}
              </p>

              <span className="text-xs mt-2 inline-block">
                {server.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}