"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

function SigilLoader({ big }: { big?: boolean }) {
  const size = big ? 260 : 180;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card" style={{ textAlign: "center", padding: 22 }}>
        <div
          style={{
            width: size,
            height: size,
            margin: "8px auto 0",
            position: "relative",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: big ? -42 : -30,
              borderRadius: 999,
              background: "radial-gradient(circle at center, rgba(121,195,228,.22), transparent 62%)",
              filter: "blur(16px)",
              animation: "mistBreath 3.8s ease-in-out infinite",
              opacity: 0.9,
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: big ? -12 : -10,
              borderRadius: 999,
              border: "1px solid rgba(121,195,228,.22)",
              boxShadow: "0 0 22px rgba(121,195,228,.18), inset 0 0 22px rgba(121,195,228,.08)",
              animation: "ringWake 4.3s ease-in-out infinite",
              opacity: 0.65,
            }}
          />

          <img
            src="/emblem.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter:
                "drop-shadow(0 0 40px rgba(121,195,228,.22)) drop-shadow(0 18px 34px rgba(0,0,0,.65))",
              animation: "sigilAwaken 4.6s ease-in-out infinite",
              opacity: 0.94,
            }}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              letterSpacing: "0.7px",
              opacity: 0.88,
            }}
          >
            Entering the Academy…
          </div>
          <div className="small" style={{ marginTop: 8, opacity: 0.72 }}>
            Please remain discreet.
          </div>
        </div>

        <style>{`
          @keyframes sigilAwaken {
            0%   { transform: scale(0.985); opacity: 0.72; filter: drop-shadow(0 0 14px rgba(121,195,228,.08)) drop-shadow(0 18px 34px rgba(0,0,0,.65)); }
            35%  { transform: scale(1.00);  opacity: 0.92; filter: drop-shadow(0 0 34px rgba(121,195,228,.20)) drop-shadow(0 18px 34px rgba(0,0,0,.65)); }
            55%  { transform: scale(1.012); opacity: 1.00; filter: drop-shadow(0 0 52px rgba(121,195,228,.30)) drop-shadow(0 18px 34px rgba(0,0,0,.65)); }
            100% { transform: scale(0.985); opacity: 0.72; filter: drop-shadow(0 0 14px rgba(121,195,228,.08)) drop-shadow(0 18px 34px rgba(0,0,0,.65)); }
          }
          @keyframes mistBreath {
            0%   { transform: scale(0.98); opacity: 0.55; }
            50%  { transform: scale(1.06); opacity: 0.88; }
            100% { transform: scale(0.98); opacity: 0.55; }
          }
          @keyframes ringWake {
            0%   { transform: scale(0.985); opacity: 0.22; }
            45%  { transform: scale(1.02);  opacity: 0.62; }
            100% { transform: scale(0.985); opacity: 0.22; }
          }
        `}</style>
      </div>
    </main>
  );
}

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  role: string;
  member_number: string | null;
  dues_balance_cents: number | null;
  payment_plan: string | null;
  next_due_date: string | null;
  tags: string[] | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  publish_at: string;
};

type SessionRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  notes: string | null;
  session_code?: string | null;
};

function money(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toFixed(2)}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
  return d;
}

