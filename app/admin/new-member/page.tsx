"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

type SessionRow = {
  id: string;
  title: string;
  session_code: string | null; // "A" | "B" | "C"
  start_at: string;
};

type MemberInsert = {
  email: string;
  full_name: string | null;
  member_number: string | null;
  role: string; // "member" | "admin"
  status: string; // "active" | "lapsed" | "disabled"
  dues_balance_cents: number | null;
  payment_plan: string | null;
  next_due_date: string | null; // YYYY-MM-DD
  tags: string[] | null;
};

function moneyToCents(input: string) {
  const cleaned = (input ?? "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned || "0");
  return Math.round(n * 100);
}

export default function AdminNewMemberPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meAdmin, setMeAdmin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // sessions (A/B/C)
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const sessionOptions = useMemo(() => {
    const byCode: Record<string, SessionRow> = {};
    sessions.forEach((s) => {
      const code = (s.session_code ?? "").toUpperCase();
      if (code) byCode[code] = s;
    });
    return byCode;
  }, [sessions]);

  // form fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [status, setStatus] = useState<"active" | "lapsed" | "disabled">("active");
  const [paymentPlan, setPaymentPlan] = useState<"full" | "monthly" | "quarterly">("full");
  const [nextDueDate, setNextDueDate] = useState<string>("");
  const [balance, setBalance] = useState<string>("0.00");
  const [tags, setTags] = useState<string>("");
  const [sessionCode, setSessionCode] = useState<string>(""); // "A" | "B" | "C" | ""

  async function verifyAdminOrRedirect(): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.replace("/login");
      return false;
    }

    const { data: me, error } = await supabase
      .from("members")
      .select("id,role,status")
      .eq("id", user.id)
      .single();

    if (error || !me || me.status === "disabled" || me.role !== "admin") {
      router.replace("/");
      return false;
    }

    setMeAdmin(true);
    return true;
  }

  async function loadSessions() {
    const { data, error } = await supabase
      .from("event_sessions")
      .select("id,title,session_code,start_at")
      .eq("annual_event_id", ANNUAL_EVENT_ID)
      .order("start_at", { ascending: true });

    if (error) throw error;
    setSessions((data ?? []) as SessionRow[]);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const ok = await verifyAdminOrRedirect();
        if (!ok || !alive) return;

        await loadSessions();
        if (!alive) return;

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load page.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // writes assignment without requiring unique constraints
  async function writeAssignment(memberId: string, sessionId: string | null) {
    if (!sessionId) {
      const { error } = await supabase
        .from("event_session_assignments")
        .delete()
        .eq("annual_event_id", ANNUAL_EVENT_ID)
        .eq("member_id", memberId);
      if (error) throw error;
      return;
    }

    // try update
    const { data: upd, error: updErr } = await supabase
      .from("event_session_assignments")
      .update({ session_id: sessionId })
      .eq("annual_event_id", ANNUAL_EVENT_ID)
      .eq("member_id", memberId)
      .select("member_id");

    if (updErr) throw updErr;

    // if none updated, insert
    if (!upd || upd.length === 0) {
      const { error: insErr } = await supabase.from("event_session_assignments").insert({
        annual_event_id: ANNUAL_EVENT_ID,
        member_id: memberId,
        session_id: sessionId,
      });
      if (insErr) throw insErr;
    }
  }

  async function createMember() {
    setMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMsg("Please enter a valid email.");
      return;
    }

    setSaving(true);

    try {
      // build insert
      const tagsArr =
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) || [];

      const balanceCents = moneyToCents(balance);

      const payload: MemberInsert = {
        email: cleanEmail,
        full_name: fullName.trim() || null,
        member_number: memberNumber.trim() || null,
        role,
        status,
        dues_balance_cents: Number.isFinite(balanceCents) ? balanceCents : 0,
        payment_plan: paymentPlan,
        next_due_date: nextDueDate || null,
        tags: tagsArr.length ? tagsArr : null,
      };

      // NOTE: Your members table uses auth user ids as PK in other pages.
      // If your members.id is a UUID PK that defaults automatically, this is fine.
      // If members.id must equal the auth user id, then you must create/invite the auth user first.
      const { data: inserted, error: insErr } = await supabase
        .from("members")
        .insert(payload)
        .select("id")
        .single();

      if (insErr) throw insErr;

      const newMemberId = inserted.id as string;

      // optional session assignment
      const code = (sessionCode || "").toUpperCase();
      const session = code ? sessionOptions[code] : null;
      await writeAssignment(newMemberId, session?.id ?? null);

      // reset form
      setEmail("");
      setFullName("");
      setMemberNumber("");
      setRole("member");
      setStatus("active");
      setPaymentPlan("full");
      setNextDueDate("");
      setBalance("0.00");
      setTags("");
      setSessionCode("");

      setMsg("Member created.");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? "Failed to create member.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading…</div>
      </main>
    );
  }

  if (!meAdmin) return null;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Add New Member</div>
        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          Creates a row in <strong>members</strong> and optionally assigns a reserved session (A/B/C).
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ opacity: 0.9 }}>{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Email *</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={{ flex: "1 1 280px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Full name</div>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 200px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Member number</div>
            <input className="input" value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)} />
          </div>

          <div style={{ flex: "0 0 180px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Role</div>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div style={{ flex: "0 0 180px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Status</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="active">active</option>
              <option value="lapsed">lapsed</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 200px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Payment plan</div>
            <select className="input" value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value as any)}>
              <option value="full">full</option>
              <option value="monthly">monthly</option>
              <option value="quarterly">quarterly</option>
            </select>
          </div>

          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Next due date</div>
            <input className="input" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>

          <div style={{ flex: "0 0 200px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Balance due ($)</div>
            <input
              className="input"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              onBlur={() => {
                const cents = moneyToCents(balance);
                setBalance((cents / 100).toFixed(2));
              }}
            />
          </div>
        </div>

        <div className="spacer" />

        <div>
          <div className="small" style={{ marginBottom: 6 }}>Tags (comma-separated)</div>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <div className="spacer" />

        <div>
          <div className="small" style={{ marginBottom: 6 }}>Assign Reserved Session</div>
          <select className="input" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)}>
            <option value="">— none —</option>
            <option value="A">Session A</option>
            <option value="B">Session B</option>
            <option value="C">Session C</option>
          </select>

          <div className="small" style={{ marginTop: 8, opacity: 0.8 }}>
            Sessions pulled from <code>event_sessions</code> by session_code.
          </div>
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <a className="button secondary" style={{ width: "auto" }} href="/admin">
            Back
          </a>
          <button className="button" style={{ width: "auto" }} disabled={saving} onClick={createMember}>
            {saving ? "Creating…" : "Create Member"}
          </button>
        </div>
      </div>
    </main>
  );
}
