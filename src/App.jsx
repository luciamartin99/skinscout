import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, ChevronRight, ChevronLeft, Star, Sparkles, TrendingUp, Filter,
  Check, ArrowLeft, MessageCircle, Send, Sliders, AlertTriangle, X, Menu,
  Plus, Award, Droplets, ShieldCheck, Sun,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
} from "recharts";

/* ============================== DESIGN TOKENS ============================== */
const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#F6F2EA; --card:#FFFCF6; --forest:#1E3A2E; --forest-dk:#132B21;
  --burgundy:#6E2A3B; --sage:#9FB18F; --sage-lt:#E7EDE1; --blush:#E6C2B2;
  --beige:#E9E0C8; --ink:#282420; --ink-soft:#5B554C; --line:#E4DCC9;
}
*{box-sizing:border-box;}
.ss-root{font-family:'Inter',sans-serif; background:var(--bg); color:var(--ink); min-height:100vh;}
.ss-serif{font-family:'Fraunces',serif;}
.ss-tab{font-variant-numeric: tabular-nums;}
.ss-card{background:var(--card); border-radius:18px; border:1px solid var(--line); box-shadow:0 2px 14px rgba(30,58,46,0.06);}
.ss-btn{border-radius:999px; padding:12px 22px; font-weight:600; font-size:14.5px; border:none; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease;}
.ss-btn:hover{transform:translateY(-1px);}
.ss-btn:active{transform:translateY(0px);}
.ss-btn-primary{background:var(--forest); color:#F6F2EA;}
.ss-btn-primary:hover{box-shadow:0 6px 16px rgba(30,58,46,0.28);}
.ss-btn-outline{background:transparent; color:var(--forest); border:1.5px solid var(--forest);}
.ss-btn-outline:hover{background:var(--sage-lt);}
.ss-btn-burgundy{background:var(--burgundy); color:#FBF3EE;}
.ss-btn-burgundy:hover{box-shadow:0 6px 16px rgba(110,42,59,0.3);}
.ss-chip{border-radius:999px; padding:6px 13px; font-size:12.5px; font-weight:600; border:1px solid var(--line); background:var(--sage-lt); color:var(--forest-dk);}
.ss-input{border:1.5px solid var(--line); border-radius:12px; padding:11px 14px; font-size:14.5px; background:#fff; width:100%; font-family:'Inter',sans-serif;}
.ss-input:focus{outline:none; border-color:var(--sage);}
.ss-navlink{font-weight:600; font-size:14.5px; color:var(--ink-soft); cursor:pointer; padding:8px 4px; border-bottom:2px solid transparent;}
.ss-navlink.active{color:var(--forest); border-bottom-color:var(--forest);}
.ss-scroll::-webkit-scrollbar{height:6px; width:6px;}
.ss-scroll::-webkit-scrollbar-thumb{background:var(--line); border-radius:6px;}
.ss-fade{animation:ssFadeIn .35s ease both;}
@keyframes ssFadeIn{from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);}}
.ss-bar-track{height:8px; background:var(--sage-lt); border-radius:6px; overflow:hidden;}
.ss-bar-fill{height:100%; border-radius:6px; transition:width .6s ease;}
.ss-pack{border-radius:16px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;}
.ss-pack::after{content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0.08));}
`;

const STAT_META = {
  hydration: { label: "Hydration", color: "#3D7A8C" },
  acne: { label: "Acne-prone suitability", color: "#B5793B" },
  sensitivity: { label: "Sensitive-skin suitability", color: "#6E2A3B" },
  brightening: { label: "Brightening", color: "#C79A2E" },
  antiAgeing: { label: "Anti-ageing", color: "#5A4B8C" },
  ingredientQuality: { label: "Ingredient quality", color: "#1E3A2E" },
  value: { label: "Value for money", color: "#3F7A4D" },
};
const STAT_KEYS = Object.keys(STAT_META);

/* ============================== SAMPLE DATA ============================== */
const PRODUCTS = [
  {
    id: "p1", brand: "PureCloud", name: "Gentle Cleanser", category: "Cleanser",
    price: 14, size: 150, packColors: ["#EDE3D6", "#C9B79C"],
    skinTypes: ["Dry", "Sensitive", "Normal"], concerns: ["Redness", "Barrier repair"],
    fragranceFree: true, rating: 78,
    stats: { hydration: 70, acne: 40, sensitivity: 92, brightening: 20, antiAgeing: 15, ingredientQuality: 75, value: 82 },
    tags: ["Sensitive skin", "Fragrance-free", "Barrier support"],
    verdict: "The reliable veteran — soft on the skin, never overplays its hand.",
    keyIngredients: ["Oat extract", "Ceramide NP", "Glycerin"],
    potentialConcerns: ["Low-foaming — some users miss the 'squeaky clean' feel"],
    strengths: ["Very low irritation risk", "Leaves barrier intact", "Good for daily double cleansing"],
    weaknesses: ["Minimal effect on excess oil", "Not suited to heavy makeup removal"],
    bestFor: ["Dry skin", "Reactive/sensitive skin", "Post-treatment recovery"],
    usage: "AM and PM, lukewarm water, no scrubbing.",
    worksWith: ["Dermalab Barrier Base Cream", "Dew Theory Hyaluronic Serum"],
    cautionWith: ["Strong acids used back-to-back without a buffer"],
  },
  {
    id: "p2", brand: "ClearKind", name: "Balancing Cleanser", category: "Cleanser",
    price: 17, size: 150, packColors: ["#DCE8DA", "#7FA98C"],
    skinTypes: ["Oily", "Combination", "Normal"], concerns: ["Acne", "Barrier repair"],
    fragranceFree: true, rating: 84,
    stats: { hydration: 55, acne: 88, sensitivity: 62, brightening: 30, antiAgeing: 20, ingredientQuality: 80, value: 85 },
    tags: ["Acne-friendly", "Fragrance-free", "Oil control"],
    verdict: "A dependable two-way player — clears congestion without stripping.",
    keyIngredients: ["Salicylic acid 0.5%", "Zinc PCA", "Panthenol"],
    potentialConcerns: ["Mild tingling on first use for reactive skin"],
    strengths: ["Reduces breakouts over time", "Balances oil without over-drying", "Non-comedogenic"],
    weaknesses: ["Can feel drying if overused (2x/day max recommended)"],
    bestFor: ["Oily skin", "Acne-prone skin", "Combination skin"],
    usage: "Once daily PM, or AM+PM if oil levels are high.",
    worksWith: ["Verva Glow Play Gel", "Lumera Vitamin C Defence"],
    cautionWith: ["Other high-strength exfoliating acids same day"],
  },
  {
    id: "p3", brand: "Dermalab", name: "Foam Reset Cleanser", category: "Cleanser",
    price: 12, size: 200, packColors: ["#E4E9F0", "#8FA3BF"],
    skinTypes: ["Normal", "Combination"], concerns: ["Dehydration"],
    fragranceFree: false, rating: 71,
    stats: { hydration: 45, acne: 60, sensitivity: 50, brightening: 25, antiAgeing: 15, ingredientQuality: 65, value: 88 },
    tags: ["Everyday pick", "Foaming"],
    verdict: "Solid squad depth — nothing flashy, always shows up.",
    keyIngredients: ["Coco-glucoside", "Allantoin", "Aloe vera"],
    potentialConcerns: ["Contains parfum — a consideration for fragrance-sensitive users"],
    strengths: ["Satisfying foam texture", "Budget-friendly", "Large 200ml size"],
    weaknesses: ["Fragrance may not suit very reactive skin", "Average hydration retention"],
    bestFor: ["Normal skin", "Combination skin"],
    usage: "AM and PM.",
    worksWith: ["Solara Daily Shield SPF 50"],
    cautionWith: ["Retinoid treatments on very dry days"],
  },
  {
    id: "p4", brand: "Dew Theory", name: "Hyaluronic Serum", category: "Serum",
    price: 24, size: 30, packColors: ["#D8ECE9", "#5FA79B"],
    skinTypes: ["Dry", "Normal", "Combination", "Sensitive"], concerns: ["Dehydration"],
    fragranceFree: true, rating: 91,
    stats: { hydration: 96, acne: 55, sensitivity: 85, brightening: 30, antiAgeing: 45, ingredientQuality: 88, value: 80 },
    tags: ["Hydration MVP", "Fragrance-free", "Multi-weight HA"],
    verdict: "The league's top hydration scorer — plays well with almost any lineup.",
    keyIngredients: ["Multi-weight hyaluronic acid", "Panthenol", "Beta-glucan"],
    potentialConcerns: ["Needs a moisturiser layered on top to lock in water"],
    strengths: ["Deep, long-lasting hydration", "Lightweight, layers under anything", "Very low irritation"],
    weaknesses: ["Can feel tacky if applied to fully dry skin (mist first)"],
    bestFor: ["Dehydrated skin of any type", "Layering under makeup"],
    usage: "AM and PM on damp skin, seal with moisturiser.",
    worksWith: ["Dermalab Barrier Base Cream", "Lumera Vitamin C Defence"],
    cautionWith: ["None significant — a safe base layer"],
  },
  {
    id: "p5", brand: "Lumera", name: "Vitamin C Defence", category: "Serum",
    price: 32, size: 30, packColors: ["#FBEBC9", "#E0A63C"],
    skinTypes: ["Normal", "Dry", "Combination"], concerns: ["Pigmentation", "Ageing"],
    fragranceFree: false, rating: 86,
    stats: { hydration: 45, acne: 50, sensitivity: 48, brightening: 92, antiAgeing: 68, ingredientQuality: 85, value: 70 },
    tags: ["Brightening MVP", "Antioxidant"],
    verdict: "The brightening specialist — high scoring but needs careful rotation.",
    keyIngredients: ["Ascorbic acid 15%", "Vitamin E", "Ferulic acid"],
    potentialConcerns: ["Can irritate very sensitive or actively inflamed skin"],
    strengths: ["Visibly evens tone with consistent use", "Antioxidant protection alongside SPF", "Stable, low-oxidation formula"],
    weaknesses: ["Not ideal for highly reactive skin", "Short shelf life once opened (~3 months)"],
    bestFor: ["Uneven tone", "Dullness", "Early sun damage prevention"],
    usage: "AM only, before SPF. Patch test first.",
    worksWith: ["Solara Daily Shield SPF 50", "Dew Theory Hyaluronic Serum"],
    cautionWith: ["NightShift Retinal Renewal (use on alternate nights/times)"],
  },
  {
    id: "p6", brand: "NightShift", name: "Retinal Renewal", category: "Serum",
    price: 38, size: 30, packColors: ["#2B2733", "#6B5A8C"],
    skinTypes: ["Normal", "Combination"], concerns: ["Ageing"],
    fragranceFree: true, rating: 82,
    stats: { hydration: 40, acne: 58, sensitivity: 30, brightening: 45, antiAgeing: 94, ingredientQuality: 84, value: 68 },
    tags: ["Anti-ageing MVP", "Night-only"],
    verdict: "A high-impact closer — best used late in the routine, sparingly.",
    keyIngredients: ["Retinaldehyde 0.1%", "Squalane", "Bisabolol"],
    potentialConcerns: ["Purging/dryness possible in first 2-3 weeks", "Increases sun sensitivity"],
    strengths: ["Strong texture and fine-line improvement over time", "Faster-acting than standard retinol esters"],
    weaknesses: ["Not suited to sensitive or pregnant/breastfeeding users without medical advice", "Requires gradual introduction"],
    bestFor: ["Fine lines", "Uneven texture", "Experienced actives users"],
    usage: "PM only, 2-3x/week initially, always followed by SPF the next morning.",
    worksWith: ["Dermalab Barrier Base Cream"],
    cautionWith: ["Lumera Vitamin C Defence same session", "Other exfoliating acids"],
  },
  {
    id: "p7", brand: "Dermalab", name: "Barrier Base Cream", category: "Moisturiser",
    price: 22, size: 50, packColors: ["#EDE0D5", "#B98F6B"],
    skinTypes: ["Dry", "Sensitive", "Normal"], concerns: ["Barrier repair", "Redness"],
    fragranceFree: true, rating: 89,
    stats: { hydration: 90, acne: 45, sensitivity: 90, brightening: 20, antiAgeing: 40, ingredientQuality: 87, value: 84 },
    tags: ["Barrier support", "Sensitive skin", "Fragrance-free"],
    verdict: "The defensive anchor — quietly outperforms flashier moisturisers.",
    keyIngredients: ["Ceramide NP/AP/EOP", "Cholesterol", "Fatty acids"],
    potentialConcerns: ["Richer texture may feel heavy in humid climates"],
    strengths: ["Rebuilds compromised skin barrier", "Excellent for reactive or over-exfoliated skin", "Fragrance-free formula"],
    weaknesses: ["Too heavy for very oily skin", "Slower absorption"],
    bestFor: ["Dry or sensitised skin", "Post-active-ingredient recovery", "Eczema-prone skin (general use)"],
    usage: "AM and/or PM as final step.",
    worksWith: ["Dew Theory Hyaluronic Serum", "PureCloud Gentle Cleanser"],
    cautionWith: ["Layering under very oily sunscreens in humid weather"],
  },
  {
    id: "p8", brand: "CalmForm", name: "Centella Gel", category: "Moisturiser",
    price: 19, size: 50, packColors: ["#DCE9DC", "#6FA07E"],
    skinTypes: ["Sensitive", "Combination", "Oily"], concerns: ["Redness", "Barrier repair"],
    fragranceFree: true, rating: 85,
    stats: { hydration: 72, acne: 68, sensitivity: 94, brightening: 25, antiAgeing: 30, ingredientQuality: 82, value: 86 },
    tags: ["Sensitive skin", "Redness relief", "Lightweight"],
    verdict: "A calming role-player that fits almost any starting lineup.",
    keyIngredients: ["Centella asiatica extract", "Madecassoside", "Betaine"],
    potentialConcerns: ["Lighter hydration than cream-based options for very dry skin"],
    strengths: ["Visibly reduces redness and reactivity", "Gel texture suits oilier skin", "Fragrance-free"],
    weaknesses: ["Not rich enough for very dry climates without layering"],
    bestFor: ["Redness-prone skin", "Combination/oily skin needing calm, not heavy"],
    usage: "AM and PM.",
    worksWith: ["ClearKind Balancing Cleanser", "Dew Theory Hyaluronic Serum"],
    cautionWith: ["None significant"],
  },
  {
    id: "p9", brand: "Verva", name: "Glow Play Gel", category: "Moisturiser",
    price: 20, size: 50, packColors: ["#E9F0D8", "#A8C46B"],
    skinTypes: ["Oily", "Combination", "Normal"], concerns: ["Acne"],
    fragranceFree: false, rating: 80,
    stats: { hydration: 64, acne: 82, sensitivity: 55, brightening: 35, antiAgeing: 25, ingredientQuality: 76, value: 83 },
    tags: ["Acne-friendly", "Lightweight", "Oil control"],
    verdict: "Fast and light — great for oilier zones, less useful as a barrier rebuilder.",
    keyIngredients: ["Niacinamide 4%", "Hyaluronic acid", "Sodium PCA"],
    potentialConcerns: ["Contains light fragrance"],
    strengths: ["Absorbs quickly with no greasy residue", "Helps regulate shine through the day", "Non-comedogenic"],
    weaknesses: ["Less barrier-repair capacity than ceramide-rich creams", "Fragrance may not suit sensitised skin"],
    bestFor: ["Oily and combination skin", "Warm/humid climates"],
    usage: "AM and PM.",
    worksWith: ["ClearKind Balancing Cleanser", "Lumera Vitamin C Defence"],
    cautionWith: ["Dermalab Barrier Base Cream layered in humid weather (too rich together)"],
  },
  {
    id: "p10", brand: "Solara", name: "Daily Shield SPF 50", category: "Sunscreen",
    price: 21, size: 50, packColors: ["#FCEFD9", "#E7B94D"],
    skinTypes: ["Normal", "Dry", "Combination", "Sensitive"], concerns: ["Ageing", "Pigmentation"],
    fragranceFree: true, rating: 90,
    stats: { hydration: 68, acne: 55, sensitivity: 80, brightening: 40, antiAgeing: 55, ingredientQuality: 88, value: 82 },
    tags: ["Everyday MVP", "Fragrance-free", "Broad spectrum"],
    verdict: "The most-selected starter every season — balanced across every stat.",
    keyIngredients: ["Zinc oxide", "Octocrylene", "Vitamin E"],
    potentialConcerns: ["Slight white cast on deeper skin tones until blended fully"],
    strengths: ["Broad-spectrum protection with no heavy feel", "Plays well under makeup", "Fragrance-free"],
    weaknesses: ["Needs reapplication every 2 hours in direct sun, like all sunscreens"],
    bestFor: ["Daily wear, all skin types", "Anti-ageing prevention routines"],
    usage: "Every AM, reapply if outdoors for extended periods.",
    worksWith: ["Lumera Vitamin C Defence", "Dew Theory Hyaluronic Serum"],
    cautionWith: ["None significant"],
  },
  {
    id: "p11", brand: "Solara", name: "Matte Shield SPF 30", category: "Sunscreen",
    price: 19, size: 50, packColors: ["#E4E4E4", "#8C8C8C"],
    skinTypes: ["Oily", "Combination"], concerns: ["Acne"],
    fragranceFree: true, rating: 83,
    stats: { hydration: 40, acne: 85, sensitivity: 60, brightening: 30, antiAgeing: 40, ingredientQuality: 78, value: 85 },
    tags: ["Acne-friendly", "Matte finish", "Oil control"],
    verdict: "The specialist off the bench — brought on for shine control specifically.",
    keyIngredients: ["Zinc oxide", "Silica", "Niacinamide"],
    potentialConcerns: ["Lower SPF than some alternatives — reapplication matters more"],
    strengths: ["Genuine matte finish, minimal shine breakthrough", "Non-comedogenic"],
    weaknesses: ["SPF 30 vs 50 means less margin for long outdoor exposure", "Can feel too mattifying on drier skin"],
    bestFor: ["Oily, acne-prone skin", "Humid climates"],
    usage: "Every AM, reapply outdoors.",
    worksWith: ["ClearKind Balancing Cleanser", "Verva Glow Play Gel"],
    cautionWith: ["None significant"],
  },
  {
    id: "p12", brand: "Velora", name: "Mineral Veil SPF 40", category: "Sunscreen",
    price: 26, size: 50, packColors: ["#F1E6EC", "#C79AB0"],
    skinTypes: ["Sensitive", "Dry", "Normal"], concerns: ["Redness", "Barrier repair"],
    fragranceFree: true, rating: 87,
    stats: { hydration: 74, acne: 50, sensitivity: 95, brightening: 30, antiAgeing: 45, ingredientQuality: 86, value: 74 },
    tags: ["Sensitive skin", "Mineral filter", "Fragrance-free"],
    verdict: "The safe pick for reactive skin — gentle filters, gentle everything.",
    keyIngredients: ["Zinc oxide (mineral-only)", "Ceramide NP", "Panthenol"],
    potentialConcerns: ["Slight white cast typical of mineral-only formulas"],
    strengths: ["Very low irritation potential", "Suitable for compromised or reactive barriers", "Fragrance-free"],
    weaknesses: ["Higher price per ml than chemical-filter alternatives", "SPF 40 vs 50 alternatives"],
    bestFor: ["Sensitive or redness-prone skin", "Post-procedure sun protection"],
    usage: "Every AM, reapply outdoors.",
    worksWith: ["CalmForm Centella Gel", "Dermalab Barrier Base Cream"],
    cautionWith: ["None significant"],
  },
];

const SKIN_TYPES = ["Dry", "Oily", "Combination", "Sensitive", "Normal"];
const CONCERNS = ["Acne", "Dehydration", "Pigmentation", "Ageing", "Redness", "Barrier repair"];
const BUDGETS = ["Budget", "Mid-range", "Premium", "No preference"];
const CATEGORIES = ["Cleanser", "Serum", "Moisturiser", "Sunscreen"];

/* ============================== AI LAYER ==============================
   The browser NEVER talks to the AI provider directly. It calls our own
   backend routes (/api/generate-report and /api/ask, see the /api folder),
   which run server-side on Vercel. The real ANTHROPIC_API_KEY lives only
   in that server environment (set it in Vercel → Project → Settings →
   Environment Variables). If no key is configured there, those routes
   return a polished mock response automatically, so this frontend code
   works either way without changes.
========================================================================= */
function localMockReport(a, b, profile) {
  // Deterministic fallback so the prototype is always demonstrable offline.
  const concernKey = {
    Acne: "acne", Dehydration: "hydration", Pigmentation: "brightening",
    Ageing: "antiAgeing", Redness: "sensitivity", "Barrier repair": "sensitivity",
  }[profile.concern] || "value";
  const winner = a.stats[concernKey] >= b.stats[concernKey] ? a : b;
  const loser = winner === a ? b : a;
  return {
    recommendedProduct: `${winner.brand} ${winner.name}`,
    summary: `For ${profile.skinType.toLowerCase()} skin focused on ${profile.concern.toLowerCase()}, ${winner.brand} ${winner.name} is the stronger pick, scoring ${winner.stats[concernKey]}/100 on ${STAT_META[concernKey].label.toLowerCase()} versus ${loser.stats[concernKey]}/100 for ${loser.brand} ${loser.name}.`,
    reasons: [
      `${STAT_META[concernKey].label} score of ${winner.stats[concernKey]}/100, ahead of the alternative.`,
      `Key ingredients (${winner.keyIngredients.slice(0, 2).join(", ")}) directly support this concern.`,
      winner.fragranceFree ? "Fragrance-free formulation lowers irritation risk." : "Well-tolerated formulation for most users.",
    ],
    alternativeStrength: `${loser.brand} ${loser.name} still performs better on ${Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x])[0] === concernKey ? Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x])[1] : Object.keys(loser.stats).sort((x, y) => loser.stats[y] - loser.stats[x])[0]}, so it may suit users prioritising that instead.`,
    caveat: "These are SkinScout estimates for prototype purposes, not lab-verified claims. Individual skin response varies.",
    disclaimer: "SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns.",
  };
}

async function generateScoutingReport(a, b, profile) {
  try {
    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productA: a, productB: b, profile }),
    });
    if (!response.ok) throw new Error("Request failed");
    return await response.json();
  } catch (e) {
    return localMockReport(a, b, profile);
  }
}

async function askSkinScout(question, profile) {
  const catalog = PRODUCTS.map(({ id, brand, name, category, price, size, stats, tags, keyIngredients, bestFor }) => ({ id, brand, name, category, price, size, stats, tags, keyIngredients, bestFor }));
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, profile, catalog }),
    });
    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();
    return data.answer;
  } catch (e) {
    return `Based on catalog data: for "${question}", I'd point you toward the products tagged closest to your need — check the Discover page filters for skin type and concern, or open a product profile to compare stats directly. (This is a mocked response — no live AI connection right now.) SkinScout estimates only, not medical advice.`;
  }
}

