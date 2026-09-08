// SkinScout — deterministic, ingredient-derived product scoring.
//
// Pure, dependency-free — safe to import from both client and server code
// (unlike src/lib/canonicalProducts.js, which is server-only). Runs
// entirely on a product's own real ingredient list (+ optionally the
// user's skin profile) — never calls Claude, never randomizes, never
// copies the old fictional 0-100 catalog values.
//
// Every function returns { score, confidence, reasons }:
//   score      — 0-100, or null when there's truly no evidence to score from
//   confidence — "none" (score is null) | "low" (thin ingredient data,
//                still worth showing) | "high" (a reasonably full list)
//   reasons    — plain-language strings explaining the score, for the
//                product profile view's "why it scored this way"
//
// This is explicitly NOT a claim that any single ingredient is "good" or
// "bad" — see calculateFormulaProfileScore's comment below.

function ingredientNames(product) {
  return (product?.ingredients || []).map((n) => (n || "").toLowerCase());
}

function confidenceFor(names) {
  if (names.length === 0) return "none";
  return names.length < 5 ? "low" : "high";
}

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Shared ingredient signal vocabularies
// ---------------------------------------------------------------------------

// Humectant/emollient/occlusive/barrier-support signals — the well-known
// hydration-related ingredient families named in cosmetic chemistry, not a
// clinical claim about any specific product.
const HYDRATION_SIGNALS = [
  { keywords: ["hyaluronic acid", "sodium hyaluronate"], weight: 25, label: "hyaluronic acid" },
  { keywords: ["glycerin", "glycerol"], weight: 20, label: "glycerin" },
  { keywords: ["panthenol"], weight: 15, label: "panthenol" },
  { keywords: ["ceramide"], weight: 15, label: "ceramides" },
  { keywords: ["squalane"], weight: 10, label: "squalane" },
  { keywords: ["sodium pca"], weight: 10, label: "sodium PCA" },
  { keywords: ["urea"], weight: 8, label: "urea" },
  { keywords: ["betaine"], weight: 8, label: "betaine" },
  { keywords: ["propanediol", "butylene glycol"], weight: 8, label: "propanediol/butylene glycol" },
  { keywords: ["dimethicone"], weight: 8, label: "dimethicone" },
  { keywords: ["shea butter", "butyrospermum"], weight: 8, label: "shea butter" },
  { keywords: ["cholesterol"], weight: 8, label: "cholesterol" },
];

// Ingredients commonly associated with irritation/sensitisation risk —
// presence-based signal only, not a diagnosis of how any individual will
// react. Deliberately overlaps conceptually with src/lib/ranking.js's own
// exclusion keywords (same underlying concern, independent module — this
// file scores a product card, ranking.js scores a routine candidate).
const IRRITANT_SIGNALS = [
  { keywords: ["parfum", "fragrance"], weight: 30, label: "fragrance/parfum", isFragrance: true },
  { keywords: ["essential oil", "citral", "limonene", "linalool", "citronellol", "geraniol"], weight: 20, label: "essential oil / fragrance-adjacent compounds" },
  { keywords: ["alcohol denat", "denatured alcohol"], weight: 15, label: "denatured alcohol" },
  { keywords: ["retinol", "retinal", "retinyl", "retinoic"], weight: 15, label: "retinoid" },
  { keywords: ["glycolic acid", "salicylic acid", "lactic acid", "mandelic acid"], weight: 15, label: "exfoliating acid" },
  { keywords: ["menthol", "peppermint"], weight: 10, label: "menthol/peppermint" },
];

// Quiz exclusion labels -> keyword lists, for the profile-aware checks in
// calculateFormulaProfileScore / calculateProfileMatchScore. Mirrors
// ranking.js's own mapping (kept independent on purpose — see note above).
const EXCLUSION_KEYWORD_MAP = {
  Fragrance: ["parfum", "fragrance"],
  "Essential oils": ["essential oil", "citral", "limonene", "linalool"],
  Alcohol: ["alcohol denat", "denatured alcohol", "isopropyl alcohol"],
  "Strong acids": ["glycolic acid", "salicylic acid", "lactic acid", "mandelic acid"],
  Retinoids: ["retinol", "retinal", "retinyl", "retinoic"],
};

