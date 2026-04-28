"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🔐 AUTH GUARD
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/auth");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* SIDEBAR */}
      <aside className="w-64 border-r p-6 hidden md:flex flex-col">
        <h2 className="text-xl font-bold mb-8">
          Wanky Cloud ☁️
        </h2>

        <nav className="flex flex-col gap-4 text-sm">
          <Link
            href="/dashboard"
            className="hover:text-pink-500 transition"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/servers"
            className="hover:text-pink-500 transition"
          >
            Servers
          </Link>

          <Link
            href="/"
            className="hover:text-pink-500 transition mt-8 text-gray-400"
          >
            ← Back to Home
          </Link>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <header className="h-16 border-b flex items-center justify-between px-6">
          <h1 className="font-semibold text-lg">
            Dashboard
          </h1>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Welcome, Builder 🚀</span>

            {/* 🔓 LOGOUT */}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth");
              }}
              className="text-red-500 hover:underline"
            >
              Logout
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}