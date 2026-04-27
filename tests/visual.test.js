/**
 * VISUAL / LAYOUT TESTS — hominines app
 * Checks DOM structure, computed styles, element visibility, and contrast.
 * Generates reference snapshots on first run; compares on subsequent runs.
 *
 * Run: node tests/visual.test.js
 * Smoke (no snapshots / lighter): node tests/visual.test.js --smoke
 * Update snapshots: UPDATE_SNAPSHOTS=1 node tests/visual.test.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const { launch, loadApp, setTime, screenshot, pixelDiff,
        assert, assertSoft, getStats, resetStats,
        BOLD, CYAN, GREEN, RED, YELLOW, RESET } = require('./utils/harness');

const SNAPSHOT_DIR  = path.resolve(__dirname, 'snapshots');
const UPDATE_MODE   = process.env.UPDATE_SNAPSHOTS === '1';

// ─── reference snapshots ──────────────────────────────────────────────────────
// Keyed by name → { time, theme, viewportW, viewportH }
const SNAPSHOT_SCENARIOS = [
  { name: 'timeline-start-dark',  time: -4100000, theme: 'dark',  w: 1440, h: 900 },
  { name: 'homo-erectus-dark',    time: -438000,  theme: 'dark',  w: 1440, h: 900 },
  { name: 'homo-sapiens-dark',    time: -100000,  theme: 'dark',  w: 1440, h: 900 },
  { name: 'timeline-end-dark',    time: -2000,    theme: 'dark',  w: 1440, h: 900 },
  { name: 'timeline-start-light', time: -4100000, theme: 'light', w: 1440, h: 900 },
  { name: 'homo-erectus-light',   time: -438000,  theme: 'light', w: 1440, h: 900 },
  { name: 'tablet-dark',          time: -438000,  theme: 'dark',  w: 768,  h: 1024 },
  { name: 'tablet-light',         time: -438000,  theme: 'light', w: 768,  h: 1024 },
];

// Max pixel diff ratio before visual test fails (1% = 0.01)
const DIFF_THRESHOLD = 0.015;

/** @param {{ smoke?: boolean }} [options] — smoke: structure + contrast only, no PNG snapshots */
async function runVisualTests(options = {}) {
  const smoke = options.smoke === true;
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const errors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STRUCTURAL CHECKS (fast, no snapshots)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ STRUCTURAL / LAYOUT CHECKS${RESET}`);

  const { browser, page } = await launch({ width: 1440, height: 900 });
  await loadApp(page);

  async function test(name, fn) {
    process.stdout.write(`\n  ${CYAN}${name}${RESET}\n`);
    try { await fn(); }
    catch (e) { errors.push({ name, error: e.message }); }
  }

  // Required DOM + stable test hooks (data-testid) for automation
  await test('All critical DOM elements and data-testid hooks exist', async () => {
    const ids = ['main', 'burger-btn', 'map', 'side-panel', 'timeline', 'play-btn',
                  'timeline-full-needle', 'timeline-scrubber',
                  'skin-band', 'events-band', 'timeline-lanes',
                  'legend-content', 'lang-select'];
    /* #welcome-hint is removed after ~8s or first play interaction — not stable for this check */
    const testids = ['map', 'burger-menu-button', 'side-panel', 'timeline', 'play-toggle',
      'theme-toggle', 'lang-select', 'timeline-needle-row'];
    const { missingId, missingTid } = await page.evaluate(({ ids, testids }) => ({
      missingId: ids.filter((id) => !document.getElementById(id)),
      missingTid: testids.filter((t) => !document.querySelector(`[data-testid="${t}"]`)),
    }), { ids, testids });
    assert(missingId.length === 0, `All critical IDs exist (missing: ${missingId.join(', ') || 'none'})`);
    assert(missingTid.length === 0, `All data-testid hooks exist (missing: ${missingTid.join(', ') || 'none'})`);
  });

  // Timeline needle is visible
  await test('Timeline needle is visible', async () => {
    const visible = await page.evaluate(() => {
      const el = document.getElementById('timeline-full-needle');
      if (!el) return false;
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    });
    assert(visible, 'Timeline needle (#timeline-full-needle) is visible');
  });

  // Play is aligned with the round scrubber handle, left or right of it (not the full wrapper height)
  await test('Play is vertically aligned with handle and adjacent horizontally', async () => {
    const pos = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="play-toggle"]');
      const handle = document.getElementById('timeline-scrubber');
      const row = document.querySelector('[data-testid="timeline-needle-row"]');
      if (!btn || !handle || !row) return null;
      const bBtn = btn.getBoundingClientRect();
      const bH = handle.getBoundingClientRect();
      const bRow = row.getBoundingClientRect();
      const cy = (a) => a.top + a.height / 2;
      const dY = Math.abs(cy(bBtn) - cy(bH));
      const noOverlapL = bBtn.left > bH.right - 1;
      const noOverlapR = bBtn.right < bH.left + 1;
      const inRowW = bBtn.left >= bRow.left - 4 && bBtn.right <= bRow.right + 4;
      return { dY, adjacent: noOverlapL || noOverlapR, inRowW };
    });
    assert(pos !== null, 'Play, scrubber handle, and timeline needle row found');
    assert(pos.dY < 16, `Play vertically centered on handle (Δy=${pos.dY.toFixed(1)}px)`);
    assert(pos.adjacent, 'Play is left or right of the handle (not on top of it)');
    assert(pos.inRowW, 'Play stays within the timeline wrapper');
  });

  // Language selector is visible
  await test('Language selector exists (burger menu)', async () => {
    const ok = await page.evaluate(() => !!document.querySelector('[data-testid="lang-select"]'));
    assert(ok, 'Language selector [data-testid="lang-select"] is in the DOM');
  });

  // Skin band has segments rendered
  await test('Skin band has at least 5 segments rendered', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('#skin-band-track .band-segment').length);
    assert(count >= 5, `Skin band has ${count} segments (expected ≥ 5)`);
  });

  // Events band has milestone markers
  await test('Events band has at least 10 milestone markers', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('#events-band-track .event-marker').length);
    assert(count >= 10, `Events band has ${count} markers (expected ≥ 10)`);
  });

  // Species lanes rendered
  await test('Timeline lanes has one row per species', async () => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('#timeline-lanes .species-lane').length);
    const n = await page.evaluate(() => (SPECIES_DATA || []).length);
    assert(count >= n, `Timeline has ${count} species lanes (expected ≥ ${n})`);
  });

  // ─── CONTRAST checks in dark mode ─────────────────────────────────────────
  console.log(`\n${BOLD}◆ COLOUR CONTRAST (dark mode)${RESET}`);

  await test('Primary text colour is bright enough on dark background', async () => {
    const result = await page.evaluate(() => {
      // Parse rgb(r,g,b) to luminance
      function luminance(r, g, b) {
        return [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      }
      function parseRGB(s) {
        const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return m ? [+m[1], +m[2], +m[3]] : null;
      }
      const bodyStyle = window.getComputedStyle(document.body);
      const bgRGB   = parseRGB(bodyStyle.backgroundColor);
      const textRGB = parseRGB(bodyStyle.color);
      if (!bgRGB || !textRGB) return null;
      const lumBg   = luminance(...bgRGB);
      const lumText = luminance(...textRGB);
      const contrast = (Math.max(lumBg, lumText) + 0.05) / (Math.min(lumBg, lumText) + 0.05);
      return { contrast: Math.round(contrast * 10) / 10, bgRGB, textRGB };
    });
    assert(result !== null, 'Could parse body background and text colours');
    assertSoft(result.contrast >= 4.5,
      `WCAG AA contrast body text ≥ 4.5:1 (got ${result.contrast}:1)`);
  });

  if (!smoke) {
    // ─── LIGHT MODE contrast ──────────────────────────────────────────────────
    console.log(`\n${BOLD}◆ COLOUR CONTRAST (light mode)${RESET}`);

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);

    await test('Primary text colour is dark enough on light background', async () => {
      const result = await page.evaluate(() => {
        function luminance(r, g, b) {
          return [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        }
        function parseRGB(s) {
          const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          return m ? [+m[1], +m[2], +m[3]] : null;
        }
        const bodyStyle = window.getComputedStyle(document.body);
        const bgRGB   = parseRGB(bodyStyle.backgroundColor);
        const textRGB = parseRGB(bodyStyle.color);
        if (!bgRGB || !textRGB) return null;
        const lumBg   = luminance(...bgRGB);
        const lumText = luminance(...textRGB);
        const contrast = (Math.max(lumBg, lumText) + 0.05) / (Math.min(lumBg, lumText) + 0.05);
        return { contrast: Math.round(contrast * 10) / 10 };
      });
      assert(result !== null, 'Could parse body colours in light mode');
      assertSoft(result.contrast >= 4.5, `WCAG AA contrast light mode ≥ 4.5:1 (got ${result.contrast}:1)`);
    });
  } else {
    console.log(`\n${BOLD}◆ COLOUR CONTRAST (light mode)${RESET}`);
    console.log(`  ${YELLOW}skipped in smoke mode${RESET}`);
  }

  await browser.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SNAPSHOT TESTS (visual regression)
  // ═══════════════════════════════════════════════════════════════════════════
  if (smoke) {
    console.log(`\n${BOLD}◆ SNAPSHOT REGRESSION TESTS${RESET}`);
    console.log(`  ${YELLOW}skipped in smoke mode (run full visual suite for PNG regression)${RESET}`);
    return errors;
  }

  console.log(`\n${BOLD}◆ SNAPSHOT REGRESSION TESTS${RESET}`);

  if (UPDATE_MODE) {
    console.log(`  ${YELLOW}⚠ UPDATE MODE — generating new reference snapshots${RESET}`);
  }

  for (const scenario of SNAPSHOT_SCENARIOS) {
    const snapshotName = scenario.name;
    process.stdout.write(`\n  ${CYAN}Snapshot: ${snapshotName}${RESET}\n`);

    const { browser: b2, page: p2 } = await launch({ width: scenario.w, height: scenario.h });
    await loadApp(p2, { theme: scenario.theme });
    await setTime(p2, scenario.time);
    await p2.waitForTimeout(400); // let map tiles and animations settle

    const currentPath  = path.join(SNAPSHOT_DIR, `${snapshotName}-current.png`);
    const referencePath = path.join(SNAPSHOT_DIR, `${snapshotName}-reference.png`);

    await p2.screenshot({ path: currentPath, fullPage: false });
    await b2.close();

    if (UPDATE_MODE || !fs.existsSync(referencePath)) {
      fs.copyFileSync(currentPath, referencePath);
      console.log(`  ${GREEN}✓${RESET} Reference snapshot saved: ${snapshotName}`);
    } else {
      // Compare
      try {
        const diff = await pixelDiff(referencePath, currentPath);
        const ratio = diff.ratio;
        const pct   = (ratio * 100).toFixed(2);

        if (diff.method === 'filesize-proxy') {
          assertSoft(ratio < 0.05,
            `Snapshot ${snapshotName}: file-size diff ${pct}% (threshold 5%) [pixel-diff unavailable]`);
        } else {
          if (ratio <= DIFF_THRESHOLD) {
            console.log(`  ${GREEN}✓${RESET} Snapshot ${snapshotName}: ${pct}% diff (≤ ${DIFF_THRESHOLD*100}%)`);
          } else {
            console.log(`  ${RED}✗${RESET} ${RED}Snapshot ${snapshotName}: ${pct}% diff (threshold ${DIFF_THRESHOLD*100}%)${RESET}`);
            errors.push({ name: `snapshot:${snapshotName}`, error: `${pct}% pixel diff exceeds threshold ${DIFF_THRESHOLD*100}%` });
          }
        }
      } catch (e) {
        console.log(`  ${YELLOW}⚠${RESET} Could not compare snapshot ${snapshotName}: ${e.message}`);
      }
    }
  }

  return errors;
}

// ─── entry point ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const smokeCli = process.argv.includes('--smoke');
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  HOMININES — VISUAL TESTS${UPDATE_MODE ? ' [UPDATE MODE]' : ''}${smokeCli ? ' [SMOKE]' : ''}${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);

  runVisualTests({ smoke: smokeCli }).then(errors => {
    const stats = getStats();
    console.log(`\n${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
    console.log(`  ${GREEN}✓ ${stats.pass} passed${RESET}  ${stats.warn ? `${YELLOW}⚠ ${stats.warn} warnings  ` : ''}${stats.fail ? `${RED}✗ ${stats.fail} failed${RESET}` : ''}`);
    if (errors.length) {
      console.log(`\n${RED}Failed tests:${RESET}`);
      errors.forEach(e => console.log(`  ${RED}✗${RESET} ${e.name}: ${e.error}`));
    }
    console.log(`${BOLD}${CYAN}══════════════════════════════════════${RESET}\n`);
    process.exit(errors.length > 0 ? 1 : 0);
  }).catch(err => {
    console.error(`\n${RED}Fatal error: ${err.message}${RESET}`);
    process.exit(2);
  });
}

module.exports = { runVisualTests };
