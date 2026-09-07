import { AlertTriangle } from "lucide-react";

export default function Footer() {
  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "26px 24px", background: "var(--card)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-start", color: "var(--ink-soft)", fontSize: 12.5, lineHeight: 1.6 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns. All scores shown are SkinScout estimates created for this prototype, not verified lab or clinical claims.</span>
      </div>
    </div>
  );
}
