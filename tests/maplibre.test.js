/**
 * MAPLIBRE TESTS — feature-flagged map engine checks.
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
  await page.goto(`${base}/index.html?map=maplibre`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__mapLibreMap && window.__mapLibreMap.isStyleLoaded(), { timeout: 20000 });
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

  await test('MapLibre mode initializes without Leaflet map instance', async () => {
    const state = await page.evaluate(() => ({
      hasMapLibre: !!window.__mapLibreMap,
      hasLeafletMap: typeof leafletMap !== 'undefined' && !!leafletMap,
      mapClass: document.getElementById('map') ? document.getElementById('map').className : '',
    }));
    assert(state.hasMapLibre, 'MapLibre map instance is exposed for tests');
    assert(!state.hasLeafletMap, 'Leaflet map instance is not created in MapLibre mode');
    assert(String(state.mapClass).includes('maplibregl-map'), 'Map container has MapLibre class');
  });

  await test('MapLibre sources and layers receive app data', async () => {
    const data = await page.evaluate(async () => {
      setTime(-438000);
      await new Promise(resolve => setTimeout(resolve, 350));
      const map = window.__mapLibreMap;
      function featureCount(sourceId) {
        const source = map.getSource(sourceId);
        return source && source._data && Array.isArray(source._data.features)
          ? source._data.features.length
          : 0;
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
