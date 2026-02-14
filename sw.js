const CACHE_NAME = "dpska-static-v6";
const CORE_ASSETS = [
  "index.html",
  "about.html",
  "leadership.html",
  "academics.html",
  "gallery.html",
  "admissions.html",
  "contact.html",
  "declaration.html",
  "ACTION_PLAN.md",
  "manifest.webmanifest",
  "logo.png",
  "school-banner.png",
  "assets/brand/logo-mark.png",
  "assets/brand/icon-192.png",
  "assets/brand/icon-512.png",
  "assets/gallery/gallery_manifest.json",
  "css/shared.css",
  "css/home.css",
  "css/about.css",
  "css/leadership.css",
  "css/academics.css",
  "css/gallery.css",
  "css/admissions.css",
  "css/contact.css",
  "css/declaration.css",
  "js/shared.js",
  "js/home.js",
  "js/about.js",
  "js/leadership.js",
  "js/academics.js",
  "js/gallery.js",
  "js/admissions.js",
  "js/contact.js",
  "js/declaration.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }

            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("index.html");
          }

          return cached;
        });

      return cached || networkFetch;
    })
  );
});
