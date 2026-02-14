"use client";

import Nav from "@/components/Nav";
import { joanMock } from "@/mock/joan";
import { useMemo, useState } from "react";

export default function JoanBriefingPage() {
  const [state] = useState(joanMock);

  const allowed = useMemo(() => {
    if (state.me.isAdmin) return true;
    if (!state.winner) return false;
    return state.winner.memberId === state.me.memberId;
  }, [state.me.isAdmin, state.me.memberId, state.winner]);

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      {!allowed ? (
        <div className="card">
          <div className="h1">Sealed</div>
          <div className="small">
            These instructions are reserved for the Chosen One.
            <br />
            If you believe this is in error, contact an Administrator.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="h1">Joan of Arc Briefing</div>
          <div className="small">
            This page contains instructions for the parade and ceremonial expectations.
          </div>

          <div className="spacer" />

          <div className="card" style={{ background: "transparent" }}>
            <div className="h2">Status</div>
            <div className="small">
              Winner: <strong>{state.winner ? state.winner.memberName : "Not yet selected"}</strong>
              <br />
              Year: <strong>{state.year}</strong>
            </div>
          </div>

          <div className="spacer" />

          <div className="card" style={{ background: "transparent" }}>
            <div className="h2">Instructions</div>
            <div className="small" style={{ whiteSpace: "pre-wrap" }}>
              {state.briefingText ?? "No briefing has been published yet."}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
