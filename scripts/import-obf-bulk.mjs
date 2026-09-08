#!/usr/bin/env node
// SkinScout — bulk Open Beauty Facts import (SOURCE data only)
//
// Pragmatic expansion of scripts/import-obf-sample.mjs: pulls up to 300
// real facial skincare products instead of ~10, using OBF's category
// LISTING endpoint only (no per-barcode follow-up calls, unlike the sample
// script) so the fetch side stays a handful of requests instead of
// thousands — the listing response already includes everything we write
// to Supabase (name, brand, barcode, categories, ingredients text, image).
// Deliberately not a general-purpose bulk importer: fixed category list,
// no pagination beyond a small per-category cap. Good enough for a demo,
// not meant to scale to "all of OBF" (see the project notes on using OBF's
// bulk dumps instead, for that).
//
// Writes are batched per CHUNK_SIZE products (brands/products/ingredients
// each upserted in one call per chunk, product_ingredients deleted+upserted
// in one call per chunk) instead of one network round trip per row — this
// is what actually makes 300 products fast. Every upsert is deduplicated in
// memory by its natural conflict key first: Postgres's ON CONFLICT DO
// UPDATE rejects a multi-row upsert that targets the same conflict key
// twice in one statement ("ON CONFLICT DO UPDATE command cannot affect row
// a second time"), and a product's own OBF ingredient list frequently
// repeats the same ingredient at two positions, which is exactly what was
// breaking product_ingredients before (a plain, non-upserting .insert()
// hitting its (product_id, ingredient_id) unique constraint).
//
// Writes ONLY [SOURCE] data — brands/products/ingredients/product_ingredients
// — same as import-obf-sample.mjs. Never touches product_attributes,
// product_skin_type_fit, product_concern_fit, ingredient_functions,
// compatibility_rules or product_ai_profiles.
//
// Idempotent: every write is an upsert on a natural key (normalized_name /
// obf_barcode / canonical_name / product_id+ingredient_id), so running this
// twice never duplicates brands/products/ingredients.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-obf-bulk.mjs
// or via the "Import OBF bulk catalog" GitHub Actions workflow
// (.github/workflows/import-obf-bulk.yml) — unchanged, same secrets.

import { createClient } from "@supabase/supabase-js";

const OBF_BASE_URL = "https://world.openbeautyfacts.org";
const USER_AGENT =
  process.env.OBF_USER_AGENT || "SkinScout-Import/0.1 (+https://github.com/luciamartin99/skinscout)";

// Confirmed live (2026-09) to return real, non-trivial product counts.
// "skin-care" is a broad catch-all that picks up serums/treatments/etc.
// that don't have their own well-populated OBF category slug — exact
// routine-slot bucketing (cleanser/serum/treatment/moisturizer/sunscreen)
// happens later, dynamically, in src/lib/ranking.js's inferCategoryBucket —
// this list only needs to source relevant *raw material*, not perfectly
// pre-sort it.
const SOURCE_CATEGORIES = [
  { slug: "cleansers", maxPages: 4 },
  { slug: "sunscreens", maxPages: 4 },
  { slug: "face-creams", maxPages: 4 },
  { slug: "skin-care", maxPages: 2 },
];
const PAGE_SIZE = 100;
const FIELDS =
  "code,product_name,product_name_en,brands,quantity,image_url,categories,categories_tags,ingredients_text,ingredients,countries,labels,lang,last_modified_t";

// OBF's documented rate limit for search/listing-type queries is 10/min/IP.
// 6.5s between requests keeps us comfortably under that with margin.
const REQUEST_DELAY_MS = 6500;

// Demo cap, per the fast-fix requirement: exactly 300, not 300-1000.
const TARGET_COUNT = 300;

// Products are written in chunks of 50 (brands/products/ingredients/links
// upserted once per chunk, not once per product) — this is what keeps the
// write side to ~5 requests per 50 products instead of ~50+ each. 50 also
// lines up with the requested "Imported 50/300" progress-log cadence.
const CHUNK_SIZE = 50;

