import fs from 'node:fs';
import path from 'node:path';

const analysisPath = path.resolve('design-analysis.json');
const sitesPath = path.resolve('sites');
const EXPECTED_THEME_COUNT = Number(process.env.THEME_COUNT || 10);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeHex(hex) {
  const clean = String(hex || '#ffffff').trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(clean) ? clean : '#ffffff';
}

function luminance(hex) {
  const clean = normalizeHex(hex).slice(1);
  const channels = [0, 2, 4].map((start) => {
    const value = Number.parseInt(clean.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function textOn(hex) {
  return luminance(hex) > 0.48 ? '#111111' : '#ffffff';
}

function hashString(value) {
  return [...String(value)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function fontImport(theme) {
  const fonts = [theme.typography.heading_font, theme.typography.body_font]
    .filter(Boolean)
    .filter((font, index, list) => list.indexOf(font) === index)
    .map((font) => `family=${font.trim().replaceAll(' ', '+')}:wght@300;400;500;600;700;800`);

  return `@import url('https://fonts.googleapis.com/css2?${fonts.join('&')}&display=swap');`;
}

const imageSets = {
  Throne: {
    hero: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900&q=80',
      'https://images.unsplash.com/photo-1587302912306-cf1ed9c33146?w=900&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80',
    ],
  },
  Meadow: {
    hero: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80',
    ],
  },
  Maya: {
    hero: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80',
    ],
  },
  Pace: {
    hero: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900&q=80',
    ],
  },
  Mayfair: {
    hero: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=900&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=900&q=80',
      'https://images.unsplash.com/photo-1538688423619-a81d3f23454b?w=900&q=80',
      'https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?w=900&q=80',
    ],
  },
  Noor: {
    hero: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=900&q=80',
    ],
  },
  Taiga: {
    hero: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    ],
  },
  Deck: {
    hero: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80',
      'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=900&q=80',
    ],
  },
  Voyage: {
    hero: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
    ],
  },
  King: {
    hero: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900&q=80',
      'https://images.unsplash.com/photo-1587302912306-cf1ed9c33146?w=900&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80',
    ],
  },
  Bubbly: {
    hero: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80',
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80',
    ],
  },
  Impulse: {
    hero: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900&q=80',
      'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=900&q=80',
    ],
  },
  Motion: {
    hero: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
      'https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80',
    ],
  },
  Seventh: {
    hero: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=900&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1538688423619-a81d3f23454b?w=900&q=80',
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=900&q=80',
      'https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?w=900&q=80',
    ],
  },
  Sleek: {
    hero: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=900&q=80',
    ],
  },
  Glint: {
    hero: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=900&q=80',
      'https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?w=900&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
    ],
  },
};

