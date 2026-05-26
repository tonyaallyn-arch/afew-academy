"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TransactionType = "income" | "expense";
type ProjectionType = "expected_income" | "expected_expense";

type FinancialTransaction = {
  id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  category: string;
  session_code: string | null;
  description: string | null;
  amount: number;
};

type FinancialProjection = {
  id: string;
  projection_date: string;
  projection_type: ProjectionType;
  category: string;
  session_code: string | null;
  description: string | null;
  amount: number;
};

const INCOME_CATEGORIES = [
  "Membership Dues",
  "Fundraiser",
  "Donation",
  "Event Revenue",
  "Merchandise",
  "Other",
];

const EXPENSE_CATEGORIES = [
  "Housing",
  "Venue",
  "Food",
  "Feeds",
  "Freelancers",
  "Supplies",
  "Education",
  "Transportation",
  "Decorations",
  "Other",
];

const SESSION_OPTIONS = ["", "A", "B", "C"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function AdminBudgetPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [projections, setProjections] = useState<FinancialProjection[]>([]);
  const [reserveFund, setReserveFund] = useState("0.00");

  const [actualType, setActualType] = useState<TransactionType>("income");
  const [actualDate, setActualDate] = useState(today());
  const [actualCategory, setActualCategory] = useState("Membership Dues");
  const [actualSession, setActualSession] = useState("");
  const [actualDescription, setActualDescription] = useState("");
  const [actualAmount, setActualAmount] = useState("");

  const [projectionType, setProjectionType] =
    useState<ProjectionType>("expected_income");
  const [projectionDate, setProjectionDate] = useState(today());
  const [projectionCategory, setProjectionCategory] =
    useState("Membership Dues");
  const [projectionSession, setProjectionSession] = useState("");
  const [projectionDescription, setProjectionDescription] = useState("");
  const [projectionAmount, setProjectionAmount] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const actualCategories =
    actualType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const projectionCategories =
    projectionType === "expected_income"
      ? INCOME_CATEGORIES
      : EXPENSE_CATEGORIES;

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

      setAdminId(me.id);

      const { data: setting } = await supabase
        .from("financial_settings")
        .select("reserve_fund")
        .eq("id", 1)
        .single();

      if (setting) {
        setReserveFund(Number(setting.reserve_fund || 0).toFixed(2));
      }

      const { data: tx, error: txErr } = await supabase
        .from("financial_transactions")
        .select(
          "id,transaction_date,transaction_type,category,session_code,description,amount"
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (txErr) {
        setMsg(txErr.message);
      } else {
        setTransactions((tx ?? []) as FinancialTransaction[]);
      }

      const { data: pr, error: prErr } = await supabase
        .from("financial_projections")
        .select(
          "id,projection_date,projection_type,category,session_code,description,amount"
        )
        .order("projection_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (prErr) {
        setMsg(prErr.message);
      } else {
        setProjections((pr ?? []) as FinancialProjection[]);
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [router]);

  const totals = useMemo(() => {
    const actualIncome = transactions
      .filter((t) => t.transaction_type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const actualExpenses = transactions
      .filter((t) => t.transaction_type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const expectedIncome = projections
      .filter((p) => p.projection_type === "expected_income")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const expectedExpenses = projections
      .filter((p) => p.projection_type === "expected_expense")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const reserve = Number(reserveFund || 0);
    const available = actualIncome - actualExpenses;
    const projected =
      actualIncome + expectedIncome - actualExpenses - expectedExpenses;

    return {
      actualIncome,
      actualExpenses,
      available,
      expectedIncome,
      expectedExpenses,
      projected,
      tonyasPay: available - reserve,
      projectedTonyasPay: projected - reserve,
    };
  }, [transactions, projections, reserveFund]);

  const categoryTotals = useMemo(() => {
    const rows: Record<string, { income: number; expense: number }> = {};

    for (const t of transactions) {
      if (!rows[t.category]) rows[t.category] = { income: 0, expense: 0 };
      rows[t.category][t.transaction_type] += Number(t.amount || 0);
    }

    return Object.entries(rows).sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  const sessionTotals = useMemo(() => {
    const rows: Record<string, { income: number; expense: number }> = {};

    for (const t of transactions) {
      const code = t.session_code || "General";
      if (!rows[code]) rows[code] = { income: 0, expense: 0 };
      rows[code][t.transaction_type] += Number(t.amount || 0);
    }

    return Object.entries(rows).sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  async function saveReserve() {
    const amount = Number(reserveFund || 0);

    const { error } = await supabase.from("financial_settings").upsert({
      id: 1,
      reserve_fund: amount,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setReserveFund(amount.toFixed(2));
    alert("Reserve fund updated.");
  }

  async function addTransaction() {
    if (!adminId) return;

    const amount = Number(actualAmount);

    if (!amount || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        transaction_date: actualDate,
        transaction_type: actualType,
        category: actualCategory,
        session_code: actualSession || null,
        description: actualDescription.trim() || null,
        amount,
        created_by: adminId,
      })
      .select(
        "id,transaction_date,transaction_type,category,session_code,description,amount"
      )
      .single();

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setTransactions((current) => [data as FinancialTransaction, ...current]);
    setActualDescription("");
    setActualAmount("");
  }

  async function addProjection() {
    if (!adminId) return;

    const amount = Number(projectionAmount);

    if (!amount || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("financial_projections")
      .insert({
        projection_date: projectionDate,
        projection_type: projectionType,
        category: projectionCategory,
        session_code: projectionSession || null,
        description: projectionDescription.trim() || null,
        amount,
        created_by: adminId,
      })
      .select(
        "id,projection_date,projection_type,category,session_code,description,amount"
      )
      .single();

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProjections((current) => [data as FinancialProjection, ...current]);
    setProjectionDescription("");
    setProjectionAmount("");
  }

  async function deleteTransaction(id: string) {
    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setTransactions((current) => current.filter((t) => t.id !== id));
  }

  async function deleteProjection(id: string) {
    const { error } = await supabase
      .from("financial_projections")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setProjections((current) => current.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading Financial Dashboard…</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Financial Dashboard</div>

        <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
          Track actual income, actual expenses, expected income, expected
          expenses, and Tonya&apos;s Pay.
        </div>

        {msg ? (
          <>
            <div className="spacer" />
            <div className="small">{msg}</div>
          </>
        ) : null}

        <div className="spacer" />

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div className="card subtle">
            <div className="small">Actual Money In</div>
            <div className="h2">{money(totals.actualIncome)}</div>
          </div>

          <div className="card subtle">
            <div className="small">Actual Money Out</div>
            <div className="h2">{money(totals.actualExpenses)}</div>
          </div>

          <div className="card subtle">
            <div className="small">Available Balance</div>
            <div className="h2">{money(totals.available)}</div>
          </div>

          <div className="card subtle">
            <div className="small">Tonya&apos;s Pay</div>
            <div className="h2">{money(Math.max(0, totals.tonyasPay))}</div>
          </div>

          <div className="card subtle">
            <div className="small">Expected Money In</div>
            <div className="h2">{money(totals.expectedIncome)}</div>
          </div>

          <div className="card subtle">
            <div className="small">Expected Money Out</div>
            <div className="h2">{money(totals.expectedExpenses)}</div>
          </div>

          <div className="card subtle">
            <div className="small">Projected Balance</div>
            <div className="h2">{money(totals.projected)}</div>
          </div>

          <div className="card subtle">
            <div className="small">Projected Tonya&apos;s Pay</div>
            <div className="h2">
              {money(Math.max(0, totals.projectedTonyasPay))}
            </div>
          </div>
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Reserve Fund</div>
          <div className="small" style={{ opacity: 0.85, marginTop: 6 }}>
            Tonya&apos;s Pay is calculated after this amount is held back.
          </div>

          <div className="spacer" />

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <input
              className="input"
              value={reserveFund}
              onChange={(e) => setReserveFund(e.target.value)}
              inputMode="decimal"
              style={{ flex: "1 1 180px" }}
            />

            <button className="button secondary" style={{ width: "auto" }} onClick={saveReserve}>
              Save Reserve
            </button>
          </div>
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Add Actual Transaction</div>

          <div className="spacer" />

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <select
              className="input"
              value={actualType}
              onChange={(e) => {
                const next = e.target.value as TransactionType;
                setActualType(next);
                setActualCategory(
                  next === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
                );
              }}
              style={{ flex: "1 1 160px" }}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <input
              className="input"
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              style={{ flex: "1 1 160px" }}
            />

            <select
              className="input"
              value={actualCategory}
              onChange={(e) => setActualCategory(e.target.value)}
              style={{ flex: "1 1 180px" }}
            >
              {actualCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={actualSession}
              onChange={(e) => setActualSession(e.target.value)}
              style={{ flex: "1 1 140px" }}
            >
              {SESSION_OPTIONS.map((code) => (
                <option key={code || "general"} value={code}>
                  {code ? `Session ${code}` : "General"}
                </option>
              ))}
            </select>

            <input
              className="input"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              style={{ flex: "1 1 140px" }}
            />
          </div>

          <div className="spacer" />

          <input
            className="input"
            value={actualDescription}
            onChange={(e) => setActualDescription(e.target.value)}
            placeholder="Description / notes"
          />

          <div className="spacer" />

          <button className="button" onClick={addTransaction} disabled={saving}>
            Add Transaction
          </button>
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Add Expected Income / Expense</div>

          <div className="spacer" />

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <select
              className="input"
              value={projectionType}
              onChange={(e) => {
                const next = e.target.value as ProjectionType;
                setProjectionType(next);
                setProjectionCategory(
                  next === "expected_income"
                    ? INCOME_CATEGORIES[0]
                    : EXPENSE_CATEGORIES[0]
                );
              }}
              style={{ flex: "1 1 180px" }}
            >
              <option value="expected_income">Expected Income</option>
              <option value="expected_expense">Expected Expense</option>
            </select>

            <input
              className="input"
              type="date"
              value={projectionDate}
              onChange={(e) => setProjectionDate(e.target.value)}
              style={{ flex: "1 1 160px" }}
            />

            <select
              className="input"
              value={projectionCategory}
              onChange={(e) => setProjectionCategory(e.target.value)}
              style={{ flex: "1 1 180px" }}
            >
              {projectionCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={projectionSession}
              onChange={(e) => setProjectionSession(e.target.value)}
              style={{ flex: "1 1 140px" }}
            >
              {SESSION_OPTIONS.map((code) => (
                <option key={code || "general"} value={code}>
                  {code ? `Session ${code}` : "General"}
                </option>
              ))}
            </select>

            <input
              className="input"
              value={projectionAmount}
              onChange={(e) => setProjectionAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              style={{ flex: "1 1 140px" }}
            />
          </div>

          <div className="spacer" />

          <input
            className="input"
            value={projectionDescription}
            onChange={(e) => setProjectionDescription(e.target.value)}
            placeholder="Description / notes"
          />

          <div className="spacer" />

          <button className="button" onClick={addProjection} disabled={saving}>
            Add Expected Item
          </button>
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Category Breakdown</div>
          <div className="spacer" />

          {categoryTotals.length === 0 ? (
            <div className="small">No actual transactions yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {categoryTotals.map(([category, row]) => (
                <div key={category} className="card">
                  <div style={{ fontWeight: 800 }}>{category}</div>
                  <div className="small">
                    In: {money(row.income)} · Out: {money(row.expense)} · Net:{" "}
                    {money(row.income - row.expense)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Session Breakdown</div>
          <div className="spacer" />

          {sessionTotals.length === 0 ? (
            <div className="small">No session transactions yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sessionTotals.map(([session, row]) => (
                <div key={session} className="card">
                  <div style={{ fontWeight: 800 }}>
                    {session === "General" ? "General" : `Session ${session}`}
                  </div>
                  <div className="small">
                    In: {money(row.income)} · Out: {money(row.expense)} · Net:{" "}
                    {money(row.income - row.expense)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Expected Items</div>
          <div className="spacer" />

          {projections.length === 0 ? (
            <div className="small">No expected income or expenses yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {projections.map((p) => (
                <div key={p.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {p.projection_type === "expected_income"
                          ? "Expected Income"
                          : "Expected Expense"}{" "}
                        · {p.category}
                      </div>
                      <div className="small">
                        {p.projection_date} ·{" "}
                        {p.session_code ? `Session ${p.session_code}` : "General"}
                      </div>
                      {p.description ? (
                        <div className="small" style={{ marginTop: 4 }}>
                          {p.description}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>{money(p.amount)}</div>
                      <button
                        className="button secondary"
                        style={{ width: "auto", marginTop: 8 }}
                        onClick={() => deleteProjection(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="spacer" />

        <div className="card subtle">
          <div style={{ fontWeight: 900 }}>Actual Transactions</div>
          <div className="spacer" />

          {transactions.length === 0 ? (
            <div className="small">No actual transactions yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {transactions.map((t) => (
                <div key={t.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {t.transaction_type === "income" ? "Income" : "Expense"}{" "}
                        · {t.category}
                      </div>
                      <div className="small">
                        {t.transaction_date} ·{" "}
                        {t.session_code ? `Session ${t.session_code}` : "General"}
                      </div>
                      {t.description ? (
                        <div className="small" style={{ marginTop: 4 }}>
                          {t.description}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>{money(t.amount)}</div>
                      <button
                        className="button secondary"
                        style={{ width: "auto", marginTop: 8 }}
                        onClick={() => deleteTransaction(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}