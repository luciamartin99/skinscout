import { useState, useEffect, useMemo, useRef } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
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

function ProductImage({ src, name, size = 52 }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 10, overflow: "hidden", background: "var(--sage-lt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>No image</span>
      )}
    </div>
  );
}

function RoutineProductCard({ product }) {
  return (
    <div className="ss-card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
      <ProductImage src={product.image_url} name={product.name} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)" }}>{product.brand}</div>
        <div className="ss-serif" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{product.name}</div>
      </div>
    </div>
  );
}

// Real catalog card — deliberately shows only what's real: image, brand,
// name, canonical category, barcode, and whether an ingredient list is on
// file. No 0-100 score, no tags, no price — this app has no real price
// data yet, and inventing one would be exactly the kind of fictional data
// this rework is removing.
function RealProductCard({ product }) {
  return (
    <div className="ss-card ss-fade" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <ProductImage src={product.image_url} name={product.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", letterSpacing: 0.2 }}>{product.brand || "Unknown brand"}</div>
          <div className="ss-serif" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{product.name}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {product.category && <span className="ss-chip">{product.category}</span>}
        {product.ingredientCount > 0 && <span className="ss-chip">{product.ingredientCount} ingredients listed</span>}
      </div>
      {product.barcode && <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Barcode: {product.barcode}</div>}
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
        <div style={{ marginBottom: 32 }}>
          <h2 className="ss-serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>From your routine</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {routineProducts.map((p) => <RoutineProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <h2 className="ss-serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>All products</h2>

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 480 }}>
        <Search size={17} style={{ position: "absolute", left: 16, top: 14, color: "var(--ink-soft)" }} />
        <input
          className="ss-input" style={{ paddingLeft: 42 }}
          placeholder="Search by product name or brand…"
          value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <FilterSelect label="Category" value={category} setValue={setCategory} options={CATEGORY_OPTIONS} />
        <FilterSelect label="Sort" value={sort} setValue={setSort} options={SORT_OPTIONS} />
      </div>

      {status === "loading" && <p style={{ color: "var(--ink-soft)" }}>Loading products…</p>}
      {status === "error" && <p style={{ color: "var(--burgundy)" }}>Products couldn't be loaded right now.</p>}

      {status === "done" && (
        <>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 14 }}>{result.total} product{result.total === 1 ? "" : "s"}</div>

          {result.products.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--ink-soft)" }}>No products found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 24 }}>
              {result.products.map((p) => <RealProductCard key={p.id} product={p} />)}
            </div>
          )}

          {result.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
              <button className="ss-btn ss-btn-outline" style={{ padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 4 }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={15} /> Prev
              </button>
              <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>Page {result.page} of {result.totalPages}</span>
              <button className="ss-btn ss-btn-outline" style={{ padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 4 }} disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
