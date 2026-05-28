const CACHE = "card-rush-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/src/constants.js",
  "/src/gameLogic.js",
  "/src/CardFace.jsx",
  "/src/ColorPicker.jsx",
  "/src/LoadingScreen.jsx",
  "/src/LandingScreen.jsx",
  "/src/HomeScreen.jsx",
  "/src/EndScreen.jsx",
  "/src/GameScreen.jsx",
  "/src/App.jsx",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
