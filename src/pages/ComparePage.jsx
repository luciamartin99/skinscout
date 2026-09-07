import { useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
} from "recharts";
import { X, Sparkles, Check, Sliders, AlertTriangle } from "lucide-react";
import { PRODUCTS, STAT_KEYS, STAT_META, SKIN_TYPES, CONCERNS, BUDGETS } from "../data/products.js";
import { generateScoutingReport, localMockReport } from "../lib/ai.js";
import PackagingArt from "../components/PackagingArt.jsx";
import ScorePill from "../components/ScorePill.jsx";
import InfoBlock from "../components/InfoBlock.jsx";
import FilterSelect from "../components/FilterSelect.jsx";

export default function ComparePage({ compareIds, setCompareId, skinProfile }) {
  const a = PRODUCTS.find((p) => p.id === compareIds[0]);
  const b = PRODUCTS.find((p) => p.id === compareIds[1]);
  const [localProfile, setLocalProfile] = useState({
    skinType: skinProfile.skinType || "Combination",
    concern: skinProfile.concerns?.[0] || "Barrier repair",
    budget: "No preference",
    avoid: skinProfile.avoid || "",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runReport = async () => {
    setLoading(true); setError(null); setReport(null);
    try {
      const r = await generateScoutingReport(a, b, localProfile);
      setReport(r);
    } catch (e) {
      setError("Couldn't generate a live report — showing a mocked one instead.");
      setReport(localMockReport(a, b, localProfile));
    } finally { setLoading(false); }
  };

  const radarData = a && b ? STAT_KEYS.map((k) => ({
    stat: STAT_META[k].label.replace(" suitability", ""),
    [a.brand]: a.stats[k], [b.brand]: b.stats[k],
  })) : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Head-to-head comparison</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 26 }}>Pick two products from Discover, then generate a personalised scouting report.</p>

      {(!a || !b) ? (
        <div className="ss-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
          <p style={{ marginBottom: 10 }}>You've added {compareIds.length}/2 products to the comparison.</p>
          <p style={{ fontSize: 13.5 }}>Head to <b>Discover</b> and click "Add to comparison" on two products to build your matchup.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "center", marginBottom: 26 }} className="ss-vs-grid">
            {[a, b].map((p, idx) => (
              <div key={p.id} className="ss-card" style={{ padding: 20, textAlign: "center", position: "relative" }}>
                <button onClick={() => setCompareId(p.id, true)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}><X size={16} /></button>
                <div style={{ width: 72, height: 72, margin: "0 auto 10px" }}><PackagingArt colors={p.packColors} category={p.category} /></div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sage)" }}>{p.brand}</div>
                <div className="ss-serif" style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 10px" }}>€{p.price} · €{(p.price / (p.size / 10)).toFixed(2)}/10ml</div>
                <ScorePill score={p.rating} size="lg" />
              </div>
            ))}
            <div className="ss-serif" style={{ textAlign: "center", fontSize: 22, fontWeight: 600, color: "var(--burgundy)" }}>VS</div>
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Stat-by-stat</h3>
            {STAT_KEYS.map((k) => {
              const av = a.stats[k], bv = b.stats[k];
              return (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: "right", fontWeight: av > bv ? 800 : 500, color: av > bv ? "var(--forest)" : "var(--ink)" }}>{av}{av > bv && " 🏆"}</div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{STAT_META[k].label}</div>
                  <div style={{ textAlign: "left", fontWeight: bv > av ? 800 : 500, color: bv > av ? "var(--forest)" : "var(--ink)" }}>{bv > av && "🏆 "}{bv}</div>
                </div>
              );
            })}
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Radar comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10.5, fill: "var(--ink-soft)" }} />
                <Radar name={a.brand} dataKey={a.brand} stroke="var(--forest)" fill="var(--forest)" fillOpacity={0.3} />
                <Radar name={b.brand} dataKey={b.brand} stroke="var(--burgundy)" fill="var(--burgundy)" fillOpacity={0.25} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="ss-profile-grid">
            <InfoBlock title={`${a.brand} — key ingredients`} items={a.keyIngredients} icon={<Sparkles size={15} />} />
            <InfoBlock title={`${b.brand} — key ingredients`} items={b.keyIngredients} icon={<Sparkles size={15} />} />
            <InfoBlock title={`${a.brand} — best skin types`} items={a.bestFor} icon={<Check size={15} />} />
            <InfoBlock title={`${b.brand} — best skin types`} items={b.bestFor} icon={<Check size={15} />} />
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Sliders size={16} color="var(--forest)" /><h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600 }}>Personalise your report</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
              <FilterSelect label="Skin type" value={localProfile.skinType} setValue={(v) => setLocalProfile({ ...localProfile, skinType: v })} options={SKIN_TYPES} />
              <FilterSelect label="Main concern" value={localProfile.concern} setValue={(v) => setLocalProfile({ ...localProfile, concern: v })} options={CONCERNS} />
              <FilterSelect label="Budget preference" value={localProfile.budget} setValue={(v) => setLocalProfile({ ...localProfile, budget: v })} options={BUDGETS} />
            </div>
            <button className="ss-btn ss-btn-burgundy" style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onClick={runReport} disabled={loading}>
              <Sparkles size={16} /> {loading ? "Generating…" : "Generate AI scouting report"}
            </button>

            {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--burgundy)" }}>{error}</div>}
            {loading && <div className="ss-fade" style={{ marginTop: 18, color: "var(--ink-soft)", fontSize: 14 }}>Scouting both products for your profile…</div>}
            {report && !loading && (
              <div className="ss-fade" style={{ marginTop: 20, background: "var(--sage-lt)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>RECOMMENDED PRODUCT</div>
                <div className="ss-serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 10 }}>{report.recommendedProduct}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>{report.summary}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>WHY IT WINS</div>
                <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                  {(report.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>WHERE THE OTHER PRODUCT WINS</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{report.alternativeStrength}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>CAVEAT</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14, fontStyle: "italic" }}>{report.caveat}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(255,255,255,0.6)", padding: 12, borderRadius: 10 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2, color: "var(--burgundy)" }} />
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>{report.disclaimer}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`@media (max-width: 700px){ .ss-vs-grid{ grid-template-columns: 1fr !important; } .ss-vs-grid > div:nth-child(3){ order:-1; } }`}</style>
    </div>
  );
}
