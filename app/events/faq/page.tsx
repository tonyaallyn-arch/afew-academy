"use client";

import Nav from "@/components/Nav";
import { useMemo, useState } from "react";

type FAQItem = { q: string; a: string };

export default function EventFAQPage() {
  const faq: FAQItem[] = useMemo(
    () => [
      {
        q: "When can I arrive?",
        a: `Anytime on the day of arrival. If you're early you'll simply have more time to relax and enjoy the space.

Our first official sit-down will be at 5:00pm. First meal will be served at 7:00pm.`,
      },
      {
        q: "When do I have to leave by?",
        a: `Anytime on the final day. Our last official sit-down will be 10:00am.`,
      },
      {
        q: "What if I have special requests or needs I didn't mention when signing up?",
        a: `This definitely happened last year—if you do not let me know of special food issues, there is no way anyone can account for it.`,
      },
      {
        q: "Do I have to do every planned event?",
        a: `No! Each morning I'll give you a rundown of what to expect for the day. If you decide a class isn't for you and you'd rather have an afternoon in the French Quarter, that is totally cool.

Just let Tonya, Lizzie, or Angela know where you're going and be respectful of the people enjoying the planned activity.`,
      },
      {
        q: "Are we allowed to take photos?",
        a: `Sort of. I do plan for a Member Photo during our special dinner out.

Other than that, please try to avoid photos involving other members or photos that reveal our location—unless otherwise approved.

We are a social society, and we tend to like to keep things a little more discreet.`,
      },
      {
        q: "What if me and another member do not get along?",
        a: `I truthfully don't see this happening, but the world is a crazy place! I purposefully chose members who had things in common and similar world views.

However, things can happen. Simply come to Tonya, Lizzie, or Kiki to share what is happening. We will do our best to remedy the situation quietly without tainting the event.`,
      },
      {
        q: "Will I have to share a bathroom with 12 other people?",
        a: `No! Everyone will have an assigned bathroom. You won't have to share with more than 2 other people if everyone respects their assigned bathroom.

I know “assigning a bathroom” sounds nuts—but trust me, sharing with 1 or 2 vs 13… you'll be thankful for it.`,
      },
      {
        q: "So what's the food situation?",
        a: `We will make sure each room has some water and snacks. Also, Continental Breakfast, Light Lunch, and all but one Dinner is provided!

The menu was planned around the intake forms. If you find you don't like something being served, you are welcome to order food or go out for food.

If you hit it off with another member and want to go grab a nice little lunch or dinner, no one will mind! The city has incredible food to try.`,
      },
      {
        q: "Will we be doing a ritual together?",
        a: `Yes! We will have a ritual planning class—this will give us the chance to plan our end-of-week ritual, along with grabbing supplies at the magical shops in the Quarter if need be.`,
      },
      {
        q: "If I run into a witch in the Quarter or a magical shop, can I tell them that I'm here with this group?",
        a: `Ideally, no. This is just to keep safety and privacy at an all-time high. Not all members may be comfortable with being outed in that way.

Also, not every witch you meet is going to be wonderful and kind. Witches, just like people, are complex. While we are coming together with the highest intention of kinship and kindness, not everyone we meet will be coming from that same place.`,
      },
      {
        q: "How do I get from the airport to the venue?",
        a: `The NOLA airport is located in the suburbs just outside the city. I recommend getting an Uber or airport taxi.`,
      },
    ],
    []
  );

  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Event FAQ</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Official guidance for the Annual Rite.
        </div>

        <div className="spacer" />

        <div style={{ display: "grid", gap: 12 }}>
          {faq.map((item, idx) => {
            const isOpen = open === idx;

            return (
              <div
                key={idx}
                className="card"
                style={{
                  background: "color-mix(in srgb, var(--bg) 92%, black)",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <button
                  className="row"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    padding: 0,
                    cursor: "pointer",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                  aria-expanded={isOpen}
                >
                  <div style={{ fontWeight: 900, textAlign: "left" }}>{item.q}</div>

                  <div
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(121,195,228,.35)",
                      background: "rgba(121,195,228,.10)",
                      color: "var(--haint)",
                      flex: "0 0 auto",
                      transition: "transform .25s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </div>
                </button>

                {/* Animated expand/collapse */}
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: isOpen ? 500 : 0,
                    opacity: isOpen ? 1 : 0,
                    transition: "max-height .35s ease, opacity .25s ease",
                  }}
                >
                  <div className="small" style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.9 }}>
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="spacer" />

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <a className="button" style={{ width: "auto" }} href="/events">
            Back to Events
          </a>
          <a className="button" style={{ width: "auto" }} href="/events/packing-list">
            Packing List
          </a>
        </div>
      </div>
    </main>
  );
}

