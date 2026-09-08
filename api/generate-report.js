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
//    (including their real ingredient list) are fetched server-side via
//    fetchProductsByIds() and the comparison is built ONLY from that —
//    Claude never sees or invents a score/price/characteristic, only the
//    real ingredient lists, and can only describe differences actually
//    present in them.
// 2. LEGACY mock products (the 12 fictional catalog entries, still used by
//    Home's "Top performers" section): unchanged from before — the
//    browser sends the full mock product objects (including their
//    fictional 0-100 stats), same as always. This path is untouched.

import { fetchProductsByIds } from "../src/lib/canonicalProducts.js";
import { isRealProductId } from "../src/lib/productId.js";

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

    if (!apiKey) {
      return res.status(200).json(buildRealMockReport(a, b));
    }
    try {
      return res.status(200).json(await callClaudeForRealReport(a, b, apiKey));
    } catch (err) {
      console.error("generate-report (real): Claude call failed:", err.message);
      return res.status(200).json(buildRealMockReport(a, b));
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
// Mode 1 helpers — real products, ingredient-list-only comparison
// ---------------------------------------------------------------------------

async function callClaudeForRealReport(a, b, apiKey) {
  const systemPrompt = `You are SkinScout's product-comparison assistant. Compare these two real products using ONLY their listed ingredients — never invent an ingredient, a price, a score, or any characteristic not present in the data given. If an ingredient list is short or empty, say so honestly rather than guessing. Never diagnose a skin condition or make a medical claim. Respond with ONLY a raw JSON object (no markdown fences, no preamble) matching exactly this shape: {"summary": string (2-3 factual sentences comparing the two ingredient lists — e.g. what they share or how they notably differ), "sharedIngredients": [string], "disclaimer": string (exactly: "${DISCLAIMER}")}`;
  const userPrompt = `Product A: ${JSON.stringify({ name: a.name, brand: a.brand, ingredients: a.ingredients })}\n\nProduct B: ${JSON.stringify({ name: b.name, brand: b.brand, ingredients: b.ingredients })}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
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

function buildRealMockReport(a, b) {
  const namesA = new Set((a.ingredients || []).map((n) => n.toLowerCase()));
  const namesB = new Set((b.ingredients || []).map((n) => n.toLowerCase()));
  const shared = [...namesA].filter((n) => namesB.has(n));

  let summary;
  if ((a.ingredients || []).length === 0 || (b.ingredients || []).length === 0) {
    summary = `${a.name} and ${b.name} can't be fully compared yet — at least one product is missing a structured ingredient list.`;
  } else if (shared.length > 0) {
    summary = `${a.brand || a.name} and ${b.brand || b.name} share ${shared.length} listed ingredient${shared.length === 1 ? "" : "s"}; the rest of each formula is different.`;
  } else {
    summary = `${a.name} and ${b.name} have no overlapping listed ingredients based on the data available.`;
  }

  return { summary, sharedIngredients: shared, disclaimer: DISCLAIMER };
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
