"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const res = await authenticatedFetch("/api/user/balance");
      const data = await res.json();
      setBalance(data.balance || 0);
    } catch (err) {
      console.error("BALANCE ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const payWithPaystack = async () => {
    try {
      const res = await authenticatedFetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "wallet" }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to initialize payment.");
        return;
      }

      if (typeof data.data?.authorization_url === "string") {
        window.location.assign(data.data.authorization_url);
      }
    } catch {
      alert("Unable to initialize payment.");
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  if (loading) {
    return <p className="p-6">Loading wallet...</p>;
  }

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">Wallet</h1>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">Balance</p>
        <p className="text-xl font-bold">₦{balance}</p>
      </div>

      <button
        onClick={payWithPaystack}
        className="w-full rounded-lg bg-brand-button py-2 text-white transition-colors hover:bg-brand-button-hover"
      >
        Fund Wallet
      </button>
    </div>
  );
}