/* ============================== SMALL COMPONENTS ============================== */
function ScorePill({ score, size = "md" }) {
  const big = size === "lg";
  const color = score >= 85 ? "#1E3A2E" : score >= 70 ? "#6E2A3B" : "#8C7A4E";
  return (
    <div
      className="ss-tab"
      style={{
        display: "inline-flex", alignItems: "baseline", gap: 4,
        background: "var(--sage-lt)", borderRadius: 14,
        padding: big ? "10px 18px" : "5px 10px",
      }}
    >
      <span style={{ fontWeight: 800, fontSize: big ? 34 : 16, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: big ? 14 : 10, color: "var(--ink-soft)", fontWeight: 600 }}>/100</span>
    </div>
  );
}

function StatBar({ statKey, value }) {
  const meta = STAT_META[statKey];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
        <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{meta.label}</span>
        <span className="ss-tab" style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div className="ss-bar-track">
        <div className="ss-bar-fill" style={{ width: `${value}%`, background: meta.color }} />
      </div>
    </div>
  );
}

function PackagingArt({ colors, category }) {
  const Icon = category === "Cleanser" ? Droplets : category === "Sunscreen" ? Sun : category === "Serum" ? Sparkles : ShieldCheck;
  return (
    <div
      className="ss-pack"
      style={{ background: `linear-gradient(160deg, ${colors[0]}, ${colors[1]})`, width: "100%", height: "100%" }}
    >
      <Icon size={34} color="#fff" strokeWidth={1.6} style={{ opacity: 0.85, zIndex: 1 }} />
    </div>
  );
}

