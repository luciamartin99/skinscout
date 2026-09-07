import { useState } from "react";
import { Search } from "lucide-react";
import { PRODUCTS } from "../data/products.js";
import ProductCard from "../components/ProductCard.jsx";

export default function HomePage({ setView, onCompare, compareIds, onView }) {
  const [q, setQ] = useState("");
  const top = [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 3);
  return (
    <div>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px 40px", textAlign: "center" }}>
        <h1 className="ss-serif ss-fade" style={{ fontSize: "clamp(34px,5.5vw,56px)", fontWeight: 600, lineHeight: 1.1, margin: 0 }}>
          Find the MVP of your<br />skincare routine.
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 520, margin: "18px auto 32px" }}>
          Compare skincare products by performance, ingredients and compatibility with your skin.
        </p>
        <div style={{ maxWidth: 480, margin: "0 auto 24px", position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 16, top: 15, color: "var(--ink-soft)" }} />
          <input
            className="ss-input" style={{ paddingLeft: 42 }}
            placeholder="Search cleansers, serums, moisturisers…"
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setView("discover")}
          />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="ss-btn ss-btn-primary" onClick={() => setView("discover")}>Scout products</button>
          <button className="ss-btn ss-btn-outline" onClick={() => setView("compare")}>Compare products</button>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 className="ss-serif" style={{ fontSize: 26, fontWeight: 600 }}>Top performers</h2>
          <span style={{ fontSize: 13.5, color: "var(--forest)", fontWeight: 600, cursor: "pointer" }} onClick={() => setView("discover")}>See all products →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {top.map((p) => (
            <ProductCard key={p.id} product={p} onView={onView} onCompare={onCompare} compareActive={compareIds.includes(p.id)} />
          ))}
        </div>
      </section>

      <section style={{ background: "var(--forest)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 className="ss-serif" style={{ color: "#F6F2EA", fontSize: 26, fontWeight: 600, textAlign: "center", marginBottom: 40 }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 28 }}>
            {[
              { n: "1", t: "Build your skin profile", d: "Tell us your skin type, sensitivity and main concerns." },
              { n: "2", t: "Compare the stats", d: "Put two products head-to-head across seven performance categories." },
              { n: "3", t: "Get your AI scouting report", d: "See which product suits you best, and why, in plain language." },
            ].map((s) => (
              <div key={s.n} style={{ background: "rgba(246,242,234,0.06)", border: "1px solid rgba(246,242,234,0.14)", borderRadius: 16, padding: 26 }}>
                <div className="ss-serif" style={{ color: "var(--blush)", fontSize: 28, fontWeight: 600, marginBottom: 10 }}>{s.n}</div>
                <div style={{ color: "#F6F2EA", fontWeight: 700, fontSize: 16.5, marginBottom: 6 }}>{s.t}</div>
                <div style={{ color: "rgba(246,242,234,0.7)", fontSize: 14, lineHeight: 1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
