importScripts("./offline.js");
const CACHE_PREFIX = ChessOffline.scopePrefix(self.registration.scope);
const APP_VERSION = "1.1.0";
const CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;
const APP_SHELL = ChessOffline.APP_SHELL;

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

self.addEventListener("message", event => {
  if (event.data?.type !== "CHESS_OFFLINE_CHECK" || !event.ports[0]) return;
  event.waitUntil(ChessOffline.inspectCache(caches, CACHE_NAME, self.registration.scope)
    .then(missing => event.ports[0].postMessage({ version: APP_VERSION, scope: self.registration.scope, missing }))
    .catch(() => event.ports[0].postMessage({ error: true })));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.registration.scope)) return;
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
