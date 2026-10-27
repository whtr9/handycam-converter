const CACHE_NAME = 'mts-converter-cache-v7';

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

// 1. Установка: скачиваем файлы в обход HTTP-кеша браузера и сразу активируем воркер
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const requests = ASSETS_TO_CACHE.map((url) => new Request(url, { cache: 'reload' }));
      return cache.addAll(requests);
    })
  );
});

// 2. Активация: удаляем все старые версии кеша и перехватываем управление открытыми вкладками
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

// 3. Гибридный перехват запросов
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('blob:')) {
    return;
  }

  const url = new URL(event.request.url);

  // А) Для тяжелой папки /vendor/ (~31 МБ) и иконок используем "Cache First" (экономия трафика и мгновенный старт)
  if (url.pathname.includes('/vendor/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // Б) Для HTML, CSS, JS и Manifest используем "Network First" (всегда свежая версия при наличии сети, офлайн-кеш без сети)
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        // Если сеть доступна и файл скачался — обновляем его копию в кеше и отдаем пользователю
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Если интернета нет — мгновенно отдаем сохраненную версию из кеша
        return caches.match(event.request);
      })
  );
});
