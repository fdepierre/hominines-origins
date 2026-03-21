/**
 * TEST RUNNER — hominines app
 * Runs all three test suites in sequence and prints a summary report.
 *
 * Run: node tests/run-all.js
 * CI mode: node tests/run-all.js --ci
 */

'use strict';
const { runUnitTests }   = require('./unit.test');
const { runVisualTests } = require('./visual.test');
const { runA11yTests }   = require('./a11y.test');
const { BOLD, CYAN, GREEN, RED, YELLOW, RESET } = require('./utils/harness');

const CI = process.argv.includes('--ci');
const start = Date.now();

const SUITES = [
  { name: 'Unit tests        (data integrity, maths, bearing)', fn: runUnitTests   },
  { name: 'Visual tests      (layout, contrast, snapshots)',     fn: runVisualTests },
  { name: 'A11y/interaction  (ARIA, touch, i18n, play/pause)',   fn: runA11yTests   },
];

async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   HOMININES — FULL NON-REGRESSION SUITE          ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}\n`);

  const results = [];

  for (const suite of SUITES) {
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
  const passed = results.filter(r => r.errors.length === 0);

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
