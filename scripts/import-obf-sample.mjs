#!/usr/bin/env node
// SkinScout — Open Beauty Facts sample import (SOURCE data only)
//
// Fetches a small, fixed-size sample of skincare products from Open Beauty
// Facts and writes ONLY [SOURCE] data (see supabase/migrations/0001_init_schema.sql)
// into brands, products, ingredients and product_ingredients.
//
// Deliberately does NOT touch: product_attributes, product_skin_type_fit,
// product_concern_fit, ingredient_functions, compatibility_rules or
// product_ai_profiles. Those are SkinScout-derived/AI layers, out of scope
// for this script.
//
// Server-side only. Requires the Supabase SERVICE ROLE key (the anon key
// cannot write — RLS currently only grants public SELECT). Never import
// this file or its dependencies from src/ (the Vite-bundled frontend).
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-obf-sample.mjs
// or via the "Import OBF sample" GitHub Actions workflow
// (.github/workflows/import-obf-sample.yml), which reads the same two
// variables from encrypted repository secrets — see that file for how to
// trigger it without ever pasting the key anywhere.
//
// Safe to re-run: brands/products/ingredients are upserted on their unique
// natural keys (normalized_name / obf_barcode / canonical_name), and each
// product's ingredient links are fully replaced (delete-then-insert) rather
// than appended, so running this twice does not create duplicates.

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Open Beauty Facts has its own dedicated domain for cosmetics — using it
// (rather than world.openfoodfacts.org?product_type=all) keeps this import
// scoped to beauty/skincare data only, per OBF's own documentation:
// https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/
const OBF_BASE_URL = "https://world.openbeautyfacts.org";

// Category slug to sample from. Confirmed live via
// https://world.openbeautyfacts.org/category/skin-care.json (returns a
// {count, page, page_size, products: [...]} shape).
const OBF_CATEGORY = "skin-care";

// "Around 10" per the task — kept as a named constant, not a magic number,
// so raising it later for a bigger test is a one-line change.
const SAMPLE_SIZE = 10;

// Open Food Facts/Open Beauty Facts require a custom User-Agent identifying
// the app for ALL requests (no other auth needed for reads). Deliberately
// points at the repo rather than a personal email, since this script lives
// in a public repository — override with OBF_USER_AGENT if the team wants
// a monitored contact address instead.
const USER_AGENT =
  process.env.OBF_USER_AGENT || "SkinScout-Import/0.1 (+https://github.com/luciamartin99/skinscout)";

