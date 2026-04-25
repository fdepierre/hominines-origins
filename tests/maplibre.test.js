/**
 * MAPLIBRE TESTS — default map engine checks.
 *
 * Run: node tests/maplibre.test.js
 */

'use strict';
const {
  launch, startAppHttpServer,
  assert, getStats, resetStats,
  BOLD, CYAN, GREEN, RED, YELLOW, RESET,
} = require('./utils/harness');

async function loadMapLibreApp(page) {
  const base = await startAppHttpServer();
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__mapLibreMap && window.__mapLibreMap.isStyleLoaded(), { timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-map-ready') === '1', { timeout: 20000 });
  await page.waitForFunction(() => (
    typeof SPECIES_DATA !== 'undefined' &&
    typeof EVENTS_DATA !== 'undefined' &&
    typeof updateMapLibre === 'function'
  ), { timeout: 10000 });
  await page.evaluate(() => {
    const overlay = document.getElementById('welcome-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
    }
    try { localStorage.setItem('ho_welcomed_v3', '1'); } catch (e) { /* ignore */ }
  });
  await page.waitForTimeout(300);
}

async function runMapLibreTests() {
  const errors = [];

  async function test(name, fn) {
    process.stdout.write(`\n  ${CYAN}${name}${RESET}\n`);
    try { await fn(); }
    catch (e) { errors.push({ name, error: e.message }); }
  }

  console.log(`\n${BOLD}◆ MAPLIBRE ENGINE${RESET}`);
  const { browser, page } = await launch({ width: 1440, height: 900 });
  await loadMapLibreApp(page);

  await test('MapLibre initializes as the only map engine', async () => {
    const state = await page.evaluate(() => ({
      hasMapLibre: !!window.__mapLibreMap,
      mapClass: document.getElementById('map') ? document.getElementById('map').className : '',
      minZoom: window.__mapLibreMap ? window.__mapLibreMap.getMinZoom() : null,
      mapReady: document.documentElement.getAttribute('data-map-ready'),
    }));
    assert(state.hasMapLibre, 'MapLibre map instance is exposed for tests');
    assert(String(state.mapClass).includes('maplibregl-map'), 'Map container has MapLibre class');
    assert(state.minZoom <= 0.5, `MapLibre can zoom out to a full-world view (minZoom ${state.minZoom})`);
    assert(state.mapReady === '1', 'Map is revealed only after the neutral MapLibre style is applied');
  });

  await test('MapLibre play starts from a wide world view on desktop and mobile', async () => {
    const desktop = await page.evaluate(async () => {
      resetMapToWorldView();
      await new Promise(resolve => setTimeout(resolve, 520));
      return window.__mapLibreMap.getZoom();
    });
    assert(desktop <= 1.25, `Desktop world view is wide enough for intercontinental migrations (zoom ${desktop.toFixed(2)})`);

    const { browser: mobileBrowser, page: mobilePage } = await launch({ width: 390, height: 844 });
    try {
      await loadMapLibreApp(mobilePage);
      const mobile = await mobilePage.evaluate(async () => {
        startPlay();
        await new Promise(resolve => setTimeout(resolve, 620));
        setTime(-65000);
        await new Promise(resolve => setTimeout(resolve, 620));
        stopPlay();
        return window.__mapLibreMap.getZoom();
      });
      assert(mobile <= 0.85, `Mobile play world view stays wide after timeline changes (zoom ${mobile.toFixed(2)})`);
    } finally {
      await mobileBrowser.close();
    }
  });

  await test('Returning visitors keep the standard welcome overlay until the readable map is ready', async () => {
    const { browser: returningBrowser, page: returningPage } = await launch({ width: 1440, height: 900 });
    try {
      await returningPage.addInitScript(() => {
        localStorage.setItem('ho_welcomed_v3', '1');
      });
      const base = await startAppHttpServer();
      await returningPage.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
      const initial = await returningPage.evaluate(() => {
        const overlay = document.getElementById('welcome-modal-overlay');
        return {
          hidden: overlay ? overlay.classList.contains('hidden') : true,
          transient: overlay ? overlay.classList.contains('welcome-modal-transient') : false,
          startVisible: !!document.getElementById('welcome-start-btn') && getComputedStyle(document.getElementById('welcome-start-btn')).display !== 'none',
          mapFilter: getComputedStyle(document.getElementById('map')).filter,
          mapOpacity: getComputedStyle(document.getElementById('map')).opacity,
          mapReady: document.documentElement.getAttribute('data-map-ready'),
        };
      });
      assert(!initial.hidden, 'Returning visitor overlay is visible while the map is being prepared');
      assert(!initial.transient, 'Returning visitor overlay uses the standard welcome modal');
      assert(initial.startVisible, 'Standard welcome modal keeps its start button visible');
      assert(String(initial.mapFilter).includes('blur'), 'Map is blurred while the readable style is being prepared');
      assert(Number(initial.mapOpacity) === 0, 'Initial MapLibre colours are fully hidden while the readable style is being prepared');
      await returningPage.waitForFunction(() => document.documentElement.getAttribute('data-map-ready') === '1', { timeout: 20000 });
      await returningPage.waitForTimeout(1200);
      const afterReady = await returningPage.evaluate(() => {
        const overlay = document.getElementById('welcome-modal-overlay');
        return {
          hidden: overlay ? overlay.classList.contains('hidden') : false,
          mapFilter: getComputedStyle(document.getElementById('map')).filter,
          mapOpacity: getComputedStyle(document.getElementById('map')).opacity,
        };
      });
      assert(afterReady.hidden, 'Returning visitor overlay auto-hides after the readable map is ready');
      assert(afterReady.mapFilter === 'none', 'Map blur is removed after the readable style is ready');
      assert(Number(afterReady.mapOpacity) === 1, 'Map is visible after the readable style is ready');
    } finally {
      await returningBrowser.close();
    }
  });

  await test('MapLibre sources and layers receive app data', async () => {
    const data = await page.evaluate(async () => {
      setTime(-438000);
      updateMapLibre();
      const map = window.__mapLibreMap;
      function featureCount(sourceId) {
        const source = map.getSource(sourceId);
        return source && source._data && Array.isArray(source._data.features)
          ? source._data.features.length
          : 0;
      }
      const start = Date.now();
      while (
        (
          featureCount('hominine-ranges') === 0 ||
          featureCount('hominine-migrations') === 0 ||
          featureCount('hominine-sites') === 0 ||
          featureCount('hominine-events') === 0
        ) &&
        Date.now() - start < 1800
      ) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return {
        hasRangesLayer: !!map.getLayer('hominine-ranges-fill'),
        hasMigrationsLayer: !!map.getLayer('hominine-migrations'),
        hasSitesLayer: !!map.getLayer('hominine-sites'),
        hasEventsLayer: !!map.getLayer('hominine-events-halo'),
        rangeCount: featureCount('hominine-ranges'),
        migrationCount: featureCount('hominine-migrations'),
        siteCount: featureCount('hominine-sites'),
        eventCount: featureCount('hominine-events'),
        eventMarkerCount: document.querySelectorAll('.maplibre-event-marker').length,
        migrationCueCount: document.querySelectorAll('.maplibre-migration-cue').length,
        migrationArrowCount: document.querySelectorAll('.maplibre-migration-cue-arrow').length,
        migrationDotCount: document.querySelectorAll('.maplibre-migration-cue-dot').length,
      };
    });
    assert(data.hasRangesLayer, 'Species ranges layer exists');
    assert(data.hasMigrationsLayer, 'Migration paths layer exists');
    assert(data.hasSitesLayer, 'Fossil sites layer exists');
    assert(data.hasEventsLayer, 'Events halo layer exists');
    assert(data.rangeCount > 0, `Range source has features (${data.rangeCount})`);
    assert(data.migrationCount > 0, `Migration source has features (${data.migrationCount})`);
    assert(data.siteCount > 0, `Site source has features (${data.siteCount})`);
    assert(data.eventCount > 0, `Event source has features (${data.eventCount})`);
    assert(data.eventMarkerCount > 0, `Event HTML markers rendered (${data.eventMarkerCount})`);
    assert(data.migrationCueCount > 0, `Migration cue markers rendered (${data.migrationCueCount})`);
    assert(data.migrationArrowCount > 0, `Migration arrow markers rendered (${data.migrationArrowCount})`);
    assert(data.migrationDotCount > 0, `Migration endpoint markers rendered (${data.migrationDotCount})`);
  });

  await test('MapLibre neutral basemap hides geolines and native country labels', async () => {
    const paint = await page.evaluate(() => {
      const map = window.__mapLibreMap;
      return {
        geolinesOpacity: map.getPaintProperty('geolines', 'line-opacity'),
        geolinesLabelOpacity: map.getPaintProperty('geolines-label', 'text-opacity'),
        countriesLabelOpacity: map.getPaintProperty('countries-label', 'text-opacity'),
      };
    });
    assert(paint.geolinesOpacity === 0, 'Equator/tropic geolines are hidden');
    assert(paint.geolinesLabelOpacity === 0, 'Equator/tropic labels are hidden');
    assert(paint.countriesLabelOpacity === 0, 'Native country labels are hidden');
  });

  await test('MapLibre labels use app-managed continent and country names', async () => {
    const labels = await page.evaluate(async () => {
      localStorage.setItem('ho_ui_lang', 'fr');
      const map = window.__mapLibreMap;
      map.jumpTo({ zoom: 1.6, center: [20, 20] });
      updateMapLibreLabels();
      await new Promise(resolve => setTimeout(resolve, 250));
      function domLabels(selector) {
        return [...document.querySelectorAll(selector)].map(el => ({
          text: el.textContent.trim(),
          lang: el.getAttribute('lang'),
          dir: el.getAttribute('dir'),
        }));
      }
      const continentLabels = domLabels('.continent-label-marker');
      map.jumpTo({ zoom: 4, center: [90, 25] });
      updateMapLibreLabels();
      await new Promise(resolve => setTimeout(resolve, 50));
      const countryLabels = domLabels('.country-label-marker');
      return {
        hasNativeCountryLabels: !!map.getLayer('countries-label'),
        nativeCountryOpacity: map.getPaintProperty('countries-label', 'text-opacity'),
        hasMapLibreLabelSource: !!map.getSource('hominine-map-labels'),
        continentTexts: continentLabels.map(l => l.text),
        continentLangs: [...new Set(continentLabels.map(l => l.lang))],
        continentDirs: [...new Set(continentLabels.map(l => l.dir))],
        countryTexts: countryLabels.map(l => l.text),
        countryLangs: [...new Set(countryLabels.map(l => l.lang))],
      };
    });
    assert(labels.hasNativeCountryLabels, 'Native MapLibre country label layer exists');
    assert(labels.nativeCountryOpacity === 0, 'Native MapLibre country labels are hidden');
    assert(!labels.hasMapLibreLabelSource, 'App-managed MapLibre labels are DOM markers, not canvas text');
    assert(labels.continentTexts.includes('Asie'), 'French continent label is present');
    assert(labels.continentLangs.includes('fr'), 'Continent labels expose lang for browser translation');
    assert(labels.continentDirs.includes('auto'), 'Continent labels expose dir=auto');
    assert(labels.countryTexts.includes('Chine'), 'French country label is present');
    assert(labels.countryLangs.includes('fr'), 'Country labels expose lang for browser translation');
  });

  await test('MapLibre play renders walking hominins on migration paths', async () => {
    const result = await page.evaluate(async () => {
      stopPlay();
      Object.keys(speciesFigures).forEach(id => {
        const entry = speciesFigures[id];
        if (entry && entry.raf) cancelAnimationFrame(entry.raf);
        if (entry && entry.marker) entry.marker.remove();
        delete speciesFigures[id];
      });
      mapLibreFigureMarkers.forEach(marker => marker.remove());
      mapLibreFigureMarkers.clear();
      setTime(-438000);
      startPlay();
      await new Promise(resolve => setTimeout(resolve, 900));
      const firstMarker = mapLibreFigureMarkers.values().next().value;
      const firstPos = firstMarker && firstMarker.getLngLat ? firstMarker.getLngLat() : null;
      await new Promise(resolve => setTimeout(resolve, 700));
      const secondPos = firstMarker && firstMarker.getLngLat ? firstMarker.getLngLat() : null;
      stopPlay();
      return {
        figureCount: document.querySelectorAll('.maplibre-walking-figure').length,
        trackedCount: mapLibreFigureMarkers.size,
        moved: !!(firstPos && secondPos && (
          Math.abs(firstPos.lng - secondPos.lng) > 0.0001 ||
          Math.abs(firstPos.lat - secondPos.lat) > 0.0001
        )),
      };
    });
    assert(result.figureCount > 0, `MapLibre walking figures rendered (${result.figureCount})`);
    assert(result.trackedCount > 0, `MapLibre figure markers are tracked (${result.trackedCount})`);
    assert(result.moved, 'At least one MapLibre figure moves along a migration path during play');
  });

  await test('Timeline event click creates an immediately pulsing MapLibre marker', async () => {
    const result = await page.evaluate(async () => {
      mapLibreEventMarkers.forEach(marker => marker.remove());
      mapLibreEventMarkers.clear();
      const markers = [...document.querySelectorAll('#events-band-track .event-marker')];
      const target = markers[markers.length - 1];
      if (!target) return { hasTimelineMarker: false };
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
      await new Promise(resolve => setTimeout(resolve, 120));
      const mapMarker = document.querySelector('.maplibre-event-marker.event-map-marker-pulse');
      const inner = mapMarker && mapMarker.querySelector('.maplibre-event-marker-inner');
      return {
        hasTimelineMarker: true,
        hasMapMarker: !!mapMarker,
        outerInlineTransform: mapMarker ? mapMarker.style.transform : '',
        innerAnimation: inner ? getComputedStyle(inner).animationName : '',
      };
    });
    assert(result.hasTimelineMarker, 'Timeline event marker exists');
    assert(result.hasMapMarker, 'MapLibre event marker exists shortly after click');
    assert(String(result.outerInlineTransform).includes('translate'), 'MapLibre keeps marker positioning transform');
    assert(result.innerAnimation === 'eventMapMarkerPulse', 'Pulse animation runs on the internal marker element');
  });

  await browser.close();
  return errors;
}

if (require.main === module) {
  resetStats();
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  HOMININES — MAPLIBRE TESTS${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);

  runMapLibreTests().then(errors => {
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

module.exports = { runMapLibreTests };
