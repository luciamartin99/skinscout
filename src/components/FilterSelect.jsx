export default function FilterSelect({ label, value, setValue, options, inline }) {
  return (
    <div style={inline ? { display: "flex", alignItems: "center", gap: 8 } : {}}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: inline ? 0 : 6 }}>{label}</div>
      <select className="ss-input" style={inline ? { width: "auto" } : {}} value={value} onChange={(e) => setValue(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
