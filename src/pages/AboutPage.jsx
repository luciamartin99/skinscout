const TEAM = [
  { name: "Marta Villagrán" },
  { name: "Zainab El Hassani"},
  { name: "Lucía Martín"},
  { name: "Alejandra Aranguren"},
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }} className="ss-fade">
        <h1 className="ss-serif" style={{ fontSize: "clamp(30px,4vw,42px)", fontWeight: 600, marginBottom: 14 }}>
          Skincare deserves a scoreboard too.
        </h1>
        <p style={{ color: "var(--ink-soft)", maxWidth: 560, margin: "0 auto", fontSize: 16, lineHeight: 1.6 }}>
          SkinScout started as a simple frustration: choosing between two serums shouldn't feel harder than
          reading a stat sheet. So we built one — comparing skincare the way scouts compare athletes, with
          clear numbers instead of marketing claims.
        </p>
      </div>

      <div className="ss-card" style={{ padding: 28, marginBottom: 40 }}>
        <h2 className="ss-serif" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>What SkinScout is</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7, marginBottom: 12 }}>
          A comparison platform for skincare products, built the way sports statistics platforms compare
          players: head-to-head stats, radar charts, and a scouting report that explains the recommendation
          in plain language instead of just handing over a score.
        </p>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7 }}>
          This is a university prototype: the product catalog and performance scores are SkinScout estimates
          built for demonstration, not verified lab or clinical data.
        </p>
      </div>

      <div className="ss-card" style={{ padding: 28, marginBottom: 40 }}>
        <h2 className="ss-serif" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Who's behind it</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7 }}>
          SkinScout is built by four MBA candidates at INSEAD with backgrounds in strategy consulting at
          McKinsey. We brought the same structured, evidence-first thinking we used with
          clients to a category that usually runs on marketing claims instead of data — treating skincare
          comparison as a product and analytics problem, not just a shopping decision.
        </p>
      </div>

      <h2 className="ss-serif" style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 22 }}>The founders</h2>
      <div className="ss-card ss-fade" style={{ padding: 16, overflow: "hidden" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
          <img src="/team/founders.jpg" alt="SkinScout founders" style={{ width: "100%", display: "block", objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px 22px", flexWrap: "wrap", paddingBottom: 8 }}>
          {TEAM.map((member) => (
                       <div key={member.name} style={{ textAlign: "center" }}>
              <div className="ss-serif" style={{ fontWeight: 600, fontSize: 14.5 }}>{member.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
