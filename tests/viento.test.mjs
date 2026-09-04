import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const code = await readFile(new URL('../assets/js/viento.js', import.meta.url), 'utf8');
const catalogCode = await readFile(new URL('../assets/js/viento-previews.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../viento/index.html', import.meta.url), 'utf8');
const pageNames = ['hourly', 'daily', 'light', 'wind', 'air', 'pressure'];
const fullCatalog = Object.fromEntries([...pageNames, 'places'].map(page => [page, {
  dark: `${page}-dark`, light: `${page}-light`
}]));

function setup({ reducedMotion = false, decode, origin = 'https://paulcrp.com', catalog = fullCatalog } = {}) {
  let animationCount = 0;
  function element(attributes = {}) {
    return {
      attributes: { ...attributes }, listeners: {}, disabled: false,
      style: { setProperty() {}, removeProperty() {} },
      setAttribute(key, value) { this.attributes[key] = value; },
      getAttribute(key) { return this.attributes[key]; },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(key, value) { this.listeners[key] = value; },
      getBoundingClientRect() { return { top: 0 }; },
      focus() { this.focused = true; },
      animate() {
        animationCount++;
        return { finished: Promise.resolve(), cancel() {} };
      }
    };
  }
  const tabs = pageNames.map(page => ({
    ...element({ 'aria-selected': String(page === 'daily') }),
    id: `tab-${page}`, dataset: { page }, tabIndex: page === 'daily' ? 0 : -1
  }));
  const elements = new Map([
    'forecast-panel', 'forecast-image', 'forecast-caption-title', 'forecast-caption-text',
    'places-image', 'hero-daily-image', 'forecast-appearance', 'places-appearance'
  ].map(id => [id, element()]));
  function makeModes(id) {
    const buttons = ['dark', 'light'].map(appearance => ({ ...element(), dataset: { appearance } }));
    elements.get(id).querySelectorAll = () => buttons;
    return buttons;
  }
  const forecastModes = makeModes('forecast-appearance');
  const placesModes = makeModes('places-appearance');
  for (const [page, id] of [['daily', 'forecast-image'], ['places', 'places-image']]) {
    const appearance = catalog[page].dark ? 'dark' : 'light';
    elements.get(id).src = `${origin}/images/viento/${catalog[page][appearance]}-800.webp`;
  }
  const context = {
    URL,
    Image: class { decode() { return decode ? decode(this.src) : Promise.resolve(); } },
    document: {
      currentScript: { src: `${origin}/assets/js/viento.js` },
      getElementById: id => elements.get(id),
      querySelectorAll: selector => selector === '[data-page]' ? tabs : [],
      querySelector: () => element()
    },
    window: {
      VientoPreviewAssets: catalog,
      matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
      addEventListener() {},
      requestAnimationFrame(callback) { callback(); }
    }
  };
  vm.runInNewContext(code, context);
  return { tabs, elements, forecastModes, placesModes, animations: () => animationCount,
    tab: page => tabs.find(item => item.dataset.page === page) };
}

test('isolated styles, six page tabs, and accessible controls below both mockups', () => {
  assert.match(html, /href="\.\.\/assets\/css\/viento.css"/);
  assert.doesNotMatch(html, /href="[^"]*(?:site|main|app-detail)\.css"/);
  assert.match(html, /id="tab-daily" role="tab" aria-selected="true"/);
  assert.match(html, /id="forecast-image" src="\.\.\/images\/viento\/daily-dark-800.webp"/);
  assert.match(html, /id="places-image" src="\.\.\/images\/viento\/places-dark-800.webp"/);
  assert.match(html, /id="hero-daily-image" src="\.\.\/images\/viento\/daily-dark-480.webp"/);
  assert.doesNotMatch(html, /id="tab-hourly"[^>]*disabled/);
  assert.match(html, /href="https:\/\/paulcrp.com\/viento\/"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 6);
  for (const section of ['forecast', 'places']) {
    assert.match(html, new RegExp(`id="${section}-appearance" role="group" aria-label=`));
    assert.ok(html.indexOf(`id="${section}-appearance"`) > html.indexOf(`id="${section}-image"`));
  }
});

