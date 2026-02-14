export type Nomination = {
  memberId: string;
  memberName: string;
  blurb?: string;
  createdAt: string;
  status: "pending" | "approved" | "withdrawn";
};

export type Vote = {
  voterMemberId: string;
  candidateMemberId: string;
  createdAt: string;
};

export type JoanState = {
  year: number;
  nominationOpen: boolean;
  votingOpen: boolean;
  closesAt?: string; // ISO
  description: string;

  me: { memberId: string; memberName: string; isAdmin: boolean };

  nominations: Nomination[];
  votes: Vote[];

  winner?: { memberId: string; memberName: string; chosenAt: string };
  briefingText?: string;
};

export const joanMock: JoanState = {
  year: 2026,
  nominationOpen: true,
  votingOpen: false,
  closesAt: "2026-02-28T23:59:00-06:00",
  description:
    "Each year, the Academy selects one member to bear the mantle of Joan of Arc—our ceremonial figurehead for the coming season. This process occurs in three rites: nomination, vote, and the sealing of the Chosen One.",

  // Pretend this is the logged-in member
  me: { memberId: "me-123", memberName: "Tonya Brown", isAdmin: true },

  nominations: [
    {
      memberId: "me-123",
      memberName: "Tonya Brown",
      blurb: "I will represent the Academy with discipline and flair.",
      createdAt: "2026-02-10T10:00:00-06:00",
      status: "approved",
    },
    {
      memberId: "m-456",
      memberName: "Alex Nightshade",
      blurb: "For honor, spectacle, and service.",
      createdAt: "2026-02-11T18:30:00-06:00",
      status: "approved",
    },
    {
      memberId: "m-789",
      memberName: "Rowan Graves",
      createdAt: "2026-02-12T09:15:00-06:00",
      status: "pending",
    },
  ],

  votes: [
    { voterMemberId: "m-001", candidateMemberId: "m-456", createdAt: "2026-02-12T12:00:00-06:00" },
    { voterMemberId: "m-002", candidateMemberId: "me-123", createdAt: "2026-02-12T12:05:00-06:00" },
  ],

  // winner omitted for now (no winner yet)
  briefingText:
    "Sealed instructions will appear here for the Chosen One once selected. Details include parade schedule, meeting points, attire guidance, and expectations.",
};
