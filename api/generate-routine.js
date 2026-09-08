// Vercel serverless function: POST /api/generate-routine
//
// Pipeline: profile -> ranked real Supabase candidates -> Claude selects
// candidate IDs -> every ID is validated against the candidate list ->
// the CANONICAL Supabase record (id/name/brand/image/barcode) replaces
// whatever Claude said about that product -> compatibility check on the
// final, resolved routine -> response.
//
// Claude's output is NEVER shown to the user directly. Its productId
// selections are looked up against the real candidate list; its `category`
// field is discarded entirely in favour of the candidate's own canonical
// category (see src/lib/ranking.js normalizeProductCategory) — this is
// what previously let a step end up as "Moisturizer / SPF" and then fail
// to find a matching entry in candidateDetails, producing
// "(product unavailable)". Every step in the response is guaranteed to
// wrap a real product fetched from Supabase, or the step is omitted with
// a plain-language warning — never a fabricated ID, name, brand, image, or
// price.
//
// User-facing text is kept strictly free of implementation details: our
// internal per-candidate `reasons` (e.g. "No skin-type fit data yet for dry
// skin") are NEVER sent to Claude and NEVER shown to the user — they were
// previously fed to Claude as candidate context, and Claude ended up
// echoing/paraphrasing them straight into its own "warnings", which we then
// displayed verbatim (hence things like "All candidate scores are equal due
// to limited skin-type and concern-fit data"). Claude only ever sees
// id/name/brand/score/category now, and is explicitly told not to mention
// scores or data limitations in its prose. All the internal diagnostics
// still go to server logs (Part 6) — see the console.log calls below.
//
// Per explicit product decision: this NEW flow has no mock/fake-routine
// fallback. If Supabase or Claude fails, the whole request fails with a
// clear error — never a routine that looks real but isn't. (The older
// Compare/Ask flows keep their own separate mock fallbacks, untouched.)

import { fetchRankedCandidatesByCategory } from "../src/lib/fetchCandidates.js";
import { checkRoutineCompatibility } from "../src/lib/compatibility.js";

const MODEL = "claude-sonnet-4-6";
const GENERIC_ERROR = "Unable to generate your routine right now.";

// Fixed, predictable structure — one canonical shape, not varied by
// routineLength: cleanser/moisturizer/sunscreen are included whenever a
// candidate exists; serum (AM) and treatment (PM) are "optional" purely in
// the sense that a missing candidate omits that one step, never invents one.
const ROUTINE_STRUCTURE = {
  morning: ["cleanser", "serum", "moisturizer", "sunscreen"],
  evening: ["cleanser", "treatment", "moisturizer"],
};

// Plain-language, non-technical messages for a step that had to be omitted
// because no real candidate exists for that category — never mentions
// scores, fit data, or catalogue internals (Part 1 + Part 3).
const OMITTED_STEP_MESSAGES = {
  cleanser: "We couldn't find a strong cleanser match for your profile, so we've left this step out.",
  serum: "We couldn't find a strong serum match for your profile, so we've kept your routine simple.",
  treatment: "We couldn't find a strong treatment match for your profile, so we've kept your routine simple.",
  moisturizer: "We couldn't find a strong moisturizer match, so we haven't forced a recommendation.",
  sunscreen: "We couldn't find a strong sunscreen match for your profile, so we've left this step out.",
};

const FALLBACK_REASON = (category) => `A well-matched ${category} for your profile.`;

function toCanonicalProduct(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    brand: candidate.brand,
    image_url: candidate.image_url,
    barcode: candidate.obf_barcode,
  };
}

