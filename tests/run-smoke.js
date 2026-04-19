/**
 * SMOKE TEST RUNNER — fast, stable checks for local dev / pre-push
 *
 * - Full unit suite (in-browser data + maths)
 * - Visual: DOM + data-testid contract + dark contrast only (no PNG snapshots, no light-mode pass)
 * - A11y: core interaction + EN/FR i18n only (no 3s play-to-end wait, no tablet viewport)
 *
 * Run: node tests/run-smoke.js
 */

'use strict';
const { runUnitTests } = require('./unit.test');
const { runVisualTests } = require('./visual.test');
const { runA11yTests } = require('./a11y.test');
const { resetStats, BOLD, CYAN, GREEN, RED, YELLOW, RESET } = require('./utils/harness');

const CI = process.argv.includes('--ci');
const start = Date.now();

const SUITES = [
  { name: 'Unit tests (full in-browser suite)', fn: () => runUnitTests() },
  { name: 'Visual tests [smoke — no snapshots]', fn: () => runVisualTests({ smoke: true }) },
  { name: 'A11y tests [smoke — no tablet]', fn: () => runA11yTests({ smoke: true }) },
];

async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   HOMININES — SMOKE SUITE (fast)                 ║${RESET}`);
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

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const totalErrors = results.flatMap((r) => r.errors);

  console.log(`\n\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   SMOKE SUMMARY                                  ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}`);

  results.forEach((r) => {
    const icon = r.errors.length === 0 ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const tag = r.errors.length === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL (${r.errors.length} errors)${RESET}`;
    console.log(`  ${icon} ${tag}  ${r.name}`);
  });

  console.log(`\n  Elapsed: ${elapsed}s`);

  if (totalErrors.length === 0) {
    console.log(`\n${GREEN}${BOLD}  All smoke tests passed.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${RED}${BOLD}  ${totalErrors.length} test(s) failed:${RESET}`);
    totalErrors.forEach((e) => {
      console.log(`    ${RED}✗${RESET} ${e.name}: ${e.error}`);
    });
    console.log('');
    process.exit(CI ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Fatal: ${err.message}${RESET}`);
  process.exit(2);
});
