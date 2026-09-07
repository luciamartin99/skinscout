// Vercel serverless function: POST /api/recommend-candidates
//
// Reads REAL products from Supabase (never the 12 fictional frontend
// products in src/data/products.js), scores them deterministically against
// a saved skin profile, and returns the top candidates per routine category.
// Read-only — never writes to Supabase. Uses only the public anon key.
//
// Query/ranking logic lives in src/lib/fetchCandidates.js, shared with
// api/generate-routine.js so the two routes can't drift out of sync.

import { fetchRankedCandidatesByCategory } from "../src/lib/fetchCandidates.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { profile } = req.body || {};
  if (!profile || typeof profile !== "object") {
    return res.status(400).json({ error: "Missing profile" });
  }

  try {
    const result = await fetchRankedCandidatesByCategory(profile);
    return res.status(200).json(result);
  } catch (err) {
    console.error("recommend-candidates failed:", err.message);
    return res.status(500).json({ error: "Failed to compute candidates." });
  }
}
