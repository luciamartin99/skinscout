export default function ScorePill({ score, size = "md" }) {
  const big = size === "lg";
  const color = score >= 85 ? "#1E3A2E" : score >= 70 ? "#6E2A3B" : "#8C7A4E";
  return (
    <div
      className="ss-tab"
      style={{
        display: "inline-flex", alignItems: "baseline", gap: 4,
        background: "var(--sage-lt)", borderRadius: 14,
        padding: big ? "10px 18px" : "5px 10px",
      }}
    >
      <span style={{ fontWeight: 800, fontSize: big ? 34 : 16, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: big ? 14 : 10, color: "var(--ink-soft)", fontWeight: 600 }}>/100</span>
    </div>
  );
}
