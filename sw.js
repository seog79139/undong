// 오프라인 캐시. 파일을 고치면 VERSION을 올린다.
// 인터넷이 되면 항상 새 파일을 받고(네트워크 먼저), 안 되면 저장본을 쓴다.
const VERSION = 'undong-v6';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/vendor/three.min.js', 'js/data-gym.js', 'js/data-exercises.js', 'js/anatomy.js', 'js/data-foods.js', 'js/data-diet.js', 'js/data-lines.js',
  'js/ui-art.js', 'js/body3d.js', 'js/core.js', 'js/views.js', 'js/views2.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  // 브라우저 HTTP 캐시를 건너뛰고 서버에서 직접 받는다
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  if (!same && url.hostname !== 'cdn.jsdelivr.net') return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    try {
      const res = await fetch(same ? new Request(req, { cache: 'no-cache' }) : req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: same });
      return hit || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }
  }));
});
