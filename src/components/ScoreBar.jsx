// Generic labeled progress bar, reusing the same .ss-bar-track/.ss-bar-fill
// CSS as the mock-catalog StatBar.jsx (src/styles/fonts.js) — visually
// identical, but with no dependency on the fictional STAT_META data, so it
// works for any deterministic 0-100 score (see src/lib/productScoring.js).
// A null score renders "Limited data" instead of a bar — never a fake number.
export default function ScoreBar({ label, score, color = "var(--forest)" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
        <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{label}</span>
        {typeof score === "number" ? (
          <span className="ss-tab" style={{ fontWeight: 700 }}>{score}</span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>Limited data</span>
        )}
      </div>
      <div className="ss-bar-track">
        <div className="ss-bar-fill" style={{ width: typeof score === "number" ? `${score}%` : "0%", background: color }} />
      </div>
    </div>
  );
}
