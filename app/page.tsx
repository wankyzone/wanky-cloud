"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* NAVBAR */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-bold">Wanky Cloud ☁️</h1>

        <Link
          href="/dashboard"
          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition"
        >
          Go to Dashboard
        </Link>
      </header>

      {/* HERO */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-6">
        <h2 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
          Deploy servers in seconds — not minutes
        </h2>

        <p className="mt-4 text-gray-500 max-w-xl">
          Wanky Cloud is a modern infrastructure platform that lets you create,
          manage, and scale servers instantly — without complexity.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/dashboard"
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg text-lg transition"
          >
            🚀 Get Started
          </Link>

          <button className="border px-6 py-3 rounded-lg text-lg hover:bg-gray-100 transition">
            Learn More
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="text-center text-sm text-gray-400 py-6">
        © {new Date().getFullYear()} Wanky Cloud
      </footer>
    </div>
  );
}