import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { SKIN_TYPES, CONCERNS, BUDGETS } from "../data/products.js";
import FilterSelect from "../components/FilterSelect.jsx";

export default function MySkinPage({ skinProfile, setSkinProfile }) {
  const [form, setForm] = useState(skinProfile);
  const [saved, setSaved] = useState(!!skinProfile.skinType);

  const update = (k, v) => setForm({ ...form, [k]: v });
  const toggleConcern = (c) => {
    const cur = form.concerns || [];
    update("concerns", cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>My Skin Profile</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>This personalises product rankings and your AI scouting reports. Saved for this session only.</p>

      {saved && (
        <div className="ss-card ss-fade" style={{ padding: 22, marginBottom: 26, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={22} color="#F6F2EA" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ss-serif" style={{ fontWeight: 600, fontSize: 16.5 }}>Skin Profile Card</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              {form.skinType} · {form.sensitivity} sensitivity · {(form.concerns || []).join(", ") || "no concerns set"} · {form.budget}
            </div>
          </div>
          <button className="ss-btn ss-btn-outline" style={{ fontSize: 12.5, padding: "7px 14px" }} onClick={() => setSaved(false)}>Edit</button>
        </div>
      )}

      {!saved && (
        <div className="ss-card" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 20 }}>
          <FilterSelect label="Skin type" value={form.skinType || SKIN_TYPES[0]} setValue={(v) => update("skinType", v)} options={SKIN_TYPES} />
          <FilterSelect label="Skin sensitivity" value={form.sensitivity || "Moderate"} setValue={(v) => update("sensitivity", v)} options={["Low", "Moderate", "High"]} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8 }}>Main skincare concerns (choose any)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CONCERNS.map((c) => (
                <span
                  key={c} className="ss-chip" style={{ cursor: "pointer", background: (form.concerns || []).includes(c) ? "var(--forest)" : "var(--sage-lt)", color: (form.concerns || []).includes(c) ? "#fff" : "var(--forest-dk)" }}
                  onClick={() => toggleConcern(c)}
                >{c}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>Ingredients to avoid (optional)</div>
            <input className="ss-input" placeholder="e.g. fragrance, essential oils" value={form.avoid || ""} onChange={(e) => update("avoid", e.target.value)} />
          </div>
          <FilterSelect label="Preferred texture" value={form.texture || "No preference"} setValue={(v) => update("texture", v)} options={["No preference", "Gel", "Cream", "Lightweight lotion", "Rich balm"]} />
          <FilterSelect label="Approximate budget" value={form.budget || "No preference"} setValue={(v) => update("budget", v)} options={BUDGETS} />
          <button
            className="ss-btn ss-btn-primary" style={{ alignSelf: "flex-start" }}
            onClick={() => { setSkinProfile(form); setSaved(true); }}
          >
            Save profile
          </button>
        </div>
      )}
    </div>
  );
}
