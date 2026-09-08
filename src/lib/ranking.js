// SkinScout — deterministic product ranking
//
// Scores products against a saved skin profile using ONLY explicit
// source/derived signals already in the Supabase schema (see
// supabase/migrations/0001_init_schema.sql): product_skin_type_fit,
// product_concern_fit, product_ingredients/ingredients, and OBF's own raw
// category text. NEVER reads product_ai_profiles — that table is explicitly
// display-only, not a ranking input (see its table comment in the migration).
//
// Every dimension either contributes a positive amount (match found),
// a negative amount (conflict found), or nothing at all (insufficient data —
// "unknown" is preferred over asserting a fact we can't back up). Each
// dimension always produces exactly one human-readable reason string, so
// a product's score is fully auditable from its `reasons` array alone.

// Adjust these to change ranking behaviour without touching the scoring
// logic itself. They don't need to sum to 100 — scoreProduct clamps the
// final total to [0, 100] regardless.
export const RANKING_WEIGHTS = {
  categoryMatch: 15,
  skinTypeFit: 20,
  concernFit: 20,
  sensitivityExclusion: 20,
  fragrancePreference: 10,
  ingredientSignal: 10,
  budgetFit: 5,
};

// The MVP's 5 routine-slot categories. Kept here (not in Supabase's
// product_categories lookup, which currently only has 4 and uses "Moisturiser")
// because this is a display/bucketing concern for the new recommendation
// flow, independent of the older Discover/Compare catalog taxonomy.
export const ROUTINE_CATEGORIES = ["cleanser", "serum", "treatment", "moisturizer", "sunscreen"];

// Keyword fallback for bucketing a product into one of ROUTINE_CATEGORIES.
// product_attributes.category_id (the "real" derived category) is empty for
// every OBF-imported product right now, so this reads OBF's own raw
// category text/name as a stand-in — explicitly a heuristic, not a stored
// fact, and never written back to the database. Deliberately a small,
// conservative keyword list (not a fuzzy/ML classifier) — a product that
// matches none of these stays uncategorized (null) rather than being
// force-fit into the wrong slot.
const CATEGORY_KEYWORDS = {
  cleanser: ["cleanser", "cleansers", "cleansing", "face wash", "facial wash", "wash", "micellar", "makeup remover"],
  serum: ["serum", "serums", "essence", "ampoule"],
  treatment: ["treatment", "treatments", "spot treatment", "exfoliant", "exfoliator", "peel", "acne", "blemish", "mask", "retinol", "retinal"],
  moisturizer: ["moisturizer", "moisturiser", "moisturizers", "moisturisers", "face cream", "cream", "lotion", "balm", "emulsion"],
  sunscreen: ["sunscreen", "sunscreens", "sun protection", "sun cream", "sun care", "spf", "sun block"],
};

// THE single canonical-category function, per the app-wide requirement that
// every layer (ranking, generate-routine, the routine page, swap, any
// filtering) agree on one of exactly: cleanser, serum, treatment,
// moisturizer, sunscreen — never a combined/free-text label like
// "Moisturizer / SPF". Returns null when no keyword matches, rather than
// guessing — callers must treat null as "uncategorized", not force it into
// a bucket.
export function normalizeProductCategory(product) {
  const haystack = `${product.raw_categories_text || ""} ${product.name || ""}`.toLowerCase();
  for (const category of ROUTINE_CATEGORIES) {
    if (CATEGORY_KEYWORDS[category].some((kw) => haystack.includes(kw))) return category;
  }
  return null;
}

// Quiz concern labels -> supabase `concerns.key`. "Dryness" and "Texture"
// are intentionally left unmapped: there is no matching row in
// supabase/migrations/0002_seed_lookups.sql, so they always fall through to
// "no concern fit data" below rather than silently guessing a match.
const CONCERN_KEY_MAP = {
  Acne: "acne",
  Redness: "redness",
  Pigmentation: "pigmentation",
  Ageing: "ageing",
};

// Quiz exclusion labels -> ingredient-name keyword lists, used only to
// detect a likely conflict from the product's own parsed ingredient list.
// This is a plain text-match heuristic, not a clinical claim.
const EXCLUSION_KEYWORDS = {
  Fragrance: ["parfum", "fragrance", "aroma"],
  "Essential oils": ["essential oil", "citral", "limonene", "linalool", "citronellol"],
  Alcohol: ["alcohol denat", "ethanol", "isopropyl alcohol", "alcohol"],
  "Strong acids": ["glycolic acid", "salicylic acid", "lactic acid", "mandelic acid"],
  Retinoids: ["retinol", "retinal", "retinyl", "retinoic"],
};

function ingredientNames(product) {
  return (product.ingredients || []).map((i) => (i.canonical_name || "").toLowerCase());
}

function budgetCeilingEur(budgetLabel) {
  if (budgetLabel === "Under €30") return 30;
  if (budgetLabel === "€30–50") return 50;
  if (budgetLabel === "€50–100") return 100;
  return null; // "No limit" or unset — no ceiling to check against
}

