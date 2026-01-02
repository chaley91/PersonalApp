// Service Worker for offline support and PWA functionality

const CACHE_NAME = 'calorie-tracker-v3';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/db.js',
    '/claude-service.js',
    '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.log('Cache install failed:', error);
            })
    );
});

// Fetch event - Network first, then cache for CSS and JS
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests and API calls
    if (!event.request.url.startsWith(self.location.origin) ||
        event.request.url.includes('anthropic.com') ||
        event.request.url.includes('netlify/functions')) {
        return;
    }

    // Network-first strategy for CSS and JS files
    if (event.request.url.endsWith('.css') ||
        event.request.url.endsWith('.js') ||
        event.request.url.endsWith('.html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache with new version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fall back to cache if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache-first for other resources
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match('/index.html');
                })
        );
    }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});
