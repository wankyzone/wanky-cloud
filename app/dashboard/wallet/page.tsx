"use client";

import { useEffect, useState } from "react";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/user/balance");
      const data = await res.json();
      setBalance(data.balance || 0);
    } catch (err) {
      console.error("BALANCE ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const payWithPaystack = () => {
    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
      email: "user@email.com", // replace with real user later
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

      onClose: function () {
        console.log("Payment closed");
      },
    });

    handler.openIframe();
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

      <div className="bg-white border p-4 rounded-lg mb-4">
        <p className="text-sm text-gray-500">Balance</p>
        <p className="text-xl font-bold">₦{balance}</p>
      </div>

      <button
        onClick={payWithPaystack}
        className="w-full bg-black text-white py-2 rounded-lg"
      >
        Fund Wallet
      </button>
    </div>
  );
}