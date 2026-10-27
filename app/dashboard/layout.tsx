"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Activity, Bell, BookOpen, Boxes, ChevronDown, CircleHelp, Cloud, CreditCard, Gauge, Globe2, Home, Layers3, Menu, Plus, Search, Server, Settings2, ShieldCheck, TerminalSquare, Users, X } from "lucide-react";

const groups = [
  { title: "WORKSPACE", items: [{ label: "Overview", href: "/dashboard", icon: Home }, { label: "Projects", href: "/dashboard/projects", icon: Boxes }, { label: "Applications", href: "/dashboard/applications", icon: Layers3 }] },
  { title: "DEPLOYMENT & OBSERVABILITY", items: [{ label: "Deployments", href: "/dashboard/deployments", icon: Activity }, { label: "Build & Runtime Logs", href: "/dashboard/logs", icon: TerminalSquare }, { label: "Monitoring", href: "/dashboard/monitoring", icon: Gauge }] },
  { title: "RESOURCES", items: [{ label: "Compute / Services", href: "/dashboard/servers", icon: Server }, { label: "Environment Variables", href: "/dashboard/environment-variables", icon: Settings2 }, { label: "Storage", href: "/dashboard/storage", icon: Boxes }, { label: "Networking", href: "/dashboard/networking", icon: Globe2 }, { label: "Domains", href: "/dashboard/domains", icon: Globe2 }] },
  { title: "MANAGEMENT", items: [{ label: "Security", href: "/dashboard/security", icon: ShieldCheck }, { label: "Team & Access", href: "/dashboard/team", icon: Users }, { label: "Usage & Billing", href: "/dashboard/wallet", icon: CreditCard }] },
  { title: "PREFERENCES", items: [{ label: "Settings", href: "/dashboard/settings", icon: Settings2 }] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) router.replace("/auth");
      else setChecking(false);
    };
    checkUser();
    return () => { active = false; };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-[#05070a] text-sm text-[#9aa5b2]"><span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#b8f36b]" /> Checking your workspace…</div>;

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e6edf3]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-4 border-b border-[#30363d] bg-[#05070a]/95 px-4 backdrop-blur md:px-6">
        <button aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen(!menuOpen)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363d] text-[#aab4c0] hover:bg-white/[0.06] md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b8f36b] text-[#10170b]"><Cloud size={19} /></span><span className="hidden text-sm font-semibold tracking-tight sm:inline">Wanky Cloud</span></Link>
        <span className="hidden h-6 w-px bg-[#30363d] sm:block" />
        <span className="truncate text-sm font-semibold">{groups.flatMap(g => g.items).find(i => i.href === pathname)?.label ?? "Workspace"}</span>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) router.push("/dashboard?search=" + encodeURIComponent(search.trim())); }} className="hidden h-9 w-48 items-center gap-2 rounded-lg border border-[#30363d] px-3 text-[#8b949e] lg:flex xl:w-64"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search workspace" placeholder="Search workspace…" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-[#7d8590]" /><kbd className="rounded border border-[#30363d] px-1 text-[10px]">/</kbd></form>
          <button onClick={() => router.push("/dashboard/applications")} aria-label="Create application" className="hidden h-9 items-center gap-2 rounded-lg border border-[#30363d] px-3 text-sm hover:bg-white/[0.06] sm:flex"><Plus size={15} /><span className="hidden xl:inline">New</span><ChevronDown size={13} /></button>
          <button onClick={() => router.push("/dashboard/monitoring")} aria-label="Monitoring" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363d] text-[#9aa5b2] hover:bg-white/[0.06]"><Bell size={16} /></button>
          <button onClick={() => router.push("/dashboard/settings")} aria-label="Settings" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[#30363d] text-[#9aa5b2] hover:bg-white/[0.06] sm:flex"><Settings2 size={16} /></button>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Account menu" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#30363d] bg-[#151b23] text-xs font-semibold text-[#b8f36b]">WC</button>
        </div>
      </header>

      {menuOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed bottom-0 left-0 top-16 z-40 flex w-[272px] flex-col overflow-y-auto border-r border-[#30363d] bg-[#0d1117] px-3 pb-5 pt-4 transition-transform md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="mb-5 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#e6edf3]"><Cloud size={17} className="text-[#b8f36b]" /> Your workspace <ChevronDown size={14} className="ml-auto text-[#8b949e]" /></Link>
        <nav className="space-y-5">
          {groups.map(group => <section key={group.title}><h2 className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-[#7d8590]">{group.title}</h2><div className="space-y-0.5">{group.items.map(item => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")); return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition ${active ? "bg-[#21262d] font-semibold text-[#f0f6fc] before:absolute before:bottom-1 before:left-0 before:top-1 before:w-[3px] before:rounded-full before:bg-[#b8f36b]" : "text-[#9da7b3] hover:bg-white/[0.04] hover:text-[#e6edf3]"}`}><Icon size={16} strokeWidth={1.8} /><span>{item.label}</span>{["/dashboard/projects","/dashboard/applications","/dashboard/deployments","/dashboard/logs","/dashboard/monitoring","/dashboard/environment-variables","/dashboard/storage","/dashboard/networking","/dashboard/domains","/dashboard/security","/dashboard/team","/dashboard/settings"].includes(item.href) && <span className="ml-auto rounded border border-[#30363d] px-1.5 py-0.5 text-[9px] text-[#7d8590]">Planned</span>}</Link>; })}</div></section>)}
        </nav>
        <div className="mt-auto pt-6"><div className="rounded-lg border border-[#30363d] bg-[#151b23] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><BookOpen size={15} className="text-[#b8f36b]" /> Need a hand?</div><p className="mt-2 text-[11px] leading-5 text-[#8b949e]">Your cloud workspace is growing. Planned features are labelled clearly until connected.</p><button onClick={() => router.push("/")} className="mt-2 text-xs text-[#b8f36b] hover:underline">Visit public site →</button></div><button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-[#9da7b3] hover:bg-white/[0.04]"><CircleHelp size={15} /> Help & account <span className="ml-auto">↗</span></button></div>
      </aside>
      <main className="min-h-screen pt-16 md:pl-[272px]"><div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8">{children}</div></main>
    </div>
  );
}
