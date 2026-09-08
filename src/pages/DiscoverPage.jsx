import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { PRODUCTS, SKIN_TYPES, CONCERNS, CATEGORIES } from "../data/products.js";
import ProductCard from "../components/ProductCard.jsx";
import FilterSelect from "../components/FilterSelect.jsx";
import { loadRoutine } from "../lib/routineStorage.js";

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

function RoutineProductCard({ product }) {
  return (
    <div className="ss-card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 10, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>No image</span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)" }}>{product.brand}</div>
        <div className="ss-serif" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{product.name}</div>
      </div>
    </div>
  );
}

export default function DiscoverPage({ onView, onCompare, compareIds }) {
  const routineProducts = useMemo(getRoutineProducts, []);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [skinType, setSkinType] = useState("All");
  const [concern, setConcern] = useState("All");
  const [price, setPrice] = useState("All");
  const [fragFree, setFragFree] = useState(false);
  const [sort, setSort] = useState("Highest rated");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (q && !(`${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (category !== "All" && p.category !== category) return false;
      if (skinType !== "All" && !p.skinTypes.includes(skinType)) return false;
      if (concern !== "All" && !p.concerns.includes(concern)) return false;
      if (fragFree && !p.fragranceFree) return false;
      if (price === "Budget" && p.price > 20) return false;
      if (price === "Mid-range" && (p.price <= 20 || p.price > 30)) return false;
      if (price === "Premium" && p.price <= 30) return false;
      return true;
    });
    const sorters = {
      "Highest rated": (a, b) => b.rating - a.rating,
      "Best value": (a, b) => b.stats.value - a.stats.value,
      "Most hydrating": (a, b) => b.stats.hydration - a.stats.hydration,
      "Best for sensitive skin": (a, b) => b.stats.sensitivity - a.stats.sensitivity,
    };
    return [...list].sort(sorters[sort]);
  }, [q, category, skinType, concern, price, fragFree, sort]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Discover products</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>Browse the full SkinScout roster and filter by what your skin needs.</p>

      {routineProducts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="ss-serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>From your routine</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {routineProducts.map((p) => <RoutineProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 480 }}>
        <Search size={17} style={{ position: "absolute", left: 16, top: 14, color: "var(--ink-soft)" }} />
        <input className="ss-input" style={{ paddingLeft: 42 }} placeholder="Search cleansers, serums, moisturisers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <button className="ss-btn ss-btn-outline" style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px" }} onClick={() => setShowFilters(!showFilters)}>
        <Filter size={15} /> Filters {showFilters ? "▴" : "▾"}
      </button>

      {showFilters && (
        <div className="ss-card ss-fade" style={{ padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16 }}>
          <FilterSelect label="Category" value={category} setValue={setCategory} options={["All", ...CATEGORIES]} />
          <FilterSelect label="Skin type" value={skinType} setValue={setSkinType} options={["All", ...SKIN_TYPES]} />
          <FilterSelect label="Primary concern" value={concern} setValue={setConcern} options={["All", ...CONCERNS]} />
          <FilterSelect label="Price range" value={price} setValue={setPrice} options={["All", "Budget", "Mid-range", "Premium"]} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", marginTop: 22 }}>
            <input type="checkbox" checked={fragFree} onChange={(e) => setFragFree(e.target.checked)} /> Fragrance-free only
          </label>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{filtered.length} products</span>
        <FilterSelect label="Sort" value={sort} setValue={setSort} options={["Highest rated", "Best value", "Most hydrating", "Best for sensitive skin"]} inline />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onView={onView} onCompare={onCompare} compareActive={compareIds.includes(p.id)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--ink-soft)" }}>
            No products match those filters yet. Try widening your search.
          </div>
        )}
      </div>
    </div>
  );
}
