"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const NOM_TABLE = "joan_nominations";

type NomRow = {
  id: string;
  member_id: string;
  created_at: string; // timestamptz
  blurb: string;

  // ✅ TEXT column in your table:
  // null = pending, "approved" = approved, "denied" = denied
  is_approved: "approved" | "denied" | null;

  reviewed_at: string | null; // timestamptz (or null)
  reviewed_by: string | null; // text (uuid stored as text)
  admin_note: string | null;
};

type MemberLite = {
  id: string;
  email: string;
  full_name: string | null;
};

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString();
}

function statusLabel(v: NomRow["is_approved"]): "pending" | "approved" | "denied" {
  if (v === "approved") return "approved";
  if (v === "denied") return "denied";
  return "pending";
}

export default function AdminJoanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meAdmin, setMeAdmin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<NomRow[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, MemberLite>>({});

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("pending");

  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

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

  async function loadAll() {
    setMsg(null);

    const { data: noms, error: nErr } = await supabase
      .from(NOM_TABLE)
      .select("id,member_id,created_at,blurb,is_approved,reviewed_at,reviewed_by,admin_note")
      .order("created_at", { ascending: false });

    if (nErr) throw nErr;

    const list = (noms ?? []) as NomRow[];
    setRows(list);

    // seed note drafts from existing notes
    const seed: Record<string, string> = {};
    list.forEach((r) => {
      seed[r.id] = r.admin_note ?? "";
    });
    setNoteDraft(seed);

    // member lookup (batch)
    const ids = Array.from(new Set(list.map((r) => r.member_id).filter(Boolean)));
    if (ids.length === 0) {
      setMemberMap({});
      return;
    }

    const { data: mems, error: mErr } = await supabase
      .from("members")
      .select("id,email,full_name")
      .in("id", ids);

    if (mErr) throw mErr;

    const map: Record<string, MemberLite> = {};
    (mems ?? []).forEach((m: any) => {
      map[m.id] = { id: m.id, email: m.email, full_name: m.full_name ?? null };
    });
    setMemberMap(map);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const ok = await verifyAdminOrRedirect();
        if (!ok || !alive) return;

        await loadAll();
        if (!alive) return;

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load nominations.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return rows.filter((r) => {
      const st = statusLabel(r.is_approved);
      if (filter !== "all" && st !== filter) return false;

      if (!needle) return true;

      const mem = memberMap[r.member_id];
      const hay = `${mem?.full_name ?? ""} ${mem?.email ?? ""} ${r.blurb ?? ""} ${r.admin_note ?? ""}`
        .toLowerCase()
        .trim();

      return hay.includes(needle);
    });
  }, [rows, memberMap, q, filter]);

  // ✅ One writer: approved / denied / pending(null)
  async function setDecision(id: string, decision: "approved" | "denied" | null) {
    setSavingId(id);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const adminId = auth?.user?.id ?? null;

    const note = (noteDraft[id] ?? "").trim() || null;

    const updates =
      decision === null
        ? {
            is_approved: null,
            reviewed_at: null,
            reviewed_by: null,
            admin_note: note,
          }
        : {
            is_approved: decision,
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminId, // stored as text in your table
            admin_note: note,
          };

    // 1) Attempt update (no .single() / .maybeSingle())
    const { error: upErr } = await supabase.from(NOM_TABLE).update(updates).eq("id", id);

    if (upErr) {
      console.error(upErr);
      setMsg(`Update failed: ${upErr.message}`);
      setSavingId(null);
      return;
    }

    // 2) Re-read the row and confirm it really changed (catches RLS silently blocking)
    const { data: after, error: readErr } = await supabase
      .from(NOM_TABLE)
      .select("id,is_approved,reviewed_at,reviewed_by,admin_note")
      .eq("id", id);

    if (readErr) {
      console.error(readErr);
      setMsg("Update may have been blocked by RLS. Could not re-read row: " + readErr.message);
      setSavingId(null);
      return;
    }

    if (!after || after.length === 0) {
      setMsg("Update was blocked (0 rows visible after update). This is almost certainly an RLS policy issue.");
      setSavingId(null);
      return;
    }

    const fresh = after[0] as any;

    // 3) Verify DB now matches what we tried to set
    const expectedApproved = (updates as any).is_approved;
    const expectedReviewedBy = (updates as any).reviewed_by;
    const expectedNote = (updates as any).admin_note;

    const ok =
      fresh.is_approved === expectedApproved &&
      fresh.reviewed_by === expectedReviewedBy &&
      fresh.admin_note === expectedNote &&
      (decision === null ? fresh.reviewed_at === null : !!fresh.reviewed_at);

    if (!ok) {
      setMsg(
        "Update did not persist to the database (likely blocked by RLS). Supabase still shows old values."
      );
      setSavingId(null);
      return;
    }

    // 4) Update UI from DB truth
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fresh } : r)));

    setMsg(decision === null ? "Marked pending." : `Marked ${decision}.`);
    setSavingId(null);
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Joan of Arc nominations…</div>
      </main>
    );
  }

  if (!meAdmin) return null;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Admin: Joan of Arc Nominations</div>
        <div className="small">Review self-nominations, approve/deny, and leave internal notes.</div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Search name, email, blurb, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 260px" }}
          />

          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{ flex: "0 0 180px" }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>

          <button
            className="button secondary"
            style={{ width: "auto" }}
            onClick={async () => {
              try {
                setMsg(null);
                await loadAll();
              } catch (e: any) {
                console.error(e);
                setMsg(e?.message ?? "Refresh failed.");
              }
            }}
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

        {filtered.length === 0 ? (
          <div className="small">No nominations found.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((r) => {
              const mem = memberMap[r.member_id];
              const st = statusLabel(r.is_approved);
              const busy = savingId === r.id;

              return (
                <div
                  key={r.id}
                  className="card subtle"
                  style={{ background: "color-mix(in srgb, var(--bg) 92%, black)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{mem?.full_name ?? mem?.email ?? "Unknown member"}</div>
                      <div className="small" style={{ opacity: 0.8 }}>{mem?.email ?? r.member_id}</div>
                    </div>

                    <div className="small" style={{ textAlign: "right", opacity: 0.8 }}>
                      <div>
                        Status:{" "}
                        <strong
                          style={{
                            color:
                              st === "approved"
                                ? "var(--haint)"
                                : st === "denied"
                                ? "rgba(255,160,160,.92)"
                                : "rgba(255,255,255,.82)",
                          }}
                        >
                          {st}
                        </strong>
                      </div>
                      <div>Submitted: {fmtDT(r.created_at)}</div>
                      {r.reviewed_at ? <div>Reviewed: {fmtDT(r.reviewed_at)}</div> : null}
                    </div>
                  </div>

                  <div className="spacer" />

                  <div className="small" style={{ whiteSpace: "pre-wrap", opacity: 0.92 }}>
                    {r.blurb}
                  </div>

                  <div className="spacer" />

                  <div className="small" style={{ marginBottom: 6 }}>Admin note (internal)</div>
                  <textarea
                    className="input"
                    style={{ minHeight: 84, resize: "vertical" }}
                    value={noteDraft[r.id] ?? ""}
                    onChange={(e) => setNoteDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Optional internal note."
                    disabled={busy}
                  />

                  <div className="spacer" />

                  <div className="row" style={{ gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                      className="button secondary"
                      style={{ width: "auto" }}
                      disabled={busy}
                      onClick={() => setDecision(r.id, null)}
                    >
                      {busy ? "Working…" : "Mark Pending"}
                    </button>

                    <button
                      className="button secondary"
                      style={{ width: "auto" }}
                      disabled={busy}
                      onClick={() => setDecision(r.id, "denied")}
                    >
                      {busy ? "Working…" : "Deny"}
                    </button>

                    <button
                      className="button"
                      style={{ width: "auto" }}
                      disabled={busy}
                      onClick={() => setDecision(r.id, "approved")}
                    >
                      {busy ? "Working…" : "Approve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