const profiles = {
  Throne: {
    brand: 'Voltforge',
    eyebrow: 'Precision electronics for restless operators',
    headline: 'Command every signal from one engineered desk.',
    subhead:
      'Voltforge curates modular audio, charging, and control tools for creators who need their setup to move as fast as their ideas.',
    cta: 'Build the command center',
    announcement: 'Launch bundle: free carbon cable kit with every studio order over $250.',
    nav: ['Systems', 'Audio', 'Power', 'Support'],
    products: [
      ['Signal Core Speaker', '$248', 'Directional desktop audio with pressure-sealed clarity.'],
      ['Dock Array 6', '$186', 'A six-device charging dock wrapped in a machined shell.'],
      ['Orbit Control Pad', '$214', 'Programmable shortcuts, haptic dial, and low-latency pairing.'],
    ],
    collections: ['Creator workstations', 'Travel power', 'Audio rigs', 'Smart home control'],
    features: [
      ['Live diagnostics', 'Status strips and low-noise alerts keep every device visible without clutter.'],
      ['Fast cart flows', 'Bundled accessories, progress incentives, and quick-add panels reduce buying friction.'],
      ['Deep comparison', 'Spec tables and product tabs help shoppers understand compatibility before checkout.'],
      ['Scale-ready content', 'Editorial product stories and guided collections keep large catalogs easy to scan.'],
    ],
    testimonials: [
      ['Mika R.', 'The layout made our electronics catalog feel premium without hiding the specifications.'],
      ['Darren K.', 'Customers compare kits faster and our support questions dropped within a week.'],
      ['Studio Nine', 'The product cards feel tactile, sharp, and made for high-consideration tech.'],
    ],
    storyTitle: 'Built for complex kits without visual noise',
    story:
      'The Throne-inspired direction uses hard contrast, tight product modules, and dense-but-clean buying paths. Every section gives technical shoppers another reason to trust the hardware.',
    newsletter: 'Get the setup brief',
    footerNote: 'Engineered commerce patterns for high-spec equipment stores.',
  },
  Meadow: {
    brand: 'Field & Loom',
    eyebrow: 'Soft layers, natural goods, slow mornings',
    headline: 'A calmer wardrobe for days that start outside.',
    subhead:
      'Field & Loom pairs relaxed apparel, textural accessories, and seasonal edits with a warm editorial rhythm.',
    cta: 'Shop the new field edit',
    announcement: 'Summer meadow edit is live: natural fibers, soft packs, and easy returns.',
    nav: ['New', 'Linen', 'Objects', 'Journal'],
    products: [
      ['Washed Linen Set', '$168', 'Airy separates with a soft-worn hand feel.'],
      ['Market Basket Tote', '$92', 'Structured raffia with leather-trimmed handles.'],
      ['Herb Garden Wrap', '$124', 'A light layer for cool mornings and late dinners.'],
    ],
    collections: ['Linen essentials', 'Garden weekends', 'Picnic objects', 'Sun-washed layers'],
    features: [
      ['Editorial pacing', 'Soft image blocks and generous space let natural materials lead the page.'],
      ['Warm discovery', 'Collection tiles invite browsing without pushing shoppers into a narrow path.'],
      ['Responsive calm', 'Mobile layouts keep images large and copy short for relaxed scanning.'],
      ['Trust in texture', 'Detailed product notes give shoppers practical care and fit confidence.'],
    ],
    testimonials: [
      ['Elena S.', 'The page feels serene and still gives every product enough commercial clarity.'],
      ['Oren & Co.', 'Our seasonal edits finally look as gentle online as they do in the studio.'],
      ['Maren L.', 'The collection navigation made it simple to build an entire outfit.'],
    ],
    storyTitle: 'A pastoral storefront with practical merchandising',
    story:
      'The Meadow-inspired site leans into tactile neutrals, open spacing, and journal-like image grids. It feels soft, but the buying path stays deliberate and direct.',
    newsletter: 'Receive the seasonal journal',
    footerNote: 'Warm ecommerce composition for apparel, home, and lifestyle catalogs.',
  },
  Maya: {
    brand: 'Maya Color Lab',
    eyebrow: 'Graphic objects for visually hungry homes',
    headline: 'Turn ordinary shelves into small exhibitions.',
    subhead:
      'Maya Color Lab sells sculptural decor, playful accessories, and artful everyday pieces through a bright gallery-like storefront.',
    cta: 'Open the color shop',
    announcement: 'Limited color drops ship this Friday with complimentary gift notes.',
    nav: ['Drops', 'Objects', 'Studio', 'Archive'],
    products: [
      ['Stack Vase Set', '$132', 'Nested ceramic forms glazed in high-saturation bands.'],
      ['Loop Table Lamp', '$188', 'A compact lamp with a sculptural base and warm diffusion.'],
      ['Pixel Serving Tray', '$76', 'Graphic lacquer tray sized for coffee, keys, or display.'],
    ],
    collections: ['Color blocks', 'Studio objects', 'Giftable forms', 'Wall and shelf'],
    features: [
      ['Image-first rhythm', 'Large visual breaks keep color and shape at the center of the shopping path.'],
      ['Playful conversion', 'Quick-view details and animated cards make discovery feel expressive.'],
      ['Gallery utility', 'Collections are grouped by mood so shoppers can browse like a curator.'],
      ['Flexible storytelling', 'Editorial modules show how pieces live together in real rooms.'],
    ],
    testimonials: [
      ['Juno P.', 'The site makes our small objects feel collectible and considered.'],
      ['Color House', 'Customers spend longer in the lookbook and come back for each new drop.'],
      ['Rae T.', 'Every section has energy without becoming hard to shop.'],
    ],
    storyTitle: 'A visual catalog with a playful buying path',
    story:
      'The Maya-inspired build uses gallery spacing, animated color surfaces, and compact product logic. It is bright, but every interaction still leads toward a confident add-to-cart moment.',
    newsletter: 'Join the color drop list',
    footerNote: 'Expressive storefront patterns for artful products and design-led brands.',
  },
  Pace: {
    brand: 'Apex Pace',
    eyebrow: 'Street-laced footwear with performance tension',
    headline: 'Built for the sprint between runway and asphalt.',
    subhead:
      'Apex Pace frames shoes, kits, and accessories with a sharp editorial layout tuned for fast-moving drops.',
    cta: 'Enter the drop',
    announcement: 'Drop 04 opens at noon: early access for members ends in 48 hours.',
    nav: ['Drops', 'Footwear', 'Fit Guide', 'Stories'],
    products: [
      ['Velocity Runner', '$210', 'Layered mesh, sculpted sole, and a clean speed profile.'],
      ['Night Track Jacket', '$184', 'Matte shell with reflective seam lines and secure pockets.'],
      ['Grid Utility Pack', '$96', 'Compact sling with modular compartments for daily carry.'],
    ],
    collections: ['Footwear drops', 'Training layers', 'Night movement', 'Utility carry'],
    features: [
      ['High-contrast scans', 'Black fields, bold type, and fast grids make new drops instantly legible.'],
      ['Member urgency', 'Countdowns and promo bars support limited-release merchandising.'],
      ['Fit-first details', 'Size guidance and product tabs reduce uncertainty before checkout.'],
      ['Motion cues', 'Parallax and hover zoom add energy without slowing the buying path.'],
    ],
    testimonials: [
      ['Riko M.', 'The page finally matches the pressure and speed of our release calendar.'],
      ['Eastline Run', 'Customers read fit details and still move quickly into checkout.'],
      ['Noah V.', 'It feels editorial, but every product action is right where you need it.'],
    ],
    storyTitle: 'Release energy without sacrificing product clarity',
    story:
      'The Pace-inspired storefront is dark, direct, and kinetic. Product cards behave like drop cards, while the editorial sections build appetite for the next release.',
    newsletter: 'Claim early drop access',
    footerNote: 'Fashion-forward commerce for footwear, streetwear, and limited releases.',
  },
  Mayfair: {
    brand: 'Atelier Mayfair',
    eyebrow: 'Quiet luxury for considered interiors',
    headline: 'Objects with the restraint of a private gallery.',
    subhead:
      'Atelier Mayfair presents lighting, textiles, and decor in an understated storefront shaped by editorial calm and premium detail.',
    cta: 'View the collection',
    announcement: 'Private client preview: complimentary styling notes on orders over $400.',
    nav: ['Objects', 'Rooms', 'Atelier', 'Concierge'],
    products: [
      ['Travertine Table Lamp', '$420', 'A softened stone profile with linen shade and brass switch.'],
      ['Cashmere Throw', '$310', 'A finely woven layer finished with hand-rolled edges.'],
      ['Bronze Catchall', '$185', 'Weighted valet tray with a dark patinated surface.'],
    ],
    collections: ['Lighting', 'Textiles', 'Table objects', 'Private edit'],
    features: [
      ['Editorial restraint', 'Measured typography and quiet image layouts make premium products feel deliberate.'],
      ['Concierge cues', 'Soft newsletter and story modules invite longer, higher-value relationships.'],
      ['Material trust', 'Product notes emphasize provenance, scale, and care.'],
      ['Polished navigation', 'Sticky controls and refined collection tiles keep the experience elegant.'],
    ],
    testimonials: [
      ['Maribel H.', 'The storefront feels collected and expensive without shouting.'],
      ['House of Vale', 'Our product stories finally have the space and polish they deserve.'],
      ['C. Laurent', 'It gave clients enough detail to buy confidently online.'],
    ],
    storyTitle: 'Luxury merchandising with room to breathe',
    story:
      'The Mayfair-inspired design uses restrained contrast, refined accents, and generous editorial sections. It is built for considered purchases where trust grows through composition.',
    newsletter: 'Request the private edit',
    footerNote: 'Premium ecommerce language for interiors, objects, and client-led retail.',
  },
  Noor: {
    brand: 'Noor Atelier',
    eyebrow: 'Soft luxury with a luminous retail rhythm',
    headline: 'A quieter kind of premium, made to glow.',
    subhead:
      'Noor Atelier blends refined apparel, elevated accessories, and warm editorial storytelling for shoppers who want restraint with presence.',
    cta: 'Enter the luminous edit',
    announcement: 'Private Noor preview: early access to tonal layers, refined sets, and concierge styling.',
    nav: ['New Light', 'Apparel', 'Accessories', 'Concierge'],
    products: [
      ['Silk Drape Shirt', '$245', 'Fluid silk with a soft matte finish and an effortless evening shape.'],
      ['Pearl Handle Mini', '$310', 'A sculptural carry piece with luminous hardware and compact volume.'],
      ['Noor Wrap Coat', '$520', 'A tonal outer layer cut for quiet drama and long-season wear.'],
    ],
    collections: ['Tonal evening', 'Soft tailoring', 'Luminous accessories', 'Private wardrobe'],
    features: [
      ['Refined navigation', 'Slim sticky controls and considered spacing keep premium browsing calm and deliberate.'],
      ['Editorial light', 'Large imagery and quiet type create a magazine-like pace without burying product actions.'],
      ['Concierge conversion', 'Newsletter and product modules support high-intent shoppers with measured prompts.'],
      ['Material-led cards', 'Product copy gives texture, finish, and use case enough room to matter.'],
    ],
    testimonials: [
      ['Sana R.', 'The store feels expensive before you even reach the collection grid.'],
      ['Lumi House', 'The product stories have elegance, but checkout still feels close.'],
      ['A. Vale', 'It captures quiet luxury without looking generic.'],
    ],
    storyTitle: 'Refined commerce shaped by light and restraint',
    story:
      'The Noor-inspired direction uses luminous imagery, soft hierarchy, and premium editorial pacing. It keeps interaction subtle while making every product feel carefully chosen.',
    newsletter: 'Join the private Noor list',
    footerNote: 'Quiet luxury storefront language for fashion and accessories.',
  },
  Taiga: {
    brand: 'Taiga Range',
    eyebrow: 'Alpine lifestyle commerce with editorial depth',
    headline: 'Technical layers for the wild, styled for the city.',
    subhead:
      'Taiga Range presents outdoor apparel and travel essentials with cinematic imagery, tactile product cards, and calm conversion structure.',
    cta: 'Shop the alpine edit',
    announcement: 'New terrain capsule: waterproof layers, insulated packs, and cold-weather accessories.',
    nav: ['Terrain', 'Layers', 'Packs', 'Journal'],
    products: [
      ['Thermal Field Parka', '$430', 'A weather-ready shell with a soft insulated core and clean city profile.'],
      ['Summit Knit Base', '$155', 'A breathable base layer with refined rib texture and easy layering weight.'],
      ['Trail Utility Pack', '$210', 'Compact storage with weatherproof pockets and polished hardware.'],
    ],
    collections: ['Alpine shell', 'Base layers', 'Travel packs', 'Cold weather edit'],
    features: [
      ['Cinematic scale', 'Full-bleed hero and lookbook sections make outdoor products feel premium.'],
      ['Practical detail', 'Product cards balance technical benefits with styling language.'],
      ['Seasonal merchandising', 'Collections group by terrain and use case for confident exploration.'],
      ['Responsive drama', 'Mobile keeps image impact while preserving fast product actions.'],
    ],
    testimonials: [
      ['Elias M.', 'It looks like an outdoor editorial but shops like a focused store.'],
      ['Northline Supply', 'The seasonal collection flow finally feels premium enough for our pricing.'],
      ['Mara V.', 'The technical details are clear without making the page feel clinical.'],
    ],
    storyTitle: 'Alpine utility translated into premium storefront pacing',
    story:
      'The Taiga-inspired site combines rugged imagery, high-contrast merchandising, and calm product education. It is built for technical goods that still need a strong visual identity.',
    newsletter: 'Receive the range notes',
    footerNote: 'Editorial outdoor commerce for technical apparel and premium travel gear.',
  },
  Deck: {
    brand: 'Deck Division',
    eyebrow: 'Street-luxury drops with modular buying paths',
    headline: 'Drop culture sharpened into a premium storefront.',
    subhead:
      'Deck Division frames sneakers, modular bags, and hardwearing layers through bold grids, dark surfaces, and launch-ready interaction.',
    cta: 'Open the drop deck',
    announcement: 'Deck 05 opens today: member bundles, timed release cards, and fast shipping.',
    nav: ['Drops', 'Footwear', 'Carry', 'Fit'],
    products: [
      ['Deck Runner 05', '$240', 'A sculpted sneaker with layered mesh, tonal overlays, and aggressive sole geometry.'],
      ['Modular Flight Vest', '$315', 'Technical storage, adjustable panels, and a clean street-luxury silhouette.'],
      ['Cargo Sling System', '$148', 'A crossbody pack with detachable compartments and matte hardware.'],
    ],
    collections: ['Footwear deck', 'Modular carry', 'Night layers', 'Member release'],
    features: [
      ['Launch urgency', 'Promotional strips, countdown logic, and quick-add actions support drop mechanics.'],
      ['Dark editorial surfaces', 'High contrast creates a premium release environment without visual clutter.'],
      ['Fast product comparison', 'Cards keep product name, price, and functional copy instantly scannable.'],
      ['Motion without noise', 'Hover zoom and parallax add energy while keeping checkout intent clear.'],
    ],
    testimonials: [
      ['Kai S.', 'It feels like a launch room, not a catalog template.'],
      ['Gridline Studio', 'Our most technical pieces finally look expensive online.'],
      ['M. Frost', 'The release flow is fast but still feels designed.'],
    ],
    storyTitle: 'A modular premium page for limited releases',
    story:
      'The Deck-inspired storefront uses hard contrast, compact modules, and release-driven content. It is built for brands selling technical fashion at a premium price point.',
    newsletter: 'Unlock member release access',
    footerNote: 'Street-luxury commerce for drops, footwear, and modular accessories.',
  },
  Voyage: {
    brand: 'Voyage Works',
    eyebrow: 'Travel systems for premium movement',
    headline: 'A better way to move through every checkpoint.',
    subhead:
      'Voyage Works sells travel gear, compact accessories, and mobility essentials through cinematic sections and spec-driven product paths.',
    cta: 'Pack the system',
    announcement: 'Voyage system launch: complimentary packing kit on orders above $300.',
    nav: ['Systems', 'Carry', 'Transit', 'Guides'],
    products: [
      ['Transit Shell Duffel', '$285', 'A structured carry piece with weather-ready fabric and quiet hardware.'],
      ['Compression Pack Set', '$96', 'A three-piece packing system for streamlined business and leisure travel.'],
      ['Gate Jacket', '$340', 'A lightweight travel layer with hidden storage and crisp tailoring.'],
    ],
    collections: ['Carry systems', 'Airport layers', 'Packing tools', 'Long-haul edit'],
    features: [
      ['Journey-led structure', 'Sections mirror how shoppers plan, pack, and move.'],
      ['Technical reassurance', 'Spec-friendly cards explain material, weight, storage, and use case.'],
      ['Cinematic product story', 'Image-heavy editorial blocks create aspiration around practical objects.'],
      ['Conversion clarity', 'Sticky nav, quick view, and product cards stay direct on mobile and desktop.'],
    ],
    testimonials: [
      ['Jonas T.', 'It makes travel gear feel like a premium system instead of a pile of bags.'],
      ['Porter Lane', 'Customers understand bundles faster and buy more complete setups.'],
      ['Amelie R.', 'The site feels cinematic but still practical.'],
    ],
    storyTitle: 'Premium travel commerce with system-level clarity',
    story:
      'The Voyage-inspired direction turns transit, storage, and apparel into a cohesive travel system. Visual ambition and practical specs share the same page.',
    newsletter: 'Get the packing brief',
    footerNote: 'Premium static commerce for travel systems, carry goods, and technical apparel.',
  },
  King: {
    brand: 'King Circuit',
    eyebrow: 'Royal-grade tech commerce for complex catalogs',
    headline: 'High-spec products deserve a commanding storefront.',
    subhead:
      'King Circuit gives electronics and performance gear a dense but polished retail surface with strong hierarchy and high-conversion modules.',
    cta: 'Build the system',
    announcement: 'King bundle event: smart timers, kit pricing, and priority support are live.',
    nav: ['Systems', 'Components', 'Compare', 'Support'],
    products: [
      ['Crown Control Hub', '$310', 'A central device dock with programmable controls and fast charging.'],
      ['Regal Audio Bar', '$420', 'Directional audio for workstations, gaming setups, and premium retail demos.'],
      ['Noor Power Array', '$195', 'A compact charging system with cable routing and status indicators.'],
    ],
    collections: ['Command systems', 'Audio control', 'Power arrays', 'Smart bundles'],
    features: [
      ['Dense merchandising', 'Large catalogs stay organized with clear modules and strong product hierarchy.'],
      ['Conversion tooling', 'Timers, quick view, sticky controls, and carts support high-intent buyers.'],
      ['Spec confidence', 'Product copy gives technical buyers enough detail to compare quickly.'],
      ['Premium intensity', 'Hard contrast and accent color create a confident electronics storefront.'],
    ],
    testimonials: [
      ['Devon K.', 'The design makes complex hardware feel premium and easy to evaluate.'],
      ['Axiom Labs', 'Our bundles became much clearer after moving to this structure.'],
      ['T. Morgan', 'It has the confidence of a flagship product launch.'],
    ],
    storyTitle: 'A commanding interface for technical retail',
    story:
      'The King-inspired concept uses bold type, dense buying modules, and conversion-focused interactions to make high-spec products easier to trust and buy.',
    newsletter: 'Join the system briefing',
    footerNote: 'High-conversion static commerce for electronics and technical product catalogs.',
  },
  Bubbly: {
    brand: 'Bubbly Studio',
    eyebrow: 'Colorful fashion commerce with premium polish',
    headline: 'Playful drops without losing the luxury signal.',
    subhead:
      'Bubbly Studio turns expressive apparel, bright accessories, and giftable products into a vibrant storefront that still feels expensive.',
    cta: 'Shop the color drop',
    announcement: 'Color capsule live: limited sets, bright accessories, and member-only bundles.',
    nav: ['Drops', 'Color', 'Sets', 'Studio'],
    products: [
      ['Bubble Knit Polo', '$168', 'A saturated knit with soft structure and easy statement color.'],
      ['Gloss Mini Tote', '$145', 'A compact lacquered carry piece with rounded edges and bright hardware.'],
      ['Color Stack Set', '$112', 'Layered accessories designed for gifting and expressive styling.'],
    ],
    collections: ['Color drops', 'Giftable sets', 'Studio brights', 'Weekend edit'],
    features: [
      ['Expressive hierarchy', 'Color-forward sections feel lively while keeping product cards crisp.'],
      ['Giftable commerce', 'Bundles, newsletter prompts, and collection rails support seasonal buying.'],
      ['Animated discovery', 'Hover zoom, parallax, and quick view give the page playful movement.'],
      ['Premium restraint', 'Bright visuals are balanced with strong spacing and controlled typography.'],
    ],
    testimonials: [
      ['Lena P.', 'It is playful but not childish, which is exactly what our brand needed.'],
      ['Studio Pop', 'The colors finally feel premium online.'],
      ['Mika T.', 'The product grid is fun and still very easy to shop.'],
    ],
    storyTitle: 'A colorful storefront with commercial discipline',
    story:
      'The Bubbly-inspired page uses expressive visuals, bright accents, and polished ecommerce sections. It is built for brands that want joy without sacrificing premium structure.',
    newsletter: 'Get first access to color drops',
    footerNote: 'Premium playful commerce for colorful fashion, gifts, and lifestyle goods.',
  },
  Impulse: {
    brand: 'Impulse Supply',
    eyebrow: 'Proven premium commerce for high-volume apparel',
    headline: 'A launch-ready store built for fast catalog movement.',
    subhead:
      'Impulse Supply turns apparel, footwear, and campaign drops into a confident storefront with direct merchandising, quick-buy paths, and clear product education.',
    cta: 'Shop the proven edit',
    announcement: 'Impulse event live: quick-buy bundles, stock counters, and collection filters are ready.',
    nav: ['Launches', 'Apparel', 'Footwear', 'Fit'],
    products: [
      ['Sprint Mesh Trainer', '$210', 'A fast-selling trainer with layered mesh, sculpted sole, and drop-day colorways.'],
      ['Utility Track Shell', '$184', 'A lightweight layer with reflective detail, clean pockets, and all-season movement.'],
      ['Studio Cargo Sling', '$98', 'A compact carry piece shaped for daily routes and quick product pairing.'],
    ],
    collections: ['Drop essentials', 'Performance layers', 'Urban carry', 'Best-reviewed edit'],
    features: [
      ['Proven conversion stack', 'Quick buy, sticky cart, and product badges keep large catalogs moving.'],
      ['Filter-heavy discovery', 'Swatches, size filters, and sort controls make browsing feel controlled at scale.'],
      ['Campaign-ready modules', 'Promo tiles, hero drops, and countdown sections support repeat launches.'],
      ['Trust before checkout', 'Product tabs, delivery cues, and fit detail reduce hesitation on apparel buys.'],
    ],
    testimonials: [
      ['Rafa M.', 'It feels like a proven Shopify demo translated into something we can actually brand.'],
      ['Northcut Apparel', 'The product grid has speed, but the page still feels premium.'],
      ['Ari V.', 'Filters, quick view, and bundles all feel close without crowding the layout.'],
    ],
    storyTitle: 'A commercial blueprint for the most proven tier',
    story:
      'The Impulse-inspired storefront emphasizes reliable buying paths, product-card density, and polished launch sections. It is built for brands that need premium presentation and operational clarity at the same time.',
    newsletter: 'Get the next launch brief',
    footerNote: 'Feature-complete commerce language for apparel, footwear, and versatile catalogs.',
  },
  Motion: {
    brand: 'Motion Reel',
    eyebrow: 'Video-led ecommerce with controlled energy',
    headline: 'Make every scroll feel like a product trailer.',
    subhead:
      'Motion Reel is shaped for brands that sell through movement: animated sections, bold visuals, and product cards that stay fast on mobile.',
    cta: 'Play the collection',
    announcement: 'Motion preview: animated lookbook, video-ready product modules, and launch timers.',
    nav: ['Reels', 'Drops', 'Gear', 'Journal'],
    products: [
      ['Frame Studio Lamp', '$188', 'A graphic table lamp made for moving sets, content rooms, and visual retail.'],
      ['Loop Carry Kit', '$96', 'A compact accessory system with color-coded pieces and launch-ready packaging.'],
      ['Signal Audio Set', '$142', 'A giftable audio edit with clean controls and kinetic product storytelling.'],
    ],
    collections: ['Video hero', 'Animated drops', 'Creator kits', 'Story-driven gifts'],
    features: [
      ['Motion-first rhythm', 'Parallax, rollover cards, and before-after interaction give the page energy.'],
      ['Media-rich structure', 'Hero, lookbook, and editorial sections are tuned for imagery and video replacement.'],
      ['Fast mobile scanning', 'Large visual blocks collapse into direct product cards without losing drama.'],
      ['Promo timing', 'Countdowns and announcement states help campaign-driven brands create urgency.'],
    ],
    testimonials: [
      ['Mira K.', 'The page feels alive without becoming noisy.'],
      ['Frame & Fold', 'It finally gives our moving content a store structure around it.'],
      ['Jon Bell', 'The product cards remain clear even with the animated feel.'],
    ],
    storyTitle: 'Animation as merchandising, not decoration',
    story:
      'The Motion-inspired build uses video-ready spaces, scroll movement, and visual rhythm to make a static page feel cinematic. It keeps conversion tools visible so the motion supports shopping instead of distracting from it.',
    newsletter: 'Receive the motion drop',
    footerNote: 'Animated ecommerce patterns for content-led brands, gifts, and visual catalogs.',
  },
  Seventh: {
    brand: 'Seventh House',
    eyebrow: 'Clean modern storefronts for considered goods',
    headline: 'Quiet structure for products that need space.',
    subhead:
      'Seventh House presents home objects, soft goods, and minimalist accessories through clear navigation, balanced grids, and calm premium detail.',
    cta: 'Enter the clean edit',
    announcement: 'Seventh edit: modern essentials, polished filters, and a calm cart flow.',
    nav: ['Objects', 'Rooms', 'Materials', 'Care'],
    products: [
      ['Modular Side Lamp', '$260', 'A composed lighting piece with soft diffusion and architectural proportion.'],
      ['Linen Storage Basket', '$112', 'A structured woven basket sized for shelves, textiles, and daily utility.'],
      ['Stone Desk Tray', '$84', 'A minimal organizing object with weighted feel and quiet surface detail.'],
    ],
    collections: ['Clean objects', 'Room edits', 'Material stories', 'Modern utility'],
    features: [
      ['Balanced hierarchy', 'Measured type and open spacing make every section easy to scan.'],
      ['Modern discovery', 'Collections, product cards, and filters stay clear for repeat browsing.'],
      ['Low-friction cart', 'Slide-out cart and quick view keep the page grounded in commerce.'],
      ['Editorial restraint', 'Story sections explain materials and use cases without overdesigning the page.'],
    ],
    testimonials: [
      ['Nora T.', 'It is clean without feeling empty.'],
      ['Plain Goods', 'Our product story feels premium and practical in the same breath.'],
      ['C. Haye', 'Every section is calm, but the store still sells.'],
    ],
    storyTitle: 'A clean premium blueprint with enough commerce depth',
    story:
      'The Seventh-inspired storefront uses controlled spacing, soft contrast, and direct product structure. It suits brands that want modern polish without a loud visual system.',
    newsletter: 'Join the seventh edit',
    footerNote: 'Clean modern ecommerce for home, accessories, and considered everyday products.',
  },
  Sleek: {
    brand: 'Sleek Atelier',
    eyebrow: 'Best-value premium polish for modern fashion',
    headline: 'Minimal fashion commerce with the expensive parts intact.',
    subhead:
      'Sleek Atelier turns an entry premium theme direction into a refined storefront with editorial imagery, quick-buy tools, and restrained product storytelling.',
    cta: 'Shop the sleek edit',
    announcement: 'Sleek value build: luxury pacing, mobile-first product cards, and complete cart UX.',
    nav: ['New', 'Tailoring', 'Accessories', 'Studio'],
    products: [
      ['Contour Drape Shirt', '$178', 'A clean fluid shirt with soft structure and quiet evening polish.'],
      ['Arc Handle Bag', '$245', 'A compact sculptural bag with smooth lines and understated hardware.'],
      ['Line Wrap Coat', '$360', 'A minimal outer layer with long proportions and seasonless texture.'],
    ],
    collections: ['Modern tailoring', 'Soft accessories', 'Capsule layers', 'Value luxury'],
    features: [
      ['Premium on a budget', 'The page keeps expensive-feeling spacing and interaction without unnecessary complexity.'],
      ['Minimal product focus', 'Cards are direct, image-led, and supported by practical copy.'],
      ['Complete theme basics', 'Cart drawer, promo popup, product badges, quick view, and mobile menu are all included.'],
      ['Editorial softness', 'Lookbook and story sections create brand depth without slowing the shopping path.'],
    ],
    testimonials: [
      ['Selene R.', 'It feels far above the price tier it comes from.'],
      ['Atelier North', 'The layout gives our capsule collection a much more premium read.'],
      ['M. Sloan', 'Clean, fast, and polished enough for a serious launch.'],
    ],
    storyTitle: 'Best-value structure with luxury restraint',
    story:
      'The Sleek-inspired site proves the lower end of the premium range can still feel refined. Its strength is a tight balance of minimal design, complete commerce features, and mobile-first clarity.',
    newsletter: 'Get the capsule preview',
    footerNote: 'Best-value premium commerce for modern fashion and accessory brands.',
  },
  Glint: {
    brand: 'Glint Market',
    eyebrow: 'Bright polished commerce for gifts and beauty',
    headline: 'Small products, big premium signal.',
    subhead:
      'Glint Market frames giftable objects, beauty sets, and polished accessories with bright surfaces, crisp cards, and a confident checkout path.',
    cta: 'Open the glint edit',
    announcement: 'Glint launch: gift bundles, swatch filters, and polished quick-buy cards.',
    nav: ['Gifts', 'Beauty', 'Objects', 'Bundles'],
    products: [
      ['Glow Vessel Set', '$118', 'A refined ceramic trio designed for gifting, display, and seasonal styling.'],
      ['Pearl Ritual Kit', '$142', 'A bright beauty set with clear benefits and premium unboxing cues.'],
      ['Chrome Catchall', '$76', 'A polished object for desks, vanities, and small-space merchandising.'],
    ],
    collections: ['Giftable glints', 'Beauty rituals', 'Bright objects', 'Bundle edits'],
    features: [
      ['High perceived value', 'Light surfaces, sharp cards, and restrained accents lift accessible products.'],
      ['Gift-first merchandising', 'Bundles, badges, and collection rails support seasonal buying.'],
      ['Quick discovery', 'Enhanced search, quick view, and swatches keep small catalogs fast.'],
      ['Polished proof', 'Testimonials, press-like sections, and trust cues make the page feel launch-ready.'],
    ],
    testimonials: [
      ['Gia M.', 'It makes affordable gifts feel carefully chosen and premium.'],
      ['Little Bright Co.', 'The bundle flow is exactly what we needed for seasonal campaigns.'],
      ['Theo R.', 'Bright, clean, and still conversion-focused.'],
    ],
    storyTitle: 'A bright best-value storefront with premium cues',
    story:
      'The Glint-inspired build uses bright product framing, clean hierarchy, and gift-led merchandising. It translates a value-tier premium theme into a polished static storefront.',
    newsletter: 'Join the glint list',
    footerNote: 'Bright premium commerce for gifts, beauty, and polished small goods.',
  },
};

