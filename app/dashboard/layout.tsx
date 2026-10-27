"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navigation = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/apps", label: "Applications" },
  { href: "/dashboard/wallet", label: "Billing" },
  { href: "/dashboard/servers", label: "Legacy servers" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/auth");
        return;
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setAuthError("Unable to verify your session. Please retry.");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError("Unable to sign out. Please try again.");
      return;
    }
    router.replace("/auth");
  }

  if (loading) {
    return <p role="status" className="p-6 text-sm text-muted">Checking your session…</p>;
  }

  if (authError) {
    return (
      <main className="p-6">
        <p role="alert" className="text-sm text-danger-text">{authError}</p>
        <button className="mt-3 rounded-lg border border-border px-4 py-2 text-sm hover:border-brand" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="border-b border-border bg-surface p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight hover:text-brand">Wanky Cloud</Link>
        <nav aria-label="Dashboard" className="mt-5 flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {navigation.map((item) => {
            const selected = pathname === item.href || (
              item.href === "/dashboard/apps" && pathname.startsWith("/dashboard/apps/")
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                  selected ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-6 hidden text-xs leading-5 text-muted md:block">
          Application hosting is not available until the build and runtime pipeline is connected.
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-8">
          <h1 className="font-semibold">Customer dashboard</h1>
          <button onClick={() => void signOut()} className="text-sm text-muted transition-colors hover:text-brand">
            Sign out
          </button>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
