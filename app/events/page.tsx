"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string; // admin/member
  status: string; // active/lapsed/disabled
};

type EventRow = {
  id: string;

  // We ONLY use these as shared “venue + global links” metadata for the sessions.
  // If your events table doesn’t have one of these columns, remove it from the SELECT below.
  venue_name: string | null;
  address_lines: string[] | null;
  map_url: string | null;
  packing_list_url: string | null;
  faq_url: string | null;

  is_current: boolean | null;
  is_published: boolean | null;
};

type SessionRow = {
  id: string;
  annual_event_id: string;

  title: string | null;
  start_at: string;
  end_at: string | null;

  location: string | null;
  notes: string | null;

  newsletter_url: string | null; // per-session
  is_published: boolean | null;
};

type AssignmentRow = {
  member_id: string;
  session_id: string;
};

function fmtRange(startISO: string, endISO?: string | null) {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const left = `${dateFmt.format(start)} • ${timeFmt.format(start)}`;
  if (!end) return left;

  const right = `${dateFmt.format(end)} • ${timeFmt.format(end)}`;
  return `${left} — ${right}`;
}

function buildICS(opts: {
  title: string;
  startISO: string;
  endISO?: string | null;
  location?: string;
  description?: string | null;
}) {
  const dt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const start = dt(new Date(opts.startISO).toISOString());
  const end = opts.endISO ? dt(new Date(opts.endISO).toISOString()) : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Academy//Sessions//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${start}`,
    ...(end ? [`DTEND:${end}`] : []),
    `SUMMARY:${opts.title}`,
    ...(opts.location ? [`LOCATION:${opts.location}`] : []),
    ...(opts.description ? [`DESCRIPTION:${(opts.description ?? "").replace(/\n/g, "\\n")}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

function SessionCard(props: {
  photoUrl: string;
  title: string;
  venueName?: string | null;
  addressLines?: string[] | null;
  mapUrl?: string | null;
  rangeLabel: string;
  packingHref?: string | null;
  faqHref?: string | null;
  newsletterHref?: string | null;
  instructions?: string | null;
  onAddToCalendar?: () => void;
}) {
  const {
    photoUrl,
    title,
    venueName,
    addressLines,
    mapUrl,
    rangeLabel,
    packingHref,
    faqHref,
    newsletterHref,
    instructions,
    onAddToCalendar,
  } = props;

  return (
    <div
      className="card"
      style={{
        background: "color-mix(in srgb, var(--bg) 92%, black)",
        overflow: "hidden",
        padding: 0,
      }}
    >
      {/* Photo */}
      <div style={{ position: "relative" }}>
        <img
          src={photoUrl}
          alt="Event venue"
          style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
        />
        {/* optional subtle seal watermark */}
        <img
          src="/emblem.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 12,
            bottom: 10,
            width: 70,
            height: 70,
            opacity: 0.16,
            filter: "drop-shadow(0 6px 10px rgba(0,0,0,.55))",
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ padding: 14 }}>
        <div className="h2" style={{ margin: 0 }}>
          Our Annual Coven Event
        </div>

        <div className="spacer" />

        {/* Full info block */}
        <div className="small">
          Dates & times: <strong>{rangeLabel}</strong>
          <br />
          {venueName ? (
            <>
              Venue: <strong>{venueName}</strong>
              <br />
            </>
          ) : null}
          Address: <strong>{(addressLines ?? []).join(", ") || "—"}</strong>
          <br />
          {mapUrl ? (
            <>
              Map:{" "}
              <a href={mapUrl} target="_blank" rel="noreferrer">
                Open directions
              </a>
            </>
          ) : null}
        </div>

        <div className="spacer" />

        {/* Buttons */}
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {packingHref ? (
            <a className="button secondary" style={{ width: "auto" }} href={packingHref} target="_blank" rel="noreferrer">
              Packing list
            </a>
          ) : (
            <a className="button secondary" style={{ width: "auto" }} href="/events/packing-list">
              Packing list
            </a>
          )}

          {faqHref ? (
            <a className="button secondary" style={{ width: "auto" }} href={faqHref} target="_blank" rel="noreferrer">
              FAQ
            </a>
          ) : (
            <a className="button secondary" style={{ width: "auto" }} href="/events/faq">
              FAQ
            </a>
          )}

          {/* Newsletter: you’ll add URLs later */}
          {newsletterHref ? (
            <a className="button secondary" style={{ width: "auto" }} href={newsletterHref} target="_blank" rel="noreferrer">
              Latest Newsletter
            </a>
          ) : (
            <button className="button secondary" style={{ width: "auto" }} disabled>
              Latest Newsletter
            </button>
          )}

          <button className="button secondary" style={{ width: "auto" }} onClick={onAddToCalendar}>
            Add to calendar
          </button>
        </div>

        {instructions ? (
          <>
            <div className="spacer" />
            <div className="card" style={{ background: "transparent" }}>
              <div className="h2">Intentions:</div>
              <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                {instructions}
              </div>
            </div>
          </>
        ) : null}

        <div className="spacer" />
        <div className="small" style={{ opacity: 0.78 }}>
          Please keep your reserved time private. Do not post it publicly.
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [me, setMe] = useState<MemberRow | null>(null);
  const [eventMeta, setEventMeta] = useState<EventRow | null>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);

  const isAdmin = me?.role === "admin";

  // Static public image, per your instruction
  const photoUrl = "/event.jpg";

  const mySession = useMemo(() => {
    if (!assignment) return null;
    return sessions.find((s) => s.id === assignment.session_id) ?? null;
  }, [sessions, assignment]);

  function addToCalendar(session: SessionRow) {
    const location = [
      eventMeta?.venue_name ?? "",
      ...((eventMeta?.address_lines ?? []) as string[]),
    ]
      .map((x) => x?.trim?.() ?? x)
      .filter(Boolean)
      .join(", ");

    const ics = buildICS({
      title: session.title ?? "Academy Session",
      startISO: session.start_at,
      endISO: session.end_at,
      location: location || undefined,
      description: session.notes ?? "",
    });

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "academy-session.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

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

        // 1) Who am I?
        const { data: member, error: meErr } = await supabase
          .from("members")
          .select("id,email,full_name,role,status")
          .eq("id", user.id)
          .single();

        if (!alive) return;

        if (meErr || !member || member.status === "disabled") {
          console.error(meErr);
          router.replace("/not-verified");
          return;
        }

        setMe(member as MemberRow);

        // 2) Current event metadata (shared for session cards)
        const { data: ev, error: evErr } = await supabase
          .from("events")
          .select("id,venue_name,address_lines,map_url,packing_list_url,faq_url,is_current,is_published")
          .eq("is_current", true)
          .eq("is_published", true)
          .maybeSingle();

        if (!alive) return;

        if (evErr) {
          console.error(evErr);
          setMsg(evErr.message);
          setEventMeta(null);
          setSessions([]);
          setAssignment(null);
          setLoading(false);
          return;
        }

        if (!ev) {
          setMsg("No sessions are published yet.");
          setEventMeta(null);
          setSessions([]);
          setAssignment(null);
          setLoading(false);
          return;
        }

        setEventMeta(ev as EventRow);

        // 3) Sessions: admin sees all; members see published sessions
        const sesQuery = supabase
          .from("event_sessions")
          .select("id,annual_event_id,title,start_at,end_at,location,notes,newsletter_url,is_published")
          .eq("annual_event_id", ev.id)
          .order("start_at", { ascending: true });

        const { data: ses, error: sesErr } = isAdmin
          ? await sesQuery
          : await sesQuery.eq("is_published", true);

        if (!alive) return;

        if (sesErr) {
          console.error(sesErr);
          setMsg(sesErr.message);
          setSessions([]);
          setAssignment(null);
          setLoading(false);
          return;
        }

        setSessions((ses ?? []) as SessionRow[]);

        // 4) Assignment: members only
        if (!isAdmin) {
          const { data: aMe, error: aErr } = await supabase
            .from("event_session_assignments")
            .select("member_id,session_id")
            .eq("member_id", user.id)
            .maybeSingle();

          if (!alive) return;

          if (aErr) {
            console.error(aErr);
            setMsg(aErr.message);
            setAssignment(null);
          } else {
            setAssignment(aMe ? (aMe as AssignmentRow) : null);
          }
        } else {
          setAssignment(null);
        }

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message ?? "Failed to load sessions.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, isAdmin]);

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading sessions…</div>
      </main>
    );
  }

  const venueName = eventMeta?.venue_name ?? null;
  const addressLines = eventMeta?.address_lines ?? null;
  const mapUrl = eventMeta?.map_url ?? null;
  const packingHref = eventMeta?.packing_list_url ?? null;
  const faqHref = eventMeta?.faq_url ?? null;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Events</div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ opacity: 0.9 }}>
              {msg}
            </div>
          </>
        ) : null}

        <div className="spacer" />

        {isAdmin ? (
          // ✅ ADMIN: show all three sessions as full “event cards”
          <div style={{ display: "grid", gap: 14 }}>
            {sessions.length === 0 ? (
              <div className="card subtle">
                <div className="small" style={{ opacity: 0.85 }}>
                  No sessions found. (Expected 3: Jan 5–Feb 10 2027, Jan 13–Jan 18 2027, Apr 6–Apr 11 2027)
                </div>
              </div>
            ) : (
              sessions.map((s, idx) => (
                <SessionCard
                  key={s.id}
                  photoUrl={photoUrl}
                  title={s.title ?? `Session ${idx + 1}`}
                  venueName={venueName}
                  addressLines={addressLines}
                  mapUrl={mapUrl}
                  rangeLabel={fmtRange(s.start_at, s.end_at)}
                  packingHref={packingHref}
                  faqHref={faqHref}
                  newsletterHref={s.newsletter_url}
                  instructions={s.notes}
                  onAddToCalendar={() => addToCalendar(s)}
                />
              ))
            )}
          </div>
        ) : (
          // ✅ MEMBER: show ONLY their assigned session card
          <>
            {!mySession ? (
              <div className="card subtle">
                <div className="h2">Your Assigned Session</div>
                <div className="small" style={{ opacity: 0.85 }}>
                  Your session has not been assigned yet. Please contact an Administrator.
                </div>
              </div>
            ) : (
              <SessionCard
                photoUrl={photoUrl}
                title={mySession.title ?? "Your Assigned Session"}
                venueName={venueName}
                addressLines={addressLines}
                mapUrl={mapUrl}
                rangeLabel={fmtRange(mySession.start_at, mySession.end_at)}
                packingHref={packingHref}
                faqHref={faqHref}
                newsletterHref={mySession.newsletter_url}
                instructions={mySession.notes}
                onAddToCalendar={() => addToCalendar(mySession)}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

/**
 * Your session dates (enter into event_sessions.start_at / end_at):
 * - Session 1: Jan 5, 2027 5:00 PM  → Feb 10, 2027 10:30 AM
 * - Session 2: Jan 13, 2027 5:00 PM → Jan 18, 2027 10:30 AM
 * - Session 3: Apr 6, 2027 5:00 PM  → Apr 11, 2027 10:30 AM
 *
 * Members will ONLY see their assigned session.
 * Admin will see all sessions as full cards.
 */
