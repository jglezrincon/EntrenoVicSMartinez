// Service worker: la app queda guardada en el móvil para usarla sin conexión en el rocódromo.
// El entreno (data/) se pide primero a la red para recibir versiones nuevas y,
// si no hay conexión, sale de la copia guardada.
const APP_VERSION = '1';
const SHELL = 'entreno-app-' + APP_VERSION;
const DATA = 'entreno-datos';
const SHELL_FILES = [
  './',
  'index.html',
  'styles.css',
  'figuras.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_FILES);
    try {
      const res = await fetch('data/entreno.json', { cache: 'no-store' });
      if (res.ok) await (await caches.open(DATA)).put('data/entreno.json', res);
    } catch (e) { /* sin red: se guardará al abrir la app */ }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('entreno-app-') && k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'activar') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/data/') || url.pathname.includes('/img/')) {
    // Red primero, copia guardada si no hay conexión.
    event.respondWith((async () => {
      const cache = await caches.open(DATA);
      const key = url.pathname;
      try {
        const res = await fetch(event.request, { cache: 'no-store' });
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch (e) {
        const hit = await cache.match(key);
        return hit || new Response('', { status: 503 });
      }
    })());
    return;
  }

  // App: copia guardada primero.
  event.respondWith((async () => {
    const hit = await caches.match(event.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(event.request);
    } catch (e) {
      if (event.request.mode === 'navigate') return caches.match('index.html');
      throw e;
    }
  })());
});
