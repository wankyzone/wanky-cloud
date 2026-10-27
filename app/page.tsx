import Link from "next/link";
import { ArrowRight, Check, Cloud, Code2, Globe2, LockKeyhole, Network, Server, ShieldCheck, Activity } from "lucide-react";

const capabilities = [
  { icon: Server, title: "Compute & services", description: "A clear home for the workloads you run and the resources they need." },
  { icon: Code2, title: "Application delivery", description: "Build toward a repeatable path from source code to a running application." },
  { icon: Activity, title: "Logs & monitoring", description: "Bring deployment events and service health into one developer workspace." },
  { icon: ShieldCheck, title: "Security by design", description: "Build access control, secret handling, and Wanky Protect into the platform." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] text-[#f0f3f6]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Wanky Cloud home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b8f36b] text-[#10170b]"><Cloud size={21} /></span>
            <span className="text-base font-semibold tracking-tight">wanky<span className="text-[#b8f36b]">cloud</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#a6b0bd] md:flex">
            <a href="#platform" className="transition hover:text-white">Platform</a>
            <a href="#capabilities" className="transition hover:text-white">Capabilities</a>
            <a href="#security" className="transition hover:text-white">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="hidden rounded-lg px-4 py-2.5 text-sm text-[#d2d8e0] transition hover:bg-white/5 sm:inline-flex">Sign in</Link>
            <Link href="/auth" className="inline-flex items-center gap-2 rounded-lg bg-[#b8f36b] px-4 py-2.5 text-sm font-semibold text-[#11180c] transition hover:bg-[#c8ff83]">Get started <ArrowRight size={15} /></Link>
          </div>
        </div>
      </header>

      <section id="platform" className="relative mx-auto grid max-w-[1280px] gap-14 px-5 pb-24 pt-20 sm:px-8 md:pt-28 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:pb-32">
        <div className="pointer-events-none absolute -left-40 top-8 h-96 w-96 rounded-full bg-[#9ee84d]/[0.08] blur-[100px]" />
        <div className="relative">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs text-[#c2cbd5]"><span className="h-1.5 w-1.5 rounded-full bg-[#b8f36b]" /> Cloud infrastructure, built for builders</div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[68px]">Your apps deserve a <span className="text-[#b8f36b]">better home.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#9aa5b2] sm:text-lg sm:leading-8">A focused workspace for deploying, operating, and understanding your applications. Start with the essentials; grow into a connected cloud platform.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/auth" className="inline-flex items-center gap-2 rounded-lg bg-[#b8f36b] px-5 py-3.5 text-sm font-semibold text-[#10170b] transition hover:bg-[#c8ff83]">Open your workspace <ArrowRight size={16} /></Link>
            <a href="#capabilities" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3.5 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/[0.04]">Explore the platform</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#8f9aa7]">
            <span className="flex items-center gap-2"><Check size={14} className="text-[#b8f36b]" /> Developer-first workflow</span>
            <span className="flex items-center gap-2"><Check size={14} className="text-[#b8f36b]" /> Security-conscious foundations</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[570px] lg:ml-auto">
          <div className="absolute -inset-5 rounded-[28px] bg-[#b8f36b]/[0.06] blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0b0f14] shadow-2xl shadow-black/40">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e8c45c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#b8f36b]" /></div>
              <span className="text-xs text-[#8793a1]">Wanky Cloud / Overview</span><span className="w-10" />
            </div>
            <div className="grid min-h-[320px] grid-cols-[142px_1fr] sm:grid-cols-[164px_1fr]">
              <aside className="border-r border-white/10 p-3">
                <div className="mb-5 flex items-center gap-2 px-2 py-2 text-xs font-semibold"><Cloud size={15} className="text-[#b8f36b]" /> Workspace</div>
                {["Overview", "Applications", "Deployments", "Build & Logs", "Monitoring"].map((item, i) => <div key={item} className={`mb-1 rounded-md px-2.5 py-2.5 text-[11px] ${i === 0 ? "border border-white/10 bg-white/[0.08] text-white" : "text-[#8e99a7]"}`}>{item}</div>)}
              </aside>
              <div className="p-4 sm:p-5">
                <div className="text-lg font-semibold tracking-tight">Good work starts here.</div>
                <p className="mt-1 text-[11px] text-[#8793a1]">Your infrastructure, in one place.</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {[["Applications","Your projects"],["Deployments","Release history"]].map(([label, desc]) => <div key={label} className="rounded-lg border border-white/10 bg-white/[0.025] p-3"><div className="text-xs font-medium">{label}</div><div className="mt-2 text-[10px] text-[#8793a1]">{desc}</div></div>)}
                </div>
                <div className="mt-3 rounded-lg border border-dashed border-white/15 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium"><Activity size={14} className="text-[#b8f36b]" /> Platform activity</div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.06]" /><div className="mt-2 h-1.5 w-4/5 rounded-full bg-white/[0.06]" /><div className="mt-2 h-1.5 w-3/5 rounded-full bg-white/[0.06]" />
                  <p className="mt-4 text-[10px] text-[#8793a1]">A preview of the workspace. Live data appears after you connect real resources.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-white/10 bg-[#10151c] px-4 py-3 shadow-xl sm:block"><div className="flex items-center gap-2 text-xs font-medium"><ShieldCheck size={15} className="text-[#b8f36b]" /> Built with security in mind</div><div className="mt-1 text-[10px] text-[#8793a1]">Clear status. No invented telemetry.</div></div>
        </div>
      </section>

      <section id="capabilities" className="border-y border-white/10 bg-[#090d12]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b8f36b]">One connected workspace</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From first deploy to day-two operations.</h2><p className="mt-4 leading-7 text-[#9aa5b2]">A unified direction for the tools developers need to ship and operate software, without hiding the state of your infrastructure.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{capabilities.map(({icon: Icon, title, description}) => <article key={title} className="rounded-xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-[#b8f36b]/30 hover:bg-white/[0.04]"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#b8f36b]/20 bg-[#b8f36b]/[0.08] text-[#b8f36b]"><Icon size={19} /></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#9aa5b2]">{description}</p></article>)}</div>
        </div>
      </section>

      <section id="security" className="mx-auto grid max-w-[1280px] gap-8 px-5 py-20 sm:px-8 md:grid-cols-2 md:items-center lg:py-24">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b8f36b]">Honest by default</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Know what is live. Know what is next.</h2><p className="mt-4 max-w-xl leading-7 text-[#9aa5b2]">Wanky Cloud is being built in stages. We distinguish connected capabilities from planned integrations, so your console can be trusted as the platform grows.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 p-5"><LockKeyhole size={20} className="text-[#b8f36b]" /><h3 className="mt-4 font-semibold">Protected access</h3><p className="mt-2 text-sm leading-6 text-[#9aa5b2]">Account-scoped access and careful handling of sensitive configuration.</p></div><div className="rounded-xl border border-white/10 p-5"><Network size={20} className="text-[#b8f36b]" /><h3 className="mt-4 font-semibold">Connected infrastructure</h3><p className="mt-2 text-sm leading-6 text-[#9aa5b2]">A foundation for bringing services, deployments, and observability together.</p></div><div className="rounded-xl border border-white/10 p-5 sm:col-span-2"><Globe2 size={20} className="text-[#b8f36b]" /><h3 className="mt-4 font-semibold">Built to expand</h3><p className="mt-2 text-sm leading-6 text-[#9aa5b2]">A practical starting point for the wider Wanky infrastructure ecosystem.</p></div></div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-8 text-sm text-[#8793a1] sm:flex-row sm:items-center sm:justify-between sm:px-8"><Link href="/" className="flex items-center gap-2 font-semibold text-[#e7edf3]"><Cloud size={17} className="text-[#b8f36b]" /> Wanky Cloud</Link><span>© {new Date().getFullYear()} Wanky Technologies. Built for builders.</span><div className="flex gap-5"><Link href="/auth" className="transition hover:text-white">Sign in</Link><Link href="/dashboard" className="transition hover:text-white">Workspace</Link></div></div>
      </footer>
    </main>
  );
}
