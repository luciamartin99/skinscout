import { PRODUCTS, STAT_META } from "../data/products.js";
import { isRealProductId } from "./productId.js";
import { buildDeterministicComparisonReport } from "./productScoring.js";

/* ============================== AI LAYER ==============================
   The browser NEVER talks to the AI provider directly. It calls our own
   backend routes (/api/generate-report and /api/ask, see the /api folder),
   which run server-side on Vercel. The real ANTHROPIC_API_KEY lives only
   in that server environment (set it in Vercel → Project → Settings →
   Environment Variables). If no key is configured there, those routes
   return a polished mock response automatically, so this frontend code
   works either way without changes.
========================================================================= */
export function localMockReport(a, b, profile) {
  // Deterministic fallback so the prototype is always demonstrable offline.
  const concernKey = {
    Acne: "acne", Dehydration: "hydration", Pigmentation: "brightening",
    Ageing: "antiAgeing", Redness: "sensitivity", "Barrier repair": "sensitivity",
  }[profile.concern] || "value";
  const winner = a.stats[concernKey] >= b.stats[concernKey] ? a : b;
  const loser = winner === a ? b : a;
  return {
    recommendedProduct: `${winner.brand} ${winner.name}`,
    summary: `For ${profile.skinType.toLowerCase()} skin focused on ${profile.concern.toLowerCase()}, ${winner.brand} ${winner.name} is the stronger pick, scoring ${winner.stats[concernKey]}/100 on ${STAT_META[concernKey].label.toLowerCase()} versus ${loser.stats[concernKey]}/100 for ${loser.brand} ${loser.name}.`,
    reasons: [
      `${STAT_META[concernKey].label} score of ${winner.stats[concernKey]}/100, ahead of the alternative.`,
      `Key ingredients (${winner.keyIngredients.slice(0, 2).join(", ")}) directly support this concern.`,
      winner.fragranceFree ? "Fragrance-free formulation lowers irritation risk." : "Well-tolerated formulation for most users.",
    ],
    alternativeStrength: `${loser.brand} ${loser.name} still performs better on ${Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x])[0] === concernKey ? Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x])[1] : Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x])[0]}, so it may suit users prioritising that instead.`,
    caveat: "These are SkinScout estimates for prototype purposes, not lab-verified claims. Individual skin response varies.",
    disclaimer: "SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns.",
  };
}

const DISCLAIMER =
  "SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns.";

// Client-side fallback for REAL products — used only if the
// /api/generate-report request itself fails to reach the server (network
// error). Shares the exact same deterministic logic as the server's own
// fallback (src/lib/productScoring.js's buildDeterministicComparisonReport),
// so the two can never drift apart or disagree.
function localRealMockReport(a, b, profile) {
  const report = buildDeterministicComparisonReport(a, b, profile, DISCLAIMER);
  const { statsA, statsB, overallA, overallB, ...clientReport } = report;
  return clientReport;
}

export async function generateScoutingReport(a, b, profile) {
  const real = isRealProductId(a.id) && isRealProductId(b.id);
  const body = real
    ? { productAId: a.id, productBId: b.id, profile }
    : { productA: a, productB: b, profile };
  try {
    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Request failed");
    return await response.json();
  } catch (e) {
    return real ? localRealMockReport(a, b, profile) : localMockReport(a, b, profile);
  }
}

export async function askSkinScout(question, profile) {
  const catalog = PRODUCTS.map(({ id, brand, name, category, price, size, stats, tags, keyIngredients, bestFor }) => ({ id, brand, name, category, price, size, stats, tags, keyIngredients, bestFor }));
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, profile, catalog }),
    });
    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    return data.answer;
  } catch (e) {
    return `Based on catalog data, for "${question}" I'd point you toward the products tagged closest to your need.

- Check the **Discover** page filters for skin type and concern
- Open a product profile to compare stats directly

*(This is a mocked response — no live AI connection right now.)*

SkinScout estimates only, not medical advice.`;
  }
}
