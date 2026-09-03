// Vercel serverless function: POST /api/generate-report
// This runs on the server, never in the browser, so the API key is never exposed.
//
// TO ENABLE LIVE AI: in your Vercel project settings, add an environment
// variable called ANTHROPIC_API_KEY with your key from console.anthropic.com.
// If it's not set, this function returns a polished mock report instead,
// so the site stays fully demonstrable without any key configured.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { productA, productB, profile } = req.body || {};
  if (!productA || !productB || !profile) {
    return res.status(400).json({ error: "Missing productA, productB or profile" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(200).json(buildMockReport(productA, productB, profile));
  }

  const systemPrompt = `You are SkinScout's scouting-report generator. You must use ONLY the product data provided in the user message — never invent ingredients, prices, sizes, or medical claims. Do not diagnose skin conditions or promise medical outcomes. Respond with ONLY a raw JSON object (no markdown fences, no preamble) with exactly these keys: recommendedProduct (string), summary (string, 2-3 sentences, sports-scouting tone), reasons (array of 3 short strings), alternativeStrength (string, 1 sentence on where the other product wins), caveat (string, 1 short sentence), disclaimer (string, exactly: "SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns.")`;

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
    disclaimer:
      "SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns.",
  };
}
