import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Filter, Sparkles } from "lucide-react";
import FilterSelect from "../components/FilterSelect.jsx";
import ScorePill from "../components/ScorePill.jsx";
import ScoreBar from "../components/ScoreBar.jsx";
import { loadRoutine } from "../lib/routineStorage.js";
import { loadSkinProfile } from "../lib/skinProfile.js";
import { calculateOverallScore } from "../lib/productScoring.js";

const CATEGORY_OPTIONS = ["All", "cleanser", "serum", "treatment", "moisturizer", "sunscreen"];
const SORT_OPTIONS = ["A–Z", "Brand"];
const PAGE_SIZE = 24;

// Real Supabase products from the last generated routine, exactly as
// returned by api/generate-routine.js (id/name/brand/image_url/barcode) —
// no duplicate objects, nothing from Claude's free text. Deduped by id
// since the same product can legitimately appear in both AM and PM.
function getRoutineProducts() {
  const routine = loadRoutine();
  if (!routine) return [];
  const steps = [...(routine.morning || []), ...(routine.evening || [])];
  const seen = new Map();
  for (const step of steps) {
    if (step.product && !seen.has(step.product.id)) seen.set(step.product.id, step.product);
  }
  return [...seen.values()];
}

// Same neutral placeholder treatment already used on the routine page when
// no image_url is available — never invent an image.
function ProductImage({ src, name, size = 64, frame = false }) {
  return (
    <div className={frame ? "ss-img-frame" : ""} style={{ width: size, height: size, borderRadius: 16, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>No image</span>
      )}
    </div>
  );
}

function CompareButton({ active, disabled, onClick, style }) {
  return (
    <button
      className="ss-btn"
      style={{ flex: 1, fontSize: 13.5, padding: "10px 14px", background: active ? "var(--burgundy)" : "var(--beige)", color: active ? "#fff" : "var(--ink)", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style }}
      onClick={onClick}
      disabled={disabled}
    >
      {active ? "Remove" : "Add to comparison"}
    </button>
  );
}

// Compact card for the "From your routine" strip — smaller than the main
// catalog card so this section stays a secondary, glanceable summary
// rather than competing with "All products" below it.
function RoutineProductCard({ product, compareActive, onCompare, compareFull }) {
  return (
    <div className="ss-card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ProductImage src={product.image_url} name={product.name} size={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)" }}>{product.brand}</div>
          <div className="ss-serif" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{product.name}</div>
        </div>
      </div>
      <CompareButton active={compareActive} disabled={!compareActive && compareFull} onClick={() => onCompare(product.id)} />
    </div>
  );
}

// Restores the original SkinScout card layout: image + brand/name at top
// with an overall score pill, three deterministic parameter bars in the
// middle (src/lib/productScoring.js — real ingredient data, never the old
// fictional 0-100 values), and View profile / Add to comparison at the
// bottom. No ingredient count shown as a headline number.
function RealProductCard({ product, profile, compareActive, onCompare, compareFull, onView }) {
  const overall = useMemo(() => calculateOverallScore(product, profile), [product, profile]);
  const components = new Map((overall.components || []).map((c) => [c.key, c.score]));

  return (
    <div
      className="ss-card ss-card-interactive ss-fade"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: compareActive ? "1.5px solid var(--burgundy)" : "1px solid var(--line)",
        background: compareActive ? "rgba(243,221,228,0.45)" : "var(--card)",
      }}
    >
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 68, height: 68, flexShrink: 0 }}>
          <ProductImage src={product.image_url} name={product.name} size={68} frame />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", letterSpacing: 0.2 }}>{product.brand || "Unknown brand"}</div>
          <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{product.name}</div>
          {product.category && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{product.category}</div>}
        </div>
        {typeof overall.score === "number" ? (
          <ScorePill score={overall.score} />
        ) : (
          <span style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic", whiteSpace: "nowrap" }}>Limited data</span>
        )}
      </div>
      <div>
        <ScoreBar label="Hydration" score={components.get("hydration")} />
        <ScoreBar label="Formula profile" score={components.get("formulaProfile")} />
        <ScoreBar label="Sensitive-skin fit" score={components.get("sensitiveSkinFit")} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button className="ss-btn ss-btn-primary" style={{ flex: 1, fontSize: 13.5, padding: "10px 14px" }} onClick={() => onView(product.id)}>View profile</button>
        <CompareButton active={compareActive} disabled={!compareActive && compareFull} onClick={() => onCompare(product.id)} />
      </div>
    </div>
  );
}