export function scoreProduct(product, profile = {}) {
  const reasons = [];
  let score = 0;
  const names = ingredientNames(product);
  const hasIngredientData = names.length > 0;

  // 1. Category — do we even know what kind of product this is?
  const bucket = normalizeProductCategory(product);
  if (bucket) {
    score += RANKING_WEIGHTS.categoryMatch;
    reasons.push(`Categorized as ${bucket} from catalog data`);
  } else {
    reasons.push("Category could not be determined from catalog data");
  }

  // 2. Skin type fit — reads product_skin_type_fit (empty for OBF imports today)
  if (profile.skinType && profile.skinType !== "Not sure") {
    const key = profile.skinType.toLowerCase();
    const fit = (product.skinTypeFits || []).find((f) => f.skin_type_key === key);
    if (fit && typeof fit.fit_score === "number") {
      score += (fit.fit_score / 100) * RANKING_WEIGHTS.skinTypeFit;
      reasons.push(`Matches ${profile.skinType.toLowerCase()} skin (fit ${fit.fit_score}/100)`);
    } else {
      reasons.push(`No skin-type fit data yet for ${profile.skinType.toLowerCase()} skin`);
    }
  }

  // 3. Concern fit — reads product_concern_fit (also empty for OBF imports today)
  const concerns = profile.concerns || [];
  if (concerns.length > 0) {
    const matched = [];
    const unmatched = [];
    let concernTotal = 0;
    let concernCount = 0;
    for (const concern of concerns) {
      const key = CONCERN_KEY_MAP[concern];
      const fit = key ? (product.concernFits || []).find((f) => f.concern_key === key) : null;
      if (fit && typeof fit.fit_score === "number") {
        matched.push(concern);
        concernTotal += fit.fit_score;
        concernCount += 1;
      } else {
        unmatched.push(concern);
      }
    }
    if (concernCount > 0) {
      score += (concernTotal / concernCount / 100) * RANKING_WEIGHTS.concernFit;
      reasons.push(`Relevant to ${matched.join(", ").toLowerCase()} concern(s)`);
    }
    if (unmatched.length > 0) {
      reasons.push(`No concern fit data yet for ${unmatched.join(", ").toLowerCase()}`);
    }
  }

  // 4. Sensitivity / exclusions — text-match against the product's own
  // parsed ingredients. High sensitivity implicitly adds Strong acids +
  // Retinoids to the check even if not explicitly excluded, since those are
  // well-known common irritants — a conservative, explainable default.
  const effectiveExclusions = new Set((profile.exclusions || []).filter((e) => e !== "Fragrance" && e !== "None"));
  if (profile.sensitivity === "High") {
    effectiveExclusions.add("Strong acids");
    effectiveExclusions.add("Retinoids");
  }
  if (effectiveExclusions.size > 0) {
    let conflictFound = false;
    for (const exclusion of effectiveExclusions) {
      const keywords = EXCLUSION_KEYWORDS[exclusion] || [];
      if (!hasIngredientData) {
        reasons.push(`Cannot confirm ${exclusion.toLowerCase()}-free — no ingredient data`);
        continue;
      }
      const hit = keywords.some((kw) => names.some((n) => n.includes(kw)));
      if (hit) {
        conflictFound = true;
        score -= RANKING_WEIGHTS.sensitivityExclusion / effectiveExclusions.size;
        reasons.push(`Contains ${exclusion.toLowerCase()}-related ingredient — you asked to avoid this`);
      } else {
        reasons.push(`No ${exclusion.toLowerCase()}-related ingredients found`);
      }
    }
    if (!conflictFound && hasIngredientData) {
      score += RANKING_WEIGHTS.sensitivityExclusion / 2; // partial credit for a clean check, not a "safe" guarantee
    }
  }

  // 5. Fragrance preference — its own weight, driven by the "Fragrance"
  // exclusion specifically (the quiz has no separate fragrance question).
  if ((profile.exclusions || []).includes("Fragrance")) {
    if (!hasIngredientData) {
      reasons.push("Cannot confirm fragrance-free — no ingredient data");
    } else {
      const hit = EXCLUSION_KEYWORDS.Fragrance.some((kw) => names.some((n) => n.includes(kw)));
      if (hit) {
        score -= RANKING_WEIGHTS.fragrancePreference;
        reasons.push("Contains a fragrance-related ingredient — you asked to avoid this");
      } else {
        score += RANKING_WEIGHTS.fragrancePreference;
        reasons.push(`No fragrance-related ingredients found among ${names.length} listed`);
      }
    }
  }

  // 6. Ingredient-related signal — rewards data richness/confidence, not a
  // skin-benefit claim.
  if (names.length >= 3) {
    score += RANKING_WEIGHTS.ingredientSignal;
    reasons.push(`Ingredient list available (${names.length} ingredients)`);
  } else if (names.length > 0) {
    score += RANKING_WEIGHTS.ingredientSignal / 2;
    reasons.push(`Limited ingredient data (${names.length} ingredient(s) listed)`);
  } else {
    reasons.push("No structured ingredient data available");
  }

  // 7. Budget — price_eur lives in product_attributes, which is empty for
  // every OBF import today, so this is almost always "unknown" for now.
  const ceiling = budgetCeilingEur(profile.budget);
  if (typeof product.price_eur === "number") {
    if (!ceiling || product.price_eur <= ceiling) {
      score += RANKING_WEIGHTS.budgetFit;
      reasons.push("Within budget");
    } else {
      score -= RANKING_WEIGHTS.budgetFit;
      reasons.push(`Above your budget (€${product.price_eur} vs ${profile.budget})`);
    }
  } else if (profile.budget) {
    reasons.push("No price data available yet");
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons, categoryBucket: bucket };
}

export function rankProducts(products, profile = {}) {
  return products
    .map((product) => {
      const { score, reasons, categoryBucket } = scoreProduct(product, profile);
      return { product, score, reasons, categoryBucket };
    })
    .sort((a, b) => b.score - a.score);
}

export function getTopProductsByCategory(products, profile, category, limit = 3) {
  const inCategory = products.filter((p) => normalizeProductCategory(p) === category);
  return rankProducts(inCategory, profile).slice(0, limit);
}
