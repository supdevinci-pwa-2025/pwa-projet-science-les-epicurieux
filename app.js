if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
  .then((reg) => {
    // registration worked
    console.log('Enregistrement réussi');
  }).catch((error) => {
    // registration failed
    console.log('Erreur : ' + error);
  });
}
navigator.serviceWorker.ready.then(reg => {
  reg.sync.register('sync-science') 
    .then(() => console.log('📡 Sync enregistrée'))
    .catch(err => console.error('❌ Erreur sync:', err));
});


const scienceList = document.querySelector('#scienceList');
let sciences = [];


// ============ GESTION DU FORMULAIRE ============
function setupForm() {
  const form = document.querySelector('#science-form');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.querySelector('#science-name').value.trim();
    const role = document.querySelector('#science-role').value.trim();
    
    if (!name || !role) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    console.log('📝 Envoi du science:', { name, role });
    
    try {
      // Créer FormData pour l'envoi
      const formData = new FormData();
      formData.append('name', name);
      formData.append('role', role);
      
      // Envoyer vers l'API (intercepté par le SW si hors ligne)
      const response = await fetch('/api/science', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log('✅ Réponse:', result);
      
      if (result.offline) {
        showMessage('📱 science sauvegardé hors ligne !', 'warning');
      } else {
        showMessage('✅ science ajouté avec succès !', 'success');
        // Ajouter à la liste locale immédiatement
        addscienceToUI(name, role);
      }
      
      form.reset();
      
    } catch (error) {
      console.error('❌ Erreur soumission:', error);
      showMessage('❌ Erreur lors de l\'ajout', 'error');
    }
  });
}


// ============ CHARGEMENT DES scienceS ============
async function loadsciences() {
  try {
    // Essayer de charger depuis l'API
    const response = await fetch('https://jocular-lollipop-881003.netlify.app/.netlify/functions/science');
    console.log(sciences.length)
    if (response.ok) {
      const data = await response.json();
      sciences = data.sciences || [];
      console.log('✅ sciences chargés depuis l\'API:', sciences.length);
    } else {
      throw new Error('API non disponible');
    }
  } catch (error) {
    console.log('📱 API non disponible, chargement depuis localStorage');
    // Fallback sur localStorage
    sciences = JSON.parse(localStorage.getItem('sciences')) || [];
  }
  
  // Afficher les sciences
  sciences.forEach(science => addscienceToUI(science.name, science.role));
}

// ============ AFFICHAGE UI ============
function addscienceToUI(name, role) {
  const li = document.createElement('li');
  li.textContent = `🍪 ${name} (${role})`;
  li.className = 'science-item';
  scienceList.appendChild(li);
}

function showMessage(message, type = 'info') {
  // Créer un élément de notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Styles basiques
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    ${type === 'success' ? 'background: #4CAF50;' : ''}
    ${type === 'warning' ? 'background: #FF9800;' : ''}
    ${type === 'error' ? 'background: #f44336;' : ''}
  `;
  
  document.body.appendChild(notification);
  
  // Supprimer après 3 secondes
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ============ BOUTON TEST SYNC ============
document.addEventListener('DOMContentLoaded', () => {
  setupForm();
  setupServiceWorkerListener();
  loadsciences();
  const syncButton = document.querySelector('[data-action="sync"]');
  
  syncButton?.addEventListener('click', async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-sciences');
        console.log('🔄 Background sync déclenché manuellement');
        showMessage('🔄 Synchronisation déclenchée', 'info');
      } catch (error) {
        console.error('❌ Erreur sync:', error);
        showMessage('❌ Erreur de synchronisation', 'error');
      }
    } else {
      showMessage('❌ Background Sync non supporté', 'error');
    }
  });
});





function saveToPendingScience(science) {
  const request = indexedDB.open('science-db', 1);

  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('pending-science', 'readwrite');
    const store = tx.objectStore('pending-science');
    store.add(science);
  };

  request.onerror = () => {
    console.error('❌ Erreur d\'ouverture IndexedDB');
  };
}

function setupServiceWorkerListener() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      console.log('📱 Message du SW:', type, data);
      
      switch (type) {
        case 'science-saved-offline':
          console.log('📱 science sauvegardé hors ligne:', data);
          people.push(data);
          showMessage(`📱 ${data.name} sauvegardé hors ligne`, 'warning');
          break;
          
        case 'science-synced':
          console.log('🔄 science synchronisé:', data);
          showMessage(`🔄 ${data.name} synchronisé !`, 'success');
          break;
      }
    });
  }
}
// ============ SAUVEGARDE DE SECOURS ============
function backupToLocalStorage() {
  localStorage.setItem('sciences', JSON.stringify(sciences));
}
setInterval(backupToLocalStorage, 30000);

