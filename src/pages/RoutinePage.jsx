import { useState } from "react";
import { Sun, Moon, RefreshCw } from "lucide-react";
import { loadRoutine, saveRoutine } from "../lib/routineStorage.js";
import { checkRoutineCompatibility } from "../lib/compatibility.js";

// Recomputes warnings from scratch based on the routine's CURRENT products
// (after any swaps) — "run compatibility check again", never a full
// regeneration via Claude. Uses candidateDetails (real Supabase records,
// including ingredients) as the source for each step's full product data.
function resolveCandidate(routine, category, productId) {
  return (routine.candidateDetails?.[category] || []).find((c) => c.id === productId) || null;
}

function recomputeWarnings(routine) {
  const allSteps = [...(routine.morning || []), ...(routine.evening || [])];
  const products = allSteps
    .map((step) => resolveCandidate(routine, step.category, step.product.id))
    .filter(Boolean);
  const compatibility = products.length > 1 ? checkRoutineCompatibility(products) : { warnings: [] };
  // Deduplicated — the same plain-language warning should never repeat.
  return Array.from(new Set(compatibility.warnings.map((w) => w.reason)));
}

// Never show the raw internal score — it's a ranking-implementation detail,
// not something meaningful to the end user (and is often near-identical
// across candidates right now, which would look confusing as a bare
// number). A qualitative label conveys the same thing without exposing it.
function scoreLabel(score) {
  if (typeof score !== "number") return null;
  if (score >= 70) return "Strong match";
  if (score >= 40) return "Good match";
  return "Potential match";
}

function RoutineStep({ step, sectionKey, index, routine, onSwap }) {
  const [showAlts, setShowAlts] = useState(false);
  const { product } = step;
  const alternatives = (routine.candidateDetails?.[step.category] || [])
    .filter((c) => c.id !== product?.id)
    .slice(0, 3);

  const stepLabel = String(step.step).padStart(2, "0");
  const categoryLabel = step.category ? step.category.charAt(0).toUpperCase() + step.category.slice(1) : "";

  return (
    <div className="ss-card ss-fade" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 2 }}>
          <span className="ss-serif" style={{ fontSize: 22, fontWeight: 600, color: "var(--sage)", lineHeight: 1 }}>{stepLabel}</span>
        </div>
        <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {product?.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>No image</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ss-eyebrow" style={{ marginBottom: 4 }}>{categoryLabel}</div>
          <div className="ss-serif" style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.25 }}>
            {product ? `${product.brand ? `${product.brand} — ` : ""}${product.name}` : "No suitable product found for this step."}
          </div>
          {scoreLabel(step.score) && (
            <div style={{ fontSize: 12.5, color: "var(--forest)", fontWeight: 700, margin: "3px 0" }}>{scoreLabel(step.score)}</div>
          )}
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "4px 0 0", lineHeight: 1.5 }}>{step.reason}</p>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
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
          {alternatives.length === 0 && <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>No suitable alternatives found.</p>}
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
              <span style={{ color: "var(--ink-soft)" }}>{scoreLabel(alt.score)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoutineSection({ title, subtitle, icon, sectionKey, steps, routine, onSwap }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
        {icon}
        <div>
          <h2 className="ss-serif" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{title}</h2>
          <span className="ss-eyebrow">{subtitle}</span>
        </div>
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
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px 80px", textAlign: "center" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>No routine generated yet.</p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("quiz-summary")}>Back to my profile</button>
      </div>
    );
  }

  // Local swap only — never calls Claude again. Replaces the product at
  // [sectionKey][index] with a real candidate already loaded in
  // candidateDetails, recomputes compatibility, and persists the result.
  const handleSwap = (sectionKey, index, alternative) => {
    setRoutine((prev) => {
      const nextSection = [...(prev[sectionKey] || [])];
      nextSection[index] = {
        ...nextSection[index],
        product: { id: alternative.id, name: alternative.name, brand: alternative.brand, image_url: alternative.image_url, barcode: alternative.obf_barcode },
        score: alternative.score,
        // Never fall back to alternative.reasons here — that's internal
        // ranking-signal text, not user-facing copy (same principle as
        // api/generate-routine.js's FALLBACK_REASON).
        reason: `A well-matched ${nextSection[index].category} for your profile.`,
      };
      const next = { ...prev, [sectionKey]: nextSection };
      next.warnings = recomputeWarnings(next);
      saveRoutine(next);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>
      <span className="ss-eyebrow">Your routine</span>
      <h1 className="ss-serif" style={{ fontSize: "clamp(28px,4vw,34px)", fontWeight: 600, margin: "10px 0 20px" }}>Your SkinScout routine</h1>

      <div className="ss-card ss-fade" style={{ padding: "22px 24px", marginBottom: 40, background: "var(--sage-lt)", border: "1px solid var(--line)" }}>
        <p style={{ color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{routine.profileSummary}</p>
      </div>

      {/* No warning/diagnostic panel here by design — validation still runs
          (see recomputeWarnings above and api/generate-routine.js), it's
          just never surfaced in this UI. A generated routine is shown as-is. */}

      <RoutineSection title="Morning" subtitle="AM routine" icon={<Sun size={18} color="var(--forest)" />} sectionKey="morning" steps={routine.morning || []} routine={routine} onSwap={handleSwap} />
      <RoutineSection title="Evening" subtitle="PM routine" icon={<Moon size={18} color="var(--forest)" />} sectionKey="evening" steps={routine.evening || []} routine={routine} onSwap={handleSwap} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <button className="ss-btn ss-btn-outline" onClick={() => setView("myskin")}>Back to My Skin</button>
        <button className="ss-btn ss-btn-outline" onClick={() => setView("discover")}>Browse Products</button>
      </div>

      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 28, fontStyle: "italic", lineHeight: 1.5 }}>
        SkinScout estimates only, not medical advice. Patch-test new products and consult a professional for persistent concerns.
      </p>
    </div>
  );
}