// Reject anything tagged/named like these — makeup, hair, perfume, nail,
// oral care are explicitly out of scope for a facial-skincare MVP catalog.
const EXCLUDE_KEYWORDS = [
  "makeup", "make-up", "lipstick", "mascara", "foundation", "eyeshadow", "eyeliner", "blush", "concealer",
  "nail-polish", "nail-care", "nail-varnish", "manicure",
  "shampoo", "hair-care", "hair-color", "hair-dye", "conditioner", "hairspray", "hair-gel",
  "perfume", "eau-de-parfum", "eau-de-toilette", "cologne", "fragrances-for",
  "toothpaste", "mouthwash", "oral-care", "dental-care", "dental",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function obfFetch(path) {
  const res = await fetch(`${OBF_BASE_URL}${path}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`OBF request failed (${res.status} ${res.statusText}): ${path}`);
  return res.json();
}

function isExcluded(raw) {
  const haystack = `${(raw.categories_tags || []).join(" ")} ${raw.product_name || ""}`.toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => haystack.includes(kw));
}

function completenessScore(raw) {
  let n = 0;
  if (raw.product_name || raw.product_name_en) n++;
  if (raw.code) n++;
  if (raw.categories || (raw.categories_tags || []).length > 0) n++;
  if (raw.ingredients_text) n++;
  if (raw.image_url) n++;
  return n;
}

async function fetchAllCandidates() {
  const byBarcode = new Map();

  for (const { slug, maxPages } of SOURCE_CATEGORIES) {
    for (let page = 1; page <= maxPages; page++) {
      await sleep(REQUEST_DELAY_MS);
      let listing;
      try {
        listing = await obfFetch(`/category/${slug}.json?page=${page}&page_size=${PAGE_SIZE}&fields=${FIELDS}`);
      } catch (err) {
        console.error(`  [ERROR] ${slug} page ${page}: ${err.message}`);
        break;
      }
      const products = listing.products || [];
      console.log(`  ${slug} page ${page}: ${products.length} product(s) (category total: ${listing.count})`);
      for (const raw of products) {
        if (raw.code && !byBarcode.has(raw.code)) byBarcode.set(raw.code, raw);
      }
      if (products.length < PAGE_SIZE) break; // reached the end of this category
    }
  }

  return [...byBarcode.values()];
}

// ---------------------------------------------------------------------------
// Normalization — identical philosophy to import-obf-sample.mjs: only store
// what OBF actually gave us, never infer a missing field.
// ---------------------------------------------------------------------------

function normalizeProduct(raw) {
  const name = raw.product_name || raw.product_name_en || null;
  const brandsRaw = raw.brands || null;
  const brandNames = brandsRaw ? brandsRaw.split(",").map((b) => b.trim()).filter(Boolean) : [];
  const primaryBrand = brandNames[0] || null;

  return {
    primaryBrand,
    product: {
      obf_barcode: raw.code,
      name,
      quantity_raw: raw.quantity || null,
      image_url: raw.image_url || null,
      raw_categories_text: raw.categories || null,
      raw_ingredients_text: raw.ingredients_text || null,
      raw_labels_text: raw.labels || null,
      countries_text: raw.countries || null,
      lang: raw.lang || null,
      source: "open_beauty_facts",
      obf_last_modified_at: raw.last_modified_t ? new Date(raw.last_modified_t * 1000).toISOString() : null,
      imported_at: new Date().toISOString(),
    },
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
  };
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

// Keeps the FIRST occurrence for each key — used before every batch
// upsert, since Postgres rejects a multi-row upsert that targets the same
// ON CONFLICT key twice in one statement.
function dedupeBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (key === null || key === undefined || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Batched writes — one call per chunk per table, not one call per row.
// ---------------------------------------------------------------------------

async function upsertBrandsChunk(supabase, names) {
  const rows = dedupeBy(
    names.filter(Boolean).map((name) => ({ name, normalized_name: name.toLowerCase().trim(), source: "open_beauty_facts" })),
    (r) => r.normalized_name
  );
  if (rows.length === 0) return new Map();
  const { data, error } = await supabase.from("brands").upsert(rows, { onConflict: "normalized_name" }).select("id, normalized_name");
  if (error) throw new Error(`brands batch: ${error.message}`);
  return new Map(data.map((r) => [r.normalized_name, r.id]));
}

async function upsertIngredientsChunk(supabase, items) {
  const rows = dedupeBy(
    items
      .map((item) => ({ canonical_name: (item.text || item.id || "").trim(), obf_tag: item.id || null, source: "open_beauty_facts" }))
      .filter((r) => r.canonical_name),
    (r) => r.canonical_name
  );
  if (rows.length === 0) return new Map();
  const { data, error } = await supabase.from("ingredients").upsert(rows, { onConflict: "canonical_name" }).select("id, canonical_name");
  if (error) throw new Error(`ingredients batch: ${error.message}`);
  return new Map(data.map((r) => [r.canonical_name, r.id]));
}

async function upsertProductsChunk(supabase, productRows) {
  const rows = dedupeBy(productRows, (r) => r.obf_barcode);
  if (rows.length === 0) return new Map();
  const { data, error } = await supabase.from("products").upsert(rows, { onConflict: "obf_barcode" }).select("id, obf_barcode");
  if (error) throw new Error(`products batch: ${error.message}`);
  return new Map(data.map((r) => [r.obf_barcode, r.id]));
}

async function replaceProductIngredientsChunk(supabase, productIds, linkRows) {
  if (productIds.length > 0) {
    const { error: deleteError } = await supabase.from("product_ingredients").delete().in("product_id", productIds);
    if (deleteError) throw new Error(`clear links batch: ${deleteError.message}`);
  }
  // Deduplicate by the pair Postgres actually enforces uniqueness on
  // (product_id, ingredient_id) — this is the fix for the duplicate
  // ingredient-link errors: a product's own ingredient list can repeat the
  // same ingredient at two positions, which used to produce two rows with
  // the same pair and no way to reconcile them via a plain insert.
  const deduped = dedupeBy(linkRows, (r) => `${r.product_id}::${r.ingredient_id}`);
  if (deduped.length === 0) return;
  const { error: insertError } = await supabase
    .from("product_ingredients")
    .upsert(deduped, { onConflict: "product_id,ingredient_id", ignoreDuplicates: true });
  if (insertError) throw new Error(`insert links batch: ${insertError.message}`);
}

async function importChunk(supabase, items) {
  const normalized = items.map(normalizeProduct).filter((n) => n.product.name);

  // 1. Brands — one batch upsert for the whole chunk.
  const brandMap = await upsertBrandsChunk(supabase, normalized.map((n) => n.primaryBrand));

  // 2. Products — one batch upsert for the whole chunk, brand_id resolved locally.
  const productRows = normalized.map((n) => ({
    ...n.product,
    brand_id: n.primaryBrand ? brandMap.get(n.primaryBrand.toLowerCase().trim()) || null : null,
  }));
  const productIdByBarcode = await upsertProductsChunk(supabase, productRows);

  // 3. Ingredients — one batch upsert across every product's ingredient list in the chunk.
  const allIngredientItems = normalized.flatMap((n) => n.ingredients);
  const ingredientIdByName = await upsertIngredientsChunk(supabase, allIngredientItems);

  // 4. product_ingredients — delete old links for this chunk's products, then
  // batch-upsert the new ones (deduplicated — see replaceProductIngredientsChunk).
  const linkRows = [];
  for (const n of normalized) {
    const productId = productIdByBarcode.get(n.product.obf_barcode);
    if (!productId) continue;
    n.ingredients.forEach((item, i) => {
      const canonical_name = (item.text || item.id || "").trim();
      const ingredientId = canonical_name ? ingredientIdByName.get(canonical_name) : null;
      if (!ingredientId) return;
      linkRows.push({
        product_id: productId,
        ingredient_id: ingredientId,
        position: i + 1,
        raw_text_fragment: item.text || null,
        percent_estimate: item.percent_estimate ?? null,
      });
    });
  }
  await replaceProductIngredientsChunk(supabase, [...productIdByBarcode.values()], linkRows);

  return { imported: productIdByBarcode.size, skipped: items.length - productIdByBarcode.size };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("Fetching category listings from Open Beauty Facts...");
  const raw = await fetchAllCandidates();
  console.log(`Fetched ${raw.length} unique barcode(s) across ${SOURCE_CATEGORIES.length} categories.`);

  const relevant = raw.filter((r) => r.code && (r.product_name || r.product_name_en) && !isExcluded(r));
  console.log(`${relevant.length} remain after requiring barcode+name and excluding makeup/hair/perfume/nail/oral.`);

  relevant.sort((a, b) => completenessScore(b) - completenessScore(a));
  const selected = relevant.slice(0, TARGET_COUNT);
  if (selected.length < TARGET_COUNT) {
    console.warn(`WARNING: only ${selected.length} valid product(s) available, below the ${TARGET_COUNT} target.`);
  }
  console.log(`Importing ${selected.length} product(s) in chunks of ${CHUNK_SIZE}.`);

  let imported = 0;
  let skipped = 0;

  for (const batch of chunk(selected, CHUNK_SIZE)) {
    try {
      const result = await importChunk(supabase, batch);
      imported += result.imported;
      skipped += result.skipped;
    } catch (err) {
      console.error(`  [ERROR] chunk failed, skipping its ${batch.length} product(s): ${err.message}`);
      skipped += batch.length;
    }

    console.log(`Imported ${Math.min(imported, TARGET_COUNT)}/${TARGET_COUNT}`);

    if (imported >= TARGET_COUNT) break; // stop once the target is met, even if candidates remain
  }

  console.log(`\nDone. Imported/updated ${imported} product(s), skipped ${skipped}.`);
  console.log("Reminder: only [SOURCE] tables were written. No fit/compatibility/AI-score tables were touched.");
}

main().catch((err) => {
  console.error("Bulk import failed:", err);
  process.exit(1);
});
