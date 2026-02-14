"use client";

export default function Nav() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Annual Event" },
    { href: "/scrapbook", label: "Scrapbook" },
    { href: "/culture", label: "Culture" },
    { href: "/documents", label: "Official Documents" },
  ];

  return (
    <nav className="row" style={{ gap: 10, flexWrap: "wrap" }}>
      {links.map((l) => (
        <a key={l.href} className="button secondary" style={{ width: "auto" }} href={l.href}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}
