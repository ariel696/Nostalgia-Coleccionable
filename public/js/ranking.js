/* Ranking público de coleccionistas. */
// Función autoejecutable: evita que las variables se mezclen con otros scripts.
(function () {
  // Busca la sección del ranking en la página.
  const seccion = document.getElementById("seccion-ranking");
  // Si esta página no tiene ranking, el script termina aquí.
  if (!seccion) return;

  // Inicia Firebase solo si todavía no se había iniciado en otro script.
  if (!firebase.apps.length) {
    // Configuración del proyecto de Firebase.
    firebase.initializeApp({
      apiKey: "AIzaSyARy4wUAsw-_kUR70GyorGFtnb8B1Y801M",
      authDomain: "nostalgia-coleccionable.firebaseapp.com",
      projectId: "nostalgia-coleccionable",
      storageBucket: "nostalgia-coleccionable.firebasestorage.app",
      messagingSenderId: "971467965546",
      appId: "1:971467965546:web:14470274e9affe6fdc291d"
    });
  }

  // Servicio de autenticación (para saber si hay un usuario con sesión).
  const auth = firebase.auth();
  // Base de datos Firestore.
  const db = firebase.firestore();
  // Caja de texto donde se busca un usuario.
  const entrada = document.getElementById("input-buscar-ranking");
  // Lista <ol> donde se dibujan las filas del ranking.
  const lista = document.getElementById("lista-ranking");
  // Aquí se guarda el ranking completo ya ordenado.
  let ranking = [];

  // Devuelve el nombre que se muestra públicamente.
  function nombreVisible(datos, uid) {
    return datos.nombreUsuario || datos.nombre || datos.displayName || "Usuario " + uid.slice(0, 6);
  }

  // Cuenta cuántos objetos tiene el usuario (coleccionables + inventario).
  function cantidadObjetos(datos) {
    // Si "coleccionables" no es una lista, se usa una lista vacía.
    const coleccionables = Array.isArray(datos.coleccionables) ? datos.coleccionables : [];
    // Lo mismo con el inventario.
    const inventario = Array.isArray(datos.inventario) ? datos.inventario : [];
    // El total es la suma de ambas listas.
    return coleccionables.length + inventario.length;
  }

  // Crea una imagen de reemplazo con la inicial del nombre (para quien no tiene foto).
  function avatarPredeterminado(nombre) {
    // Toma la primera letra del nombre en mayúscula, o "?" si no hay nombre.
    const inicial = (nombre || "?").trim().charAt(0).toUpperCase() || "?";
    // Dibuja un círculo con la inicial en formato SVG.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#6FC6A3"/><circle cx="80" cy="80" r="67" fill="#FFF8E7" stroke="#E6A93B" stroke-width="8"/><text x="80" y="103" text-anchor="middle" font-family="Arial" font-size="74" font-weight="700" fill="#3B2E20">${inicial}</text></svg>`;
    // Lo convierte en una dirección de imagen que se puede usar en <img>.
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  // Dibuja las filas del ranking según lo escrito en el buscador.
  function pintar() {
    // Texto buscado, sin espacios sobrantes y en minúsculas.
    const busqueda = String(entrada.value || "").trim().toLocaleLowerCase("es-CL");
    // Deja solo los usuarios cuyo nombre contiene el texto buscado.
    const visibles = ranking.filter((usuario) => usuario.nombre.toLocaleLowerCase("es-CL").includes(busqueda));
    // Vacía la lista antes de volver a dibujarla.
    lista.innerHTML = "";
    // Si no hay coincidencias, muestra un mensaje y termina.
    if (!visibles.length) {
      lista.innerHTML = '<li class="texto-ayuda">No encontramos usuarios con ese nombre.</li>';
      return;
    }
    // Crea una fila por cada usuario visible.
    visibles.forEach((usuario) => {
      // Elemento de la fila.
      const item = document.createElement("li");
      item.className = "fila-ranking";

      // Puesto: medalla para los 3 primeros, número para el resto.
      const puesto = document.createElement("span");
      puesto.className = "puesto-ranking";
      puesto.textContent = usuario.puesto <= 3
        ? ["🥇", "🥈", "🥉"][usuario.puesto - 1]
        : usuario.puesto + "º";

      // Imagen de perfil, a la izquierda del nombre.
      const foto = document.createElement("img");
      foto.className = "foto-ranking";
      // Usa la foto del usuario o, si no tiene, la imagen con su inicial.
      foto.src = usuario.foto || avatarPredeterminado(usuario.nombre);
      // Texto alternativo vacío: la foto es decorativa y el nombre ya está al lado.
      foto.alt = "";
      // Carga la imagen solo cuando se acerca a la pantalla.
      foto.loading = "lazy";
      // Si la foto no carga (enlace roto), se cambia por la imagen con la inicial.
      foto.onerror = () => {
        // Se quita el manejador para evitar un ciclo infinito de errores.
        foto.onerror = null;
        foto.src = avatarPredeterminado(usuario.nombre);
      };

      // Enlace con el nombre que lleva al perfil.
      const enlace = document.createElement("a");
      enlace.href = "perfil.html?u=" + encodeURIComponent(usuario.uid);
      enlace.className = "nombre-ranking";
      enlace.textContent = usuario.nombre;
      enlace.title = "Visitar el perfil de " + usuario.nombre;

      // Cantidad de objetos, en singular o plural.
      const cantidad = document.createElement("span");
      cantidad.className = "cantidad-ranking";
      cantidad.textContent = usuario.cantidad + (usuario.cantidad === 1 ? " objeto" : " objetos");

      // Agrega todo a la fila en este orden: puesto, foto, nombre y cantidad.
      item.append(puesto, foto, enlace, cantidad);
      // Agrega la fila a la lista.
      lista.appendChild(item);
    });
  }

  // Lee los perfiles públicos y arma el ranking.
  function cargarRanking() {
    db.collection("perfilesPublicos").get().then((snap) => {
      ranking = snap.docs.map((doc) => {
        // Datos del perfil (o un objeto vacío si no hay).
        const datos = doc.data() || {};
        return {
          uid: doc.id,
          nombre: nombreVisible(datos, doc.id),
          // Guarda la foto de perfil (texto vacío si no tiene).
          foto: typeof datos.fotoPerfil === "string" ? datos.fotoPerfil.trim() : "",
          cantidad: cantidadObjetos(datos)
        };
      }).filter((usuario) => usuario.cantidad > 0) // Solo quienes tienen objetos.
        // Ordena de más a menos objetos; si empatan, por nombre.
        .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"))
        // Asigna el número de puesto según el orden.
        .map((usuario, indice) => Object.assign(usuario, { puesto: indice + 1 }));
      // Dibuja el ranking.
      pintar();
    }).catch((error) => {
      // Si falla la lectura, lo deja en la consola y avisa en pantalla.
      console.error("No se pudo cargar el ranking:", error.message);
      lista.innerHTML = '<li class="texto-ayuda">No se pudo cargar el ranking.</li>';
    });
  }

  // Cada vez que se escribe en el buscador, se vuelve a dibujar la lista.
  entrada.addEventListener("input", pintar);
  // El ranking solo se ve (y se carga) cuando hay un usuario con sesión iniciada.
  auth.onAuthStateChanged((usuario) => {
    seccion.classList.toggle("oculto", !usuario);
    if (usuario) cargarRanking();
  });
})();
