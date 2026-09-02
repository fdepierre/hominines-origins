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
const { decodePNGFile } = require('./png');

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
async function launch({ width = 1440, height = 900, mobile = false, locale = 'en-US' } = {}) {
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
    locale,
  };
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
  await page.waitForFunction(() => document.documentElement.getAttribute('data-map-ready') === '1', { timeout: 15000 });
  // Wait for app JS data to be defined.
  await page.waitForFunction(() => typeof SPECIES_DATA !== 'undefined' && typeof EVENTS_DATA !== 'undefined', { timeout: 10000 });
  // `loadData()` sets this after `adaptSpecies` maps JSON (certainty keys live on each species in `species.json`)
  await page.waitForFunction(() => window.__HOMININ_CERTAINTY_READY === true, { timeout: 10000 });
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
      if (typeof setCatalogueLang === 'function') setCatalogueLang(l);
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
  const dir = path.resolve(__dirname, '..', 'snapshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, ...opts });
  return filePath;
}

// Pixel-diff two PNG files. Uses the bundled pure-JS decoder so the result is
// identical on Windows, Linux and CI with no native dependency to install.
// Returns { diffPixels, totalPixels, ratio, method, sizeMismatch }
async function pixelDiff(pathA, pathB) {
  const imgA = decodePNGFile(pathA);
  const imgB = decodePNGFile(pathB);

  const w = Math.min(imgA.width, imgB.width);
  const h = Math.min(imgA.height, imgB.height);
  const sizeMismatch = imgA.width !== imgB.width || imgA.height !== imgB.height;

  let diff = 0;
  for (let y = 0; y < h; y++) {
    const rowA = y * imgA.width * 4;
    const rowB = y * imgB.width * 4;
    for (let x = 0; x < w; x++) {
      const ia = rowA + x * 4;
      const ib = rowB + x * 4;
      const dr = Math.abs(imgA.data[ia]     - imgB.data[ib]);
      const dg = Math.abs(imgA.data[ia + 1] - imgB.data[ib + 1]);
      const db = Math.abs(imgA.data[ia + 2] - imgB.data[ib + 2]);
      if (dr + dg + db > 30) diff++;
    }
  }

  // Pixels outside the common area cannot match, so count them as differing.
  const total = Math.max(imgA.width * imgA.height, imgB.width * imgB.height);
  diff += total - w * h;

  return { diffPixels: diff, totalPixels: total, ratio: diff / total, method: 'pixel', sizeMismatch };
}

module.exports = {
  APP_URL, APP_PATH, APP_DIR, startAppHttpServer,
  RED, GREEN, YELLOW, CYAN, RESET, BOLD,
  assert, assertSoft, getStats, resetStats,
  launch, loadApp, setTime, screenshot, pixelDiff,
};