const dynamicImageSets = [
  {
    hero: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1538688423619-a81d3f23454b?w=900&q=80',
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=900&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80',
    ],
  },
  {
    hero: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900&q=80',
      'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=900&q=80',
    ],
  },
  {
    hero: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900&q=80',
      'https://images.unsplash.com/photo-1587302912306-cf1ed9c33146?w=900&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80',
    ],
  },
  {
    hero: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=80',
    story: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80',
    editorial: [
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=900&q=80',
      'https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?w=900&q=80',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=900&q=80',
    ],
    products: [
      'https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?w=900&q=80',
      'https://images.unsplash.com/photo-1618220179428-22790b461013?w=900&q=80',
      'https://images.unsplash.com/photo-1538688423619-a81d3f23454b?w=900&q=80',
    ],
  },
];

const moodProfiles = {
  technical: {
    nouns: ['Systems', 'Control', 'Hardware', 'Signals'],
    products: [
      ['Command Console', '$268', 'A modular control surface built for precise daily operations.'],
      ['Signal Dock', '$194', 'A compact hub that keeps devices charged, visible, and ready.'],
      ['Pulse Speaker', '$236', 'Clear, directional audio with a clean industrial profile.'],
    ],
    headline: 'A sharper command center for modern operators.',
    subhead: 'This storefront turns complex equipment into a polished buying path with hard contrast, clear specs, and fast merchandising.',
  },
  fashion: {
    nouns: ['Drops', 'Footwear', 'Layers', 'Stories'],
    products: [
      ['Release Runner', '$218', 'A sculpted trainer with layered mesh and runway-level stance.'],
      ['Studio Shell', '$176', 'A cropped technical layer built for movement and sharp silhouettes.'],
      ['Utility Sling', '$98', 'A compact carry piece with drop-day attitude and daily function.'],
    ],
    headline: 'Drop energy with editorial control.',
    subhead: 'High-contrast cards, kinetic sections, and direct product actions make limited releases feel urgent and premium.',
  },
  organic: {
    nouns: ['New', 'Materials', 'Objects', 'Journal'],
    products: [
      ['Washed Field Set', '$164', 'Soft natural layers with an easy, sun-warmed texture.'],
      ['Harvest Tote', '$88', 'A structured market bag made for weekend rituals.'],
      ['Garden Wrap', '$126', 'A light seasonal layer for slow mornings and late dinners.'],
    ],
    headline: 'A warmer store for tactile everyday goods.',
    subhead: 'Natural images, calm spacing, and soft merchandising invite shoppers to linger without losing the path to purchase.',
  },
  luxury: {
    nouns: ['Objects', 'Rooms', 'Atelier', 'Concierge'],
    products: [
      ['Stone Table Lamp', '$420', 'A composed lighting piece with a quiet architectural profile.'],
      ['Woven Throw', '$295', 'A refined textile with soft weight and subtle surface variation.'],
      ['Bronze Tray', '$188', 'A considered valet object with a patinated finish.'],
    ],
    headline: 'Quiet commerce for considered purchases.',
    subhead: 'Elegant pacing, refined type, and calm product stories make premium goods feel collected rather than crowded.',
  },
  playful: {
    nouns: ['Drops', 'Objects', 'Studio', 'Archive'],
    products: [
      ['Stack Vessel', '$132', 'A sculptural object with bold color and gallery-like presence.'],
      ['Loop Lamp', '$188', 'A small lamp with a graphic base and warm diffusion.'],
      ['Color Tray', '$76', 'A lacquered catchall sized for tables, shelves, and gifting.'],
    ],
    headline: 'Turn the catalog into a small exhibition.',
    subhead: 'Bright visual rhythm, compact product cards, and animated discovery make playful goods feel collectible.',
  },
  culinary: {
    nouns: ['Pantry', 'Table', 'Tools', 'Recipes'],
    products: [
      ['Copper Pour Kettle', '$148', 'A warm-toned kettle shaped for daily ritual and display.'],
      ['Stoneware Service Set', '$126', 'Stackable table pieces with a quiet restaurant-grade finish.'],
      ['Oak Prep Board', '$84', 'A generous board for prep, serving, and open-shelf styling.'],
    ],
    headline: 'A warmer table story for food-led commerce.',
    subhead: 'Editorial food imagery, practical product cards, and smooth collection paths make culinary goods feel useful and giftable.',
  },
  beauty: {
    nouns: ['Rituals', 'Skin', 'Sets', 'Journal'],
    products: [
      ['Renewal Serum', '$118', 'A refined daily formula framed with clear benefits and calm detail.'],
      ['Barrier Cream', '$86', 'A rich moisturizer designed for premium ritual-driven merchandising.'],
      ['Travel Ritual Set', '$142', 'A curated kit for gifting, discovery, and replenishment flows.'],
    ],
    headline: 'A refined ritual path for modern beauty buyers.',
    subhead: 'Soft contrast, benefit-led cards, and editorial education make skincare feel premium without slowing checkout.',
  },
  pet: {
    nouns: ['Pets', 'Walk', 'Care', 'Bundles'],
    products: [
      ['Cloud Walk Harness', '$72', 'A comfortable everyday harness with soft structure and polished hardware.'],
      ['Market Treat Tin', '$34', 'A refillable tin for training treats, travel days, and gift bundles.'],
      ['Rest Nest Bed', '$128', 'A washable pet bed with rounded form and home-friendly materials.'],
    ],
    headline: 'A playful premium store for pets and their people.',
    subhead: 'Friendly copy, clear bundles, and retail-ready product modules make pet commerce feel polished and approachable.',
  },
};