// Ingredients with a well-documented role in oil control / acne-prone skin
// suitability. Presence-based signal only — not a claim that any product
// treats acne (that's a medical claim this app never makes).
const ACNE_SIGNALS = [
  { keywords: ["salicylic acid"], weight: 35, label: "salicylic acid" },
  { keywords: ["niacinamide"], weight: 25, label: "niacinamide" },
  { keywords: ["zinc pca", "zinc oxide"], weight: 20, label: "zinc" },
  { keywords: ["benzoyl peroxide"], weight: 35, label: "benzoyl peroxide" },
  { keywords: ["tea tree", "melaleuca"], weight: 15, label: "tea tree" },
  { keywords: ["sulfur", "sulphur"], weight: 15, label: "sulfur" },
];

// Ingredients with well-documented tone-evening/brightening roles.
const BRIGHTENING_SIGNALS = [
  { keywords: ["ascorbic acid", "vitamin c", "l-ascorbic"], weight: 30, label: "vitamin C" },
  { keywords: ["niacinamide"], weight: 20, label: "niacinamide" },
  { keywords: ["azelaic acid"], weight: 25, label: "azelaic acid" },
  { keywords: ["kojic acid"], weight: 20, label: "kojic acid" },
  { keywords: ["alpha arbutin", "arbutin"], weight: 20, label: "arbutin" },
  { keywords: ["tranexamic acid"], weight: 20, label: "tranexamic acid" },
  { keywords: ["licorice", "liquorice", "glycyrrhiza"], weight: 15, label: "licorice root extract" },
];

// Ingredients with well-documented anti-ageing roles (retinoids, peptides,
// antioxidants). Presence-based signal only.
const ANTI_AGEING_SIGNALS = [
  { keywords: ["retinol", "retinal", "retinyl", "retinoic"], weight: 35, label: "retinoid" },
  { keywords: ["peptide"], weight: 25, label: "peptides" },
  { keywords: ["ascorbic acid", "vitamin c", "l-ascorbic"], weight: 15, label: "vitamin C (antioxidant)" },
  { keywords: ["tocopherol", "vitamin e"], weight: 10, label: "vitamin E (antioxidant)" },
  { keywords: ["ferulic acid"], weight: 15, label: "ferulic acid" },
  { keywords: ["coenzyme q10", "ubiquinone"], weight: 10, label: "coenzyme Q10" },
  { keywords: ["resveratrol"], weight: 10, label: "resveratrol" },
];

// Skin-type suitability signals for deriveBestSkinTypes(). "positive" and
// "negative" keyword hits are netted against each other — a type is only
// ever suggested when the NET evidence actually favours it (see below).
// Deliberately conservative and always hedged ("may suit"), never a
// medical claim.
const SKIN_TYPE_SIGNALS = {
  "dry skin": {
    positive: ["shea butter", "squalane", "ceramide", "cholesterol", "fatty acid", "glycerin", "hyaluronic acid"],
    negative: ["salicylic acid", "alcohol denat", "clay"],
  },
  "oily skin": {
    positive: ["niacinamide", "salicylic acid", "zinc pca", "tea tree", "clay", "witch hazel"],
    negative: ["shea butter", "mineral oil", "petrolatum"],
  },
  "combination skin": {
    positive: ["niacinamide", "hyaluronic acid", "panthenol"],
    negative: [],
  },
  "sensitive skin": {
    positive: ["centella asiatica", "panthenol", "allantoin", "bisabolol", "madecassoside", "beta-glucan", "oat"],
    negative: ["parfum", "fragrance", "essential oil", "alcohol denat", "glycolic acid", "salicylic acid", "retinol", "retinal"],
  },
  "normal skin": {
    positive: ["glycerin", "hyaluronic acid", "niacinamide"],
    negative: [],
  },
};

