"use client";

import Nav from "@/components/Nav";

function Item({ children }: { children: any }) {
  return (
    <li
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.03)",
      }}
      className="small"
    >
      {children}
    </li>
  );
}

export default function PackingListPage() {
  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Packing Lists</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Packing List Help! Sometimes we all need a little reminder.
        </div>

        <div className="spacer" />

        {/* Hero card with image */}
        <div
          className="card"
          style={{
            background: "color-mix(in srgb, var(--bg) 92%, black)",
            overflow: "hidden",
            padding: 0,
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src="/packing.jpg"
              alt="Event"
              style={{
                width: "100%",
                height: 220,
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* subtle watermark seal */}
            <img
              src="/emblem.png"
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 12,
                bottom: 10,
                width: 70,
                height: 70,
                opacity: 0.16,
                filter: "drop-shadow(0 6px 10px rgba(0,0,0,.55))",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, letterSpacing: "0.3px" }}>
              Bring what makes you feel powerful.
            </div>
            <div className="small" style={{ opacity: 0.82, marginTop: 6 }}>
              This list is intentionally permissive. The goal is comfort, confidence, and a little drama.
            </div>
          </div>
        </div>

        <div className="spacer" />

        {/* Clothing */}
        <div className="card subtle">
          <div className="h2">Clothing</div>
          <div className="spacer" />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <Item>
              <strong>What kind of clothes?</strong> Other than your Witch’s Best for Witch's Night Out, it’s whatever you want to wear or feel
              powerful in — kimonos, leather, lace… this is your time to wear what you’re excited to be in.
            </Item>
            <Item>Shoes for walking (We are active! We love to go do things.)</Item>
            <Item>
              <strong>Witch’s Best Outfit!</strong> We will have an evening out!
              <strong> Black is highly recommended.</strong>
            </Item>
            <Item>Cozy PJ set for movie night</Item>
          </ul>
        </div>

        <div className="spacer" />

        {/* Health + Toiletries */}
        <div className="card subtle">
          <div className="h2">Health &amp; Toiletries</div>
          <div className="spacer" />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <Item>Medications</Item>
            <Item>
              Toiletries (shampoo, conditioner, menstrual products will be provided)
            </Item>
            <Item>
              Earplugs, snore strips, etc. Any other little items that tend to make life more comfortable when sharing
              space.
            </Item>
          </ul>
        </div>

        <div className="spacer" />

        {/* Magic + Extras */}
        <div className="card subtle">
          <div className="h2">Magic &amp; Extras</div>
          <div className="spacer" />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <Item>
              Your go-to divination tool (trust me — you’ll end up wanting to do a reading)
            </Item>
            <Item>Tarot deck if you have one</Item>
            <Item>Witch swap items (bring old magical items you no longer want!)</Item>
            <Item>
              Bring a book (we will have some downtime to relax)
            </Item>
            <Item>
              Bring your grimoire! (We will have craft items available to work on our magical books.)
            </Item>
            <Item>
              Your favorite tea! While we’ll have Sip a Spell teas available, I want to make sure you have your
              favorite.
            </Item>
          </ul>
        </div>

        <div className="spacer" />

        {/* Tech */}
        <div className="card subtle">
          <div className="h2">Tech</div>
          <div className="spacer" />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <Item>
              Chargers / cords / tech (we ask you not to bring a laptop/tablet into common spaces)
            </Item>
          </ul>
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <a className="button" style={{ width: "auto" }} href="/events">
            Back to Events
          </a>
          <a className="button" style={{ width: "auto" }} href="/events/faq">
            Go to FAQ
          </a>
        </div>
      </div>
    </main>
  );
}
