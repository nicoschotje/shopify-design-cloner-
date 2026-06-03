import fs from 'node:fs';
import path from 'node:path';

const sitesPath = path.resolve('sites');
const requiredFiles = ['index.html', 'style.css', 'main.js'];
const EXPECTED_SITE_COUNT = Number(process.env.THEME_COUNT || 10);

function fail(message) {
  console.error(`Build verify failed: ${message}`);
  process.exit(1);
}

function fileSize(filePath) {
  return fs.statSync(filePath).size;
}

if (!fs.existsSync(sitesPath)) {
  fail('sites/ directory does not exist');
}

const siteDirs = fs
  .readdirSync(sitesPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (siteDirs.length !== EXPECTED_SITE_COUNT) {
  fail(`expected exactly ${EXPECTED_SITE_COUNT} site directories, found ${siteDirs.length}`);
}

for (const dirName of siteDirs) {
  const dirPath = path.join(sitesPath, dirName);

  for (const filename of requiredFiles) {
    const fullPath = path.join(dirPath, filename);
    if (!fs.existsSync(fullPath)) {
      fail(`${dirName}: missing ${filename}`);
    }
  }

  const htmlPath = path.join(dirPath, 'index.html');
  const cssPath = path.join(dirPath, 'style.css');
  const jsPath = path.join(dirPath, 'main.js');
  const html = fs.readFileSync(htmlPath, 'utf8');

  if (fileSize(htmlPath) < 5 * 1024) {
    fail(`${dirName}: index.html is under 5KB`);
  }

  if (fileSize(cssPath) < 5 * 1024) {
    fail(`${dirName}: style.css is under 5KB`);
  }

  if (fileSize(jsPath) < 1024) {
    fail(`${dirName}: main.js is under 1KB`);
  }

  if (!html.includes('<!DOCTYPE html')) {
    fail(`${dirName}: index.html is missing DOCTYPE`);
  }

  if (!/<html\s+[^>]*lang=/i.test(html)) {
    fail(`${dirName}: index.html is missing html lang attribute`);
  }

  if (!/<meta\s+[^>]*name=["']viewport["']/i.test(html)) {
    fail(`${dirName}: index.html is missing meta viewport`);
  }

  if (!/<h1[\s>]/i.test(html)) {
    fail(`${dirName}: index.html is missing an h1`);
  }

  if (!/<section[\s>]/i.test(html)) {
    fail(`${dirName}: index.html is missing a section`);
  }

  if (!/<footer[\s>]/i.test(html)) {
    fail(`${dirName}: index.html is missing a footer`);
  }
}

console.log(`✅ Build verified: ${EXPECTED_SITE_COUNT} sites, all files present and sized correctly`);