test('the top App Store badge is in the header, not duplicated in the hero', () => {
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
  const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0];
  assert.ok(header && hero);
  assert.match(header, /class="store-link" href="https:\/\/apps.apple.com\/app\/viento-minimal-weather\/id6770246185"/);
  assert.match(header, /alt="Download on the App Store"/);
  assert.doesNotMatch(header, /Get Viento/);
  assert.doesNotMatch(hero, /class="store-link"/);
  assert.equal((html.match(/class="store-link"/g) || []).length, 2);
});

test('Paul credit links to the main site and the Apple symbol retains its legal link', () => {
  assert.match(html, /Made with care by <a href="https:\/\/paulcrp.com">Paul CRP<\/a>/);
  assert.match(html, /class="weather-attribution" href="https:\/\/weatherkit.apple.com\/legal-attribution.html"/);
  assert.match(html, /aria-label="Apple Weather"><img src="\.\.\/images\/viento\/apple-mark.svg"[^>]*\/> Weather/);
});

test('all entries in the actual asset catalog point to existing files', async () => {
  const context = { window: {} };
  vm.runInNewContext(catalogCode, context);
  const catalog = context.window.VientoPreviewAssets;
  assert.equal(Object.keys(catalog).length, 7);
  for (const page of [...pageNames, 'places']) {
    const modes = catalog[page];
    assert.equal(modes.dark, `${page}-dark`);
    assert.equal(modes.light, `${page}-light`);
    for (const stem of Object.values(modes)) {
      for (const width of [480, 800]) {
        await access(new URL(`../images/viento/${stem}-${width}.webp`, import.meta.url));
      }
    }
  }
});

test('the installed catalog enables every page and both appearance controls', async () => {
  const context = { window: {} };
  vm.runInNewContext(catalogCode, context);
  const { tabs, forecastModes, placesModes } = setup({ catalog: context.window.VientoPreviewAssets });
  for (const tab of tabs) {
    assert.equal(tab.disabled, false);
    await tab.listeners.click();
    assert.ok(forecastModes.every(button => !button.disabled));
  }
  assert.ok(placesModes.every(button => !button.disabled));
});

test('both previews and the hero default to dark when the exports are available', () => {
  const { elements, forecastModes, placesModes } = setup();
  assert.ok(elements.get('hero-daily-image').src.endsWith('/daily-dark-480.webp'));
  assert.equal(forecastModes[0].getAttribute('aria-pressed'), 'true');
  assert.equal(placesModes[0].getAttribute('aria-pressed'), 'true');
});

test('each forecast tab supports both appearances without changing the selected page', async () => {
  const { tabs, elements, forecastModes } = setup();
  for (const tab of tabs) {
    await tab.listeners.click();
    assert.equal(tab.getAttribute('aria-selected'), 'true');
    assert.equal(tab.tabIndex, 0);
    assert.equal(tabs.filter(item => item.getAttribute('aria-selected') === 'true').length, 1);
    assert.equal(elements.get('forecast-panel').getAttribute('aria-labelledby'), tab.id);
    assert.ok(elements.get('forecast-caption-title').textContent.length > 0);
    for (const mode of forecastModes) {
      await mode.listeners.click();
      assert.ok(elements.get('forecast-image').src.endsWith(`/${tab.dataset.page}-${mode.dataset.appearance}-800.webp`));
      assert.equal(mode.getAttribute('aria-pressed'), 'true');
      assert.equal(tab.getAttribute('aria-selected'), 'true');
    }
  }
});

test('appearance is preserved when selecting another forecast page', async () => {
  const { tab, elements, forecastModes } = setup();
  await forecastModes[1].listeners.click();
  await tab('hourly').listeners.click();
  assert.ok(elements.get('forecast-image').src.endsWith('/hourly-light-800.webp'));
});

test('Places appearance changes independently from the forecast', async () => {
  const { placesModes, forecastModes, elements } = setup();
  await placesModes[1].listeners.click();
  assert.ok(elements.get('places-image').src.endsWith('/places-light-800.webp'));
  assert.ok(elements.get('forecast-image').src.endsWith('/daily-dark-800.webp'));
  await forecastModes[1].listeners.click();
  await placesModes[0].listeners.click();
  assert.ok(elements.get('places-image').src.endsWith('/places-dark-800.webp'));
  assert.ok(elements.get('forecast-image').src.endsWith('/daily-light-800.webp'));
});

