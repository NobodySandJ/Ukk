// nobodysandj/ukk/Ukk-7c6003e68c8bfcc1421a6e0fe28a09e9ec6fbf04/sw.js
const CACHE_NAME = 'mujoken-no-umi-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/gallery.html',
    '/cheki.html',
    '/dashboard.html',
    '/sk.html',
    '/css/style.css',
    '/css/modal.css',
    '/js/script.js',
    '/js/auth.js',
    '/js/cheki.js',
    '/js/dashboard.js',
    '/data.json',
    '/img/logo/android-chrome-192x192.png',
    '/img/logo/android-chrome-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});