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

self.addEventListener('sync', (event) => {
  console.log('📡 Sync déclenchée pour:', event.tag);
  if (event.tag === 'sync-science') { // indice: le même tag que plus haut
    event.waitUntil(syncScience()); // indice: dire "attends la fin de cette promesse"
  }
});


async function syncScience() {
  console.log('📡 Début de la synchronisation...');
 
  // 1️⃣ Lire la liste des participants en attente
  const pending = await getAllPending(); // indice: fonction qui lit IndexedDB
  console.log(`📊 ${pending.length} science(s) à synchroniser`);
 
  let success = 0;
  let fail = 0;
 
  // 2️⃣ Boucle principale
  for (const science of pending) {
    try {
      console.log(`🚀 Envoi de ${science.name}`); // indice: propriété du science à afficher
 
      const response = await fetch('/api/sync-science/', { // indice: URL de votre API
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: science.name,     // indice: nom 
          role: science.role,    // indice: role
        })
      });
 
      if (response.ok) {
        console.log(`✅ Science synchronisé : ${science}`);
 
        await deletePending(science.id); // indice: supprime de IndexedDB
        await notifyClients('participant-synced', { science }); // indice: notifie les clients
        success++;
      } else {
        console.log(response);
        console.error(`❌ Erreur serveur ${response.status} pour ${science.name}`);
        fail++;
      }
 
    } catch (err) {
      console.error(`❌ Erreur réseau pour ${science.name}: ${err.message}`);
      fail++;
    }
  }
 
  // 3️⃣ Bilan final
  console.log(`✅ ${success} sciences synchronisés, ❌ ${fail} échecs`);
}


function getAllPending() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending-science', 'readonly');
      const store = tx.objectStore('pending-science');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
} 

function deletePending(id) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending-science', 'readwrite');
      const store = tx.objectStore('pending-science');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function notifyClients(eventName, data) {
  return self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: eventName,
        payload: data
      });
    });
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('science-db', 1); // version 1

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-science')) {
        db.createObjectStore('pending-science', {
          keyPath: 'id',
          autoIncrement: true
        });
        console.log('📁 Object store "pending-science" créé');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

