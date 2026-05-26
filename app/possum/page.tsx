"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BirthdayMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  birthday: string | null;
};

type BirthdayAck = {
  member_id: string;
};

type PossumVoteRow = {
  vote: string;
};

type PossumResult = {
  name: string;
  count: number;
};

export default function AdminHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [birthdayAlerts, setBirthdayAlerts] = useState<BirthdayMember[]>([]);
  const [possumResults, setPossumResults] = useState<PossumResult[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
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
        setMeId(me.id);

        const { data: birthdays } = await supabase
          .from("members")
          .select("id, full_name, email, birthday")
          .not("birthday", "is", null)
          .neq("status", "disabled");

        const { data: acknowledgements } = await supabase
          .from("birthday_alert_acknowledgements")
          .select("member_id")
          .eq("admin_id", me.id);

        const acknowledgedIds = new Set(
          ((acknowledgements ?? []) as BirthdayAck[]).map((a) => a.member_id)
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = ((birthdays ?? []) as BirthdayMember[]).filter(
          (member) => {
            if (!member.birthday || acknowledgedIds.has(member.id)) {
              return false;
            }

            const [, month, day] = member.birthday.split("-").map(Number);

            let nextBirthday = new Date(today.getFullYear(), month - 1, day);
            nextBirthday.setHours(0, 0, 0, 0);

            if (nextBirthday < today) {
              nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
            }

            const daysAway = Math.ceil(
              (nextBirthday.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return daysAway >= 0 && daysAway <= 30;
          }
        );

        setBirthdayAlerts(upcoming);

        const { data: votes } = await supabase
          .from("possum_poll_votes")
          .select("vote");

        const counts: Record<string, number> = {};

        ((votes ?? []) as PossumVoteRow[]).forEach((v) => {
          counts[v.vote] = (counts[v.vote] ?? 0) + 1;
        });

        setPossumResults(
          Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load admin dashboard.");
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      alive = false;
    };
  }, [router]);

  async function acknowledgeBirthday(memberId: string) {
    if (!meId) return;

    const { error } = await supabase
      .from("birthday_alert_acknowledgements")
      .insert({
        admin_id: meId,
        member_id: memberId,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setBirthdayAlerts((current) => current.filter((m) => m.id !== memberId));
  }

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
          {meEmail
            ? `Signed in as ${meEmail}`
            : "You have administrator access."}
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ opacity: 0.9 }}>
              {msg}
            </div>
          </>
        ) : null}

        {birthdayAlerts.length > 0 ? (
          <>
            <div className="spacer" />

            <div className="card subtle">
              <div style={{ fontWeight: 900 }}>Upcoming Birthdays</div>

              <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
                These members have birthdays within the next 30 days.
              </div>

              <div className="spacer" />

              <div style={{ display: "grid", gap: 10 }}>
                {birthdayAlerts.map((member) => (
                  <div
                    key={member.id}
                    className="card"
                    style={{ display: "grid", gap: 8 }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {member.full_name || member.email || "Unnamed Member"}
                    </div>

                    <div className="small">Birthday: {member.birthday}</div>

                    <button
                      className="button secondary"
                      style={{ width: "auto" }}
                      onClick={() => acknowledgeBirthday(member.id)}
                    >
                      I saw this
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {possumResults.length > 0 ? (
          <>
            <div className="spacer" />

            <div className="card subtle">
              <div style={{ fontWeight: 900 }}>Possum Krewe Naming Poll</div>

              <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
                Current standings
              </div>

              <div className="spacer" />

              <div style={{ display: "grid", gap: 8 }}>
                {possumResults.map((result) => (
                  <div
                    key={result.name}
                    className="card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>{result.name}</div>

                    <div style={{ fontWeight: 900 }}>{result.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="spacer" />

        <div style={{ display: "grid", gap: 12 }}>
          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Members</div>

            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Edit member info, assign sessions, record payments, update dietary
              notes, birthdays, and emergency contacts.
            </div>

            <div className="spacer" />

            <a className="button" style={{ width: "auto" }} href="/admin/members">
              Manage Members
            </a>
          </div>

          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Events</div>

            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              View what members see and sanity-check sessions.
            </div>

            <div className="spacer" />

            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <a
                className="button secondary"
                style={{ width: "auto" }}
                href="/events"
              >
                View Events Page
              </a>

              <a
                className="button secondary"
                style={{ width: "auto" }}
                href="/events/packing-list"
              >
                Packing List Page
              </a>

              <a
                className="button secondary"
                style={{ width: "auto" }}
                href="/events/faq"
              >
                FAQ Page
              </a>
            </div>
          </div>

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

              <a
                className="button secondary"
                style={{ width: "auto" }}
                href="/joan"
              >
                Nomination Page
              </a>

              <a
                className="button secondary"
                style={{ width: "auto" }}
                href="/joan/vote"
              >
                Voting Page
              </a>
            </div>
          </div>

          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Possum Group</div>

            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              View the Session B Possum page and monitor the krewe name poll.
            </div>

            <div className="spacer" />

            <a
              className="button secondary"
              style={{ width: "auto" }}
              href="/possum"
            >
              View Possum Page
            </a>
          </div>

          <div className="card subtle">
            <div style={{ fontWeight: 900 }}>Announcements</div>

            <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
              Post updates that appear on the homepage.
            </div>

            <div className="spacer" />

            <a
              className="button secondary"
              style={{ width: "auto" }}
              href="/admin/announcements"
            >
              Manage Announcements
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}