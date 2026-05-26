"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

type SessionCode = "A" | "B" | "C";

type RosterMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  dietary_restrictions: string | null;
  food_preferences: string | null;
  allergies: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

type SessionAssignment = {
  member_id: string;
  event_sessions:
    | {
        session_code: string | null;
      }
    | {
        session_code: string | null;
      }[]
    | null;
};

type BedroomAssignment = {
  member_id: string;
  event_bedrooms:
    | {
        bedroom_name: string | null;
        session: string | null;
      }
    | {
        bedroom_name: string | null;
        session: string | null;
      }[]
    | null;
};

export default function AdminRostersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<SessionCode>("A");
  const [membersBySession, setMembersBySession] = useState<
    Record<string, RosterMember[]>
  >({ A: [], B: [], C: [] });
  const [roomsByMember, setRoomsByMember] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMsg(null);

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

      const { data: sessionAssignments, error: sessionErr } = await supabase
        .from("event_session_assignments")
        .select("member_id, event_sessions(session_code)")
        .eq("annual_event_id", ANNUAL_EVENT_ID);

      if (sessionErr) {
        setMsg(sessionErr.message);
        setLoading(false);
        return;
      }

      const memberIds = Array.from(
        new Set(
          ((sessionAssignments ?? []) as SessionAssignment[]).map(
            (a) => a.member_id
          )
        )
      );

      let memberMap: Record<string, RosterMember> = {};

      if (memberIds.length > 0) {
        const { data: memberData, error: memberErr } = await supabase
          .from("members")
          .select(`
            id,
            full_name,
            email,
            dietary_restrictions,
            food_preferences,
            allergies,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship
          `)
          .in("id", memberIds)
          .neq("status", "disabled");

        if (memberErr) {
          setMsg(memberErr.message);
          setLoading(false);
          return;
        }

        memberMap = Object.fromEntries(
          ((memberData ?? []) as RosterMember[]).map((m) => [m.id, m])
        );
      }

      const grouped: Record<string, RosterMember[]> = { A: [], B: [], C: [] };

      for (const assignment of (sessionAssignments ?? []) as SessionAssignment[]) {
const eventSession = Array.isArray(assignment.event_sessions)
  ? assignment.event_sessions[0]
  : assignment.event_sessions;

const code = eventSession?.session_code;
        const member = memberMap[assignment.member_id];

        if (!code || !member) continue;

        if (!grouped[code]) grouped[code] = [];
        grouped[code].push(member);
      }

      Object.keys(grouped).forEach((code) => {
        grouped[code].sort((a, b) =>
          (a.full_name || a.email || "").localeCompare(
            b.full_name || b.email || ""
          )
        );
      });

      const { data: bedroomAssignments, error: bedroomErr } = await supabase
        .from("bedroom_assignments")
        .select("member_id, event_bedrooms(bedroom_name, session)");

      if (bedroomErr) {
        setMsg(bedroomErr.message);
      } else {
        const roomMap: Record<string, string> = {};

        for (const assignment of (bedroomAssignments ??
          []) as BedroomAssignment[]) {
const eventBedroom = Array.isArray(assignment.event_bedrooms)
  ? assignment.event_bedrooms[0]
  : assignment.event_bedrooms;

const roomName = eventBedroom?.bedroom_name;
const roomSession = eventBedroom?.session;
          if (!roomName || !roomSession) continue;

          roomMap[`${roomSession}:${assignment.member_id}`] = roomName;
        }

        setRoomsByMember(roomMap);
      }

      setMembersBySession(grouped);
      setLoading(false);
    }

    load();
  }, [router]);

  const visibleMembers = membersBySession[activeSession] ?? [];

  const summary = useMemo(() => {
    const roomed = visibleMembers.filter(
      (m) => roomsByMember[`${activeSession}:${m.id}`]
    ).length;

    const allergies = visibleMembers.filter((m) =>
      Boolean(m.allergies?.trim())
    ).length;

    const dietary = visibleMembers.filter(
      (m) =>
        Boolean(m.dietary_restrictions?.trim()) ||
        Boolean(m.food_preferences?.trim())
    ).length;

    const emergency = visibleMembers.filter(
      (m) =>
        Boolean(m.emergency_contact_name?.trim()) ||
        Boolean(m.emergency_contact_phone?.trim())
    ).length;

    return {
      total: visibleMembers.length,
      roomed,
      allergies,
      dietary,
      emergency,
    };
  }, [visibleMembers, roomsByMember, activeSession]);

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Session Rosters…</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Session Roster Reports</div>

        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          Emergency contacts, food notes, allergies, and room assignments by
          session.
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small">{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {(["A", "B", "C"] as SessionCode[]).map((code) => (
            <button
              key={code}
              className={activeSession === code ? "button" : "button secondary"}
              style={{ width: "auto" }}
              onClick={() => setActiveSession(code)}
            >
              Session {code}
            </button>
          ))}
        </div>

        <div className="spacer" />

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          }}
        >
          <div className="card subtle">
            <div className="small">Members</div>
            <div className="h2">{summary.total}</div>
          </div>

          <div className="card subtle">
            <div className="small">Rooms Assigned</div>
            <div className="h2">{summary.roomed}</div>
          </div>

          <div className="card subtle">
            <div className="small">Allergies</div>
            <div className="h2">{summary.allergies}</div>
          </div>

          <div className="card subtle">
            <div className="small">Dietary Notes</div>
            <div className="h2">{summary.dietary}</div>
          </div>

          <div className="card subtle">
            <div className="small">Emergency Contacts</div>
            <div className="h2">{summary.emergency}</div>
          </div>
        </div>

        <div className="spacer" />

        {visibleMembers.length === 0 ? (
          <div className="card subtle">
            <div className="small">No members assigned to Session {activeSession}.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {visibleMembers.map((member) => (
              <div key={member.id} className="card subtle">
                <div style={{ fontWeight: 900 }}>
                  {member.full_name || member.email || "Unnamed Member"}
                </div>

                <div className="small" style={{ opacity: 0.75, marginTop: 4 }}>
                  {member.email}
                </div>

                <div className="spacer" />

                <div className="small">
                  <strong>Room:</strong>{" "}
                  {roomsByMember[`${activeSession}:${member.id}`] || "—"}
                </div>

                <div className="small">
                  <strong>Emergency Contact:</strong>{" "}
                  {member.emergency_contact_name || "—"}
                  {member.emergency_contact_phone
                    ? ` • ${member.emergency_contact_phone}`
                    : ""}
                  {member.emergency_contact_relationship
                    ? ` • ${member.emergency_contact_relationship}`
                    : ""}
                </div>

                <div className="small">
                  <strong>Allergies:</strong> {member.allergies || "—"}
                </div>

                <div className="small">
                  <strong>Dietary Restrictions:</strong>{" "}
                  {member.dietary_restrictions || "—"}
                </div>

                <div className="small">
                  <strong>Food Preferences:</strong>{" "}
                  {member.food_preferences || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}