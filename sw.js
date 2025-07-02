// <!-- Écouter l'installation du SW -->
const CACHE_NAME = 'science-cache'; // nom du cache
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
    const request = indexedDB.open('sciencesDB', 3);

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
 
self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activation');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});


self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'POST' && (url.pathname.includes('/api/science') || url.pathname.includes('/.netlify/functions/science'))) {
    event.respondWith(handlescienceSubmission(request));
    return;
  }

  if (request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      caches.match('./index.html').then(res => res || fetch(request).catch(() => caches.match('./offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(res => 
      res || fetch(request).then(fetchRes => {
        if (fetchRes.ok) {
          const resClone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
        }
        return fetchRes;
      }).catch(() => caches.match('./offline.html'))
    )
  );
});

// ============ HANDLE science SUBMISSION ==============
async function handlescienceSubmission(request) {
  console.log('🔥 handlescienceSubmission appelée');
  
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      console.log('✅ Requête en ligne réussie');
      return response;
    }
    throw new Error(`Erreur ${response.status}`);
  } catch (error) {
    console.log('📱 Mode hors ligne détecté, sauvegarde locale...');
    
    try {
      const formData = await request.formData();
      console.log('📝 FormData récupérée:', {
        name: formData.get('name'),
        role: formData.get('role')
      });
      
      const scienceData = {
        id: Date.now().toString(),
        name: formData.get('name') || formData.get('science'),
        role: formData.get('role') || formData.get('role'),
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      console.log('💾 Données à sauvegarder:', scienceData);
      
      await savePendingscience(scienceData);
      console.log('✅ savePendingscience terminé');
      
      if ('sync' in self.registration) {
        await self.registration.sync.register('sync-sciences');
        console.log('🔄 Background sync enregistré');
      }
      
      await notifyClients('science-saved-offline', scienceData);
      console.log('📱 Clients notifiés');
      
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'science sauvegardé hors ligne'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (saveError) {
      console.error('❌ Erreur lors de la sauvegarde:', saveError);
      throw saveError;
    }
  }
}

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

// ============ BACKGROUND SYNC ==============
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sciences') {
    event.waitUntil(syncsciences());
  }
});

async function syncsciences() {
  const pending = await getAllPending();
  console.log(`🔄 Tentative de sync de ${pending.length} sciences`);
  
  for (const science of pending) {
    try {
      const response = await fetch('https://jocular-lollipop-881003.netlify.app/.netlify/functions/science', {
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

// ============ PUSH ==============
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "science'n'Track 🍉";
  const options = {
    body: data.body || "Nouvelle notification",
    icon: "./assets/manifest-icon-192.maskable.png",
    badge: "./assets/manifest-icon-192.maskable.png"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

