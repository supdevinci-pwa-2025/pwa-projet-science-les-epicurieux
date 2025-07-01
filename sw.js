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


/**
* Fonction asynchrone de synchronisation des sciences
* Cette fonction :
* - récupère tous les sciences stockés localement (dans IndexedDB) qui n'ont pas encore été envoyés au serveur,
* - les envoie un par un via une requête HTTP POST en JSON à une API serveur,
* - supprime localement les sciences qui ont bien été reçus par le serveur,
* - notifie les autres onglets/pages ouvertes du succès ou des erreurs,
* - affiche un rapport de la synchronisation à la fin,
* - gère proprement les erreurs réseau et serveur.
*/
async function syncScience() {
  // Log dans la console pour indiquer le début de la synchronisation
  console.log('🔄 Début de la synchronisation...');
 
  try {
    // 1️⃣ Récupération des sciences en attente dans IndexedDB (base locale du navigateur)
    // getAllPending() est une fonction asynchrone qui retourne un tableau de sciences non synchronisés
    const pending = await getAllPending();
    console.log(`📊 ${pending.length} participants(s) à synchroniser`);
 
    // Si aucun science à synchroniser, on sort directement de la fonction (pas besoin de faire plus)
    if (pending.length === 0) {
      console.log('✅ Aucune sciences en attente');
      return;  // Fin de la fonction ici
    }
 
    // 2️⃣ Initialisation de compteurs pour suivre succès/échecs
    let success = 0, fail = 0;
    // Tableau pour garder les sciences qui n'ont pas pu être synchronisés, avec détail de l'erreur
    const failedSciences = [];
 
    // 3️⃣ Boucle asynchrone pour traiter chaque science un par un
    for (const science of pending) {
      try {
        console.log('🚀 Tentative de synchro pour :', science.name);
 
        // Récupération de l'URL de l'API via une fonction dédiée pour gérer différents environnements (local, prod...)
        const apiUrl = getApiUrl();
        console.log('🌐 URL API utilisée:', apiUrl);
 
        // Envoi de la requête HTTP POST vers l'API
        // fetch() est une API JavaScript moderne pour faire des requêtes HTTP asynchrones
        // Ici on envoie les données au format JSON (headers et body)
        const response = await fetch(apiUrl, {
          method: 'POST',               // Méthode HTTP POST pour envoyer des données
          headers: {                   // En-têtes HTTP pour indiquer le type de contenu
            'Content-Type': 'application/json', // Le corps de la requête est en JSON
            'Accept': 'application/json'        // On attend une réponse en JSON
          },
          body: JSON.stringify({       // Conversion des données JavaScript en chaîne JSON
            name: science.name,          // Propriété 'name' du science
            role: science.role,          // Propriété 'mood' du science (ex: humeur)
          })
        });
 
        // Log du statut HTTP reçu : status est un entier (ex: 200), statusText est une description (ex: OK)
        console.log('📊 Réponse serveur:', response.status, response.statusText);
 
        if (response.ok) {
          // Si le serveur répond avec un code HTTP 2xx (succès), on considère la synchro réussie
          console.log('✅ Science synchronisé :', science.name);
 
          // Suppression du science de IndexedDB pour éviter les doublons à l'avenir
          // deletePendingscience() est une fonction asynchrone qui supprime par identifiant
          await deletePending(science.id);
 
          // Notification aux autres onglets/pages que ce science a été synchronisé
          // Utile pour mettre à jour l'affichage en temps réel dans plusieurs fenêtres
          await notifyClients('science-synced', { science });
 
          success++; // Incrémentation du compteur de succès
        } else {
          // Si la réponse HTTP est autre que 2xx (ex: erreur 404, 500)
          // On tente de lire le corps de la réponse pour récupérer un message d'erreur
          const errorText = await response.text().catch(() => 'Erreur inconnue');
 
          // Log détaillé de l'erreur serveur
          console.error(`❌ Erreur serveur ${response.status} pour : ${science.name}`, errorText);
 
          // On ajoute ce science à la liste des sciences ayant échoué la synchro, avec le message d'erreur
          failedSciences.push({ science: science.name, error: `${response.status}: ${errorText}` });
 
          fail++; // Incrémentation du compteur d'échecs
        }
 
      } catch (err) {
        // Gestion des erreurs liées au réseau (ex: pas d'accès Internet, timeout)
        console.error(`❌ Erreur réseau pour : ${science.name}`, err.message);
 
        // On garde aussi trace de ces erreurs dans le tableau des échecs
        failedSciences.push({ science: science.name, error: err.message });
 
        fail++; // Incrémentation du compteur d'échecs
      }
    }
 
    // 4️⃣ Après traitement de tous les sciences, on affiche un bilan clair
    console.log(`📈 Sync terminée : ${success} succès / ${fail} échecs`);
 
    // Si certains sciences n'ont pas pu être synchronisés, on affiche la liste avec erreurs
    if (failedSciences.length > 0) {
      console.log('❌ sciences échoués:', failedSciences);
    }
 
    // Notification générale aux autres onglets/pages que la synchronisation est terminée
    // On transmet le nombre de succès, d'erreurs, et les détails des échecs
    await notifyClients('sync-completed', { 
      success, 
      errors: fail, 
      failedSciences: failedSciences 
    });
 
  } catch (e) {
    // Gestion d'erreurs globales pouvant survenir dans tout le bloc try (ex: erreur IndexedDB)
    console.error('💥 Erreur globale dans syncSciences :', e);
 
    // Notification des autres onglets/pages qu'il y a eu une erreur globale
    await notifyClients('sync-error', { error: e.message });
 
    // Relance de l'erreur pour que le code qui a appelé syncsciences puisse aussi la gérer
    throw e;
  }
}
 
/**
* Fonction utilitaire pour déterminer dynamiquement l'URL de l'API en fonction de l'environnement
* ----------------------------------------------------------------------------------------------
* Utilise l'objet URL et self.location.href pour récupérer l'URL complète de la page courante
* Puis analyse le hostname pour retourner :
* - une URL locale pour localhost/127.0.0.1,
* - une URL adaptée pour Netlify (fonctions serverless),
* - une URL de production par défaut.
*/
function getApiUrl() {
  // Création d'un objet URL pour analyser proprement l'URL courante
  const currentUrl = new URL(self.location.href);
  // Si on est en local (dev sur machine locale)
  if (currentUrl.hostname === 'localhost' || currentUrl.hostname === '127.0.0.1') {
    // Retourne l'URL locale pour l'API, sur le même port que le front-end
    return `${currentUrl.origin}/api/science`;
  }
  // Si on est déployé sur Netlify (URL contenant "netlify.app")
  if (currentUrl.hostname.includes('netlify.app')) {
    // Retourne l'URL de la fonction serverless hébergée sur Netlify
    return `${currentUrl.origin}/.netlify/functions/science`;
  }
  // Sinon on retourne une URL de production fixe (exemple : site Netlify principal)
  return 'https://jocular-lollipop-881003.netlify.app//.netlify/functions/science';
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
