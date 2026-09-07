#!/usr/bin/env node
// SkinScout — bulk Open Beauty Facts import (SOURCE data only)
//
// Pragmatic expansion of scripts/import-obf-sample.mjs: pulls ~300-1000
// real facial skincare products instead of ~10, using OBF's category
// LISTING endpoint only (no per-barcode follow-up calls, unlike the sample
// script) so the whole run stays a handful of requests instead of
// thousands — the listing response already includes everything we write
// to Supabase (name, brand, barcode, categories, ingredients text, image).
// Deliberately not a general-purpose bulk importer: fixed category list,
// no pagination beyond a small per-category cap. Good enough for a demo,
// not meant to scale to "all of OBF" (see the project notes on using OBF's
// bulk dumps instead, for that).
//
// Writes ONLY [SOURCE] data — brands/products/ingredients/product_ingredients
// — same as import-obf-sample.mjs. Never touches product_attributes,
// product_skin_type_fit, product_concern_fit, ingredient_functions,
// compatibility_rules or product_ai_profiles.
//
// Idempotent: same upsert-on-natural-key approach as the sample script, so
// running this twice (or after import-obf-sample.mjs) never duplicates
// brands/products/ingredients.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-obf-bulk.mjs
// or via the "Import OBF bulk catalog" GitHub Actions workflow
// (.github/workflows/import-obf-bulk.yml).

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

// Upper bound per the task ("approximately 300-1000"). Raw candidates are
// sorted by data completeness first, so if we have more than this after
// filtering, the richest records (name+barcode+categories+ingredients+image)
// are kept and the thinnest are dropped.
const GLOBAL_TARGET_MAX = 1000;
const GLOBAL_TARGET_MIN_WARN = 300;

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
  const missing = [];
  const name = raw.product_name || raw.product_name_en || null;
  if (!name) missing.push("product_name");

  const brandsRaw = raw.brands || null;
  const brandNames = brandsRaw ? brandsRaw.split(",").map((b) => b.trim()).filter(Boolean) : [];
  const primaryBrand = brandNames[0] || null;
  if (!primaryBrand) missing.push("brands");

  if (!raw.ingredients_text) missing.push("ingredients_text");
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0) missing.push("ingredients (structured array)");
  if (!raw.image_url) missing.push("image_url");
  if (!raw.categories) missing.push("categories");

  return {
    missing,
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

async function upsertBrand(supabase, name) {
  if (!name) return null;
  const normalized_name = name.toLowerCase().trim();
  const { data, error } = await supabase
    .from("brands")
    .upsert({ name, normalized_name, source: "open_beauty_facts" }, { onConflict: "normalized_name" })
    .select("id")
    .single();
  if (error) throw new Error(`brand "${name}": ${error.message}`);
  return data.id;
}

async function upsertIngredient(supabase, item) {
  const canonical_name = (item.text || item.id || "").trim();
  if (!canonical_name) return null;
  const { data, error } = await supabase
    .from("ingredients")
    .upsert({ canonical_name, obf_tag: item.id || null, source: "open_beauty_facts" }, { onConflict: "canonical_name" })
    .select("id")
    .single();
  if (error) throw new Error(`ingredient "${canonical_name}": ${error.message}`);
  return data.id;
}

async function upsertProduct(supabase, brandId, productFields) {
  const { data, error } = await supabase
    .from("products")
    .upsert({ ...productFields, brand_id: brandId }, { onConflict: "obf_barcode" })
    .select("id")
    .single();
  if (error) throw new Error(`product "${productFields.obf_barcode}": ${error.message}`);
  return data.id;
}

async function replaceProductIngredients(supabase, productId, ingredientRows) {
  const { error: deleteError } = await supabase.from("product_ingredients").delete().eq("product_id", productId);
  if (deleteError) throw new Error(`clear ingredients for ${productId}: ${deleteError.message}`);
  if (ingredientRows.length === 0) return;
  const { error: insertError } = await supabase.from("product_ingredients").insert(ingredientRows);
  if (insertError) throw new Error(`insert ingredients for ${productId}: ${insertError.message}`);
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
  const selected = relevant.slice(0, GLOBAL_TARGET_MAX);
  if (selected.length < GLOBAL_TARGET_MIN_WARN) {
    console.warn(`WARNING: only ${selected.length} products selected, below the ${GLOBAL_TARGET_MIN_WARN} target minimum.`);
  }
  console.log(`Importing ${selected.length} product(s).`);

  let imported = 0;
  let skipped = 0;

  for (const item of selected) {
    const { missing, primaryBrand, product, ingredients } = normalizeProduct(item);

    if (!product.name) {
      skipped++;
      continue;
    }

    try {
      const brandId = await upsertBrand(supabase, primaryBrand);
      const productId = await upsertProduct(supabase, brandId, product);

      if (ingredients.length > 0) {
        const rows = [];
        for (let i = 0; i < ingredients.length; i++) {
          const ingredientId = await upsertIngredient(supabase, ingredients[i]);
          if (!ingredientId) continue;
          rows.push({
            product_id: productId,
            ingredient_id: ingredientId,
            position: i + 1,
            raw_text_fragment: ingredients[i].text || null,
            percent_estimate: ingredients[i].percent_estimate ?? null,
          });
        }
        await replaceProductIngredients(supabase, productId, rows);
      }
      imported++;
    } catch (err) {
      console.error(`  [ERROR] ${product.obf_barcode}: ${err.message}`);
      skipped++;
    }

    if (imported % 50 === 0 && imported > 0) {
      console.log(`  ...${imported} imported so far`);
    }
  }

  console.log(`\nDone. Imported/updated ${imported} product(s), skipped ${skipped}.`);
  console.log("Reminder: only [SOURCE] tables were written. No fit/compatibility/AI-score tables were touched.");
}

main().catch((err) => {
  console.error("Bulk import failed:", err);
  process.exit(1);
});
