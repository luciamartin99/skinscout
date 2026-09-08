import { useState, useEffect } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
} from "recharts";
import { X, Sparkles, Check, Sliders, AlertTriangle } from "lucide-react";
import { PRODUCTS, SKIN_TYPES, CONCERNS, BUDGETS } from "../data/products.js";
import { generateScoutingReport } from "../lib/ai.js";
import { isRealProductId } from "../lib/productId.js";
import { COMPARISON_STATS, calculateOverallScore, extractKeyIngredients, deriveBestSkinTypes } from "../lib/productScoring.js";
import ScorePill from "../components/ScorePill.jsx";
import InfoBlock from "../components/InfoBlock.jsx";
import FilterSelect from "../components/FilterSelect.jsx";

// ONE canonical comparison-view shape, regardless of whether the product
// is a real Supabase product or one of the 12 legacy mock catalog entries
// (still reachable via Home's "Top performers") — Discover/Compare/the
// routine all already share the real product shape; this is just the
// presentational adapter so BOTH sources can render through the exact
// same UI below, using src/lib/productScoring.js as the single scoring
// engine for real products. Mock products keep using their own existing
// fictional fields untouched — they're simply read through this shape,
// never converted into "fake real" data.
function buildComparisonView(product, profile) {
  if (isRealProductId(product.id)) {
    const stats = {};
    for (const stat of COMPARISON_STATS) stats[stat.key] = stat.calculate(product, profile).score;
    const overall = calculateOverallScore(product, profile);
    const keyIngredients = extractKeyIngredients(product);
    const bestSkinTypes = deriveBestSkinTypes(product);
    return {
      id: product.id,
      brand: product.brand,
      name: product.name,
      image_url: product.image_url,
      category: product.category,
      barcode: product.barcode,
      price: typeof product.price_eur === "number" ? product.price_eur : null,
      overallScore: overall.score,
      stats,
      keyIngredients: keyIngredients.items,
      keyIngredientsLimited: keyIngredients.limited,
      bestSkinTypes: bestSkinTypes.items,
    };
  }
  return {
    id: product.id,
    brand: product.brand,
    name: product.name,
    image_url: null,
    category: product.category,
    barcode: null,
    price: typeof product.price === "number" ? product.price : null,
    overallScore: typeof product.rating === "number" ? product.rating : null,
    stats: {
      hydration: product.stats?.hydration ?? null,
      acne: product.stats?.acne ?? null,
      sensitiveSkinFit: product.stats?.sensitivity ?? null,
      brightening: product.stats?.brightening ?? null,
      antiAgeing: product.stats?.antiAgeing ?? null,
      formulaProfile: product.stats?.ingredientQuality ?? null,
      valueForMoney: product.stats?.value ?? null,
    },
    keyIngredients: product.keyIngredients || [],
    keyIngredientsLimited: false,
    bestSkinTypes: product.bestFor || [],
  };
}

function ProductImage({ src, name, size = 72 }) {
  return (
    <div style={{ width: size, height: size, margin: "0 auto 10px", borderRadius: 16, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>No image</span>
      )}
    </div>
  );
}

