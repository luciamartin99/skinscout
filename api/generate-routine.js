// Vercel serverless function: POST /api/generate-routine
//
// Flow: validate profile -> fetch real ranked Supabase candidates (never
// the 12 fictional frontend products) -> run a compatibility check on the
// top pick per category -> send ONLY the ranked candidate list to Claude ->
// Claude picks product IDs from that list only -> we validate every
// returned productId against the candidate list server-side and drop any
// that don't match (defense in depth — the prompt already forbids
// inventing one, but this is what actually enforces it).
//
// Same "server holds the API key, mock fallback if absent" pattern as
// api/generate-report.js and api/ask.js.

import { fetchRankedCandidatesByCategory } from "../src/lib/fetchCandidates.js";
import { checkRoutineCompatibility } from "../src/lib/compatibility.js";

const MODEL = "claude-sonnet-4-6";

const ROUTINE_TEMPLATES = {
  Minimal: { morning: ["cleanser", "moisturizer", "sunscreen"], evening: ["cleanser", "moisturizer"] },
  Balanced: { morning: ["cleanser", "serum", "moisturizer", "sunscreen"], evening: ["cleanser", "serum", "moisturizer"] },
  Complete: { morning: ["cleanser", "serum", "moisturizer", "sunscreen"], evening: ["cleanser", "treatment", "moisturizer"] },
};

function buildMockRoutine(candidatesByCategory, profile) {
  const template = ROUTINE_TEMPLATES[profile.routineLength] || ROUTINE_TEMPLATES.Balanced;
  const build = (categories) => {
    const steps = [];
    for (const category of categories) {
      const top = candidatesByCategory[category]?.[0];
      if (!top) continue;
      steps.push({
        step: steps.length + 1,
        category,
        productId: top.id,
        reason: top.reasons[0] || `Top-ranked ${category} for your profile`,
      });
    }
    return steps;
  };
  const skinType = profile.skinType ? profile.skinType.toLowerCase() : "your";
  return {
    profileSummary: `A ${(profile.routineLength || "Balanced").toLowerCase()} routine for ${skinType} skin${profile.concerns?.length ? `, focused on ${profile.concerns.join(", ").toLowerCase()}` : ""}.`,
    morning: build(template.morning),
    evening: build(template.evening),
    warnings: [],
  };
}

async function callClaudeForRoutine(candidatesByCategory, profile, apiKey) {
  const systemPrompt = `You are SkinScout's routine-building assistant. You may ONLY select products from the candidate list provided in the user message — never invent a product, brand, ingredient, or price, and never diagnose a skin condition or make a medical claim. Build a simple AM/PM routine matching the user's routineLength preference (Minimal = fewest steps, Balanced = moderate, Complete = most thorough) and respecting their exclusions. Prefer the simplest routine that reasonably fits. If a category has no candidates, skip that step entirely rather than inventing one. Respond with ONLY a raw JSON object (no markdown fences, no preamble) matching exactly this shape: {"profileSummary": string, "morning": [{"step": number, "category": string, "productId": string, "reason": string}], "evening": [...same shape...], "warnings": [string]}. Every "productId" MUST be copied exactly, character-for-character, from the candidate list's "id" field — never modify or guess one.`;

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
    return res.status(500).json({ error: "Failed to compute candidates." });
  }

  // Compact copy for Claude — drop ingredients, keep id/name/brand/score/reasons.
  const compactCandidates = {};
  const candidateIndex = new Map();
  for (const [category, list] of Object.entries(candidatesByCategory)) {
    compactCandidates[category] = list.map(({ id, name, brand, score, reasons }) => ({ id, name, brand, score, reasons }));
    for (const c of list) candidateIndex.set(c.id, c);
  }

  // Compatibility check on the top pick per category, before calling Claude.
  const topPicks = Object.values(candidatesByCategory).map((list) => list[0]).filter(Boolean);
  const compatibility = topPicks.length > 1 ? checkRoutineCompatibility(topPicks) : { compatible: true, warnings: [], conflicts: [] };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let routine;
  if (!apiKey) {
    routine = buildMockRoutine(candidatesByCategory, profile);
  } else {
    try {
      routine = await callClaudeForRoutine(compactCandidates, profile, apiKey);
    } catch (err) {
      console.error("generate-routine: Claude call failed, using mock:", err.message);
      routine = buildMockRoutine(candidatesByCategory, profile);
    }
  }

  // Defense in depth: drop any step whose productId wasn't actually in the
  // candidate list we sent, regardless of what the prompt asked for.
  const idWarnings = [];
  const validateSteps = (steps) =>
    (steps || []).filter((step) => {
      if (candidateIndex.has(step.productId)) return true;
      idWarnings.push(`Removed an invalid product ID from ${step.category || "the routine"} (not in the candidate list).`);
      return false;
    });

  routine.morning = validateSteps(routine.morning);
  routine.evening = validateSteps(routine.evening);
  routine.warnings = [...(routine.warnings || []), ...compatibility.warnings.map((w) => w.reason), ...idWarnings];

  // Extra field (beyond the required 4 keys) so the frontend doesn't need a
  // second fetch to display images/brand/score for each chosen product, and
  // so Swap has its up-to-3 alternatives ready without another API call.
  routine.candidateDetails = candidatesByCategory;

  return res.status(200).json(routine);
}
