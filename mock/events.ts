export type AnnualEvent = {
  id: string;
  title: string;
  description?: string;
  year: number;

  // Overall event span label (not the member's session)
  date_range_label?: string;

  // Venue presentation
  venue_name?: string;
  venue_photo_url?: string; // can be placeholder for now
  address_lines?: string[];
  map_url?: string;

  // Resources
  packing_list_url?: string;

  faq?: { q: string; a: string }[];
};

export type EventSession = {
  id: string;
  event_id: string;

  // ADMIN ONLY
  session_code: "A" | "B" | "C";

  start_at: string; // ISO
  end_at?: string;  // ISO
  location?: string;
  notes?: string;
  is_published: boolean;
};

export type SessionAssignment = {
  member_id: string;
  session_id: string;
};

export const eventMock = {
  // Pretend logged-in user (flip isAdmin false to see member view)
  me: { memberId: "me-123", memberName: "Tonya Brown", isAdmin: true },

  // Used only for admin assignment UI (mock)
  members: [
    { id: "me-123", name: "Tonya Brown" },
    { id: "m-456", name: "Alex Nightshade" },
    { id: "m-789", name: "Rowan Graves" },
  ],

  annual: {
    id: "ae-2026",
    title: "The Annual Rite",
    year: 2026,
    description:
      "Once each year, the Academy convenes for a private rite. Attendance is assigned to a reserved window. Do not share your time publicly.",

    date_range_label: "March 5–6, 2026",

    venue_name: "The Parlor",
    venue_photo_url: "https://placehold.co/1200x800/png",
    address_lines: ["123 Candlelight Ave", "New Orleans, LA 70116"],
    map_url: "https://maps.google.com/?q=123%20Candlelight%20Ave%20New%20Orleans%20LA%2070116",

    packing_list_url: "https://example.com/packing-list",

    faq: [
      {
        q: "May I arrive early?",
        a: "Please do not arrive more than 15 minutes early. The Academy staggers arrivals for discretion.",
      },
      {
        q: "What should I wear?",
        a: "Formal attire. If you are uncertain, choose something dark, classic, and comfortable to stand in.",
      },
      {
        q: "Can I bring a guest?",
        a: "No. This event is members only unless you have written authorization from an Administrator.",
      },
      {
        q: "May I take photos?",
        a: "Only in designated areas, and only after the opening rite concludes. No photos of other members without explicit consent.",
      },
    ],
  } satisfies AnnualEvent,

  sessions: [
    {
      id: "s-a",
      event_id: "ae-2026",
      session_code: "A",
      start_at: "2026-03-05T18:00:00-06:00",
      end_at: "2026-03-05T19:30:00-06:00",
      location: "The Parlor",
      notes: "Arrive 10 minutes early. Formal dress. Bring a small offering.",
      is_published: true,
    },
    {
      id: "s-b",
      event_id: "ae-2026",
      session_code: "B",
      start_at: "2026-03-05T19:45:00-06:00",
      end_at: "2026-03-05T21:15:00-06:00",
      location: "The Parlor",
      notes: "Formal dress. You will receive your materials at check-in.",
      is_published: true,
    },
    {
      id: "s-c",
      event_id: "ae-2026",
      session_code: "C",
      start_at: "2026-03-06T18:30:00-06:00",
      end_at: "2026-03-06T20:00:00-06:00",
      location: "The Parlor",
      notes: "Formal dress. Please avoid arriving more than 15 minutes early.",
      is_published: true,
    },
  ] satisfies EventSession[],

  assignments: [
    { member_id: "me-123", session_id: "s-b" },
    { member_id: "m-456", session_id: "s-a" },
    { member_id: "m-789", session_id: "s-c" },
  ] satisfies SessionAssignment[],
};
