import { useState } from "react";
import { Award, X, Menu } from "lucide-react";

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
    <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(246,242,234,0.92)", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(6px)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={18} color="#F6F2EA" />
          </div>
          <span className="ss-serif" style={{ fontSize: 21, fontWeight: 600 }}>SkinScout</span>
        </div>
        <div className="ss-scroll" style={{ display: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 26 }} className="ss-desktop-nav">
          {items.map((it) => (
            <span key={it.key} className={`ss-navlink ${view === it.key ? "active" : ""}`} onClick={() => setView(it.key)}>{it.label}</span>
          ))}
          {compareCount > 0 && (
            <span className="ss-chip" style={{ background: "var(--burgundy)", color: "#fff", borderColor: "var(--burgundy)" }} onClick={() => setView("compare")}>
              Comparison ({compareCount}/2)
            </span>
          )}
        </div>
        <button className="ss-btn ss-btn-primary" style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10 }} className="ss-mobile-nav">
          <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="ss-mobile-nav" style={{ padding: "0 24px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => (
            <span key={it.key} className={`ss-navlink ${view === it.key ? "active" : ""}`} onClick={() => { setView(it.key); setOpen(false); }}>{it.label}</span>
          ))}
        </div>
      )}
      <style>{`
        @media (min-width: 860px){ .ss-mobile-nav{ display:none !important; } .ss-desktop-nav{ display:flex !important; } }
        @media (max-width: 859px){ .ss-desktop-nav{ display:none !important; } .ss-mobile-nav{ display:flex !important; } }
      `}</style>
    </div>
  );
}
