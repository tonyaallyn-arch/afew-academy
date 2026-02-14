"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

// Voting ends April 30th (localize as you prefer)
const VOTING_END_ISO = "2026-04-30T23:59:59-05:00";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  role: string;
};

type NomineeRow = {
  id: string; // nomination id
  member_id: string;
  created_at: string;
  blurb: string;

  is_approved: boolean | null;

  members?: {
    full_name: string | null;
    email: string;
    member_number: string | null;
  } | null;
};

type SessionRow = {
  session_code: string | null;
};

type VoteRow = {
  id: string;
  nominee_id: string;
  created_at: string;
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "00d 00h 00m 00s";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(days)}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
}

export default function JoanVotePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [member, setMember] = useState<MemberRow | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  const [nominees, setNominees] = useState<NomineeRow[]>([]);
  const [myVote, setMyVote] = useState<VoteRow | null>(null);

  const [selectedNomineeId, setSelectedNomineeId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Countdown
  const endMs = useMemo(() => new Date(VOTING_END_ISO).getTime(), []);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const msLeft = endMs - nowMs;
  const votingClosed = msLeft <= 0;

  const isSessionA = (sessionCode ?? "").toUpperCase() === "A";

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        // 1) Member
        const { data: m, error: mErr } = await supabase
          .from("members")
          .select("id,email,full_name,status,role")
          .eq("id", user.id)
          .single();

        if (!alive) return;

        if (mErr || !m || m.status === "disabled") {
          router.replace("/not-verified");
          return;
        }
        setMember(m as MemberRow);

        // 2) Assignment -> session_code (A/B/C)
        const { data: asn, error: asnErr } = await supabase
          .from("event_session_assignments")
          .select("session_id")
          .eq("annual_event_id", ANNUAL_EVENT_ID)
          .eq("member_id", user.id)
          .maybeSingle();

        if (!alive) return;

        if (asnErr) {
          console.error(asnErr);
          setMsg(asnErr.message);
          setSessionCode(null);
        } else if (!asn?.session_id) {
          setSessionCode(null);
        } else {
          const { data: ses, error: sesErr } = await supabase
            .from("event_sessions")
            .select("session_code")
            .eq("id", asn.session_id)
            .single();

          if (!alive) return;

          if (sesErr) {
            console.error(sesErr);
            setMsg(sesErr.message);
            setSessionCode(null);
          } else {
            setSessionCode((ses as SessionRow)?.session_code ?? null);
          }
        }

        // 3) ✅ Load ONLY approved nominees (DB filter)
        const { data: noms, error: nErr } = await supabase
          .from("joan_nominations")
          .select(
            `
            id,
            member_id,
            created_at,
            blurb,
            is_approved,
            members:members (
              member_number,
              full_name,
              email
            )
          `
          )
          .eq("is_approved", true)
          .order("created_at", { ascending: true });

        if (!alive) return;

        if (nErr) {
          console.error(nErr);
          setMsg(nErr.message);
          setNominees([]);
        } else {
          setNominees((noms ?? []) as NomineeRow[]);
        }

        // 4) Load my vote (if any)
        const { data: v, error: vErr } = await supabase
          .from("joan_votes")
          .select("id,nominee_id,created_at")
          .eq("annual_event_id", ANNUAL_EVENT_ID)
          .eq("voter_member_id", user.id)
          .maybeSingle();

        if (!alive) return;

        if (vErr) {
          console.error(vErr);
          setMsg((prev) => prev ?? vErr.message);
          setMyVote(null);
        } else {
          setMyVote((v ?? null) as VoteRow | null);
        }

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load voting page.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function castVote() {
    if (!member) return;

    if (!isSessionA) {
      setMsg("Voting is restricted to Session A attendees.");
      return;
    }
    if (votingClosed) {
      setMsg("Voting has closed.");
      return;
    }
    if (myVote) {
      setMsg("Your vote has already been recorded.");
      return;
    }
    if (!selectedNomineeId) {
      setMsg("Select a nominee first.");
      return;
    }

    setSaving(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("joan_votes")
      .insert({
        annual_event_id: ANNUAL_EVENT_ID,
        voter_member_id: user.id,
        nominee_id: selectedNomineeId,
      })
      .select("id,nominee_id,created_at")
      .single();

    if (error) {
      console.error(error);
      if ((error as any).code === "23505") setMsg("Your vote was already recorded.");
      else setMsg(error.message);
      setSaving(false);
      return;
    }

    setMyVote(data as VoteRow);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading…</div>
      </main>
    );
  }

  const chosenNominee = myVote ? nominees.find((n) => n.id === myVote.nominee_id) ?? null : null;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">The Chosen One</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Joan of Arc Parade — 2026
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div className="small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
{`Dear Sisters of the Academy for Extraordinary Witches,

The veil between past and present is thin, and a whisper rides upon the wind—one of us is destined for something greater this Mardi Gras.

This year, our love for the Joan of Arc Parade takes on new meaning. Instead of merely watching the procession, one among you will step into the realm of legend, chosen to march with Tonya as an official member of Krewe de Jeanne d'Arc, draped in the medieval garb and power of the Maid of Orléans herself.

Whoever is chosen this year cannot be chosen next year.

Voting ends April 30th. Winner will be announced via snail mail.

Laissez les bons temps rouler,
Head Witch, Tonya Brown`}
          </div>
        </div>

        <div className="spacer" />

        {/* Countdown */}
        <div className="card subtle" style={{ textAlign: "center" }}>
          <div className="small" style={{ opacity: 0.8 }}>
            Time remaining
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, letterSpacing: "1px", marginTop: 6 }}>
            {votingClosed ? "Voting Closed" : formatCountdown(msLeft)}
          </div>
          <div className="small" style={{ opacity: 0.75, marginTop: 6 }}>
            Deadline: {new Date(VOTING_END_ISO).toLocaleString()}
          </div>
        </div>

        <div className="spacer" />

        {msg ? (
          <>
            <div className="small" style={{ opacity: 0.9 }}>
              {msg}
            </div>
            <div className="spacer" />
          </>
        ) : null}

        {/* Gate */}
        {!isSessionA ? (
          <div className="card subtle">
            <div className="small" style={{ opacity: 0.9 }}>
              Your assigned session is <strong>{sessionCode ?? "not assigned"}</strong>.
              <br />
              <br />
              This voting portal is restricted to <strong>Session A</strong> attendees.
            </div>
          </div>
        ) : myVote ? (
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Your vote has been recorded.</div>
            <div className="small" style={{ marginTop: 8, opacity: 0.85 }}>
              You voted for:{" "}
              <strong>{chosenNominee?.members?.full_name ?? chosenNominee?.members?.email ?? "Nominee"}</strong>
              <br />
              Recorded at: {new Date(myVote.created_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <>
            <div className="h2">Approved Nominees</div>
            <div className="spacer" />

            {nominees.length === 0 ? (
              <div className="card subtle">
                <div className="small" style={{ opacity: 0.85 }}>
                  No approved nominees yet.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {nominees.map((n) => {
                  const displayName = n.members?.full_name ?? n.members?.email ?? "Nominee";
                  const selected = selectedNomineeId === n.id;

                  return (
                    <button
                      key={n.id}
                      className="card subtle"
                      onClick={() => setSelectedNomineeId(n.id)}
                      style={{
                        textAlign: "left",
                        cursor: "pointer",
                        border: selected ? "1px solid rgba(121,195,228,.55)" : undefined,
                        background: selected ? "rgba(121,195,228,.10)" : "color-mix(in srgb, var(--bg) 92%, black)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>{displayName}</div>
                        {selected ? (
                          <div className="small" style={{ color: "var(--haint)", fontWeight: 900 }}>
                            Selected
                          </div>
                        ) : null}
                      </div>

                      <div className="small" style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                        {n.blurb}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="spacer" />

            <div className="card subtle">
              <div className="small" style={{ opacity: 0.9, lineHeight: 1.6 }}>
                <strong>Reminder:</strong> Anyone who wins the Joan of Arc honor must be willing to:
                <br />• Provide their own costume
                <br />• Walk in a parade
                <br />• Purchase a ticket to the Joan of Arc banquet
              </div>
            </div>

            <div className="spacer" />

            {/* Big haint-blue CTA */}
            <button
              className="button"
              onClick={castVote}
              disabled={saving || votingClosed || nominees.length === 0 || !selectedNomineeId}
              style={{
                width: "100%",
                padding: "16px 18px",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              {saving ? "Sealing your vote…" : votingClosed ? "Voting Closed" : "Cast My Vote"}
            </button>

            <div className="spacer" />
          </>
        )}

        {/* Shield gif at bottom only for Session A */}
        {isSessionA ? (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <img
              src="/shield.gif"
              alt="Joan of Arc Shield"
              style={{
                maxWidth: 360,
                width: "100%",
                height: "auto",
                opacity: 0.98,
                filter: "drop-shadow(0 0 28px rgba(121,195,228,.20)) drop-shadow(0 18px 34px rgba(0,0,0,.55))",
              }}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
