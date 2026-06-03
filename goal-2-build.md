# Goal 2 — Build the Sites

## Prerequisite

**Goal 1's PR must already be merged before you run this.** `design-analysis.json` must exist at
the repo root with 10 complete theme objects. If it doesn't exist, stop immediately and report BLOCKED.

## Objective

Read `design-analysis.json` and build 10 complete, visually polished static websites — one per theme —
inside the `sites/` directory. Each site must faithfully reproduce the mood, color palette,
typography, and layout sections of its source theme. The result should look like a real Shopify
theme demo page — not a mockup, not a skeleton.

## What to read first

- `AGENTS.md` — quality bar, constraints, verify gate, what NOT to do
- `design-analysis.json` — your design source of truth for all 10 sites

## Steps Codex must take

### Step 1 — Write the site generator

Create `scripts/build.js`. It must:

1. Read and parse `design-analysis.json`
2. For each of the 10 theme entries, create a directory `sites/[slug]/` where `[slug]` is the
   theme name lowercased with spaces replaced by hyphens (e.g. "Prestige" → `sites/prestige/`)
3. Generate `index.html`, `style.css`, and `main.js` for each theme
4. Print build status to stdout as each site completes

### Step 2 — Build each site

Each site must independently implement the following, driven entirely by the data in its theme's
`design-analysis.json` entry:

#### `style.css` requirements

- CSS custom properties at `:root` mapping to the theme's extracted colors and fonts:
  ```css
  :root {
    --color-primary: [from JSON];
    --color-secondary: [from JSON];
    --color-accent: [from JSON];
    --color-text: [from JSON];
    --color-bg: [from JSON];
    --font-heading: [from JSON], serif;
    --font-body: [from JSON], sans-serif;
  }
  ```
- A Google Fonts `@import` for the heading and body fonts (use the actual font names from the JSON)
- Mobile-first responsive layout with breakpoints at 768px and 1280px
- NO CSS framework — all styles are custom
- Smooth CSS transitions on interactive elements (nav hover, card hover, button hover)
- A sticky navigation bar
- The overall aesthetic must match the theme's `mood` field

#### `index.html` requirements

The page must include ALL of the sections listed in the theme's `layout_sections` array.
Map each section name to the appropriate HTML structure:

| layout_sections value | What to build |
|---|---|
| hero-fullscreen / hero | Full-viewport hero with background image (use a free Unsplash placeholder URL), headline, subtext, CTA button |
| product-grid / featured-collection | 3-column grid of product cards with image, name, price |
| testimonials | 3 customer testimonials with name, quote, and star rating |
| newsletter | Email capture section with headline and input+button |
| about / brand-story | Two-column text + image section |
| lookbook / editorial | Full-width image grid with overlay text |
| features / selling-points | Icon + text features list (3 or 4 items) |
| collection-list | Horizontal scroll or grid of collection tiles |
| announcement-bar | Thin bar at the top of the page for promotions |
| footer | Full footer with nav links, social icons, copyright |

Every site must have at minimum: announcement-bar, sticky-nav, hero, product-grid, testimonials, footer.
If the JSON lists additional sections, include those too.

Use realistic placeholder content — brand name, product names, prices, taglines — that matches
the theme's mood. A luxury theme gets luxury brand copy. A bold streetwear theme gets streetwear copy.
Do NOT use "Lorem ipsum" or placeholder text like "Heading Goes Here".

#### `main.js` requirements

Implement the `ui_patterns` from the theme's JSON. Minimum implementations:

- **sticky-nav**: add/remove a CSS class on scroll to shrink/style the nav
- **hover-zoom-cards**: handled in CSS with `transform: scale()` on hover, but wire up any JS fallbacks
- **parallax-hero**: a simple `window.addEventListener('scroll')` that shifts the hero background
- **mobile-menu**: hamburger toggle for the nav on mobile
- Any other pattern listed in the theme's `ui_patterns` array — implement the simplest working version

#### Quality bar (non-negotiable)

- Every file must be at least 5KB (enforced by the verify script)
- Zero `<script>` errors when loaded in a browser
- The page must look intentionally designed, not auto-generated. Apply spacing, whitespace,
  shadows, and visual hierarchy that match the theme's mood
- Each site is noticeably different from the others — different layout, colors, and feel

### Step 3 — Write the verify script

Create `scripts/verify.js`. It must:

1. Read the `sites/` directory and assert exactly 10 subdirectories exist
2. For each subdirectory, assert:
   - `index.html` exists and is ≥ 5KB
   - `style.css` exists and is ≥ 5KB
   - `main.js` exists and is ≥ 1KB
   - `index.html` contains: `<!DOCTYPE html`, `lang=`, `viewport`, at least one `<h1>`, at
     least one `<section>`, a `<footer>`
3. Print "✅ Build verified: 10 sites, all files present and sized correctly" on success
4. Exit with code 1 and clear error detail on failure

### Step 4 — Run and validate

1. Run `npm run build`
2. Run `npm run verify`
3. If verify fails: fix the failing site(s) and re-run
4. Do NOT open a PR until `npm run verify` exits with code 0

## Verify gate (objective completion criterion)

```
npm run verify
```
Must exit with code 0. This is the ONLY acceptable proof that this goal is done.

## Constraints

- No CSS frameworks (Tailwind, Bootstrap, etc.)
- No npm packages for the sites themselves — only `scripts/build.js` can use npm packages
- Internet OFF is fine for this goal — no browsing needed, only file generation
- Do not modify `design-analysis.json`
- Do not modify `AGENTS.md`
- Use real Unsplash URLs for images (format: `https://images.unsplash.com/photo-[id]?w=1200&q=80`)

## BLOCKED protocol

If `design-analysis.json` does not exist or has fewer than 5 entries:
1. Open a PR with title `[Goal 2] BLOCKED — design-analysis.json missing or incomplete`
2. Description: `BLOCKED: Goal 1 must be completed and merged first. Found [N] theme entries, need 5.`
3. Stop.

## Output: what this PR must contain

- `scripts/build.js`
- `scripts/verify.js`
- `sites/[theme-1]/` through `sites/[theme-10]/` — each with `index.html`, `style.css`, `main.js`
- `npm run verify` passes (exit code 0)
