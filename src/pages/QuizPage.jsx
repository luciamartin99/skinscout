import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const STEPS = [
  { key: "skinType", label: "What's your skin type?", multi: false, options: ["Dry", "Oily", "Combination", "Normal", "Not sure"] },
  { key: "concerns", label: "What are your main concerns?", multi: true, options: ["Acne", "Redness", "Dryness", "Pigmentation", "Ageing", "Texture"] },
  { key: "sensitivity", label: "How sensitive is your skin?", multi: false, options: ["Low", "Medium", "High"] },
  { key: "exclusions", label: "Anything you'd like to avoid?", multi: true, options: ["Fragrance", "Essential oils", "Alcohol", "Strong acids", "Retinoids", "None"] },
  { key: "budget", label: "What's your budget?", multi: false, options: ["Under €30", "€30–50", "€50–100", "No limit"] },
  { key: "routineLength", label: "How long should your routine be?", multi: false, options: ["Minimal", "Balanced", "Complete"] },
];

export default function QuizPage({ setView, skinProfile, setSkinProfile }) {
  const [step, setStep] = useState(0);
  // Pre-fills from the shared profile when one exists (the "Edit profile"
  // flow from My Skin) — a blank/cleared profile (e.g. after "Retake quiz")
  // falls back to empty defaults, same as starting fresh.
  const [answers, setAnswers] = useState(() => ({
    skinType: skinProfile?.skinType ?? null,
    concerns: skinProfile?.concerns ?? [],
    sensitivity: skinProfile?.sensitivity ?? null,
    exclusions: skinProfile?.exclusions ?? [],
    budget: skinProfile?.budget ?? null,
    routineLength: skinProfile?.routineLength ?? null,
  }));

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const selectSingle = (key, value) => setAnswers((a) => ({ ...a, [key]: value }));
  const toggleMulti = (key, value) => {
    setAnswers((a) => {
      const cur = a[key] || [];
      return { ...a, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  };

  const next = () => {
    if (isLast) {
      setSkinProfile(answers);
      setView("quiz-summary");
    } else {
      setStep((s) => s + 1);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const isSelected = (value) =>
    current.multi ? (answers[current.key] || []).includes(value) : answers[current.key] === value;

  // Single-select steps (skin type, sensitivity, budget, routine length)
  // require an answer; multi-select steps (concerns, exclusions) don't.
  const isAnswered = current.multi || answers[current.key] !== null;
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="ss-eyebrow">Question {step + 1} of {STEPS.length}</span>
        </div>
        <div className="ss-bar-track">
          <div className="ss-bar-fill" style={{ width: `${progressPct}%`, background: "var(--forest)" }} />
        </div>
      </div>

      <div className="ss-card ss-fade" style={{ padding: "36px 32px" }}>
        <h1 className="ss-serif" style={{ fontSize: "clamp(22px,3vw,26px)", fontWeight: 600, marginBottom: 24 }}>{current.label}</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
          {current.options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`ss-option ${isSelected(opt) ? "selected" : ""}`}
              aria-pressed={isSelected(opt)}
              onClick={() => (current.multi ? toggleMulti(current.key, opt) : selectSingle(current.key, opt))}
            >
              {opt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            className="ss-btn ss-btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, visibility: step === 0 ? "hidden" : "visible" }}
            onClick={back}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <button
            className="ss-btn ss-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: isAnswered ? 1 : 0.5 }}
            onClick={next}
            disabled={!isAnswered}
          >
            {isLast ? "See my profile" : "Next"} {!isLast && <ArrowRight size={15} />}
          </button>
        </div>
        {!isAnswered && (
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "right", marginTop: 8 }}>
            Please select one option to continue.
          </div>
        )}
      </div>
    </div>
  );
}
