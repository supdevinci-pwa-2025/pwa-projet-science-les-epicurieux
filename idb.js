export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sciencesDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('sciences', { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function addscience(science) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sciences', 'readwrite');
      tx.objectStore('sciences').add(science);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
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