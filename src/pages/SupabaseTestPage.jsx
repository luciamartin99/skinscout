import { useEffect, useState } from "react";
import { fetchSkinTypes } from "../lib/supabaseClient.js";

// TEMPORARY — connection smoke test only, not part of the real app.
// Visit any deployment at /?supabase-test=1 to see this instead of the
// normal app. Delete this file and the check in App.jsx once Supabase
// connectivity has been confirmed. Read-only: uses the public anon key and
// only ever SELECTs from the skin_types lookup table.
export default function SupabaseTestPage() {
  const [status, setStatus] = useState("loading");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSkinTypes().then(({ data, error }) => {
      if (error) {
        setError(error.message);
        setStatus("error");
      } else {
        setRows(data);
        setStatus("done");
      }
    });
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 40, fontFamily: "monospace", fontSize: 14, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 20 }}>Supabase connection test (temporary)</h1>
      <p>Reads the <code>skin_types</code> table with the public anon key, read-only.</p>

      {status === "loading" && <p>Loading…</p>}

      {status === "error" && (
        <div style={{ color: "#b00020" }}>
          <p><strong>Connection failed:</strong></p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        </div>
      )}

      {status === "done" && (
        <div style={{ color: "#1a7a3a" }}>
          <p><strong>Connected. {rows.length} row(s) returned:</strong></p>
          <ul>
            {rows.map((row) => (
              <li key={row.id}>{row.key} → {row.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
