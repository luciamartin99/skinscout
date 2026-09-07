import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { loadSkinProfile, clearSkinProfile } from "../lib/skinProfile.js";

const FIELD_LABELS = {
  skinType: "Skin type",
  concerns: "Main concerns",
  sensitivity: "Sensitivity",
  exclusions: "Avoiding",
  budget: "Budget",
  routineLength: "Routine length",
};

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None selected";
  return value || "Not answered";
}

export default function QuizSummaryPage({ setView }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    setProfile(loadSkinProfile());
  }, []);

  if (!profile) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>No skin profile saved yet.</p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz")}>Take the quiz</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Your skin profile</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 26 }}>Saved on this device — you can retake the quiz any time.</p>

      <div className="ss-card ss-fade" style={{ padding: 26, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color="#F6F2EA" />
          </div>
          <span className="ss-serif" style={{ fontSize: 18, fontWeight: 600 }}>Quiz results</span>
        </div>
        {Object.keys(FIELD_LABELS).map((key) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>{FIELD_LABELS[key]}</span>
            <span style={{ fontSize: 14, textAlign: "right" }}>{formatValue(profile[key])}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20, fontStyle: "italic" }}>
        Routine generation from this profile is coming soon.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="ss-btn ss-btn-outline"
          onClick={() => {
            clearSkinProfile();
            setView("quiz");
          }}
        >
          Retake quiz
        </button>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("discover")}>Browse products</button>
      </div>
    </div>
  );
}
