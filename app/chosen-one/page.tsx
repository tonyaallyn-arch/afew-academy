"use client";

import Nav from "@/components/Nav";
import { joanMock } from "@/mock/joan";
import { useMemo, useState } from "react";

export default function ChosenOnePage() {
  const [state, setState] = useState(joanMock);

  const approvedCandidates = useMemo(
    () => state.nominations.filter((n) => n.status === "approved"),
    [state.nominations]
  );

  const myVote = useMemo(
    () => state.votes.find((v) => v.voterMemberId === state.me.memberId),
    [state.votes, state.me.memberId]
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of state.votes) map.set(v.candidateMemberId, (map.get(v.candidateMemberId) ?? 0) + 1);
    return map;
  }, [state.votes]);

  function castVote(candidateId: string) {
    if (!state.votingOpen) return;

    const filtered = state.votes.filter((v) => v.voterMemberId !== state.me.memberId);
    setState({
      ...state,
      votes: [...filtered, { voterMemberId: state.me.memberId, candidateMemberId: candidateId, createdAt: new Date().toISOString() }],
    });
  }

  function toggleVoting() {
    if (!state.me.isAdmin) return;
    setState({ ...state, votingOpen: !state.votingOpen });
  }

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">The Chosen One</div>
        <div className="small">{state.description}</div>

        <div className="spacer" />

        <div className="card" style={{ background: "transparent" }}>
          <div className="h2">Voting</div>
          <div className="small">
            Status: <strong>{state.votingOpen ? "Open" : "Closed"}</strong>
            <br />
            Closes: <strong>{state.closesAt ?? "—"}</strong>
            <br />
            Your vote: <strong>{myVote ? approvedCandidates.find(c => c.memberId === myVote.candidateMemberId)?.memberName ?? "Recorded" : "—"}</strong>
          </div>

          {state.me.isAdmin ? (
            <>
              <div className="spacer" />
              <button className="button secondary" onClick={toggleVoting}>
                {state.votingOpen ? "Close Voting" : "Open Voting"}
              </button>
            </>
          ) : null}
        </div>

        <div className="spacer" />

        <div className="card" style={{ background: "transparent" }}>
          <div className="h2">Candidates</div>

          {approvedCandidates.length === 0 ? (
            <div className="small">No candidates are approved yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {approvedCandidates.map((c) => {
                const isMine = myVote?.candidateMemberId === c.memberId;
                return (
                  <div key={c.memberId} className="card" style={{ background: "color-mix(in srgb, var(--bg) 92%, black)" }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{c.memberName}</div>
                        <div className="small">{c.blurb ?? ""}</div>
                      </div>
                      <div className="small" style={{ textAlign: "right" }}>
                        Votes: <strong>{counts.get(c.memberId) ?? 0}</strong>
                      </div>
                    </div>

                    <div className="spacer" />
                    <button
                      className={isMine ? "button secondary" : "button"}
                      onClick={() => castVote(c.memberId)}
                      disabled={!state.votingOpen}
                    >
                      {isMine ? "Your vote (change)" : "Vote"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