export default function DiscoverPage({ onCompare, compareIds, setView, onView }) {
  const routineProducts = useMemo(getRoutineProducts, []);
  const skinProfile = useMemo(loadSkinProfile, []);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("A–Z");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [status, setStatus] = useState("loading"); // loading | done | error
  const [result, setResult] = useState({ products: [], total: 0, totalPages: 1 });

  const compareFull = compareIds.length >= 2;

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => setPage(1), [search, category, sort]);

  // requestIdRef guards against a stale response overwriting a newer one —
  // changing a filter resets `page` in the effect above, which fires this
  // effect a second time (old page, then page 1) before the reset commits.
  // Only the response for the LATEST fired request is ever applied.
  const requestIdRef = useRef(0);
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort: sort === "Brand" ? "brand" : "name",
    });
    if (search.trim()) params.set("search", search.trim());
    if (category !== "All") params.set("category", category);

    fetch(`/api/products?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Request failed");
        return res.json();
      })
      .then((data) => {
        if (requestId !== requestIdRef.current) return; // a newer request superseded this one
        setResult(data);
        setStatus("done");
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
      });
  }, [search, category, sort, page]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 80px" }}>
      <span className="ss-eyebrow">Discover</span>
      <h1 className="ss-serif" style={{ fontSize: "clamp(28px,4vw,32px)", fontWeight: 600, margin: "10px 0 8px" }}>Discover products</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 32 }}>Explore skincare products matched to the SkinScout approach.</p>

      {routineProducts.length > 0 && (
        <div style={{ marginBottom: 32, paddingBottom: 28, borderBottom: "1px solid var(--line)" }}>
          <span className="ss-eyebrow" style={{ marginBottom: 10, display: "block" }}>From your routine</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {routineProducts.map((p) => (
              <RoutineProductCard key={p.id} product={p} compareActive={compareIds.includes(p.id)} onCompare={onCompare} compareFull={compareFull} />
            ))}
          </div>
        </div>
      )}

      {compareIds.length === 2 && (
        <div className="ss-card ss-fade" style={{ padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "var(--sage-lt)" }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--forest-dk)" }}>2 products selected for comparison</span>
          <button className="ss-btn ss-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px" }} onClick={() => setView("compare")}>
            <Sparkles size={14} /> Compare products
          </button>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 480 }}>
        <Search size={17} style={{ position: "absolute", left: 16, top: 14, color: "var(--ink-soft)" }} />
        <input
          className="ss-input" style={{ paddingLeft: 42 }}
          placeholder="Search by product name or brand…"
          value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <button className="ss-btn ss-btn-outline" style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px" }} onClick={() => setShowFilters(!showFilters)}>
        <Filter size={15} /> Filters {showFilters ? "▴" : "▾"}
      </button>

      {showFilters && (
        <div className="ss-card ss-fade" style={{ padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16 }}>
          <FilterSelect label="Category" value={category} setValue={setCategory} options={CATEGORY_OPTIONS} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
          {status === "done" ? `${result.total} product${result.total === 1 ? "" : "s"}` : " "}
        </span>
        <FilterSelect label="Sort" value={sort} setValue={setSort} options={SORT_OPTIONS} inline />
      </div>

      {status === "loading" && (
        <>
          <p style={{ textAlign: "center", color: "var(--ink-soft)", marginBottom: 20 }}>Finding your best matches…</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ss-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div className="ss-skeleton" style={{ width: 68, height: 68, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                    <div className="ss-skeleton" style={{ height: 10, width: "40%" }} />
                    <div className="ss-skeleton" style={{ height: 14, width: "80%" }} />
                  </div>
                </div>
                <div className="ss-skeleton" style={{ height: 7, width: "100%" }} />
                <div className="ss-skeleton" style={{ height: 7, width: "100%" }} />
                <div className="ss-skeleton" style={{ height: 7, width: "100%" }} />
              </div>
            ))}
          </div>
        </>
      )}
      {status === "error" && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-soft)" }}>
          We couldn't load products right now — please try again shortly.
        </div>
      )}

      {status === "done" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {result.products.map((p) => (
              <RealProductCard
                key={p.id}
                product={p}
                profile={skinProfile}
                compareActive={compareIds.includes(p.id)}
                onCompare={onCompare}
                compareFull={compareFull}
                onView={onView}
              />
            ))}
            {result.products.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--ink-soft)" }}>
                No products found.
              </div>
            )}
          </div>

          {result.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 24 }}>
              <button className="ss-btn ss-btn-outline" style={{ padding: "8px 14px" }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>Page {result.page} of {result.totalPages}</span>
              <button className="ss-btn ss-btn-outline" style={{ padding: "8px 14px" }} disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