// ---------------------------------------------------------------------------
// Individual scores
// ---------------------------------------------------------------------------

export function calculateHydrationScore(product) {
  const names = ingredientNames(product);
  if (names.length === 0) return { score: null, confidence: "none", reasons: ["No ingredient data available to assess hydration"] };

  let score = 0;
  const reasons = [];
  for (const signal of HYDRATION_SIGNALS) {
    if (signal.keywords.some((kw) => names.some((n) => n.includes(kw)))) {
      score += signal.weight;
      reasons.push(`Contains ${signal.label}`);
    }
  }
  if (reasons.length === 0) reasons.push("No common hydrating ingredients detected");

  return { score: clampScore(score), confidence: confidenceFor(names), reasons };
}

// Deliberately NOT called "ingredient quality" — this does not judge any
// ingredient as objectively good or bad. It's a SkinScout formulation
// signal: how much we can actually see in the formula (transparency), how
// many recognized functional ingredient categories are present, and
// whether it conflicts with what THIS user said they want to avoid.
export function calculateFormulaProfileScore(product, profile) {
  const names = ingredientNames(product);
  if (names.length === 0) return { score: null, confidence: "none", reasons: ["No ingredient data available"] };

  let score = 0;
  const reasons = [];

  if (names.length >= 15) {
    score += 40;
    reasons.push(`Full ingredient list available (${names.length} ingredients)`);
  } else if (names.length >= 5) {
    score += 25;
    reasons.push(`Partial ingredient list available (${names.length} ingredients)`);
  } else {
    score += 10;
    reasons.push(`Limited ingredient list (${names.length} ingredient${names.length === 1 ? "" : "s"})`);
  }

  const functionalHits = HYDRATION_SIGNALS.filter((s) => s.keywords.some((kw) => names.some((n) => n.includes(kw)))).length;
  score += Math.min(40, functionalHits * 10);
  if (functionalHits > 0) reasons.push(`${functionalHits} recognized functional ingredient categor${functionalHits === 1 ? "y" : "ies"} identified`);

  const exclusions = profile?.exclusions || [];
  if (exclusions.length > 0) {
    const conflicts = exclusions.filter((ex) => (EXCLUSION_KEYWORD_MAP[ex] || []).some((kw) => names.some((n) => n.includes(kw))));
    if (conflicts.length > 0) {
      score -= conflicts.length * 15;
      reasons.push(`Contains ingredient(s) you asked to avoid: ${conflicts.join(", ")}`);
    } else {
      score += 10;
      reasons.push("No conflicts with your stated preferences");
    }
  }

  return { score: clampScore(score), confidence: confidenceFor(names), reasons };
}

// Ingredient-presence based suitability signal, not a diagnosis. `profile`
// is optional — without it this is a generic "how many common irritants
// does this formula contain" read; with it, high sensitivity and a stated
// fragrance exclusion make the same evidence count for more.
export function calculateSensitiveSkinScore(product, profile) {
  const names = ingredientNames(product);
  if (names.length === 0) return { score: null, confidence: "none", reasons: ["No ingredient data available to assess sensitivity fit"] };

  let score = 100;
  const reasons = [];
  const highSensitivity = profile?.sensitivity === "High";
  const avoidsFragrance = (profile?.exclusions || []).includes("Fragrance");

  for (const signal of IRRITANT_SIGNALS) {
    const hit = signal.keywords.some((kw) => names.some((n) => n.includes(kw)));
    if (!hit) continue;
    let deduction = signal.weight * (highSensitivity ? 1.5 : 1);
    reasons.push(`Contains ${signal.label}${highSensitivity ? " (weighted more heavily for high sensitivity)" : ""}`);
    if (avoidsFragrance && signal.isFragrance) {
      deduction += 15;
      reasons.push("Contains fragrance, which you asked to avoid");
    }
    score -= deduction;
  }
  if (reasons.length === 0) reasons.push("No common irritant ingredients detected");

  return { score: clampScore(score), confidence: confidenceFor(names), reasons };
}

