import { Sparkles, Search, Sun } from "lucide-react";

const HOW_IT_WORKS = [
  { n: "01", icon: Sparkles, t: "Tell us about your skin", d: "A short quiz covers your skin type, sensitivity, concerns and preferences." },
  { n: "02", icon: Search, t: "We match you with real products", d: "Ranked deterministically from real ingredient data — never invented." },
  { n: "03", icon: Sun, t: "Get your AM + PM routine", d: "A simple, personalised routine you can swap and revisit any time." },
];

const PROOF_POINTS = ["300+ real skincare products", "Personalized to your skin", "AM + PM routine"];

export default function HomePage({ setView }) {
  return (
    <div>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }} className="ss-hero-grid">
          <div>
            <span className="ss-eyebrow ss-fade">SkinScout</span>
            <h1 className="ss-serif ss-fade" style={{ fontSize: "clamp(36px,5vw,58px)", fontWeight: 600, lineHeight: 1.08, margin: "14px 0 22px" }}>
              Find the skincare routine that fits your skin.
            </h1>
            <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 460, marginBottom: 34, lineHeight: 1.6 }}>
              Answer a few questions and get a routine built around your skin, your concerns and your preferences.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button className="ss-btn ss-btn-primary" style={{ padding: "14px 28px" }} onClick={() => setView("quiz")}>Build My Routine</button>
              <button className="ss-btn ss-btn-outline" style={{ padding: "14px 28px" }} onClick={() => setView("discover")}>Explore Products</button>
            </div>
          </div>
          <div
            style={{
              borderRadius: 22, overflow: "hidden", border: "1px solid var(--line)",
              boxShadow: "var(--shadow-card-hover)", aspectRatio: "4 / 5",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1693004927824-f2623bbedc8b?fm=jpg&q=80&w=900&auto=format&fit=crop&ixlib=rb-4.1.0"
              alt="A woman gently applying a skincare cream to her cheek in soft natural light"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section style={{ background: "var(--forest)", padding: "72px 24px 56px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 className="ss-serif" style={{ color: "#FBF8F1", fontSize: "clamp(24px,3vw,30px)", fontWeight: 600, textAlign: "center", marginBottom: 48 }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 28 }}>
            {HOW_IT_WORKS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.n} style={{ background: "rgba(251,248,241,0.05)", border: "1px solid rgba(251,248,241,0.12)", borderRadius: 16, padding: 30 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div className="ss-serif" style={{ color: "var(--blush)", fontSize: 22, fontWeight: 600 }}>{s.n}</div>
                    <Icon size={18} color="var(--blush)" strokeWidth={1.6} />
                  </div>
                  <div style={{ color: "#FBF8F1", fontWeight: 700, fontSize: 16.5, marginBottom: 8 }}>{s.t}</div>
                  <div style={{ color: "rgba(251,248,241,0.68)", fontSize: 14, lineHeight: 1.6 }}>{s.d}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px 32px", flexWrap: "wrap", marginTop: 48, paddingTop: 32, borderTop: "1px solid rgba(251,248,241,0.12)" }}>
            {PROOF_POINTS.map((t) => (
              <span key={t} style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(251,248,241,0.65)" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <style>{`@media (max-width: 820px){ .ss-hero-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
