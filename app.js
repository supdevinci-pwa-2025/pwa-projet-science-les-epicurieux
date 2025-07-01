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

let people = JSON.parse(localStorage.getItem("scienceData")) || [];

function addPerson() {
  const nameInput = document.getElementById("personName");
  const roleInput = document.getElementById("personRole");
  const name = nameInput.value.trim();
  const role = roleInput.value;

  if (name === "") {
    alert("Veuillez entrer un nom.");
    return;
  }

  const newPerson = { name, role };
  people.push(newPerson);
  localStorage.setItem("scienceData", JSON.stringify(people));
  nameInput.value = "";
  displayPeople();
}

function displayPeople() {
  const list = document.getElementById("peopleList");
  list.innerHTML = "";

  let count = { "total": 0, "Chimie": 0, "Robotique": 0, "Électricité": 0 };

  people.forEach(({
    name, role
  }, index) => {
    const div = document.createElement("div");
    div.className = "person";
    div.innerHTML = `<span>${name} – ${role}</span><button onclick="removePerson(${index})">❌</button>`;
    list.appendChild(div);
    count.total++;
    count[role]++;
  });

  document.getElementById("total").textContent = count.total;
  document.getElementById("chimie").textContent = count["Chimie"];
  document.getElementById("robotique").textContent = count["Robotique"];
  document.getElementById("électricité").textContent = count["Électricité"];
 
}

function removePerson(index) {
  people.splice(index, 1);
  localStorage.setItem("scienceData", JSON.stringify(people));
  displayPeople();
}

displayPeople();

navigator.serviceWorker.ready.then(reg => {
  reg.sync.register('sync-science') // indice: méthode pour enregistrer une sync
    .then(() => console.log('📡 Sync enregistrée'))
    .catch(err => console.error('❌ Erreur sync:', err));
});

