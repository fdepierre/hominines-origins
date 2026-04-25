/**
 * TEST RUNNER — hominines app
 * Runs all three test suites in sequence and prints a summary report.
 *
 * Run: node tests/run-all.js
 * CI mode: node tests/run-all.js --ci
 * Smoke (faster): node tests/run-smoke.js   or   node tests/run-all.js --smoke
 */

'use strict';
const { runUnitTests }   = require('./unit.test');
const { runVisualTests } = require('./visual.test');
const { runA11yTests }   = require('./a11y.test');
const { runMapLibreTests } = require('./maplibre.test');
const { BOLD, CYAN, GREEN, RED, YELLOW, RESET, resetStats } = require('./utils/harness');

const CI = process.argv.includes('--ci');
const SMOKE = process.argv.includes('--smoke');
const start = Date.now();

const SUITES = SMOKE
  ? [
      { name: 'Unit tests (full)', fn: runUnitTests },
      { name: 'Visual tests [smoke — no snapshots]', fn: () => runVisualTests({ smoke: true }) },
      { name: 'A11y [smoke — no tablet]', fn: () => runA11yTests({ smoke: true }) },
      { name: 'MapLibre tests (default map engine)', fn: runMapLibreTests },
    ]
  : [
      { name: 'Unit tests        (data integrity, maths, bearing)', fn: runUnitTests },
      { name: 'Visual tests      (layout, contrast, snapshots)', fn: () => runVisualTests({ smoke: false }) },
      { name: 'A11y/interaction  (ARIA, touch, i18n, play/pause)', fn: () => runA11yTests({ smoke: false }) },
      { name: 'MapLibre          (default map engine)', fn: runMapLibreTests },
    ];

async function main() {
  const titleLine = SMOKE
    ? '║   HOMININES — SMOKE SUITE (fast)                 ║'
    : '║   HOMININES — FULL NON-REGRESSION SUITE          ║';
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}${titleLine}${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}\n`);

  const results = [];

  for (const suite of SUITES) {
    resetStats();
    console.log(`\n${BOLD}▶ ${suite.name}${RESET}`);
    console.log('─'.repeat(55));
    try {
      const errors = await suite.fn();
      results.push({ name: suite.name, errors });
    } catch (e) {
      console.error(`${RED}Suite crashed: ${e.message}${RESET}`);
      results.push({ name: suite.name, errors: [{ name: 'suite-crash', error: e.message }] });
    }
  }

  // ─── summary ───────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const totalErrors = results.flatMap(r => r.errors);

  console.log(`\n\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   SUMMARY                                        ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}`);

  results.forEach(r => {
    const icon = r.errors.length === 0 ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const tag  = r.errors.length === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL (${r.errors.length} errors)${RESET}`;
    console.log(`  ${icon} ${tag}  ${r.name}`);
  });

  console.log(`\n  Elapsed: ${elapsed}s`);

  if (totalErrors.length === 0) {
    console.log(`\n${GREEN}${BOLD}  All tests passed.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${RED}${BOLD}  ${totalErrors.length} test(s) failed:${RESET}`);
    totalErrors.forEach(e => {
      console.log(`    ${RED}✗${RESET} ${e.name}: ${e.error}`);
    });
    console.log('');
    process.exit(CI ? 1 : 0);
  }
}

main().catch(err => {
  console.error(`\n${RED}Fatal: ${err.message}${RESET}`);
  process.exit(2);
});
