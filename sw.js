// <!-- Écouter l'installation du SW -->
const CACHE_NAME = 'science-cacahe'; // nom du cache
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/open.html',
  '/random.html',
  '/share.html',
  '/style.css',
  '/app.js',
  '/sw.js',
  '/manifest.json',
  '/assets/manifest-icon-192.maskable.png',
  'assets/manifest-icon-512.maskable.png'
];

self.addEventListener('install', event => { // indice: quand le SW est installé
  console.log(' Service Worker installé');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Mise en cache des fichiers :', FILES_TO_CACHE);
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // indice: forcer à prendre le contrôle immédiatement
});
 
// <!-- Écouter l'activation du SW -->
self.addEventListener('activate', event => { // indice: quand le SW devient actif
  console.log(' Service Worker activé');
  self.clients.claim(); // indice: prendre le contrôle des pages ouvertes
});

