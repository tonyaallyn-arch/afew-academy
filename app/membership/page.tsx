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
  dietary_restrictions: string | null;
  food_preferences: string | null;
  allergies: string | null;
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

  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");
  const [allergies, setAllergies] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [suggestion, setSuggestion] = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

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
        .select(`
          id,
          email,
          full_name,
          member_number,
          status,
          role,
          dues_balance_cents,
          payment_plan,
          next_due_date,
          tags,
          dietary_restrictions,
          food_preferences,
          allergies
        `)
        .eq("id", user.id)
        .single();

      if (!alive) return;

      if (mErr || !m || m.status === "disabled") {
        console.error(mErr);
        router.replace("/not-verified");
        return;
      }

      setMember(m as MemberRow);
      setDietaryRestrictions(m.dietary_restrictions ?? "");
      setFoodPreferences(m.food_preferences ?? "");
      setAllergies(m.allergies ?? "");

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

  async function saveProfile() {
    if (!member) return;

    setSavingProfile(true);

    const { error } = await supabase
      .from("members")
      .update({
        dietary_restrictions: dietaryRestrictions.trim() || null,
        food_preferences: foodPreferences.trim() || null,
        allergies: allergies.trim() || null,
      })
      .eq("id", member.id);

    setSavingProfile(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMember({
      ...member,
      dietary_restrictions: dietaryRestrictions.trim() || null,
      food_preferences: foodPreferences.trim() || null,
      allergies: allergies.trim() || null,
    });

    alert("Profile updated.");
  }

  async function sendSuggestion() {
    if (!member) return;

    const text = suggestion.trim();

    if (!text) {
      alert("Please write a suggestion first.");
      return;
    }

    setSendingSuggestion(true);

    const { error } = await supabase.from("app_suggestions").insert({
      member_id: member.id,
      suggestion: text,
    });

    setSendingSuggestion(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSuggestion("");
    alert("Suggestion sent. Thank you!");
  }

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

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small">{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>{name}</div>

          {member.member_number ? (
            <div className="small" style={{ marginTop: 6 }}>
              Member No.{" "}
              <span
                style={{
                  color: "var(--haint)",
                  fontWeight: 900,
                  letterSpacing: "0.6px",
                }}
              >
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

        <div className="h2">Dietary Information</div>

        <div className="spacer" />

        <div className="card subtle">
          <div className="small" style={{ marginBottom: 6 }}>
            Dietary Restrictions
          </div>

          <textarea
            className="input"
            rows={3}
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
          />

          <div className="spacer" />

          <div className="small" style={{ marginBottom: 6 }}>
            Food Preferences
          </div>

          <textarea
            className="input"
            rows={3}
            value={foodPreferences}
            onChange={(e) => setFoodPreferences(e.target.value)}
          />

          <div className="spacer" />

          <div className="small" style={{ marginBottom: 6 }}>
            Allergies
          </div>

          <textarea
            className="input"
            rows={3}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />

          <div className="spacer" />

          <button className="button" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Dietary Information"}
          </button>
        </div>

        <div className="spacer" />

        <div className="h2">App Suggestions</div>

        <div className="spacer" />

        <div className="card subtle">
          <div className="small" style={{ marginBottom: 6 }}>
            Have an idea, issue, or improvement request?
          </div>

          <textarea
            className="input"
            rows={4}
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Write your suggestion here..."
          />

          <div className="spacer" />

          <button
            className="button"
            onClick={sendSuggestion}
            disabled={sendingSuggestion}
          >
            {sendingSuggestion ? "Sending..." : "Send Suggestion"}
          </button>
        </div>

        <div className="spacer" />

        <div className="h2">Payment History</div>

        <div className="spacer" />

        {payments.length === 0 ? (
          <div className="card subtle">
            <div className="small">No payments recorded yet.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {payments.map((p) => (
              <div key={p.id} className="card subtle">
                <div style={{ fontWeight: 900 }}>{money(p.amount_cents)}</div>

                <div className="small" style={{ marginTop: 6 }}>
                  {fmtDT(p.paid_at)}
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  {p.method ? `Method: ${p.method}` : "Method: —"}
                  {p.note ? ` • ${p.note}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Site Content</div>

          <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
            Culture, Scrapbook, and Society Documents.
          </div>

          <div className="spacer" />

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a className="button secondary" style={{ width: "auto" }} href="/culture">
              Culture Page
            </a>

            <a className="button secondary" style={{ width: "auto" }} href="/scrapbook">
              Scrapbook Page
            </a>

            <a className="button secondary" style={{ width: "auto" }} href="/documents">
              Documents Page
            </a>
          </div>
        </div>

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
    </main>
  );
}
