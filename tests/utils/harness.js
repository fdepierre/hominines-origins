/**
 * Test harness — shared Playwright setup for Hominines non-regression suite.
 *
 * Usage:
 *   const { launch, loadApp, setTime, getComputedStyle } = require('./utils/harness');
 *   const { browser, page } = await launch();
 *   await loadApp(page);
 *   Welcome / locale: `launch({ locale: 'es-ES' })` then `loadApp(page, { dismissWelcome: false })`.
 *
 * Stable UI hooks live on `data-testid` in app/index.html (see tests/visual.test.js).
 * Fast pre-check: `npm run test:smoke` (no PNG snapshots, no tablet pass).
 *
 * Visible browser (debug): set HEADED=1 (e.g. `npm run test:headed`) so Chromium
 * opens with headless: false. Optional PLAYWRIGHT_SLOWMO=250 slows actions (ms).
 *
 * Locale: `launch({ locale: 'es-ES' })` sets `navigator.language` / `Intl` like a
 * user whose browser UI is Spanish — used to assert the welcome translate hint.
 */

const { chromium } = require('playwright');
const path  = require('path');
const fs    = require('fs');
const http  = require('http');
const urlp  = require('url');

const APP_DIR  = path.resolve(__dirname, '..', '..', 'app');
const APP_PATH = path.join(APP_DIR, 'index.html');
/** @deprecated Use getAppHttpUrl() after loadApp — file:// cannot fetch ./data/species.json */
const APP_URL  = `file://${APP_PATH}`;

let _appHttpServer = null;
let _appHttpBase = null;

function startAppHttpServer() {
  if (_appHttpBase) return Promise.resolve(_appHttpBase);
  const root = APP_DIR;
  const server = http.createServer((req, res) => {
    const parsed = urlp.parse(req.url || '/');
    let pathname = decodeURIComponent(parsed.pathname || '/');
    if (pathname === '/') pathname = '/index.html';
    const rel = path.normalize(pathname.replace(/^\//, '')).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.resolve(path.join(root, rel));
    const relCheck = path.relative(root, filePath);
    if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      };
      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      _appHttpServer = server;
      _appHttpBase = `http://127.0.0.1:${addr.port}`;
      resolve(_appHttpBase);
    });
    server.on('error', reject);
  });
}

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
async function launch({ width = 1440, height = 900, mobile = false, locale = null } = {}) {
  // Let Playwright find the browser automatically.
  // The env var override is kept for unusual local setups only.
  const headed = process.env.HEADED === '1' || process.env.PLAYWRIGHT_HEADED === '1';
  const slowMo = parseInt(process.env.PLAYWRIGHT_SLOWMO || '0', 10) || undefined;
  const launchOpts = {
    headless: !headed,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (slowMo) launchOpts.slowMo = slowMo;
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOpts);

  const contextOpts = {
    viewport: { width: mobile ? 768 : width, height: mobile ? 1024 : height },
    deviceScaleFactor: 1,
  };
  if (locale) contextOpts.locale = locale;
  const context = await browser.newContext(contextOpts);

  const page = await context.newPage();
  // Suppress console noise from the app
  page.on('console', msg => {
    if (msg.type() === 'error') process.stdout.write(`  [browser error] ${msg.text()}\n`);
  });

  return { browser, context, page };
}

async function loadApp(page, { lang = null, theme = null, dismissWelcome = true } = {}) {
  const base = await startAppHttpServer();
  const url = `${base}/index.html`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for the map container and default MapLibre map to be ready.
  await page.waitForFunction(() => document.getElementById('map') !== null && window.__mapLibreMap, { timeout: 15000 });
  // Wait for app JS data to be defined.
  await page.waitForFunction(() => typeof SPECIES_DATA !== 'undefined' && typeof EVENTS_DATA !== 'undefined', { timeout: 10000 });
  // `loadData()` sets this after `adaptSpecies` maps JSON (certainty keys live on each species in `species.json`)
  await page.waitForFunction(() => window.__HOMININ_CERTAINTY_READY === true, { timeout: 10000 });
  // Wait for timeline to be rendered
  await page.waitForSelector('#timeline-lanes', { state: 'attached', timeout: 8000 });
  // Small extra tick for everything to settle
  await page.waitForTimeout(300);

  // Dismiss welcome modal so Play/theme clicks are not intercepted (tests use fresh storage)
  if (dismissWelcome) {
    await page.evaluate(() => {
      const overlay = document.getElementById('welcome-modal-overlay');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
        try { localStorage.setItem('ho_welcomed_v3', '1'); } catch (e) { /* ignore */ }
      }
    });
    await page.waitForTimeout(100);
  }

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
  APP_URL, APP_PATH, APP_DIR, startAppHttpServer,
  RED, GREEN, YELLOW, CYAN, RESET, BOLD,
  assert, assertSoft, getStats, resetStats,
  launch, loadApp, setTime, screenshot, pixelDiff,
};