// How well this specific product avoids the specific things THIS user said
// they want to avoid. Returns "none" confidence (no score) when there's no
// profile to match against at all — this is the one component that
// naturally disappears for a generic, profile-less view.
export function calculateProfileMatchScore(product, profile) {
  const hasProfile = profile && (profile.skinType || profile.concerns?.length || profile.exclusions?.length);
  if (!hasProfile) return { score: null, confidence: "none", reasons: ["No skin profile available for personalised matching"] };

  const names = ingredientNames(product);
  if (names.length === 0) return { score: null, confidence: "none", reasons: ["No ingredient data available"] };

  let score = 70;
  const reasons = [];
  const exclusions = profile.exclusions || [];
  const conflicts = exclusions.filter((ex) => (EXCLUSION_KEYWORD_MAP[ex] || []).some((kw) => names.some((n) => n.includes(kw))));
  if (conflicts.length > 0) {
    score -= conflicts.length * 25;
    reasons.push(`Conflicts with your preference(s): ${conflicts.join(", ")}`);
  } else if (exclusions.length > 0) {
    score += 30;
    reasons.push("No conflicts with any of your stated preferences");
  }

  return { score: clampScore(score), confidence: confidenceFor(names), reasons };
}

// Shared additive-keyword-match pattern used by the three concern-specific
// scores below (same shape as calculateHydrationScore).
function additiveSignalScore(product, signals, noDataReason) {
  const names = ingredientNames(product);
  if (names.length === 0) return { score: null, confidence: "none", reasons: [noDataReason] };
  let score = 0;
  const reasons = [];
  for (const signal of signals) {
    if (signal.keywords.some((kw) => names.some((n) => n.includes(kw)))) {
      score += signal.weight;
      reasons.push(`Contains ${signal.label}`);
    }
  }
  if (reasons.length === 0) reasons.push("No common supporting ingredients detected");
  return { score: clampScore(score), confidence: confidenceFor(names), reasons };
}

export function calculateAcneScore(product) {
  return additiveSignalScore(product, ACNE_SIGNALS, "No ingredient data available to assess acne-prone suitability");
}

export function calculateBrighteningScore(product) {
  return additiveSignalScore(product, BRIGHTENING_SIGNALS, "No ingredient data available to assess brightening potential");
}

export function calculateAntiAgeingScore(product) {
  return additiveSignalScore(product, ANTI_AGEING_SIGNALS, "No ingredient data available to assess anti-ageing potential");
}

// "Value for money" needs a real price AND a meaningful basis to compare
// it against — a single price in isolation, with no aggregate catalogue
// statistics to weigh it against, can't be scored without inventing an
// arbitrary threshold. Open Beauty Facts doesn't provide price at all
// (product_attributes.price_eur is unpopulated for every current
// product), so this deliberately always returns "no data" for now rather
// than fabricating a false sense of precision — it's wired up so it can
// be implemented properly once real, comparable price data exists.
export function calculateValueForMoneyScore(product) {
  if (typeof product?.price_eur !== "number") {
    return { score: null, confidence: "none", reasons: ["No price data available"] };
  }
  return { score: null, confidence: "none", reasons: ["Price data present but no reliable comparison basis yet"] };
}

// The 7 stats shown on the Compare page's "Stat-by-stat" table and radar
// chart — ONE shared definition so both sections can never drift apart.
// `calculate` always takes (product, profile); profile is simply unused
// by the scores that don't need it.
export const COMPARISON_STATS = [
  { key: "hydration", label: "Hydration", calculate: (p) => calculateHydrationScore(p) },
  { key: "acne", label: "Acne-prone suitability", calculate: (p) => calculateAcneScore(p) },
  { key: "sensitiveSkinFit", label: "Sensitive-skin suitability", calculate: (p, profile) => calculateSensitiveSkinScore(p, profile) },
  { key: "brightening", label: "Brightening", calculate: (p) => calculateBrighteningScore(p) },
  { key: "antiAgeing", label: "Anti-ageing", calculate: (p) => calculateAntiAgeingScore(p) },
  { key: "formulaProfile", label: "Formula profile", calculate: (p, profile) => calculateFormulaProfileScore(p, profile) },
  { key: "valueForMoney", label: "Value for money", calculate: (p) => calculateValueForMoneyScore(p) },
];

