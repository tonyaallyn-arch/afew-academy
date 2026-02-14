"use client";

import Nav from "@/components/Nav";
import { joanMock } from "@/mock/joan";
import { useMemo, useState } from "react";

export default function NominateJoanPage() {
  const [state, setState] = useState(joanMock);

  const myNom = useMemo(
    () => state.nominations.find((n) => n.memberId === state.me.memberId),
    [state.nominations, state.me.memberId]
  );

  function nominate() {
    if (!state.nominationOpen) return;

    const next = {
      ...state,
      nominations: [
        ...state.nominations.filter((n) => n.memberId !== state.me.memberId),
        {
          memberId: state.me.memberId,
          memberName: state.me.memberName,
          blurb: "I accept the responsibilities of the mantle.",
          createdAt: new Date().toISOString(),
          status: "pending" as const,
        },
      ],
    };
    setState(next);
  }

  function withdraw() {
    const next = {
      ...state,
      nominations: state.nominations.map((n) =>
        n.memberId === state.me.memberId ? { ...n, status: "withdrawn" as const } : n
      ),
    };
    setState(next);
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Nominate Yourself</div>
        <div className="small">{state.description}</div>

        <div className="spacer" />

        <div className="card" style={{ background: "transparent" }}>
          <div className="h2">Nomination Window</div>
          <div className="small">
            Status: <strong>{state.nominationOpen ? "Open" : "Closed"}</strong>
            <br />
            Closes: <strong>{state.closesAt ?? "—"}</strong>
          </div>
        </div>

        <div className="spacer" />

        <div className="card" style={{ background: "transparent" }}>
          <div className="h2">Your Nomination</div>

          {!myNom || myNom.status === "withdrawn" ? (
            <>
              <div className="small">You are not currently nominated.</div>
              <div className="spacer" />
              <button className="button" onClick={nominate} disabled={!state.nominationOpen}>
                Nominate Myself
              </button>
            </>
          ) : (
            <>
              <div className="small">
                Status: <strong>{myNom.status}</strong>
                <br />
                Submitted: <strong>{new Date(myNom.createdAt).toLocaleString()}</strong>
              </div>
              <div className="spacer" />
              <button className="button secondary" onClick={withdraw}>
                Withdraw Nomination
              </button>
            </>
          )}
        </div>

        <div className="spacer" />

        <div className="card" style={{ background: "transparent" }}>
          <div className="h2">Current Nominations</div>
          <div style={{ display: "grid", gap: 10 }}>
            {state.nominations
              .filter((n) => n.status !== "withdrawn")
              .map((n) => (
                <div key={n.memberId} className="card" style={{ background: "color-mix(in srgb, var(--bg) 92%, black)" }}>
                  <div style={{ fontWeight: 800 }}>{n.memberName}</div>
                  <div className="small">
                    Status: <strong>{n.status}</strong>
                    {n.blurb ? <><br />{n.blurb}</> : null}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
