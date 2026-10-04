const CACHE_PREFIX = "kilimanjaro-chess-";
const CACHE_NAME = `${CACHE_PREFIX}v2.2-angular-king`;
const APP_SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg",
  "./pieces/NOTICE.txt", "./pieces/COPYING.txt",
  ...["w", "b"].flatMap(color => ["K", "Q", "R", "B", "N", "P"].map(piece => `./pieces/${color}${piece}.svg`)),
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch (error) {
        if (event.request.mode === "navigate") return cache.match("./index.html");
        throw error;
      }
    }),
  );
});
