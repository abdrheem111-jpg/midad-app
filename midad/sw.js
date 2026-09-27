/* عامل الخدمة: يجعل مِداد يعمل دون اتصال بعد أول فتح */
const CACHE = 'midad-v13';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './css/style.css',
  './assets/fonts/Almarai-400-arabic.woff2',
  './assets/fonts/Almarai-400-latin.woff2',
  './assets/fonts/Almarai-700-arabic.woff2',
  './assets/fonts/Almarai-700-latin.woff2',
  './assets/fonts/Cairo-arabic.woff2',
  './assets/fonts/Cairo-latin.woff2',
  './assets/fonts/NotoNaskhArabic-arabic.woff2',
  './assets/fonts/NotoNaskhArabic-latin.woff2',
  './assets/fonts/ReemKufi-600-arabic.woff2',
  './assets/fonts/ReemKufi-600-latin.woff2',
  './assets/fonts/Tajawal-400-arabic.woff2',
  './assets/fonts/Tajawal-400-latin.woff2',
  './assets/fonts/Tajawal-700-arabic.woff2',
  './assets/fonts/Tajawal-700-latin.woff2',
  './assets/fonts/fonts.css',
  './js/core.js',
  './js/math-engine.js',
  './js/math-plus.js',
  './js/board.js',
  './js/visual.js',
  './js/circle.js',
  './js/geo-extra.js',
  './js/plot.js',
  './js/curvefit.js',
  './js/shape-rec.js',
  './js/netfold.js',
  './js/view3d.js',
  './js/solids.js',
  './js/space3d-math.js',
  './js/space3d.js',
  './js/shapes2d.js',
  './js/overlays.js',
  './js/ink-data.js',
  './js/ink-hand.js',
  './js/ink.js',
  './js/ink-ui.js',
  './js/assist-core.js',
  './js/float3d.js',
  './js/assist.js',
  './js/modes.js',
  './js/practice.js',
  './js/skills.js',
  './js/curriculum.js',
  './js/pedagogy.js',
  './js/qcard.js',
  './js/ai.js',
  './js/nlu.js',
  './js/panels/curriculum.js',
  './js/panels/algebra.js',
  './js/panels/geometry.js',
  './js/panels/lab.js',
  './js/panels/numbers.js',
  './js/panels/stats.js',
  './js/panels/tutor.js',
  './js/panels/practice-panel.js',
  './js/vendor/pico.js',
  './js/vendor/facefinder.js',
  './js/camera-picker.js',
  './js/panels/classroom.js',
  './js/app.js',
  './js/board-ux.js',
  './js/install.js',
  './js/onboarding.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // الملفات المحلية: الشبكة أولاً ثم النسخة المخزنة (لتصل التحديثات)
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
  }
});
