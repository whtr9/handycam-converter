const CACHE_NAME = 'mts-converter-cache-v9';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './vendor/ffmpeg.js',
  './vendor/814.ffmpeg.js',
  './vendor/util.js',
  './vendor/ffmpeg-core.js',
  './vendor/ffmpeg-core.wasm'
];

// Очередь для файлов, переданных через системное меню "Поделиться"
let sharedFilesQueue = [];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const requests = ASSETS_TO_CACHE.map((url) => new Request(url, { cache: 'reload' }));
      return cache.addAll(requests);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 1. ПЕРЕХВАТ ФАЙЛОВ ИЗ МЕНЮ "ПОДЕЛИТЬСЯ" (POST-запрос)
  if (event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('mediaFiles');
          if (files && files.length > 0) {
            sharedFilesQueue = files;
          }
        } catch (err) {
          console.error('[SW] Ошибка чтения файла из Share Target:', err);
        }
        // После того как файлы сохранены в память воркера, перенаправляем на приложение
        return Response.redirect('./index.html?share-target=1', 303);
      })()
    );
    return;
  }

  // 2. СТАНДАРТНАЯ ОБРАБОТКА GET-ЗАПРОСОВ
  if (event.request.method !== 'GET' || event.request.url.startsWith('blob:')) {
    return;
  }

  const url = new URL(event.request.url);

  if (url.pathname.includes('/vendor/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// 3. ОТПРАВКА ПЕРЕХВАЧЕННЫХ ФАЙЛОВ В APP.JS ПО ЗАПРОСУ
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SHARED_FILES') {
    if (sharedFilesQueue.length > 0 && event.source) {
      event.source.postMessage({
        type: 'SHARED_FILES',
        files: sharedFilesQueue
      });
      sharedFilesQueue = [];
    }
  }
});
