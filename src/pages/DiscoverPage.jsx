import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Filter } from "lucide-react";
import FilterSelect from "../components/FilterSelect.jsx";
import { loadRoutine } from "../lib/routineStorage.js";

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
function ProductImage({ src, name, size = 64 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 16, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>No image</span>
      )}
    </div>
  );
}

// Compact card for the "From your routine" strip — smaller than the main
// catalog card so this section stays a secondary, glanceable summary
// rather than competing with "All products" below it.
function RoutineProductCard({ product }) {
  return (
    <div className="ss-card" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
      <ProductImage src={product.image_url} name={product.name} size={44} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)" }}>{product.brand}</div>
        <div className="ss-serif" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{product.name}</div>
      </div>
    </div>
  );
}

// Same footprint as the original ProductCard (64px image, same padding/gap/
// typography), with fictional-data rows (score, tags, stat bars, view/
// compare buttons — none of which apply to real products yet) simply
// omitted rather than faked. Category + ingredient count are real data.
function RealProductCard({ product }) {
  const subtitleParts = [product.category, product.barcode].filter(Boolean);
  return (
    <div className="ss-card ss-fade" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 64, height: 64, flexShrink: 0 }}>
          <ProductImage src={product.image_url} name={product.name} size={64} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", letterSpacing: 0.2 }}>{product.brand || "Unknown brand"}</div>
          <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{product.name}</div>
          {subtitleParts.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{subtitleParts.join(" · ")}</div>
          )}
        </div>
      </div>
      {product.ingredientCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span className="ss-chip">{product.ingredientCount} ingredients listed</span>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const routineProducts = useMemo(getRoutineProducts, []);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("A–Z");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [status, setStatus] = useState("loading"); // loading | done | error
  const [result, setResult] = useState({ products: [], total: 0, totalPages: 1 });

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
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Discover products</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>Browse the real SkinScout catalog and filter by category.</p>

      {routineProducts.length > 0 && (
        <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          <h2 className="ss-serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>From your routine</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {routineProducts.map((p) => <RoutineProductCard key={p.id} product={p} />)}
          </div>
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
          {status === "done" ? `${result.total} product${result.total === 1 ? "" : "s"}` : " "}
        </span>
        <FilterSelect label="Sort" value={sort} setValue={setSort} options={SORT_OPTIONS} inline />
      </div>

      {status === "loading" && <p style={{ color: "var(--ink-soft)" }}>Loading products…</p>}
      {status === "error" && <p style={{ color: "var(--burgundy)" }}>Products couldn't be loaded right now.</p>}

      {status === "done" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {result.products.map((p) => <RealProductCard key={p.id} product={p} />)}
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