async function callClaudeForRoutine(candidatesByCategory, profile, apiKey) {
  const systemPrompt = `You are SkinScout's routine-building assistant, writing directly for the end user. You may ONLY select products from the candidate list provided in the user message — never invent a product, brand, ingredient, price, or category, and never diagnose a skin condition or make a medical claim. For each pick, copy its "id" and "category" EXACTLY, character-for-character, from the candidate list — never modify, guess, or combine category labels (e.g. never write something like "Moisturizer / SPF"; use exactly one of the candidate list's own category values). Respect the user's exclusions. Write "reason" and "profileSummary" as short, warm, plain-language sentences for the end user — NEVER mention scores, data completeness, "candidates", fit data, or any other internal/technical detail; base each reason only on the product's name/brand/category and the user's stated skin type, concerns, sensitivity, and exclusions. Respond with ONLY a raw JSON object (no markdown fences, no preamble) matching exactly this shape: {"profileSummary": string, "picks": [{"category": string, "productId": string, "reason": string}], "warnings": [string]}. Include at most one pick per category. If a category has no good candidate for this user, omit it from "picks" rather than inventing one. Leave "warnings" as an empty array unless there is a genuine, plain-language safety note the user needs (e.g. a routine-timing caution) — never use it to comment on data availability or candidate quality.`;

  const userPrompt = `User profile: ${JSON.stringify(profile)}\n\nCandidate products by category (ranked, ONLY choose from these):\n${JSON.stringify(candidatesByCategory)}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { profile } = req.body || {};
  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "Missing profile" });
  }

  let candidatesByCategory;
  try {
    candidatesByCategory = await fetchRankedCandidatesByCategory(profile);
  } catch (err) {
    console.error("generate-routine: candidate fetch failed:", err.message);
    return res.status(503).json({ error: GENERIC_ERROR });
  }

  // Index EVERY candidate across ALL categories by id, so a valid id is
  // recognized regardless of which category Claude claimed it belonged to.
  const candidateIndex = new Map();
  for (const list of Object.values(candidatesByCategory)) {
    for (const c of list) candidateIndex.set(c.id, c);
  }

  // Compact copy for Claude — deliberately drops `reasons` and `ingredients`.
  // Sending our internal ranking-signal strings (e.g. "No skin-type fit
  // data yet") is what previously caused Claude to paraphrase them into
  // user-facing text. Claude gets only what it needs to pick sensibly and
  // write its own prose: id/name/brand/score/category.
  const compactCandidates = {};
  for (const [category, list] of Object.entries(candidatesByCategory)) {
    compactCandidates[category] = list.map(({ id, name, brand, score, category: cat }) => ({ id, name, brand, score, category: cat }));
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("generate-routine: ANTHROPIC_API_KEY not configured.");
    return res.status(503).json({ error: GENERIC_ERROR });
  }

  let claudeResponse;
  try {
    const raw = await callClaudeForRoutine(compactCandidates, profile, apiKey);
    // Defensive: valid JSON doesn't guarantee the shape we asked for (e.g.
    // Claude could return null, or a "picks" that isn't an array). Treat
    // anything unexpected the same as a failed call, never let it crash
    // downstream logic that assumes an array.
    if (!raw || typeof raw !== "object") throw new Error("Claude response was not an object");
    claudeResponse = { ...raw, picks: Array.isArray(raw.picks) ? raw.picks : [] };
  } catch (err) {
    console.error("generate-routine: Claude call failed:", err.message);
    return res.status(503).json({ error: GENERIC_ERROR });
  }

  // --- Debug diagnostics (server logs only — Part 6). Never sent to the client. ---
  console.log("Claude selected:", JSON.stringify(claudeResponse.picks.map((p) => ({ category: p?.category, productId: p?.productId }))));
  if (claudeResponse.warnings?.length) {
    console.log("Claude's own warnings (internal only, never shown to user):", JSON.stringify(claudeResponse.warnings));
  }

  // Validate every pick against the REAL candidate index. A pick's category
  // is taken from OUR candidate record, never from Claude's own text.
  const validated = [];
  const rejectedIds = [];
  for (const pick of claudeResponse.picks) {
    const candidate = pick && candidateIndex.get(pick.productId);
    if (!candidate) {
      rejectedIds.push(pick?.productId ?? null);
      console.error(`generate-routine: rejected invalid productId "${pick?.productId}" (category claimed: "${pick?.category}")`);
      continue;
    }
    validated.push({ category: candidate.category, candidate, reason: pick.reason });
  }
  console.log("Validated:", JSON.stringify(validated.map((v) => ({ category: v.category, productId: v.candidate.id }))));
  console.log("Rejected:", JSON.stringify(rejectedIds));

  const pickByCategory = new Map(validated.map((v) => [v.category, v]));

  // Build each section from the predictable template — try Claude's valid
  // pick for that slot first, else fall back to the top-ranked real
  // candidate ("try the next ranked valid candidate where possible"), else
  // omit the step with a plain-language explanation. Never invents a step,
  // and never fills one category's slot with a product from another
  // category (candidatesByCategory is already scoped correctly per category).
  const structureWarnings = [];
  const buildSection = (categories) => {
    const steps = [];
    for (const category of categories) {
      const candidates = candidatesByCategory[category] || [];
      if (candidates.length === 0) {
        structureWarnings.push(OMITTED_STEP_MESSAGES[category] || `We couldn't find a strong ${category} match for your profile.`);
        continue;
      }
      const claudePick = pickByCategory.get(category);
      const chosen = claudePick ? claudePick.candidate : candidates[0];
      // Never fall back to our internal `reasons` array here — that's the
      // technical ranking-signal text, not user-facing copy.
      const reason = claudePick?.reason || FALLBACK_REASON(category);
      steps.push({ step: steps.length + 1, category, product: toCanonicalProduct(chosen), score: chosen.score, reason });
    }
    return steps;
  };

  const morning = buildSection(ROUTINE_STRUCTURE.morning);
  const evening = buildSection(ROUTINE_STRUCTURE.evening);

  // Compatibility check on the FINAL, resolved routine — real products only.
  const allChosenCandidates = [...morning, ...evening].map((s) => candidateIndex.get(s.product.id)).filter(Boolean);
  const compatibility = allChosenCandidates.length > 1 ? checkRoutineCompatibility(allChosenCandidates) : { warnings: [] };

  // User-facing warnings: structural omissions + compatibility notes only.
  // Claude's own "warnings" and the rejected-id list are deliberately
  // excluded here — both are internal/technical (see the console.log calls
  // above for where that information actually goes). Deduplicated so the
  // same message never appears twice (Part 5).
  const warnings = Array.from(new Set([...structureWarnings, ...compatibility.warnings.map((w) => w.reason)]));

  return res.status(200).json({
    profileSummary: claudeResponse.profileSummary || "",
    morning,
    evening,
    warnings,
    candidateDetails: candidatesByCategory, // for Swap — full ranked list per category, not just the chosen pick
  });
}
