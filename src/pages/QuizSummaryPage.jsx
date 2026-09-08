import { useState } from "react";
import { Sparkles } from "lucide-react";
import { saveRoutine } from "../lib/routineStorage.js";

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

// Reads the profile from the shared App-level state (a mirror of
// localStorage's "skinscout_profile") rather than loading it independently —
// this is the ONE source of truth; see App.jsx's setSkinProfile.
export default function QuizSummaryPage({ setView, skinProfile, clearSkinProfile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateRoutine = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: skinProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      saveRoutine(data);
      setView("routine");
    } catch (err) {
      setError(err.message || "Unable to generate your routine right now.");
    } finally {
      setLoading(false);
    }
  };

  if (!skinProfile?.skinType) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px 80px", textAlign: "center" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>No skin profile saved yet.</p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz")}>Take the quiz</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>
      <span className="ss-eyebrow">Quiz complete</span>
      <h1 className="ss-serif" style={{ fontSize: "clamp(28px,4vw,34px)", fontWeight: 600, margin: "10px 0 8px" }}>Your skin profile</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 32 }}>Saved on this device — you can retake the quiz any time.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 32 }}>
        {Object.keys(FIELD_LABELS).map((key) => (
          <div key={key} className="ss-card ss-fade" style={{ padding: "20px 22px" }}>
            <div className="ss-eyebrow" style={{ marginBottom: 8 }}>{FIELD_LABELS[key]}</div>
            <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{formatValue(skinProfile[key])}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ marginBottom: 14, fontSize: 13, color: "var(--burgundy)" }}>{error}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          className="ss-btn ss-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px" }}
          onClick={generateRoutine}
          disabled={loading}
        >
          <Sparkles size={16} /> {loading ? "Building your routine…" : "Generate my routine"}
        </button>
        <button
          className="ss-btn ss-btn-outline"
          onClick={() => {
            clearSkinProfile();
            setView("quiz");
          }}
        >
          Retake quiz
        </button>
        <button className="ss-btn ss-btn-outline" onClick={() => setView("discover")}>Browse products</button>
      </div>
    </div>
  );
}
