import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { saveSkinProfile } from "../lib/skinProfile.js";

const STEPS = [
  { key: "skinType", label: "What's your skin type?", multi: false, options: ["Dry", "Oily", "Combination", "Normal", "Not sure"] },
  { key: "concerns", label: "What are your main concerns?", multi: true, options: ["Acne", "Redness", "Dryness", "Pigmentation", "Ageing", "Texture"] },
  { key: "sensitivity", label: "How sensitive is your skin?", multi: false, options: ["Low", "Medium", "High"] },
  { key: "exclusions", label: "Anything you'd like to avoid?", multi: true, options: ["Fragrance", "Essential oils", "Alcohol", "Strong acids", "Retinoids", "None"] },
  { key: "budget", label: "What's your budget?", multi: false, options: ["Under €30", "€30–50", "€50–100", "No limit"] },
  { key: "routineLength", label: "How long should your routine be?", multi: false, options: ["Minimal", "Balanced", "Complete"] },
];

export default function QuizPage({ setView }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    skinType: null,
    concerns: [],
    sensitivity: null,
    exclusions: [],
    budget: null,
    routineLength: null,
  });

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
      saveSkinProfile(answers);
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

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 72px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--sage)", marginBottom: 8 }}>
        Step {step + 1} of {STEPS.length}
      </div>
      <div className="ss-card ss-fade" style={{ padding: 32 }}>
        <h1 className="ss-serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 20 }}>{current.label}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
          {current.options.map((opt) => (
            <span
              key={opt}
              className="ss-chip"
              style={{
                cursor: "pointer",
                fontSize: 14,
                padding: "10px 18px",
                background: isSelected(opt) ? "var(--forest)" : "var(--sage-lt)",
                color: isSelected(opt) ? "#fff" : "var(--forest-dk)",
              }}
              onClick={() => (current.multi ? toggleMulti(current.key, opt) : selectSingle(current.key, opt))}
            >
              {opt}
            </span>
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
            style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: isAnswered ? 1 : 0.5, cursor: isAnswered ? "pointer" : "not-allowed" }}
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