test('arrow keys, Home, and End move focus and selection', async () => {
  const { tab } = setup();
  let prevented = false;
  tab('hourly').listeners.keydown({ key: 'ArrowLeft', preventDefault() { prevented = true; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(prevented, true);
  assert.equal(tab('pressure').focused, true);
  assert.equal(tab('pressure').getAttribute('aria-selected'), 'true');
  tab('pressure').listeners.keydown({ key: 'Home', preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(tab('hourly').getAttribute('aria-selected'), 'true');
  tab('hourly').listeners.keydown({ key: 'End', preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(tab('pressure').getAttribute('aria-selected'), 'true');
});

test('a slow previous image cannot overwrite the latest selected page', async () => {
  const pending = [];
  const { tab, elements } = setup({ decode: () => new Promise(resolve => pending.push(resolve)) });
  const first = tab('light').listeners.click();
  const second = tab('wind').listeners.click();
  pending[1]();
  await second;
  pending[0]();
  await first;
  assert.equal(tab('wind').getAttribute('aria-selected'), 'true');
  assert.ok(elements.get('forecast-image').src.endsWith('/wind-dark-800.webp'));
});

test('appearance change during a pending page change applies to the requested page', async () => {
  const pending = [];
  const { tab, elements, forecastModes } = setup({ decode: () => new Promise(resolve => pending.push(resolve)) });
  const page = tab('wind').listeners.click();
  const mode = forecastModes[1].listeners.click();
  pending[1]();
  await mode;
  pending[0]();
  await page;
  assert.ok(elements.get('forecast-image').src.endsWith('/wind-light-800.webp'));
  assert.equal(tab('wind').getAttribute('aria-selected'), 'true');
});

test('returning to the current tab cancels an in-flight selection', async () => {
  let finish;
  const { tab, elements } = setup({ decode: () => new Promise(resolve => { finish = resolve; }) });
  const changing = tab('light').listeners.click();
  await tab('daily').listeners.click();
  finish();
  await changing;
  assert.equal(tab('daily').getAttribute('aria-selected'), 'true');
  assert.ok(elements.get('forecast-image').src.endsWith('/daily-dark-800.webp'));
});

test('failed image requests preserve the last screenshot and accessible selection', async () => {
  const { tab, elements, forecastModes, placesModes } = setup({ decode: () => Promise.reject(new Error('offline')) });
  await tab('light').listeners.click();
  await forecastModes[1].listeners.click();
  await placesModes[1].listeners.click();
  assert.equal(tab('daily').getAttribute('aria-selected'), 'true');
  assert.equal(forecastModes[0].getAttribute('aria-pressed'), 'true');
  assert.equal(placesModes[0].getAttribute('aria-pressed'), 'true');
  assert.ok(elements.get('forecast-image').src.endsWith('/daily-dark-800.webp'));
  assert.ok(elements.get('places-image').src.endsWith('/places-dark-800.webp'));
});

test('missing exports stay disabled and are skipped by keyboard', async () => {
  const catalog = { ...fullCatalog, hourly: {}, daily: { light: 'daily' }, places: { light: 'places' } };
  const { tab, elements, forecastModes, placesModes } = setup({ catalog });
  assert.equal(tab('hourly').disabled, true);
  assert.equal(forecastModes[0].disabled, true);
  assert.equal(placesModes[0].disabled, true);
  assert.equal(forecastModes[1].getAttribute('aria-pressed'), 'true');
  assert.ok(elements.get('forecast-image').src.endsWith('/daily-800.webp'));
  tab('daily').listeners.keydown({ key: 'ArrowLeft', preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(tab('pressure').getAttribute('aria-selected'), 'true');
});

test('Reduce Motion disables both preview animations', async () => {
  const { tab, placesModes, animations } = setup({ reducedMotion: true });
  await tab('light').listeners.click();
  await placesModes[1].listeners.click();
  assert.equal(animations(), 0);
});

test('assets resolve when the page is opened directly from disk', async () => {
  const { tab, elements } = setup({ origin: 'file:///Users/example/website' });
  await tab('light').listeners.click();
  assert.equal(elements.get('forecast-image').src, 'file:///Users/example/website/images/viento/light-dark-800.webp');
});
