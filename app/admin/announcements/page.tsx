"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAnnouncementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [publishAt, setPublishAt] = useState("");
  const [published, setPublished] = useState(true);

  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data: m, error } = await supabase
        .from("members")
        .select("id,role,status")
        .eq("id", user.id)
        .single();

      if (!alive) return;

      if (error || !m || m.status === "disabled") {
        router.replace("/not-verified");
        return;
      }

      if (m.role !== "admin") {
        router.replace("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  async function submit() {
    setMsg(null);

    if (!title.trim() || !body.trim()) {
      setMsg("Title and content are required.");
      return;
    }

    const publish_at = publishNow
      ? new Date().toISOString()
      : publishAt
      ? new Date(publishAt).toISOString()
      : new Date().toISOString();

    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      content: body.trim(),      // REQUIRED by your schema
      body: body.trim(),         // keep both synced
      is_published: published,
      publish_at,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      setMsg(error.message);
      return;
    }

    setTitle("");
    setBody("");
    setPublishNow(true);
    setPublishAt("");
    setPublished(true);

    setMsg("Announcement sealed.");
  }

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <Nav />
        <div className="card">Loading…</div>
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Post Announcement</div>
        <div className="small">
          Visible to members when published and past its publish time.
        </div>

        <div className="spacer" />

        <div className="small" style={{ marginBottom: 6 }}>
          Title
        </div>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="spacer" />

        <div className="small" style={{ marginBottom: 6 }}>
          Content
        </div>
        <textarea
          className="input"
          style={{ minHeight: 160, resize: "vertical" }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className="spacer" />

        <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>

          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publish now
          </label>
        </div>

        {!publishNow ? (
          <>
            <div className="spacer" />
            <div className="small" style={{ marginBottom: 6 }}>
              Schedule publish time
            </div>
            <input
              className="input"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </>
        ) : null}

        <div className="spacer" />

        {msg ? (
          <div className="small" style={{ opacity: 0.9 }}>
            {msg}
          </div>
        ) : null}

        <div className="spacer" />

        <button className="button" onClick={submit}>
          Seal Announcement
        </button>

        <div className="spacer" />

        <a className="button secondary" style={{ width: "auto" }} href="/">
          Back to Home
        </a>
      </div>
    </main>
  );
}