function ProductCard({ product, onView, onCompare, compareActive }) {
  const topStats = Object.entries(product.stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="ss-card ss-fade" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 64, height: 64, flexShrink: 0 }}>
          <PackagingArt colors={product.packColors} category={product.category} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", letterSpacing: 0.2 }}>{product.brand}</div>
          <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{product.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{product.category} · €{product.price}</div>
        </div>
        <ScorePill score={product.rating} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {product.tags.slice(0, 3).map((t) => <span key={t} className="ss-chip">{t}</span>)}
      </div>
      <div>
        {topStats.map(([k, v]) => <StatBar key={k} statKey={k} value={v} />)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button className="ss-btn ss-btn-primary" style={{ flex: 1, fontSize: 13.5, padding: "10px 14px" }} onClick={() => onView(product.id)}>View profile</button>
        <button
          className="ss-btn"
          style={{ flex: 1, fontSize: 13.5, padding: "10px 14px", background: compareActive ? "var(--burgundy)" : "var(--beige)", color: compareActive ? "#fff" : "var(--ink)" }}
          onClick={() => onCompare(product.id)}
        >
          {compareActive ? "Added ✓" : "Add to comparison"}
        </button>
      </div>
    </div>
  );
}

/* ============================== NAV ============================== */
function NavBar({ view, setView, compareCount }) {
  const [open, setOpen] = useState(false);
  const items = [
    { key: "discover", label: "Discover" },
    { key: "compare", label: "Compare" },
    { key: "myskin", label: "My Skin" },
    { key: "ask", label: "Ask SkinScout" },
    { key: "about", label: "About Us" },
  ];
  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "rgba(246,242,234,0.92)", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(6px)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={18} color="#F6F2EA" />
          </div>
          <span className="ss-serif" style={{ fontSize: 21, fontWeight: 600 }}>SkinScout</span>
        </div>
        <div className="ss-scroll" style={{ display: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 26 }} className="ss-desktop-nav">
          {items.map((it) => (
            <span key={it.key} className={`ss-navlink ${view === it.key ? "active" : ""}`} onClick={() => setView(it.key)}>{it.label}</span>
          ))}
          {compareCount > 0 && (
            <span className="ss-chip" style={{ background: "var(--burgundy)", color: "#fff", borderColor: "var(--burgundy)" }} onClick={() => setView("compare")}>
              Comparison ({compareCount}/2)
            </span>
          )}
        </div>
        <button className="ss-btn ss-btn-primary" style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10 }} className="ss-mobile-nav">
          <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="ss-mobile-nav" style={{ padding: "0 24px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => (
            <span key={it.key} className={`ss-navlink ${view === it.key ? "active" : ""}`} onClick={() => { setView(it.key); setOpen(false); }}>{it.label}</span>
          ))}
        </div>
      )}
      <style>{`
        @media (min-width: 860px){ .ss-mobile-nav{ display:none !important; } .ss-desktop-nav{ display:flex !important; } }
        @media (max-width: 859px){ .ss-desktop-nav{ display:none !important; } .ss-mobile-nav{ display:flex !important; } }
      `}</style>
    </div>
  );
}

