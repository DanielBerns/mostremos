const CACHE_NAME = 'reportes-ciudadanos-v7';

// All the static files our app needs to run offline
const ASSETS_TO_CACHE = [
    '/',
'/index.html',
'/js/app.js',
'/js/categories.js',
'https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js',
'https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css'
];

// 1. Install Event: Download and cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache and caching assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. Activate Event: Clean up old caches if we update the version
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch Event: Serve from cache if offline, otherwise go to network
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests (HTML, JS, CSS).
    // We explicitly DO NOT intercept POST requests (our image uploads)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return the cached file if we have it
            if (cachedResponse) {
                return cachedResponse;
            }
            // Otherwise, fetch from the network
            return fetch(event.request);
        })
    );
});
