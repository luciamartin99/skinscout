// Vercel serverless function: POST /api/generate-report
// This runs on the server, never in the browser, so the API key is never exposed.
//
// TO ENABLE LIVE AI: in your Vercel project settings, add an environment
// variable called ANTHROPIC_API_KEY with your key from console.anthropic.com.
// If it's not set, this function returns a polished mock report instead,
// so the site stays fully demonstrable without any key configured.
//
// Two modes, both still served by this one endpoint (Compare's product
// state is shared regardless of source — see src/lib/productId.js):
//
// 1. REAL products (productAId/productBId are real Supabase uuids): the
//    browser is NOT trusted with product detail. Canonical products
//    (including their real ingredient lists) are fetched server-side via
//    fetchProductsByIds(), then every stat/score/skin-type-signal is
//    computed deterministically via src/lib/productScoring.js — the SAME
//    engine Discover and Compare's cards already use. Only those VERIFIED
//    numbers and real ingredient names are sent to Claude; it is
//    explicitly told it may explain them but never override, recompute,
//    or invent one.
// 2. LEGACY mock products (the 12 fictional catalog entries, still used by
//    Home's "Top performers" section): unchanged from before — the
//    browser sends the full mock product objects (including their
//    fictional 0-100 stats), same as always. This path is untouched.

import { fetchProductsByIds } from "../src/lib/canonicalProducts.js";
import { isRealProductId } from "../src/lib/productId.js";
import { extractKeyIngredients, deriveBestSkinTypes, buildDeterministicComparisonReport } from "../src/lib/productScoring.js";

const DISCLAIMER =
  "SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { productAId, productBId, productA, productB, profile } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // --- Mode 1: real Supabase products ---
  if (isRealProductId(productAId) && isRealProductId(productBId)) {
    let a, b;
    try {
      const products = await fetchProductsByIds([productAId, productBId]);
      a = products.find((p) => p.id === productAId);
      b = products.find((p) => p.id === productBId);
    } catch (err) {
      console.error("generate-report (real): fetch failed:", err.message);
      return res.status(503).json({ error: "Couldn't generate a comparison right now." });
    }
    if (!a || !b) {
      return res.status(400).json({ error: "One or both products couldn't be found." });
    }

    // Deterministic report — computed ONCE here, server-side, using the
    // exact same engine Discover/Compare's cards use (shared with
    // src/lib/ai.js's client-side fallback, so the two can't drift apart).
    const deterministic = buildDeterministicComparisonReport(a, b, profile, DISCLAIMER);
    const keyIngredientsA = extractKeyIngredients(a).items;
    const keyIngredientsB = extractKeyIngredients(b).items;
    const bestForA = deriveBestSkinTypes(a).items;
    const bestForB = deriveBestSkinTypes(b).items;

    if (!apiKey) {
      return res.status(200).json(stripInternalFields(deterministic));
    }
    try {
      return res.status(200).json(await callClaudeForRealReport(a, b, profile, deterministic, keyIngredientsA, keyIngredientsB, bestForA, bestForB, apiKey));
    } catch (err) {
      console.error("generate-report (real): Claude call failed:", err.message);
      return res.status(200).json(stripInternalFields(deterministic));
    }
  }

  // --- Mode 2: legacy mock catalog (unchanged) ---
  if (!productA || !productB || !profile) {
    return res.status(400).json({ error: "Missing productA, productB or profile" });
  }

  if (!apiKey) {
    return res.status(200).json(buildMockReport(productA, productB, profile));
  }

  const systemPrompt = `You are SkinScout's scouting-report generator. You must use ONLY the product data provided in the user message — never invent ingredients, prices, sizes, or medical claims. Do not diagnose skin conditions or promise medical outcomes. Respond with ONLY a raw JSON object (no markdown fences, no preamble) with exactly these keys: recommendedProduct (string), summary (string, 2-3 sentences, sports-scouting tone), reasons (array of 3 short strings), alternativeStrength (string, 1 sentence on where the other product wins), caveat (string, 1 short sentence), disclaimer (string, exactly: "${DISCLAIMER}")`;

  const userPrompt = `Product A: ${JSON.stringify(productA)}\n\nProduct B: ${JSON.stringify(productB)}\n\nUser skin type: ${profile.skinType}\nPrimary concern: ${profile.concern}\nBudget preference: ${profile.budget}\nIngredients to avoid: ${profile.avoid || "none specified"}\n\nCompare Product A and Product B for this user and return the JSON described in the system prompt.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) throw new Error("Upstream AI request failed");
    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || "").join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("generate-report error:", err);
    return res.status(200).json(buildMockReport(productA, productB, profile));
  }
}

// ---------------------------------------------------------------------------
// Mode 1 helpers — real products, deterministic-stats-driven comparison
// ---------------------------------------------------------------------------

// The deterministic report already carries statsA/statsB/overallA/overallB
// internally (needed to build the Claude prompt below) — strip them before
// the response reaches the client, since the documented response shape is
// just {winner, verdict, strengths, weaknesses, bestFitProfile, disclaimer}.
// The stat-by-stat table and radar on the Compare page compute their own
// values client-side from the same engine; they don't read this response.
function stripInternalFields({ statsA, statsB, overallA, overallB, ...report }) {
  return report;
}

async function callClaudeForRealReport(a, b, profile, deterministic, keyIngredientsA, keyIngredientsB, bestForA, bestForB, apiKey) {
  const { statsA, statsB, overallA, overallB } = deterministic;

  const systemPrompt = `You are SkinScout's product-comparison assistant. Use ONLY the verified stats, scores and ingredients provided below — they were computed deterministically from each product's real ingredient list. You may explain and interpret them, but NEVER override, recompute, or invent a number, ingredient, price, or characteristic. A null/missing score means there wasn't enough data for that signal — say so honestly rather than guessing a value. Never diagnose a skin condition or make a medical claim. Respond with ONLY a raw JSON object (no markdown fences, no preamble) matching exactly this shape: {"winner": string (the winning product's brand+name, or "Tie", or "Insufficient data"), "verdict": string (2-3 sentences explaining the result using the given stats), "strengths": [string, string] (why the winner leads, referencing actual stat values given), "weaknesses": [string, string] (where the OTHER product leads instead), "bestFitProfile": string (1-2 sentences on who each product may best suit, using ONLY the given skin-type signals), "disclaimer": string (exactly: "${DISCLAIMER}")}`;

  const userPrompt = `User profile: ${JSON.stringify(profile || {})}

