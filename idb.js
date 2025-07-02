export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('snacksDB', 3); // Même version que SW

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Ne pas supprimer - juste créer si n'existe pas
      if (!db.objectStoreNames.contains('snacks')) {
        const store = db.createObjectStore('snacks', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function addScience(science) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const snackData = {
        id: Date.now().toString(), // Même format que SW
        name: snack.name,
        rolr: snack.role,
        timestamp: new Date().toISOString(),
        synced: false // Marquer comme non synchronisé
      };
      
      const tx = db.transaction('sciences', 'readwrite');
      const request = tx.objectStore('sciences').add(snackData);
      
      request.onsuccess = () => resolve(snackData);
      request.onerror = () => reject(request.error);
    });
  });
}

export function getAllsciences() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sciences', 'readonly');
      const store = tx.objectStore('sciences');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function getPendingSciencesFromIndexedDB() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sciences', 'readonly');
      const store = tx.objectStore('sciences');
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result;
        const pendingOnly = all.filter(item => item.pending === true);
        resolve(pendingOnly);
      };
      request.onerror = () => reject(request.error);
    });
  });
}