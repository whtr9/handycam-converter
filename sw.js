const CACHE_NAME = 'mts-converter-cache-v8.1';

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

// Временное хранилище для файлов из меню "Поделиться"
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
  // ПЕРЕХВАТ WEB SHARE TARGET (POST-запросы)
  if (event.request.method === 'POST' && event.request.url.includes(self.registration.scope)) {
    event.respondWith(Response.redirect('./')); // Мгновенный редирект на главную (убираем ошибку 405)
    
    event.waitUntil(async function() {
      try {
        const formData = await event.request.formData();
        const files = formData.getAll('mediaFiles'); // Извлекаем файлы по имени из manifest.json
        if (files && files.length > 0) {
          sharedFilesQueue = files; // Сохраняем файлы в память воркера
        }
      } catch (e) {
        console.error("Ошибка при обработке файлов из меню Поделиться:", e);
      }
    }());
    return;
  }

  // СТАНДАРТНАЯ ГИБРИДНАЯ МАРШРУТИЗАЦИЯ GET-ЗАПРОСОВ
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

// ПРОСЛУШИВАТЕЛЬ СООБЩЕНИЙ ОТ APP.JS
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SHARED_FILES') {
    if (sharedFilesQueue.length > 0) {
      // Отправляем файлы обратно на страницу приложения
      event.source.postMessage({ type: 'SHARED_FILES', files: sharedFilesQueue });
      sharedFilesQueue = []; // Очищаем очередь
    }
  }
});