Product A: ${[a.brand, a.name].filter(Boolean).join(" ")}
  Overall score: ${overallA.score ?? "insufficient data"}
  Stats: ${JSON.stringify(statsA)}
  Key ingredients: ${JSON.stringify(keyIngredientsA)}
  Formulation-based skin-type signals: ${JSON.stringify(bestForA)}

Product B: ${[b.brand, b.name].filter(Boolean).join(" ")}
  Overall score: ${overallB.score ?? "insufficient data"}
  Stats: ${JSON.stringify(statsB)}
  Key ingredients: ${JSON.stringify(keyIngredientsB)}
  Formulation-based skin-type signals: ${JSON.stringify(bestForB)}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) throw new Error("Upstream AI request failed");
  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ---------------------------------------------------------------------------
// Mode 2 helpers — legacy mock catalog (unchanged)
// ---------------------------------------------------------------------------

function buildMockReport(a, b, profile) {
  const concernKey =
    {
      Acne: "acne",
      Dehydration: "hydration",
      Pigmentation: "brightening",
      Ageing: "antiAgeing",
      Redness: "sensitivity",
      "Barrier repair": "sensitivity",
    }[profile.concern] || "value";

  const winner = a.stats[concernKey] >= b.stats[concernKey] ? a : b;
  const loser = winner === a ? b : a;
  const loserSorted = Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x]);
  const loserBestStat = loserSorted[0] === concernKey ? loserSorted[1] : loserSorted[0];

  return {
    recommendedProduct: `${winner.brand} ${winner.name}`,
    summary: `For ${profile.skinType.toLowerCase()} skin focused on ${profile.concern.toLowerCase()}, ${winner.brand} ${winner.name} is the stronger pick, scoring ${winner.stats[concernKey]}/100 versus ${loser.stats[concernKey]}/100 for ${loser.brand} ${loser.name} on this stat.`,
    reasons: [
      `Higher relevant performance score for this concern.`,
      `Key ingredients (${winner.keyIngredients.slice(0, 2).join(", ")}) directly support this concern.`,
      winner.fragranceFree ? "Fragrance-free formulation lowers irritation risk." : "Well-tolerated formulation for most users.",
    ],
    alternativeStrength: `${loser.brand} ${loser.name} still performs better on ${loserBestStat}, so it may suit users prioritising that instead.`,
    caveat: "These are SkinScout estimates for prototype purposes, not lab-verified claims. Individual skin response varies.",
    disclaimer: DISCLAIMER,
  };
}
