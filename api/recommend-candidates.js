// Vercel serverless function: POST /api/recommend-candidates
//
// Reads REAL products from Supabase (never the 12 fictional frontend
// products in src/data/products.js), scores them deterministically against
// a saved skin profile, and returns the top candidates per routine category.
// Read-only — never writes to Supabase. Uses only the public anon key (RLS
// already grants public SELECT on every catalog table), the same
// least-privilege choice made for scripts/validate-obf-sample.mjs.
//
// Runs entirely server-side so the frontend never has to fetch/filter the
// full product catalog itself as it grows.

import { createClient } from "@supabase/supabase-js";
import { rankProducts, ROUTINE_CATEGORIES, inferCategoryBucket } from "../src/lib/ranking.js";

// Reuses whichever Supabase env vars are already configured — the VITE_
// prefixed ones (already set for the frontend) work fine here too, since
// Vercel exposes them to serverless functions regardless of prefix. The
// non-prefixed names are just a clearer server-side alias if the team adds
// them later; nothing new needs to be added to Vercel for this to work.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const MAX_PRODUCTS = 200; // generous cap for a ~10-product sample, keeps this bounded as the catalog grows
const TOP_N_PER_CATEGORY = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { profile } = req.body || {};
  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "Missing profile" });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: "Supabase is not configured (missing SUPABASE_URL/SUPABASE_ANON_KEY)." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Single query, joined via Supabase's FK-based embedding: ingredients (for
  // ranking's exclusion/fragrance/ingredient-signal checks) plus
  // product_skin_type_fit / product_concern_fit (empty today for OBF
  // imports, but wired up now so ranking picks them up automatically the
  // moment that data exists — no code change needed later).
  const { data: rows, error } = await supabase
    .from("products")
    .select(
      `id, obf_barcode, name, image_url, raw_categories_text, countries_text,
       brands(name),
       product_ingredients(ingredients(canonical_name)),
       product_skin_type_fit(fit_score, skin_types(key)),
       product_concern_fit(fit_score, concerns(key)),
       product_attributes(price_eur)`
    )
    .eq("source", "open_beauty_facts")
    .limit(MAX_PRODUCTS);

  if (error) {
    console.error("recommend-candidates: Supabase query failed:", error.message);
    return res.status(500).json({ error: "Failed to read products from Supabase." });
  }

  const products = (rows || []).map((row) => ({
    id: row.id,
    obf_barcode: row.obf_barcode,
    name: row.name,
    image_url: row.image_url,
    raw_categories_text: row.raw_categories_text,
    brandName: row.brands?.name || null,
    ingredients: (row.product_ingredients || []).map((pi) => ({ canonical_name: pi.ingredients?.canonical_name })),
    skinTypeFits: (row.product_skin_type_fit || []).map((f) => ({ skin_type_key: f.skin_types?.key, fit_score: f.fit_score })),
    concernFits: (row.product_concern_fit || []).map((f) => ({ concern_key: f.concerns?.key, fit_score: f.fit_score })),
    price_eur: row.product_attributes?.price_eur ?? null,
  }));

  const result = {};
  for (const category of ROUTINE_CATEGORIES) {
    const inCategory = products.filter((p) => inferCategoryBucket(p) === category);
    result[category] = rankProducts(inCategory, profile)
      .slice(0, TOP_N_PER_CATEGORY)
      .map(({ product, score, reasons }) => ({
        id: product.id,
        obf_barcode: product.obf_barcode,
        name: product.name,
        brand: product.brandName,
        image_url: product.image_url,
        score,
        reasons,
        ingredients: product.ingredients, // included so the frontend can run checkRoutineCompatibility without a second fetch
      }));
  }

  return res.status(200).json(result);
}
