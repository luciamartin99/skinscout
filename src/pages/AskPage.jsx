import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { askSkinScout } from "../lib/ai.js";
import ChatMarkdown from "../components/ChatMarkdown.jsx";

export default function AskPage({ skinProfile }) {
  const [messages, setMessages] = useState([]);
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

      <div className="ss-scroll" style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: 8, marginBottom: 18, paddingBottom: 6 }}>
        {examples.map((ex) => (
          <span
            key={ex}
            className="ss-chip"
            style={{ cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", background: "var(--sage-lt)", color: "var(--burgundy)", fontSize: 12.5 }}
            onClick={() => send(ex)}
          >
            {ex}
          </span>
        ))}
      </div>

      <div className="ss-card" style={{ display: "flex", flexDirection: "column", height: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <Sparkles size={16} color="var(--burgundy)" />
          <div>
            <div className="ss-serif" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>SkinScout AI</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Ask me to compare products or find skincare that fits your skin.</div>
          </div>
        </div>

        <div ref={scrollRef} className="ss-scroll" style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: m.role === "user" ? "70%" : "80%",
                  padding: m.role === "user" ? "10px 16px" : "16px 18px",
                  borderRadius: 16,
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: m.role === "user" ? "var(--burgundy)" : "var(--sage-lt)",
                  color: m.role === "user" ? "#FFFDFD" : "var(--ink)",
                  border: m.role === "assistant" ? "1px solid var(--line)" : "none",
                }}
              >
                {m.role === "assistant" ? <ChatMarkdown text={m.text} /> : m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: 16, background: "var(--sage-lt)", border: "1px solid var(--line)", fontSize: 13.5, color: "var(--ink-soft)" }}>
                SkinScout is thinking
                <span className="ss-typing"><span /><span /><span /></span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: 16, borderTop: "1px solid var(--line)" }}>
          <input
            className="ss-input" placeholder="Ask about a product, or two…" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="ss-btn ss-btn-burgundy" style={{ padding: "11px 16px" }} onClick={() => send()}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
