const CACHE_NAME = 'mts-converter-cache-v2';

// Полный список ресурсов для автономной работы (включая ядро FFmpeg ~31 МБ)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './vendor/ffmpeg.js',
  './vendor/814.ffmpeg.js',
  './vendor/util.js',
  './vendor/ffmpeg-core.js',
  './vendor/ffmpeg-core.wasm'
];

// 1. Установка Service Worker и сохранение всех файлов в Cache Storage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Кеширование файлов приложения и ядра FFmpeg...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Активируем воркер сразу, не дожидаясь закрытия вкладок
      return self.skipWaiting();
    })
  );
});

// 2. Активация и удаление устаревших версий кеша (если изменится CACHE_NAME)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Удаление старого кеша:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Берем под контроль все открытые вкладки приложения
      return self.clients.claim();
    })
  );
});

// 3. Перехват сетевых запросов по стратегии Cache First
self.addEventListener('fetch', (event) => {
  // Обрабатываем только GET-запросы и игнорируем временные blob-ссылки скачивания
  if (event.request.method !== 'GET' || event.request.url.startsWith('blob:')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
