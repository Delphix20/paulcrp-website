(() => {
  'use strict';

  const pages = {
    hourly: {
      title: 'The day, hour by hour.',
      text: 'Temperature, conditions, and the chance of rain. A simple look at the next 24 hours.',
      alt: "Viento's Hourly page showing temperatures, weather conditions, and precipitation chances"
    },
    daily: {
      title: 'A little further ahead.',
      text: 'Highs, lows, and the chance of rain. Ten days of possibilities, in one simple view.',
      alt: "Viento's 10-day forecast showing daily temperatures, weather conditions, and rain chances"
    },
    light: {
      title: 'Follow the light.',
      text: 'Sunrise, sunset, and every hour in between. Watch the sun move across its arc, then see the phase of the moon at night.',
      alt: "Viento's Light page showing sunrise, sunset, daylight duration, and the sun on its arc"
    },
    wind: {
      title: 'A feel for the breeze.',
      text: 'Wind speed, gusts, and direction. A simple compass puts the air around you in perspective.',
      alt: "Viento's Wind page showing wind speed, gusts, and a directional compass"
    },
    air: {
      title: 'More than a chance of rain.',
      text: 'Precipitation, humidity, visibility, and how it feels outside. The everyday details, all together.',
      alt: "Viento's Air page showing precipitation chance and amount, humidity, and visibility"
    },
    pressure: {
      title: 'A sense of what is changing.',
      text: 'Atmospheric pressure at a glance, with its trend and the expected change over the next six hours.',
      alt: "Viento's Pressure page showing its pressure gauge, trend, and expected six-hour change"
    }
  };
  const tabs = Array.from(document.querySelectorAll('[data-page]'));
  const panel = document.getElementById('forecast-panel');
  const image = document.getElementById('forecast-image');
  const title = document.getElementById('forecast-caption-title');
  const description = document.getElementById('forecast-caption-text');
  const assetBase = new URL('../../images/viento/', document.currentScript.src);
  const assets = window.VientoPreviewAssets || {};
  const forecastToggle = document.getElementById('forecast-appearance');
  const placesToggle = document.getElementById('places-appearance');
  const forecastModes = Array.from(forecastToggle.querySelectorAll('[data-appearance]'));
  const placesModes = Array.from(placesToggle.querySelectorAll('[data-appearance]'));
  const placesImage = document.getElementById('places-image');
  const forecastPreview = createPreview(image);
  const placesPreview = createPreview(placesImage);
  let currentPage = 'daily';
  let requestedPage = currentPage;
  let preferredAppearance = 'dark';

  function availableAppearance(page, preferred) {
    if (assets[page]?.[preferred]) return preferred;
    if (assets[page]?.dark) return 'dark';
    if (assets[page]?.light) return 'light';
    return null;
  }

  // Decode before fading, and let the latest interaction win independently
  // in each preview. Never blank the phone on an unavailable image.
  function createPreview(target) {
    let selection = 0;
    let animation;
    return {
      cancelAnimation() { animation?.cancel(); },
      async show(stem, commit, animate = true) {
        const version = ++selection;
        animation?.cancel();
        const source = new URL(`${stem}-800.webp`, assetBase).href;
        if (target.src === source) {
          commit();
          return 'ready';
        }
        const preview = new Image();
        preview.src = source;
        try {
          await preview.decode();
        } catch {
          return version === selection ? 'failed' : 'superseded';
        }
        if (version !== selection) return 'superseded';
        const shouldAnimate = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          && typeof target.animate === 'function';
        if (shouldAnimate) {
          const exit = target.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: 'forwards' });
          animation = exit;
          await exit.finished.catch(() => {});
          exit.cancel();
        }
        if (version !== selection) return 'superseded';
        target.removeAttribute('srcset');
        target.src = source;
        commit();
        if (shouldAnimate) {
          animation = target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' });
        }
        return 'ready';
      }
    };
  }

  function updateModes(buttons, page, appearance) {
    buttons.forEach(button => {
      const mode = button.dataset.appearance;
      button.disabled = !assets[page]?.[mode];
      button.setAttribute('aria-pressed', String(mode === appearance));
      button.title = button.disabled ? 'Preview awaiting the new screenshot export' : `${mode === 'dark' ? 'Dark' : 'Light'} appearance`;
    });
  }

  async function selectPage(page, appearance = preferredAppearance, animate = true) {
    const mode = availableAppearance(page, appearance);
    if (!pages[page] || !mode) return;
    requestedPage = page;
    preferredAppearance = appearance;
    const result = await forecastPreview.show(assets[page][mode], () => {
      currentPage = page;
      tabs.forEach(tab => {
        const active = tab.dataset.page === page;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', `tab-${page}`);
      image.alt = `${pages[page].alt}, in ${mode} appearance`;
      title.textContent = pages[page].title;
      description.textContent = pages[page].text;
      updateModes(forecastModes, page, mode);
    }, animate);
    if (result === 'failed') requestedPage = currentPage;
  }

  async function selectPlaces(appearance, animate = true) {
    if (!assets.places?.[appearance]) return;
    await placesPreview.show(assets.places[appearance], () => {
      placesImage.alt = `Viento's compact Compare view showing weather for eight places, in ${appearance} appearance`;
      updateModes(placesModes, 'places', appearance);
    }, animate);
  }

  tabs.forEach(tab => {
    tab.disabled = !availableAppearance(tab.dataset.page, 'dark');
    tab.title = tab.disabled ? 'Preview awaiting the new screenshot export' : '';
    tab.addEventListener('click', () => selectPage(tab.dataset.page));
    tab.addEventListener('keydown', event => {
      const enabled = tabs.filter(item => !item.disabled);
      const index = enabled.indexOf(tab);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % enabled.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + enabled.length) % enabled.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = enabled.length - 1;
      else return;
      event.preventDefault();
      enabled[next].focus();
      selectPage(enabled[next].dataset.page);
    });
  });
  forecastModes.forEach(button => {
    button.addEventListener('click', () => selectPage(requestedPage, button.dataset.appearance));
  });
  placesModes.forEach(button => {
    button.addEventListener('click', () => selectPlaces(button.dataset.appearance));
  });
  forecastToggle.hidden = !availableAppearance('daily', 'dark');
  placesToggle.hidden = !availableAppearance('places', 'dark');
  selectPage('daily', 'dark', false);
  selectPlaces(availableAppearance('places', 'dark'), false);
  if (assets.daily?.dark) {
    document.getElementById('hero-daily-image').src = new URL(`${assets.daily.dark}-480.webp`, assetBase).href;
  }

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  const devices = document.querySelector('.hero-devices');
  let framePending = false;
  let heroVisible = true;

  function updateDepth() {
    framePending = false;
    if (motionPreference.matches || !heroVisible) return;
    const offset = Math.min(22, Math.max(0, -hero.getBoundingClientRect().top) * 0.045);
    devices.style.setProperty('--hero-shift', `${-offset}px`);
  }

  function scheduleDepth() {
    if (framePending || motionPreference.matches || !heroVisible) return;
    framePending = true;
    window.requestAnimationFrame(updateDepth);
  }

  // Only update the small hero transform while it is on screen.
  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) scheduleDepth();
    });
    heroObserver.observe(hero);
    window.addEventListener('scroll', scheduleDepth, { passive: true });
  }
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      forecastPreview.cancelAnimation();
      placesPreview.cancelAnimation();
      devices.style.removeProperty('--hero-shift');
    } else scheduleDepth();
  });
  if ('IntersectionObserver' in window && !motionPreference.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('reveal-pending');
      observer.observe(element);
    });
    motionPreference.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      document.querySelectorAll('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'));
    });
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'));
    });
  }
})();
