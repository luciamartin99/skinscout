import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Sparkles, AlertTriangle, TrendingUp, X, Check, Plus, ShieldCheck,
} from "lucide-react";
import { STAT_KEYS, STAT_META } from "../data/products.js";
import PackagingArt from "../components/PackagingArt.jsx";
import ScorePill from "../components/ScorePill.jsx";
import StatBar from "../components/StatBar.jsx";
import InfoBlock from "../components/InfoBlock.jsx";

export default function ProfilePage({ product, setView, onCompare, compareIds }) {
  if (!product) return null;
  const radarData = STAT_KEYS.map((k) => ({ stat: STAT_META[k].label.replace(" suitability", ""), value: product.stats[k] }));
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 72px" }}>
      <button className="ss-btn ss-btn-outline" style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }} onClick={() => setView("discover")}>
        <ArrowLeft size={15} /> Back to Discover
      </button>

      <div className="ss-card" style={{ padding: 28, display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
          <PackagingArt colors={product.packColors} category={product.category} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sage)" }}>{product.brand}</div>
          <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, margin: "2px 0 6px" }}>{product.name}</h1>
          <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{product.category} · €{product.price} / {product.size}ml</div>
          <p style={{ fontStyle: "italic", color: "var(--ink)", marginBottom: 14, fontSize: 15 }}>"{product.verdict}"</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {product.tags.map((t) => <span key={t} className="ss-chip">{t}</span>)}
          </div>
          <button
            className="ss-btn"
            style={{ background: compareIds.includes(product.id) ? "var(--burgundy)" : "var(--forest)", color: "#fff" }}
            onClick={() => onCompare(product.id)}
          >
            {compareIds.includes(product.id) ? "Added to comparison ✓" : "Add to comparison"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <ScorePill score={product.rating} size="lg" />
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>SkinScout estimate</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }} className="ss-profile-grid">
        <div className="ss-card" style={{ padding: 24 }}>
          <h3 className="ss-serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Performance ratings <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>(SkinScout estimates)</span></h3>
          {STAT_KEYS.map((k) => <StatBar key={k} statKey={k} value={product.stats[k]} />)}
        </div>
        <div className="ss-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h3 className="ss-serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Stat radar</h3>
          <div style={{ flex: 1, minHeight: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10.5, fill: "var(--ink-soft)" }} />
                <Radar dataKey="value" stroke="var(--forest)" fill="var(--forest)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }} className="ss-profile-grid">
        <InfoBlock title="Key ingredients" items={product.keyIngredients} icon={<Sparkles size={15} />} />
        <InfoBlock title="Potential concerns" items={product.potentialConcerns} icon={<AlertTriangle size={15} />} />
        <InfoBlock title="Strengths" items={product.strengths} icon={<TrendingUp size={15} />} />
        <InfoBlock title="Weaknesses" items={product.weaknesses} icon={<X size={15} />} />
        <InfoBlock title="Recommended skin types" items={product.bestFor} icon={<Check size={15} />} />
        <InfoBlock title="Works well with" items={product.worksWith} icon={<Plus size={15} />} />
        <InfoBlock title="Use caution combining with" items={product.cautionWith} icon={<AlertTriangle size={15} />} />
        <InfoBlock title="Recommended usage" items={[product.usage]} icon={<ShieldCheck size={15} />} />
      </div>

      <style>{`@media (max-width: 720px){ .ss-profile-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