function moodKey(theme) {
  const mood = String(theme.mood || '').toLowerCase();
  const name = String(theme.name || '').toLowerCase();
  if (/poochy|pawmart/.test(name) || /pet/.test(mood)) return 'pet';
  if (/reinvent/.test(name) || /beauty/.test(mood)) return 'beauty';
  if (/kettle/.test(name) || /culinary|food|table/.test(mood)) return 'culinary';
  if (/dune/.test(name)) return 'fashion';
  if (/impulse|sleek/.test(name) || /fashion-commerce|value-rich/.test(mood)) return 'fashion';
  if (/motion/.test(name) || /animated|video/.test(mood)) return 'playful';
  if (/seventh|glint/.test(name) || /best-value|refined/.test(mood)) return 'luxury';
  if (/technical|conversion|electronics|hardware/.test(mood)) return 'technical';
  if (/fashion|street|bold/.test(mood)) return 'fashion';
  if (/organic|warm|lifestyle/.test(mood)) return 'organic';
  if (/playful|creative|image/.test(mood)) return 'playful';
  return 'luxury';
}

function dynamicProfile(theme) {
  const seed = hashString(theme.name);
  const template = moodProfiles[moodKey(theme)];
  const brandSuffixes = ['Studio', 'Atelier', 'Supply', 'Works', 'House'];
  const brand = `${theme.name} ${pick(brandSuffixes, seed)}`;
  const collectionPrefix = pick(['Core', 'Reserve', 'Seasonal', 'Signature', 'Private'], seed, 1);

  return {
    brand,
    eyebrow: `${theme.mood} storefront concept`,
    headline: template.headline,
    subhead: template.subhead,
    cta: `Shop ${theme.name}`,
    announcement: `${theme.name} premium edit is live: curated sections, polished interactions, and responsive launch pages.`,
    nav: template.nouns,
    products: template.products.map(([name, price, copy], index) => [`${theme.name} ${name}`, price, copy]),
    collections: [
      `${collectionPrefix} edit`,
      `${theme.name} essentials`,
      pick(template.nouns, seed, 2),
      `${pick(['Launch', 'Client', 'Editorial', 'Material'], seed, 3)} story`,
    ],
    features: [
      ['Design-token driven', 'Colors, type, spacing, and mood are mapped from the scraped analysis instead of hard-coded to one theme.'],
      ['Premium static build', 'The page opens as standalone HTML, CSS, and JavaScript with no framework or backend dependency.'],
      ['Responsive commerce', 'Sticky navigation, product cards, collection rails, and newsletter flows are tuned for mobile and desktop.'],
      ['Interaction-ready', 'Hover zoom, quick view, parallax, swatches, and promo UI are implemented without copying Shopify code.'],
    ],
    testimonials: [
      ['Avery M.', `The ${theme.name} concept feels premium while staying easy to shop.`],
      ['North Studio', 'The sections have the polish of a demo store without feeling like a skeleton.'],
      ['M. Laurent', 'Product discovery, editorial pacing, and checkout intent finally sit together.'],
    ],
    storyTitle: `${theme.name} translated into an original storefront`,
    story: `This generated site interprets ${theme.name}'s scraped palette, typography, section list, and UI patterns into an original static storefront. It keeps the premium mood while using fresh copy, imagery, and code.`,
    newsletter: `Join the ${theme.name} edit`,
    footerNote: `Static ecommerce concept inspired by ${theme.name}'s public design signals.`,
  };
}

