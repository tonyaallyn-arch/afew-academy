"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

type SessionRow = {
  id: string;
  session_code: string | null;
  title: string | null;
  start_at: string;
};

type MemberForm = {
  email: string;
  full_name: string;

  role: "admin" | "member";
  status: "active" | "lapsed" | "disabled";

  tier: string;

  member_number: string;

  renewal_date: string; // YYYY-MM-DD
  last_payment_date: string; // YYYY-MM-DD
  next_due_date: string; // YYYY-MM-DD

  dues_balance_cents: string; // input as dollars
  payment_plan: "full" | "monthly" | "quarterly";

  plan_day_of_month: string; // int
  plan_quarter_anchor_month: string; // int

  admin_notes: string;
  tags: string; // comma separated

  session_code: "A" | "B" | "C" | ""; // assign
};

function dollarsToCents(d: string) {
  const cleaned = (d ?? "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned || "0");
  return Math.round(n * 100);
}

export default function AdminAddMemberPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meAdmin, setMeAdmin] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<MemberForm>({
    email: "",
    full_name: "",

    role: "member",
    status: "active",

    tier: "",
    member_number: "",

    renewal_date: "",
    last_payment_date: "",
    next_due_date: "",

    dues_balance_cents: "0.00",
    payment_plan: "full",

    plan_day_of_month: "",
    plan_quarter_anchor_month: "",

    admin_notes: "",
    tags: "",

    session_code: "",
  });

  const sessionOptions = useMemo(() => {
    // Prefer A/B/C ordering if present
    const map: Record<string, SessionRow> = {};
    sessions.forEach((s) => {
      const code = (s.session_code ?? "").toUpperCase();
      if (code) map[code] = s;
    });
    const ordered: SessionRow[] = [];
    ["A", "B", "C"].forEach((c) => {
      if (map[c]) ordered.push(map[c]);
    });
    // any extras after
    sessions.forEach((s) => {
      const code = (s.session_code ?? "").toUpperCase();
      if (!["A", "B", "C"].includes(code)) ordered.push(s);
    });
    return ordered;
  }, [sessions]);

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
      .select("id,session_code,title,start_at")
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

  function set<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setMsg(null);

    const email = form.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setMsg("Please enter a valid email.");
      return;
    }
    if (!form.full_name.trim()) {
      setMsg("Please enter a full name.");
      return;
    }

    setSaving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const payload = {
        annual_event_id: ANNUAL_EVENT_ID,

        email,
        full_name: form.full_name.trim(),

        role: form.role,
        status: form.status,

        tier: form.tier.trim() || null,
        member_number: form.member_number.trim() || null,

        renewal_date: form.renewal_date || null,
        last_payment_date: form.last_payment_date || null,
        next_due_date: form.next_due_date || null,

        dues_balance_cents: dollarsToCents(form.dues_balance_cents),
        payment_plan: form.payment_plan || null,

        plan_day_of_month: form.plan_day_of_month ? Number(form.plan_day_of_month) : null,
        plan_quarter_anchor_month: form.plan_quarter_anchor_month ? Number(form.plan_quarter_anchor_month) : null,

        admin_notes: form.admin_notes.trim() || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),

        // session assignment by code
        session_code: form.session_code || null,
      };

      const res = await fetch("/api/admin/create-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error ?? "Failed to create member.");
        setSaving(false);
        return;
      }

      setMsg(`Member created and invited: ${email}`);

      // reset (keep defaults)
      setForm((prev) => ({
        ...prev,
        email: "",
        full_name: "",
        tier: "",
        member_number: "",
        renewal_date: "",
        last_payment_date: "",
        next_due_date: "",
        dues_balance_cents: "0.00",
        payment_plan: "full",
        plan_day_of_month: "",
        plan_quarter_anchor_month: "",
        admin_notes: "",
        tags: "",
        session_code: "",
        role: "member",
        status: "active",
      }));
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
        <div className="h1">Admin: Add New Member</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Creates an Auth account (invite email), inserts the member record, and assigns Session A/B/C.
        </div>

        <div className="spacer" />

        {msg ? (
          <>
            <div className="card subtle">
              <div className="small" style={{ opacity: 0.9 }}>
                {msg}
              </div>
            </div>
            <div className="spacer" />
          </>
        ) : null}

        {/* Basics */}
        <div className="h2">Basics</div>
        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>

          <div style={{ flex: "1 1 260px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Full Name</div>
            <input className="input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 180px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Role</div>
            <select className="input" value={form.role} onChange={(e) => set("role", e.target.value as any)}>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div style={{ flex: "0 0 180px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Status</div>
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as any)}>
              <option value="active">active</option>
              <option value="lapsed">lapsed</option>
              <option value="disabled">disabled</option>
            </select>
          </div>

          <div style={{ flex: "1 1 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Tier</div>
            <input className="input" value={form.tier} onChange={(e) => set("tier", e.target.value)} placeholder="(optional)" />
          </div>

          <div style={{ flex: "0 0 200px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Member Number</div>
            <input className="input" value={form.member_number} onChange={(e) => set("member_number", e.target.value)} placeholder="(optional)" />
          </div>
        </div>

        <div className="spacer" />

        {/* Session assignment */}
        <div className="h2">Event Session</div>
        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          Choose A/B/C. This writes to <code>event_session_assignments</code>.
        </div>

        <div className="spacer" />

        <select
          className="input"
          value={form.session_code}
          onChange={(e) => set("session_code", e.target.value as any)}
        >
          <option value="">— Not assigned —</option>
          {sessionOptions.map((s) => (
            <option key={s.id} value={(s.session_code ?? "").toUpperCase()}>
              Session {(s.session_code ?? "?").toUpperCase()} — {s.title ?? "Untitled"} •{" "}
              {new Date(s.start_at).toLocaleString()}
            </option>
          ))}
        </select>

        <div className="spacer" />

        {/* Billing */}
        <div className="h2">Billing & Dates</div>
        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Dues Balance ($)</div>
            <input
              className="input"
              value={form.dues_balance_cents}
              onChange={(e) => set("dues_balance_cents", e.target.value)}
              onBlur={() => {
                const cents = dollarsToCents(form.dues_balance_cents);
                set("dues_balance_cents", (cents / 100).toFixed(2));
              }}
            />
          </div>

          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Payment Plan</div>
            <select className="input" value={form.payment_plan} onChange={(e) => set("payment_plan", e.target.value as any)}>
              <option value="full">full</option>
              <option value="monthly">monthly</option>
              <option value="quarterly">quarterly</option>
            </select>
          </div>

          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Next Due Date</div>
            <input className="input" type="date" value={form.next_due_date} onChange={(e) => set("next_due_date", e.target.value)} />
          </div>
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Renewal Date</div>
            <input className="input" type="date" value={form.renewal_date} onChange={(e) => set("renewal_date", e.target.value)} />
          </div>

          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Last Payment Date</div>
            <input className="input" type="date" value={form.last_payment_date} onChange={(e) => set("last_payment_date", e.target.value)} />
          </div>

          <div style={{ flex: "0 0 220px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Plan Day of Month</div>
            <input className="input" inputMode="numeric" value={form.plan_day_of_month} onChange={(e) => set("plan_day_of_month", e.target.value)} placeholder="(optional)" />
          </div>

          <div style={{ flex: "0 0 260px" }}>
            <div className="small" style={{ marginBottom: 6 }}>Plan Quarter Anchor Month</div>
            <input className="input" inputMode="numeric" value={form.plan_quarter_anchor_month} onChange={(e) => set("plan_quarter_anchor_month", e.target.value)} placeholder="(optional)" />
          </div>
        </div>

        <div className="spacer" />

        {/* Notes + tags */}
        <div className="h2">Internal Notes</div>
        <div className="spacer" />

        <div className="small" style={{ marginBottom: 6 }}>Tags (comma-separated)</div>
        <input className="input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Head Witch, Fourth Year, ..." />

        <div className="spacer" />

        <div className="small" style={{ marginBottom: 6 }}>Admin Notes</div>
        <textarea
          className="input"
          style={{ minHeight: 110, resize: "vertical" }}
          value={form.admin_notes}
          onChange={(e) => set("admin_notes", e.target.value)}
          placeholder="Anything private you want saved on the member record…"
        />

        <div className="spacer" />

        <button
          className="button"
          onClick={submit}
          disabled={saving}
          style={{ width: "100%", padding: "16px 18px", fontSize: 18, fontWeight: 900 }}
        >
          {saving ? "Summoning…" : "Create Member + Send Invite"}
        </button>

        <div className="spacer" />

        <a className="button secondary" href="/admin/members" style={{ width: "auto" }}>
          Back to Members
        </a>
      </div>
    </main>
  );
}
