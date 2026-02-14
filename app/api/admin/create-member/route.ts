import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Body = {
  annual_event_id: string;

  email: string;
  full_name: string;

  role: "admin" | "member";
  status: "active" | "lapsed" | "disabled";

  tier: string | null;
  member_number: string | null;

  renewal_date: string | null;
  last_payment_date: string | null;
  next_due_date: string | null;

  dues_balance_cents: number;
  payment_plan: "full" | "monthly" | "quarterly" | null;

  plan_day_of_month: number | null;
  plan_quarter_anchor_month: number | null;

  admin_notes: string | null;
  tags: string[];

  session_code: "A" | "B" | "C" | null;
};

export async function POST(req: Request) {
  try {
    // 1) Verify caller is logged in (bearer token)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
    }

    const callerId = userRes.user.id;

    // 2) Verify caller is an active admin in members table
    const { data: me, error: meErr } = await supabaseAdmin
      .from("members")
      .select("id,role,status")
      .eq("id", callerId)
      .single();

    if (meErr || !me || me.status !== "active" || me.role !== "admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    // 3) Parse body
    const body = (await req.json()) as Body;

    const email = (body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    // 4) Find session_id from session_code (optional)
    let sessionId: string | null = null;
    if (body.session_code) {
      const { data: ses, error: sesErr } = await supabaseAdmin
        .from("event_sessions")
        .select("id")
        .eq("annual_event_id", body.annual_event_id)
        .eq("session_code", body.session_code)
        .maybeSingle();

      if (sesErr) {
        return NextResponse.json({ error: "Failed to look up session: " + sesErr.message }, { status: 400 });
      }

      sessionId = ses?.id ?? null;
    }

    // 5) Create Auth user + send invite
    // If the email already exists, inviteUserByEmail will error; we’ll surface it.
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteErr || !invited?.user) {
      return NextResponse.json({ error: inviteErr?.message ?? "Failed to invite user." }, { status: 400 });
    }

    const newUserId = invited.user.id;

    // 6) Insert into members table (id MUST match auth.users id)
    const { error: insErr } = await supabaseAdmin.from("members").insert({
      id: newUserId,
      email,
      full_name: body.full_name?.trim() || null,
      role: body.role,
      status: body.status,

      tier: body.tier,
      member_number: body.member_number,

      renewal_date: body.renewal_date,
      last_payment_date: body.last_payment_date,
      next_due_date: body.next_due_date,

      dues_balance_cents: body.dues_balance_cents ?? 0,
      payment_plan: body.payment_plan,

      plan_day_of_month: body.plan_day_of_month,
      plan_quarter_anchor_month: body.plan_quarter_anchor_month,

      admin_notes: body.admin_notes,
      tags: body.tags ?? [],
    });

    if (insErr) {
      return NextResponse.json({ error: "Member insert failed: " + insErr.message }, { status: 400 });
    }

    // 7) Assignment (optional)
    if (sessionId) {
      // defensive: remove any existing rows for this annual_event_id + member_id
      await supabaseAdmin
        .from("event_session_assignments")
        .delete()
        .eq("annual_event_id", body.annual_event_id)
        .eq("member_id", newUserId);

      const { error: asnErr } = await supabaseAdmin.from("event_session_assignments").insert({
        annual_event_id: body.annual_event_id,
        member_id: newUserId,
        session_id: sessionId,
      });

      if (asnErr) {
        return NextResponse.json({ error: "Assignment failed: " + asnErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, id: newUserId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error." }, { status: 500 });
  }
}
