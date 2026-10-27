"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* NAVBAR */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">Wanky Cloud ☁️</h1>

        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-button px-4 py-2 text-white transition-colors hover:bg-brand-button-hover"
        >
          Go to Dashboard
        </Link>
      </header>

      {/* HERO */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-6">
        <h2 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
          Deploy servers in <span className="text-brand">seconds — not minutes</span>
        </h2>

        <p className="mt-4 max-w-xl text-muted">
          Wanky Cloud is a modern infrastructure platform that lets you create,
          manage, and scale servers instantly — without complexity.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-button px-6 py-3 text-lg text-white transition-colors hover:bg-brand-button-hover"
          >
            🚀 Get Started
          </Link>

          <button className="rounded-lg border border-border bg-surface px-6 py-3 text-lg transition-colors hover:border-brand hover:bg-surface-raised">
            Learn More
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} Wanky Cloud
      </footer>
    </div>
  );
}