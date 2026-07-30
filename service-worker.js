const CACHE_NAME = 'ugoki-check-sporolab-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// 外部CDN（Tailwind / Font Awesome / Google Fonts）もオフラインで
// 動くようにキャッシュしておく
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // アプリ本体は必須キャッシュ
      const appShellPromise = cache.addAll(APP_SHELL);
      // CDNは失敗しても致命的にしない（no-corsで取得を試みる）
      const cdnPromises = CDN_ASSETS.map((url) =>
        fetch(url, { mode: 'no-cors' })
          .then((res) => cache.put(url, res))
          .catch(() => {})
      );
      return Promise.all([appShellPromise, ...cdnPromises]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// キャッシュ優先、無ければネットワーク、取れたら更新
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
