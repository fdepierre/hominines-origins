/**
 * ACCESSIBILITY & INTERACTION TESTS — hominines app
 * Checks keyboard nav, touch targets, i18n, ARIA labels, timeline interaction.
 *
 * Run: node tests/a11y.test.js
 * Smoke (faster, fewer cases): node tests/a11y.test.js --smoke — skips tablet,
 * Play auto-stop-at-end, dir=ltr sweep, Playwright welcome-locale, and
 * close-button / layer-title i18n checks.
 */

'use strict';
const { launch, loadApp, setTime,
        assert, assertSoft, getStats, resetStats,
        BOLD, CYAN, GREEN, RED, YELLOW, RESET } = require('./utils/harness');

/** @param {{ smoke?: boolean }} [options] — smoke: skip tablet, timing-sensitive play test, dir=ltr, welcome-locale, close-button i18n */
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

  await test('Theme toggle button has accessible name', async () => {
    const label = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="theme-toggle"]');
      if (!btn) return '';
      const sub = btn.querySelector('span');
      const subT = sub ? (sub.textContent || '').trim() : '';
      return (btn.getAttribute('aria-label') || btn.title || subT).trim();
    });
    assert(label && label.length > 0, `Theme toggle has accessible name: "${label}"`);
    assert(!label.includes('ui.ui.'), `Theme title must not double-prefix i18n keys (got "${label}")`);
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
    await test('Layout direction stays LTR for bundled locales (fr/en)', async () => {
      await page.evaluate(() => {
        const sel = document.querySelector('[data-testid="lang-select"]');
        if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change')); }
      });
      await page.waitForTimeout(200);
      const dirEn = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      await page.evaluate(() => {
        const sel = document.querySelector('[data-testid="lang-select"]');
        if (sel) { sel.value = 'fr'; sel.dispatchEvent(new Event('change')); }
      });
      await page.waitForTimeout(200);
      const dirFr = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      assertSoft(dirEn === 'ltr' && dirFr === 'ltr', `html dir stays ltr for en/fr (got en="${dirEn}", fr="${dirFr}")`);
    });

    await test('Country labels follow the selected language', async () => {
      await page.evaluate(() => {
        const sel = document.querySelector('[data-testid="lang-select"]');
        if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(450);
      const en = await page.evaluate(() => {
        const label = document.querySelector('.country-label-marker[data-country-code="CN"]');
        const tileUrls = [];
        if (typeof leafletMap !== 'undefined' && leafletMap) {
          leafletMap.eachLayer((layer) => { if (layer && layer._url) tileUrls.push(layer._url); });
        }
        return { text: label ? label.textContent.trim() : '', tileUrls };
      });
      await page.evaluate(() => {
        const sel = document.querySelector('[data-testid="lang-select"]');
        if (sel) { sel.value = 'fr'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(450);
      const fr = await page.evaluate(() => {
        const label = document.querySelector('.country-label-marker[data-country-code="CN"]');
        return label ? label.textContent.trim() : '';
      });
      assert(en.text === 'China', `Country label for CN in EN is "China" (got "${en.text}")`);
      assert(fr === 'Chine', `Country label for CN in FR is "Chine" (got "${fr}")`);
      assert(!en.tileUrls.some((url) => /only_labels/.test(url)), 'CARTO only_labels raster layer is not used for country names');
    });

    for (const locale of ['zh-CN', 'ar-EG', 'ja-JP']) {
      await test(`Country labels use browser locale for ${locale}`, async () => {
        const { browser: bCountry, page: pCountry } = await launch({ locale });
        try {
          await loadApp(pCountry);
          const st = await pCountry.evaluate(() => {
            const label = document.querySelector('.country-label-marker[data-country-code="CN"]');
            const expected = new Intl.DisplayNames([navigator.language], { type: 'region' }).of('CN');
            return {
              nav: navigator.language,
              htmlLang: document.documentElement.lang,
              text: label ? label.textContent.trim() : '',
              labelLang: label ? label.getAttribute('lang') : '',
              labelDir: label ? label.getAttribute('dir') : '',
              expected,
            };
          });
          assert(st.nav.toLowerCase().startsWith(locale.toLowerCase().slice(0, 2)), `navigator.language is ${locale} (got "${st.nav}")`);
          assert(st.htmlLang === 'en', `${locale} keeps app UI in EN (got "${st.htmlLang}")`);
          assert(st.text === st.expected, `${locale} country label follows browser locale (got "${st.text}", expected "${st.expected}")`);
          assert(st.labelLang.toLowerCase().startsWith(locale.toLowerCase().slice(0, 2)), `${locale} country label lang attribute follows browser locale (got "${st.labelLang}")`);
          assert(st.labelDir === 'auto', `${locale} country label uses dir="auto" (got "${st.labelDir}")`);
        } finally {
          await bCountry.close();
        }
      });
    }
  } else {
    console.log(`\n  ${YELLOW}dir=ltr check: skipped in smoke mode${RESET}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6b. WELCOME MODAL — Playwright `locale` simulates non-FR/EN browser UI
  // ═══════════════════════════════════════════════════════════════════════════
  if (!smoke) {
    console.log(`\n${BOLD}◆ WELCOME / BROWSER LOCALE (Playwright)${RESET}`);

    await test('Welcome locale: es-ES defaults to EN and suggests browser translate', async () => {
      const { browser: bEs, page: pEs } = await launch({ locale: 'es-ES' });
      try {
        await loadApp(pEs, { dismissWelcome: false });
        const st = await pEs.evaluate(() => {
          const hint = document.getElementById('welcome-translate-hint');
          const panel = document.getElementById('welcome-lang-panel');
          const overlay = document.getElementById('welcome-modal-overlay');
          const sel = document.getElementById('lang-select');
          const open = !!(overlay && !overlay.classList.contains('hidden'));
          return {
            nav: navigator.language,
            htmlLang: document.documentElement.lang,
            selectorValue: sel ? sel.value : '',
            hintHtml: hint ? hint.innerHTML : '',
            hintPanelVisible: !!(panel && !panel.hidden),
            welcomeOpen: open,
            hintTextLen: hint ? (hint.textContent || '').trim().length : 0,
            welcomeFrBtn: !!document.getElementById('welcome-pick-fr'),
            welcomeEnBtn: !!document.getElementById('welcome-pick-en'),
          };
        });
        assert(st.welcomeOpen, 'Welcome overlay is visible on first load (fresh storage)');
        assert(/^es/i.test(st.nav), `navigator.language is es-* (got "${st.nav}")`);
        assert(st.htmlLang === 'en', `Unsupported browser locale defaults page to EN (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'en', `Burger language selector defaults to EN (got "${st.selectorValue}")`);
        assert(st.hintPanelVisible, 'Unsupported locale shows browser-translate hint panel');
        assert(
          /<\s*code(?:\s[^>]*)?>\s*es\s*<\s*\/\s*code\s*>/i.test(st.hintHtml),
          `Hint includes <code…>es</code> (Chromium may add classes; got: ${JSON.stringify(st.hintHtml.slice(0, 240))})`
        );
        assert(st.hintHtml.includes('Translate this page'), 'Hint mentions Translate this page');
        assert(st.hintTextLen > 80, `Hint text is substantive (length ${st.hintTextLen})`);
        assert(!st.welcomeFrBtn && !st.welcomeEnBtn, 'Welcome screen has no language-choice buttons');
      } finally {
        await bEs.close();
      }
    });

    await test('Welcome locale: fr-FR auto-selects FR without language buttons', async () => {
      const { browser: bFr, page: pFr } = await launch({ locale: 'fr-FR' });
      try {
        await loadApp(pFr, { dismissWelcome: false });
        const st = await pFr.evaluate(() => {
          const hint = document.getElementById('welcome-translate-hint');
          const panel = document.getElementById('welcome-lang-panel');
          const overlay = document.getElementById('welcome-modal-overlay');
          const sel = document.getElementById('lang-select');
          return {
            nav: navigator.language,
            htmlLang: document.documentElement.lang,
            selectorValue: sel ? sel.value : '',
            hintHtml: hint ? hint.innerHTML : '',
            hintPanelVisible: !!(panel && !panel.hidden),
            welcomeOpen: !!(overlay && !overlay.classList.contains('hidden')),
            welcomeFrBtn: !!document.getElementById('welcome-pick-fr'),
            welcomeEnBtn: !!document.getElementById('welcome-pick-en'),
          };
        });
        assert(st.welcomeOpen, 'Welcome overlay is visible on first load');
        assert(/^fr/i.test(st.nav), `navigator.language is fr-* (got "${st.nav}")`);
        assert(st.htmlLang === 'fr', `FR browser locale selects FR (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'fr', `Burger language selector selects FR (got "${st.selectorValue}")`);
        assert(!st.hintPanelVisible, 'FR locale does not show translation hint panel');
        assert(st.hintHtml === '', 'FR locale has no translate hint copy');
        assert(!st.welcomeFrBtn && !st.welcomeEnBtn, 'Welcome screen has no language-choice buttons');
      } finally {
        await bFr.close();
      }
    });

    await test('Welcome locale: en-GB auto-selects EN without language buttons', async () => {
      const { browser: bEn, page: pEn } = await launch({ locale: 'en-GB' });
      try {
        await loadApp(pEn, { dismissWelcome: false });
        const st = await pEn.evaluate(() => {
          const hint = document.getElementById('welcome-translate-hint');
          const panel = document.getElementById('welcome-lang-panel');
          const overlay = document.getElementById('welcome-modal-overlay');
          const sel = document.getElementById('lang-select');
          return {
            nav: navigator.language,
            htmlLang: document.documentElement.lang,
            selectorValue: sel ? sel.value : '',
            hintHtml: hint ? hint.innerHTML : '',
            hintPanelVisible: !!(panel && !panel.hidden),
            welcomeOpen: !!(overlay && !overlay.classList.contains('hidden')),
            welcomeFrBtn: !!document.getElementById('welcome-pick-fr'),
            welcomeEnBtn: !!document.getElementById('welcome-pick-en'),
          };
        });
        assert(st.welcomeOpen, 'Welcome overlay is visible on first load');
        assert(/^en/i.test(st.nav), `navigator.language is en-* (got "${st.nav}")`);
        assert(st.htmlLang === 'en', `EN browser locale selects EN (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'en', `Burger language selector selects EN (got "${st.selectorValue}")`);
        assert(!st.hintPanelVisible, 'EN locale does not show translation hint panel');
        assert(st.hintHtml === '', 'EN locale has no translate hint copy');
        assert(!st.welcomeFrBtn && !st.welcomeEnBtn, 'Welcome screen has no language-choice buttons');
      } finally {
        await bEn.close();
      }
    });

    await test('Welcome locale: fr-CA auto-selects FR', async () => {
      const { browser: bFrCa, page: pFrCa } = await launch({ locale: 'fr-CA' });
      try {
        await loadApp(pFrCa, { dismissWelcome: false });
        const st = await pFrCa.evaluate(() => ({
          nav: navigator.language,
          htmlLang: document.documentElement.lang,
          selectorValue: document.getElementById('lang-select')?.value || '',
          i18nPending: document.documentElement.hasAttribute('data-i18n-pending'),
        }));
        assert(/^fr-CA/i.test(st.nav), `navigator.language is fr-CA (got "${st.nav}")`);
        assert(st.htmlLang === 'fr', `fr-CA browser locale selects FR (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'fr', `Burger language selector selects FR (got "${st.selectorValue}")`);
        assert(!st.i18nPending, 'Initial i18n paint guard is removed after translations apply');
      } finally {
        await bFrCa.close();
      }
    });

    for (const locale of ['it-IT', 'de-DE']) {
      await test(`Welcome locale: ${locale} defaults to EN`, async () => {
        const { browser: bOther, page: pOther } = await launch({ locale });
        try {
          await loadApp(pOther, { dismissWelcome: false });
          const st = await pOther.evaluate(() => {
            const hint = document.getElementById('welcome-translate-hint');
            const panel = document.getElementById('welcome-lang-panel');
            return {
              nav: navigator.language,
              htmlLang: document.documentElement.lang,
              selectorValue: document.getElementById('lang-select')?.value || '',
              hintText: hint ? hint.textContent || '' : '',
              hintPanelVisible: !!(panel && !panel.hidden),
            };
          });
          assert(st.nav.toLowerCase().startsWith(locale.toLowerCase().slice(0, 2)), `navigator.language is ${locale} (got "${st.nav}")`);
          assert(st.htmlLang === 'en', `${locale} browser locale defaults to EN (got "${st.htmlLang}")`);
          assert(st.selectorValue === 'en', `Burger language selector defaults to EN (got "${st.selectorValue}")`);
          assert(st.hintPanelVisible, `${locale} shows browser-translate hint panel`);
          assert(st.hintText.includes('Translate this page'), `${locale} hint mentions Translate this page`);
        } finally {
          await bOther.close();
        }
      });
    }

    await test('Manual language switch persists and overrides browser locale', async () => {
      const { browser: bManual, page: pManual } = await launch({ locale: 'fr-FR' });
      try {
        await loadApp(pManual);
        await pManual.evaluate(() => {
          const sel = document.getElementById('lang-select');
          if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        await pManual.waitForTimeout(450);
        await loadApp(pManual);
        const st = await pManual.evaluate(() => ({
          nav: navigator.language,
          stored: localStorage.getItem('ho_ui_lang'),
          htmlLang: document.documentElement.lang,
          selectorValue: document.getElementById('lang-select')?.value || '',
        }));
        assert(/^fr/i.test(st.nav), `navigator.language remains fr-* (got "${st.nav}")`);
        assert(st.stored === 'en', `Manual EN preference persisted (got "${st.stored}")`);
        assert(st.htmlLang === 'en', `Stored manual preference overrides browser FR after reload (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'en', `Burger language selector reflects stored EN (got "${st.selectorValue}")`);
      } finally {
        await bManual.close();
      }
    });
  } else {
    console.log(`\n  ${YELLOW}Welcome locale (Playwright): skipped in smoke mode${RESET}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6c. CLOSE BUTTONS (sr-only) + LAYER TITLE I18N (regression for ui.ui.*)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!smoke) {
    console.log(`\n${BOLD}◆ CLOSE BUTTONS & I18N TITLES${RESET}`);

    await test('Burger + JSON drawer close: sr-only label follows en/fr', async () => {
      await page.evaluate(() => {
        const sel = document.getElementById('lang-select');
        if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(450);
      const enMenuOpen = await page.evaluate(() => {
        const el = document.querySelector('#burger-btn .sr-only');
        return el ? el.textContent.trim() : '';
      });
      assert(enMenuOpen === 'Menu', `Burger open sr-only (en): "${enMenuOpen}"`);
      await page.click('[data-testid="burger-menu-button"]');
      await page.waitForSelector('#burger-panel.open', { timeout: 4000 });
      const enClose = await page.evaluate(() => {
        const sr = document.querySelector('#burger-close .sr-only');
        return sr ? sr.textContent.trim() : '';
      });
      assert(enClose === 'Close', `Burger close sr-only (en): "${enClose}"`);

      await page.click('[data-testid="burger-close"]');
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const sel = document.getElementById('lang-select');
        if (sel) { sel.value = 'fr'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(450);
      await page.click('[data-testid="burger-menu-button"]');
      await page.waitForSelector('#burger-panel.open', { timeout: 4000 });
      const frBurger = await page.evaluate(() => {
        const sr = document.querySelector('#burger-close .sr-only');
        return sr ? sr.textContent.trim() : '';
      });
      assert(frBurger === 'Fermer', `Burger close sr-only (fr): "${frBurger}"`);

      await page.click('#btn-data-viewer');
      await page.waitForSelector('.data-viewer-drawer.open', { timeout: 4000 });
      const frJson = await page.evaluate(() => {
        const sr = document.querySelector('#btn-close-data-viewer .sr-only');
        return sr ? sr.textContent.trim() : '';
      });
      assert(frJson === 'Fermer', `JSON drawer close sr-only (fr): "${frJson}"`);
      await page.click('[data-testid="close-data-viewer"]');
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    });

    await test('Map layer button titles are localized (no broken ui.ui.* key)', async () => {
      const sitesTitle = await page.evaluate(() => {
        const el = document.querySelector('.layer-btn[data-layer="sites"]');
        return el ? el.title : '';
      });
      assert(sitesTitle && !sitesTitle.includes('ui.ui.'), `Sites layer title: "${sitesTitle}"`);
      assert(/fossil|site|fósil|Afficher|Mostrar|masquer|ocultar/i.test(sitesTitle),
        `Sites layer title looks localized: "${sitesTitle}"`);
    });
  } else {
    console.log(`\n  ${YELLOW}Close-button / layer-title checks: skipped in smoke mode${RESET}`);
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

    await test('Play control is visible and tappable on tablet (bottom bar when ≤768px)', async () => {
      const size = await p2.evaluate(() => {
        const desktop = document.querySelector('[data-testid="play-toggle"]');
        const mobile = document.getElementById('mobile-play-btn');
        const useDesktop = desktop && (function () {
          const s = window.getComputedStyle(desktop);
          return s.display !== 'none' && s.visibility !== 'hidden';
        })();
        const btn = useDesktop ? desktop : mobile;
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { w: r.width, h: r.height, which: useDesktop ? 'desktop' : 'mobile' };
      });
      assert(size !== null, 'Play control found on tablet');
      assert(size.h >= 32, `Play control height ${Math.round(size.h)}px ≥ 32px on tablet (${size.which})`);
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
