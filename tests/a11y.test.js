/**
 * ACCESSIBILITY & INTERACTION TESTS — hominines app
 * Checks keyboard nav, touch targets, i18n, ARIA labels, timeline interaction.
 *
 * Run: node tests/a11y.test.js
 * Smoke (faster, fewer cases): node tests/a11y.test.js --smoke
 */

'use strict';
const { launch, loadApp, setTime,
        assert, assertSoft, getStats, resetStats,
        BOLD, CYAN, GREEN, RED, YELLOW, RESET } = require('./utils/harness');

/** @param {{ smoke?: boolean }} [options] — smoke: skip slow / redundant checks (tablet, auto-stop, full i18n sweep) */
async function runA11yTests(options = {}) {
  const smoke = options.smoke === true;
  const errors = [];

  async function test(name, fn) {
    process.stdout.write(`\n  ${CYAN}${name}${RESET}\n`);
    try { await fn(); }
    catch (e) { errors.push({ name, error: e.message }); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ARIA & SEMANTIC HTML
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ ARIA & SEMANTIC HTML${RESET}`);
  const { browser, page } = await launch();
  await loadApp(page);

  await test('Page has <main>, <footer> landmarks (header optional)', async () => {
    const found = await page.evaluate(() => ({
      header: !!document.querySelector('header'),
      main:   !!document.querySelector('main'),
      footer: !!document.querySelector('footer'),
    }));
    assertSoft(found.header, 'Page has <header> (optional; chrome may use burger only)');
    assert(found.main,   'Page has <main>');
    assert(found.footer, 'Page has <footer>');
  });

  await test('Play button has accessible text', async () => {
    const text = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="play-toggle"]');
      return btn ? (btn.textContent || btn.getAttribute('aria-label') || '').trim() : null;
    });
    assert(text && text.length > 0, `Play button has accessible text: "${text}"`);
  });

  await test('Theme toggle button has aria-label', async () => {
    const label = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="theme-toggle"]');
      return btn ? (btn.getAttribute('aria-label') || btn.title || '') : null;
    });
    assert(label && label.length > 0, `Theme toggle has aria-label: "${label}"`);
  });

  await test('Language selector has aria-label', async () => {
    const label = await page.evaluate(() => {
      const sel = document.querySelector('[data-testid="lang-select"]');
      return sel ? (sel.getAttribute('aria-label') || '') : null;
    });
    assert(label && label.length > 0, `Language selector has aria-label: "${label}"`);
  });

  await test('Map container has a role or landmark', async () => {
    const hasRole = await page.evaluate(() => {
      const map = document.getElementById('map');
      return map ? (!!map.getAttribute('role') || !!map.getAttribute('aria-label') || map.tagName === 'MAIN') : false;
    });
    assertSoft(hasRole, 'Map container has ARIA role or label (nice to have)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TOUCH TARGET SIZES (min 44×44px recommended by WCAG)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ TOUCH TARGET SIZES${RESET}`);

  await test('Play button touch target ≥ 32px tall', async () => {
    const h = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="play-toggle"]');
      return btn ? btn.getBoundingClientRect().height : 0;
    });
    assert(h >= 32, `Play button height = ${Math.round(h)}px (expected ≥ 32px)`);
  });

  await test('Timeline scrubber handle ≥ 24px', async () => {
    const size = await page.evaluate(() => {
      const el = document.getElementById('timeline-scrubber');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return Math.min(r.width, r.height);
    });
    assert(size >= 24, `Timeline scrubber is ≥ 24px (got ${Math.round(size)}px)`);
  });

  await test('Layer toggle buttons ≥ 28px tall', async () => {
    const heights = await page.evaluate(() =>
      [...document.querySelectorAll('.layer-btn')].map(btn => btn.getBoundingClientRect().height)
    );
    assert(heights.length > 0, `Found ${heights.length} layer buttons`);
    const small = heights.filter(h => h < 28);
    assertSoft(small.length === 0, `All layer buttons ≥ 28px tall (${small.length} too small)`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TIMELINE INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ TIMELINE INTERACTION${RESET}`);

  await test('setTime(-438000) updates the displayed label', async () => {
    await setTime(page, -438000);
    const label = await page.evaluate(() => {
      const el = document.getElementById('timeline-current-label');
      return el ? el.textContent : null;
    });
    assert(label && label.length > 0, `Time label updated: "${label}"`);
    // Should contain 438 or 400 (log-scale rounding)
    assertSoft(/4[0-9]{2}/.test(label.replace(/\s/g,'')),
      `Time label contains expected value (~438): "${label}"`);
  });

  await test('Timeline needle moves when time changes', async () => {
    await setTime(page, -4100000); // far left
    const leftPos = await page.evaluate(() => {
      const n = document.getElementById('timeline-full-needle');
      return n ? parseFloat(n.style.left || '0') : null;
    });

    await setTime(page, -2000); // far right
    const rightPos = await page.evaluate(() => {
      const n = document.getElementById('timeline-full-needle');
      return n ? parseFloat(n.style.left || '0') : null;
    });

    assert(leftPos !== null && rightPos !== null, 'Needle has left style attribute');
    assert(rightPos > leftPos, `Needle moves right as time increases (${leftPos}px → ${rightPos}px)`);
  });

  await test('getVisibleSpecies() returns array at -438000', async () => {
    await setTime(page, -438000);
    const species = await page.evaluate(() => {
      if (typeof getVisibleSpecies !== 'function') return null;
      return getVisibleSpecies().map(sp => sp.id);
    });
    assert(species !== null, 'getVisibleSpecies() function exists');
    assert(Array.isArray(species) && species.length > 0,
      `getVisibleSpecies() at -438ka returns species: [${species.join(', ')}]`);
    assertSoft(species.some(id => id.includes('erectus')),
      `erectus visible at -438 000 ans (got: ${species.join(', ')})`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PLAY BUTTON
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ PLAY / PAUSE INTERACTION${RESET}`);

  await test('Clicking Play starts playback', async () => {
    await setTime(page, -4100000);
    const playBtn = await page.$('[data-testid="play-toggle"]');
    assert(playBtn !== null, 'Play button found');
    await playBtn.click();
    await page.waitForTimeout(300);

    const isPlaying = await page.evaluate(() => isPlaying);
    assert(isPlaying === true, 'isPlaying === true after clicking Play');

    // Stop it
    await playBtn.click();
    await page.waitForTimeout(150);
  });

  await test('Clicking Pause stops playback', async () => {
    await setTime(page, -4100000);
    const playBtn = await page.$('[data-testid="play-toggle"]');
    await playBtn.click(); // start
    await page.waitForTimeout(200);
    await playBtn.click(); // stop
    await page.waitForTimeout(150);
    const isPlaying = await page.evaluate(() => isPlaying);
    assert(isPlaying === false, 'isPlaying === false after clicking Pause');
  });

  if (!smoke) {
    await test('Play auto-stops at timeline end', async () => {
      await setTime(page, -3000); // near the end
      await page.evaluate(() => { if (typeof startPlay === 'function') startPlay(); });
      await page.waitForTimeout(3000);
      const isPlaying = await page.evaluate(() => isPlaying);
      assertSoft(isPlaying === false, 'Playback auto-stops at timeline end');
      await page.evaluate(() => { if (typeof stopPlay === 'function') stopPlay(); });
    });
  } else {
    console.log(`\n  ${YELLOW}Play auto-stop at end: skipped in smoke mode (timing-sensitive)${RESET}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. THEME TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ THEME TOGGLE${RESET}`);

  await test('Theme toggle switches between dark and light', async () => {
    const found = await page.evaluate(() => !!document.querySelector('[data-testid="theme-toggle"]'));
    assert(found, 'Theme toggle button found');

    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="theme-toggle"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(250);
    const mid = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
    assert(mid !== before, `First click changes theme (${before} → ${mid})`);

    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="theme-toggle"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
    assert(after === before, `Second click restores theme (${mid} → ${after}, expected ${before})`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. I18N — LANGUAGE SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ INTERNATIONALISATION${RESET}`);

  // Mobile tab labels are updated by applyTranslations() for every language.
  const LANG_CHECKS_FULL = [
    { lang: 'en', key: '#tab-map span', contains: 'Map' },
    { lang: 'es', key: '#tab-map span', contains: 'Mapa' },
    { lang: 'de', key: '#tab-map span', contains: 'Karte' },
    { lang: 'zh', key: '#tab-map span', contains: '地图' },
    { lang: 'ar', key: '#tab-map span', contains: 'خريطة' },
    { lang: 'fr', key: '#tab-map span', contains: 'Carte' },
  ];
  const LANG_CHECKS = smoke
    ? [
        { lang: 'en', key: '#tab-map span', contains: 'Map' },
        { lang: 'fr', key: '#tab-map span', contains: 'Carte' },
      ]
    : LANG_CHECKS_FULL;

  for (const { lang, key, contains } of LANG_CHECKS) {
    await test(`i18n: switching to '${lang}' updates UI text`, async () => {
      await page.evaluate((l) => {
        const sel = document.querySelector('[data-testid="lang-select"]');
        if (sel) { sel.value = l; sel.dispatchEvent(new Event('change')); }
      }, lang);
      await page.waitForTimeout(300);
      const text = await page.evaluate((k) => {
        const el = document.querySelector(k);
        return el ? el.textContent.trim() : null;
      }, key);
      assert(text !== null, `Element "${key}" found`);
      assertSoft(text.toLowerCase().includes(contains.toLowerCase()),
        `"${key}" in ${lang} contains "${contains}" (got: "${text}")`);
    });
  }

  if (!smoke) {
    await test('Arabic (ar) sets dir=rtl on <html>', async () => {
      await page.evaluate(() => {
        const sel = document.querySelector('[data-testid="lang-select"]');
        if (sel) { sel.value = 'ar'; sel.dispatchEvent(new Event('change')); }
      });
      await page.waitForTimeout(300);
      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      assertSoft(dir === 'rtl', `Arabic sets dir="rtl" (got: "${dir}")`);
    });
  } else {
    console.log(`\n  ${YELLOW}Arabic dir=rtl: skipped in smoke mode${RESET}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TABLET VIEWPORT (768×1024)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ TABLET VIEWPORT (768×1024)${RESET}`);

  await browser.close();

  if (!smoke) {
    const { browser: b2, page: p2 } = await launch({ mobile: true });
    await loadApp(p2);

    await test('App renders without horizontal overflow on tablet', async () => {
      const overflow = await p2.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth + 5;
      });
      assertSoft(!overflow, 'No horizontal overflow on tablet viewport');
    });

    await test('Timeline is visible on tablet', async () => {
      const visible = await p2.evaluate(() => {
        const tl = document.querySelector('[data-testid="timeline"]');
        if (!tl) return false;
        const r = tl.getBoundingClientRect();
        return r.height > 0 && r.width > 0;
      });
      assert(visible, 'Timeline footer is visible on 768px viewport');
    });

    await test('Play button is visible and tappable on tablet', async () => {
      const size = await p2.evaluate(() => {
        const btn = document.querySelector('[data-testid="play-toggle"]');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
      assert(size !== null, 'Play button found on tablet');
      assert(size.h >= 32, `Play button height ${Math.round(size.h)}px ≥ 32px on tablet`);
    });

    await b2.close();
  } else {
    console.log(`  ${YELLOW}skipped in smoke mode (second browser / viewport)${RESET}`);
  }

  return errors;
}

// ─── entry point ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const smokeCli = process.argv.includes('--smoke');
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  HOMININES — ACCESSIBILITY & INTERACTION TESTS${smokeCli ? ' [SMOKE]' : ''}${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════${RESET}`);

  runA11yTests({ smoke: smokeCli }).then(errors => {
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

module.exports = { runA11yTests };
