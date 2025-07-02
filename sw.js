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
  '/idb.js',
  '/sw.js',
  '/manifest.json',
  '/assets/manifest-icon-192.maskable.png',
  'assets/manifest-icon-512.maskable.png'
];
// ============ IndexedDB ==============
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sciencesDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sciences')) {
        const store = db.createObjectStore('sciences', { keyPath: 'id' });
        // Index optionnel pour rechercher par timestamp
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPending() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sciences'], 'readonly');
    const store = transaction.objectStore('sciences');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        // Filtre seulement les sciences non synchronisés, qui resteront en cache
        const pendingsciences = request.result.filter(science => !science.synced);
        resolve(pendingsciences);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Erreur getAllPending:', error);
    return [];
  }
}

async function savePendingscience(scienceData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sciences'], 'readwrite');
    const store = transaction.objectStore('sciences');
    
    return new Promise((resolve, reject) => {
      const request = store.add(scienceData);
      request.onsuccess = () => {
        console.log('✅ science sauvegardé hors ligne:', scienceData.name);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('❌ Erreur sauvegarde:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Erreur savePendingscience:', error);
    throw error;
  }
}

async function deletePendingscience(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sciences'], 'readwrite');
    const store = transaction.objectStore('sciences');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('✅ science supprimé après sync:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Erreur deletePendingscience:', error);
    throw error;
  }
}

async function notifyClients(type, data) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type, data });
    });
  } catch (error) {
    console.error('❌ Erreur notification clients:', error);
  }
}


// ================ Service worker installation activate fetch and sync =======================
self.addEventListener('install', event => { 
  console.log(' Service Worker installé');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Mise en cache des fichiers :', FILES_TO_CACHE);
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); 
});
 
self.addEventListener('activate', event => { 
  console.log(' Service Worker activé');

  event.waitUntil(
    caches.keys().then(keys => {
        return Promise.all(
            keys.filter(k=>k!==CACHE_NAME)
            .map(k=> caches.delete(k))
        )
    })
  )
  self.clients.claim(); 
});


self.addEventListener('fetch', event => {
  console.log('🛰 Fetch:', event.request.method,event.request.url);
 
  event.respondWith( 
    caches.match(event.request) 
      .then(res => res || fetch(event.request)) 
  );
});

self.addEventListener('sync', (event) => {
  console.log('📡 Sync déclenchée pour:', event.tag);
  if (event.tag === 'sync-science') {
    event.waitUntil(syncScience()); 
  }
});



async function syncScience() {
  const pending = await getAllPending();
  console.log(`🔄 Tentative de sync de ${pending.length} sciences`);
  
  for (const science of pending) {
    try {
      const response = await fetch('https://jocular-lollipop-881003.netlify.app//.netlify/functions/science', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
          name: science.name,
          role: science.role,
        })
      });
      
      if (response.ok) {
        await deletePendingscience(science.id);
        await notifyClients('science-synced', science);
        console.log('✅ science synchronisé:', science.name);
      } else {
        console.error(`❌ Erreur sync ${science.name}: ${response.status}`);
      }
    } catch (err) {
      console.error(`❌ Sync failed for ${science.name}:`, err);
    }
  }
}


