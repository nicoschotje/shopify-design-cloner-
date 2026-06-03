# Goal 1 — Shopify Theme Store Recon

## Objective

Browse the Shopify Theme Store, identify the 5 most expensive paid themes, extract their design
DNA (colors, typography, layout patterns, UI patterns), and save everything to `design-analysis.json`
at the repo root. This file is the input for Goal 2.

## What to read first

- `AGENTS.md` — stack, schema, constraints, verify gate
- `package.json` — check if dependencies are already installed, if not run `npm install`

## Steps Codex must take

### Step 1 — Write the scraper

Create `scripts/scrape.js`. It must:

1. Launch Playwright Chromium (headful is fine, headless is preferred)
2. Navigate to `https://themes.shopify.com`
3. Find the price filter or sort control. As of mid-2026 the Theme Store has a sort-by-price
   option — find and activate "Price: High to Low" or equivalent. If the UI has changed,
   fall back to scraping all paid themes and sorting by price in code.
4. Collect the top 5 results by price (skip free themes, price = 0)
5. For each of the 5 themes, visit its detail page and extract:
   - Theme name and price
   - Shopify theme URL (current page URL)
   - Preview/demo URL (the "View demo" link)
   - From the preview page CSS or page source: primary color, secondary color, accent color,
     text color, background color. Use `page.evaluate()` to read computed CSS variables or
     look for a style guide section in the theme page.
   - Font names from Google Fonts `<link>` tags or `font-family` declarations in `<head>` CSS
   - Layout sections: read the feature list bullets on the theme detail page (they usually
     list sections like "Featured collection", "Testimonials", etc.)
   - UI patterns: look for keywords in the page text like "parallax", "sticky", "mega menu",
     "infinite scroll", "hover", "animation"
   - Mood: infer from the theme's own marketing description (luxury, minimal, bold, editorial, etc.)
6. Write the full array to `design-analysis.json` following the schema in `AGENTS.md`
7. Print a summary to stdout: theme name + price for each of the 5

**Error handling in the scraper:**
- Wrap each theme extraction in try/catch — if one theme fails, log the error and continue
  with the remaining themes
- Use `page.waitForSelector()` with a 10-second timeout before reading DOM elements
- If the Theme Store loads differently than expected (JS-heavy SPA behavior), use
  `page.waitForLoadState('networkidle')` before scraping

### Step 2 — Write the verify script

Create `scripts/verify-recon.js`. It must:

1. Read `design-analysis.json`
2. Assert exactly 5 entries
3. Assert every entry has: rank, name, price (> 0), shopify_url, colors (with primary, secondary,
   accent, text, background), typography (heading_font, body_font), layout_sections (array,
   at least 2 items), ui_patterns (array), mood (non-empty string)
4. Print "✅ Recon verified: 5 themes, all fields present" on success
5. Exit with code 1 and a clear error message on failure

### Step 3 — Update package.json

Add these scripts to `package.json`:
```json
"scripts": {
  "scrape": "node scripts/scrape.js",
  "verify-recon": "node scripts/verify-recon.js",
  "build": "node scripts/build.js",
  "verify": "node scripts/verify.js",
  "pipeline": "npm run scrape && npm run verify-recon && npm run build && npm run verify"
}
```

Add `playwright` as a dev dependency if not already present. Run `npm install` after updating.

### Step 4 — Run and validate

1. Run `npm run scrape`
2. If scraping fails: fix the error, re-run. Try up to 3 times before declaring BLOCKED.
3. Run `npm run verify-recon`
4. If verify fails: fix whatever is wrong in the JSON or scraper and re-run
5. Do NOT move on until `npm run verify-recon` exits with code 0

## Verify gate (objective completion criterion)

```
npm run verify-recon
```
Must exit with code 0. This is the ONLY acceptable proof that this goal is done.
Do not accept "I think the JSON looks right" as a proxy signal.

## Constraints

- Internet access must be ON (this goal cannot work without it)
- Do not fabricate theme data if scraping fails — use the BLOCKED protocol
- If fewer than 5 paid themes are found (very unlikely), document how many you found and BLOCKED
- The verify script must be runnable by anyone with `node` installed — no special env vars needed

## BLOCKED protocol

If the Shopify Theme Store URL structure has fundamentally changed, or Playwright cannot load
the page after 3 attempts:

1. Commit whatever partial `design-analysis.json` exists (even empty `[]`)
2. Commit all scripts written so far
3. Open a PR with title `[Goal 1] BLOCKED — [reason]`
4. PR description must start with: `BLOCKED: [exact reason, e.g. "Theme Store URL returns 403"]`
5. Stop. Do not guess. Do not fabricate.

## Output: what this PR must contain

- `scripts/scrape.js`
- `scripts/verify-recon.js`
- `package.json` (updated with scripts + playwright dependency)
- `design-analysis.json` (5 theme objects, all fields populated)
- `npm run verify-recon` passes in CI
