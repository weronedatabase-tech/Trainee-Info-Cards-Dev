const CACHE_NAME = 'trainee-info-cache-v7';
const urlsToCache = [
 '/',
 '/index.html',
 '/manifest.json',
 '/backend/config.js',
 '/frontend/css/style.css',
 '/frontend/js/api.js',
 '/frontend/js/ui.js',
 '/frontend/js/auth.js',
 '/frontend/js/viewer.js',
 '/frontend/js/admin.js',
 '/frontend/js/app.js'
];

self.addEventListener('install', event => {
 event.waitUntil(
   caches.open(CACHE_NAME)
     .then(cache => cache.addAll(urlsToCache))
 );
});

self.addEventListener('fetch', event => {
 event.respondWith(
   caches.match(event.request)
     .then(response => {
       if (response) return response;
       return fetch(event.request);
     })
 );
});