/* ============================== HOMEPAGE ============================== */
function HomePage({ setView, onCompare, compareIds, onView }) {
  const [q, setQ] = useState("");
  const top = [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 3);
  return (
    <div>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px 40px", textAlign: "center" }}>
        <h1 className="ss-serif ss-fade" style={{ fontSize: "clamp(34px,5.5vw,56px)", fontWeight: 600, lineHeight: 1.1, margin: 0 }}>
          Find the MVP of your<br />skincare routine.
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 520, margin: "18px auto 32px" }}>
          Compare skincare products by performance, ingredients and compatibility with your skin.
        </p>
        <div style={{ maxWidth: 480, margin: "0 auto 24px", position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 16, top: 15, color: "var(--ink-soft)" }} />
          <input
            className="ss-input" style={{ paddingLeft: 42 }}
            placeholder="Search cleansers, serums, moisturisers…"
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setView("discover")}
          />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="ss-btn ss-btn-primary" onClick={() => setView("discover")}>Scout products</button>
          <button className="ss-btn ss-btn-outline" onClick={() => setView("compare")}>Compare products</button>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 className="ss-serif" style={{ fontSize: 26, fontWeight: 600 }}>Top performers</h2>
          <span style={{ fontSize: 13.5, color: "var(--forest)", fontWeight: 600, cursor: "pointer" }} onClick={() => setView("discover")}>See all products →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {top.map((p) => (
            <ProductCard key={p.id} product={p} onView={onView} onCompare={onCompare} compareActive={compareIds.includes(p.id)} />
          ))}
        </div>
      </section>

      <section style={{ background: "var(--forest)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 className="ss-serif" style={{ color: "#F6F2EA", fontSize: 26, fontWeight: 600, textAlign: "center", marginBottom: 40 }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 28 }}>
            {[
              { n: "1", t: "Build your skin profile", d: "Tell us your skin type, sensitivity and main concerns." },
              { n: "2", t: "Compare the stats", d: "Put two products head-to-head across seven performance categories." },
              { n: "3", t: "Get your AI scouting report", d: "See which product suits you best, and why, in plain language." },
            ].map((s) => (
              <div key={s.n} style={{ background: "rgba(246,242,234,0.06)", border: "1px solid rgba(246,242,234,0.14)", borderRadius: 16, padding: 26 }}>
                <div className="ss-serif" style={{ color: "var(--blush)", fontSize: 28, fontWeight: 600, marginBottom: 10 }}>{s.n}</div>
                <div style={{ color: "#F6F2EA", fontWeight: 700, fontSize: 16.5, marginBottom: 6 }}>{s.t}</div>
                <div style={{ color: "rgba(246,242,234,0.7)", fontSize: 14, lineHeight: 1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================== DISCOVER ============================== */
function DiscoverPage({ onView, onCompare, compareIds }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [skinType, setSkinType] = useState("All");
  const [concern, setConcern] = useState("All");
  const [price, setPrice] = useState("All");
  const [fragFree, setFragFree] = useState(false);
  const [sort, setSort] = useState("Highest rated");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (q && !(`${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (category !== "All" && p.category !== category) return false;
      if (skinType !== "All" && !p.skinTypes.includes(skinType)) return false;
      if (concern !== "All" && !p.concerns.includes(concern)) return false;
      if (fragFree && !p.fragranceFree) return false;
      if (price === "Budget" && p.price > 20) return false;
      if (price === "Mid-range" && (p.price <= 20 || p.price > 30)) return false;
      if (price === "Premium" && p.price <= 30) return false;
      return true;
    });
    const sorters = {
      "Highest rated": (a, b) => b.rating - a.rating,
      "Best value": (a, b) => b.stats.value - a.stats.value,
      "Most hydrating": (a, b) => b.stats.hydration - a.stats.hydration,
      "Best for sensitive skin": (a, b) => b.stats.sensitivity - a.stats.sensitivity,
    };
    return [...list].sort(sorters[sort]);
  }, [q, category, skinType, concern, price, fragFree, sort]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Discover products</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>Browse the full SkinScout roster and filter by what your skin needs.</p>

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 480 }}>
        <Search size={17} style={{ position: "absolute", left: 16, top: 14, color: "var(--ink-soft)" }} />
        <input className="ss-input" style={{ paddingLeft: 42 }} placeholder="Search cleansers, serums, moisturisers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <button className="ss-btn ss-btn-outline" style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px" }} onClick={() => setShowFilters(!showFilters)}>
        <Filter size={15} /> Filters {showFilters ? "▴" : "▾"}
      </button>

      {showFilters && (
        <div className="ss-card ss-fade" style={{ padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16 }}>
          <FilterSelect label="Category" value={category} setValue={setCategory} options={["All", ...CATEGORIES]} />
          <FilterSelect label="Skin type" value={skinType} setValue={setSkinType} options={["All", ...SKIN_TYPES]} />
          <FilterSelect label="Primary concern" value={concern} setValue={setConcern} options={["All", ...CONCERNS]} />
          <FilterSelect label="Price range" value={price} setValue={setPrice} options={["All", "Budget", "Mid-range", "Premium"]} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", marginTop: 22 }}>
            <input type="checkbox" checked={fragFree} onChange={(e) => setFragFree(e.target.checked)} /> Fragrance-free only
          </label>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{filtered.length} products</span>
        <FilterSelect label="Sort" value={sort} setValue={setSort} options={["Highest rated", "Best value", "Most hydrating", "Best for sensitive skin"]} inline />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onView={onView} onCompare={onCompare} compareActive={compareIds.includes(p.id)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--ink-soft)" }}>
            No products match those filters yet. Try widening your search.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, setValue, options, inline }) {
  return (
    <div style={inline ? { display: "flex", alignItems: "center", gap: 8 } : {}}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: inline ? 0 : 6 }}>{label}</div>
      <select className="ss-input" style={inline ? { width: "auto" } : {}} value={value} onChange={(e) => setValue(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ============================== PRODUCT PROFILE ============================== */
function ProfilePage({ product, setView, onCompare, compareIds }) {
  if (!product) return null;
  const radarData = STAT_KEYS.map((k) => ({ stat: STAT_META[k].label.replace(" suitability", ""), value: product.stats[k] }));
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 72px" }}>
      <button className="ss-btn ss-btn-outline" style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }} onClick={() => setView("discover")}>
        <ArrowLeft size={15} /> Back to Discover
      </button>

      <div className="ss-card" style={{ padding: 28, display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
          <PackagingArt colors={product.packColors} category={product.category} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sage)" }}>{product.brand}</div>
          <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, margin: "2px 0 6px" }}>{product.name}</h1>
          <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{product.category} · €{product.price} / {product.size}ml</div>
          <p style={{ fontStyle: "italic", color: "var(--ink)", marginBottom: 14, fontSize: 15 }}>"{product.verdict}"</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {product.tags.map((t) => <span key={t} className="ss-chip">{t}</span>)}
          </div>
          <button
            className="ss-btn"
            style={{ background: compareIds.includes(product.id) ? "var(--burgundy)" : "var(--forest)", color: "#fff" }}
            onClick={() => onCompare(product.id)}
          >
            {compareIds.includes(product.id) ? "Added to comparison ✓" : "Add to comparison"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <ScorePill score={product.rating} size="lg" />
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>SkinScout estimate</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }} className="ss-profile-grid">
        <div className="ss-card" style={{ padding: 24 }}>
          <h3 className="ss-serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Performance ratings <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>(SkinScout estimates)</span></h3>
          {STAT_KEYS.map((k) => <StatBar key={k} statKey={k} value={product.stats[k]} />)}
        </div>
        <div className="ss-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h3 className="ss-serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Stat radar</h3>
          <div style={{ flex: 1, minHeight: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10.5, fill: "var(--ink-soft)" }} />
                <Radar dataKey="value" stroke="var(--forest)" fill="var(--forest)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }} className="ss-profile-grid">
        <InfoBlock title="Key ingredients" items={product.keyIngredients} icon={<Sparkles size={15} />} />
        <InfoBlock title="Potential concerns" items={product.potentialConcerns} icon={<AlertTriangle size={15} />} />
        <InfoBlock title="Strengths" items={product.strengths} icon={<TrendingUp size={15} />} />
        <InfoBlock title="Weaknesses" items={product.weaknesses} icon={<X size={15} />} />
        <InfoBlock title="Recommended skin types" items={product.bestFor} icon={<Check size={15} />} />
        <InfoBlock title="Works well with" items={product.worksWith} icon={<Plus size={15} />} />
        <InfoBlock title="Use caution combining with" items={product.cautionWith} icon={<AlertTriangle size={15} />} />
        <InfoBlock title="Recommended usage" items={[product.usage]} icon={<ShieldCheck size={15} />} />
      </div>

      <style>{`@media (max-width: 720px){ .ss-profile-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function InfoBlock({ title, items, icon }) {
  return (
    <div className="ss-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, color: "var(--forest)" }}>
        {icon}<span style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-soft)", fontSize: 13.8, lineHeight: 1.6 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

/* ============================== COMPARE ============================== */
function ComparePage({ compareIds, setCompareId, skinProfile }) {
  const a = PRODUCTS.find((p) => p.id === compareIds[0]);
  const b = PRODUCTS.find((p) => p.id === compareIds[1]);
  const [localProfile, setLocalProfile] = useState({
    skinType: skinProfile.skinType || "Combination",
    concern: skinProfile.concerns?.[0] || "Barrier repair",
    budget: "No preference",
    avoid: skinProfile.avoid || "",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runReport = async () => {
    setLoading(true); setError(null); setReport(null);
    try {
      const r = await generateScoutingReport(a, b, localProfile);
      setReport(r);
    } catch (e) {
      setError("Couldn't generate a live report — showing a mocked one instead.");
      setReport(localMockReport(a, b, localProfile));
    } finally { setLoading(false); }
  };

  const radarData = a && b ? STAT_KEYS.map((k) => ({
    stat: STAT_META[k].label.replace(" suitability", ""),
    [a.brand]: a.stats[k], [b.brand]: b.stats[k],
  })) : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 className="ss-serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6 }}>Head-to-head comparison</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 26 }}>Pick two products from Discover, then generate a personalised scouting report.</p>

      {(!a || !b) ? (
        <div className="ss-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
          <p style={{ marginBottom: 10 }}>You've added {compareIds.length}/2 products to the comparison.</p>
          <p style={{ fontSize: 13.5 }}>Head to <b>Discover</b> and click "Add to comparison" on two products to build your matchup.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "center", marginBottom: 26 }} className="ss-vs-grid">
            {[a, b].map((p, idx) => (
              <div key={p.id} className="ss-card" style={{ padding: 20, textAlign: "center", position: "relative" }}>
                <button onClick={() => setCompareId(p.id, true)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}><X size={16} /></button>
                <div style={{ width: 72, height: 72, margin: "0 auto 10px" }}><PackagingArt colors={p.packColors} category={p.category} /></div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sage)" }}>{p.brand}</div>
                <div className="ss-serif" style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 10px" }}>€{p.price} · €{(p.price / (p.size / 10)).toFixed(2)}/10ml</div>
                <ScorePill score={p.rating} size="lg" />
              </div>
            ))}
            <div className="ss-serif" style={{ textAlign: "center", fontSize: 22, fontWeight: 600, color: "var(--burgundy)" }}>VS</div>
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Stat-by-stat</h3>
            {STAT_KEYS.map((k) => {
              const av = a.stats[k], bv = b.stats[k];
              return (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: "right", fontWeight: av > bv ? 800 : 500, color: av > bv ? "var(--forest)" : "var(--ink)" }}>{av}{av > bv && " 🏆"}</div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{STAT_META[k].label}</div>
                  <div style={{ textAlign: "left", fontWeight: bv > av ? 800 : 500, color: bv > av ? "var(--forest)" : "var(--ink)" }}>{bv > av && "🏆 "}{bv}</div>
                </div>
              );
            })}
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Radar comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10.5, fill: "var(--ink-soft)" }} />
                <Radar name={a.brand} dataKey={a.brand} stroke="var(--forest)" fill="var(--forest)" fillOpacity={0.3} />
                <Radar name={b.brand} dataKey={b.brand} stroke="var(--burgundy)" fill="var(--burgundy)" fillOpacity={0.25} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="ss-profile-grid">
            <InfoBlock title={`${a.brand} — key ingredients`} items={a.keyIngredients} icon={<Sparkles size={15} />} />
            <InfoBlock title={`${b.brand} — key ingredients`} items={b.keyIngredients} icon={<Sparkles size={15} />} />
            <InfoBlock title={`${a.brand} — best skin types`} items={a.bestFor} icon={<Check size={15} />} />
            <InfoBlock title={`${b.brand} — best skin types`} items={b.bestFor} icon={<Check size={15} />} />
          </div>

          <div className="ss-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Sliders size={16} color="var(--forest)" /><h3 className="ss-serif" style={{ fontSize: 17, fontWeight: 600 }}>Personalise your report</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
              <FilterSelect label="Skin type" value={localProfile.skinType} setValue={(v) => setLocalProfile({ ...localProfile, skinType: v })} options={SKIN_TYPES} />
              <FilterSelect label="Main concern" value={localProfile.concern} setValue={(v) => setLocalProfile({ ...localProfile, concern: v })} options={CONCERNS} />
              <FilterSelect label="Budget preference" value={localProfile.budget} setValue={(v) => setLocalProfile({ ...localProfile, budget: v })} options={BUDGETS} />
            </div>
            <button className="ss-btn ss-btn-burgundy" style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onClick={runReport} disabled={loading}>
              <Sparkles size={16} /> {loading ? "Generating…" : "Generate AI scouting report"}
            </button>

            {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--burgundy)" }}>{error}</div>}
            {loading && <div className="ss-fade" style={{ marginTop: 18, color: "var(--ink-soft)", fontSize: 14 }}>Scouting both products for your profile…</div>}
            {report && !loading && (
              <div className="ss-fade" style={{ marginTop: 20, background: "var(--sage-lt)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--forest)", marginBottom: 4 }}>RECOMMENDED PRODUCT</div>
                <div className="ss-serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 10 }}>{report.recommendedProduct}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>{report.summary}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>WHY IT WINS</div>
                <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                  {(report.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>WHERE THE OTHER PRODUCT WINS</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{report.alternativeStrength}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>CAVEAT</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14, fontStyle: "italic" }}>{report.caveat}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(255,255,255,0.6)", padding: 12, borderRadius: 10 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2, color: "var(--burgundy)" }} />
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>{report.disclaimer}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`@media (max-width: 700px){ .ss-vs-grid{ grid-template-columns: 1fr !important; } .ss-vs-grid > div:nth-child(3){ order:-1; } }`}</style>
    </div>
  );
}

/* ============================== MY SKIN ============================== */
function MySkinPage({ skinProfile, setSkinProfile }) {
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

/* ============================== ASK SKINSCOUT ============================== */
function AskPage({ skinProfile }) {
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
                color: m.role === "user" ? "#F6F2EA" : "var(--ink)",
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

/* ============================== ABOUT US ============================== */
const TEAM = [
  { name: "Marta Villagrán" },
  { name: "Zainab El Hassani"},
  { name: "Lucía Martín"},
  { name: "Alejandra Aranguren"},
];

function AboutPage() {
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

/* ============================== FOOTER ============================== */
function Footer() {
  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "26px 24px", background: "var(--card)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-start", color: "var(--ink-soft)", fontSize: 12.5, lineHeight: 1.6 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>SkinScout provides general product-comparison information and does not replace professional medical advice. Individual reactions may vary. Patch-test new products and consult a qualified professional for persistent skin concerns. All scores shown are SkinScout estimates created for this prototype, not verified lab or clinical claims.</span>
      </div>
    </div>
  );
}

/* ============================== APP ============================== */
export default function SkinScoutApp() {
  const [view, setView] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [skinProfile, setSkinProfile] = useState({});

  const onView = (id) => { setSelectedId(id); setView("profile"); window.scrollTo(0, 0); };
  const onCompare = (id, forceRemove) => {
    setCompareIds((cur) => {
      if (cur.includes(id) || forceRemove) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id];
      return [...cur, id];
    });
  };

  const selectedProduct = PRODUCTS.find((p) => p.id === selectedId);

  return (
    <div className="ss-root">
      <style>{FONTS_CSS}</style>
      <NavBar view={view} setView={setView} compareCount={compareIds.length} />
      {view === "home" && <HomePage setView={setView} onCompare={onCompare} compareIds={compareIds} onView={onView} />}
      {view === "discover" && <DiscoverPage onView={onView} onCompare={onCompare} compareIds={compareIds} />}
      {view === "profile" && <ProfilePage product={selectedProduct} setView={setView} onCompare={onCompare} compareIds={compareIds} />}
      {view === "compare" && <ComparePage compareIds={compareIds} setCompareId={onCompare} skinProfile={skinProfile} />}
      {view === "myskin" && <MySkinPage skinProfile={skinProfile} setSkinProfile={setSkinProfile} />}
      {view === "ask" && <AskPage skinProfile={skinProfile} />}
      {view === "about" && <AboutPage />}
      <Footer />
    </div>
  );
}
