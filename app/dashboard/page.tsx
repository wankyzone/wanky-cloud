"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PLANS, PlanId } from "@/lib/plans";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("starter");

  // 🔄 Fetch wallet
  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/user/balance");
      const data = await res.json();
      setBalance(data.balance || 0);
    } catch (err) {
      console.error("BALANCE ERROR:", err);
    }
  };

  // 🔄 Fetch subscription
  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (err) {
      console.error("SUB ERROR:", err);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchSubscription();
  }, []);

  // 🚀 Create VPS
  const createVPS = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/servers/create", {
        method: "POST",
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("CREATE ERROR:", err);
    }

    setLoading(false);
  };

  // 💰 Fund wallet
  const payWithPaystack = () => {
    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
      email: "user@email.com",
      amount: 5000 * 100,
      ref: "" + Math.floor(Math.random() * 1000000000),

      callback: async function (response: any) {
        await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference: response.reference,
          }),
        });

        fetchBalance();
      },
    });

    handler.openIframe();
  };

  // 💳 Subscribe to plan
  const subscribeToPlan = () => {
    const plan = PLANS[selectedPlan];

    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
      email: "user@email.com",
      amount: plan.price * 100,
      ref: "" + Math.floor(Math.random() * 1000000000),

      callback: async function (response: any) {
        await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference: response.reference,
            plan: selectedPlan,
          }),
        });

        setShowUpgrade(false);
        fetchSubscription();
      },
    });

    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 border rounded-2xl shadow-sm">

        {/* HEADER */}
        <h1 className="text-2xl font-bold text-gray-900">
          Wanky Cloud ☁️
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Deploy your server instantly
        </p>

        {/* 💰 WALLET */}
        <div className="bg-white border p-4 rounded-lg mt-4">
          <p className="text-sm text-gray-500">Wallet Balance</p>
          <p className="text-xl font-bold">₦{balance}</p>
        </div>

        {/* 💳 FUND */}
        <button
          onClick={payWithPaystack}
          className="mt-4 w-full bg-black text-white py-2 rounded-lg"
        >
          Fund Wallet
        </button>

        {/* 📦 SUBSCRIPTION */}
        <div className="bg-pink-50 p-4 rounded-lg mt-4">
          <p className="text-sm text-gray-500">Subscription</p>

          <p className="font-bold">
            {subscription?.plan || "No Plan"}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Renews on: {new Date(subscription?.current_period_end).toLocaleDateString()}
          </p>

          {!subscription && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="mt-2 bg-pink-500 text-white px-3 py-1 rounded"
            >
              Upgrade Plan
            </button>
          )}
        </div>

        {/* 🚀 CREATE VPS */}
        <button
          onClick={createVPS}
          disabled={loading}
          className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "🚀 Create VPS"}
        </button>

        {/* 🔓 LOGOUT */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="mt-4 text-sm text-red-500"
        >
          Logout
        </button>
      </div>

      {/* 💳 UPGRADE MODAL */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[400px]">

            <h2 className="text-xl font-bold mb-4">
              Choose Plan
            </h2>

            <div className="space-y-3">
              {Object.entries(PLANS).map(([id, plan]) => (
                <button
                  key={id}
                  onClick={() => setSelectedPlan(id as PlanId)}
                  className={`w-full p-3 border rounded-lg text-left ${
                    selectedPlan === id
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-sm text-gray-500">
                    ₦{plan.price} / month
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={subscribeToPlan}
              className="mt-4 w-full bg-pink-500 text-white py-2 rounded"
            >
              Subscribe
            </button>

            <button
              onClick={() => setShowUpgrade(false)}
              className="mt-2 w-full text-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}