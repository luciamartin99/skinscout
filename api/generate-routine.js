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
// an explanatory warning — never a fabricated ID, name, brand, image, or
// price.
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
  const systemPrompt = `You are SkinScout's routine-building assistant. You may ONLY select products from the candidate list provided in the user message — never invent a product, brand, ingredient, price, or category, and never diagnose a skin condition or make a medical claim. For each pick, copy its "id" and "category" EXACTLY, character-for-character, from the candidate list — never modify, guess, or combine category labels (e.g. never write something like "Moisturizer / SPF"; use exactly one of the candidate list's own category values). Respect the user's exclusions. Respond with ONLY a raw JSON object (no markdown fences, no preamble) matching exactly this shape: {"profileSummary": string, "picks": [{"category": string, "productId": string, "reason": string}], "warnings": [string]}. Include at most one pick per category. If a category has no good candidate for this user, omit it from "picks" rather than inventing one.`;

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

  const compactCandidates = {};
  for (const [category, list] of Object.entries(candidatesByCategory)) {
    compactCandidates[category] = list.map(({ id, name, brand, score, reasons, category: cat }) => ({ id, name, brand, score, reasons, category: cat }));
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

  console.log("Claude selected:", JSON.stringify(claudeResponse.picks.map((p) => ({ category: p?.category, productId: p?.productId }))));

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
  // candidate ("try the next ranked valid candidate where possible"),
  // else omit the step with an explanation. Never invents a step.
  const structureWarnings = [];
  const buildSection = (categories) => {
    const steps = [];
    for (const category of categories) {
      const candidates = candidatesByCategory[category] || [];
      if (candidates.length === 0) {
        structureWarnings.push(`No strong match found for this step (${category}).`);
        continue;
      }
      const claudePick = pickByCategory.get(category);
      const chosen = claudePick ? claudePick.candidate : candidates[0];
      const reason = claudePick?.reason || chosen.reasons?.[0] || `Top-ranked ${category} for your profile`;
      steps.push({ step: steps.length + 1, category, product: toCanonicalProduct(chosen), score: chosen.score, reason });
    }
    return steps;
  };

  const morning = buildSection(ROUTINE_STRUCTURE.morning);
  const evening = buildSection(ROUTINE_STRUCTURE.evening);

  // Compatibility check on the FINAL, resolved routine — real products only.
  const allChosenCandidates = [...morning, ...evening].map((s) => candidateIndex.get(s.product.id)).filter(Boolean);
  const compatibility = allChosenCandidates.length > 1 ? checkRoutineCompatibility(allChosenCandidates) : { warnings: [] };

  const warnings = [
    ...structureWarnings,
    ...compatibility.warnings.map((w) => w.reason),
    ...rejectedIds.map((id) => `Removed an invalid product suggestion (id "${id}" not found in candidate list).`),
    ...(claudeResponse.warnings || []),
  ];

  return res.status(200).json({
    profileSummary: claudeResponse.profileSummary || "",
    morning,
    evening,
    warnings,
    candidateDetails: candidatesByCategory, // for Swap — full ranked list per category, not just the chosen pick
  });
}
