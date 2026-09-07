#!/usr/bin/env node
// SkinScout — read-only data-quality report for the Open Beauty Facts sample
//
// Reads (never writes) the products imported by scripts/import-obf-sample.mjs
// and reports, per product and in aggregate, whether each of the 9 fields
// requested for review is present:
//   name, brand, barcode, image, raw ingredients, structured ingredients,
//   categories, countries, labels
//
// Deliberately does nothing else: no inference of missing values, no writes,
// no AI scoring, no frontend changes. Uses only the public anon key — RLS
// grants public SELECT on every catalog table, so no service-role key is
// needed for this script at all.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/validate-obf-sample.mjs
// or via the "Validate OBF sample" GitHub Actions workflow
// (.github/workflows/validate-obf-sample.yml).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

// The 9 checks requested, in order. Each is a pure presence check against
// what scripts/import-obf-sample.mjs actually wrote — no interpretation of
// "good" vs "bad" content, just present vs missing.
const CHECKS = [
  { key: "name", label: "Product name", test: (p) => Boolean(p.name) },
  { key: "brand", label: "Brand", test: (p) => Boolean(p.brands?.name) },
  { key: "barcode", label: "Barcode", test: (p) => Boolean(p.obf_barcode) },
  { key: "image", label: "Image", test: (p) => Boolean(p.image_url) },
  { key: "rawIngredients", label: "Raw ingredients text", test: (p) => Boolean(p.raw_ingredients_text) },
  { key: "structuredIngredients", label: "Structured ingredients", test: (p) => (p.ingredientCount || 0) > 0 },
  { key: "categories", label: "Categories", test: (p) => Boolean(p.raw_categories_text) },
  { key: "countries", label: "Countries", test: (p) => Boolean(p.countries_text) },
  { key: "labels", label: "Labels", test: (p) => Boolean(p.raw_labels_text) },
];

async function main() {
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, obf_barcode, name, image_url, raw_categories_text, raw_ingredients_text, raw_labels_text, countries_text, brands(name)"
    )
    .eq("source", "open_beauty_facts")
    .order("created_at", { ascending: true });

  if (productsError) {
    console.error("Failed to read products:", productsError.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("No OBF-sourced products found. Nothing to validate.");
    return;
  }

  // Structured-ingredient counts, read separately (one query, reduced
  // client-side) rather than assumed — same "don't infer" discipline as the
  // importer.
  const { data: links, error: linksError } = await supabase
    .from("product_ingredients")
    .select("product_id");

  if (linksError) {
    console.error("Failed to read product_ingredients:", linksError.message);
    process.exit(1);
  }

  const ingredientCountByProduct = {};
  for (const row of links || []) {
    ingredientCountByProduct[row.product_id] = (ingredientCountByProduct[row.product_id] || 0) + 1;
  }
  for (const p of products) {
    p.ingredientCount = ingredientCountByProduct[p.id] || 0;
  }

  // Per-product results
  console.log(`\n${products.length} OBF-sourced product(s) found.\n`);
  const perProductScores = [];

  for (const p of products) {
    const results = CHECKS.map((c) => ({ ...c, pass: c.test(p) }));
    const passCount = results.filter((r) => r.pass).length;
    const pct = Math.round((passCount / CHECKS.length) * 100);
    perProductScores.push(pct);

    const label = `${p.obf_barcode || "(no barcode)"} — ${p.name || "(no name)"}`;
    console.log(`${label}  [${passCount}/${CHECKS.length} = ${pct}%]`);
    for (const r of results) {
      console.log(`    ${r.pass ? "OK  " : "MISS"}  ${r.label}`);
    }
    console.log("");
  }

  // Per-field completeness across the whole sample
  console.log("--- Per-field completeness across the sample ---");
  const fieldStats = CHECKS.map((c) => {
    const passCount = products.filter((p) => c.test(p)).length;
    const pct = Math.round((passCount / products.length) * 100);
    return { label: c.label, passCount, total: products.length, pct };
  });
  fieldStats
    .sort((a, b) => a.pct - b.pct)
    .forEach((f) => console.log(`  ${String(f.pct).padStart(3)}%  (${f.passCount}/${f.total})  ${f.label}`));

  const overallPct = Math.round(perProductScores.reduce((a, b) => a + b, 0) / perProductScores.length);
  console.log(`\nOverall average completeness across all 9 fields: ${overallPct}%`);
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
