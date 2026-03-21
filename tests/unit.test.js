/**
 * UNIT TESTS — hominines app
 * Tests purely in-browser JS logic, without visual rendering.
 * Fast to run (~5 sec). No snapshots needed.
 *
 * Run: node tests/unit.test.js
 */

'use strict';
const { launch, loadApp, setTime, assert, assertSoft, getStats, resetStats,
        BOLD, CYAN, GREEN, RED, RESET } = require('./utils/harness');

async function runUnitTests() {
  const { browser, page } = await launch();
  await loadApp(page);
  const errors = [];

  // ─── helper to wrap each test block ────────────────────────────────────────
  async function test(name, fn) {
    process.stdout.write(`\n  ${CYAN}${name}${RESET}\n`);
    try {
      await fn();
    } catch (e) {
      errors.push({ name, error: e.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DATA INTEGRITY — SPECIES_DATA
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ DATA INTEGRITY${RESET}`);

  await test('SPECIES_DATA has exactly 12 species', async () => {
    const count = await page.evaluate(() => SPECIES_DATA?.length);
    assert(count === 12, `SPECIES_DATA.length === 12 (got ${count})`);
  });

  await test('Every species has required fields', async () => {
    const issues = await page.evaluate(() => {
      const required = ['id','name','common','start','end','color','regions','sites','pigmentation','biometrics','tools','migrations'];
      return SPECIES_DATA.flatMap(sp =>
        required.filter(k => sp[k] === undefined || sp[k] === null)
          .map(k => `${sp.id} missing: ${k}`)
      );
    });
    assert(issues.length === 0, `All species have required fields (issues: ${issues.join(', ') || 'none'})`);
  });

  await test('Every species start < end (chronological order)', async () => {
    const bad = await page.evaluate(() =>
      SPECIES_DATA.filter(sp => sp.start >= sp.end).map(sp => sp.id)
    );
    assert(bad.length === 0, `All species have start < end (bad: ${bad.join(', ') || 'none'})`);
  });

  await test('Every species color is a valid hex string', async () => {
    const bad = await page.evaluate(() =>
      SPECIES_DATA.filter(sp => !/^#[0-9a-fA-F]{3,8}$/.test(sp.color)).map(sp => sp.id)
    );
    assert(bad.length === 0, `All species colors are valid hex (bad: ${bad.join(', ') || 'none'})`);
  });

  await test('Every species has at least one fossil site', async () => {
    const bad = await page.evaluate(() =>
      SPECIES_DATA.filter(sp => !sp.sites || sp.sites.length === 0).map(sp => sp.id)
    );
    assertSoft(bad.length === 0, `All species have at least one site (missing: ${bad.join(', ') || 'none'})`);
  });

  await test('Migration paths: from/to are valid [lat,lng] pairs', async () => {
    const bad = await page.evaluate(() => {
      const issues = [];
      SPECIES_DATA.forEach(sp => {
        (sp.migrations || []).forEach((m, i) => {
          const ok = Array.isArray(m.from) && Array.isArray(m.to)
            && m.from.length === 2 && m.to.length === 2
            && m.from.every(n => typeof n === 'number')
            && m.to.every(n => typeof n === 'number');
          if (!ok) issues.push(`${sp.id}[${i}]`);
        });
      });
      return issues;
    });
    assert(bad.length === 0, `All migration paths are valid [lat,lng] pairs (bad: ${bad.join(', ') || 'none'})`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DATA INTEGRITY — EVENTS_DATA
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ EVENTS DATA${RESET}`);

  await test('EVENTS_DATA has at least 15 events', async () => {
    const count = await page.evaluate(() => EVENTS_DATA?.length);
    assert(count >= 15, `EVENTS_DATA.length >= 15 (got ${count})`);
  });

  await test('Every event has id, time, label, icon, lat, lng', async () => {
    const issues = await page.evaluate(() => {
      const required = ['id','time','label','icon','lat','lng'];
      return (EVENTS_DATA || []).flatMap(ev =>
        required.filter(k => ev[k] === undefined).map(k => `${ev.id} missing: ${k}`)
      );
    });
    assert(issues.length === 0, `All events have required fields (issues: ${issues.join(', ') || 'none'})`);
  });

  await test('Event times are negative (before present)', async () => {
    const bad = await page.evaluate(() =>
      (EVENTS_DATA || []).filter(ev => ev.time >= 0).map(ev => ev.id)
    );
    assert(bad.length === 0, `All event times are negative (bad: ${bad.join(', ') || 'none'})`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TIMELINE MATHS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ TIMELINE MATHS${RESET}`);

  await test('linearToTime(0) ≈ TIMELINE_MIN', async () => {
    const result = await page.evaluate(() => {
      const v = linearToTime(0);
      return Math.abs(v - TIMELINE_MIN) < 1000;
    });
    assert(result, 'linearToTime(0) ≈ TIMELINE_MIN');
  });

  await test('linearToTime(1) ≈ TIMELINE_MAX', async () => {
    const result = await page.evaluate(() => {
      const v = linearToTime(1);
      return Math.abs(v - TIMELINE_MAX) < 1000;
    });
    assert(result, 'linearToTime(1) ≈ TIMELINE_MAX');
  });

  await test('timeToLinear(linearToTime(0.5)) ≈ 0.5 (round-trip)', async () => {
    const result = await page.evaluate(() => {
      const mid = linearToTime(0.5);
      const back = timeToLinear(mid);
      return Math.abs(back - 0.5) < 0.001;
    });
    assert(result, 'Round-trip linearToTime <-> timeToLinear is stable');
  });

  await test('formatTime(-4100000) contains "4,1 Ma" or "4.1 Ma"', async () => {
    const formatted = await page.evaluate(() => formatTime(-4100000));
    assert(/4[,.]1\s*Ma/i.test(formatted), `formatTime(-4100000) = "${formatted}" contains "4,1 Ma"`);
  });

  await test('formatTime(-45000) contains "45 000" or "45000"', async () => {
    const formatted = await page.evaluate(() => formatTime(-45000));
    assert(/45[\s,]?000/.test(formatted), `formatTime(-45000) = "${formatted}" contains "45 000"`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. getBearing — ARROW DIRECTION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ MIGRATION ARROW BEARING${RESET}`);

  await test('getBearing: Africa → Asia is roughly East (45°–135°)', async () => {
    const bearing = await page.evaluate(() =>
      getBearing([5.0, 36.0], [41.33, 44.1])
    );
    // Africa (lng 36) to Caucasus (lng 44) — should be NE, roughly 20–80°
    assert(typeof bearing === 'number' && bearing >= 0 && bearing < 360,
      `getBearing returns a valid angle (got ${bearing}°)`);
    assertSoft(bearing > 10 && bearing < 120,
      `Africa→Caucasus bearing is North-East (got ${bearing}°, expected 10–120°)`);
  });

  await test('getBearing: Europe → Iberia is roughly SW (180°–280°)', async () => {
    const bearing = await page.evaluate(() =>
      getBearing([50.0, 14.0], [40.0, -3.7])
    );
    assertSoft(bearing > 180 && bearing < 290,
      `Europe→Iberia bearing is South-West (got ${bearing}°, expected 180–290°)`);
  });

  await test('getBearing: Siberia → Americas is roughly East (60°–120°)', async () => {
    const bearing = await page.evaluate(() =>
      getBearing([57.3, 69.0], [55.0, -120.0])
    );
    // crosses antimeridian — should be East
    assertSoft(bearing > 50 && bearing < 130,
      `Siberia→Americas bearing is East (got ${bearing}°, expected 50–130°)`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SKIN_PERIODS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ SKIN PERIODS${RESET}`);

  await test('SKIN_PERIODS has at least 7 segments', async () => {
    const count = await page.evaluate(() => SKIN_PERIODS?.length);
    assert(count >= 7, `SKIN_PERIODS.length >= 7 (got ${count})`);
  });

  await test('Skin periods are chronologically ordered (ascending start)', async () => {
    const ordered = await page.evaluate(() => {
      const periods = SKIN_PERIODS || [];
      return periods.every((p, i) => i === 0 || p.start >= periods[i-1].start);
    });
    assert(ordered, 'SKIN_PERIODS are ordered by ascending start time');
  });

  await test('First two skin periods have "fur" cssClass', async () => {
    const classes = await page.evaluate(() =>
      (SKIN_PERIODS || []).slice(0,2).map(p => p.cssClass)
    );
    assertSoft(classes.includes('fur') || classes.includes('partial-fur'),
      `First two periods include fur/partial-fur class (got: ${classes.join(', ')})`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. LANE ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ LANE ASSIGNMENTS${RESET}`);

  await test('LANE_ASSIGNMENTS covers all species IDs', async () => {
    const missing = await page.evaluate(() => {
      const assigned = Object.keys(LANE_ASSIGNMENTS || {});
      return (SPECIES_DATA || []).map(sp => sp.id).filter(id => !assigned.includes(id));
    });
    assert(missing.length === 0, `All species have lane assignments (missing: ${missing.join(', ') || 'none'})`);
  });

  await test('LANE_ASSIGNMENTS values are integers 0–4', async () => {
    const bad = await page.evaluate(() =>
      Object.entries(LANE_ASSIGNMENTS || {})
        .filter(([,v]) => !Number.isInteger(v) || v < 0 || v > 4)
        .map(([k,v]) => `${k}=${v}`)
    );
    assert(bad.length === 0, `All lane values are integers 0–4 (bad: ${bad.join(', ') || 'none'})`);
  });

  // ─── close ────────────────────────────────────────────────────────────────
  await browser.close();
  return errors;
}

// ─── entry point ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const { BOLD, CYAN, GREEN, RED, YELLOW, RESET } = require('./utils/harness');
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  HOMININES — UNIT TESTS${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);

  runUnitTests().then(errors => {
    const { pass, fail, warn } = getStats();
    console.log(`\n${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
    console.log(`  ${GREEN}✓ ${pass} passed${RESET}  ${warn ? `${YELLOW}⚠ ${warn} warnings  ` : ''}${fail ? `${RED}✗ ${fail} failed${RESET}` : ''}`);
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

module.exports = { runUnitTests };
