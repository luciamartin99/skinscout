import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { askSkinScout } from "../lib/ai.js";

export default function AskPage({ skinProfile }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm SkinScout's AI assistant. Ask me to compare products, or find one for a specific skin need — I'll answer using the catalog data only." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const examples = [
    "Which moisturiser is better for sensitive, acne-prone skin?",
    "I want a hydrating serum under €30.",
    "Compare Solara Daily Shield and Velora Mineral Veil for sensitive skin.",
    "Which product would fit better into a barrier-repair routine?",
  ];

  const send = async (text) => {
    const q = text ?? input;
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput(""); setLoading(true);
    const answer = await askSkinScout(q, skinProfile);
    setMessages((m) => [...m, { role: "assistant", text: answer }]);
    setLoading(false);
  };

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Ask SkinScout</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>Ask a natural-language question about the products in the catalog.</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {examples.map((ex) => (
          <span key={ex} className="ss-chip" style={{ cursor: "pointer" }} onClick={() => send(ex)}>{ex}</span>
        ))}
      </div>

      <div className="ss-card" style={{ display: "flex", flexDirection: "column", height: 460 }}>
        <div ref={scrollRef} className="ss-scroll" style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%", padding: "11px 15px", borderRadius: 14, fontSize: 14, lineHeight: 1.55,
                background: m.role === "user" ? "var(--forest)" : "var(--sage-lt)",
                color: m.role === "user" ? "#FFFDFD" : "var(--ink)",
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "11px 15px", borderRadius: 14, background: "var(--sage-lt)", fontSize: 14, color: "var(--ink-soft)" }}>Checking the catalog…</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, padding: 16, borderTop: "1px solid var(--line)" }}>
          <input
            className="ss-input" placeholder="Ask about a product, or two…" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="ss-btn ss-btn-primary" style={{ padding: "11px 16px" }} onClick={() => send()}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
