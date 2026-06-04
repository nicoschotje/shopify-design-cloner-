# Setup Guide — Shopify Design Cloner

How to run this end-to-end with Codex in two goal sessions.

---

## Before you start (you do these — Codex can't)

### 1. Create the GitHub repo

Create a new GitHub repository called `shopify-design-cloner` (or any name you prefer).
Push this folder to it:

```bash
cd shopify-design-cloner
git init
git add .
git commit -m "Initial: AGENTS.md + goal prompts"
git remote add origin https://github.com/YOUR_USERNAME/shopify-design-cloner.git
git push -u origin main
```

### 2. Open the Codex app

Go to [chatgpt.com/codex](https://chatgpt.com/codex) or open the Codex app.
Connect your GitHub account and select the `shopify-design-cloner` repo.

---

## Goal 1 — Recon (run this first)

### In Codex settings for this task:
- ✅ **Internet access: ON** — the scraper cannot run without it
- Model: o3 or o4-mini (either works; o3 gives more reliable browser automation code)
- Approval mode: "Suggest" (let it run but review the diff before merge)

### Paste this as your Goal 1 prompt:

> Read `AGENTS.md` first, then read `goal-1-recon.md`. Follow the instructions in `goal-1-recon.md` exactly. The verify gate is `npm run verify-recon` — do not open a PR until it exits with code 0. Fix your own failures without asking for confirmation. If you cannot complete the goal, use the BLOCKED protocol described in `goal-1-recon.md`.

### After Codex opens a PR:
1. Review the PR diff — check that `design-analysis.json` has 10 real theme entries with real data
2. Check CI is green (or run `npm run verify-recon` yourself if CI isn't set up)
3. Merge the PR
4. **Do not run Goal 2 until you have merged Goal 1.**

---

## Goal 2 — Build (run after Goal 1 is merged)

### In Codex settings for this task:
- ✅ Internet access: OFF is fine (no scraping needed)
- Model: o3 or o4-mini

### Paste this as your Goal 2 prompt:

> Read `AGENTS.md` first, then read `goal-2-build.md`. The prerequisite is that `design-analysis.json` already exists at the repo root (it was merged in Goal 1). Follow `goal-2-build.md` exactly. The verify gate is `npm run verify` — do not open a PR until it exits with code 0. Fix your own failures without asking for confirmation. If `design-analysis.json` is missing, use the BLOCKED protocol in `goal-2-build.md`.

### After Codex opens a PR:
1. Review the PR diff — spot-check 2–3 of the site directories
2. Open one of the `index.html` files in your browser and look at it — this is the human check
3. If it looks right, merge

---

## What you'll have after both merges

```
shopify-design-cloner/
├── design-analysis.json       ← 10 premium $350-$500 Shopify blueprint presets, fully analyzed
└── sites/
    ├── prestige/              ← example: one site per theme
    │   ├── index.html
    │   ├── style.css
    │   └── main.js
    ├── theme-2/ ...
    ├── theme-3/ ...
    ├── theme-4/ ...
    └── theme-10/ ...
```

Each `index.html` opens as a standalone polished website with the design language of one
of Shopify's premium $350-$500 blueprint theme presets.

---

## If Codex gets BLOCKED

Any PR with a description starting `BLOCKED:` means Codex hit a wall it can't resolve alone.
Read the PR description — it will tell you exactly what it needs. Usually one of:
- The Shopify Theme Store changed its URL structure → manually browse and update the scraper URL
- A Google Fonts name didn't resolve → update the font name in `design-analysis.json`
- A file is below the 5KB size check → tell Codex to expand the specific site

Fix the one thing named, then re-run the same goal prompt.

---

## Cost note

Goal 1 is a short run (scraping + JSON generation) — probably under 30 minutes.
Goal 2 is heavier (building 10 complete sites) — expect 1–2 hours, possibly more.
Both run on your ChatGPT/Codex usage. Scope is already tight so token cost should be manageable.
