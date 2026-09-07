import ScorePill from "./ScorePill.jsx";
import StatBar from "./StatBar.jsx";
import PackagingArt from "./PackagingArt.jsx";

export default function ProductCard({ product, onView, onCompare, compareActive }) {
  const topStats = Object.entries(product.stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="ss-card ss-fade" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 64, height: 64, flexShrink: 0 }}>
          <PackagingArt colors={product.packColors} category={product.category} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", letterSpacing: 0.2 }}>{product.brand}</div>
          <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{product.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{product.category} · €{product.price}</div>
        </div>
        <ScorePill score={product.rating} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {product.tags.slice(0, 3).map((t) => <span key={t} className="ss-chip">{t}</span>)}
      </div>
      <div>
        {topStats.map(([k, v]) => <StatBar key={k} statKey={k} value={v} />)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button className="ss-btn ss-btn-primary" style={{ flex: 1, fontSize: 13.5, padding: "10px 14px" }} onClick={() => onView(product.id)}>View profile</button>
        <button
          className="ss-btn"
          style={{ flex: 1, fontSize: 13.5, padding: "10px 14px", background: compareActive ? "var(--burgundy)" : "var(--beige)", color: compareActive ? "#fff" : "var(--ink)" }}
          onClick={() => onCompare(product.id)}
        >
          {compareActive ? "Added ✓" : "Add to comparison"}
        </button>
      </div>
    </div>
  );
}
