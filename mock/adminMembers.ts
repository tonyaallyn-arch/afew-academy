export type MemberStatus = "active" | "lapsed" | "disabled";
export type MemberRole = "admin" | "member";
export type PaymentPlan = "full" | "monthly" | "quarterly";

export type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  status: MemberStatus;

  dues_balance_cents: number;
  payment_plan: PaymentPlan;
  next_due_date: string | null; // YYYY-MM-DD

  tags: string[]; // tag IDs
};

export type Tag = { id: string; name: string };

export const adminMock = {
  me: { memberId: "me-123", isAdmin: true },

  tags: [
    { id: "t-found", name: "Founding Circle" },
    { id: "t-ritual", name: "Ritual Committee" },
    { id: "t-host", name: "Host" },
    { id: "t-vet", name: "Vetted" },
  ] satisfies Tag[],

  members: [
    {
      id: "me-123",
      email: "tonya@example.com",
      full_name: "Tonya Brown",
      role: "admin",
      status: "active",
      dues_balance_cents: 0,
      payment_plan: "full",
      next_due_date: null,
      tags: ["t-found", "t-host"],
    },
    {
      id: "m-456",
      email: "alex@example.com",
      full_name: "Alex Nightshade",
      role: "member",
      status: "active",
      dues_balance_cents: 2500,
      payment_plan: "monthly",
      next_due_date: "2026-03-01",
      tags: ["t-vet"],
    },
    {
      id: "m-789",
      email: "rowan@example.com",
      full_name: "Rowan Graves",
      role: "member",
      status: "lapsed",
      dues_balance_cents: 5000,
      payment_plan: "quarterly",
      next_due_date: "2026-04-01",
      tags: [],
    },
  ] satisfies Member[],
};
