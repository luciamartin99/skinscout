export default function ScorePill({ score, size = "md" }) {
  const big = size === "lg";
  const color = score >= 85 ? "#5A1F35" : score >= 70 ? "#8C3A54" : "#A85A70";
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
