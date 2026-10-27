"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, ArrowDownToLine, ArrowRight, Bot, Bug, ChevronDown, CircleDashed, Cloud, Code2, FilePlus2, GitBranch, GitPullRequest, MessageSquare, Plus, Send, ShieldCheck, Sparkles, TerminalSquare, WandSparkles } from "lucide-react";

type ServerRecord = { id: string; status?: string; ip?: string; plan?: string };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [dataError, setDataError] = useState(false);
  const [userLabel, setUserLabel] = useState("builder");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [{ data }, response] = await Promise.all([
          supabase.auth.getUser(),
          fetch("/api/servers/list", { cache: "no-store" })
        ]);
        const result = await response.json();
        if (!active) return;
        setUserLabel(data.user?.user_metadata?.user_name || data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0] || "builder");
        if (response.ok && Array.isArray(result.servers)) setServers(result.servers);
        else setDataError(true);
      } catch { if (active) setDataError(true); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 2xl:grid-cols-[minmax(0,1fr)_312px]">
      <div className="min-w-0">
        <div className="mb-6 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[#238636] px-2.5 py-1 text-[11px] text-[#3fb950]">Preview <ChevronDown size={12} /></span><span className="text-xs text-[#7d8590]">Workspace overview</span></div>
        <section className="mx-auto max-w-[820px]">
          <h1 className="mb-4 text-center text-xl font-semibold tracking-tight text-[#f0f6fc] sm:text-2xl">Good morning, {userLabel}!</h1>
          <form onSubmit={e => { e.preventDefault(); if (draft.trim()) window.location.href = "/dashboard/applications"; }} className="rounded-xl border border-[#3d444d] bg-[#0d1117] p-4 shadow-sm transition focus-within:border-[#6e7681]">
            <label htmlFor="workspace-prompt" className="sr-only">Ask Wanky Cloud or describe an application</label>
            <textarea id="workspace-prompt" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask anything or describe what you want to deploy" rows={3} className="min-h-[86px] w-full resize-y bg-transparent text-sm leading-6 text-[#e6edf3] outline-none placeholder:text-[#8b949e]" />
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#8b949e]"><button type="button" className="inline-flex items-center gap-2 hover:text-[#e6edf3]"><WandSparkles size={15} /> Auto <ChevronDown size={12} /></button><span className="hidden h-4 w-px bg-[#30363d] sm:block" /><span>Workspace-aware actions</span><span className="ml-auto hidden items-center gap-2 sm:flex"><ShieldCheck size={14} /> Protected by workspace access</span></div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#21262d] pt-3"><Link href="/dashboard/applications" className="inline-flex items-center gap-2 rounded-md border border-[#30363d] px-3 py-2 text-xs hover:bg-white/[0.05]"><MessageSquare size={14} /> Ask <ChevronDown size={12} /></Link><button type="button" className="inline-flex items-center gap-2 rounded-md border border-[#30363d] px-3 py-2 text-xs hover:bg-white/[0.05]"><Cloud size={14} /> All projects <ChevronDown size={12} /></button><button type="button" aria-label="Attach context" className="flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] text-[#9da7b3] hover:bg-white/[0.05]"><Plus size={15} /></button><button type="submit" aria-label="Continue to applications" className="ml-auto flex h-8 w-8 items-center justify-center rounded-md bg-[#b8f36b] text-[#10170b] hover:bg-[#c8ff83]"><Send size={14} /></button></div>
          </form>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[{label:"Debug",icon:Bug,href:"/dashboard/logs"},{label:"Agent",icon:Bot,href:"/dashboard/applications"},{label:"Create issue",icon:CircleDashed,href:"/dashboard/applications"},{label:"Write code",icon:Code2,href:"/dashboard/applications"}].map(({label,icon:Icon,href})=><Link key={label} href={href} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#30363d] px-3 py-3 text-xs text-[#c9d1d9] transition hover:border-[#6e7681] hover:bg-white/[0.035]"><Icon size={15} className="text-[#9da7b3]" />{label}{label==="Write code"&&<ChevronDown size={12}/>}</Link>)}
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold text-[#8b949e]">Your applications</h2><Link href="/dashboard/applications" className="inline-flex items-center gap-2 text-xs text-[#58a6ff] hover:underline">View all <ArrowRight size={13}/></Link></div>
            <div className="overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117]">
              {loading ? <div className="p-5 text-xs text-[#8b949e]">Loading workspace…</div> : servers.length ? servers.slice(0,4).map((server,index)=><div key={server.id} className={`flex items-center gap-3 px-4 py-4 ${index?"border-t border-[#21262d]":""}`}><span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] bg-[#151b23]"><GitBranch size={15} className="text-[#9da7b3]"/></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{server.id}</div><div className="mt-1 text-[11px] text-[#8b949e]">{server.plan || "Compute service"} · {server.ip && server.ip!=="Provisioning..." ? server.ip : "Address not assigned"}</div></div><Status status={server.status || "unknown"}/></div>) : <div className="px-5 py-7"><p className="text-sm font-medium">{dataError ? "Workspace data is unavailable" : "Your first project starts here"}</p><p className="mt-1 text-xs leading-5 text-[#8b949e]">{dataError ? "We could not load service records. Try refreshing the page." : "Create an application or service to begin building your workspace. No projects are listed yet."}</p><Link href="/dashboard/applications" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#30363d] px-3 py-2 text-xs hover:bg-white/[0.04]"><Plus size={14}/> Create project</Link></div>}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold text-[#8b949e]">Recent deployments</h2><Link href="/dashboard/deployments" className="text-xs text-[#58a6ff] hover:underline">View all →</Link></div>
            <div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-5"><div className="flex items-start gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d]"><GitPullRequest size={15} className="text-[#8b949e]"/></span><div><p className="text-sm font-medium">Deployment history</p><p className="mt-1 text-xs leading-5 text-[#8b949e]">Your real deployment events will appear here once the deployment event source is connected.</p></div></div></div>
          </section>
        </section>
      </div>

      <aside className="hidden space-y-4 2xl:block">
        <section className="overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117]">
          <div className="flex h-14 items-center justify-between border-b border-[#30363d] px-4"><h2 className="text-sm font-semibold">Get started with Wanky Cloud</h2><Sparkles size={15} className="text-[#b8f36b]"/></div>
          <div className="p-4"><p className="text-xs leading-5 text-[#8b949e]">Set up your workspace and connect the services you want to run.</p><div className="mt-4 space-y-3">{[{label:"Explore applications",href:"/dashboard/applications"},{label:"Review compute services",href:"/dashboard/servers"},{label:"Read build & runtime logs",href:"/dashboard/logs"}].map(item=><Link key={item.label} href={item.href} className="flex items-center justify-between gap-2 text-xs text-[#c9d1d9] hover:text-[#b8f36b]">{item.label}<ArrowRight size={13}/></Link>)}</div></div>
        </section>
        <section className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4"><h2 className="text-sm font-semibold">Latest platform updates</h2><div className="mt-4 border-l border-[#30363d] pl-4"><div className="relative mb-4"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#6e7681]"/><p className="text-[10px] text-[#8b949e]">Platform direction</p><p className="mt-1 text-xs leading-5 text-[#c9d1d9]">Application workspace and deployment foundations are being connected.</p></div><div className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#6e7681]"/><p className="text-[10px] text-[#8b949e]">Security</p><p className="mt-1 text-xs leading-5 text-[#c9d1d9]">Payment and provisioning flows are being hardened before activation.</p></div></div><Link href="/" className="mt-4 inline-flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white">Public website <ArrowRight size={12}/></Link></section>
        <section className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4"><div className="flex items-center gap-2 text-xs font-semibold"><Activity size={14} className="text-[#b8f36b}"/> Platform status</div><p className="mt-2 text-[11px] leading-5 text-[#8b949e]">Some integrations are still planned. No simulated telemetry is shown as live data.</p></section>
      </aside>
    </div>
  );
}

function Status({status}:{status:string}) {
  const normalized=status.toLowerCase();
  const styles=normalized==="running" ? "border-[#238636]/50 bg-[#238636]/10 text-[#3fb950]" : ["creating","provisioning","pending"].includes(normalized) ? "border-[#9e6a24]/50 bg-[#9e6a24]/10 text-[#e3b341]" : "border-[#30363d] bg-[#151b23] text-[#9da7b3]";
  return <span className={`rounded-full border px-2 py-1 text-[10px] ${styles}`}>{status}</span>;
}
