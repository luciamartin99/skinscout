import { useState } from "react";
import { AlertTriangle, Sun, Moon, RefreshCw } from "lucide-react";
import { loadRoutine, saveRoutine } from "../lib/routineStorage.js";
import { checkRoutineCompatibility } from "../lib/compatibility.js";

function findCandidate(routine, category, productId) {
  return (routine.candidateDetails?.[category] || []).find((c) => c.id === productId) || null;
}

// Recomputes warnings from scratch based on the routine's CURRENT products
// (after any swaps) — "run compatibility check again", never a full
// regeneration via Claude.
function recomputeWarnings(routine) {
  const allSteps = [...(routine.morning || []), ...(routine.evening || [])];
  const products = allSteps
    .map((step) => findCandidate(routine, step.category, step.productId))
    .filter(Boolean);
  const compatibility = products.length > 1 ? checkRoutineCompatibility(products) : { warnings: [] };
  return compatibility.warnings.map((w) => w.reason);
}

function RoutineStep({ step, sectionKey, index, routine, onSwap }) {
  const [showAlts, setShowAlts] = useState(false);
  const candidate = findCandidate(routine, step.category, step.productId);
  const alternatives = (routine.candidateDetails?.[step.category] || [])
    .filter((c) => c.id !== step.productId)
    .slice(0, 3);

  return (
    <div className="ss-card ss-fade" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {candidate?.image_url ? (
            <img src={candidate.image_url} alt={candidate.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>No image</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Step {step.step} · {step.category}
          </div>
          <div className="ss-serif" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.25 }}>
            {candidate?.brand ? `${candidate.brand} — ` : ""}{candidate?.name || "(product unavailable)"}
          </div>
          {typeof candidate?.score === "number" && (
            <div style={{ fontSize: 12.5, color: "var(--forest)", fontWeight: 700, margin: "3px 0" }}>Match score: {candidate.score}/100</div>
          )}
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "4px 0 0", lineHeight: 1.5 }}>{step.reason}</p>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          className="ss-btn ss-btn-outline"
          style={{ fontSize: 12.5, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => setShowAlts((s) => !s)}
        >
          <RefreshCw size={13} /> Swap
        </button>
      </div>

      {showAlts && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          {alternatives.length === 0 && <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>No alternatives available for this category.</p>}
          {alternatives.map((alt) => (
            <button
              key={alt.id}
              className="ss-btn ss-btn-outline"
              style={{ textAlign: "left", fontSize: 13, padding: "8px 12px", display: "flex", justifyContent: "space-between", gap: 10 }}
              onClick={() => {
                onSwap(sectionKey, index, alt);
                setShowAlts(false);
              }}
            >
              <span>{alt.brand ? `${alt.brand} — ` : ""}{alt.name}</span>
              <span style={{ color: "var(--ink-soft)" }}>{alt.score}/100</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoutineSection({ title, icon, sectionKey, steps, routine, onSwap }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {icon}
        <h2 className="ss-serif" style={{ fontSize: 20, fontWeight: 600 }}>{title}</h2>
      </div>
      {steps.length === 0 && <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>No steps for this time of day.</p>}
      {steps.map((step, index) => (
        <RoutineStep key={`${step.category}-${step.step}`} step={step} sectionKey={sectionKey} index={index} routine={routine} onSwap={onSwap} />
      ))}
    </div>
  );
}

export default function RoutinePage({ setView }) {
  const [routine, setRoutine] = useState(() => loadRoutine());

  if (!routine) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 72px", textAlign: "center" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>No routine generated yet.</p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz-summary")}>Back to my profile</button>
      </div>
    );
  }

  // Local swap only — never calls Claude again. Replaces the productId/reason
  // at [sectionKey][index], then recomputes compatibility warnings from the
  // routine's current products and persists the result.
  const handleSwap = (sectionKey, index, alternative) => {
    setRoutine((prev) => {
      const nextSection = [...(prev[sectionKey] || [])];
      nextSection[index] = {
        ...nextSection[index],
        productId: alternative.id,
        reason: alternative.reasons?.[0] || `Swapped in — top-ranked alternative for ${nextSection[index].category}`,
      };
      const next = { ...prev, [sectionKey]: nextSection };
      next.warnings = recomputeWarnings(next);
      saveRoutine(next);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Your SkinScout routine</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>{routine.profileSummary}</p>

      {routine.warnings?.length > 0 && (
        <div className="ss-card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start", background: "var(--sage-lt)" }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--burgundy)" }} />
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            {routine.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <RoutineSection title="Morning" icon={<Sun size={18} color="var(--forest)" />} sectionKey="morning" steps={routine.morning || []} routine={routine} onSwap={handleSwap} />
      <RoutineSection title="Evening" icon={<Moon size={18} color="var(--forest)" />} sectionKey="evening" steps={routine.evening || []} routine={routine} onSwap={handleSwap} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="ss-btn ss-btn-outline" onClick={() => setView("quiz-summary")}>Back to my profile</button>
        <button className="ss-btn ss-btn-outline" onClick={() => setView("discover")}>Browse products</button>
      </div>

      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 24, fontStyle: "italic" }}>
        SkinScout estimates only, not medical advice. Patch-test new products and consult a professional for persistent concerns.
      </p>
    </div>
  );
}
