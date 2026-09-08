import { useState, useEffect } from "react";
import { X, Sparkles, AlertTriangle } from "lucide-react";
import { PRODUCTS, SKIN_TYPES, CONCERNS, BUDGETS } from "../data/products.js";
import { generateScoutingReport } from "../lib/ai.js";
import { isRealProductId } from "../lib/productId.js";
import InfoBlock from "../components/InfoBlock.jsx";
import FilterSelect from "../components/FilterSelect.jsx";

// Normalizes a legacy mock product (src/data/products.js) into the SAME
// canonical shape real Supabase products use ({id, barcode, name, brand,
// image_url, category, ingredients}), so Compare has exactly one rendering
// path regardless of where a product came from — never two competing
// product formats.
function normalizeMockProduct(mock) {
  if (!mock) return null;
  return {
    id: mock.id,
    barcode: null,
    name: mock.name,
    brand: mock.brand,
    image_url: null,
    category: mock.category ? mock.category.toLowerCase() : null, // match real products' lowercase canonical category
    ingredients: mock.keyIngredients || [],
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

  // Fetch canonical detail (incl. real ingredients) for any real products.
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

  // Mock products need no fetch — normalize synchronously.
  useEffect(() => {
    if (mockIds.length === 0) return;
    const additions = {};
    mockIds.forEach((id) => {
      const mock = PRODUCTS.find((p) => p.id === id);
      if (mock) additions[id] = normalizeMockProduct(mock);
    });
    setProductMap((prev) => ({ ...prev, ...additions }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockIds.join(",")]);

  const a = productMap[compareIds[0]];
  const b = productMap[compareIds[1]];
  const aIsReal = a && isRealProductId(a.id);
  const bIsReal = b && isRealProductId(b.id);
  const bothMock = a && b && !aIsReal && !bIsReal;
  const mixedTypes = a && b && aIsReal !== bIsReal;

  const [localProfile, setLocalProfile] = useState({
    skinType: skinProfile?.skinType || "Combination",
    concern: skinProfile?.concerns?.[0] || "Barrier repair",
    budget: "No preference",
    avoid: skinProfile?.avoid || "",
  });
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  const runReport = async () => {
    setReportLoading(true); setError(null); setReport(null);
    try {
      // bothMock must use the ORIGINAL mock objects (with their fictional
      // .stats), not the canonical display shape used above — that shape
      // deliberately has no .stats, which the legacy report path needs.
      const reportA = bothMock ? PRODUCTS.find((p) => p.id === a.id) : a;
      const reportB = bothMock ? PRODUCTS.find((p) => p.id === b.id) : b;
      const r = await generateScoutingReport(reportA, reportB, localProfile);
      setReport(r);
    } catch (e) {
      setError("Couldn't generate a comparison report right now. Please try again.");
    } finally { setReportLoading(false); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Head-to-head comparison</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 26 }}>Pick two products from Discover, then generate a comparison.</p>

      {compareIds.length < 2 || !a || !b ? (
        <div className="ss-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
          <p style={{ marginBottom: 10 }}>
            {loading ? "Loading your selected products…" : `You've added ${compareIds.length}/2 products to the comparison.`}
          </p>
          {!loading && <p style={{ fontSize: 13.5 }}>Head to <b>Discover</b> and click "Add to Compare" on two products to build your matchup.</p>}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "center", marginBottom: 26 }} className="ss-vs-grid">
            {[a, b].map((p) => (
              <div key={p.id} className="ss-card" style={{ padding: 20, textAlign: "center", position: "relative" }}>
                <button onClick={() => setCompareId(p.id, true)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}><X size={16} /></button>
                <ProductImage src={p.image_url} name={p.name} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sage)" }}>{p.brand || "Unknown brand"}</div>
                <div className="ss-serif" style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 2px" }}>
                  {[p.category, p.barcode].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
            <div className="ss-serif" style={{ textAlign: "center", fontSize: 22, fontWeight: 600, color: "var(--burgundy)" }}>VS</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="ss-profile-grid">
            <InfoBlock title={`${a.brand || a.name} — ingredients`} items={a.ingredients?.length ? a.ingredients : ["No ingredient data available"]} icon={<Sparkles size={15} />} />
            <InfoBlock title={`${b.brand || b.name} — ingredients`} items={b.ingredients?.length ? b.ingredients : ["No ingredient data available"]} icon={<Sparkles size={15} />} />
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Sparkles size={16} color="var(--forest)" /><h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600 }}>Generate a comparison</h3>
            </div>

            {mixedTypes ? (
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                A comparison report currently needs two products of the same type — pick two from Discover, or two from Home's top picks.
              </p>
            ) : (
              <>
                {bothMock && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
                    <FilterSelect label="Skin type" value={localProfile.skinType} setValue={(v) => setLocalProfile({ ...localProfile, skinType: v })} options={SKIN_TYPES} />
                    <FilterSelect label="Main concern" value={localProfile.concern} setValue={(v) => setLocalProfile({ ...localProfile, concern: v })} options={CONCERNS} />
                    <FilterSelect label="Budget preference" value={localProfile.budget} setValue={(v) => setLocalProfile({ ...localProfile, budget: v })} options={BUDGETS} />
                  </div>
                )}

                <button className="ss-btn ss-btn-burgundy" style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onClick={runReport} disabled={reportLoading}>
                  <Sparkles size={16} /> {reportLoading ? "Generating…" : "Generate comparison report"}
                </button>
              </>
            )}

            {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--burgundy)" }}>{error}</div>}
            {reportLoading && <div className="ss-fade" style={{ marginTop: 18, color: "var(--ink-soft)", fontSize: 14 }}>Comparing both products…</div>}

            {report && !reportLoading && (
              <div className="ss-fade" style={{ marginTop: 20, background: "var(--sage-lt)", borderRadius: 14, padding: 20 }}>
                {report.recommendedProduct ? (
                  // Legacy mock-catalog report shape
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
                  // Real-product report shape — factual ingredient comparison only
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>INGREDIENT COMPARISON</div>
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>{report.summary}</p>
                    {report.sharedIngredients?.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>SHARED INGREDIENTS</div>
                        <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                          {report.sharedIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                        </ul>
                      </>
                    )}
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
