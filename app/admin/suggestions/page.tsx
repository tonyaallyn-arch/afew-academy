"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SuggestionMember =
  | {
      full_name: string | null;
      email: string | null;
    }
  | {
      full_name: string | null;
      email: string | null;
    }[]
  | null;

type SuggestionRow = {
  id: string;
  member_id: string | null;
  suggestion: string;
  status: string | null;
  created_at: string;
  members: SuggestionMember;
};

export default function AdminSuggestionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: me, error: meErr } = await supabase
        .from("members")
        .select("id, role, status")
        .eq("id", user.id)
        .single();

      if (meErr || !me || me.status === "disabled" || me.role !== "admin") {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("app_suggestions")
        .select(`
          id,
          member_id,
          suggestion,
          status,
          created_at,
          members (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        setMsg(error.message);
        setSuggestions([]);
      } else {
        setSuggestions((data ?? []) as SuggestionRow[]);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("app_suggestions")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setSuggestions((current) =>
      current.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  async function deleteSuggestion(id: string) {
    const { error } = await supabase
      .from("app_suggestions")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setSuggestions((current) => current.filter((s) => s.id !== id));
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Suggestions…</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Member Suggestions</div>

        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          Review app ideas, issues, and improvement requests submitted by members.
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small">{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        {suggestions.length === 0 ? (
          <div className="card subtle">
            <div className="small">No suggestions have been submitted yet.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {suggestions.map((s) => (
              <div key={s.id} className="card subtle">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {(() => {
  const member = Array.isArray(s.members) ? s.members[0] : s.members;
  return member?.full_name || member?.email || "Unknown Member";
})()}
                    </div>

                    <div className="small" style={{ opacity: 0.75, marginTop: 4 }}>
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="small" style={{ fontWeight: 900 }}>
                    {(s.status || "new").toUpperCase()}
                  </div>
                </div>

                <div className="spacer" />

                <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                  {s.suggestion}
                </div>

                <div className="spacer" />

                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="button secondary"
                    style={{ width: "auto" }}
                    onClick={() => updateStatus(s.id, "new")}
                  >
                    New
                  </button>

                  <button
                    className="button secondary"
                    style={{ width: "auto" }}
                    onClick={() => updateStatus(s.id, "reviewed")}
                  >
                    Reviewed
                  </button>

                  <button
                    className="button secondary"
                    style={{ width: "auto" }}
                    onClick={() => updateStatus(s.id, "planned")}
                  >
                    Planned
                  </button>

                  <button
                    className="button secondary"
                    style={{ width: "auto" }}
                    onClick={() => updateStatus(s.id, "completed")}
                  >
                    Completed
                  </button>

                  <button
                    className="button secondary"
                    style={{ width: "auto" }}
                    onClick={() => deleteSuggestion(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}