// Documented rate limits: 15 req/min/IP for product reads, 10 req/min/IP for
// search/listing queries (https://openfoodfacts.github.io/openfoodfacts-server/api/).
// This script only ever makes ~1 + SAMPLE_SIZE requests total, but we still
// space them out politely rather than firing them back-to-back.
const REQUEST_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function obfFetch(path) {
  const res = await fetch(`${OBF_BASE_URL}${path}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`OBF request failed (${res.status} ${res.statusText}): ${path}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Supabase client — service role, server-side only
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. This script must be run with both set " +
      "(e.g. via the import-obf-sample GitHub Actions workflow, or a local .env.local that is never committed)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ---------------------------------------------------------------------------
// Step 1 — fetch the sample from Open Beauty Facts
// ---------------------------------------------------------------------------

async function fetchSampleBarcodes() {
  // Slim listing request first (fields=code limits the payload, per OBF's
  // documented `fields` query param) just to get the barcodes for our sample.
  const listing = await obfFetch(
    `/category/${OBF_CATEGORY}.json?page_size=${SAMPLE_SIZE}&fields=code,product_name`
  );
  const products = listing.products || [];
  console.log(`Category "${OBF_CATEGORY}" reports ${listing.count} total products; sampling ${products.length}.`);
  return products.map((p) => p.code).filter(Boolean);
}

async function fetchFullProduct(barcode) {
  // Full per-barcode record — this is where the structured `ingredients`
  // array (with percent_estimate when OBF has it) actually lives; the
  // category listing above does not reliably include it.
  const result = await obfFetch(`/api/v2/product/${barcode}.json`);
  if (result.status !== 1 || !result.product) {
    return null;
  }
  return result.product;
}

// ---------------------------------------------------------------------------
// Step 2 — normalize OBF's raw shape into our [SOURCE] schema, logging gaps
// ---------------------------------------------------------------------------

function normalizeProduct(raw) {
  const missing = [];

  const name = raw.product_name || raw.product_name_en || null;
  if (!name) missing.push("product_name");

  const brandsRaw = raw.brands || null;
  if (!brandsRaw) missing.push("brands");
  // OBF's `brands` field is a free-text, comma-separated list (no stable
  // brand ID). Our schema is one brand per product, so we take the first
  // and log the rest rather than guessing which one is "primary".
  const brandNames = brandsRaw ? brandsRaw.split(",").map((b) => b.trim()).filter(Boolean) : [];
  const primaryBrand = brandNames[0] || null;
  if (brandNames.length > 1) {
    console.log(`  [NOTE] ${raw.code}: multiple brands listed (${brandsRaw}); using "${primaryBrand}" only.`);
  }

  if (!raw.quantity) missing.push("quantity");
  if (!raw.image_url) missing.push("image_url");
  if (!raw.categories) missing.push("categories");
  if (!raw.ingredients_text) missing.push("ingredients_text");
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0) missing.push("ingredients (structured array)");
  if (!raw.countries) missing.push("countries");
  if (!raw.labels) missing.push("labels");
  if (!raw.lang) missing.push("lang");

  return {
    missing,
    primaryBrand,
    product: {
      obf_barcode: raw.code,
      name,
      generic_name: raw.generic_name || null,
      quantity_raw: raw.quantity || null,
      image_url: raw.image_url || null,
      raw_categories_text: raw.categories || null,
      raw_ingredients_text: raw.ingredients_text || null,
      // Deliberately NOT falling back to labels_tags when `labels` (the raw
      // string) is absent — that would be reformatting/inferring a value
      // OBF didn't directly give us for this field.
      raw_labels_text: raw.labels || null,
      countries_text: raw.countries || null,
      lang: raw.lang || null,
      source: "open_beauty_facts",
      obf_last_modified_at: raw.last_modified_t ? new Date(raw.last_modified_t * 1000).toISOString() : null,
      imported_at: new Date().toISOString(),
    },
    // Only present when OBF gives us the structured array — we do not parse
    // ingredients_text ourselves when this is missing (see normalizeProduct
    // caller for how that's handled).
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
  };
}

// ---------------------------------------------------------------------------
// Step 3 — idempotent writes
// ---------------------------------------------------------------------------

async function upsertBrand(name) {
  if (!name) return null;
  const normalized_name = name.toLowerCase().trim();
  const { data, error } = await supabase
    .from("brands")
    .upsert({ name, normalized_name, source: "open_beauty_facts" }, { onConflict: "normalized_name" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to upsert brand "${name}": ${error.message}`);
  return data.id;
}

async function upsertIngredient(item) {
  // item.text is OBF's display name; item.id is its taxonomy tag (e.g.
  // "en:water"). We only ever store what OBF gave us — no guessing at an
  // INCI name when OBF doesn't provide one.
  const canonical_name = (item.text || item.id || "").trim();
  if (!canonical_name) return null;
  const { data, error } = await supabase
    .from("ingredients")
    .upsert(
      { canonical_name, obf_tag: item.id || null, source: "open_beauty_facts" },
      { onConflict: "canonical_name" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`Failed to upsert ingredient "${canonical_name}": ${error.message}`);
  return data.id;
}

async function upsertProduct(brandId, productFields) {
  const { data, error } = await supabase
    .from("products")
    .upsert({ ...productFields, brand_id: brandId }, { onConflict: "obf_barcode" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to upsert product "${productFields.obf_barcode}": ${error.message}`);
  return data.id;
}

async function replaceProductIngredients(productId, ingredientRows) {
  // Delete-then-insert rather than upsert: guarantees no stale ingredients
  // linger if OBF's list changed between runs, and side-steps having to
  // diff old vs new positions. Not atomic (two separate calls), which is an
  // acceptable trade-off for a low-volume admin script — noted here rather
  // than silently assumed.
  const { error: deleteError } = await supabase.from("product_ingredients").delete().eq("product_id", productId);
  if (deleteError) throw new Error(`Failed to clear existing ingredients for product ${productId}: ${deleteError.message}`);

  if (ingredientRows.length === 0) return;
  const { error: insertError } = await supabase.from("product_ingredients").insert(ingredientRows);
  if (insertError) throw new Error(`Failed to insert ingredients for product ${productId}: ${insertError.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Fetching a sample of ${SAMPLE_SIZE} products from "${OBF_CATEGORY}"...`);
  const barcodes = await fetchSampleBarcodes();

  let imported = 0;
  let skipped = 0;

  for (const barcode of barcodes) {
    await sleep(REQUEST_DELAY_MS);

    let raw;
    try {
      raw = await fetchFullProduct(barcode);
    } catch (err) {
      console.error(`  [ERROR] ${barcode}: ${err.message}`);
      skipped++;
      continue;
    }

    if (!raw) {
      console.log(`  [SKIP] ${barcode}: OBF returned no product for this barcode.`);
      skipped++;
      continue;
    }

    if (!raw.code) {
      // Should not happen (we fetched by barcode), but products.obf_barcode
      // is our idempotency key — without it, re-running this script could
      // create duplicates. Skip rather than guess.
      console.log(`  [SKIP] ${barcode}: no barcode on the returned record — cannot import idempotently.`);
      skipped++;
      continue;
    }

    const { missing, primaryBrand, product, ingredients } = normalizeProduct(raw);

    if (!product.name) {
      console.log(`  [SKIP] ${barcode}: no product name available from OBF.`);
      skipped++;
      continue;
    }

    console.log(
      missing.length
        ? `  [MISSING] ${barcode} (${product.name}): ${missing.join(", ")}`
        : `  [OK] ${barcode} (${product.name}): all reviewed fields present`
    );

    const brandId = await upsertBrand(primaryBrand);
    const productId = await upsertProduct(brandId, product);

    if (ingredients.length === 0) {
      console.log(`  [INFO] ${barcode}: no structured ingredients array — raw_ingredients_text stored, product_ingredients left empty.`);
    } else {
      const rows = [];
      for (let i = 0; i < ingredients.length; i++) {
        const ingredientId = await upsertIngredient(ingredients[i]);
        if (!ingredientId) continue;
        rows.push({
          product_id: productId,
          ingredient_id: ingredientId,
          position: i + 1,
          raw_text_fragment: ingredients[i].text || null,
          percent_estimate: ingredients[i].percent_estimate ?? null,
        });
      }
      await replaceProductIngredients(productId, rows);
    }

    imported++;
  }

  console.log(`\nDone. Imported/updated ${imported} product(s), skipped ${skipped}.`);
  console.log(
    "Reminder: only [SOURCE] tables were written (brands, products, ingredients, product_ingredients). " +
      "No skin-type/concern fit, compatibility rules, or AI scores were touched by this script."
  );
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
