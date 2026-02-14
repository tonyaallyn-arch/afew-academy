"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Redirect after successful login
    router.push("/");
  }

  return (
    <main className="container" style={{ paddingTop: 38 }}>
      <div className="card">
        <div className="h1">The Academy</div>
        <div className="small">
          Sign in with your email and password. If your standing cannot be verified,
          contact an Administrator.
        </div>

        <div className="spacer" />

        <form onSubmit={handleLogin}>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="spacer" />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="spacer" />

          <button className="button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {error && (
            <>
              <div className="spacer" />
              <div className="small" style={{ color: "#F2D7F4" }}>
                {error}
              </div>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
