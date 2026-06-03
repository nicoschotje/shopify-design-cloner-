import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const SHOPIFY_THEMES_URL = 'https://themes.shopify.com/themes';
const OUTPUT_PATH = path.resolve('design-analysis.json');
const SYSTEM_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function getLaunchOptions() {
  const executablePath =
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE ||
    (fs.existsSync(SYSTEM_CHROME_PATH) ? SYSTEM_CHROME_PATH : undefined);

  return {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  };
}

async function gotoWithRetries(page, url, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForSelector('body', { timeout: 10_000 });
      return;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      if (attempt < retries) {
        await page.waitForTimeout(1_500 * attempt);
      }
    }
  }

  throw lastError;
}

function absoluteUrl(href) {
  return new URL(href, 'https://themes.shopify.com').toString();
}

function extractPrice(text) {
  const match = text.match(/\$(\d[\d,]*)/);
  return match ? Number(match[1].replaceAll(',', '')) : 0;
}

function extractBaseSlug(href) {
  const match = href.match(/\/themes\/([^/?#]+)/);
  return match?.[1] ?? href;
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function activatePriceSort(page) {
  await gotoWithRetries(page, SHOPIFY_THEMES_URL);

  try {
    await page.locator('#SortBy').selectOption('price_high_to_low', { timeout: 10_000 });
    await page.waitForURL(/sort_by=price_high_to_low/, { timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await gotoWithRetries(page, `${SHOPIFY_THEMES_URL}?sort_by=price_high_to_low`);
  } catch (error) {
    console.warn(`Could not activate sort control, using sorted URL fallback: ${error.message}`);
    await gotoWithRetries(page, `${SHOPIFY_THEMES_URL}?sort_by=price_high_to_low`);
  }
}

async function collectThemeCards(page) {
  return page.locator('a[href*="/themes/"][href*="/presets/"]').evaluateAll((anchors) => {
    return anchors
      .map((anchor) => ({
        text: anchor.innerText.replace(/\s+/g, ' ').trim(),
        href: anchor.href,
      }))
      .filter((item) => /\$\d/.test(item.text));
  });
}

async function getTopPaidThemeCards(page) {
  await activatePriceSort(page);

  const cards = [];
  for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
    const url = `${SHOPIFY_THEMES_URL}?sort_by=price_high_to_low&page=${pageNumber}`;
    if (pageNumber > 1 || !page.url().includes('sort_by=price_high_to_low')) {
      await gotoWithRetries(page, url);
    }

    const pageCards = await collectThemeCards(page);
    cards.push(...pageCards);

    const uniquePaid = dedupeTopThemeCards(cards);
    if (uniquePaid.length >= 5) {
      return uniquePaid.slice(0, 5);
    }
  }

  return dedupeTopThemeCards(cards).slice(0, 5);
}

function dedupeTopThemeCards(cards) {
  const seenBaseSlugs = new Set();
  return cards
    .map((card, index) => ({
      ...card,
      href: absoluteUrl(card.href),
      baseSlug: extractBaseSlug(card.href),
      price: extractPrice(card.text),
      order: index,
    }))
    .filter((card) => card.price > 0)
    .sort((a, b) => b.price - a.price || a.order - b.order)
    .filter((card) => {
      if (seenBaseSlugs.has(card.baseSlug)) return false;
      seenBaseSlugs.add(card.baseSlug);
      return true;
    });
}

function firstHexColor(value) {
  if (!value) return null;

  const text = String(value);
  const hex = text.match(/#[0-9a-fA-F]{3,8}/)?.[0];
  if (hex) return normalizeHex(hex);

  const rgb = text.match(/rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})/);
  if (rgb) {
    return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  }

  const commaRgb = text.match(/(^|[^\d])(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})([^\d]|$)/);
  if (commaRgb) {
    return rgbToHex(Number(commaRgb[2]), Number(commaRgb[3]), Number(commaRgb[4]));
  }

  return null;
}

function normalizeHex(hex) {
  const clean = hex.toLowerCase();
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean.slice(0, 7);
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function readableFont(fontFamily, fallback) {
  if (!fontFamily) return fallback;
  const [firstFont] = fontFamily.split(',');
  return cleanText(firstFont.replaceAll('"', '').replaceAll("'", '')) || fallback;
}

function isNeutralColor(color) {
  return ['#000000', '#111111', '#151515', '#ffffff', '#f5f5f5', '#f7f7f7', '#fafafa'].includes(color);
}

function normalizeVarName(name) {
  return String(name).toLowerCase().replace(/^--/, '').replaceAll('-', '_');
}

function findVariableValue(vars, key) {
  const target = normalizeVarName(key);
  const exact = vars.find(([name]) => normalizeVarName(name) === target);
  if (exact?.[1]) return exact[1];

  const suffix = vars.find(([name]) => normalizeVarName(name).endsWith(`_${target}`));
  if (suffix?.[1]) return suffix[1];

  return null;
}

function chooseColor(vars, keys, fallback) {
  for (const key of keys) {
    const value = findVariableValue(vars, key);
    const color = firstHexColor(value);
    if (color) return color;
  }
  return fallback;
}

function chooseAccent(vars, sampledColors, fallback) {
  const preferred = [
    'accent',
    'highlight_background',
    'short_menu_background',
    'footer_form_button_background',
    'button_background_hover',
    'sale_badge_background',
    'discount_price_background',
    'swiper-theme-color',
  ];

  for (const key of preferred) {
    const color = chooseColor(vars, [key], null);
    if (color && !isNeutralColor(color)) return color;
  }

  return sampledColors.find((color) => !isNeutralColor(color)) || fallback;
}

function hexToRgb(hex) {
  const clean = normalizeHex(hex).slice(1);
  return {
    red: Number.parseInt(clean.slice(0, 2), 16),
    green: Number.parseInt(clean.slice(2, 4), 16),
    blue: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function relativeLuminance(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const channels = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(firstColor, secondColor) {
  const first = relativeLuminance(firstColor);
  const second = relativeLuminance(secondColor);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

function readableTextFor(background) {
  return relativeLuminance(background) > 0.5 ? '#111111' : '#ffffff';
}

function ensureReadableColors(colors) {
  if (contrastRatio(colors.text, colors.background) < 3) {
    return {
      ...colors,
      text: readableTextFor(colors.background),
    };
  }

  return colors;
}

async function extractPreviewDesign(browser, previewUrl) {
  if (!previewUrl) {
    return {
      colors: {
        primary: '#111111',
        secondary: '#f4f4f4',
        accent: '#b68b4c',
        text: '#222222',
        background: '#ffffff',
      },
      typography: {
        heading_font: 'Inter',
        body_font: 'Inter',
        heading_weight: '700',
        base_size: '16px',
      },
    };
  }

  const page = await browser.newPage({
    viewport: { width: 1365, height: 1200 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  });

  try {
    await gotoWithRetries(page, previewUrl);

    const design = await page.evaluate(() => {
      const sampleSelector = [
        'body',
        'h1',
        'h2',
        'header',
        'nav',
        'button',
        'a',
        'section',
        '.button',
        '.btn',
        '[class*="button"]',
        '[class*="hero"]',
        '[class*="banner"]',
        '[class*="card"]',
      ];

      const rootStyles = getComputedStyle(document.documentElement);
      const vars = [];
      for (let index = 0; index < rootStyles.length; index += 1) {
        const property = rootStyles.item(index);
        if (property.startsWith('--') && /(color|font|background|accent|primary|button|text|heading|body|card|header|footer)/i.test(property)) {
          vars.push([property, rootStyles.getPropertyValue(property).trim()]);
        }
      }

      const sampleStyles = sampleSelector
        .map((selector) => document.querySelector(selector))
        .filter(Boolean)
        .map((element) => {
          const styles = getComputedStyle(element);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            borderColor: styles.borderColor,
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
          };
        });

      const body = getComputedStyle(document.body);
      const heading = getComputedStyle(document.querySelector('h1, h2, .h1, .h2') || document.body);

      return {
        vars,
        sampleStyles,
        bodyFontFamily: body.fontFamily,
        bodyFontSize: body.fontSize,
        headingFontFamily: heading.fontFamily,
        headingFontWeight: heading.fontWeight,
      };
    });

    const vars = design.vars;
    const sampledColors = [
      ...design.sampleStyles.flatMap((style) => [
        firstHexColor(style.color),
        firstHexColor(style.backgroundColor),
        firstHexColor(style.borderColor),
      ]),
      ...vars.map(([, value]) => firstHexColor(value)),
    ].filter(Boolean);

    const colors = ensureReadableColors({
      primary: chooseColor(vars, ['heading_color', 'header_color', 'primary', 'button_border'], sampledColors[0] || '#111111'),
      secondary: chooseColor(vars, ['body_alternate_background', 'card_background', 'product_card_background', 'secondary'], '#f4f4f4'),
      accent: chooseAccent(vars, sampledColors, '#b68b4c'),
      text: chooseColor(vars, ['text_color', 'body_text', 'text'], firstHexColor(design.sampleStyles[0]?.color) || '#222222'),
      background: chooseColor(vars, ['body_background', 'background'], firstHexColor(design.sampleStyles[0]?.backgroundColor) || '#ffffff'),
    });

    return {
      colors,
      typography: {
        heading_font: readableFont(chooseFontVariable(vars, ['heading_font_family']) || design.headingFontFamily, 'Inter'),
        body_font: readableFont(chooseFontVariable(vars, ['body_font_family']) || design.bodyFontFamily, 'Inter'),
        heading_weight: cleanText(chooseFontVariable(vars, ['heading_font_weight']) || design.headingFontWeight || '700'),
        base_size: chooseBaseSize(vars, design.bodyFontSize),
      },
    };
  } finally {
    await page.close();
  }
}

function chooseFontVariable(vars, keys) {
  for (const key of keys) {
    const value = findVariableValue(vars, key);
    if (value) return value;
  }
  return null;
}

function chooseBaseSize(vars, fallback) {
  for (const key of ['body_font_size', 'base_font_size', 'medium_text', 'text']) {
    const value = chooseFontVariable(vars, [key]);
    if (value && /^(calc\(|\d)/.test(value) && !value.startsWith('#')) {
      return cleanText(value);
    }
  }

  return cleanText(fallback || '16px');
}

function extractPreviewUrlFromHtml(html) {
  return html.match(/https:\/\/[^"'<> ]+\.myshopify\.com\/?/i)?.[0] ?? '';
}

function extractFeatureLines(bodyText) {
  const match = bodyText.match(/WHAT'S INCLUDED\s+Features\s+([\s\S]*?)\nPresets/i);
  if (!match) return [];

  const categoryNames = new Set([
    'Cart and checkout',
    'Marketing and conversion',
    'Merchandising',
    'Product discovery',
    'Usage information',
    'SHOPIFY PLUS',
  ]);

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !categoryNames.has(line))
    .filter((line, index, list) => list.indexOf(line) === index);
}

function mapLayoutSections(featureLines, bodyText) {
  const all = `${featureLines.join(' ')} ${bodyText}`.toLowerCase();
  const sections = new Set(['announcement-bar', 'sticky-nav', 'hero-fullscreen', 'product-grid']);

  if (/lookbook|image galleries|image hotspot|product videos|slideshow|media/.test(all)) {
    sections.add('lookbook');
    sections.add('editorial');
  }

  if (/blogs|faq page|contact form|designer|brand/.test(all)) {
    sections.add('brand-story');
  }

  if (/recommended products|collection page|product filtering|cross-selling|recently viewed|combined listing/.test(all)) {
    sections.add('collection-list');
  }

  if (/promo banners|promo popups|in-menu promos|newsletter|marketing/.test(all)) {
    sections.add('newsletter');
  }

  if (/product tabs|size chart|shipping|ingredients|features|adaptive page templates/.test(all)) {
    sections.add('features');
  }

  sections.add('testimonials');
  sections.add('footer');

  return [...sections];
}

function mapUiPatterns(featureLines, bodyText) {
  const all = `${featureLines.join(' ')} ${bodyText}`.toLowerCase();
  const patterns = new Set(['mobile-menu', 'hover-zoom-cards']);

  const mapping = [
    [/sticky header|sticky cart|sticky/, 'sticky-nav'],
    [/mega menu/, 'mega-menu'],
    [/quick view/, 'quick-view'],
    [/infinite scroll/, 'infinite-scroll'],
    [/countdown timer|smart timers/, 'countdown-timer'],
    [/image zoom|image rollover|product previews/, 'hover-zoom-cards'],
    [/animation|slideshow|scroll|parallax|reveal/, 'parallax-hero'],
    [/slide-out cart/, 'slide-out-cart'],
    [/swatch filters|color swatches/, 'swatch-filters'],
    [/back-to-top button/, 'back-to-top'],
    [/before\/after image slider/, 'before-after-slider'],
    [/promo popups/, 'promo-popup'],
  ];

  for (const [regex, pattern] of mapping) {
    if (regex.test(all)) patterns.add(pattern);
  }

  return [...patterns];
}

function inferMood(name, bodyText, featureLines) {
  const all = `${name} ${featureLines.join(' ')}`.toLowerCase();

  if (/meadow|natural|organic|wellness|beauty|garden|calm/.test(all)) {
    return 'warm / organic / lifestyle';
  }

  if (/pace|xclusive|shoes|fashion|streetwear|clothing|bold/.test(all)) {
    return 'bold / editorial / fashion-forward';
  }

  if (/maya|playful|creative|colorful|visual/.test(all)) {
    return 'playful / creative / image-rich';
  }

  if (/electronics|tech|mobile|parts|throne/.test(all)) {
    return 'bold / technical / conversion-focused';
  }

  if (/luxury|luxe|royal|regal|jewelry|parfum|prestige|mayfair|soho/.test(all)) {
    return 'luxury / editorial / premium';
  }

  if (/minimal|clean|sleek|modern/.test(all)) {
    return 'minimal / modern / polished';
  }

  return 'premium / polished / conversion-focused';
}

async function extractTheme(browser, card, rank) {
  const page = await browser.newPage({
    viewport: { width: 1365, height: 1200 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  });

  try {
    await gotoWithRetries(page, card.href);

    const detail = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const html = document.documentElement.outerHTML;
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const title = document.title;
      const headingTexts = [...document.querySelectorAll('h1, h2, h3')]
        .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      return { bodyText, html, h1, title, headingTexts };
    });

    const name = cleanText(detail.h1 || card.text.replace(/\$\d[\d,]*.*/, ''));
    const price = extractPrice(detail.bodyText) || card.price;
    const previewUrl = extractPreviewUrlFromHtml(detail.html);
    const featureLines = extractFeatureLines(detail.bodyText);
    const previewDesign = await extractPreviewDesign(browser, previewUrl);
    const bodySummary = cleanText(detail.bodyText.slice(0, 5_000));

    return {
      rank,
      name,
      price,
      shopify_url: page.url(),
      preview_url: previewUrl,
      colors: previewDesign.colors,
      typography: previewDesign.typography,
      layout_sections: mapLayoutSections(featureLines, detail.bodyText),
      ui_patterns: mapUiPatterns(featureLines, detail.bodyText),
      mood: inferMood(name, bodySummary, featureLines),
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch(getLaunchOptions());
  const page = await browser.newPage({
    viewport: { width: 1365, height: 1200 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  });

  try {
    const cards = await getTopPaidThemeCards(page);
    if (cards.length < 5) {
      throw new Error(`Found only ${cards.length} unique paid themes; need 5`);
    }

    const themes = [];
    for (const [index, card] of cards.entries()) {
      try {
        console.log(`Scraping ${index + 1}/5: ${card.text} (${card.href})`);
        const theme = await extractTheme(browser, card, index + 1);
        themes.push(theme);
        console.log(`  ${theme.name} - $${theme.price}`);
      } catch (error) {
        console.error(`Failed to extract ${card.href}: ${error.message}`);
      }
    }

    if (themes.length < 5) {
      throw new Error(`Extracted ${themes.length} complete themes; need 5`);
    }

    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(themes, null, 2)}\n`, 'utf8');
    console.log('\nTop paid Shopify themes by unique theme family:');
    for (const theme of themes) {
      console.log(`${theme.rank}. ${theme.name} - $${theme.price}`);
    }
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Scrape failed: ${error.message}`);
  process.exit(1);
});
