import fs from 'node:fs';
import path from 'node:path';

const analysisPath = path.resolve('design-analysis.json');
const EXPECTED_THEME_COUNT = Number(process.env.THEME_COUNT || 10);

function fail(message) {
  console.error(`Recon verify failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(analysisPath)) {
  fail('design-analysis.json does not exist at repo root');
}

let themes;
try {
  themes = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
} catch (error) {
  fail(`design-analysis.json is not valid JSON: ${error.message}`);
}

if (!Array.isArray(themes)) {
  fail('design-analysis.json must contain an array');
}

if (themes.length !== EXPECTED_THEME_COUNT) {
  fail(`expected exactly ${EXPECTED_THEME_COUNT} theme entries, found ${themes.length}`);
}

const requiredColorKeys = ['primary', 'secondary', 'accent', 'text', 'background'];

themes.forEach((theme, index) => {
  const label = `entry ${index + 1}${theme?.name ? ` (${theme.name})` : ''}`;

  if (!Number.isInteger(theme.rank) || theme.rank < 1) {
    fail(`${label}: rank must be a positive integer`);
  }

  if (!theme.name || typeof theme.name !== 'string') {
    fail(`${label}: name must be a non-empty string`);
  }

  if (typeof theme.price !== 'number' || theme.price <= 0) {
    fail(`${label}: price must be a number > 0`);
  }

  if (!theme.shopify_url || typeof theme.shopify_url !== 'string') {
    fail(`${label}: shopify_url must be a non-empty string`);
  }

  if (!theme.colors || typeof theme.colors !== 'object') {
    fail(`${label}: colors object is required`);
  }

  for (const colorKey of requiredColorKeys) {
    if (!theme.colors[colorKey] || typeof theme.colors[colorKey] !== 'string') {
      fail(`${label}: colors.${colorKey} must be a non-empty string`);
    }
  }

  if (!theme.typography || typeof theme.typography !== 'object') {
    fail(`${label}: typography object is required`);
  }

  if (!theme.typography.heading_font || typeof theme.typography.heading_font !== 'string') {
    fail(`${label}: typography.heading_font must be a non-empty string`);
  }

  if (!theme.typography.body_font || typeof theme.typography.body_font !== 'string') {
    fail(`${label}: typography.body_font must be a non-empty string`);
  }

  if (!Array.isArray(theme.layout_sections) || theme.layout_sections.length < 2) {
    fail(`${label}: layout_sections must be an array with at least 2 items`);
  }

  if (!Array.isArray(theme.ui_patterns)) {
    fail(`${label}: ui_patterns must be an array`);
  }

  if (!theme.mood || typeof theme.mood !== 'string') {
    fail(`${label}: mood must be a non-empty string`);
  }
});

console.log(`✅ Recon verified: ${EXPECTED_THEME_COUNT} themes, all fields present`);