function getProfile(theme) {
  return profiles[theme.name] || dynamicProfile(theme);
}

function getImages(theme) {
  return imageSets[theme.name] || dynamicImageSets[hashString(theme.name) % dynamicImageSets.length];
}

function renderIndex(theme) {
  const profile = getProfile(theme);
  const images = getImages(theme);
  const slug = slugify(theme.name);
  const sections = new Set(theme.layout_sections);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23111111'/%3E%3C/svg%3E">
  <title>${escapeHtml(profile.brand)} | ${escapeHtml(theme.mood)}</title>
  <meta name="description" content="${escapeHtml(profile.subhead)}">
  <link rel="stylesheet" href="./style.css">
</head>
<body class="site site-${slug}" data-theme="${escapeHtml(theme.name)}">
  ${sections.has('announcement-bar') ? `<div class="announcement-bar" data-section="announcement-bar">${escapeHtml(profile.announcement)}</div>` : ''}
  <header class="site-header" data-section="sticky-nav">
    <a class="brand-mark" href="#hero" aria-label="${escapeHtml(profile.brand)} home">
      <span class="brand-symbol">${escapeHtml(profile.brand.slice(0, 2).toUpperCase())}</span>
      <span>${escapeHtml(profile.brand)}</span>
    </a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">
      <span></span><span></span><span></span>
    </button>
    <nav id="primary-nav" class="primary-nav" aria-label="Primary navigation">
      ${profile.nav.map((item) => `<a href="#${slugify(item)}">${escapeHtml(item)}</a>`).join('\n      ')}
    </nav>
    <button class="cart-button" type="button" data-cart-open>Cart <span class="cart-count">0</span></button>
  </header>

  <main>
    ${sections.has('hero-fullscreen') || sections.has('hero') ? renderHero(profile, images) : ''}
    ${sections.has('features') || sections.has('selling-points') ? renderFeatures(profile) : ''}
    ${sections.has('product-grid') || sections.has('featured-collection') ? renderProducts(profile, images) : ''}
    ${sections.has('collection-list') ? renderCollections(profile, images) : ''}
    ${sections.has('brand-story') || sections.has('about') ? renderBrandStory(profile, images) : ''}
    ${sections.has('lookbook') ? renderLookbook(profile, images) : ''}
    ${sections.has('editorial') ? renderEditorial(profile, images) : ''}
    ${sections.has('testimonials') ? renderTestimonials(profile) : ''}
    ${sections.has('newsletter') ? renderNewsletter(profile) : ''}
  </main>

  ${sections.has('footer') ? renderFooter(profile, theme) : ''}

  <aside class="quick-view" aria-hidden="true" aria-labelledby="quick-view-title">
    <div class="quick-view__panel">
      <button class="icon-close" type="button" data-close-quick-view>Close</button>
      <p class="eyebrow">Quick view</p>
      <h2 id="quick-view-title">${escapeHtml(profile.products[0][0])}</h2>
      <p data-quick-view-copy>${escapeHtml(profile.products[0][2])}</p>
      <div class="swatch-row" aria-label="Finish options">
        <button type="button" class="swatch is-selected" data-swatch="#111111" aria-label="Deep finish"></button>
        <button type="button" class="swatch" data-swatch="#d9c9a8" aria-label="Warm finish"></button>
        <button type="button" class="swatch" data-swatch="#f2f2f2" aria-label="Light finish"></button>
      </div>
      <button class="button-primary" type="button" data-cart-add>Add to cart</button>
    </div>
  </aside>

  <aside class="cart-drawer" aria-hidden="true" aria-labelledby="cart-title">
    <div class="cart-drawer__panel">
      <button class="icon-close" type="button" data-cart-close>Close</button>
      <h2 id="cart-title">Studio cart</h2>
      <p class="cart-copy">Your selected edit is ready for review. Add two more pieces to unlock the curated bundle benefit.</p>
      <button class="button-primary" type="button">Review checkout</button>
    </div>
  </aside>

  <button class="back-to-top" type="button" aria-label="Back to top">Top</button>
  <div class="promo-popup" role="dialog" aria-hidden="true" aria-label="Private offer">
    <button type="button" data-close-promo>Close</button>
    <strong>${escapeHtml(profile.newsletter)}</strong>
    <span>Join today for priority edits and launch reminders.</span>
  </div>

  <script src="./main.js"></script>
</body>
</html>
`;
}

function renderHero(profile, images) {
  return `<section id="hero" class="hero" data-section="hero-fullscreen" style="--hero-image: url('${images.hero}')">
      <div class="hero__media" aria-hidden="true"></div>
      <div class="hero__content">
        <p class="eyebrow">${escapeHtml(profile.eyebrow)}</p>
        <h1>${escapeHtml(profile.headline)}</h1>
        <p class="hero__subhead">${escapeHtml(profile.subhead)}</p>
        <div class="hero__actions">
          <a class="button-primary" href="#products">${escapeHtml(profile.cta)}</a>
          <a class="button-secondary" href="#story">Read the story</a>
        </div>
      </div>
      <div class="hero__metrics" aria-label="Store highlights">
        <span><strong>05</strong> curated edits</span>
        <span><strong>24h</strong> launch support</span>
        <span><strong>4.9</strong> client rating</span>
      </div>
    </section>`;
}

function renderFeatures(profile) {
  return `<section id="features" class="features section-shell" data-section="features">
      <div class="section-heading">
        <p class="eyebrow">What shoppers feel</p>
        <h2>Commercial detail with a distinct point of view.</h2>
      </div>
      <div class="feature-grid">
        ${profile.features
          .map(
            ([title, copy], index) => `<article class="feature-item">
          <span class="feature-number">0${index + 1}</span>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(copy)}</p>
        </article>`,
          )
          .join('\n        ')}
      </div>
    </section>`;
}

function renderProducts(profile, images) {
  return `<section id="products" class="products section-shell" data-section="product-grid">
      <div class="section-heading">
        <p class="eyebrow">Featured collection</p>
        <h2>Three hero products with enough detail to buy confidently.</h2>
      </div>
      <div class="product-grid">
        ${profile.products
          .map(
            ([name, price, copy], index) => `<article class="product-card" data-product-card>
          <button class="product-card__image" type="button" data-open-quick-view data-product="${escapeHtml(name)}" data-copy="${escapeHtml(copy)}">
            <img src="${images.products[index]}" alt="${escapeHtml(name)}">
          </button>
          <div class="product-card__content">
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(copy)}</p>
            <div class="product-card__meta">
              <span>${escapeHtml(price)}</span>
              <button type="button" data-cart-add>Add</button>
            </div>
          </div>
        </article>`,
          )
          .join('\n        ')}
      </div>
    </section>`;
}

function renderCollections(profile, images) {
  return `<section id="collections" class="collections section-shell" data-section="collection-list">
      <div class="section-heading section-heading--inline">
        <div>
          <p class="eyebrow">Collection list</p>
          <h2>Shop by use case, material, or release mood.</h2>
        </div>
        <a href="#newsletter">Request an edit</a>
      </div>
      <div class="collection-rail">
        ${profile.collections
          .map(
            (collection, index) => `<article class="collection-tile" style="--tile-image: url('${images.editorial[index % images.editorial.length]}')">
          <span>0${index + 1}</span>
          <h3>${escapeHtml(collection)}</h3>
          <p>Curated merchandising blocks keep browsing focused without flattening the brand.</p>
        </article>`,
          )
          .join('\n        ')}
      </div>
    </section>`;
}

function renderBrandStory(profile, images) {
  return `<section id="story" class="story section-shell" data-section="brand-story">
      <div class="story__image">
        <img src="${images.story}" alt="${escapeHtml(profile.storyTitle)}">
      </div>
      <div class="story__content">
        <p class="eyebrow">Brand story</p>
        <h2>${escapeHtml(profile.storyTitle)}</h2>
        <p>${escapeHtml(profile.story)}</p>
        <dl class="story-stats">
          <div><dt>Sections</dt><dd>12</dd></div>
          <div><dt>Patterns</dt><dd>Live</dd></div>
          <div><dt>Format</dt><dd>Static</dd></div>
        </dl>
      </div>
    </section>`;
}

function renderLookbook(profile, images) {
  return `<section id="lookbook" class="lookbook" data-section="lookbook">
      <div class="lookbook__headline">
        <p class="eyebrow">Lookbook</p>
        <h2>Full-width imagery sets the emotional temperature.</h2>
      </div>
      <div class="lookbook-grid">
        ${images.editorial
          .map(
            (image, index) => `<figure class="lookbook-frame">
          <img src="${image}" alt="${escapeHtml(profile.collections[index % profile.collections.length])}">
          <figcaption>${escapeHtml(profile.collections[index % profile.collections.length])}</figcaption>
        </figure>`,
          )
          .join('\n        ')}
      </div>
    </section>`;
}

function renderEditorial(profile, images) {
  return `<section id="editorial" class="editorial section-shell" data-section="editorial">
      <article class="editorial-feature">
        <p class="eyebrow">Editorial note</p>
        <h2>Designed to feel like a launch story, not a flat catalog.</h2>
        <p>${escapeHtml(profile.story)} The result is a standalone storefront that borrows the design language, not the code, of a premium Shopify demo.</p>
      </article>
      <div class="before-after" data-before-after>
        <img src="${images.editorial[0]}" alt="Before frame">
        <div class="before-after__overlay">
          <img src="${images.editorial[1]}" alt="After frame">
        </div>
        <input type="range" min="20" max="80" value="55" aria-label="Compare editorial crops">
      </div>
    </section>`;
}

function renderTestimonials(profile) {
  return `<section id="testimonials" class="testimonials section-shell" data-section="testimonials">
      <div class="section-heading">
        <p class="eyebrow">Customer proof</p>
        <h2>Signals that make the store feel lived-in and commercially ready.</h2>
      </div>
      <div class="testimonial-grid">
        ${profile.testimonials
          .map(
            ([name, quote]) => `<figure class="testimonial-card">
          <blockquote>${escapeHtml(quote)}</blockquote>
          <figcaption>
            <span>${escapeHtml(name)}</span>
            <small>5 star review</small>
          </figcaption>
        </figure>`,
          )
          .join('\n        ')}
      </div>
    </section>`;
}

function renderNewsletter(profile) {
  return `<section id="newsletter" class="newsletter section-shell" data-section="newsletter">
      <div>
        <p class="eyebrow">Newsletter</p>
        <h2>${escapeHtml(profile.newsletter)}</h2>
        <p>Receive launch notes, product edits, and quiet reminders when the next collection goes live.</p>
      </div>
      <form class="newsletter-form">
        <label for="email-${slugify(profile.brand)}">Email address</label>
        <input id="email-${slugify(profile.brand)}" type="email" autocomplete="email" required>
        <button class="button-primary" type="submit">Join</button>
      </form>
    </section>`;
}

function renderFooter(profile, theme) {
  return `<footer class="site-footer" data-section="footer">
      <div>
        <a class="brand-mark" href="#hero">
          <span class="brand-symbol">${escapeHtml(profile.brand.slice(0, 2).toUpperCase())}</span>
          <span>${escapeHtml(profile.brand)}</span>
        </a>
        <p>${escapeHtml(profile.footerNote)}</p>
      </div>
      <div class="footer-links">
        <a href="#products">Products</a>
        <a href="#collections">Collections</a>
        <a href="#story">Story</a>
        <a href="#newsletter">Contact</a>
      </div>
      <div class="footer-meta">
        <span>Inspired by ${escapeHtml(theme.name)} design analysis.</span>
        <span>Static HTML, CSS, and JavaScript.</span>
      </div>
    </footer>`;
}

function renderCss(theme) {
  const slug = slugify(theme.name);
  const headingFont = escapeHtml(theme.typography.heading_font);
  const bodyFont = escapeHtml(theme.typography.body_font);
  const isDark = theme.colors.background.toLowerCase() === '#000000';

  return `${fontImport(theme)}

:root {
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-text: ${theme.colors.text};
  --color-bg: ${theme.colors.background};
  --font-heading: "${headingFont}", serif;
  --font-body: "${bodyFont}", sans-serif;
  --base-size: ${theme.typography.base_size || '16px'};
  --heading-weight: ${theme.typography.heading_weight || '700'};
  --surface: ${isDark ? '#111111' : '#ffffff'};
  --surface-muted: ${isDark ? '#171717' : '#f7f6f2'};
  --on-primary: ${textOn(theme.colors.primary)};
  --on-accent: ${textOn(theme.colors.accent)};
  --line: color-mix(in srgb, var(--color-text), transparent 78%);
  --shadow: 0 18px 55px rgba(0, 0, 0, 0.12);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--base-size);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

body.menu-open {
  overflow: hidden;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1,
h2,
h3 {
  font-family: var(--font-heading);
  font-weight: var(--heading-weight);
  line-height: 1.02;
  letter-spacing: 0;
}

h1 {
  max-width: 11ch;
  font-size: clamp(3.2rem, 12vw, 7.6rem);
  margin-bottom: 1.3rem;
}

h2 {
  font-size: clamp(2rem, 6vw, 4.8rem);
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.2rem;
  margin-bottom: 0.65rem;
}

.announcement-bar {
  min-height: 36px;
  display: grid;
  place-items: center;
  padding: 0.45rem 1rem;
  color: var(--on-accent);
  background: var(--color-accent);
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 72px;
  padding: 0.8rem clamp(1rem, 4vw, 3rem);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--color-bg), transparent 6%);
  backdrop-filter: blur(18px);
  transition: min-height 240ms ease, box-shadow 240ms ease, background 240ms ease;
}

