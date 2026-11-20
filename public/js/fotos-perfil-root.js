/* Galería rápida de las imágenes que se ofrecen como foto de perfil. */
(function () {
  const panel = document.getElementById("panel-fotos-perfil-root");
  if (!panel) return;

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
  const lista = document.getElementById("lista-fotos-perfil-root");
  const estado = document.getElementById("estado-fotos-perfil-root");
  const actualizar = document.getElementById("btn-actualizar-fotos-perfil-root");
  const estaticas = [
    ["Monedas", "assets/img/5monedaschile.jpg", "Sitio"],
    ["Guerrero dorado", "assets/img/album-guerrerodorado.jpg", "Sitio"],
    ["Cheetos tazos", "assets/img/cheetos-tazos.png", "Sitio"],
    ["Regalo", "assets/img/escena-recompensa-1-mama.png", "Sitio"],
    ["Pensando", "assets/img/escena-recompensa-2-pensando.png", "Sitio"],
    ["Coleccionable", "assets/img/hqdefault.jpg", "Sitio"],
    ["Temporal: imagen vertical", "assets/img/images.jfif", "Temporal"],
    ["Temporal: paisaje", "assets/img/maxresdefault (1).jpg", "Temporal"],
    ["Temporal: colección", "assets/img/watermarked_img_18184432429529158315.jpg", "Temporal"],
    ["Temporal: tazo", "assets/img/28073990_04939a.avif", "Temporal"]
  ];

  function tarjeta(imagen) {
    const articulo = document.createElement("article");
    articulo.className = "tarjeta-foto-perfil-root";
    const vista = document.createElement("img");
    vista.src = imagen.url;
    vista.alt = imagen.nombre;
    vista.loading = "lazy";
    const nombre = document.createElement("strong");
    nombre.textContent = imagen.nombre;
    const tipo = document.createElement("span");
    tipo.textContent = imagen.tipo || "Administrada";
    articulo.append(vista, nombre, tipo);
    return articulo;
  }

  async function cargar() {
    lista.innerHTML = "";
    estaticas.forEach(([nombre, url, tipo]) => lista.appendChild(tarjeta({ nombre, url, tipo })));
    try {
      const snap = await db.collection("assets").where("categoria", "==", "Fotos de perfil").get();
      const urls = new Set(estaticas.map((imagen) => imagen[1]));
      snap.docs.forEach((doc) => {
        const datos = doc.data() || {};
        if (!datos.url || urls.has(datos.url)) return;
        urls.add(datos.url);
        lista.appendChild(tarjeta({ nombre: datos.nombre || "Foto de perfil", url: datos.url, tipo: "Administrada" }));
      });
      estado.textContent = "Se muestran " + lista.querySelectorAll(".tarjeta-foto-perfil-root").length + " imágenes disponibles.";
    } catch (error) {
      estado.textContent = "Se muestran las imágenes temporales y del sitio. No se pudieron cargar imágenes administradas.";
      console.error("No se pudieron cargar las fotos de perfil del root:", error.message);
    }
  }

  actualizar.addEventListener("click", cargar);
  auth.onAuthStateChanged((usuario) => {
    const esAdmin = usuario && usuario.email === "arielriquelme08@gmail.com";
    panel.classList.toggle("oculto", !esAdmin);
    if (esAdmin) cargar();
  });
})();