function formatDT(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function HomePage() {
  const router = useRouter();

  const [dataLoading, setDataLoading] = useState(true);
  const [showSigil, setShowSigil] = useState(false);

  const [member, setMember] = useState<MemberRow | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);

  const [mySession, setMySession] = useState<SessionRow | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  const isAdmin = member?.role === "admin";

  useEffect(() => {
    let alive = true;

    async function run() {
      const key = "academy_sigil_seen";
      const seen = sessionStorage.getItem(key) === "1";
      const shouldIgnite = !seen;

      const start = Date.now();
      const min = 2200;

      setShowSigil(shouldIgnite);
      setDataLoading(true);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          router.replace("/login");
          return;
        }

        // 1) Member
        const { data: m, error: mErr } = await supabase
          .from("members")
          .select("id,email,full_name,status,role,member_number,dues_balance_cents,payment_plan,next_due_date,tags")
          .eq("id", user.id)
          .single();

        if (!alive) return;

        if (mErr || !m || m.status === "disabled") {
          console.error("members select failed:", mErr);
          router.replace("/not-verified");
          return;
        }

        setMember(m as MemberRow);

        // 2) Announcements
        const { data: ann, error: annErr } = await supabase
          .from("announcements")
          .select("id,title,content,publish_at")
          .order("publish_at", { ascending: false })
          .limit(5);

        if (!alive) return;

        if (!annErr) setAnnouncements((ann ?? []) as AnnouncementRow[]);
        else console.error("announcements fetch failed:", annErr);

        // 3) Assignment -> session (for the current annual event)
        setSessionMsg(null);
        setMySession(null);
        setSessionCode(null);

        const { data: asn, error: asnErr } = await supabase
          .from("event_session_assignments")
          .select("session_id, event_sessions(session_code)")
          .eq("annual_event_id", ANNUAL_EVENT_ID)
          .eq("member_id", user.id)
          .maybeSingle();

        if (!alive) return;

        if (asnErr) {
          console.error("assignment fetch failed:", asnErr);
          setSessionMsg(asnErr.message);
        } else if (!asn?.session_id) {
          // no assignment
          setMySession(null);
          setSessionCode(null);
        } else {
          const code = (asn as any)?.event_sessions?.session_code ?? null;
          setSessionCode(code);

          const { data: ses, error: sesErr } = await supabase
            .from("event_sessions")
            .select("id,title,start_at,end_at,location,notes,session_code")
            .eq("id", asn.session_id)
            .single();

          if (!alive) return;

          if (sesErr) {
            console.error("session fetch failed:", sesErr);
            setSessionMsg(sesErr.message);
            setMySession(null);
          } else {
            setMySession(ses as SessionRow);
          }
        }
      } catch (e: any) {
        console.error(e);
        setSessionMsg(e?.message ?? "Failed to load home page data.");
      }

      if (shouldIgnite) {
        const elapsed = Date.now() - start;
        if (elapsed < min) await new Promise((r) => setTimeout(r, min - elapsed));
        sessionStorage.setItem(key, "1");
      }

      setDataLoading(false);
      setShowSigil(false);
    }

    run();

    return () => {
      alive = false;
    };
  }, [router]);

  if (showSigil) return <SigilLoader big />;
  if (dataLoading) return <SigilLoader />;

  const name = member?.full_name || member?.email || "Member";

  const standingLine =
    member?.status === "active"
      ? "Your standing is recorded. Welcome to the private portal of the Academy."
      : "Your standing is on record, but requires attention. Please review your membership details.";

  const tags = member?.tags ?? [];

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      {/* Welcome */}
      <div className="card">
        <div className="h1">Welcome, {name}.</div>

        {member?.member_number ? (
          <div className="small" style={{ marginTop: 6 }}>
            Member No.{" "}
            <span style={{ color: "var(--haint)", fontWeight: 800, letterSpacing: "0.6px" }}>
              {member.member_number}
            </span>
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {tags.map((t) => (
              <span
                key={t}
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(121,195,228,.28)",
                  background: "rgba(121,195,228,.10)",
                  fontSize: 13,
                  color: "rgba(255,255,255,.88)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="spacer" />
        <div className="small">{standingLine}</div>

        <div className="spacer" />

      
      </div>

      <div className="spacer" />

      {/* Recent Announcements */}
      <div className="card">
        <div className="h2">Recent Announcements</div>
        <div className="spacer" />

        {announcements.length === 0 ? (
          <div className="small">No announcements have been posted yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {announcements.map((a) => (
              <div key={a.id} className="card subtle">
                <div style={{ fontWeight: 900 }}>{a.title}</div>
                <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {a.content}
                </div>
                <div className="small" style={{ marginTop: 8, opacity: 0.7 }}>
                  {formatDT(a.publish_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="spacer" />

      {/* Membership Snapshot */}
      <div className="card">
        <div className="h2">Membership Snapshot</div>
        <div className="spacer" />
        <div className="card subtle">
          <div className="small">
            Balance Due: <strong>{money(member?.dues_balance_cents)}</strong>
            <br />
            Payment Plan: <strong>{member?.payment_plan ?? "—"}</strong>
            <br />
            Next Due Date: <strong>{formatDate(member?.next_due_date ?? null)}</strong>
            <br />
            <br />
            <center>
              <a className="button secondary" style={{ width: "auto" }} href="/membership">
                My Membership Information
              </a>
            </center>
          </div>
        </div>
      </div>

      <div className="spacer" />

      {/* Reserved Session */}
      <div className="card">
        <div className="h2">Your Reserved Session</div>
        <div className="spacer" />

        {sessionMsg ? (
          <div className="small" style={{ opacity: 0.9 }}>
            {sessionMsg}
          </div>
        ) : null}

        {!mySession ? (
          <div className="small">Your reserved session has not been assigned yet. Please contact an Administrator.</div>
        ) : (
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>{mySession.title}</div>
            <div className="small">
              <strong>{formatDT(mySession.start_at)}</strong>
              {mySession.end_at ? ` — ${formatDT(mySession.end_at)}` : ""}
              {mySession.location ? ` • ${mySession.location}` : ""}
            </div>

            <div className="spacer" />

            <div className="small" style={{ whiteSpace: "pre-wrap" }}>
              {mySession.notes ?? "Instructions will be posted here."}
            </div>

            <div className="spacer" />

            <div className="small">Please keep your reserved time private. Do not post it publicly.</div>
          </div>
        )}

        {isAdmin ? (
          <>
            <div className="spacer" />
            <a className="button secondary" style={{ width: "auto" }} href="/admin">
              Admin Console
            </a>
          </>
        ) : null}
      </div>

      {/* Session A only: Joan of Arc sigil */}
      {sessionCode === "A" ? (
        <>
          <div className="spacer" />
          <div className="card" style={{ textAlign: "center" }}>
            <div className="h2">Joan of Arc Nomination</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Session A members only.
            </div>

            <div className="spacer" />

            <a href="/joan" style={{ display: "inline-block" }}>
              <img
                src="/shield.gif"
                alt="Nominate yourself for Joan of Arc"
                style={{ width: 220, maxWidth: "80%", height: "auto" }}
              />
            </a>

            <div className="small" style={{ opacity: 0.75, marginTop: 10 }}>
              Tap the sigil to nominate yourself.
            </div>
          </div>
        </>
      ) : null}
{/* Session B only: Possum group */}
{sessionCode === "B" ? (
  <>
    <div className="spacer" />
    <div className="card" style={{ textAlign: "center" }}>
      <div className="h2">Possum Group</div>
      <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
        Session B members only.
      </div>

      <div className="spacer" />

      <a href="/possum" style={{ display: "inline-block" }}>
        <img
          src="/possum.gif"
          alt="Possum Group"
          style={{ width: 220, maxWidth: "80%", height: "auto" }}
        />
      </a>

      <div className="small" style={{ opacity: 0.75, marginTop: 10 }}>
        Tap the possum to enter.
      </div>
    </div>
  </>
) : null}
      <div className="spacer" />

      {/* Account */}
      <div className="card">
        <div className="h2">Account</div>
        <div className="spacer" />
        <button
          className="button secondary"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          Sign out
        </button>
      </div>

      <br />
      <br />
    </main>
  );
}
