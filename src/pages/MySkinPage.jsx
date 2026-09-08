const FIELD_LABELS = {
  skinType: "Skin type",
  sensitivity: "Sensitivity",
  concerns: "Main concerns",
  exclusions: "Preferences",
  budget: "Budget",
  routineLength: "Routine style",
};

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None selected";
  return value || "Not answered";
}

// Reads the SAME shared profile as the "Build My Routine" quiz — see
// App.jsx's setSkinProfile / src/lib/skinProfile.js. There is no separate
// editing form here: "Edit profile" reopens the quiz itself, pre-filled
// with these same values, so there is only ever one place that writes
// this data (QuizPage) and one shape everyone reads.
export default function MySkinPage({ skinProfile, setView }) {
  const hasProfile = Boolean(skinProfile?.skinType);

  if (!hasProfile) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px 80px", textAlign: "center" }}>
        <h1 className="ss-serif" style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>My Skin</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24, lineHeight: 1.6 }}>
          You haven't taken the skin quiz yet. Build your profile to personalise recommendations.
        </p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz")}>Build My Routine</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "56px 24px 80px" }}>
      <span className="ss-eyebrow">Your SkinScout profile</span>
      <h1 className="ss-serif" style={{ fontSize: "clamp(28px,4vw,34px)", fontWeight: 600, margin: "10px 0 36px" }}>My Skin</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 32 }}>
        {Object.keys(FIELD_LABELS).map((key) => (
          <div key={key} className="ss-card ss-fade" style={{ padding: "20px 22px" }}>
            <div className="ss-eyebrow" style={{ marginBottom: 8 }}>{FIELD_LABELS[key]}</div>
            <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{formatValue(skinProfile[key])}</div>
          </div>
        ))}
      </div>

      <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz")}>Edit profile</button>
    </div>
  );
}