.site-header.is-scrolled {
  min-height: 58px;
  box-shadow: var(--shadow);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
}

.brand-symbol {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid currentColor;
  background: var(--color-primary);
  color: var(--on-primary);
  font-size: 0.75rem;
}

.menu-toggle {
  display: inline-grid;
  gap: 4px;
  width: 42px;
  height: 42px;
  place-content: center;
  border: 1px solid var(--line);
  background: transparent;
  color: inherit;
}

.menu-toggle span {
  width: 18px;
  height: 2px;
  background: currentColor;
}

.primary-nav {
  position: fixed;
  inset: 108px 1rem auto 1rem;
  display: none;
  padding: 1rem;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.primary-nav.is-open {
  display: grid;
  gap: 0.9rem;
}

.primary-nav a {
  padding: 0.35rem 0;
  transition: color 180ms ease, transform 180ms ease;
}

.primary-nav a:hover {
  color: var(--color-accent);
  transform: translateX(4px);
}

.cart-button,
.button-primary,
.button-secondary,
.product-card__meta button,
.icon-close,
.back-to-top,
.newsletter-form button {
  min-height: 42px;
  border: 1px solid var(--color-primary);
  padding: 0.75rem 1rem;
  border-radius: 0;
  transition: transform 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease;
}

.button-primary,
.cart-button,
.product-card__meta button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--on-primary);
  background: var(--color-primary);
}

