# AGENTS.md — Shopify Design Cloner

This repo has ONE purpose: scrape the Shopify Theme Store for premium $500-$1000
theme presets, extract their design DNA, and build standalone static websites inspired by those designs.

---

## Stack

| Layer | Technology |
|---|---|
| Browser scraping | Node.js + Playwright (Chromium) |
| Site output | Vanilla HTML + CSS + JavaScript (no framework) |
| Verify | Node.js scripts in `scripts/` |
| Package manager | npm |

---

## Commands

```bash
# Install all dependencies
npm install

# Run the Shopify scraper (Goal 1)
npm run scrape

# Verify recon output is complete and valid (Goal 1 verify gate)
npm run verify-recon

# Build all sites from design-analysis.json (Goal 2)
npm run build

# Verify all sites are complete and valid (Goal 2 verify gate)
npm run verify

# Full pipeline (scrape → verify-recon → build → verify)
npm run pipeline
```

---

## Directory Structure

```
/
├── AGENTS.md              ← you are here
├── package.json
├── scripts/
│   ├── scrape.js          ← Playwright scraper (Codex writes this in Goal 1)
│   ├── verify-recon.js    ← verifies design-analysis.json (Codex writes in Goal 1)
│   ├── build.js           ← site generator (Codex writes this in Goal 2)
│   └── verify.js          ← verifies all sites exist and are valid (Codex writes in Goal 2)
├── design-analysis.json   ← output of Goal 1 (DO NOT hand-edit)
└── sites/
    ├── theme-1/           ← one dir per theme
    │   ├── index.html
    │   ├── style.css
    │   └── main.js
    ├── theme-2/
    └── ...
```

---

## Constraints and rules — READ THESE CAREFULLY

1. **Shopify Theme Store URL to scrape:** `https://themes.shopify.com`  
   - Sort by price descending to find premium presets in the $500-$1000 tier.
   - Target theme presets with a one-time purchase price of at least $500 and at most $1000.
   - Extract from each theme's detail page: name, price, preview URL, primary colors (from CSS or screenshots), fonts (Google Fonts or system fonts listed), layout sections (hero, feature grid, testimonials, etc.), and any notable UI patterns.

2. **design-analysis.json schema** — each entry must have:
   ```json
   {
     "rank": 1,
     "name": "Theme Name",
     "price": 380,
     "shopify_url": "https://themes.shopify.com/themes/...",
     "preview_url": "https://...",
     "colors": {
       "primary": "#1a1a1a",
       "secondary": "#f5f5f0",
       "accent": "#c9a96e",
       "text": "#2d2d2d",
       "background": "#ffffff"
     },
     "typography": {
       "heading_font": "Playfair Display",
       "body_font": "Inter",
       "heading_weight": "700",
       "base_size": "16px"
     },
     "layout_sections": ["hero-fullscreen", "product-grid", "testimonials", "newsletter"],
     "ui_patterns": ["sticky-nav", "parallax-hero", "hover-zoom-cards"],
     "mood": "luxury / minimal / editorial"
   }
   ```

3. **Site quality bar** — each built site must:
   - Have a proper semantic HTML structure (DOCTYPE, meta viewport, lang attribute)
   - Be fully responsive (mobile-first, at least 375px and 1280px look correct)
   - Match the color palette, typography, and layout sections from the analysis JSON
   - Include real placeholder content (not "Lorem ipsum" — use realistic product/brand copy)
   - Load with zero console errors
   - Have a visually polished hero section that would pass for a real Shopify theme demo page

4. **Do NOT:**
   - Modify `AGENTS.md` or `design-analysis.json` once Goal 1 is complete
   - Use any CSS framework (no Tailwind, no Bootstrap) — write custom CSS
   - Add any backend, server, or build step — pure static files only
   - Create more than 10 site directories (one per theme in the top 10)
   - Copy Shopify's actual theme code (legal risk) — INSPIRE and abstract, do not copy

5. **BLOCKED protocol:**  
   If Playwright cannot load a page after 3 retries, or the Theme Store structure has changed making scraping impossible, commit progress with whatever partial data you have, open a PR with description starting `BLOCKED: [reason]`, and stop. Do not fabricate theme data.

6. **Internet access is required for Goal 1.** Confirm it is enabled before running the scraper.

---

## Verify gates — these are the objective completion criteria

### Goal 1 — `npm run verify-recon` must pass
- `design-analysis.json` exists at repo root
- It contains exactly 10 theme objects
- Every object has all required fields from the schema above
- All `price` values are numbers > 0

### Goal 2 — `npm run verify` must pass
- `sites/` directory exists and contains exactly 10 subdirectories
- Each subdirectory has `index.html`, `style.css`, and `main.js`
- Each `index.html` passes a structural check: has DOCTYPE, `<html lang>`, `<meta viewport>`, at least one `<h1>`, at least one `<section>`
- No site file is under 5KB (a file that small is a skeleton, not a finished page)

---

## What Codex must deliver as PRs

- **Goal 1 PR:** adds `scripts/scrape.js`, `scripts/verify-recon.js`, updates `package.json` scripts, and adds `design-analysis.json`
- **Goal 2 PR:** adds `scripts/build.js`, `scripts/verify.js`, and the full `sites/` directory with all 10 complete sites
