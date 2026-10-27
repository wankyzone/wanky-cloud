"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PLANS, PlanId } from "@/lib/plans";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, CircleHelp, Clock3, CreditCard, Plus, RefreshCw, Server, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";

type ServerRecord = { id: string; status?: string; ip?: string; plan?: string; created_at?: string };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [dataError, setDataError] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("starter");

  const loadOverview = async () => {
    setRefreshing(true);
    setDataError(false);
    try {
      const [balanceRes, subRes, serverRes] = await Promise.all([
        fetch("/api/user/balance", { cache: "no-store" }),
        fetch("/api/subscription", { cache: "no-store" }),
        fetch("/api/servers/list", { cache: "no-store" }),
      ]);
      const [balanceData, subData, serverData] = await Promise.all([balanceRes.json(), subRes.json(), serverRes.json()]);
      if (balanceRes.ok && typeof balanceData.balance === "number") setBalance(balanceData.balance);
      else setBalance(null);
      if (subRes.ok) setSubscription(subData.subscription ?? null);
      if (serverRes.ok && Array.isArray(serverData.servers)) setServers(serverData.servers);
      if (!balanceRes.ok || !subRes.ok || !serverRes.ok) setDataError(true);
    } catch { setDataError(true); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void loadOverview(); }, []);

  const createVPS = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/servers/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) window.alert(data.error || "Could not start server request.");
      else await loadOverview();
    } catch { window.alert("Could not reach the server. Please try again."); }
    finally { setRefreshing(false); }
  };

  const payWithPaystack = () => {
    window.alert("Wallet funding will be available after the payment verification flow is secured.");
  };

  const subscribeToPlan = () => {
    window.alert("Plan checkout will be available after the payment verification flow is secured.");
  };

  const activeServers = servers.filter(server => server.status === "running").length;
  const pendingServers = servers.filter(server => ["creating", "provisioning", "pending"].includes((server.status || "").toLowerCase())).length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs text-[#8b949e]"><span>Workspace</span><span>/</span><span className="text-[#c9d1d9]">Overview</span></div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Your cloud workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#9da7b3]">A clear view of your services, account, and recent activity.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => void loadOverview()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] px-3.5 py-2.5 text-xs font-medium text-[#c9d1d9] hover:bg-white/[0.04] disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</button><button onClick={createVPS} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg bg-[#b8f36b] px-3.5 py-2.5 text-xs font-semibold text-[#10170b] hover:bg-[#c8ff83] disabled:opacity-50"><Plus size={15} /> New service</button></div>
      </div>

      {dataError && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#9e6a24]/40 bg-[#9e6a24]/10 px-4 py-3 text-xs text-[#e3bd83]">Some workspace data could not be loaded. Values may be incomplete.<button onClick={() => void loadOverview()} className="underline">Retry</button></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Services" value={loading ? "Loading…" : String(servers.length)} detail={loading ? "Fetching account data" : `${activeServers} running · ${pendingServers} provisioning`} icon={Server} />
        <Metric title="Subscription" value={loading ? "Loading…" : subscription?.plan || "No plan"} detail={subscription?.status || "Plan status"} icon={ShieldCheck} />
        <Metric title="Wallet balance" value={loading ? "Loading…" : balance === null ? "Unavailable" : `₦${balance.toLocaleString("en-NG")}`} detail="Account balance" icon={CreditCard} />
        <Metric title="Monitoring" value="Not connected" detail="Telemetry integration pending" icon={Activity} muted />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.8fr)]">
        <div className="overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center justify-between border-b border-[#30363d] px-5 py-4"><div><h2 className="text-sm font-semibold">Your services</h2><p className="mt-1 text-xs text-[#8b949e]">Resources associated with your account</p></div><Link href="/dashboard/servers" className="inline-flex items-center gap-1.5 text-xs text-[#b8f36b] hover:underline">View services <ArrowRight size={13} /></Link></div>
          {loading ? <div className="space-y-3 p-5"><div className="h-10 animate-pulse rounded-md bg-white/[0.04]" /><div className="h-10 animate-pulse rounded-md bg-white/[0.04]" /></div> : servers.length ? <div className="divide-y divide-[#21262d]">{servers.slice(0,5).map(server => <div key={server.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363d] bg-[#151b23] text-[#b8f36b]"><Server size={17} /></span><div className="min-w-0"><div className="truncate text-sm font-medium">{server.id}</div><div className="mt-1 text-xs text-[#8b949e]">{server.ip && server.ip !== "Provisioning..." ? server.ip : "Address not assigned"}{server.plan ? ` · ${server.plan}` : ""}</div></div></div><StatusPill status={server.status || "unknown"} /></div>)}</div> : <div className="flex flex-col items-center px-6 py-12 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#30363d] bg-[#151b23] text-[#b8f36b]"><Boxes size={21} /></span><h3 className="mt-4 text-sm font-semibold">Your workspace is ready to begin</h3><p className="mt-2 max-w-sm text-xs leading-5 text-[#8b949e]">Create your first service when provisioning is enabled for your account. No services are currently listed.</p><button onClick={createVPS} disabled={refreshing} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#b8f36b] px-4 py-2.5 text-xs font-semibold text-[#10170b] hover:bg-[#c8ff83] disabled:opacity-50"><Plus size={14} /> Create service</button></div>}
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-[#30363d] bg-[#0d1117]">
            <div className="border-b border-[#30363d] px-4 py-4"><h2 className="text-sm font-semibold">Quick start</h2><p className="mt-1 text-xs text-[#8b949e]">Common next steps</p></div>
            <div className="p-2">{[{icon:Boxes,title:"Explore services",desc:"Review your compute resources",href:"/dashboard/servers"},{icon:CreditCard,title:"Usage & billing",desc:"Check account and plan details",href:"/dashboard/wallet"},{icon:TerminalSquare,title:"Build & runtime logs",desc:"Log viewer integration planned",href:"/dashboard/logs"}].map(({icon:Icon,title,desc,href}) => <Link key={title} href={href} className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-white/[0.04]"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#30363d] text-[#9da7b3]"><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{title}</span><span className="mt-1 block text-[11px] text-[#8b949e]">{desc}</span></span><ArrowUpRight size={14} className="text-[#7d8590]" /></Link>)}</div>
          </section>
          <section className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-[#b8f36b]" /> Platform status</div><p className="mt-2 text-xs leading-5 text-[#8b949e]">Some cloud capabilities are still being integrated. Planned pages are labelled in navigation; metrics appear only when connected to real sources.</p><div className="mt-3 flex items-center gap-2 text-[11px] text-[#c9d1d9]"><Clock3 size={13} /> Status is not a live health check</div></section>
        </div>
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#0d1117]">
        <div className="flex items-center justify-between border-b border-[#30363d] px-5 py-4"><div><h2 className="text-sm font-semibold">Activity</h2><p className="mt-1 text-xs text-[#8b949e]">Workspace events</p></div><span className="text-[11px] text-[#7d8590]">Recent</span></div>
        <div className="flex flex-col items-center px-6 py-9 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#30363d] text-[#8b949e]"><Activity size={17} /></span><p className="mt-3 text-xs font-medium text-[#c9d1d9]">No activity feed connected yet</p><p className="mt-1 max-w-md text-[11px] leading-5 text-[#8b949e]">Deployment events and audit activity will appear here when their event sources are integrated.</p></div>
      </section>

      {showUpgrade && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"><div role="dialog" aria-modal="true" aria-labelledby="upgrade-title" className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#0d1117] p-6"><h2 id="upgrade-title" className="text-lg font-semibold">Choose a plan</h2><p className="mt-1 text-sm text-[#8b949e]">Checkout will be enabled after payment verification is secured.</p><div className="mt-4 space-y-2">{Object.entries(PLANS).map(([id,plan]) => <button key={id} onClick={() => setSelectedPlan(id as PlanId)} className={`w-full rounded-lg border p-3 text-left ${selectedPlan===id ? "border-[#b8f36b] bg-[#b8f36b]/[0.07]" : "border-[#30363d]"}`}><span className="block text-sm font-medium">{plan.name}</span><span className="mt-1 block text-xs text-[#8b949e]">₦{plan.price.toLocaleString("en-NG")} / month</span></button>)}</div><div className="mt-5 flex gap-3"><button onClick={subscribeToPlan} className="flex-1 rounded-lg bg-[#b8f36b] px-4 py-2.5 text-sm font-semibold text-[#10170b]">Continue</button><button onClick={() => setShowUpgrade(false)} className="rounded-lg border border-[#30363d] px-4 py-2.5 text-sm">Cancel</button></div></div></div>}
    </div>
  );
}

function Metric({title,value,detail,icon:Icon,muted=false}:{title:string;value:string;detail:string;icon:typeof Server;muted?:boolean}) {
  return <article className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs text-[#8b949e]">{title}</span><Icon size={16} className={muted ? "text-[#7d8590]" : "text-[#b8f36b]"} /></div><div className="mt-3 truncate text-xl font-semibold tracking-tight">{value}</div><p className="mt-1 text-[11px] text-[#8b949e]">{detail}</p></article>;
}

function StatusPill({status}:{status:string}) {
  const normalized=status.toLowerCase();
  const cls=normalized==="running" ? "border-[#238636]/50 bg-[#238636]/10 text-[#3fb950]" : ["creating","provisioning","pending"].includes(normalized) ? "border-[#9e6a24]/50 bg-[#9e6a24]/10 text-[#e3b341]" : "border-[#30363d] bg-[#151b23] text-[#9da7b3]";
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${cls}`}>{status}</span>;
}
