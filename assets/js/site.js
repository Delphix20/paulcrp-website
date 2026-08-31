(function () {
  function allSpotlightRows() {
    return Array.from(document.querySelectorAll('#apps .inner > section.spotlight, #games .inner > section.spotlight'));
  }

  function applyAlternation() {
    const rows = allSpotlightRows();
    if (!rows.length) return;
    rows.forEach((row, i) => {
      row.classList.toggle('reverse', i % 2 === 1);
    });
  }

  function setup(container) {
    const mo = new MutationObserver(() => applyAlternation());
    mo.observe(container, { childList: true, subtree: false });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const menu = document.querySelector('#menu');
    const menuToggle = document.querySelector('.menuToggle');
    const menuClose = menu && menu.querySelector('.close');
    const pageWrapper = document.querySelector('#page-wrapper');
    const header = document.querySelector('#header');
    const mobileQuery = window.matchMedia('(max-width: 980px)');

    const syncMobileClass = () => body.classList.toggle('is-mobile', mobileQuery.matches);
    syncMobileClass();
    mobileQuery.addEventListener('change', syncMobileClass);

    if (menu && menu.parentElement !== body) body.appendChild(menu);

    const setMenuOpen = (open, restoreFocus) => {
      body.classList.toggle('is-menu-visible', open);
      if (menuToggle) menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        window.requestAnimationFrame(() => menu.querySelector('a:not(.close)')?.focus());
      } else if (restoreFocus && menuToggle) {
        menuToggle.focus();
      }
    };

    menuToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(!body.classList.contains('is-menu-visible'), false);
    });

    menuClose?.addEventListener('click', (event) => {
      event.preventDefault();
      setMenuOpen(false, true);
    });

    menu?.addEventListener('click', (event) => event.stopPropagation());
    pageWrapper?.addEventListener('click', () => {
      if (body.classList.contains('is-menu-visible')) setMenuOpen(false, false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && body.classList.contains('is-menu-visible')) {
        setMenuOpen(false, true);
      }
    });

    document.querySelectorAll('a.scrolly, #menu a[href^="#"]:not(.close)').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.querySelector(link.hash);
        if (!target) return;
        event.preventDefault();
        setMenuOpen(false, false);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const headerOffset = header ? header.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', link.hash);
      });
    });

    const apps  = document.querySelector('#apps .inner');
    const games = document.querySelector('#games .inner');
    applyAlternation();
    if (apps)  setup(apps);
    if (games) setup(games);

    document.querySelectorAll('.spotlight .content.game-card').forEach((el) => {
      el.classList.add('scroll-reveal-card');
    });

    document.querySelectorAll('.spotlight .image').forEach((el) => {
      el.classList.add('scroll-reveal-icon');
    });

    document.querySelectorAll('#about .inner, #contact .inner').forEach((el) => {
      el.classList.add('scroll-reveal-card');
    });

    const revealElements = document.querySelectorAll('.scroll-reveal-card, .scroll-reveal-icon');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      }, {
        threshold: 0.18,
        rootMargin: '0px 0px -6% 0px'
      });

      revealElements.forEach((el) => observer.observe(el));
    } else {
      revealElements.forEach((el) => el.classList.add('is-visible'));
    }

    const root = body;
    const updateBackground = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const shiftY = Math.round(progress * 140 - 28);
      const tiltX = Math.round((progress - 0.5) * 36);
      root.style.setProperty('--bg-shift-y', `${shiftY}px`);
      root.style.setProperty('--bg-tilt-x', `${tiltX}px`);
    };

    updateBackground();
    window.addEventListener('scroll', updateBackground, { passive: true });
    window.addEventListener('resize', updateBackground);
  });
})();
