"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  member_number: string | null;
  status: string;
  role: string;
  dues_balance_cents: number | null;
  payment_plan: string | null;
  next_due_date: string | null;
  tags: string[] | null;
};

type PaymentRow = {
  id: string;
  member_id: string;
  amount_cents: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  created_at: string;
};

function money(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toFixed(2)}`;
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString();
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
  return d;
}

export default function MemberPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
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

      const { data: m, error: mErr } = await supabase
        .from("members")
        .select("id,email,full_name,member_number,status,role,dues_balance_cents,payment_plan,next_due_date,tags")
        .eq("id", user.id)
        .single();

      if (!alive) return;

      if (mErr || !m || m.status === "disabled") {
        console.error(mErr);
        router.replace("/not-verified");
        return;
      }

      setMember(m as MemberRow);

      const { data: p, error: pErr } = await supabase
        .from("member_payments")
        .select("id,member_id,amount_cents,paid_at,method,note,created_at")
        .eq("member_id", user.id)
        .order("paid_at", { ascending: false });

      if (!alive) return;

      if (pErr) {
        console.error(pErr);
        setMsg(pErr.message);
        setPayments([]);
      } else {
        setPayments((p ?? []) as PaymentRow[]);
      }

      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading…</div>
      </main>
    );
  }

  if (!member) return null;

  const name = member.full_name || member.email;
  const tags = member.tags ?? [];

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">My Membership</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Your dossier is recorded under seal.
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>{name}</div>

          {member.member_number ? (
            <div className="small" style={{ marginTop: 6 }}>
              Member No.{" "}
              <span style={{ color: "var(--haint)", fontWeight: 900, letterSpacing: "0.6px" }}>
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
        </div>

        <div className="spacer" />

        <div className="h2">Dues</div>
        <div className="spacer" />

        <div className="card subtle">
          <div className="small">
            Balance Due: <strong>{money(member.dues_balance_cents)}</strong>
            <br />
            Payment Plan: <strong>{member.payment_plan ?? "—"}</strong>
            <br />
            Next Due Date: <strong>{fmtDate(member.next_due_date)}</strong>
          </div>
        </div>

        <div className="spacer" />

        <div className="h2">Payment History</div>
        <div className="spacer" />

        {msg ? (
          <div className="small" style={{ opacity: 0.9 }}>
            {msg}
          </div>
        ) : null}

        {payments.length === 0 ? (
          <div className="card subtle">
            <div className="small" style={{ opacity: 0.85 }}>
              No payments have been recorded yet.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {payments.map((p) => (
              <div key={p.id} className="card subtle">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{money(p.amount_cents)}</div>
                  <div className="small" style={{ opacity: 0.75 }}>
                    {fmtDT(p.paid_at)}
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

        <div className="spacer" />

        <a className="button secondary" style={{ width: "auto" }} href="/">
          Back to Home
        </a>
      </div>
    </main>
  );
}
