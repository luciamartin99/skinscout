import { ShieldCheck } from "lucide-react";

const FIELD_LABELS = {
  skinType: "Skin type",
  sensitivity: "Sensitivity",
  concerns: "Main concerns",
  exclusions: "Avoid / preferences",
  budget: "Budget",
  routineLength: "Routine length",
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
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <h1 className="ss-serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 10 }}>My Skin Profile</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>
          You haven't taken the skin quiz yet. Build your profile to personalise recommendations.
        </p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz")}>Build My Routine</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>My Skin Profile</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>From your "Build My Routine" quiz — saved on this device.</p>

      <div className="ss-card ss-fade" style={{ padding: 26, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color="#F6F2EA" />
          </div>
          <span className="ss-serif" style={{ fontSize: 18, fontWeight: 600 }}>Skin Profile Card</span>
        </div>
        {Object.keys(FIELD_LABELS).map((key) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>{FIELD_LABELS[key]}</span>
            <span style={{ fontSize: 14, textAlign: "right" }}>{formatValue(skinProfile[key])}</span>
          </div>
        ))}
      </div>

      <button className="ss-btn ss-btn-outline" onClick={() => setView("quiz")}>Edit profile</button>
    </div>
  );
}
