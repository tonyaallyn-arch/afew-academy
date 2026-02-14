"use client";

import Nav from "@/components/Nav";
import { useMemo, useState } from "react";

type DocLink = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  href: string;
};

export default function DocumentsPage() {
  // For now: one file in /public
  const docs: DocLink[] = [
    {
      id: "doc-pdf",
      title: "AFEW ByLaws",
      description: "Official PDF posted for members.",
      category: "All",
      href: "/doc.pdf",
    },
  ];

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    docs.forEach((d) => d.category && set.add(d.category));
    return Array.from(set);
  }, [docs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return docs.filter((d) => {
      if (cat !== "All" && (d.category ?? "All") !== cat) return false;
      if (!needle) return true;
      const hay = `${d.title} ${d.description ?? ""} ${d.category ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [docs, q, cat]);

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Society Documents</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Handbooks, guides, reference PDFs, and any official materials posted for members.
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Search documents…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 260px" }}
          />

          <select
            className="input"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            style={{ flex: "0 0 220px" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            className="button"
            style={{
              width: "auto",
              background: "var(--haint)",
              color: "#071018",
              border: "1px solid rgba(121,195,228,.55)",
            }}
            onClick={() => {
              setQ("");
              setCat("All");
            }}
          >
            Reset
          </button>
        </div>

        <div className="spacer" />

        {filtered.length === 0 ? (
          <div className="card subtle">
            <div className="small" style={{ opacity: 0.85 }}>
              No documents found.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((d) => (
              <div key={d.id} className="card subtle">
                <div style={{ fontWeight: 900 }}>{d.title}</div>
                {d.description ? (
                  <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
                    {d.description}
                  </div>
                ) : null}

                <div className="spacer" />

                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <a
                    className="button"
                    href={d.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: "auto",
                      background: "var(--haint)",
                      color: "#071018",
                      border: "1px solid rgba(121,195,228,.55)",
                      textDecoration: "none",
                    }}
                  >
                    Open PDF
                  </a>

                  <a
                    className="button secondary"
                    href={d.href}
                    download
                    style={{ width: "auto", textDecoration: "none" }}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="spacer" />

        <a className="button secondary" style={{ width: "auto" }} href="/">
          Back to Home
        </a>
      </div>
    </main>
  );
}