.button-primary:hover,
.cart-button:hover,
.product-card__meta button:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: inherit;
}

.button-secondary:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.hero {
  position: relative;
  min-height: calc(100vh - 36px);
  display: grid;
  align-items: end;
  overflow: hidden;
  color: #ffffff;
  background: #111111;
}

.hero__media {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.16)), var(--hero-image);
  background-size: cover;
  background-position: center;
  transform: translate3d(0, var(--parallax-offset, 0), 0) scale(1.04);
  transition: transform 120ms linear;
}

.hero__content {
  position: relative;
  z-index: 1;
  width: min(100%, 980px);
  padding: clamp(6rem, 16vw, 14rem) clamp(1rem, 6vw, 5rem) clamp(3rem, 8vw, 6rem);
}

.hero__subhead {
  max-width: 620px;
  font-size: clamp(1rem, 2vw, 1.3rem);
  color: rgba(255, 255, 255, 0.86);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 1.8rem;
}

.hero__metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid rgba(255,255,255,0.24);
  background: rgba(0,0,0,0.28);
}

.hero__metrics span {
  display: grid;
  gap: 0.1rem;
  padding: 1rem;
  border-right: 1px solid rgba(255,255,255,0.18);
}

.hero__metrics strong {
  font-family: var(--font-heading);
  font-size: 1.6rem;
}

.section-shell {
  padding: clamp(4rem, 8vw, 8rem) clamp(1rem, 5vw, 4rem);
}

.section-heading {
  max-width: 760px;
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
}

.section-heading--inline {
  display: grid;
  gap: 1rem;
  max-width: none;
}

.section-heading--inline a {
  align-self: end;
  text-decoration: underline;
  text-underline-offset: 5px;
}

.eyebrow {
  margin-bottom: 0.8rem;
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.feature-grid,
.product-grid,
.testimonial-grid {
  display: grid;
  gap: 1rem;
}

.feature-item,
.product-card,
.testimonial-card,
.collection-tile {
  border: 1px solid var(--line);
  background: var(--surface);
}

.feature-item {
  padding: 1.3rem;
}

.feature-number {
  display: inline-block;
  margin-bottom: 2.5rem;
  color: var(--color-accent);
  font-weight: 800;
}

.product-card {
  display: grid;
  overflow: hidden;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.product-card:hover,
.product-card.is-hovered {
  transform: translateY(-6px);
  box-shadow: var(--shadow);
  border-color: var(--color-accent);
}

.product-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 0;
  background: var(--surface-muted);
  overflow: hidden;
}

.product-card__image img,
.lookbook-frame img,
.collection-tile::before {
  transition: transform 500ms ease;
}

.product-card:hover img,
.product-card.is-hovered img,
.lookbook-frame:hover img {
  transform: scale(1.06);
}

.product-card__content {
  display: grid;
  gap: 1rem;
  padding: 1.1rem;
}

.product-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.product-card__meta span {
  font-weight: 800;
}

.collections {
  background: var(--surface-muted);
}

.collection-rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 36vw);
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  scroll-snap-type: x mandatory;
}

.collection-tile {
  position: relative;
  min-height: 340px;
  display: grid;
  align-content: end;
  gap: 0.7rem;
  padding: 1rem;
  overflow: hidden;
  color: #ffffff;
  scroll-snap-align: start;
}

.collection-tile::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(180deg, transparent, rgba(0,0,0,0.78)), var(--tile-image);
  background-size: cover;
  background-position: center;
}

.collection-tile:hover::before {
  transform: scale(1.05);
}

.collection-tile > * {
  position: relative;
  z-index: 1;
}

.story {
  display: grid;
  gap: 2rem;
  background: var(--color-secondary);
  color: ${isDark ? '#111111' : 'var(--color-text)'};
}

.story__image {
  min-height: 420px;
  overflow: hidden;
}

.story__content {
  align-self: center;
}

.story-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin: 2rem 0 0;
}

.story-stats div {
  padding: 1rem;
  border: 1px solid color-mix(in srgb, currentColor, transparent 78%);
}

.story-stats dt {
  font-size: 0.75rem;
  text-transform: uppercase;
}

.story-stats dd {
  margin: 0.2rem 0 0;
  font-family: var(--font-heading);
  font-size: 1.6rem;
}

.lookbook {
  padding: clamp(4rem, 8vw, 8rem) 0;
}

.lookbook__headline {
  padding: 0 clamp(1rem, 5vw, 4rem);
  max-width: 840px;
  margin-bottom: 2rem;
}

.lookbook-grid {
  display: grid;
  gap: 0.75rem;
}

.lookbook-frame {
  position: relative;
  min-height: 420px;
  margin: 0;
  overflow: hidden;
  background: var(--surface-muted);
}

.lookbook-frame figcaption {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  padding: 0.45rem 0.7rem;
  background: rgba(0,0,0,0.68);
  color: #ffffff;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.editorial {
  display: grid;
  gap: 2rem;
  align-items: center;
}

.editorial-feature {
  max-width: 720px;
}

.before-after {
  position: relative;
  min-height: 480px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.before-after__overlay {
  position: absolute;
  inset: 0;
  width: var(--compare-width, 55%);
  overflow: hidden;
  border-right: 2px solid var(--color-accent);
}

.before-after__overlay img {
  width: calc(100vw - 2rem);
  max-width: none;
}

.before-after input {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  width: calc(100% - 2rem);
  accent-color: var(--color-accent);
}

.testimonial-card {
  margin: 0;
  padding: 1.2rem;
}

.testimonial-card blockquote {
  margin: 0 0 2rem;
  font-family: var(--font-heading);
  font-size: 1.35rem;
  line-height: 1.22;
}

.testimonial-card figcaption {
  display: grid;
  gap: 0.2rem;
}

.testimonial-card small {
  color: var(--color-accent);
  text-transform: uppercase;
}

.newsletter {
  display: grid;
  gap: 2rem;
  background: var(--color-primary);
  color: var(--on-primary);
}

.newsletter p {
  max-width: 560px;
}

.newsletter-form {
  display: grid;
  gap: 0.8rem;
}

.newsletter-form label {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.newsletter-form input {
  min-height: 54px;
  width: 100%;
  border: 1px solid rgba(255,255,255,0.35);
  padding: 0 1rem;
  background: rgba(255,255,255,0.08);
  color: inherit;
}

.site-footer {
  display: grid;
  gap: 2rem;
  padding: clamp(3rem, 7vw, 6rem) clamp(1rem, 5vw, 4rem);
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.site-footer p {
  max-width: 420px;
  margin-top: 1rem;
}

.footer-links,
.footer-meta {
  display: grid;
  gap: 0.7rem;
}

.footer-links a:hover {
  color: var(--color-accent);
}

.quick-view,
.cart-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: none;
  justify-content: end;
  background: rgba(0,0,0,0.52);
}

.quick-view.is-open,
.cart-drawer.is-open {
  display: flex;
}

.quick-view__panel,
.cart-drawer__panel {
  width: min(100%, 440px);
  min-height: 100%;
  padding: 1.4rem;
  background: var(--surface);
  color: var(--color-text);
  box-shadow: var(--shadow);
}

.icon-close {
  margin-bottom: 2rem;
  background: transparent;
  color: inherit;
}

.swatch-row {
  display: flex;
  gap: 0.6rem;
  margin: 1.5rem 0;
}

.swatch {
  width: 34px;
  height: 34px;
  border: 2px solid var(--line);
  border-radius: 50%;
  background: var(--swatch-color, #111111);
}

.swatch.is-selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent), transparent 76%);
}

.back-to-top {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 30;
  display: none;
  background: var(--surface);
  color: var(--color-text);
  box-shadow: var(--shadow);
}

.back-to-top.is-visible {
  display: inline-flex;
}

.promo-popup {
  position: fixed;
  left: 1rem;
  bottom: 1rem;
  z-index: 35;
  display: none;
  max-width: 320px;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--color-text);
  box-shadow: var(--shadow);
}

.promo-popup.is-open {
  display: grid;
}

.promo-popup button {
  justify-self: start;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  padding: 0;
}

.site-throne {
  --surface-muted: #151a20;
}

.site-throne .hero__media {
  filter: saturate(1.1) contrast(1.18);
}

.site-throne .feature-item {
  background: linear-gradient(135deg, var(--surface), color-mix(in srgb, var(--color-accent), transparent 90%));
}

.site-meadow .brand-symbol,
.site-mayfair .brand-symbol {
  border-radius: 8px;
}

.site-meadow .product-card,
.site-meadow .feature-item,
.site-meadow .testimonial-card {
  border-radius: 8px;
}

.site-maya .hero__content {
  mix-blend-mode: normal;
}

.site-maya .feature-item:nth-child(2),
.site-maya .feature-item:nth-child(4) {
  background: color-mix(in srgb, var(--color-accent), white 82%);
}

.site-pace .product-grid {
  gap: 0;
}

.site-pace .product-card {
  border-color: rgba(255,255,255,0.22);
}

.site-mayfair .section-shell {
  padding-left: clamp(1rem, 8vw, 7rem);
  padding-right: clamp(1rem, 8vw, 7rem);
}

.site-mayfair h1,
.site-mayfair h2 {
  max-width: 12ch;
}

.site-noor .hero__media {
  filter: saturate(0.82) brightness(1.08);
}

.site-noor .section-shell {
  padding-left: clamp(1rem, 7vw, 6rem);
  padding-right: clamp(1rem, 7vw, 6rem);
}

.site-noor .product-card,
.site-noor .testimonial-card {
  background: linear-gradient(180deg, var(--surface), color-mix(in srgb, var(--color-accent), transparent 92%));
}

