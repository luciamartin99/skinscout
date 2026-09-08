import { useState } from "react";
import { X, Menu } from "lucide-react";
import SkinScoutLogo from "./SkinScoutLogo.jsx";

export default function NavBar({ view, setView, compareCount }) {
  const [open, setOpen] = useState(false);
  const items = [
    { key: "discover", label: "Discover" },
    { key: "compare", label: "Compare" },
    { key: "myskin", label: "My Skin" },
    { key: "ask", label: "Ask SkinScout" },
    { key: "about", label: "About Us" },
  ];
  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(253,246,247,0.92)", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(8px)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
          <SkinScoutLogo size={34} />
          <span className="ss-serif" style={{ fontSize: 21, fontWeight: 600 }}>SkinScout</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }} className="ss-desktop-nav">
          {items.map((it) => (
            <span key={it.key} tabIndex={0} role="button" className={`ss-navlink ${view === it.key ? "active" : ""}`} onClick={() => setView(it.key)} onKeyDown={(e) => e.key === "Enter" && setView(it.key)}>{it.label}</span>
          ))}
          {compareCount > 0 && (
            <span
              className="ss-chip"
              style={{ background: "rgba(90,31,53,0.08)", color: "var(--burgundy)", borderColor: "rgba(90,31,53,0.28)" }}
              onClick={() => setView("compare")}
            >
              Comparison {compareCount}/2
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }} className="ss-mobile-nav">
          <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="ss-mobile-nav" style={{ padding: "0 24px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((it) => (
            <span key={it.key} className={`ss-navlink ${view === it.key ? "active" : ""}`} onClick={() => { setView(it.key); setOpen(false); }}>{it.label}</span>
          ))}
          {compareCount > 0 && (
            <span
              className="ss-chip"
              style={{ alignSelf: "flex-start", background: "rgba(90,31,53,0.08)", color: "var(--burgundy)", borderColor: "rgba(90,31,53,0.28)" }}
              onClick={() => { setView("compare"); setOpen(false); }}
            >
              Comparison {compareCount}/2
            </span>
          )}
        </div>
      )}
      <style>{`
        @media (min-width: 860px){ .ss-mobile-nav{ display:none !important; } .ss-desktop-nav{ display:flex !important; } }
        @media (max-width: 859px){ .ss-desktop-nav{ display:none !important; } .ss-mobile-nav{ display:flex !important; } }
      `}</style>
    </div>
  );
}
