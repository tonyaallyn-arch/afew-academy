"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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

        const { data: me, error } = await supabase
          .from("members")
          .select("id, email, role, status")
          .eq("id", user.id)
          .single();

        if (!alive) return;

        if (error || !me || me.status === "disabled" || me.role !== "admin") {
          router.replace("/");
          return;
        }

        setMeEmail(me.email ?? null);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load admin dashboard.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Admin Console…</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Admin Console</div>
        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          {meEmail ? `Signed in as ${meEmail}` : "You have administrator access."}
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ opacity: 0.9 }}>{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        <div style={{ display: "grid", gap: 12 }}>
          {/* Members */}
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Members</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Edit member info, assign sessions, record payments.
            </div>
            <div className="spacer" />
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a className="button" style={{ width: "auto" }} href="/admin/members">
                Manage Members
              </a>
            </div>
          </div>

          {/* Events / Sessions */}
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Events</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              View what members see and sanity-check sessions.
            </div>
            <div className="spacer" />
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a className="button secondary" style={{ width: "auto" }} href="/events">
                View Events Page
              </a>
              <a className="button secondary" style={{ width: "auto" }} href="/events/packing-list">
                Packing List Page
              </a>
              <a className="button secondary" style={{ width: "auto" }} href="/events/faq">
                FAQ Page
              </a>
            </div>
          </div>

          {/* Joan of Arc */}
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Joan of Arc</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Review nominations and monitor voting.
            </div>
            <div className="spacer" />
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a className="button" style={{ width: "auto" }} href="/admin/joan">
                Review Nominations
              </a>
              <a className="button secondary" style={{ width: "auto" }} href="/joan">
                Nomination Page
              </a>
              <a className="button secondary" style={{ width: "auto" }} href="/joan/vote">
                Voting Page
              </a>
            </div>
          </div>

          {/* Announcements */}
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Announcements</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Post updates that appear on the homepage.
            </div>
            <div className="spacer" />
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a className="button secondary" style={{ width: "auto" }} href="/admin/announcements">
                Manage Announcements
              </a>
            </div>
          </div>

          {/* Site Content */}
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Site Content</div>
            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Culture + Scrapbook (local images), Documents (public PDFs for now).
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