.site-taiga .hero__content,
.site-voyage .hero__content {
  width: min(100%, 1120px);
}

.site-taiga .lookbook-frame,
.site-voyage .lookbook-frame {
  border-radius: 0;
}

.site-taiga .feature-item {
  border-top: 4px solid var(--color-accent);
}

.site-deck .hero__media,
.site-king .hero__media {
  filter: contrast(1.22) saturate(1.15);
}

.site-deck .product-grid,
.site-king .product-grid {
  gap: 0;
}

.site-deck .product-card,
.site-king .product-card {
  background: color-mix(in srgb, var(--surface), var(--color-primary) 8%);
}

.site-deck .collection-tile,
.site-king .collection-tile {
  min-height: 420px;
}

.site-bubbly .announcement-bar,
.site-bubbly .newsletter {
  background: linear-gradient(90deg, var(--color-accent), color-mix(in srgb, var(--color-accent), #ffffff 34%));
}

.site-bubbly .brand-symbol,
.site-bubbly .product-card,
.site-bubbly .feature-item,
.site-bubbly .testimonial-card {
  border-radius: 8px;
}

.site-bubbly .feature-item:nth-child(odd) {
  background: color-mix(in srgb, var(--color-accent), white 78%);
  color: #111111;
}

.site-impulse .product-grid,
.site-motion .product-grid {
  gap: 0;
}

.site-impulse .product-card,
.site-motion .product-card {
  border-radius: 0;
}

.site-impulse .announcement-bar {
  background: var(--color-primary);
  color: var(--on-primary);
}

.site-motion .hero__media {
  filter: saturate(1.2) contrast(1.08);
}

.site-motion .lookbook-grid {
  transform: skewY(-1deg);
}

.site-motion .lookbook-frame {
  transform: skewY(1deg);
}

.site-seventh .section-shell {
  max-width: 1180px;
}

.site-seventh .product-card,
.site-seventh .feature-item,
.site-seventh .testimonial-card {
  border-radius: 4px;
}

.site-sleek .hero__content,
.site-glint .hero__content {
  width: min(100%, 1040px);
}

.site-sleek .brand-symbol,
.site-glint .brand-symbol {
  border-radius: 8px;
}

.site-glint .newsletter,
.site-glint .feature-item:nth-child(2) {
  background: color-mix(in srgb, var(--color-accent), #ffffff 72%);
}

.site-voyage .story,
.site-taiga .story {
  background: linear-gradient(135deg, var(--color-secondary), color-mix(in srgb, var(--color-accent), white 82%));
}

@media (min-width: 768px) {
  .site-header {
    grid-template-columns: auto 1fr auto;
  }

  .menu-toggle {
    display: none;
  }

  .primary-nav {
    position: static;
    display: flex;
    justify-content: center;
    gap: clamp(1rem, 3vw, 2rem);
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .primary-nav.is-open {
    display: flex;
  }

  .primary-nav a:hover {
    transform: translateY(-2px);
  }

  .feature-grid,
  .testimonial-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .story,
  .editorial,
  .newsletter,
  .site-footer {
    grid-template-columns: 1fr 1fr;
  }

  .lookbook-grid {
    grid-template-columns: 1.2fr 0.8fr;
  }

  .lookbook-frame:first-child {
    grid-row: span 2;
    min-height: 680px;
  }

  .section-heading--inline {
    grid-template-columns: 1fr auto;
    align-items: end;
  }
}

@media (min-width: 1280px) {
  .feature-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .hero__content {
    padding-left: 7vw;
  }

  .collection-rail {
    grid-auto-columns: minmax(300px, 24vw);
  }

  .before-after__overlay img {
    width: 50vw;
  }
}
`;
}

function renderJs(theme) {
  return `(() => {
  const themeName = ${JSON.stringify(theme.name)};
  const patterns = new Set(${JSON.stringify(theme.ui_patterns)});
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const heroMedia = document.querySelector('.hero__media');
  const quickView = document.querySelector('.quick-view');
  const quickViewTitle = document.querySelector('#quick-view-title');
  const quickViewCopy = document.querySelector('[data-quick-view-copy]');
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartCount = document.querySelector('.cart-count');
  const backToTop = document.querySelector('.back-to-top');
  const promo = document.querySelector('.promo-popup');
  let cartItems = 0;

  function setExpanded(button, expanded) {
    if (button) button.setAttribute('aria-expanded', String(expanded));
  }

  function setOpen(panel, isOpen) {
    if (!panel) return;
    panel.classList.toggle('is-open', isOpen);
    panel.setAttribute('aria-hidden', String(!isOpen));
  }

  function updateScrollStates() {
    const isScrolled = window.scrollY > 24;
    if (header && patterns.has('sticky-nav')) header.classList.toggle('is-scrolled', isScrolled);
    if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 600);
    if (heroMedia && patterns.has('parallax-hero')) {
      heroMedia.style.setProperty('--parallax-offset', Math.round(window.scrollY * 0.08) + 'px');
    }
  }

  window.addEventListener('scroll', updateScrollStates, { passive: true });
  updateScrollStates();

  if (menuToggle && nav && patterns.has('mobile-menu')) {
    menuToggle.addEventListener('click', () => {
      const nextState = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', nextState);
      document.body.classList.toggle('menu-open', nextState);
      setExpanded(menuToggle, nextState);
    });
  }

  document.querySelectorAll('.primary-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      nav?.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      setExpanded(menuToggle, false);
    });
  });

  document.querySelectorAll('[data-product-card]').forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-hovered'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-hovered'));
  });

  document.querySelectorAll('[data-open-quick-view]').forEach((button) => {
    button.addEventListener('click', () => {
      if (quickViewTitle) quickViewTitle.textContent = button.dataset.product || themeName + ' selection';
      if (quickViewCopy) quickViewCopy.textContent = button.dataset.copy || 'A focused product edit with practical buying details.';
      setOpen(quickView, true);
    });
  });

  document.querySelector('[data-close-quick-view]')?.addEventListener('click', () => setOpen(quickView, false));

  document.querySelectorAll('[data-cart-add]').forEach((button) => {
    button.addEventListener('click', () => {
      cartItems += 1;
      if (cartCount) cartCount.textContent = String(cartItems);
      button.textContent = 'Added';
      window.setTimeout(() => {
        button.textContent = button.closest('.quick-view') ? 'Add to cart' : 'Add';
      }, 1100);
    });
  });

  document.querySelector('[data-cart-open]')?.addEventListener('click', () => setOpen(cartDrawer, true));
  document.querySelector('[data-cart-close]')?.addEventListener('click', () => setOpen(cartDrawer, false));

  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.style.setProperty('--swatch-color', swatch.dataset.swatch || '#111111');
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach((item) => item.classList.remove('is-selected'));
      swatch.classList.add('is-selected');
    });
  });

  document.querySelectorAll('[data-before-after]').forEach((compare) => {
    const input = compare.querySelector('input[type="range"]');
    input?.addEventListener('input', () => {
      compare.style.setProperty('--compare-width', input.value + '%');
    });
  });

  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  if (patterns.has('promo-popup') && promo) {
    window.setTimeout(() => {
      promo.classList.add('is-open');
      promo.setAttribute('aria-hidden', 'false');
    }, 1600);
    document.querySelector('[data-close-promo]')?.addEventListener('click', () => {
      promo.classList.remove('is-open');
      promo.setAttribute('aria-hidden', 'true');
    });
  }

  if (patterns.has('countdown-timer')) {
    const announcement = document.querySelector('.announcement-bar');
    const endTime = Date.now() + 48 * 60 * 60 * 1000;
    window.setInterval(() => {
      if (!announcement) return;
      const remaining = Math.max(0, endTime - Date.now());
      const hours = String(Math.floor(remaining / 3600000)).padStart(2, '0');
      const minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
      announcement.dataset.timer = hours + ':' + minutes;
    }, 30000);
  }

  if (patterns.has('infinite-scroll')) {
    const rail = document.querySelector('.collection-rail');
    rail?.addEventListener('scroll', () => {
      if (rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8) rail.scrollLeft = 0;
    }, { passive: true });
  }

  if (patterns.has('mega-menu')) {
    document.querySelectorAll('.primary-nav a').forEach((link) => {
      link.addEventListener('mouseenter', () => link.dataset.preview = 'open');
      link.addEventListener('mouseleave', () => delete link.dataset.preview);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setOpen(quickView, false);
    setOpen(cartDrawer, false);
    nav?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    setExpanded(menuToggle, false);
  });

  document.querySelector('.newsletter-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    if (!button) return;
    button.textContent = 'Joined';
    event.currentTarget.reset();
  });
})();`;
}

function assertPrerequisite(themes) {
  if (!Array.isArray(themes) || themes.length !== EXPECTED_THEME_COUNT) {
    throw new Error(
      `BLOCKED: Goal 1 must be completed first. Found ${Array.isArray(themes) ? themes.length : 0} theme entries, need ${EXPECTED_THEME_COUNT}.`,
    );
  }
}

function build() {
  if (!fs.existsSync(analysisPath)) {
    throw new Error('BLOCKED: design-analysis.json is missing. Goal 1 must be completed first.');
  }

  const themes = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
  assertPrerequisite(themes);

  fs.rmSync(sitesPath, { recursive: true, force: true });
  fs.mkdirSync(sitesPath, { recursive: true });

  for (const theme of themes) {
    const slug = slugify(theme.name);
    const dir = path.join(sitesPath, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderIndex(theme), 'utf8');
    fs.writeFileSync(path.join(dir, 'style.css'), renderCss(theme), 'utf8');
    fs.writeFileSync(path.join(dir, 'main.js'), renderJs(theme), 'utf8');
    console.log(`Built sites/${slug}`);
  }
}

try {
  build();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
