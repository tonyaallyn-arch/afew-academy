"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_EVENT_ID = "9279aa84-7abc-4a87-b08c-d76f7ba1aa55";

type SessionCode = "A" | "B" | "C";

type BedroomRow = {
  id: string;
  event_id: string;
  session: SessionCode | string;
  bedroom_name: string;
  bedroom_type: string | null;
  capacity: number;
  notes: string | null;
};

type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type AssignmentRow = {
  id: string;
  bedroom_id: string;
  member_id: string;
};

type SessionAssignmentRow = {
  member_id: string;
  session_id: string;
  event_sessions:
    | {
        session_code: string | null;
      }
    | {
        session_code: string | null;
      }[]
    | null;
};

export default function AdminBedroomsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<SessionCode>("A");

  const [bedrooms, setBedrooms] = useState<BedroomRow[]>([]);
  const [membersBySession, setMembersBySession] = useState<
    Record<string, MemberRow[]>
  >({});
  const [membersById, setMembersById] = useState<Record<string, MemberRow>>({});
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string>>(
    {}
  );

  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

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

      if (!alive) return;

      if (meErr || !me || me.status === "disabled" || me.role !== "admin") {
        router.replace("/");
        return;
      }

      const { data: roomData, error: roomErr } = await supabase
        .from("event_bedrooms")
        .select("id,event_id,session,bedroom_name,bedroom_type,capacity,notes")
        .eq("event_id", ANNUAL_EVENT_ID)
        .order("session", { ascending: true })
        .order("bedroom_name", { ascending: true });

      if (roomErr) {
        setMsg(roomErr.message);
        setLoading(false);
        return;
      }

      const { data: bedroomAssignments, error: bedroomAssignErr } =
        await supabase
          .from("bedroom_assignments")
          .select("id,bedroom_id,member_id");

      if (bedroomAssignErr) {
        setMsg(bedroomAssignErr.message);
        setLoading(false);
        return;
      }

      const { data: sessionAssignments, error: sessionAssignErr } =
        await supabase
          .from("event_session_assignments")
          .select("member_id,session_id,event_sessions(session_code)")
          .eq("annual_event_id", ANNUAL_EVENT_ID);

      if (sessionAssignErr) {
        setMsg(sessionAssignErr.message);
        setLoading(false);
        return;
      }

      const uniqueMemberIds = Array.from(
        new Set(
          [
            ...((sessionAssignments ?? []) as SessionAssignmentRow[]).map(
              (a) => a.member_id
            ),
            ...((bedroomAssignments ?? []) as AssignmentRow[]).map(
              (a) => a.member_id
            ),
          ].filter(Boolean)
        )
      );

      let memberMap: Record<string, MemberRow> = {};
      let groupedMembers: Record<string, MemberRow[]> = {
        A: [],
        B: [],
        C: [],
      };

      if (uniqueMemberIds.length > 0) {
        const { data: memberData, error: memberErr } = await supabase
          .from("members")
          .select("id,full_name,email")
          .in("id", uniqueMemberIds)
          .neq("status", "disabled");

        if (memberErr) {
          setMsg(memberErr.message);
          setLoading(false);
          return;
        }

        memberMap = Object.fromEntries(
          ((memberData ?? []) as MemberRow[]).map((m) => [m.id, m])
        );

        for (const assignment of (sessionAssignments ??
          []) as SessionAssignmentRow[]) {
const eventSession = Array.isArray(assignment.event_sessions)
  ? assignment.event_sessions[0]
  : assignment.event_sessions;

const code = eventSession?.session_code;          const member = memberMap[assignment.member_id];

          if (!code || !member) continue;

          if (!groupedMembers[code]) groupedMembers[code] = [];
          groupedMembers[code].push(member);
        }

        Object.keys(groupedMembers).forEach((code) => {
          groupedMembers[code].sort((a, b) =>
            (a.full_name || a.email || "").localeCompare(
              b.full_name || b.email || ""
            )
          );
        });
      }

      if (!alive) return;

      setBedrooms((roomData ?? []) as BedroomRow[]);
      setAssignments((bedroomAssignments ?? []) as AssignmentRow[]);
      setMembersById(memberMap);
      setMembersBySession(groupedMembers);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [router]);

  const visibleBedrooms = useMemo(() => {
    return bedrooms.filter((room) => room.session === activeSession);
  }, [bedrooms, activeSession]);

  const assignedMemberIdsForSession = useMemo(() => {
    const visibleRoomIds = new Set(visibleBedrooms.map((room) => room.id));

    return new Set(
      assignments
        .filter((assignment) => visibleRoomIds.has(assignment.bedroom_id))
        .map((assignment) => assignment.member_id)
    );
  }, [assignments, visibleBedrooms]);

  const sessionMembers = membersBySession[activeSession] ?? [];

  const totalBeds = visibleBedrooms.reduce(
    (sum, room) => sum + Number(room.capacity || 0),
    0
  );

  const totalAssigned = assignments.filter((assignment) =>
    visibleBedrooms.some((room) => room.id === assignment.bedroom_id)
  ).length;

  const unassignedMembers = sessionMembers.filter(
    (member) => !assignedMemberIdsForSession.has(member.id)
  );

  function assignmentsForRoom(roomId: string) {
    return assignments.filter((assignment) => assignment.bedroom_id === roomId);
  }

  async function assignMember(room: BedroomRow) {
    const memberId = selectedMembers[room.id];

    if (!memberId) {
      alert("Choose a member first.");
      return;
    }

    const currentAssignments = assignmentsForRoom(room.id);

    if (currentAssignments.length >= room.capacity) {
      alert("This room is already full.");
      return;
    }

    const alreadyAssignedInSession = assignedMemberIdsForSession.has(memberId);

    if (alreadyAssignedInSession) {
      alert("This member already has a room in this session.");
      return;
    }

    const { data, error } = await supabase
      .from("bedroom_assignments")
      .insert({
        bedroom_id: room.id,
        member_id: memberId,
      })
      .select("id,bedroom_id,member_id")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setAssignments((current) => [...current, data as AssignmentRow]);
    setSelectedMembers((current) => ({ ...current, [room.id]: "" }));
  }

  async function removeAssignment(assignmentId: string) {
    const { error } = await supabase
      .from("bedroom_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      alert(error.message);
      return;
    }

    setAssignments((current) => current.filter((a) => a.id !== assignmentId));
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Bedroom Assignments…</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Bedroom Assignments</div>

        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          Assign members to rooms by session and track occupancy.
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ opacity: 0.9 }}>{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {(["A", "B", "C"] as SessionCode[]).map((code) => (
            <button
              key={code}
              className={
                activeSession === code ? "button" : "button secondary"
              }
              style={{ width: "auto" }}
              onClick={() => setActiveSession(code)}
            >
              Session {code}
            </button>
          ))}
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Session {activeSession} Housing</div>

          <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
            Beds filled: {totalAssigned} / {totalBeds}
          </div>

          <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
            Members assigned to this session: {sessionMembers.length}
          </div>

          <div className="spacer" />

          {sessionMembers.length > totalBeds ? (
            <div className="small" style={{ fontWeight: 900 }}>
              ⚠ Session {activeSession} has {sessionMembers.length} members but
              only {totalBeds} beds.
            </div>
          ) : unassignedMembers.length > 0 ? (
            <div className="small" style={{ fontWeight: 900 }}>
              ⚠ {unassignedMembers.length} member
              {unassignedMembers.length === 1 ? "" : "s"} still need
              {unassignedMembers.length === 1 ? "s" : ""} a room.
            </div>
          ) : (
            <div className="small" style={{ fontWeight: 900 }}>
              ✓ Session {activeSession} housing complete.
            </div>
          )}
        </div>

        <div className="spacer" />

        <div style={{ display: "grid", gap: 12 }}>
          {visibleBedrooms.map((room) => {
            const roomAssignments = assignmentsForRoom(room.id);
            const isFull = roomAssignments.length >= room.capacity;

            return (
              <div key={room.id} className="card subtle">
                <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{room.bedroom_name}</div>

                    <div className="small" style={{ opacity: 0.85, marginTop: 4 }}>
                      {(room.bedroom_type || "room").toUpperCase()} · Occupancy:{" "}
                      {roomAssignments.length} / {room.capacity}
                    </div>
                  </div>

                  {isFull ? (
                    <div className="small" style={{ fontWeight: 900 }}>
                      Full
                    </div>
                  ) : null}
                </div>

                {room.notes ? (
                  <>
                    <div className="spacer" />
                    <div className="small">{room.notes}</div>
                  </>
                ) : null}

                <div className="spacer" />

                <div style={{ display: "grid", gap: 8 }}>
                  {roomAssignments.length === 0 ? (
                    <div className="small" style={{ opacity: 0.75 }}>
                      No members assigned yet.
                    </div>
                  ) : (
                    roomAssignments.map((assignment) => {
                      const member = membersById[assignment.member_id];

                      return (
                        <div
                          key={assignment.id}
                          className="card"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800 }}>
                              {member?.full_name ||
                                member?.email ||
                                "Unknown Member"}
                            </div>

                            <div className="small" style={{ opacity: 0.75 }}>
                              {member?.email}
                            </div>
                          </div>

                          <button
                            className="button secondary"
                            style={{ width: "auto" }}
                            onClick={() => removeAssignment(assignment.id)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="spacer" />

                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <select
                    className="input"
                    style={{ flex: "1 1 260px" }}
                    value={selectedMembers[room.id] ?? ""}
                    onChange={(e) =>
                      setSelectedMembers((current) => ({
                        ...current,
                        [room.id]: e.target.value,
                      }))
                    }
                    disabled={isFull || unassignedMembers.length === 0}
                  >
                    <option value="">
                      {isFull
                        ? "Room is full"
                        : unassignedMembers.length === 0
                          ? "No unassigned members"
                          : "Choose member"}
                    </option>

                    {unassignedMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email || "Unnamed Member"}
                      </option>
                    ))}
                  </select>

                  <button
                    className="button"
                    style={{ width: "auto" }}
                    onClick={() => assignMember(room)}
                    disabled={isFull || unassignedMembers.length === 0}
                  >
                    Assign Member
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}