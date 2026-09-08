// Vercel serverless function: GET /api/products?page=1&pageSize=24&search=...&category=...&sort=name
//
// Read-only paginated catalog for the Discover page — real Supabase/Open
// Beauty Facts products only, never the 12 fictional frontend products.
// Uses only the public anon key (RLS grants public SELECT).
//
// Category isn't a stored column (product_attributes.category_id is empty
// for every OBF import), so it can't be a SQL WHERE clause — this fetches
// a bounded, safety-capped set of real rows once, then applies search/
// category/sort/pagination in JS using the SAME normalizeProductCategory()
// as ranking.js, so Discover, the routine, and swap all agree on category.
// The browser only ever receives the one requested page (default 24 rows),
// never the full fetched set.

import { createClient } from "@supabase/supabase-js";
import { normalizeProductCategory, ROUTINE_CATEGORIES } from "../src/lib/ranking.js";
import { fetchProductsByIds } from "../src/lib/canonicalProducts.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const MAX_FETCH = 1000; // safety cap on what THIS SERVER reads from Supabase — never sent to the browser as-is
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("api/products: Supabase is not configured (missing SUPABASE_URL/SUPABASE_ANON_KEY).");
    return res.status(503).json({ error: "Products couldn't be loaded right now." });
  }

  // ?ids=uuid1,uuid2 — full canonical detail (incl. ingredients) for a
  // small set of specific products, e.g. the 1-2 currently selected for
  // Compare. Skips pagination/search/category entirely; not the listing path.
  if (req.query.ids) {
    const ids = String(req.query.ids).split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const products = await fetchProductsByIds(ids);
      return res.status(200).json({ products });
    } catch (err) {
      console.error("api/products (ids lookup): failed:", err.message);
      return res.status(503).json({ error: "Products couldn't be loaded right now." });
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  const search = String(req.query.search || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim().toLowerCase();
  const sortBy = req.query.sort === "brand" ? "brand" : "name";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, obf_barcode, name, image_url, raw_categories_text, brands(name), product_ingredients(position)")
    .eq("source", "open_beauty_facts")
    .limit(MAX_FETCH);

  if (error) {
    console.error("api/products: Supabase query failed:", error.message);
    return res.status(503).json({ error: "Products couldn't be loaded right now." });
  }

  console.log(`api/products: fetched ${rows?.length || 0} row(s) from Supabase; filters: page=${page} pageSize=${pageSize} search="${search}" category="${category}" sort=${sortBy}`);

  let items = (rows || []).map((row) => ({
    id: row.id,
    barcode: row.obf_barcode,
    name: row.name,
    image_url: row.image_url,
    brand: row.brands?.name || null,
    category: normalizeProductCategory({ raw_categories_text: row.raw_categories_text, name: row.name }),
    ingredientCount: (row.product_ingredients || []).length,
  }));

  if (search) {
    items = items.filter((p) => (p.name || "").toLowerCase().includes(search) || (p.brand || "").toLowerCase().includes(search));
  }
  if (category && ROUTINE_CATEGORIES.includes(category)) {
    items = items.filter((p) => p.category === category);
  }

  items.sort((a, b) => (a[sortBy] || "").localeCompare(b[sortBy] || ""));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  console.log(`api/products: ${total} match(es) after filtering, returning ${pageItems.length} for page ${page}/${totalPages}`);

  return res.status(200).json({ products: pageItems, total, page, pageSize, totalPages });
}
