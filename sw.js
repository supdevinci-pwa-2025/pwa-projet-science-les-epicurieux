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

  event.waitUntil(
    caches.keys().then(keys => {
        return Promise.all(
            keys.filter(k=>k!==CACHE_NAME)
            .map(k=> caches.delete(k))// supprime les vieux caches
        )
    })
  )
  self.clients.claim(); // indice: prendre le contrôle des pages ouvertes
});

//  FETCH : servir depuis le cache
 
// Intercepter les requêtes pour servir depuis le cache
self.addEventListener('fetch', event => {
  console.log('🛰 Fetch:', event.request.method,event.request.url);
 
  event.respondWith( // indice: permet de renvoyer une réponse custom
    caches.match(event.request) // cherche dans le cache
      .then(res => res || fetch(event.request)) // si pas trouvé, va le chercher en ligne
  );
});
 