export default function ComparePage({ compareIds, setCompareId, skinProfile }) {
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(false);

  const realIds = compareIds.filter(isRealProductId);
  const mockIds = compareIds.filter((id) => id && !isRealProductId(id));

  // Fetch canonical detail (incl. real ingredients + price) for real products.
  useEffect(() => {
    if (realIds.length === 0) return;
    setLoading(true);
    fetch(`/api/products?ids=${realIds.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        const additions = {};
        (data.products || []).forEach((p) => { additions[p.id] = p; });
        setProductMap((prev) => ({ ...prev, ...additions }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realIds.join(",")]);

  // Mock products need no fetch — store the RAW mock object as-is (never
  // pre-normalized), so both the display adapter above and the legacy
  // report path (which needs the original .stats) can use it correctly.
  useEffect(() => {
    if (mockIds.length === 0) return;
    const additions = {};
    mockIds.forEach((id) => {
      const mock = PRODUCTS.find((p) => p.id === id);
      if (mock) additions[id] = mock;
    });
    setProductMap((prev) => ({ ...prev, ...additions }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockIds.join(",")]);

  const rawA = productMap[compareIds[0]];
  const rawB = productMap[compareIds[1]];
  const aIsReal = rawA && isRealProductId(rawA.id);
  const bIsReal = rawB && isRealProductId(rawB.id);
  const bothMock = rawA && rawB && !aIsReal && !bIsReal;
  const mixedTypes = rawA && rawB && aIsReal !== bIsReal;

  const [localProfile, setLocalProfile] = useState({
    skinType: skinProfile?.skinType || "Combination",
    concern: skinProfile?.concerns?.[0] || "Barrier repair",
    budget: "No preference",
    avoid: skinProfile?.avoid || "",
  });
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  const viewA = rawA ? buildComparisonView(rawA, skinProfile) : null;
  const viewB = rawB ? buildComparisonView(rawB, skinProfile) : null;

  const runReport = async () => {
    setReportLoading(true); setError(null); setReport(null);
    try {
      const r = await generateScoutingReport(rawA, rawB, localProfile);
      setReport(r);
    } catch (e) {
      setError("Couldn't generate a comparison report right now. Please try again.");
    } finally { setReportLoading(false); }
  };

  // Keyed by "A"/"B", not brand/name — two products can share the same
  // brand (or both lack one), which would silently collide into a single
  // object key and drop one product's series entirely. The real brand/
  // name is still used for the visible legend label via Radar's `name` prop.
  const radarData = viewA && viewB ? COMPARISON_STATS.map((stat) => ({
    stat: stat.label,
    A: viewA.stats[stat.key] ?? 0,
    B: viewB.stats[stat.key] ?? 0,
  })) : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Head-to-head comparison</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 26 }}>Pick two products from Discover, then generate a personalised scouting report.</p>

      {compareIds.length < 2 || !viewA || !viewB ? (
        <div className="ss-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
          <p style={{ marginBottom: 10 }}>
            {loading ? "Loading your selected products…" : `You've added ${compareIds.length}/2 products to the comparison.`}
          </p>
          {!loading && <p style={{ fontSize: 13.5 }}>Head to <b>Discover</b> and click "Add to comparison" on two products to build your matchup.</p>}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "center", marginBottom: 26 }} className="ss-vs-grid">
            {[viewA, viewB].map((p) => (
              <div key={p.id} className="ss-card" style={{ padding: 20, textAlign: "center", position: "relative" }}>
                <button onClick={() => setCompareId(p.id, true)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}><X size={16} /></button>
                <ProductImage src={p.image_url} name={p.name} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sage)" }}>{p.brand || "Unknown brand"}</div>
                <div className="ss-serif" style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 10px" }}>
                  {[p.category, p.price != null ? `€${p.price}` : null].filter(Boolean).join(" · ")}
                </div>
                {typeof p.overallScore === "number" ? (
                  <ScorePill score={p.overallScore} size="lg" />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>Limited data</span>
                )}
              </div>
            ))}
            <div className="ss-serif" style={{ textAlign: "center", fontSize: 22, fontWeight: 600, color: "var(--burgundy)" }}>VS</div>
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Stat-by-stat</h3>
            {COMPARISON_STATS.map((stat) => {
              const av = viewA.stats[stat.key];
              const bv = viewB.stats[stat.key];
              const aWins = typeof av === "number" && typeof bv === "number" && av > bv;
              const bWins = typeof av === "number" && typeof bv === "number" && bv > av;
              return (
                <div key={stat.key} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: "right", fontWeight: aWins ? 800 : 500, color: aWins ? "var(--forest)" : "var(--ink)" }}>
                    {typeof av === "number" ? av : "N/A"}{aWins && " 🏆"}
                  </div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{stat.label}</div>
                  <div style={{ textAlign: "left", fontWeight: bWins ? 800 : 500, color: bWins ? "var(--forest)" : "var(--ink)" }}>
                    {bWins && "🏆 "}{typeof bv === "number" ? bv : "N/A"}
                  </div>
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
                <Radar name={viewA.brand || viewA.name} dataKey="A" stroke="var(--forest)" fill="var(--forest)" fillOpacity={0.3} />
                <Radar name={viewB.brand || viewB.name} dataKey="B" stroke="var(--burgundy)" fill="var(--burgundy)" fillOpacity={0.25} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="ss-profile-grid">
            <InfoBlock
              title={`${viewA.brand || viewA.name} — key ingredients`}
              items={viewA.keyIngredientsLimited ? ["Ingredient data limited"] : (viewA.keyIngredients.length ? viewA.keyIngredients : ["No ingredient data available"])}
              icon={<Sparkles size={15} />}
            />
            <InfoBlock
              title={`${viewB.brand || viewB.name} — key ingredients`}
              items={viewB.keyIngredientsLimited ? ["Ingredient data limited"] : (viewB.keyIngredients.length ? viewB.keyIngredients : ["No ingredient data available"])}
              icon={<Sparkles size={15} />}
            />
            <InfoBlock
              title={`${viewA.brand || viewA.name} — best skin types`}
              items={viewA.bestSkinTypes.length ? viewA.bestSkinTypes : ["Not enough formulation evidence to suggest a best-fit skin type"]}
              icon={<Check size={15} />}
            />
            <InfoBlock
              title={`${viewB.brand || viewB.name} — best skin types`}
              items={viewB.bestSkinTypes.length ? viewB.bestSkinTypes : ["Not enough formulation evidence to suggest a best-fit skin type"]}
              icon={<Check size={15} />}
            />
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Sliders size={16} color="var(--forest)" /><h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600 }}>Personalise your report</h3>
            </div>

            {mixedTypes ? (
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                A comparison report currently needs two products of the same type — pick two from Discover, or two from Home's top picks.
              </p>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
                  <FilterSelect label="Skin type" value={localProfile.skinType} setValue={(v) => setLocalProfile({ ...localProfile, skinType: v })} options={SKIN_TYPES} />
                  <FilterSelect label="Main concern" value={localProfile.concern} setValue={(v) => setLocalProfile({ ...localProfile, concern: v })} options={CONCERNS} />
                  <FilterSelect label="Budget preference" value={localProfile.budget} setValue={(v) => setLocalProfile({ ...localProfile, budget: v })} options={BUDGETS} />
                </div>
                <button className="ss-btn ss-btn-burgundy" style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onClick={runReport} disabled={reportLoading}>
                  <Sparkles size={16} /> {reportLoading ? "Generating…" : "Generate AI scouting report"}
                </button>
              </>
            )}

            {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--burgundy)" }}>{error}</div>}
            {reportLoading && <div className="ss-fade" style={{ marginTop: 18, color: "var(--ink-soft)", fontSize: 14 }}>Scouting both products for your profile…</div>}

            {report && !reportLoading && (
              <div className="ss-fade" style={{ marginTop: 20, background: "var(--sage-lt)", borderRadius: 14, padding: 20 }}>
                {report.recommendedProduct ? (
                  // Legacy mock-catalog report shape (bothMock)
                  <>
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
                  </>
                ) : (
                  // Real-product report shape (bothReal) — deterministic-stats-driven
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>WINNER</div>
                    <div className="ss-serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 10 }}>{report.winner}</div>
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>{report.verdict}</p>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>STRENGTHS</div>
                    <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                      {(report.strengths || []).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>WHERE THE OTHER PRODUCT WINS</div>
                    <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                      {(report.weaknesses || []).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>BEST FIT</div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>{report.bestFitProfile}</p>
                  </>
                )}
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
