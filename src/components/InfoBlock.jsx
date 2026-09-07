export default function InfoBlock({ title, items, icon }) {
  return (
    <div className="ss-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, color: "var(--forest)" }}>
        {icon}<span style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-soft)", fontSize: 13.8, lineHeight: 1.6 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
