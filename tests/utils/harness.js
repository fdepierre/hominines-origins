/**
 * Test harness — shared Playwright setup for Hominines non-regression suite.
 *
 * Usage:
 *   const { launch, loadApp, setTime, getComputedStyle } = require('./utils/harness');
 *   const { browser, page } = await launch();
 *   await loadApp(page);
 */

const { chromium } = require('playwright');
const path  = require('path');
const fs    = require('fs');

const APP_PATH = path.resolve(__dirname, '..', '..', 'index.html');
const APP_URL  = `file://${APP_PATH}`;

// ─── colours ─────────────────────────────────────────────────────────────────
const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const CYAN  = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

// ─── simple assertion helpers ─────────────────────────────────────────────────
let _pass = 0, _fail = 0, _warn = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${message}`);
    _pass++;
  } else {
    console.log(`  ${RED}✗${RESET} ${RED}${message}${RESET}`);
    _fail++;
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertSoft(condition, message) {
  // Soft assert — logs but does not throw, so the test continues
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${message}`);
    _pass++;
  } else {
    console.log(`  ${YELLOW}⚠${RESET} ${YELLOW}${message} (soft)${RESET}`);
    _warn++;
  }
}

function getStats() { return { pass: _pass, fail: _fail, warn: _warn }; }
function resetStats() { _pass = 0; _fail = 0; _warn = 0; }

// ─── browser helpers ──────────────────────────────────────────────────────────
async function launch({ width = 1440, height = 900, mobile = false } = {}) {
  // Let Playwright find the browser automatically.
  // The env var override is kept for unusual local setups only.
  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOpts);

  const context = await browser.newContext({
    viewport: { width: mobile ? 768 : width, height: mobile ? 1024 : height },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  // Suppress console noise from the app
  page.on('console', msg => {
    if (msg.type() === 'error') process.stdout.write(`  [browser error] ${msg.text()}\n`);
  });

  return { browser, context, page };
}

async function loadApp(page, { lang = null, theme = null } = {}) {
  let url = APP_URL;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for Leaflet map to be ready
  await page.waitForFunction(() => typeof L !== 'undefined' && document.getElementById('map') !== null, { timeout: 10000 });
  // Wait for app JS data to be defined (SPECIES_DATA is declared after Leaflet loads)
  await page.waitForFunction(() => typeof SPECIES_DATA !== 'undefined' && typeof EVENTS_DATA !== 'undefined', { timeout: 10000 });
  // Wait for timeline to be rendered
  await page.waitForSelector('#timeline-lanes', { state: 'attached', timeout: 8000 });
  // Small extra tick for everything to settle
  await page.waitForTimeout(300);

  // Override language if requested
  if (lang) {
    await page.evaluate((l) => {
      const sel = document.getElementById('lang-select');
      if (sel) { sel.value = l; sel.dispatchEvent(new Event('change')); }
    }, lang);
    await page.waitForTimeout(300);
  }

  // Override theme if requested
  if (theme) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await page.waitForTimeout(200);
  }
}

// Set timeline to a specific time value (numeric, e.g. -438000)
async function setTime(page, timeValue) {
  await page.evaluate((t) => {
    if (typeof setTime === 'function') setTime(t);
    else if (typeof window.setTime === 'function') window.setTime(t);
  }, timeValue);
  await page.waitForTimeout(150);
}

// Take a screenshot and return the Buffer
async function screenshot(page, name, opts = {}) {
  const dir = path.resolve(__dirname, 'snapshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, ...opts });
  return filePath;
}

// Pixel-diff two PNG files using raw Buffer comparison (no native deps needed)
// Returns { diffPixels, totalPixels, ratio }
async function pixelDiff(pathA, pathB) {
  const { createCanvas, loadImage } = await (async () => {
    try { return require('canvas'); } catch { return null; }
  })();

  if (!createCanvas) {
    // Fallback: basic file size diff as proxy
    const sizeA = fs.statSync(pathA).size;
    const sizeB = fs.statSync(pathB).size;
    const ratio = Math.abs(sizeA - sizeB) / Math.max(sizeA, sizeB);
    return { diffPixels: null, totalPixels: null, ratio, method: 'filesize-proxy' };
  }

  const [imgA, imgB] = await Promise.all([loadImage(pathA), loadImage(pathB)]);
  const w = Math.min(imgA.width, imgB.width);
  const h = Math.min(imgA.height, imgB.height);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(imgA, 0, 0);
  const dataA = ctx.getImageData(0, 0, w, h).data;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(imgB, 0, 0);
  const dataB = ctx.getImageData(0, 0, w, h).data;

  let diff = 0;
  for (let i = 0; i < dataA.length; i += 4) {
    const dr = Math.abs(dataA[i]   - dataB[i]);
    const dg = Math.abs(dataA[i+1] - dataB[i+1]);
    const db = Math.abs(dataA[i+2] - dataB[i+2]);
    if (dr + dg + db > 30) diff++;
  }
  const total = w * h;
  return { diffPixels: diff, totalPixels: total, ratio: diff / total, method: 'pixel' };
}

module.exports = {
  APP_URL, APP_PATH,
  RED, GREEN, YELLOW, CYAN, RESET, BOLD,
  assert, assertSoft, getStats, resetStats,
  launch, loadApp, setTime, screenshot, pixelDiff,
};
