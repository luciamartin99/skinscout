// Shared server-side helper: real Supabase products, deterministically
// ranked. Used by both api/recommend-candidates.js and api/generate-routine.js
// so the query/normalization logic can't drift between the two routes.
// Server-only (reads process.env) — never import this from src/pages or
// any browser-rendered code.

import { createClient } from "@supabase/supabase-js";
import { rankProducts, ROUTINE_CATEGORIES, inferCategoryBucket } from "./ranking.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export async function fetchRankedCandidatesByCategory(profile, { topN = 3, maxProducts = 200 } = {}) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured (missing SUPABASE_URL/SUPABASE_ANON_KEY).");
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    .limit(maxProducts);

  if (error) {
    throw new Error(`Failed to read products from Supabase: ${error.message}`);
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
      .slice(0, topN)
      .map(({ product, score, reasons }) => ({
        id: product.id,
        obf_barcode: product.obf_barcode,
        name: product.name,
        brand: product.brandName,
        image_url: product.image_url,
        score,
        reasons,
        ingredients: product.ingredients,
      }));
  }
  return result;
}
