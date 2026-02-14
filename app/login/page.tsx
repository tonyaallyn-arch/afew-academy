"use client";

import Nav from "@/components/Nav";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="container" style={{ paddingTop: 38 }}>
      <div className="card">
        <div className="h1">The Academy</div>
        <div className="small">
          Sign in with your email. If your standing cannot be verified, contact an Administrator.
        </div>

        <div className="spacer" />

        {sent ? (
          <div className="card" style={{ background: "transparent" }}>
            <div className="h2">Check your email</div>
            <div className="small">A sign-in link has been sent to {email}.</div>
          </div>
        ) : (
          <form onSubmit={sendLink}>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="spacer" />
            <button className="button" type="submit">Send sign-in link</button>
            {error && (
              <>
                <div className="spacer" />
                <div className="small" style={{ color: "#F2D7F4" }}>{error}</div>
              </>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
