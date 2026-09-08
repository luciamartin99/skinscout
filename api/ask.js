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

  const systemPrompt = `You are "Ask SkinScout", a friendly skincare-comparison assistant embedded in a university prototype website. Reply using LIGHT markdown formatting so the answer is easy to scan: separate distinct ideas into short paragraphs with a blank line between them, use **bold** only for product names, brand names, key ingredients, or the single main recommendation (never bold a whole sentence or paragraph), and use "- " bullet points for short lists (e.g. key ingredients, reasons something fits). Do not use markdown tables, code blocks, or more than one "#"-style heading. Answer ONLY using the product catalog data provided — never invent ingredients, prices, or medical claims, and never diagnose skin conditions. Keep answers concise (roughly 3-6 short sentences worth of content) and end with a short separate paragraph reminding the user these are SkinScout estimates, not medical advice. If the question can't be answered from the catalog, say so plainly.`;
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
  return `Based on the catalog, for "${question}" I'd start with the **Discover** page — filter by skin type and concern to narrow the list.

- Open two product profiles side by side in **Compare** to see exact stats
- Look for a high sensitive-skin score if irritation is a concern
- Check the key ingredients list before committing to a routine change

*(This is a mocked response — no AI key configured yet.)*

SkinScout estimates only, not medical advice.`;
}
