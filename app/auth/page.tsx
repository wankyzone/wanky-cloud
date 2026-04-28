"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const signUp = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) alert(error.message);
    else alert("Check your email");

    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
    else router.push("/dashboard");

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-pink-50">
      <div className="bg-white p-6 rounded-xl w-[350px] shadow">
        <h1 className="text-xl font-bold mb-4">Wanky Cloud</h1>

        <input
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          className="w-full bg-pink-500 text-white py-2 rounded mb-2"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        <button
          onClick={signUp}
          className="w-full border py-2 rounded"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}