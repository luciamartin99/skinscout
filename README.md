# SkinScout

A skincare comparison prototype: browse products, compare two head-to-head,
build a skin profile, and get an AI-generated scouting report.

## Project structure

```
skinscout/
├── src/
│   ├── App.jsx        ← the whole frontend (all pages/components live here)
│   └── main.jsx        ← mounts App into index.html
├── api/
│   ├── generate-report.js   ← serverless function: builds the AI comparison report
│   └── ask.js                ← serverless function: powers the "Ask SkinScout" chat
├── index.html
├── package.json
└── vite.config.js
```

**Why two layers (frontend + api/)?** The browser can never be trusted with
a secret API key — anyone could open dev tools and steal it. So the React
app calls our own `/api/generate-report` and `/api/ask` endpoints, and
*those* (running on the server, never sent to the visitor) call the AI
provider with the real key. If no key is set, the same endpoints return a
realistic mocked response, so the site always works end-to-end.

## Run it locally

```bash
npm install
npm run dev
```

Open the local URL it prints (usually `http://localhost:5173`).

Note: locally, `npm run dev` only runs the frontend — the `/api` routes need
Vercel's dev server to work. Use `npx vercel dev` instead if you want to test
the AI routes locally (see deploy steps below, step 1, to get the Vercel CLI).

## Deploy it for free (get a public URL)

**Step 1 — Install Node.js** (if you don't have it): https://nodejs.org (LTS version).

**Step 2 — Put the project on GitHub**
1. Create a free account at https://github.com if you don't have one.
2. Create a new empty repository (e.g. `skinscout`).
3. In a terminal, inside this project folder:
   ```bash
   git init
   git add .
   git commit -m "SkinScout prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/skinscout.git
   git push -u origin main
   ```

**Step 3 — Deploy on Vercel**
1. Create a free account at https://vercel.com (you can sign up with GitHub).
2. Click "Add New… → Project", pick your `skinscout` repo, click Import.
3. Leave all settings as default (Vercel auto-detects Vite) and click Deploy.
4. In ~1 minute you get a public URL like `https://skinscout-yourteam.vercel.app`.
5. Optional: in Project Settings → Domains, you can rename it to something
   cleaner (e.g. `skinscout-mba.vercel.app`) — no coding needed.

**Step 4 — (Optional) Turn on real AI answers**
By default the site works fully with realistic mocked AI responses — no key
needed, nothing to configure. If you want live AI-generated reports:
1. Get an API key from https://console.anthropic.com (or adapt `api/*.js`
   to use OpenAI's API instead — same idea, different endpoint).
2. In Vercel: Project → Settings → Environment Variables → add
   `ANTHROPIC_API_KEY` with your key.
3. Redeploy (Vercel → Deployments → ⋮ → Redeploy).

## What to say when explaining the build

- **Frontend**: React + Vite. All UI (`App.jsx`) is one component tree:
  Home, Discover (search/filter/sort), Product Profile (radar chart via
  `recharts`), Compare (side-by-side stats + radar + personalisation),
  My Skin (profile form), Ask SkinScout (chat UI).
- **Data**: 12 fictional products with structured stats (hydration, acne
  suitability, sensitivity, brightening, anti-ageing, ingredient quality,
  value) — hardcoded as sample data for the prototype, no real database.
- **AI integration**: two serverless functions (`api/generate-report.js`,
  `api/ask.js`) receive only the structured product data + user profile,
  call the LLM with a system prompt that forbids inventing ingredients,
  prices or medical claims, and parse a structured JSON response. Key
  stays server-side; frontend never sees it.
- **Fallback design**: every AI call has a deterministic mock fallback, so
  the demo never breaks even offline or without a configured key.
- **Design system**: custom CSS variables (forest green / burgundy / sage
  palette), Fraunces for display type, Inter for UI — no UI library, built
  by hand to avoid a generic template look.
