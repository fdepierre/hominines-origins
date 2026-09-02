/**
 * UNIT TESTS — hominines app
 * Tests purely in-browser JS logic, without visual rendering.
 * Fast to run (~5 sec). No snapshots needed.
 *
 * Run: node tests/unit.test.js
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { launch, loadApp, setTime, assert, assertSoft, getStats, resetStats,
        BOLD, CYAN, GREEN, RED, RESET } = require('./utils/harness');

const SPECIES_JSON_PATH = path.resolve(__dirname, '..', 'app', 'data', 'species.json');
const EVENTS_JSON_PATH = path.resolve(__dirname, '..', 'app', 'data', 'events.json');

const SPECIES_CERTAINTY_KEYS = [
  'hominin:taxonomyDebateLevel',
  'hominin:taxonomyEvidenceType',
  'hominin:behaviorDebateLevel',
  'hominin:behaviorEvidenceType',
  'hominin:pigmentationDebateLevel',
  'hominin:pigmentationEvidenceType',
];
const EVENT_CERTAINTY_KEYS = ['hominin:debateLevel', 'hominin:evidenceType'];

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

  await test('SPECIES_DATA loads every species declared in species.json', async () => {
    const expected = JSON.parse(fs.readFileSync(SPECIES_JSON_PATH, 'utf8')).itemListElement.length;
    const count = await page.evaluate(() => SPECIES_DATA?.length);
    assert(expected > 0, `species.json is not empty (got ${expected} items)`);
    assert(count === expected, `SPECIES_DATA.length === ${expected} from species.json (got ${count})`);
  });

  await test('Stable data-testid hooks exist for automation', async () => {
    const testids = ['map', 'burger-menu-button', 'side-panel', 'timeline', 'play-toggle',
      'burger-translate-hint', 'catalogue-lang-select', 'timeline-needle-row'];
    const missing = await page.evaluate((ids) =>
      ids.filter((t) => !document.querySelector(`[data-testid="${t}"]`)), testids);
    assert(missing.length === 0, `data-testid hooks present (missing: ${missing.join(', ') || 'none'})`);
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

  await test('Species panel keeps scientific names stable and common names translatable', async () => {
    async function panelState(lang) {
      return page.evaluate(async (lng) => {
        if (typeof setCatalogueLang === 'function') setCatalogueLang(lng);
        const species = SPECIES_DATA.find(sp => sp.id === 'erectus') || SPECIES_DATA[0];
        renderPanel(species);
        const scientific = document.querySelector('.species-name');
        const common = document.querySelector('.species-name-common');
        const panel = document.getElementById('panel-content');
        const root = document.querySelector('#panel-content .animate-in');
        return {
          panelTranslate: panel ? panel.getAttribute('translate') : '',
          panelLang: panel ? panel.getAttribute('lang') : '',
          rootTranslate: root ? root.getAttribute('translate') : '',
          rootLang: root ? root.getAttribute('lang') : '',
          scientificTranslate: scientific ? scientific.getAttribute('translate') : '',
          commonTranslate: common ? common.getAttribute('translate') : '',
          commonLang: common ? common.getAttribute('lang') : '',
          commonText: common ? common.textContent.trim() : '',
        };
      }, lang);
    }

    const enState = await panelState('en');
    assert(enState.panelTranslate === 'yes', 'Species panel content is browser-translatable');
    assert(enState.panelLang === 'en', `English-first panel exposes source language (got "${enState.panelLang}")`);
    assert(enState.rootTranslate === 'yes', 'Rendered species block is browser-translatable');
    assert(enState.rootLang === 'en', `English-first block exposes source language (got "${enState.rootLang}")`);
    assert(enState.scientificTranslate === 'no', 'Scientific taxon name is protected from browser translation');
    assert(enState.commonTranslate === 'yes', 'Common/descriptive species name is browser-translatable');
    assert(enState.commonLang === 'en', `English common name exposes source language (got "${enState.commonLang}")`);
    assert(/upright man/i.test(enState.commonText), `English common name rendered as source (got "${enState.commonText}")`);

    const frState = await panelState('fr');
    assert(frState.panelLang === 'fr', `French catalogue exposes lang=fr (got "${frState.panelLang}")`);
    assert(frState.panelTranslate === 'no', 'Bundled French catalogue is protected from re-translation');
    assert(frState.rootLang === 'fr', `French block exposes lang=fr (got "${frState.rootLang}")`);
    assert(frState.rootTranslate === 'no', 'French narrative is not re-translated');
    assert(frState.commonLang === 'fr', `French common name exposes lang=fr (got "${frState.commonLang}")`);
    assert(frState.scientificTranslate === 'no', 'Scientific taxon name stays protected in French catalogue');
    assert(/homme debout/i.test(frState.commonText), `French common name still rendered (got "${frState.commonText}")`);
    await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('en'); });
  });

  await test('French browser auto-selects the French catalogue', async () => {
    const { browser: bFr, page: pFr } = await launch({ locale: 'fr-FR' });
    try {
      await loadApp(pFr);
      const state = await pFr.evaluate(() => {
        const species = SPECIES_DATA.find(sp => sp.id === 'sahelanthropus') || SPECIES_DATA[0];
        renderPanel(species);
        const common = document.querySelector('.species-name-common');
        const sel = document.getElementById('catalogue-lang-select');
        return {
          htmlLang: document.documentElement.lang,
          catalogueLang: typeof currentDataLang === 'function' ? currentDataLang() : '',
          selectorValue: sel ? sel.value : '',
          common: species.common,
          commonText: common ? common.textContent.trim() : '',
          panelLang: document.getElementById('panel-content') ? document.getElementById('panel-content').getAttribute('lang') : '',
        };
      });
      assert(state.htmlLang === 'fr', `French browser sets html lang=fr (got "${state.htmlLang}")`);
      assert(state.catalogueLang === 'fr', `Catalogue auto-selects fr (got "${state.catalogueLang}")`);
      assert(state.selectorValue === 'fr', `Catalogue selector is Français (got "${state.selectorValue}")`);
      assert(state.panelLang === 'fr', `Panel lang=fr (got "${state.panelLang}")`);
      assert(/plus ancien préhumain/i.test(state.common), `Catalogue defaults to French (got "${state.common}")`);
      assert(/plus ancien préhumain/i.test(state.commonText), `Panel renders French common name (got "${state.commonText}")`);
      await pFr.evaluate(() => {
        const species = SPECIES_DATA.find(sp => sp.id === 'habilis') || SPECIES_DATA[0];
        renderPanel(species);
        if (window.__mapLibreMap) {
          window.__mapLibreMap.jumpTo({ zoom: 1.6, center: [20, 20] });
          if (typeof updateMapLibreLabels === 'function') updateMapLibreLabels();
        }
      });
      await pFr.waitForTimeout(300);
      const chrome = await pFr.evaluate(() => {
        const africa = document.querySelector('.continent-label-marker[data-continent-code="africa"]');
        return {
          simple: (document.getElementById('timeline-view-mode-simple') || {}).textContent || '',
          detailed: (document.getElementById('timeline-view-mode-detailed') || {}).textContent || '',
          subtitle: (document.getElementById('tl-app-desc') || {}).textContent || '',
          events: (document.querySelector('#events-band .timeline-band-label') || {}).textContent || '',
          skinBand: (document.querySelector('#skin-band .timeline-band-label') || {}).textContent || '',
          period: (document.querySelector('.period-label') || {}).textContent || '',
          height: (document.querySelector('.figure-bio-table th') || {}).textContent || '',
          pig: (document.querySelector('.pig-label') || {}).textContent || '',
          tools: (document.querySelector('.section-title') || {}).textContent || '',
          play: (document.querySelector('[data-testid="play-label-paused"]') || {}).textContent || '',
          africa: africa ? africa.textContent.trim() : '',
          i18n: (typeof i18next !== 'undefined' && i18next.isInitialized) ? i18next.language : '',
        };
      });
      assert(chrome.i18n === 'fr', `i18n language is fr (got "${chrome.i18n}")`);
      assert(/vue simple/i.test(chrome.simple), `Simple view is French (got "${chrome.simple}")`);
      assert(/vue détaillée|vue detaillee/i.test(chrome.detailed), `Detailed view is French (got "${chrome.detailed}")`);
      assert(/migrations humaines/i.test(chrome.subtitle), `Header subtitle is French (got "${chrome.subtitle}")`);
      assert(/jalons/i.test(chrome.events), `Milestones band is French (got "${chrome.events}")`);
      assert(/peau/i.test(chrome.skinBand), `Skin band is French (got "${chrome.skinBand}")`);
      assert(/\sà\s/i.test(chrome.period), `Period separator is « à » (got "${chrome.period}")`);
      assert(/taille/i.test(chrome.height), `Height label is French (got "${chrome.height}")`);
      assert(/peau/i.test(chrome.pig), `Pigmentation label is French (got "${chrome.pig}")`);
      assert(/techniques|comportements/i.test(chrome.tools), `Tools heading is French (got "${chrome.tools}")`);
      assert(/lecture/i.test(chrome.play), `Play label is French (got "${chrome.play}")`);
      assert(/afrique/i.test(chrome.africa), `Continent label is French (got "${chrome.africa}")`);
    } finally {
      await bFr.close();
    }
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

  await test('Every species has hominin certainty fields (from species.json / adaptSpecies)', async () => {
    const keys = [
      'hominin:taxonomyDebateLevel',
      'hominin:taxonomyEvidenceType',
      'hominin:behaviorDebateLevel',
      'hominin:behaviorEvidenceType',
      'hominin:pigmentationDebateLevel',
      'hominin:pigmentationEvidenceType',
    ];
    const debateLevels = new Set(['STRONG_CONSENSUS', 'MODERATE_CONSENSUS', 'ACTIVE_DEBATE', 'SPECULATIVE_HYPOTHESIS']);
    const evidenceTypes = new Set(['DIRECT_DATA', 'INDIRECT_DATA', 'EVOLUTIONARY_INFERENCE', 'MEDIA_NARRATIVE']);
    const issues = await page.evaluate(({ keys: k, debateLevels: dl, evidenceTypes: et }) => {
      const bad = [];
      const dset = new Set(dl);
      const eset = new Set(et);
      (SPECIES_DATA || []).forEach((sp) => {
        k.forEach((key) => {
          if (sp[key] === undefined || sp[key] === null) bad.push(`${sp.id} missing ${key}`);
        });
        if (!dset.has(sp['hominin:taxonomyDebateLevel'])) bad.push(`${sp.id} bad taxonomyDebateLevel`);
        if (!dset.has(sp['hominin:behaviorDebateLevel'])) bad.push(`${sp.id} bad behaviorDebateLevel`);
        if (!dset.has(sp['hominin:pigmentationDebateLevel'])) bad.push(`${sp.id} bad pigmentationDebateLevel`);
        if (!eset.has(sp['hominin:taxonomyEvidenceType'])) bad.push(`${sp.id} bad taxonomyEvidenceType`);
        if (!eset.has(sp['hominin:behaviorEvidenceType'])) bad.push(`${sp.id} bad behaviorEvidenceType`);
        if (!eset.has(sp['hominin:pigmentationEvidenceType'])) bad.push(`${sp.id} bad pigmentationEvidenceType`);
      });
      return bad;
    }, { keys, debateLevels: [...debateLevels], evidenceTypes: [...evidenceTypes] });
    assert(issues.length === 0, `Hominin certainty fields valid (issues: ${issues.join('; ') || 'none'})`);
  });

  await test('Every species has hominin:references with a DOI', async () => {
    const issues = await page.evaluate(() => {
      const doi = /10\.\d{4,9}\/\S+/;
      return (window._RAW_SPECIES_JSON?.itemListElement || []).flatMap((s) => {
        const refs = s['hominin:references'];
        if (!Array.isArray(refs) || refs.length === 0) return [`${s['@id']} missing hominin:references`];
        const hasDoi = refs.some((r) => r && doi.test(String(r.identifier || r.name || '')));
        return hasDoi ? [] : [`${s['@id']} references have no DOI`];
      });
    });
    assert(issues.length === 0, `Species references present (issues: ${issues.join('; ') || 'none'})`);
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

  await test('EVENTS_DATA loads every milestone declared in events.json', async () => {
    const expected = JSON.parse(fs.readFileSync(EVENTS_JSON_PATH, 'utf8')).itemListElement.length;
    const count = await page.evaluate(() => EVENTS_DATA?.length);
    assert(expected > 0, `events.json is not empty (got ${expected} items)`);
    assert(count === expected, `EVENTS_DATA.length === ${expected} from events.json (got ${count})`);
  });

  await test('Embedded fallback matches JSON species/event IDs and certainty fields', async () => {
    const speciesFile = JSON.parse(fs.readFileSync(SPECIES_JSON_PATH, 'utf8'));
    const eventsFile = JSON.parse(fs.readFileSync(EVENTS_JSON_PATH, 'utf8'));
    const expectedSpeciesIds = speciesFile.itemListElement.map((s) => s['@id']).sort();
    const expectedEventIds = eventsFile.itemListElement.map((e) => e['@id']).sort();
    assert(expectedSpeciesIds.length > 0, `species.json has items (got ${expectedSpeciesIds.length})`);
    assert(expectedEventIds.length > 0, `events.json has items (got ${expectedEventIds.length})`);

    const expectedSpeciesCert = {};
    speciesFile.itemListElement.forEach((s) => {
      const row = {};
      SPECIES_CERTAINTY_KEYS.forEach((k) => {
        if (s[k] !== undefined && s[k] !== null) row[k] = s[k];
      });
      expectedSpeciesCert[s['@id']] = row;
    });
    const expectedEventCert = {};
    eventsFile.itemListElement.forEach((e) => {
      const row = {};
      EVENT_CERTAINTY_KEYS.forEach((k) => {
        if (e[k] !== undefined && e[k] !== null) row[k] = e[k];
      });
      expectedEventCert[e['@id']] = row;
    });

    const { browser: embBrowser, page: embPage } = await launch();
    try {
      await embPage.route('**/data/species.json**', (route) => route.abort('failed'));
      await embPage.route('**/data/events.json**', (route) => route.abort('failed'));
      await loadApp(embPage);

      const runtime = await embPage.evaluate(({ speciesKeys, eventKeys }) => {
        const speciesIds = (SPECIES_DATA || []).map((s) => s.id).sort();
        const eventIds = (EVENTS_DATA || []).map((e) => e.id).sort();
        const rawSpecies = window._RAW_SPECIES_JSON;
        const rawEvents = window._RAW_EVENTS_JSON;
        const speciesCert = {};
        (rawSpecies.itemListElement || []).forEach((s) => {
          const row = {};
          speciesKeys.forEach((k) => {
            if (s[k] !== undefined && s[k] !== null) row[k] = s[k];
          });
          speciesCert[s['@id']] = row;
        });
        const eventCert = {};
        (rawEvents.itemListElement || []).forEach((e) => {
          const row = {};
          eventKeys.forEach((k) => {
            if (e[k] !== undefined && e[k] !== null) row[k] = e[k];
          });
          eventCert[e['@id']] = row;
        });
        // Reference equality: loadData assigns the embedded consts on fetch failure.
        const usedEmbedded = rawSpecies === _EMBEDDED_SPECIES && rawEvents === _EMBEDDED_EVENTS;
        return { speciesIds, eventIds, speciesCert, eventCert, usedEmbedded };
      }, { speciesKeys: SPECIES_CERTAINTY_KEYS, eventKeys: EVENT_CERTAINTY_KEYS });

      assert(runtime.usedEmbedded, 'loadData used embedded fallback after fetch abort');
      assert(
        JSON.stringify(runtime.speciesIds) === JSON.stringify(expectedSpeciesIds),
        `Embedded species IDs match JSON (got ${runtime.speciesIds.length}, expected ${expectedSpeciesIds.length})`
      );
      assert(
        JSON.stringify(runtime.eventIds) === JSON.stringify(expectedEventIds),
        `Embedded event IDs match JSON (got ${runtime.eventIds.length}, expected ${expectedEventIds.length})`
      );
      assert(
        JSON.stringify(runtime.speciesCert) === JSON.stringify(expectedSpeciesCert),
        'Embedded species certainty fields match species.json where present'
      );
      assert(
        JSON.stringify(runtime.eventCert) === JSON.stringify(expectedEventCert),
        'Embedded event certainty fields match events.json'
      );
    } finally {
      await embBrowser.close();
    }
  });

  await test('Every event has hominin certainty fields on JSON and runtime', async () => {
    const debateLevels = new Set(['STRONG_CONSENSUS', 'MODERATE_CONSENSUS', 'ACTIVE_DEBATE', 'SPECULATIVE_HYPOTHESIS', 'UNASSESSED']);
    const evidenceTypes = new Set(['DIRECT_DATA', 'INDIRECT_DATA', 'EVOLUTIONARY_INFERENCE', 'MEDIA_NARRATIVE', 'UNASSESSED']);
    const file = JSON.parse(fs.readFileSync(EVENTS_JSON_PATH, 'utf8'));
    const fileIssues = [];
    file.itemListElement.forEach((e) => {
      EVENT_CERTAINTY_KEYS.forEach((k) => {
        if (e[k] === undefined || e[k] === null) fileIssues.push(`${e['@id']} missing ${k}`);
      });
      if (!debateLevels.has(e['hominin:debateLevel'])) fileIssues.push(`${e['@id']} bad debateLevel`);
      if (!evidenceTypes.has(e['hominin:evidenceType'])) fileIssues.push(`${e['@id']} bad evidenceType`);
    });
    assert(fileIssues.length === 0, `events.json certainty valid (issues: ${fileIssues.join('; ') || 'none'})`);

    const runtimeIssues = await page.evaluate(({ debateLevels: dl, evidenceTypes: et }) => {
      const bad = [];
      const dset = new Set(dl);
      const eset = new Set(et);
      (EVENTS_DATA || []).forEach((ev) => {
        if (!dset.has(ev['hominin:debateLevel'])) bad.push(`${ev.id} missing/bad debateLevel`);
        if (!eset.has(ev['hominin:evidenceType'])) bad.push(`${ev.id} missing/bad evidenceType`);
      });
      return bad;
    }, { debateLevels: [...debateLevels], evidenceTypes: [...evidenceTypes] });
    assert(runtimeIssues.length === 0, `EVENTS_DATA certainty copied (issues: ${runtimeIssues.join('; ') || 'none'})`);
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

  await test('timeToLinear(-7500000) ≈ 0 (timeline left bound)', async () => {
    const d = await page.evaluate(() => {
      const v = timeToLinear(-7500000);
      return Math.abs(v);
    });
    assert(d < 0.001, `timeToLinear(-7500000) ≈ 0 (got |v| = ${d})`);
  });

  await test('timeToLinear(-7200000) > 0 (Sahelanthropus window)', async () => {
    const v = await page.evaluate(() => timeToLinear(-7200000));
    assert(v > 0, `timeToLinear(-7200000) > 0 (got ${v})`);
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
    // Crosses the antimeridian: the raw longitude delta is -189°, so without
    // wrapping this reads as West (269°) and the arrow points across Europe.
    assert(bearing > 50 && bearing < 130,
      `Siberia→Americas bearing is East (got ${bearing}°, expected 50–130°)`);
  });

  await test('getBearing: Americas → Siberia is roughly West (antimeridian, reverse)', async () => {
    const bearing = await page.evaluate(() =>
      getBearing([55.0, -120.0], [57.3, 69.0])
    );
    // Guards against over-correcting the wrap: the return trip must stay West.
    assert(bearing > 230 && bearing < 310,
      `Americas→Siberia bearing is West (got ${bearing}°, expected 230–310°)`);
  });

  await test('getBearing: longitude wrapping does not disturb short hops', async () => {
    const bearings = await page.evaluate(() => ({
      east: getBearing([0, 10], [0, 20]),
      west: getBearing([0, 20], [0, 10]),
      atMeridian: getBearing([0, -5], [0, 5]),
    }));
    assert(Math.abs(bearings.east - 90) < 0.01,
      `Due-east hop is 90° (got ${bearings.east}°)`);
    assert(Math.abs(bearings.west - 270) < 0.01,
      `Due-west hop is 270° (got ${bearings.west}°)`);
    assert(Math.abs(bearings.atMeridian - 90) < 0.01,
      `Crossing the prime meridian eastward is 90° (got ${bearings.atMeridian}°)`);
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
  // 6. TIMELINE LANES (dynamic row order, no LANE_ASSIGNMENTS table)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ TIMELINE LANES${RESET}`);

  await test('Rendered species lane count matches buildTimelineLaneModels()', async () => {
    const { nLanes, nExpected } = await page.evaluate(() => ({
      nLanes: document.querySelectorAll('#timeline-lanes .species-lane').length,
      nExpected: typeof buildTimelineLaneModels === 'function' ? buildTimelineLaneModels().length : 0,
    }));
    assert(nLanes === nExpected, `Lane count ${nLanes} === buildTimelineLaneModels().length ${nExpected}`);
  });

  await test('Detailed timeline restores one lane per catalogue species', async () => {
    await page.evaluate(() => {
      if (typeof setTimelineViewMode === 'function') setTimelineViewMode('detailed');
    });
    const { nLanes, nSpecies } = await page.evaluate(() => ({
      nLanes: document.querySelectorAll('#timeline-lanes .species-lane').length,
      nSpecies: (SPECIES_DATA || []).length,
    }));
    assert(nLanes === nSpecies, `Detailed: lane count ${nLanes} === SPECIES_DATA.length ${nSpecies}`);
  });

  await test('Simple mode exposes merged erectus and Asian-clade group lanes', async () => {
    await page.evaluate(() => {
      if (typeof setTimelineViewMode === 'function') setTimelineViewMode('simple');
    });
    const ok = await page.evaluate(() => ({
      erectus: !!document.getElementById('lane-grp-erectus-sl'),
      asian: !!document.getElementById('lane-grp-asian-clade'),
    }));
    assert(ok.erectus, 'Expected #lane-grp-erectus-sl in simple timeline mode');
    assert(ok.asian, 'Expected #lane-grp-asian-clade in simple timeline mode');
  });

  await test('2026 catalogue taxa have timeline lane elements', async () => {
    await page.evaluate(() => {
      if (typeof setTimelineViewMode === 'function') setTimelineViewMode('detailed');
    });
    const missing = await page.evaluate(() => {
      const ids = ['sahelanthropus', 'ardipithecus', 'georgicus', 'antecessor', 'stw573', 'australopithecus-ledi-geraru', 'longi'];
      return ids.filter((id) => !document.getElementById('lane-' + id));
    });
    assert(missing.length === 0, `Expected lane-* for 2026 additions (missing: ${missing.join(', ') || 'none'})`);
  });

  await test('Certainty triangle wedges match JSON debate levels (ACTIVE_DEBATE must remain visible)', async () => {
    const WEDGE = {
      STRONG_CONSENSUS: 'certainty-tri-wedge--strong',
      MODERATE_CONSENSUS: 'certainty-tri-wedge--moderate',
      ACTIVE_DEBATE: 'certainty-tri-wedge--active-debate',
      SPECULATIVE_HYPOTHESIS: 'certainty-tri-wedge--speculative',
    };
    const ids = ['stw573', 'longi', 'naledi'];
    const issues = await page.evaluate(({ ids: speciesIds, WEDGE: wedgeMap }) => {
      const bad = [];
      speciesIds.forEach((id) => {
        const sp = SPECIES_DATA.find((s) => s.id === id);
        if (!sp) { bad.push(id + ' missing from SPECIES_DATA'); return; }
        renderPanel(sp);
        const paths = [...document.querySelectorAll('.certainty-tri-svg path')];
        if (paths.length !== 3) {
          bad.push(id + ' expected 3 wedges, got ' + paths.length);
          return;
        }
        const domains = ['taxonomy', 'behavior', 'pigmentation'];
        domains.forEach((dom, i) => {
          const level = sp['hominin:' + dom + 'DebateLevel'];
          const want = wedgeMap[level];
          const got = paths[i].getAttribute('class') || '';
          if (!want || !got.split(/\s+/).includes(want)) {
            bad.push(id + ' ' + dom + ' JSON ' + level + ' not in class "' + got + '"');
          }
        });
      });
      const legend = document.querySelector('.certainty-tri-pop-legend');
      const legendText = legend ? legend.textContent : '';
      if (!/active debate/i.test(legendText) || !/speculative/i.test(legendText)) {
        bad.push('legend must name active debate and speculative separately (got: ' + legendText + ')');
      }
      if (/active debate or fragile/i.test(legendText)) {
        bad.push('legend still merges debate and speculative');
      }
      return bad;
    }, { ids, WEDGE });
    assert(issues.length === 0, `Wedges match JSON (issues: ${issues.join('; ') || 'none'})`);
  });

  await test('Certainty popover explains each domain with catalogue facts, not only generic agreement', async () => {
    const st = await page.evaluate(() => {
      const sp = SPECIES_DATA.find((s) => s.id === 'sapiens-upper-paleo');
      if (!sp) return { missing: true };
      renderPanel(sp);
      const pop = document.querySelector('.certainty-tri-pop');
      const text = pop ? pop.textContent : '';
      const pigRow = pop && [...pop.querySelectorAll('.certainty-tri-row')].find((row) => /pigmentation/i.test(row.textContent || ''));
      const behRow = pop && [...pop.querySelectorAll('.certainty-tri-row')].find((row) => /behaviour|comportement/i.test(row.textContent || ''));
      return {
        missing: false,
        text,
        pigText: pigRow ? pigRow.textContent : '',
        behText: behRow ? behRow.textContent : '',
        genericOnly: /Broad researcher agreement/.test(text) && !/Dark \(347/.test(text),
      };
    });
    assert(!st.missing, 'sapiens-upper-paleo is in SPECIES_DATA');
    assert(/skin colour|couleur de la peau/i.test(st.text), `Pigmentation domain is defined (got "${st.text.slice(0, 180)}")`);
    assert(/how this group is named|comment on nomme/i.test(st.text), 'Taxonomy domain is defined');
    assert(/tools, burials|outils, sépultures/i.test(st.text), 'Behaviour domain is defined');
    assert(/dark \(347\/348/i.test(st.pigText), `Pigmentation cites skin colour from the catalogue (got "${st.pigText.slice(0, 240)}")`);
    assert(/ust/i.test(st.pigText), `Pigmentation cites a genome site (got "${st.pigText.slice(0, 280)}")`);
    assert(/348 genomes|348 génomes|direct dna/i.test(st.pigText), `Pigmentation cites the DNA evidence label (got "${st.pigText.slice(0, 280)}")`);
    assert(/aurignacian|gravettian|cave art/i.test(st.behText), `Behaviour cites material traces (got "${st.behText.slice(0, 240)}")`);
    assert(!st.genericOnly, 'Popover is not limited to generic “researchers agree” copy');
  });

  await test('Certainty popover sits left of the triangle so the icon stays visible', async () => {
    const st = await page.evaluate(() => {
      const sp = SPECIES_DATA.find((s) => s.id === 'sapiens-upper-paleo');
      if (!sp) return { missing: true };
      renderPanel(sp);
      const slot = document.querySelector('.certainty-tri-slot');
      const hit = slot && slot.querySelector('.certainty-tri-hit');
      const pop = document.querySelector('body > .certainty-tri-pop');
      if (!hit || !pop) return { missing: true };
      pop.classList.add('is-open');
      layoutCertaintyTriPop(slot, pop);
      const pr = pop.getBoundingClientRect();
      const hr = hit.getBoundingClientRect();
      return {
        missing: false,
        gap: hr.left - pr.right,
        hitW: hr.width,
        hitH: hr.height,
      };
    });
    assert(!st.missing, 'icon and popover present after renderPanel');
    assert(st.hitW >= 40 && st.hitH >= 40, `triangle hit target stays laid out (got ${st.hitW}×${st.hitH})`);
    assert(st.gap >= 24, `popover must stop left of the icon including its shadow (gap ${st.gap})`);
  });

  await test('Certainty colours are far apart in hue (moderate vs active debate)', async () => {
    const st = await page.evaluate(() => {
      function hue(hex) {
        const h = String(hex || '').replace('#', '').trim();
        if (h.length < 6) return null;
        const r = parseInt(h.slice(0, 2), 16) / 255;
        const g = parseInt(h.slice(2, 4), 16) / 255;
        const b = parseInt(h.slice(4, 6), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max === min) return 0;
        const d = max - min;
        let deg = 0;
        if (max === r) deg = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) deg = ((b - r) / d + 2) * 60;
        else deg = ((r - g) / d + 4) * 60;
        return deg;
      }
      function hueDist(a, b) {
        const ha = hue(a);
        const hb = hue(b);
        if (ha == null || hb == null) return 0;
        const d = Math.abs(ha - hb);
        return Math.min(d, 360 - d);
      }
      const css = getComputedStyle(document.documentElement);
      const colors = {
        strong: css.getPropertyValue('--certainty-strong-consensus').trim(),
        moderate: css.getPropertyValue('--certainty-moderate-consensus').trim(),
        debate: css.getPropertyValue('--certainty-active-debate').trim(),
        speculative: css.getPropertyValue('--certainty-speculative').trim(),
      };
      const keys = Object.keys(colors);
      const pairs = [];
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          pairs.push({
            a: keys[i],
            b: keys[j],
            dist: hueDist(colors[keys[i]], colors[keys[j]]),
          });
        }
      }
      return { colors, pairs };
    });
    const moderateDebate = st.pairs.find((p) => p.a === 'moderate' && p.b === 'debate');
    assert(moderateDebate && moderateDebate.dist >= 80,
      `moderate vs active-debate hue gap ≥ 80° (got ${moderateDebate ? moderateDebate.dist.toFixed(1) : 'missing'}°, colors ${st.colors.moderate} / ${st.colors.debate})`);
    const tooClose = st.pairs.filter((p) => p.dist < 50);
    assert(tooClose.length === 0,
      `every certainty pair ≥ 50° apart (close: ${tooClose.map((p) => p.a + '/' + p.b + ' ' + p.dist.toFixed(1) + '°').join(', ') || 'none'})`);
  });

  await test('Hot-case event certainty HTML carries the JSON debateLevel label', async () => {
    const ids = ['little-foot', 'naledi-burial', 'yunxian-longi', 'thomas-quarry'];
    const issues = await page.evaluate((eventIds) => {
      const bad = [];
      eventIds.forEach((id) => {
        const ev = EVENTS_DATA.find((e) => e.id === id);
        if (!ev) { bad.push(id + ' missing from EVENTS_DATA'); return; }
        const html = eventCertaintyHtml(ev);
        if (!html) { bad.push(id + ' eventCertaintyHtml is empty'); return; }
        const dl = ev['hominin:debateLevel'];
        const expected = (typeof i18next !== 'undefined' && i18next.isInitialized)
          ? i18next.t('ui.uncertaintyDebate_' + dl, { defaultValue: dl })
          : dl;
        if (!html.includes(expected) && html.indexOf(dl) === -1) {
          bad.push(id + ' JSON ' + dl + ' not in certainty HTML');
        }
      });
      return bad;
    }, ids);
    assert(issues.length === 0, `Event certainty visible (issues: ${issues.join('; ') || 'none'})`);
  });

  await test('Controversy red-list: hot cases must not flatten debates (en and fr JSON)', async () => {
    const speciesDoc = JSON.parse(fs.readFileSync(SPECIES_JSON_PATH, 'utf8'));
    const eventsDoc = JSON.parse(fs.readFileSync(EVENTS_JSON_PATH, 'utf8'));
    function stringsOfLang(node, lang) {
      const out = [];
      function walk(v, key) {
        if (v == null) return;
        if (typeof v === 'string') { out.push({ key, text: v }); return; }
        if (Array.isArray(v)) { v.forEach((x, i) => walk(x, key + '[' + i + ']')); return; }
        if (typeof v === 'object') {
          if (typeof v.en === 'string' || typeof v.fr === 'string') {
            if (v[lang]) out.push({ key, text: v[lang] });
            Object.keys(v).forEach((k) => {
              if (k !== 'en' && k !== 'fr') walk(v[k], key + '.' + k);
            });
            return;
          }
          Object.keys(v).forEach((k) => walk(v[k], key + '.' + k));
        }
      }
      walk(node, node['@id'] || '');
      return out;
    }
    function findItem(list, id) {
      return list.itemListElement.find((it) => it['@id'] === id);
    }
    const bad = [];
    ['longi', 'stw573', 'antecessor', 'naledi'].forEach((id) => {
      if (!findItem(speciesDoc, id)) bad.push(id + ' missing from species.json');
    });
    ['yunxian-longi', 'little-foot', 'thomas-quarry', 'naledi-burial'].forEach((id) => {
      if (!findItem(eventsDoc, id)) bad.push(id + ' missing from events.json');
    });
    if (bad.length) {
      assert(false, `Red-list missing items: ${bad.join('; ')}`);
      return;
    }
    function forbid(id, lang, strings, re, label) {
      strings.forEach(({ key, text }) => {
        if (re.test(text)) bad.push(`${id} ${lang} ${key} contains ${label}`);
      });
    }
    function forbidBareBurial(id, lang, strings) {
      const phrase = lang === 'fr'
        ? /enterrait(?:ent)? (?:leurs|ses) morts|enterraient (?:leurs|ses) morts|ont enterré (?:leurs|ses) morts/i
        : /\bbur(?:y|ied) their dead\b/i;
      const marker = lang === 'fr'
        ? /revendiqu|contest|débat|pas de consensus|non établ|proposent|prétend/i
        : /claim|contest|debat|no consensus|not established|propos|remain contested/i;
      strings.forEach(({ key, text }) => {
        if (phrase.test(text) && !marker.test(text)) {
          bad.push(`${id} ${lang} ${key} states burial in the indicative without a debate marker`);
        }
      });
    }

    ['en', 'fr'].forEach((lang) => {
      const longi = stringsOfLang(findItem(speciesDoc, 'longi'), lang);
      const yunxian = stringsOfLang(findItem(eventsDoc, 'yunxian-longi'), lang);
      const juluEn = /newly discovered species/i;
      const juluFr = /nouvelle espèce découverte/i;
      forbid('longi', lang, longi, lang === 'fr' ? juluFr : juluEn, 'juluensis-as-discovery');
      forbid('yunxian-longi', lang, yunxian, lang === 'fr' ? juluFr : juluEn, 'juluensis-as-discovery');

      const stw = stringsOfLang(findItem(speciesDoc, 'stw573'), lang);
      const littleFoot = stringsOfLang(findItem(eventsDoc, 'little-foot'), lang);
      const thirdEn = /third established species/i;
      const thirdFr = /troisième espèce établie/i;
      forbid('stw573', lang, stw, lang === 'fr' ? thirdFr : thirdEn, 'Little Foot as established species');
      forbid('little-foot', lang, littleFoot, lang === 'fr' ? thirdFr : thirdEn, 'Little Foot as established species');

      const ante = stringsOfLang(findItem(speciesDoc, 'antecessor'), lang);
      const tq = stringsOfLang(findItem(eventsDoc, 'thomas-quarry'), lang);
      const ancEn = /proves the common ancestor/i;
      const ancFr = /prouve l['’]ancêtre commun/i;
      forbid('antecessor', lang, ante, lang === 'fr' ? ancFr : ancEn, 'Thomas Quarry proves ancestor');
      forbid('thomas-quarry', lang, tq, lang === 'fr' ? ancFr : ancEn, 'Thomas Quarry proves ancestor');

      const naledi = stringsOfLang(findItem(speciesDoc, 'naledi'), lang);
      const burial = stringsOfLang(findItem(eventsDoc, 'naledi-burial'), lang);
      forbidBareBurial('naledi', lang, naledi);
      forbidBareBurial('naledi-burial', lang, burial);
    });
    assert(bad.length === 0, `Red-list clean (issues: ${bad.join('; ') || 'none'})`);
  });

  await test('Hot-case provenance fields survive adaptSpecies / adaptEvent and show in the UI', async () => {
    const issues = await page.evaluate(() => {
      const bad = [];
      const speciesIds = ['stw573', 'longi', 'naledi', 'antecessor'];
      speciesIds.forEach((id) => {
        const sp = SPECIES_DATA.find((s) => s.id === id);
        if (!sp) { bad.push(id + ' missing'); return; }
        if (sp['hominin:lastReviewed'] !== '2026-08-30') {
          bad.push(id + ' lastReviewed=' + sp['hominin:lastReviewed']);
        }
      });
      const stw = SPECIES_DATA.find((s) => s.id === 'stw573');
      if (stw && !stw['hominin:taxonomyUncertaintyNote']) bad.push('stw573 missing taxonomyUncertaintyNote');
      const longi = SPECIES_DATA.find((s) => s.id === 'longi');
      if (longi && !longi['hominin:taxonomyUncertaintyNote']) bad.push('longi missing taxonomyUncertaintyNote');
      const naledi = SPECIES_DATA.find((s) => s.id === 'naledi');
      if (naledi && !naledi['hominin:behaviorUncertaintyNote']) bad.push('naledi missing behaviorUncertaintyNote');
      const ante = SPECIES_DATA.find((s) => s.id === 'antecessor');
      if (ante && !ante['hominin:taxonomyUncertaintyNote']) bad.push('antecessor missing taxonomyUncertaintyNote');

      if (stw) {
        renderPanel(stw);
        const notes = document.querySelector('.uncertainty-notes');
        const text = notes ? notes.textContent : '';
        if (!text) bad.push('stw573 panel missing uncertainty-notes');
        if (!/Last reviewed 2026-08-30/.test(text)) bad.push('stw573 panel missing lastReviewed');
        if (stw.debate && text === stw.debate) bad.push('uncertainty notes replaced debate');
      }

      const eventIds = ['little-foot', 'yunxian-longi', 'thomas-quarry', 'naledi-burial'];
      eventIds.forEach((id) => {
        const ev = EVENTS_DATA.find((e) => e.id === id);
        if (!ev) { bad.push(id + ' event missing'); return; }
        if (ev['hominin:lastReviewed'] !== '2026-08-30') {
          bad.push(id + ' event lastReviewed=' + ev['hominin:lastReviewed']);
        }
        if (!ev['hominin:uncertaintyNote']) bad.push(id + ' missing uncertaintyNote');
        const html = eventCertaintyHtml(ev);
        if (!html || html.indexOf(ev['hominin:uncertaintyNote']) === -1) {
          bad.push(id + ' uncertaintyNote not in eventCertaintyHtml');
        }
      });
      return bad;
    });
    assert(issues.length === 0, `Provenance visible (issues: ${issues.join('; ') || 'none'})`);
  });

  await test('Artifact tooltip stays clear of the square events peek', async () => {
    const st = await page.evaluate(() => {
      const peek = document.getElementById('events-peek');
      const tip = document.getElementById('band-tooltip');
      const host = document.getElementById('events-peek-items');
      const ev = EVENTS_DATA.find((e) => e.id === 'art-sulawesi-old') || EVENTS_DATA[0];
      if (!peek || !tip || !host || !ev) return { missing: true };
      const prevPeek = {
        className: peek.className,
        left: peek.style.left,
        top: peek.style.top,
        width: peek.style.width,
        height: peek.style.height,
      };
      const prevHost = host.innerHTML;
      peek.classList.add('is-open');
      peek.style.left = '420px';
      peek.style.top = '620px';
      peek.style.width = '300px';
      peek.style.height = '80px';
      host.innerHTML = '<button type="button" class="events-peek-item" data-event-id="' + ev.id +
        '" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:28px;height:28px"></button>';
      const item = host.querySelector('.events-peek-item');
      tip.classList.remove('band-tooltip--skin', 'band-tooltip--species');
      tip.innerHTML = eventTooltipHtml(ev);
      tip.style.display = 'block';
      positionBandTipNearIcon(item);
      const pr = peek.getBoundingClientRect();
      const tr = tip.getBoundingClientRect();
      const overlap = tr.bottom > pr.top + 0.5 && tr.top < pr.bottom - 0.5 &&
        tr.left < pr.right - 0.5 && tr.right > pr.left + 0.5;
      const caretEl = tip.querySelector('.band-tooltip-caret');
      const caretShown = !!(caretEl && getComputedStyle(caretEl).display !== 'none');
      const peekClass = tip.classList.contains('band-tooltip--peek');
      const caretX = tip.style.getPropertyValue('--peek-caret-x');
      peek.className = prevPeek.className;
      peek.style.left = prevPeek.left;
      peek.style.top = prevPeek.top;
      peek.style.width = prevPeek.width;
      peek.style.height = prevPeek.height;
      host.innerHTML = prevHost;
      tip.style.display = 'none';
      tip.innerHTML = '';
      tip.classList.remove('band-tooltip--peek');
      return {
        missing: false,
        overlap: overlap,
        gap: pr.top - tr.bottom,
        tipH: tr.height,
        peekClass: peekClass,
        caretX: caretX,
        caretShown: caretShown,
      };
    });
    assert(!st.missing, 'peek, tooltip and Sulawesi art event are present');
    assert(!st.overlap, `tooltip must not cover the square loupe (gap ${st.gap}, tipH ${st.tipH})`);
    assert(st.gap >= 6 && st.gap <= 14, `tooltip sits just above the loupe for the linking caret (gap ${st.gap})`);
    assert(st.peekClass, 'tooltip has the peek caret class');
    assert(st.caretShown, 'downward caret is visible under the tooltip');
    assert(!!st.caretX, `caret is aligned to the hovered icon (--peek-caret-x ${st.caretX})`);
  });

  await test('Map pane overflow is hidden so hover popups cannot scroll the layout', async () => {
    const st = await page.evaluate(() => {
      const main = document.getElementById('main');
      const mapEl = document.getElementById('map');
      const wrap = document.querySelector('.map-container');
      const mainCs = main ? getComputedStyle(main) : null;
      const mapCs = mapEl ? getComputedStyle(mapEl) : null;
      const wrapCs = wrap ? getComputedStyle(wrap) : null;
      return {
        mainX: mainCs && mainCs.overflowX,
        mainY: mainCs && mainCs.overflowY,
        mapY: mapCs && mapCs.overflowY,
        wrapY: wrapCs && wrapCs.overflowY,
      };
    });
    assert(st.mainX === 'hidden' && st.mainY === 'hidden',
      `#main overflow is hidden on both axes (got ${st.mainX}/${st.mainY})`);
    assert(st.mapY === 'hidden', `#map overflow-y is hidden (got ${st.mapY})`);
    assert(st.wrapY === 'hidden', `.map-container overflow-y is hidden (got ${st.wrapY})`);
  });

  await test('Map event popup stays compact so neighbouring icons stay visible', async () => {
    const st = await page.evaluate(() => {
      const ev = (EVENTS_DATA || []).find((e) => e.id === 'little-foot');
      const html = typeof mapLibreEventPopupHtml === 'function' ? mapLibreEventPopupHtml(ev) : '';
      const note = ev && ev['hominin:uncertaintyNote'];
      const noteEn = note && typeof note === 'object' ? (note.en || note.fr || '') : String(note || '');
      const source = ev && (ev.source || ev['hominin:dateReference'] || '');
      return {
        hasLabel: /Little Foot|StW 573/i.test(html),
        hasNote: !!(noteEn && html.indexOf(noteEn.slice(0, 28)) !== -1),
        hasReviewed: html.indexOf('Last reviewed') !== -1,
        hasSource: !!(source && html.indexOf(String(source).slice(0, 18)) !== -1),
        hasLongDebate: html.indexOf('Multiple defended positions') !== -1,
      };
    });
    assert(st.hasLabel, 'compact popup still names Little Foot');
    assert(!st.hasNote, 'map popup omits the long uncertainty note');
    assert(!st.hasReviewed, 'map popup omits last-reviewed');
    assert(!st.hasSource, 'map popup omits the full citation');
    assert(!st.hasLongDebate, 'map popup uses the short certainty labels');
  });

  await test('Guided demo is wired to real Homo sapiens catalogue data', async () => {
    const st = await page.evaluate(() => {
      const sapiens = (SPECIES_DATA || []).filter((s) => /^sapiens-/i.test(String(s.id)));
      const ooa = sapiens
        .filter((s) => s.migrations && s.migrations.length)
        .sort((a, b) => a.start - b.start)[0];
      const t0 = sapiens.length ? Math.min.apply(null, sapiens.map((s) => s.start)) : null;
      const t1 = sapiens.length ? Math.max.apply(null, sapiens.map((s) => s.end)) : null;
      const other = /naledi|neanderthal|n[ée]andertal|floresiensis|erectus|denisov|heidelberg|rudolfensis|habilis|georgicus|longi|juluensis|australopith|paranthrop|sahelanthrop|orrorin|ardipith/i;
      const artifacts = (EVENTS_DATA || []).filter((ev) => {
        if (ev.time < t0 || ev.time > t1) return false;
        if (ev.category === 'phylo' || ev.category === 'migration') return false;
        const blob = String(ev.label || '') + ' ' + String(ev.desc || '');
        if (other.test(blob) && !/sapiens/i.test(blob)) return false;
        return true;
      }).sort((a, b) => a.time - b.time);
      return {
        hasController: !!(window.demoController && typeof window.demoController.start === 'function'),
        replay: !!document.getElementById('burger-replay-demo'),
        overlay: !!document.getElementById('demo-overlay'),
        sapiensAfrica: sapiens.some((s) => s.id === 'sapiens-africa'),
        sapiensStart: t0,
        ooaId: ooa && ooa.id,
        firstArtifacts: artifacts.slice(0, 2).map((e) => e.id),
      };
    });
    assert(st.hasController, 'demoController.start is available');
    assert(st.replay, '#burger-replay-demo exists in the burger menu');
    assert(st.overlay, '#demo-overlay exists');
    assert(st.sapiensAfrica, 'catalogue includes sapiens-africa');
    assert(st.sapiensStart === -315000, `Homo sapiens sequence starts at -315000 (got ${st.sapiensStart})`);
    assert(st.ooaId === 'sapiens-levant', `first sapiens migration row is sapiens-levant (got ${st.ooaId})`);
    assert(st.firstArtifacts.length >= 1, 'at least one sapiens artefact exists for the demo');
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
