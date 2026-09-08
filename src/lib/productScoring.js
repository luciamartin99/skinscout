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
