"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NominationRow = {
  id: string;
  member_id: string;
  blurb: string;
  created_at: string;
};

export default function JoanNominationPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  const [existing, setExisting] = useState<NominationRow | null>(null);

  const [blurb, setBlurb] = useState("");
  const [agree, setAgree] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      // 1) Check assignment => Session code
      const { data: asn, error: asnErr } = await supabase
        .from("event_session_assignments")
        .select("session_id, event_sessions(session_code)")
        .eq("member_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (asnErr) {
        console.error(asnErr);
        setMsg(asnErr.message);
        setAllowed(false);
        setLoading(false);
        return;
      }

      const code = (asn as any)?.event_sessions?.session_code ?? null;
      setSessionCode(code);

      const ok = (code ?? "").toUpperCase() === "A";
      setAllowed(ok);

      if (!ok) {
        setLoading(false);
        return;
      }

      // 2) Load existing nomination (if any)
      const { data: nom, error: nomErr } = await supabase
        .from("joan_nominations")
        .select("id,member_id,blurb,created_at")
        .eq("member_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (nomErr) {
        console.error(nomErr);
        setMsg(nomErr.message);
      } else {
        setExisting((nom as any) ?? null);
      }

      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  async function submit() {
    setMsg(null);

    if (!allowed) return;

    if (!blurb.trim() || blurb.trim().length < 40) {
      setMsg("Please write a short paragraph (at least ~40 characters) about what Joan of Arc means to you.");
      return;
    }
    if (!agree) {
      setMsg("Please confirm the Joan of Arc winner requirements.");
      return;
    }
    if (existing) {
      setMsg("You have already submitted a nomination.");
      return;
    }

    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("joan_nominations")
      .insert({
        member_id: user.id,
        blurb: blurb.trim(),
      })
      .select("id,member_id,blurb,created_at")
      .single();

    if (error) {
      console.error(error);
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setExisting(data as any);
    setSaving(false);
    setMsg("Nomination submitted. Your words have been sealed.");
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading…</div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">
          <div className="h1">Joan of Arc Nomination</div>
          <div className="small" style={{ opacity: 0.85, marginTop: 8 }}>
            This page is only available to members attending <strong>Session A</strong>.
          </div>

          <div className="spacer" />

          <div className="card subtle">
            <div className="small">
              Your assigned session: <strong>{sessionCode ?? "Not assigned"}</strong>
              <br />
              If you believe this is an error, contact an Administrator.
            </div>
          </div>

          {msg ? (
            <>
              <div className="spacer" />
              <div className="small" style={{ opacity: 0.9 }}>{msg}</div>
            </>
          ) : null}

          <div className="spacer" />
          <a className="button secondary" style={{ width: "auto" }} href="/">
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">The Chosen One</div>
        <div className="small" style={{ opacity: 0.9 }}>
          Joan of Arc Parade • 2027
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div className="small" style={{ whiteSpace: "pre-wrap" }}>
            Dear Sisters of the Academy for Extraordinary Witches,

            {"\n\n"}
            The veil between past and present is thin, and a whisper rides upon the wind—one of us is destined for something greater this Mardi Gras.

            {"\n\n"}
            This year, our love for the Joan of Arc Parade takes on new meaning. Instead of merely watching the procession, one among you will step into the realm of legend, chosen to march with Tonya as an official member of Krewe de Jeanne d&apos;Arc, draped in the medieval garb and power of the Maid of Orléans herself.

            {"\n\n"}
            Whoever is chosen this year cannot be chosen next year.

            {"\n\n"}
            Nominations end March 30th. Voting will then take place April 1st–April 30th.

            {"\n\n"}
            Laissez les bons temps rouler,
            {"\n"}Head Witch, Tonya Brown
          </div>
        </div>

        <div className="spacer" />

        {/* Disclaimer */}
        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Before you nominate yourself</div>
          <div className="small" style={{ marginTop: 8, whiteSpace: "pre-wrap", opacity: 0.9 }}>
            By nominating yourself, you confirm that if you are chosen you:
            {"\n"}• can provide your own costume
            {"\n"}• can walk in a parade
            {"\n"}• can purchase a ticket to the Joan of Arc banquet
          </div>
        </div>

        <div className="spacer" />

        {/* Existing nomination */}
        {existing ? (
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Your nomination is on file</div>
            <div className="small" style={{ marginTop: 8, opacity: 0.8 }}>
              Submitted: {new Date(existing.created_at).toLocaleString()}
            </div>
            <div className="small" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
              {existing.blurb}
            </div>
          </div>
        ) : (
          <>
            {/* Nomination form */}
            <div className="h2">Nominate Yourself</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Write a short paragraph about what Joan of Arc means to you.
            </div>

            <div className="spacer" />

            <textarea
              className="input"
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="Joan of Arc means to me…"
              rows={6}
              style={{ width: "100%", resize: "vertical" }}
              disabled={saving}
            />

            <div className="spacer" />

            <label className="small" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                disabled={saving}
                style={{ marginTop: 3 }}
              />
              <span style={{ opacity: 0.9 }}>
                I understand the winner must provide their own costume, can walk in a parade, and can purchase a ticket to the Joan of Arc banquet.
              </span>
            </label>

            {msg ? (
              <>
                <div className="spacer" />
                <div className="small" style={{ opacity: 0.9 }}>{msg}</div>
              </>
            ) : null}

            <div className="spacer" />

            <button className="button secondary" onClick={submit} disabled={saving} style={{ width: "auto" }}>
              {saving ? "Sealing…" : "Submit Nomination"}
            </button>
          </>
        )}

        <div className="spacer" />

        {/* Session A-only sigil gif at bottom */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/shield.gif"
            alt=""
            style={{ width: 260, maxWidth: "90%", height: "auto", opacity: 0.95 }}
          />
        </div>
      </div>
    </main>
  );
}
