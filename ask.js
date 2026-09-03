// Vercel serverless function: POST /api/ask
// Same pattern as generate-report.js — key stays server-side only.
// Add ANTHROPIC_API_KEY in your Vercel project's environment variables to
// enable live answers. Without it, a helpful mocked answer is returned.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, profile, catalog } = req.body || {};
  if (!question || !catalog) {
    return res.status(400).json({ error: "Missing question or catalog" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ answer: mockAnswer(question) });
  }

  const systemPrompt = `You are "Ask SkinScout", a friendly skincare-comparison assistant embedded in a university prototype website. Answer ONLY using the product catalog data provided — never invent ingredients, prices, or medical claims, and never diagnose skin conditions. Keep answers concise (3-5 sentences max), accessible, and end with a one-line reminder that these are SkinScout estimates, not medical advice. If the question can't be answered from the catalog, say so plainly.`;

  const userPrompt = `Product catalog: ${JSON.stringify(catalog)}\n\nUser skin profile (if set): ${JSON.stringify(profile || {})}\n\nUser question: "${question}"`;

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
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!response.ok) throw new Error("Upstream AI request failed");
    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || "").join("\n");
    return res.status(200).json({ answer: text.trim() });
  } catch (err) {
    console.error("ask error:", err);
    return res.status(200).json({ answer: mockAnswer(question) });
  }
}

function mockAnswer(question) {
  return `Based on the catalog: for "${question}", check the Discover page filters for skin type and concern, or open two product profiles side by side in Compare to see exact stats. (This is a mocked response — no AI key configured yet.) SkinScout estimates only, not medical advice.`;
}
