"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * IMPORTANT:
 * event_session_assignments columns:
 *   annual_event_id, session_id, member_id, created_at
 *
 * So every read/write MUST scope to the current annual_event_id.
 */
const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  member_number: string | null;
  role: "admin" | "member" | string;
  status: "active" | "lapsed" | "disabled" | string;
  dues_balance_cents: number | null;
  payment_plan: "full" | "monthly" | "quarterly" | string | null;
  next_due_date: string | null; // YYYY-MM-DD
  tags: string[] | null;
};

type SessionRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
};

type PaymentRow = {
  id: string;
  member_id: string;
  amount_cents: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};

function moneyToCents(input: string) {
  const cleaned = (input ?? "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned || "0");
  return Math.round(n * 100);
}
function centsToMoney(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toFixed(2);
}
function formatMoneyFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminMembersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meAdmin, setMeAdmin] = useState(false);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // member_id -> session_id

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "lapsed" | "disabled">("all");

  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // payments (for selected member)
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [payAmount, setPayAmount] = useState("0.00");
  const [payDate, setPayDate] = useState(""); // datetime-local
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  // editable fields for selected member
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editStatus, setEditStatus] = useState<MemberRow["status"]>("active");
  const [editRole, setEditRole] = useState<MemberRow["role"]>("member");
  const [editTags, setEditTags] = useState("");
  const [editPlan, setEditPlan] = useState<MemberRow["payment_plan"]>("full");
  const [editNextDue, setEditNextDue] = useState<string>("");
  const [editBalance, setEditBalance] = useState<string>("0.00");
  const [editSessionId, setEditSessionId] = useState<string>("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!needle) return true;
      const hay = `${m.full_name ?? ""} ${m.email ?? ""} ${m.member_number ?? ""} ${(m.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [members, q, statusFilter]);

  async function verifyAdminOrRedirect(): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.replace("/login");
      return false;
    }

    const { data: me, error } = await supabase.from("members").select("id,role,status").eq("id", user.id).single();

    if (error || !me || me.status === "disabled" || me.role !== "admin") {
      router.replace("/");
      return false;
    }

    setMeAdmin(true);
    return true;
  }

  async function loadAllData() {
    // members
    const { data: mem, error: memErr } = await supabase
      .from("members")
      .select("id,email,full_name,member_number,role,status,dues_balance_cents,payment_plan,next_due_date,tags")
      .order("full_name", { ascending: true });

    if (memErr) throw memErr;
    setMembers((mem ?? []) as MemberRow[]);

    // sessions
    const { data: ses, error: sesErr } = await supabase
      .from("event_sessions")
      .select("id,title,start_at,end_at")
      .eq("annual_event_id", ANNUAL_EVENT_ID)
      .order("start_at", { ascending: true });

    if (sesErr) throw sesErr;
    setSessions((ses ?? []) as SessionRow[]);

    // assignments (SCOPE TO THIS ANNUAL EVENT)
    const { data: asn, error: asnErr } = await supabase
      .from("event_session_assignments")
      .select("member_id,session_id,annual_event_id")
      .eq("annual_event_id", ANNUAL_EVENT_ID);

    if (asnErr) throw asnErr;

    const map: Record<string, string> = {};
    (asn ?? []).forEach((a: any) => (map[a.member_id] = a.session_id));
    setAssignments(map);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const ok = await verifyAdminOrRedirect();
        if (!ok || !alive) return;

        await loadAllData();
        if (!alive) return;

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load admin data.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPayments(memberId: string) {
    const { data, error } = await supabase
      .from("member_payments")
      .select("id,member_id,amount_cents,paid_at,method,note,recorded_by,created_at")
      .eq("member_id", memberId)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error(error);
      setMsg(error.message);
      setPayments([]);
      return;
    }
    setPayments((data ?? []) as PaymentRow[]);
  }

  async function addPayment() {
    if (!selected) return;

    setSaving(true);
    setMsg(null);

    const amount_cents = moneyToCents(payAmount);
    if (!Number.isFinite(amount_cents) || amount_cents <= 0) {
      setMsg("Enter a payment amount greater than $0.00.");
      setSaving(false);
      return;
    }

    const paid_at = payDate ? new Date(payDate).toISOString() : new Date().toISOString();

    const { data: auth } = await supabase.auth.getUser();
    const adminId = auth?.user?.id ?? null;

    const { error } = await supabase.from("member_payments").insert({
      member_id: selected.id,
      amount_cents,
      paid_at,
      method: payMethod.trim() || null,
      note: payNote.trim() || null,
      recorded_by: adminId,
    });

    if (error) {
      console.error(error);
      setMsg(error.message);
      setSaving(false);
      return;
    }

    // Auto-reduce balance due on payment
    const newBalance = Math.max(0, (selected.dues_balance_cents ?? 0) - amount_cents);
    const { error: balErr } = await supabase.from("members").update({ dues_balance_cents: newBalance }).eq("id", selected.id);

    if (balErr) {
      console.error(balErr);
      setMsg("Payment saved, but balance update failed: " + balErr.message);
    } else {
      setEditBalance((newBalance / 100).toFixed(2));
      setSelected((prev) => (prev ? { ...prev, dues_balance_cents: newBalance } : prev));
      setMembers((prev) => prev.map((m) => (m.id === selected.id ? { ...m, dues_balance_cents: newBalance } : m)));
    }

    setPayAmount("0.00");
    setPayDate("");
    setPayMethod("cash");
    setPayNote("");

    await loadPayments(selected.id);
    setSaving(false);
  }

  function openEditor(m: MemberRow) {
    setSelected(m);
    setMsg(null);

    setEditName(m.full_name ?? "");
    setEditNumber(m.member_number ?? "");
    setEditStatus(m.status);
    setEditRole(m.role);
    setEditTags((m.tags ?? []).join(", "));
    setEditPlan(m.payment_plan ?? "full");
    setEditNextDue(m.next_due_date ?? "");
    setEditBalance(centsToMoney(m.dues_balance_cents));
    setEditSessionId(assignments[m.id] ?? "");

    loadPayments(m.id);

    setPayAmount("0.00");
    setPayDate("");
    setPayMethod("cash");
    setPayNote("");
  }

  // ✅ assignment writer for schema: annual_event_id, member_id, session_id
  async function writeAssignment(memberId: string, sessionId: string | null) {
    // clear assignment for this annual event
    if (!sessionId) {
      const { error } = await supabase
        .from("event_session_assignments")
        .delete()
        .eq("annual_event_id", ANNUAL_EVENT_ID)
        .eq("member_id", memberId);

      if (error) throw error;
      return;
    }

    // Try UPSERT first (works if you have UNIQUE(annual_event_id, member_id))
    const { error: upErr } = await supabase
      .from("event_session_assignments")
      .upsert(
        { annual_event_id: ANNUAL_EVENT_ID, member_id: memberId, session_id: sessionId },
        { onConflict: "annual_event_id,member_id" }
      );

    if (!upErr) return;

    // Fallback: update-then-insert (works even without unique constraint)
    const { data: upd, error: updErr } = await supabase
      .from("event_session_assignments")
      .update({ session_id: sessionId })
      .eq("annual_event_id", ANNUAL_EVENT_ID)
      .eq("member_id", memberId)
      .select("member_id")
      .maybeSingle();

    if (updErr) throw updErr;

    if (!upd) {
      const { error: insErr } = await supabase.from("event_session_assignments").insert({
        annual_event_id: ANNUAL_EVENT_ID,
        member_id: memberId,
        session_id: sessionId,
      });
      if (insErr) throw insErr;
    }
  }

  async function save() {
    if (!selected) return;

    setSaving(true);
    setMsg(null);

    const tagsArr = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const balanceCents = moneyToCents(editBalance);

    try {
      // 1) Update member record
      const { error: upErr } = await supabase
        .from("members")
        .update({
          full_name: editName.trim() || null,
          member_number: editNumber.trim() || null,
          status: editStatus,
          role: editRole,
          tags: tagsArr,
          payment_plan: editPlan,
          next_due_date: editNextDue ? editNextDue : null,
          dues_balance_cents: balanceCents,
        })
        .eq("id", selected.id);

      if (upErr) throw upErr;

      // 2) Write assignment scoped to annual_event_id
      await writeAssignment(selected.id, editSessionId ? editSessionId : null);

      // 3) Update local UI so it “sticks”
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? {
                ...m,
                full_name: editName.trim() || null,
                member_number: editNumber.trim() || null,
                status: editStatus,
                role: editRole,
                tags: tagsArr,
                payment_plan: editPlan,
                next_due_date: editNextDue ? editNextDue : null,
                dues_balance_cents: balanceCents,
              }
            : m
        )
      );

      setAssignments((prev) => {
        const next = { ...prev };
        if (editSessionId) next[selected.id] = editSessionId;
        else delete next[selected.id];
        return next;
      });

      // keep modal normalized
      setEditBalance((balanceCents / 100).toFixed(2));

      setMsg("Saved.");
    } catch (e: any) {
      console.error(e);
      setMsg("Save failed: " + (e?.message ?? "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Admin Console…</div>
      </main>
    );
  }

  if (!meAdmin) return null;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Admin Console: Members</div>
        <div className="small">Edit member numbers, dues, tags, status, roles, and assign reserved sessions (private).</div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Search name, email, number, tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 260px" }}
          />

          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ flex: "0 0 180px" }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="lapsed">Lapsed</option>
            <option value="disabled">Disabled</option>
          </select>

          <button
            className="button secondary"
            onClick={async () => {
              try {
                setMsg(null);
                await loadAllData();
              } catch (e: any) {
                console.error(e);
                setMsg(e?.message ?? "Refresh failed.");
              }
            }}
            style={{ width: "auto" }}
          >
            Refresh
          </button>
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ opacity: 0.9 }}>
              {msg}
            </div>
          </>
        ) : null}

        <div className="spacer" />

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((m) => (
            <button
              key={m.id}
              className="card subtle"
              onClick={() => openEditor(m)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {m.full_name ?? m.email}
                  {m.member_number ? (
                    <span style={{ marginLeft: 10, color: "var(--haint)", fontWeight: 900 }}>
                      #{m.member_number}
                    </span>
                  ) : null}
                </div>
                <div className="small" style={{ opacity: 0.75 }}>
                  {m.status} • {m.role}
                </div>
              </div>

              <div className="small" style={{ marginTop: 6, opacity: 0.78 }}>
                {m.email}
                {assignments[m.id] ? (
                  <span style={{ marginLeft: 10 }}>• Reserved Session assigned</span>
                ) : (
                  <span style={{ marginLeft: 10, opacity: 0.7 }}>• No session assigned</span>
                )}
              </div>

              {m.tags?.length ? (
                <div className="small" style={{ marginTop: 8, opacity: 0.9 }}>
                  Tags: {m.tags.join(", ")}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Modal */}
      {selected ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            zIndex: 50,
          }}
          onClick={() => !saving && setSelected(null)}
        >
          <div className="card" style={{ width: "min(820px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
            <div className="h2">Edit Member</div>
            <div className="small" style={{ opacity: 0.8 }}>
              {selected.email} • {selected.id}
            </div>

            <div className="spacer" />

            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Name
                </div>
                <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div style={{ flex: "0 0 200px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Member Number
                </div>
                <input className="input" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} />
              </div>
            </div>

            <div className="spacer" />

            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 180px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Status
                </div>
                <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="active">active</option>
                  <option value="lapsed">lapsed</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>

              <div style={{ flex: "0 0 180px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Role
                </div>
                <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div style={{ flex: "1 1 240px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Tags (comma-separated)
                </div>
                <input className="input" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
              </div>
            </div>

            <div className="spacer" />

            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 180px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Payment Plan
                </div>
                <select className="input" value={editPlan ?? "full"} onChange={(e) => setEditPlan(e.target.value)}>
                  <option value="full">full</option>
                  <option value="monthly">monthly</option>
                  <option value="quarterly">quarterly</option>
                </select>
              </div>

              <div style={{ flex: "0 0 200px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Next Due Date
                </div>
                <input className="input" type="date" value={editNextDue} onChange={(e) => setEditNextDue(e.target.value)} />
              </div>

              <div style={{ flex: "0 0 200px" }}>
                <div className="small" style={{ marginBottom: 6 }}>
                  Balance Due ($)
                </div>
                <input
                  className="input"
                  inputMode="decimal"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  onBlur={() => {
                    const cents = moneyToCents(editBalance);
                    setEditBalance((cents / 100).toFixed(2));
                  }}
                />
              </div>
            </div>

            <div className="spacer" />

            <div>
              <div className="small" style={{ marginBottom: 6 }}>
                Reserved Session (scoped to current annual event)
              </div>
              <select className="input" value={editSessionId} onChange={(e) => setEditSessionId(e.target.value)}>
                <option value="">— Not assigned —</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} • {new Date(s.start_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="spacer" />

            {/* Payment History */}
            <div className="card subtle">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>Payment History</div>
                <div className="small" style={{ opacity: 0.75 }}>
                  {payments.length} record{payments.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="spacer" />

              <div className="small" style={{ marginBottom: 6 }}>
                Add Payment
              </div>

              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 180px" }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    Amount ($)
                  </div>
                  <input className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>

                <div style={{ flex: "1 1 260px" }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    Paid At (optional)
                  </div>
                  <input className="input" type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>

                <div style={{ flex: "0 0 180px" }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    Method
                  </div>
                  <input className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
                </div>
              </div>

              <div className="spacer" />

              <div className="small" style={{ marginBottom: 6 }}>
                Note (optional)
              </div>
              <input className="input" value={payNote} onChange={(e) => setPayNote(e.target.value)} />

              <div className="spacer" />

              <button className="button secondary" disabled={saving} onClick={addPayment} style={{ width: "auto" }}>
                Add Payment
              </button>

              <div className="spacer" />

              {payments.length === 0 ? (
                <div className="small" style={{ opacity: 0.8 }}>
                  No payments recorded yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {payments.map((p) => (
                    <div key={p.id} className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>{formatMoneyFromCents(p.amount_cents)}</div>
                        <div className="small" style={{ opacity: 0.75 }}>
                          {new Date(p.paid_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
                        {p.method ? `Method: ${p.method}` : "Method: —"}
                        {p.note ? ` • ${p.note}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg ? (
              <>
                <div className="spacer" />
                <div className="small" style={{ opacity: 0.9 }}>
                  {msg}
                </div>
              </>
            ) : null}

            <div className="spacer" />

            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="button secondary" disabled={saving} onClick={() => setSelected(null)} style={{ width: "auto" }}>
                Close
              </button>
              <button className="button" disabled={saving} onClick={save} style={{ width: "auto" }}>
                {saving ? "Sealing…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
