import { STAT_META } from "../data/products.js";

export default function StatBar({ statKey, value }) {
  const meta = STAT_META[statKey];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
        <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{meta.label}</span>
        <span className="ss-tab" style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div className="ss-bar-track">
        <div className="ss-bar-fill" style={{ width: `${value}%`, background: meta.color }} />
      </div>
    </div>
  );
}
