import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { loadSkinProfile } from "../lib/skinProfile.js";
import { calculateOverallScore } from "../lib/productScoring.js";
import ScoreBar from "../components/ScoreBar.jsx";
import InfoBlock from "../components/InfoBlock.jsx";

const COMPONENT_LABELS = {
  hydration: "Hydration",
  formulaProfile: "Formula profile",
  sensitiveSkinFit: "Sensitive-skin fit",
  profileMatch: "Your profile match",
};

// Lightweight detail view for a REAL Supabase product — no new navigation
// architecture, just another `view` in App.jsx's existing switch, reusing
// selectedId the same way the old mock ProfilePage does. Fetches the
// product's canonical detail (incl. real ingredients) via the same
// /api/products?ids= endpoint Compare already uses, then scores it
// deterministically against whatever skin profile is currently saved.
export default function RealProductProfilePage({ productId, setView, onCompare, compareIds }) {
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!productId) return;
    setStatus("loading");
    fetch(`/api/products?ids=${productId}`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.products || [])[0] || null;
        setProduct(found);
        setStatus(found ? "done" : "error");
      })
      .catch(() => setStatus("error"));
  }, [productId]);

  if (status === "loading") {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 80px", textAlign: "center", color: "var(--ink-soft)" }}>
        Loading product…
      </div>
    );
  }

  if (status === "error" || !product) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 80px", textAlign: "center" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>This product couldn't be loaded right now.</p>
        <button className="ss-btn ss-btn-primary" onClick={() => setView("discover")}>Back to Discover</button>
      </div>
    );
  }

  const profile = loadSkinProfile();
  const overall = calculateOverallScore(product, profile);
  const compareActive = compareIds?.includes(product.id);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <button className="ss-btn ss-btn-outline" style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }} onClick={() => setView("discover")}>
        <ArrowLeft size={15} /> Back to Discover
      </button>

      <div className="ss-card ss-fade" style={{ padding: 28, display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
        <div className="ss-img-frame" style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 16, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>No image</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sage)" }}>{product.brand || "Unknown brand"}</div>
          <h1 className="ss-serif" style={{ fontSize: 28, fontWeight: 600, margin: "2px 0 6px" }}>{product.name}</h1>
          <div style={{ color: "var(--ink-soft)", marginBottom: 14 }}>
            {[product.category, product.barcode].filter(Boolean).join(" · ")}
          </div>
          <button
            className="ss-btn"
            style={{ background: compareActive ? "var(--burgundy)" : "var(--forest)", color: "#fff" }}
            onClick={() => onCompare?.(product.id)}
          >
            {compareActive ? "Remove from comparison" : "Add to comparison"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div className="ss-tab" style={{ display: "inline-flex", alignItems: "baseline", gap: 4, background: "var(--sage-lt)", borderRadius: 14, padding: "10px 18px" }}>
            {typeof overall.score === "number" ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 34, color: "var(--forest)", lineHeight: 1 }}>{overall.score}</span>
                <span style={{ fontSize: 14, color: "var(--ink-soft)", fontWeight: 600 }}>/100</span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: "var(--ink-soft)", fontStyle: "italic" }}>Limited data</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>SkinScout score</span>
        </div>
      </div>

      <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 className="ss-serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Performance signals <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>(derived from real ingredient data)</span></h3>
        {(overall.components || []).map((c) => (
          <ScoreBar key={c.key} label={COMPONENT_LABELS[c.key] || c.key} score={c.score} />
        ))}
        {!profile?.skinType && (
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
            <Sparkles size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
            Take the skin quiz for a personalised profile-match score.
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="ss-profile-grid">
        <InfoBlock title="Why it scored this way" items={overall.reasons?.length ? overall.reasons : ["Not enough data to explain this score"]} icon={<Sparkles size={15} />} />
        <InfoBlock title="Available ingredients" items={product.ingredients?.length ? product.ingredients : ["No ingredient data available"]} icon={<Sparkles size={15} />} />
      </div>

      <style>{`@media (max-width: 720px){ .ss-profile-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
