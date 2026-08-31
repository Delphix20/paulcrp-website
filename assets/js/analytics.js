(function () {
  'use strict';

  var measurementId = 'G-P6Y986ZLW2';
  var loaded = false;

  function loadAnalytics() {
    if (loaded) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, { transport_type: 'beacon' });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function loadOnIntent() {
    loadAnalytics();
    ['pointerdown', 'keydown', 'scroll'].forEach(function (eventName) {
      window.removeEventListener(eventName, loadOnIntent);
    });
  }

  ['pointerdown', 'keydown', 'scroll'].forEach(function (eventName) {
    window.addEventListener(eventName, loadOnIntent, { once: true, passive: true });
  });

  window.addEventListener('load', function () {
    window.setTimeout(loadAnalytics, 8000);
  }, { once: true });
})();
