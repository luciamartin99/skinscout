// Server-only. The ONE canonical shape for a real product, used everywhere
// a real product is displayed or reasoned about: { id, barcode, name,
// brand, image_url, category, ingredients, price_eur }. Category comes
// from the same normalizeProductCategory() ranking.js uses, so Discover/
// Compare/the routine/swap can never disagree about what category a
// product is. price_eur lives in product_attributes, which is empty for
// every current OBF import — it comes through as null until that's
// populated; nothing here ever invents a price.
//
// Never import this from src/pages or any browser-rendered code — it reads
// process.env and creates its own Supabase client. Frontend code that needs
// canonical product detail calls GET /api/products?ids=... instead, which
// uses this internally.

import { createClient } from "@supabase/supabase-js";
import { normalizeProductCategory } from "./ranking.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export async function fetchProductsByIds(ids) {
  const cleanIds = (ids || []).filter(Boolean);
  if (cleanIds.length === 0) return [];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured (missing SUPABASE_URL/SUPABASE_ANON_KEY).");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: rows, error } = await supabase
    .from("products")
    .select("id, obf_barcode, name, image_url, raw_categories_text, brands(name), product_ingredients(position, ingredients(canonical_name)), product_attributes(price_eur)")
    .in("id", cleanIds)
    .eq("source", "open_beauty_facts");

  if (error) throw new Error(`Failed to fetch products by id: ${error.message}`);

  return (rows || []).map((row) => ({
    id: row.id,
    barcode: row.obf_barcode,
    name: row.name,
    brand: row.brands?.name || null,
    image_url: row.image_url,
    category: normalizeProductCategory({ raw_categories_text: row.raw_categories_text, name: row.name }),
    ingredients: (row.product_ingredients || [])
      .sort((a, b) => a.position - b.position)
      .map((pi) => pi.ingredients?.canonical_name)
      .filter(Boolean),
    price_eur: row.product_attributes?.price_eur ?? null,
  }));
}