// Picks the most functionally-relevant REAL ingredients from the
// product's own list — never invented, never chosen by Claude. Falls back
// to the first few listed ingredients (still real, just not functionally
// tagged) when none match a known signal. `limited: true` means there was
// no ingredient data at all, for the UI's "ingredient data limited" state.
const ALL_FUNCTIONAL_SIGNALS = [...HYDRATION_SIGNALS, ...IRRITANT_SIGNALS, ...ACNE_SIGNALS, ...BRIGHTENING_SIGNALS, ...ANTI_AGEING_SIGNALS];

export function extractKeyIngredients(product, limit = 5) {
  const raw = (product?.ingredients || []).filter(Boolean);
  if (raw.length === 0) return { items: [], limited: true };

  const picked = [];
  for (const ingredient of raw) {
    if (picked.length >= limit) break;
    const lower = ingredient.toLowerCase();
    if (ALL_FUNCTIONAL_SIGNALS.some((s) => s.keywords.some((kw) => lower.includes(kw)))) picked.push(ingredient);
  }
  if (picked.length === 0) return { items: raw.slice(0, Math.min(limit, raw.length)), limited: false };
  return { items: picked, limited: false };
}

// Conservative, hedged skin-type suggestions ("May suit X skin") derived
// from net positive-vs-negative ingredient evidence — never a medical
// claim, and a skin type is only ever included when there's real positive
// evidence for it (not just an absence of contrary evidence).
export function deriveBestSkinTypes(product) {
  const names = ingredientNames(product);
  if (names.length === 0) return { items: [], limited: true };

  const scored = Object.entries(SKIN_TYPE_SIGNALS).map(([label, sig]) => {
    const posHits = sig.positive.filter((kw) => names.some((n) => n.includes(kw))).length;
    const negHits = sig.negative.filter((kw) => names.some((n) => n.includes(kw))).length;
    return { label, net: posHits - negHits, posHits };
  });

  const qualifying = scored.filter((s) => s.posHits > 0 && s.net > 0).sort((a, b) => b.net - a.net).slice(0, 3);
  if (qualifying.length === 0) return { items: [], limited: false };
  return { items: qualifying.map((s) => `May suit ${s.label}`), limited: false };
}

// ---------------------------------------------------------------------------
// Overall score — one place to adjust the weights
// ---------------------------------------------------------------------------

export const OVERALL_SCORE_WEIGHTS = {
  hydration: 0.25,
  formulaProfile: 0.25,
  sensitiveSkinFit: 0.25,
  profileMatch: 0.25,
};

// Combines the components above. If a component has no score (e.g. no
// profile, so profileMatch is null), it's excluded and the remaining
// weights are re-normalized — the overall score is never diluted by a
// component that had nothing to say. Confidence reflects how many
// components actually contributed and how strong their own data was.
export function calculateOverallScore(product, profile) {
  const components = [
    { key: "hydration", ...calculateHydrationScore(product) },
    { key: "formulaProfile", ...calculateFormulaProfileScore(product, profile) },
    { key: "sensitiveSkinFit", ...calculateSensitiveSkinScore(product, profile) },
    { key: "profileMatch", ...calculateProfileMatchScore(product, profile) },
  ];

  const usable = components.filter((c) => typeof c.score === "number");
  if (usable.length === 0) {
    return { score: null, confidence: "none", reasons: ["Not enough data to calculate a SkinScout score"] };
  }

  const totalWeight = usable.reduce((sum, c) => sum + OVERALL_SCORE_WEIGHTS[c.key], 0);
  const weighted = usable.reduce((sum, c) => sum + c.score * OVERALL_SCORE_WEIGHTS[c.key], 0) / totalWeight;

  const confidence =
    usable.length < 2 ? "low" : usable.every((c) => c.confidence === "high") ? "high" : "medium";

  return { score: clampScore(weighted), confidence, reasons: usable.flatMap((c) => c.reasons), components };
}

