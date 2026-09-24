(() => {
  'use strict';
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  function closeMenu(returnFocus = false) {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    mobileNav.hidden = true;
    if (returnFocus) menuButton.focus();
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !open;
  });
  mobileNav?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width: 641px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Use a deliberate, distance-aware scroll instead of the browser's fixed timing.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrollFrame = 0;
  function stopScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    document.documentElement.classList.remove('is-scrolling');
  }
  function scrollToSection(target, focusTarget) {
    stopScroll();
    const start = window.scrollY;
    const root = document.documentElement;
    const offset = Math.max(parseFloat(getComputedStyle(root).scrollPaddingTop) || 0,
      parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    const destination = target.id === 'top' ? 0 : Math.max(0,
      Math.min(target.getBoundingClientRect().top + start - offset, root.scrollHeight - window.innerHeight));
    const distance = destination - start;
    const duration = reducedMotion.matches ? 0 : Math.min(2300, 1400 + Math.abs(distance) * 0.18);
    root.classList.add('is-scrolling');
    function finish() {
      window.scrollTo({ top: destination, behavior: 'auto' });
      stopScroll();
      if (focusTarget) {
        const hadTabindex = target.hasAttribute('tabindex');
        if (!hadTabindex) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        if (!hadTabindex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    }
    if (!duration || Math.abs(distance) < 2) { finish(); return; }
    const started = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({ top: start + distance * eased, behavior: 'auto' });
      if (progress < 1) scrollFrame = requestAnimationFrame(step);
      else finish();
    }
    scrollFrame = requestAnimationFrame(step);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download') || link.classList.contains('skip-link')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
    if (!id && link.classList.contains('brand')) id = 'top';
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (target.hidden && target.matches('#apps .app-row')) document.querySelector('[data-filter="all"]')?.click();
    closeMenu();
    const nextHash = '#' + id;
    if (location.hash !== nextHash) history.pushState(history.state, '', nextHash);
    scrollToSection(target, event.detail === 0);
  });
  // Hand control straight back when the visitor scrolls or touches the page.
  ['wheel', 'touchstart', 'pointerdown'].forEach(type => window.addEventListener(type, stopScroll, { passive: true }));
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Escape', 'Tab', ' '].includes(event.key)) stopScroll();
  });
  window.addEventListener('popstate', stopScroll);
  window.addEventListener('resize', stopScroll);
  reducedMotion.addEventListener('change', stopScroll);

  const carousel = document.querySelector('.collection-carousel');
  if (carousel) {
    const track = carousel.querySelector('.shelf-scroll');
    const previous = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    const galleryLinks = [...track.querySelectorAll('.gallery-link')];
    const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let direction = 0;
    let lastTime = 0;
    let velocity = 0;
    let hoverPosition = 0;
    let drag = null;
    let suppressClickUntil = 0;
    function stopCarousel() {
      cancelAnimationFrame(frame);
      frame = 0;
      direction = 0;
      lastTime = 0;
      velocity = 0;
    }
    function updateArrows() {
      previous.setAttribute('aria-disabled', String(track.scrollLeft <= 1));
      next.setAttribute('aria-disabled', String(track.scrollLeft >= track.scrollWidth - track.clientWidth - 1));
    }
    function animateHover(now) {
      const elapsed = lastTime ? Math.min(now - lastTime, 40) : 0;
      lastTime = now;
      const limit = track.scrollWidth - track.clientWidth;
      const targetVelocity = direction * 0.24;
      const decay = Math.exp(-elapsed / 110);
      // Integrate the easing using fractional pixels, independent of frame rate.
      hoverPosition += targetVelocity * elapsed + (velocity - targetVelocity) * 110 * (1 - decay);
      velocity = targetVelocity + (velocity - targetVelocity) * decay;
      hoverPosition = Math.max(0, Math.min(limit, hoverPosition));
      track.scrollLeft = hoverPosition;
      if ((!direction && Math.abs(velocity) < 0.004) || (direction <= 0 && hoverPosition <= 0) || (direction >= 0 && hoverPosition >= limit)) stopCarousel();
      else frame = requestAnimationFrame(animateHover);
    }
    function followPointer(event) {
      if (event.pointerType !== 'mouse' || event.buttons || drag || galleryLinks.includes(document.activeElement) || !hoverPointer.matches || reducedMotion.matches) return;
      const bounds = carousel.getBoundingClientRect();
      const edgeWidth = Math.min(85, bounds.width * 0.14);
      const x = event.clientX - bounds.left;
      const nextDirection = x < edgeWidth ? -1 : x > bounds.width - edgeWidth ? 1 : 0;
      if (direction === nextDirection) return;
      direction = nextDirection;
      if (direction && !frame) {
        hoverPosition = track.scrollLeft;
        lastTime = performance.now();
        frame = requestAnimationFrame(animateHover);
      }
    }
    function moveByPage(sign) {
      stopCarousel();
      track.scrollBy({ left: sign * track.clientWidth * 0.85, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    previous.addEventListener('click', () => moveByPage(-1));
    next.addEventListener('click', () => moveByPage(1));
    carousel.addEventListener('pointermove', followPointer);
    carousel.addEventListener('pointerup', followPointer);
    carousel.addEventListener('pointerleave', () => { direction = 0; });
    ['pointercancel', 'pointerdown', 'focusin'].forEach(type => carousel.addEventListener(type, stopCarousel));
    carousel.addEventListener('wheel', stopCarousel, { passive: true });
    track.addEventListener('dragstart', event => event.preventDefault());
    track.addEventListener('pointerleave', () => { if (drag && !drag.active) drag = null; });
    track.addEventListener('pointerdown', event => {
      // Touch and trackpad gestures use the browser's native horizontal scrolling.
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, start: track.scrollLeft, active: false };
    });
    track.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      if (!drag.active && Math.abs(dx) > 8) { drag.active = true; track.setPointerCapture(event.pointerId); }
      if (drag.active) track.scrollLeft = drag.start - dx;
    });
    function finishDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.active) suppressClickUntil = performance.now() + 400;
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      drag = null;
    }
    track.addEventListener('pointerup', finishDrag);
    track.addEventListener('pointercancel', finishDrag);
    track.addEventListener('click', event => {
      if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    carousel.addEventListener('keydown', event => {
      stopCarousel();
      if (!(event.target === track || event.target.closest('.gallery-link')) || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      track.focus({ preventScroll: true });
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') moveByPage(event.key === 'ArrowLeft' ? -1 : 1);
      else track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('blur', stopCarousel);
    window.addEventListener('resize', () => { stopCarousel(); updateArrows(); });
    document.addEventListener('visibilitychange', stopCarousel);
    reducedMotion.addEventListener('change', stopCarousel);
    hoverPointer.addEventListener('change', stopCarousel);
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stopCarousel(); }).observe(carousel);
    updateArrows();
  }

  const filters = [...document.querySelectorAll('.filter-button')];
  const cards = [...document.querySelectorAll('#apps .app-row')];
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = category !== 'all' && card.dataset.category !== category; });
    document.getElementById('filter-status').textContent = cards.filter(card => !card.hidden).length + ' apps shown.';
  }));
  function revealLinkedApp() {
    const id = location.hash.slice(1);
    if (cards.some(card => card.id === id && card.hidden)) {
      document.querySelector('[data-filter="all"]').click();
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', revealLinkedApp);
  revealLinkedApp();
})();
