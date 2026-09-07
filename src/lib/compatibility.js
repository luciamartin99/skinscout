// SkinScout — ingredient-level routine compatibility check
//
// supabase's `compatibility_rules` table (see 0001_init_schema.sql) is
// empty right now — no rules have been curated yet. Rather than querying
// an empty table and reporting nothing useful, this starts with a SMALL,
// conservative, well-established set of routine-timing cautions, matched
// against each product's own parsed ingredients (same keyword-match
// technique as src/lib/ranking.js's exclusion check). These mirror cautions
// already present in the original mock catalog's `cautionWith` fields
// (src/data/products.js), not invented medical claims.
//
// When either product in a pair has no structured ingredient data, that
// pair is reported as "unknown" (a warning), never silently skipped and
// never asserted as safe.

const CAUTION_PAIRS = [
  {
    a: ["retinol", "retinal", "retinyl", "retinoic"],
    b: ["ascorbic acid", "l-ascorbic", "vitamin c"],
    reason: "Retinoids and vitamin C are usually better tolerated at different times of day (AM/PM) rather than layered together.",
  },
  {
    a: ["retinol", "retinal", "retinyl", "retinoic"],
    b: ["glycolic acid", "salicylic acid", "lactic acid", "mandelic acid"],
    reason: "Combining a retinoid with exfoliating acids in the same routine raises irritation risk — consider alternating nights.",
  },
  {
    a: ["benzoyl peroxide"],
    b: ["retinol", "retinal", "retinyl"],
    reason: "Benzoyl peroxide can reduce some retinoids' effectiveness and increase dryness when used together.",
  },
];

function ingredientNames(product) {
  return (product.ingredients || []).map((i) => (i.canonical_name || "").toLowerCase());
}

function findMatch(names, keywords) {
  return keywords.find((kw) => names.some((n) => n.includes(kw))) || null;
}

export function checkRoutineCompatibility(products) {
  const warnings = [];
  const conflicts = [];

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const pA = products[i];
      const pB = products[j];
      const namesA = ingredientNames(pA);
      const namesB = ingredientNames(pB);

      if (namesA.length === 0 || namesB.length === 0) {
        warnings.push({
          productAId: pA.id,
          productBId: pB.id,
          reason: "Ingredient data is incomplete for one or both products — compatibility can't be confirmed.",
        });
        continue;
      }

      for (const rule of CAUTION_PAIRS) {
        const aInFirst = findMatch(namesA, rule.a);
        const bInSecond = findMatch(namesB, rule.b);
        const aInSecond = findMatch(namesB, rule.a);
        const bInFirst = findMatch(namesA, rule.b);
        if ((aInFirst && bInSecond) || (aInSecond && bInFirst)) {
          warnings.push({ productAId: pA.id, productBId: pB.id, reason: rule.reason });
        }
      }
    }
  }

  // `conflicts` stays empty and `compatible` stays true under the current
  // CAUTION_PAIRS — every starter rule is a timing caution, not a hard
  // "never combine" rule. A future rule with relationship "avoid" would
  // push to `conflicts` instead of `warnings`, which is what would flip this.
  return { compatible: conflicts.length === 0, warnings, conflicts };
}
