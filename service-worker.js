const CACHE_VERSION = 'v12';
const CACHE_NAME = `my-app-cache-${CACHE_VERSION}`;

const urlsToCache = [
    '/',
    '/index.html',
    '/index.js',
    '/bootstrap.min.css',
    '/icon-512x512.png',
    '/manifest.json'
];

// Install the service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Cache and update with stale-while-revalidate strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    // Return response if found in cache
                    return response;
                }
                // Fetch from network and cache the response
                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
    );
});

// Activate the service worker and remove old cache
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});