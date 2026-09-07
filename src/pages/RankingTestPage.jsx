import { useEffect, useState } from "react";
import { loadSkinProfile } from "../lib/skinProfile.js";
import { checkRoutineCompatibility } from "../lib/compatibility.js";

// TEMPORARY — connection/logic smoke test only, not part of the real app.
// Visit any deployment at /?ranking-test=1. Does NOT touch the main flow:
// not linked from Home, the quiz, or the summary screen. Delete this file
// and the check in App.jsx once the ranking/compatibility engines have been
// validated against real Supabase data.
export default function RankingTestPage() {
  const [profile, setProfile] = useState(undefined); // undefined = not checked yet, null = none saved
  const [status, setStatus] = useState("idle");
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setProfile(loadSkinProfile());
  }, []);

  useEffect(() => {
    if (!profile) return;
    setStatus("loading");
    fetch("/api/recommend-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || `Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setCandidates(data);
        setStatus("done");
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [profile]);

  if (profile === undefined) return null; // reading localStorage
  if (profile === null) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 40, fontFamily: "monospace" }}>
        <h1 style={{ fontSize: 20 }}>Ranking test (temporary)</h1>
        <p>No skin profile saved yet. Complete the quiz first (visit the site normally, click "Build My Routine"), then come back to this URL.</p>
      </div>
    );
  }

  // A sample "routine" — the top pick per category, where one exists — to
  // exercise checkRoutineCompatibility with the same real ingredient data
  // already returned for each candidate above.
  const sampleRoutine = candidates && Object.values(candidates).map((list) => list[0]).filter(Boolean);
  const compatibility = sampleRoutine && sampleRoutine.length > 1 ? checkRoutineCompatibility(sampleRoutine) : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 40, fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 20 }}>Ranking test (temporary)</h1>
      <p>Real Supabase products only, scored deterministically. No AI scores used.</p>

      <h2 style={{ fontSize: 15, marginTop: 24 }}>Saved skin profile</h2>
      <pre style={{ background: "#f4f4f0", padding: 12, borderRadius: 6, overflowX: "auto" }}>{JSON.stringify(profile, null, 2)}</pre>

      {status === "loading" && <p>Scoring real products…</p>}
      {status === "error" && <p style={{ color: "#b00020" }}>Error: {error}</p>}

      {status === "done" && candidates && (
        <>
          {Object.entries(candidates).map(([category, list]) => (
            <div key={category} style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 15, textTransform: "capitalize" }}>{category} — top {list.length}</h2>
              {list.length === 0 && <p style={{ color: "#888" }}>No products categorized as "{category}" in the current sample.</p>}
              {list.map((c) => (
                <div key={c.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10, display: "flex", gap: 12 }}>
                  {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: 60, height: 60, objectFit: "contain" }} />}
                  <div>
                    <div><strong>{c.brand ? `${c.brand} — ` : ""}{c.name}</strong></div>
                    <div>barcode: {c.obf_barcode || "(none)"} · id: {c.id}</div>
                    <div>score: <strong>{c.score}</strong>/100</div>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                      {c.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <h2 style={{ fontSize: 15, marginTop: 24 }}>Compatibility (top pick per category)</h2>
          <p style={{ color: "#888" }}>
            Runs checkRoutineCompatibility on the #1-ranked product from each
            category above, using their real parsed ingredients.
          </p>
          {compatibility && <pre style={{ background: "#f4f4f0", padding: 12, borderRadius: 6, overflowX: "auto" }}>{JSON.stringify(compatibility, null, 2)}</pre>}
          {!compatibility && <p style={{ color: "#888" }}>Need at least 2 categories with a top pick to compare.</p>}
        </>
      )}
    </div>
  );
}
