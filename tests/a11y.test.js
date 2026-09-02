/**
 * ACCESSIBILITY & INTERACTION TESTS — hominines app
 * Checks keyboard nav, touch targets, i18n, ARIA labels, timeline interaction.
 *
 * Run: node tests/a11y.test.js
 * Smoke (faster, fewer cases): node tests/a11y.test.js --smoke — skips tablet,
 * Play auto-stop-at-end, dir=ltr sweep, Playwright welcome-locale, and
 * close-button i18n checks.
 */

'use strict';
const { launch, loadApp, setTime, startAppHttpServer,
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
      if (!btn) return null;
      const a = (btn.getAttribute('aria-label') || '').trim();
      if (a) return a;
      return (btn.textContent || '').trim();
    });
    assert(text && text.length > 0, `Play button has accessible text: "${text}"`);
  });

  await test('Catalogue language selector has aria-label', async () => {
    const label = await page.evaluate(() => {
      const sel = document.querySelector('[data-testid="catalogue-lang-select"]');
      return sel ? (sel.getAttribute('aria-label') || '') : null;
    });
    assert(label && label.length > 0, `Catalogue language selector has aria-label: "${label}"`);
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

  await test('Burger JSON data button ≥ 28px tall', async () => {
    const height = await page.evaluate(() => {
      const btn = document.getElementById('btn-data-viewer');
      return btn ? btn.getBoundingClientRect().height : 0;
    });
    assert(height > 0, 'JSON data button is in the DOM');
    assertSoft(height >= 28, `JSON data button height = ${Math.round(height)}px (expected ≥ 28px)`);
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
    await setTime(page, -7500000); // far left (TIMELINE_MIN)
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
    await setTime(page, -7500000);
    const found = await page.evaluate(() => !!document.querySelector('[data-testid="play-toggle"]'));
    assert(found, 'Play button found');
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="play-toggle"]');
      if (b) b.click();
    });
    await page.waitForTimeout(300);

    const isPlaying = await page.evaluate(() => isPlaying);
    assert(isPlaying === true, 'isPlaying === true after clicking Play');

    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="play-toggle"]');
      if (b) b.click();
    });
    await page.waitForTimeout(150);
  });

  await test('Clicking Pause stops playback', async () => {
    await setTime(page, -7500000);
    // DOM click inside the page: Play avoids "element not stable" when the Play
    // control shifts with the scrubber needle / timeline layout animations.
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="play-toggle"]');
      if (b) b.click();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="play-toggle"]');
      if (b) b.click();
    });
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
  // 5. I18N — LANGUAGE SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ INTERNATIONALISATION${RESET}`);

  await test('Chrome UI follows the catalogue language', async () => {
    const before = await page.evaluate(() => {
      const el = document.querySelector('#tab-map span');
      return el ? el.textContent.trim() : null;
    });
    assert(before && /map/i.test(before), `Map tab is English (got "${before}")`);
    await page.evaluate(() => {
      if (typeof setCatalogueLang === 'function') setCatalogueLang('fr');
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const el = document.querySelector('#tab-map span');
      const htmlLang = document.documentElement.lang;
      const height = document.querySelector('.figure-bio-table th');
      return {
        text: el ? el.textContent.trim() : null,
        htmlLang,
        height: height ? height.textContent.trim() : '',
      };
    });
    assert(/carte/i.test(after.text), `Map tab is French after catalogue FR (got "${after.text}")`);
    assert(after.htmlLang === 'fr', `html lang is fr (got "${after.htmlLang}")`);
    await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('en'); });
    await page.waitForTimeout(200);
    const back = await page.evaluate(() => {
      const el = document.querySelector('#tab-map span');
      return {
        text: el ? el.textContent.trim() : null,
        htmlLang: document.documentElement.lang,
      };
    });
    assert(/map/i.test(back.text), `Map tab returns to English (got "${back.text}")`);
    assert(back.htmlLang === 'en', `html lang returns to en (got "${back.htmlLang}")`);
  });

  if (!smoke) {
    await test('Layout direction stays LTR', async () => {
      const dirEn = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('fr'); });
      await page.waitForTimeout(200);
      const dirFr = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      assertSoft((dirEn === 'ltr' || dirEn === null) && (dirFr === 'ltr' || dirFr === null),
        `html dir stays ltr (got en="${dirEn}", catalogue-fr="${dirFr}")`);
      await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('en'); });
    });

    await test('Country labels follow the UI language', async () => {
      await page.evaluate(() => {
        if (window.__mapLibreMap) {
          window.__mapLibreMap.jumpTo({ zoom: 4, center: [90, 25] });
          if (typeof updateMapLibreLabels === 'function') updateMapLibreLabels();
        }
      });
      await page.waitForTimeout(200);
      await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('en'); });
      await page.waitForTimeout(200);
      const en = await page.evaluate(() => {
        const label = document.querySelector('.country-label-marker[data-country-code="CN"]');
        return { text: label ? label.textContent.trim() : '' };
      });
      await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('fr'); });
      await page.waitForTimeout(200);
      const fr = await page.evaluate(() => {
        const label = document.querySelector('.country-label-marker[data-country-code="CN"]');
        return label ? label.textContent.trim() : '';
      });
      assert(en.text.length > 0, `Country label for CN is present (got "${en.text}")`);
      assert(/chine/i.test(fr) || fr !== en.text, `Catalogue FR localises country labels (en="${en.text}", fr="${fr}")`);
      await page.evaluate(() => { if (typeof setCatalogueLang === 'function') setCatalogueLang('en'); });
    });

    await test('World zoom shows continents instead of country labels', async () => {
      await page.evaluate(() => {
        if (window.__mapLibreMap) {
          window.__mapLibreMap.jumpTo({ zoom: 1.6, center: [20, 20] });
          if (typeof updateMapLibreLabels === 'function') updateMapLibreLabels();
        }
      });
      await page.waitForTimeout(450);
      const st = await page.evaluate(() => {
        const continent = document.querySelector('.continent-label-marker[data-continent-code="asia"]');
        const countries = document.querySelectorAll('.country-label-marker').length;
        return {
          continent: continent ? continent.textContent.trim() : '',
          lang: continent ? continent.getAttribute('lang') : '',
          countries,
        };
      });
      assert(st.continent === 'Asia', `World zoom shows English continent label "Asia" (got "${st.continent}")`);
      assert(st.lang === 'en', `Continent labels expose lang=en (got "${st.lang}")`);
      assert(st.countries === 0, `World zoom hides country labels (got ${st.countries})`);
    });

    for (const locale of ['zh-CN', 'ar-EG', 'ja-JP']) {
      await test(`World map continent labels stay English for ${locale} (browser-translatable)`, async () => {
        const { browser: bCountry, page: pCountry } = await launch({ locale });
        try {
          await loadApp(pCountry);
          await pCountry.evaluate(() => {
            if (window.__mapLibreMap) {
              window.__mapLibreMap.jumpTo({ zoom: 1.6, center: [20, 20] });
              if (typeof updateMapLibreLabels === 'function') updateMapLibreLabels();
            }
          });
          await pCountry.waitForTimeout(250);
          const st = await pCountry.evaluate(() => {
            const label = document.querySelector('.continent-label-marker[data-continent-code="asia"]');
            return {
              nav: navigator.language,
              htmlLang: document.documentElement.lang,
              text: label ? label.textContent.trim() : '',
              labelLang: label ? label.getAttribute('lang') : '',
              labelDir: label ? label.getAttribute('dir') : '',
              translate: label ? label.getAttribute('translate') : '',
            };
          });
          assert(st.nav.toLowerCase().startsWith(locale.toLowerCase().slice(0, 2)), `navigator.language is ${locale} (got "${st.nav}")`);
          assert(st.htmlLang === 'en', `${locale} keeps app UI in EN (got "${st.htmlLang}")`);
          assert(st.text === 'Asia', `${locale} continent label is English source (got "${st.text}")`);
          assert(st.labelLang === 'en', `${locale} continent label lang=en (got "${st.labelLang}")`);
          assert(st.translate === 'yes', `${locale} continent label is browser-translatable`);
          assert(st.labelDir === 'auto', `${locale} continent label uses dir="auto" (got "${st.labelDir}")`);
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
          const sel = document.getElementById('catalogue-lang-select');
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
        assert(st.selectorValue === 'en', `Catalogue language selector defaults to EN (got "${st.selectorValue}")`);
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

    await test('Welcome locale: fr-FR uses French chrome and catalogue, no translate toast', async () => {
      const { browser: bFr, page: pFr } = await launch({ locale: 'fr-FR' });
      try {
        await loadApp(pFr, { dismissWelcome: false });
        const st = await pFr.evaluate(() => {
          const hint = document.getElementById('welcome-translate-hint');
          const panel = document.getElementById('welcome-lang-panel');
          const overlay = document.getElementById('welcome-modal-overlay');
          const sel = document.getElementById('catalogue-lang-select');
          const banner = document.getElementById('page-translate-banner');
          return {
            nav: navigator.language,
            htmlLang: document.documentElement.lang,
            selectorValue: sel ? sel.value : '',
            hintHtml: hint ? hint.innerHTML : '',
            hintPanelVisible: !!(panel && !panel.hidden),
            bannerVisible: !!(banner && !banner.hidden),
            welcomeOpen: !!(overlay && !overlay.classList.contains('hidden')),
            tagline: (document.getElementById('welcome-tagline') || {}).textContent || '',
            startLabel: (document.getElementById('welcome-start-label') || {}).textContent || '',
          };
        });
        assert(st.welcomeOpen, 'Welcome overlay is visible on first load');
        assert(/^fr/i.test(st.nav), `navigator.language is fr-* (got "${st.nav}")`);
        assert(st.htmlLang === 'fr', `FR browser locale uses French chrome (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'fr', `Catalogue language auto-selects FR (got "${st.selectorValue}")`);
        assert(!st.hintPanelVisible, 'FR locale does not show Translate this page hint');
        assert(!st.bannerVisible, 'FR locale does not show the on-map translate banner');
        assert(/origines africaines/i.test(st.tagline), `FR browser welcome is French (got "${st.tagline}")`);
        assert(/commencer/i.test(st.startLabel), `FR browser welcome button is French (got "${st.startLabel}")`);
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
          const sel = document.getElementById('catalogue-lang-select');
          return {
            nav: navigator.language,
            htmlLang: document.documentElement.lang,
            selectorValue: sel ? sel.value : '',
            hintHtml: hint ? hint.innerHTML : '',
            hintPanelVisible: !!(panel && !panel.hidden),
            welcomeOpen: !!(overlay && !overlay.classList.contains('hidden')),
            welcomeFrBtn: !!document.getElementById('welcome-pick-fr'),
            welcomeEnBtn: !!document.getElementById('welcome-pick-en'),
            tagline: (document.getElementById('welcome-tagline') || {}).textContent || '',
            startLabel: (document.getElementById('welcome-start-label') || {}).textContent || '',
          };
        });
        assert(st.welcomeOpen, 'Welcome overlay is visible on first load');
        assert(/^en/i.test(st.nav), `navigator.language is en-* (got "${st.nav}")`);
        assert(st.htmlLang === 'en', `EN browser locale selects EN (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'en', `Catalogue language selector selects EN (got "${st.selectorValue}")`);
        assert(!st.hintPanelVisible, 'EN locale does not show translation hint panel');
        assert(st.hintHtml === '', 'EN locale has no translate hint copy');
        assert(!st.welcomeFrBtn && !st.welcomeEnBtn, 'Welcome screen has no language-choice buttons');
        assert(/african origins/i.test(st.tagline), `EN welcome tagline is English (got "${st.tagline}")`);
        assert(!/origines africaines/i.test(st.tagline), `EN welcome is not left in French (got "${st.tagline}")`);
        assert(/start exploring/i.test(st.startLabel), `EN welcome button is English (got "${st.startLabel}")`);
      } finally {
        await bEn.close();
      }
    });

    await test('English browser ignores leftover French catalogue storage', async () => {
      const { browser: bStale, page: pStale } = await launch({ locale: 'en-US' });
      try {
        await pStale.addInitScript(() => {
          try {
            localStorage.setItem('ho_catalogue_lang', 'fr');
            localStorage.setItem('ho_lang_user', 'fr');
            localStorage.setItem('ho_lang_override', 'fr');
          } catch (e) { /* ignore */ }
        });
        await loadApp(pStale, { dismissWelcome: false });
        const st = await pStale.evaluate(() => ({
          htmlLang: document.documentElement.lang,
          catalogueLang: typeof currentDataLang === 'function' ? currentDataLang() : '',
          selectorValue: document.getElementById('catalogue-lang-select')?.value || '',
          tagline: (document.getElementById('welcome-tagline') || {}).textContent || '',
          simple: (document.getElementById('timeline-view-mode-simple') || {}).textContent || '',
          i18n: (typeof i18next !== 'undefined' && i18next.isInitialized) ? i18next.language : '',
        }));
        assert(st.htmlLang === 'en', `Stale FR keys do not switch html lang (got "${st.htmlLang}")`);
        assert(st.catalogueLang === 'en', `Stale FR keys do not select the French catalogue (got "${st.catalogueLang}")`);
        assert(st.selectorValue === 'en', `Selector stays English (got "${st.selectorValue}")`);
        assert(st.i18n === 'en', `i18n stays English (got "${st.i18n}")`);
        assert(/african origins/i.test(st.tagline), `Welcome stays English (got "${st.tagline}")`);
        assert(/simple view/i.test(st.simple), `Chrome stays English (got "${st.simple}")`);
      } finally {
        await bStale.close();
      }
    });

    await test('Welcome locale: fr-CA uses French chrome', async () => {
      const { browser: bFrCa, page: pFrCa } = await launch({ locale: 'fr-CA' });
      try {
        await loadApp(pFrCa, { dismissWelcome: false });
        const st = await pFrCa.evaluate(() => ({
          nav: navigator.language,
          htmlLang: document.documentElement.lang,
          selectorValue: document.getElementById('catalogue-lang-select')?.value || '',
        }));
        assert(/^fr-CA/i.test(st.nav), `navigator.language is fr-CA (got "${st.nav}")`);
        assert(st.htmlLang === 'fr', `fr-CA browser locale uses French chrome (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'fr', `fr-CA auto-selects French catalogue (got "${st.selectorValue}")`);
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
            const banner = document.getElementById('page-translate-banner');
            const burgerHint = document.getElementById('burger-translate-hint');
            return {
              nav: navigator.language,
              htmlLang: document.documentElement.lang,
              selectorValue: document.getElementById('catalogue-lang-select')?.value || '',
              hintText: hint ? hint.textContent || '' : '',
              hintPanelVisible: !!(panel && !panel.hidden),
              bannerVisible: !!(banner && !banner.hidden),
              burgerHintVisible: !!(burgerHint && !burgerHint.hidden),
              burgerHintText: burgerHint ? burgerHint.textContent || '' : '',
            };
          });
          assert(st.nav.toLowerCase().startsWith(locale.toLowerCase().slice(0, 2)), `navigator.language is ${locale} (got "${st.nav}")`);
          assert(st.htmlLang === 'en', `${locale} browser locale defaults to EN (got "${st.htmlLang}")`);
          assert(st.selectorValue === 'en', `Catalogue language selector defaults to EN (got "${st.selectorValue}")`);
          assert(st.hintPanelVisible, `${locale} shows browser-translate hint panel`);
          assert(st.hintText.includes('Translate this page'), `${locale} hint mentions Translate this page`);
          assert(st.bannerVisible, `${locale} shows the on-map translate banner`);
          assert(st.burgerHintVisible, `${locale} shows the burger translate hint`);
          assert(st.burgerHintText.includes('Translate this page'), `${locale} burger hint mentions Translate this page`);
        } finally {
          await bOther.close();
        }
      });
    }

    await test('Explicit language choice lasts for this view; reload follows the browser', async () => {
      const { browser: bManual, page: pManual } = await launch({ locale: 'fr-FR' });
      try {
        await loadApp(pManual, { dismissWelcome: false });
        const before = await pManual.evaluate(() => ({
          tagline: (document.getElementById('welcome-tagline') || {}).textContent || '',
          htmlLang: document.documentElement.lang,
        }));
        assert(/origines africaines/i.test(before.tagline), `FR browser welcome is French (got "${before.tagline}")`);
        assert(before.htmlLang === 'fr', `Chrome is French (got "${before.htmlLang}")`);
        await pManual.evaluate(() => {
          if (typeof setCatalogueLang === 'function') setCatalogueLang('en');
        });
        await pManual.waitForTimeout(200);
        const mid = await pManual.evaluate(() => ({
          htmlLang: document.documentElement.lang,
          tagline: (document.getElementById('welcome-tagline') || {}).textContent || '',
        }));
        assert(mid.htmlLang === 'en', `Burger EN applies immediately (got "${mid.htmlLang}")`);
        assert(/african origins/i.test(mid.tagline), `Welcome switches to English (got "${mid.tagline}")`);
        await loadApp(pManual, { dismissWelcome: false });
        const st = await pManual.evaluate(() => ({
          nav: navigator.language,
          stored: localStorage.getItem('ho_lang_override') || localStorage.getItem('ho_lang_user') || localStorage.getItem('ho_catalogue_lang'),
          htmlLang: document.documentElement.lang,
          selectorValue: document.getElementById('catalogue-lang-select')?.value || '',
          tagline: (document.getElementById('welcome-tagline') || {}).textContent || '',
        }));
        assert(/^fr/i.test(st.nav), `navigator.language remains fr-* (got "${st.nav}")`);
        assert(!st.stored, `No language key is persisted (got "${st.stored}")`);
        assert(st.htmlLang === 'fr', `Reload follows the French browser (got "${st.htmlLang}")`);
        assert(st.selectorValue === 'fr', `Selector follows the French browser (got "${st.selectorValue}")`);
        assert(/origines africaines/i.test(st.tagline), `Welcome is French again after reload (got "${st.tagline}")`);
      } finally {
        await bManual.close();
      }
    });
  } else {
    console.log(`\n  ${YELLOW}Welcome locale (Playwright): skipped in smoke mode${RESET}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6c. CLOSE BUTTONS (sr-only)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!smoke) {
    console.log(`\n${BOLD}◆ CLOSE BUTTONS & I18N TITLES${RESET}`);

    await test('Burger + JSON drawer close: sr-only label stays English', async () => {
      const enMenuOpen = await page.evaluate(() => {
        const el = document.querySelector('#burger-btn .sr-only');
        return el ? el.textContent.trim() : '';
      });
      assert(enMenuOpen === 'Menu', `Burger open sr-only: "${enMenuOpen}"`);
      await page.click('[data-testid="burger-menu-button"]');
      await page.waitForSelector('#burger-panel.open', { timeout: 4000 });
      const enClose = await page.evaluate(() => {
        const sr = document.querySelector('#burger-close .sr-only');
        return sr ? sr.textContent.trim() : '';
      });
      assert(enClose === 'Close', `Burger close sr-only: "${enClose}"`);

      await page.click('#btn-data-viewer');
      await page.waitForSelector('.data-viewer-drawer.open', { timeout: 4000 });
      const jsonClose = await page.evaluate(() => {
        const sr = document.querySelector('#btn-close-data-viewer .sr-only');
        return sr ? sr.textContent.trim() : '';
      });
      assert(jsonClose === 'Close', `JSON drawer close sr-only: "${jsonClose}"`);
      await page.click('[data-testid="close-data-viewer"]');
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    });

    await test('Burger language section always explains browser translation', async () => {
      await page.click('[data-testid="burger-menu-button"]');
      await page.waitForSelector('#burger-panel.open', { timeout: 4000 });
      const hint = await page.evaluate(() => {
        const el = document.getElementById('burger-translate-hint');
        return {
          hidden: !el || el.hidden,
          text: el ? (el.textContent || '').trim() : '',
        };
      });
      assert(!hint.hidden, 'Burger translate hint is visible');
      assert(
        /Google Translate|Google Traduction|Translate this page|Traduire cette page/i.test(hint.text),
        `Burger hint mentions browser/Google Translate (got: ${JSON.stringify(hint.text.slice(0, 180))})`
      );
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    });
  } else {
    console.log(`\n  ${YELLOW}Close-button checks: skipped in smoke mode${RESET}`);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. CDN OUTAGE RESILIENCE
  // The UI shell must not depend on any third-party CDN. i18next used to be a
  // blocking CDN script, and when it failed `data-i18n-pending` was never
  // cleared, so `body { visibility: hidden }` left a permanently blank page.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}◆ CDN OUTAGE RESILIENCE${RESET}`);

  await test('App still renders when every third-party CDN is unreachable', async () => {
    const base = await startAppHttpServer();
    const { browser: b3, page: p3 } = await launch();
    try {
      // Block every off-origin host: CDN scripts, fonts and map tiles.
      await p3.route('**', (route) => {
        const url = route.request().url();
        return url.startsWith(base) ? route.continue() : route.abort('failed');
      });
      await p3.goto(`${base}/index.html`, { waitUntil: 'load' }).catch(() => {});
      // Long enough to cover the 2s reveal failsafe in the <head>.
      await p3.waitForFunction(
        () => !document.documentElement.hasAttribute('data-i18n-pending'),
        { timeout: 8000 }
      );
      const state = await p3.evaluate(() => ({
        bodyVisibility: getComputedStyle(document.body).visibility,
        textLength: (document.body.innerText || '').trim().length,
        hasTimeline: !!document.querySelector('[data-testid="timeline"]'),
        i18nWorks: typeof window.i18next !== 'undefined'
          && window.i18next.t('ui.play') === 'Play',
      }));
      assert(state.bodyVisibility === 'visible',
        `body is visible with all CDNs blocked (got "${state.bodyVisibility}")`);
      assert(state.textLength > 100,
        `page renders readable content offline (${state.textLength} chars)`);
      assert(state.hasTimeline, 'timeline is present with all CDNs blocked');
      assert(state.i18nWorks, 'inline i18n engine resolves keys with no network');
    } finally {
      await b3.close();
    }
  });

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
