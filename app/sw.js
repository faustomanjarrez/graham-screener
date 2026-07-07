/* Graham Screener — service worker (offline-first, actualizaciones atómicas) */
const CACHE = 'graham-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './i18n.js',
  './data.js',
  './manifest.json',
  './privacidad.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  // cache:'reload' salta el caché HTTP — garantiza que la instalación
  // trae todos los archivos frescos y consistentes del servidor
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estrategia:
// - data.js: cache-first con revalidación en segundo plano (los datos cambian a diario
//   sin que cambie la app; la app además compara fechas vía localStorage).
// - Resto del app-shell: SOLO lo que se cacheó en la instalación. Así una versión nueva
//   de la app llega completa (nuevo sw.js → reinstalación atómica) y nunca a medias.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isData = url.pathname.endsWith('/data.js');

  e.respondWith(
    caches.match(e.request, { ignoreSearch: isData }).then((cached) => {
      if (isData) {
        const fetched = fetch(e.request)
          .then((resp) => {
            if (resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || fetched;
      }
      return cached || fetch(e.request);
    })
  );
});
