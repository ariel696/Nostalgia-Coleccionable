/* Ranking público de coleccionistas. */
(function () {
  const seccion = document.getElementById("seccion-ranking");
  if (!seccion) return;

  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "AIzaSyARy4wUAsw-_kUR70GyorGFtnb8B1Y801M",
      authDomain: "nostalgia-coleccionable.firebaseapp.com",
      projectId: "nostalgia-coleccionable",
      storageBucket: "nostalgia-coleccionable.firebasestorage.app",
      messagingSenderId: "971467965546",
      appId: "1:971467965546:web:14470274e9affe6fdc291d"
    });
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const entrada = document.getElementById("input-buscar-ranking");
  const lista = document.getElementById("lista-ranking");
  let ranking = [];

  function nombreVisible(datos, uid) {
    return datos.nombreUsuario || datos.nombre || datos.displayName || "Usuario " + uid.slice(0, 6);
  }

  function cantidadObjetos(datos) {
    const coleccionables = Array.isArray(datos.coleccionables) ? datos.coleccionables : [];
    const inventario = Array.isArray(datos.inventario) ? datos.inventario : [];
    return coleccionables.length + inventario.length;
  }

  function pintar() {
    const busqueda = String(entrada.value || "").trim().toLocaleLowerCase("es-CL");
    const visibles = ranking.filter((usuario) => usuario.nombre.toLocaleLowerCase("es-CL").includes(busqueda));
    lista.innerHTML = "";
    if (!visibles.length) {
      lista.innerHTML = '<li class="texto-ayuda">No encontramos usuarios con ese nombre.</li>';
      return;
    }
    visibles.forEach((usuario) => {
      const item = document.createElement("li");
      item.className = "fila-ranking";
      const puesto = document.createElement("span");
      puesto.className = "puesto-ranking";
      puesto.textContent = usuario.puesto <= 3
        ? ["🥇", "🥈", "🥉"][usuario.puesto - 1]
        : usuario.puesto + "º";
      const enlace = document.createElement("a");
      enlace.href = "perfil.html?u=" + encodeURIComponent(usuario.uid);
      enlace.className = "nombre-ranking";
      enlace.textContent = usuario.nombre;
      enlace.title = "Visitar el perfil de " + usuario.nombre;
      const cantidad = document.createElement("span");
      cantidad.className = "cantidad-ranking";
      cantidad.textContent = usuario.cantidad + (usuario.cantidad === 1 ? " objeto" : " objetos");
      item.append(puesto, enlace, cantidad);
      lista.appendChild(item);
    });
  }

  function cargarRanking() {
    db.collection("perfilesPublicos").get().then((snap) => {
      ranking = snap.docs.map((doc) => {
        const datos = doc.data() || {};
        return { uid: doc.id, nombre: nombreVisible(datos, doc.id), cantidad: cantidadObjetos(datos) };
      }).filter((usuario) => usuario.cantidad > 0)
        .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"))
        .map((usuario, indice) => Object.assign(usuario, { puesto: indice + 1 }));
      pintar();
    }).catch((error) => {
      console.error("No se pudo cargar el ranking:", error.message);
      lista.innerHTML = '<li class="texto-ayuda">No se pudo cargar el ranking.</li>';
    });
  }

  entrada.addEventListener("input", pintar);
  auth.onAuthStateChanged((usuario) => {
    seccion.classList.toggle("oculto", !usuario);
    if (usuario) cargarRanking();
  });
})();