// ---------------------------------------------------------------------------
// Deterministic comparison report — shared by BOTH api/generate-report.js's
// server-side fallback (used when Claude is unconfigured or fails) and
// src/lib/ai.js's client-side fallback (used when the request itself can't
// reach the server) — one implementation, so the two fallbacks can never
// drift apart. `disclaimer` is passed in rather than hardcoded here, since
// this module is about scoring, not app-wide legal copy.
// ---------------------------------------------------------------------------
export function buildDeterministicComparisonReport(a, b, profile, disclaimer) {
  const statsA = {};
  const statsB = {};
  for (const stat of COMPARISON_STATS) {
    statsA[stat.key] = stat.calculate(a, profile).score;
    statsB[stat.key] = stat.calculate(b, profile).score;
  }
  const overallA = calculateOverallScore(a, profile);
  const overallB = calculateOverallScore(b, profile);
  const bestForA = deriveBestSkinTypes(a).items;
  const bestForB = deriveBestSkinTypes(b).items;

  let winnerProduct = null;
  let loserProduct = null;
  let tie = false;
  let insufficient = false;

  if (overallA.score == null && overallB.score == null) {
    insufficient = true;
  } else if (overallA.score == null) {
    winnerProduct = b; loserProduct = a;
  } else if (overallB.score == null) {
    winnerProduct = a; loserProduct = b;
  } else if (overallA.score === overallB.score) {
    tie = true;
  } else if (overallA.score > overallB.score) {
    winnerProduct = a; loserProduct = b;
  } else {
    winnerProduct = b; loserProduct = a;
  }

  const winnerLabel = insufficient
    ? "Insufficient data"
    : tie
    ? "Tie"
    : [winnerProduct.brand, winnerProduct.name].filter(Boolean).join(" ");

  const strengths = [];
  const weaknesses = [];
  if (winnerProduct) {
    const winnerStats = winnerProduct === a ? statsA : statsB;
    const loserStats = winnerProduct === a ? statsB : statsA;
    for (const stat of COMPARISON_STATS) {
      const w = winnerStats[stat.key];
      const l = loserStats[stat.key];
      if (typeof w !== "number" || typeof l !== "number") continue;
      if (w > l) strengths.push(`Scores higher on ${stat.label.toLowerCase()} (${w} vs ${l})`);
      else if (l > w) weaknesses.push(`${[loserProduct.brand, loserProduct.name].filter(Boolean).join(" ")} scores higher on ${stat.label.toLowerCase()} (${l} vs ${w})`);
    }
  }

  const bestFitParts = [];
  if (bestForA.length) bestFitParts.push(`${a.name}: ${bestForA.join(", ")}`);
  if (bestForB.length) bestFitParts.push(`${b.name}: ${bestForB.join(", ")}`);

  return {
    winner: winnerLabel,
    verdict: insufficient
      ? `There isn't enough real ingredient data to confidently compare ${a.name} and ${b.name} yet.`
      : tie
      ? `${a.name} and ${b.name} scored evenly overall across the available ingredient-derived signals.`
      : `${winnerLabel} scored higher overall across the available ingredient-derived signals.`,
    strengths: strengths.length ? strengths.slice(0, 2) : ["Not enough data to identify a clear strength"],
    weaknesses: weaknesses.length ? weaknesses.slice(0, 2) : ["No clear gap identified from the available data"],
    bestFitProfile: bestFitParts.length ? bestFitParts.join(" · ") : "Not enough formulation evidence to suggest a best-fit skin type for either product.",
    disclaimer,
    statsA,
    statsB,
    overallA,
    overallB,
  };
}
