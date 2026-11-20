/* Administrador root de música de fondo. */
(function () {
  const EMAIL_ADMIN = "arielriquelme08@gmail.com";
  const panel = document.getElementById("panel-musica-root");
  const panelRoot = document.getElementById("panel-root");
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
  const cloudName = "os889md5";
  const uploadPreset = "nostalgiacolecciones_productos";
  const archivo = document.getElementById("input-musica-archivo");
  const nombre = document.getElementById("input-musica-nombre");
  const botonSubir = document.getElementById("btn-subir-musica-root");
  const estado = document.getElementById("estado-musica-root");
  const lista = document.getElementById("lista-musica-root");

  function fechaLegible(ts) {
    return ts && ts.toDate ? ts.toDate().toLocaleString("es-CL", { dateStyle: "short" }) : "";
  }

  async function subirArchivoMusica(file) {
    const datos = new FormData();
    datos.append("file", file, file.name || "musica.mp3");
    datos.append("upload_preset", uploadPreset);
    const respuesta = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/video/upload", {
      method: "POST",
      body: datos
    });
    const resultado = await respuesta.json();
    if (!resultado.secure_url) throw new Error("Cloudinary no devolvió el audio.");
    return resultado.secure_url;
  }

  async function cargarMusica() {
    const snap = await db.collection("musicaSitio").get();
    const documentos = snap.docs.sort((a, b) => {
      const ta = a.data().creadoEn && a.data().creadoEn.toMillis ? a.data().creadoEn.toMillis() : 0;
      const tb = b.data().creadoEn && b.data().creadoEn.toMillis ? b.data().creadoEn.toMillis() : 0;
      return tb - ta;
    });
    lista.innerHTML = "";
    if (!documentos.length) {
      lista.innerHTML = '<p class="texto-ayuda">Todavía no has subido música.</p>';
      return;
    }
    documentos.forEach((doc) => {
      const datos = doc.data() || {};
      const tarjeta = document.createElement("article");
      tarjeta.className = "tarjeta-musica-root";
      const titulo = document.createElement("strong");
      titulo.textContent = datos.nombre || "Música sin nombre";
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.src = datos.url;
      const estadoMusica = document.createElement("span");
      estadoMusica.className = datos.activo ? "musica-activa" : "musica-inactiva";
      estadoMusica.textContent = datos.activo ? "Activa en el sitio" : "Inactiva";
      const acciones = document.createElement("div");
      acciones.className = "acciones-musica-root";
      if (!datos.activo) {
        const activar = document.createElement("button");
        activar.type = "button";
        activar.className = "boton-secundario";
        activar.textContent = "Activar";
        activar.addEventListener("click", () => activarMusica(doc.id));
        acciones.appendChild(activar);
      }
      const eliminar = document.createElement("button");
      eliminar.type = "button";
      eliminar.className = "boton-secundario boton-quitar-musica";
      eliminar.textContent = "Eliminar";
      eliminar.addEventListener("click", () => eliminarMusica(doc.id, datos.nombre || "esta música"));
      acciones.appendChild(eliminar);
      tarjeta.append(titulo, audio, estadoMusica, document.createTextNode(fechaLegible(datos.creadoEn)), acciones);
      lista.appendChild(tarjeta);
    });
  }

  async function activarMusica(id) {
    const snap = await db.collection("musicaSitio").get();
    const lote = db.batch();
    snap.docs.forEach((doc) => lote.update(doc.ref, { activo: doc.id === id }));
    await lote.commit();
    await cargarMusica();
  }

  async function eliminarMusica(id, nombreVisible) {
    if (!window.confirm("¿Eliminar «" + nombreVisible + "» de la música del sitio?")) return;
    await db.collection("musicaSitio").doc(id).delete();
    await cargarMusica();
  }

  async function crearMusica() {
    const file = archivo.files[0];
    const nombreVisible = nombre.value.trim() || (file && file.name) || "Música de fondo";
    if (!file) { estado.textContent = "Selecciona un archivo MP3."; return; }
    botonSubir.disabled = true;
    estado.textContent = "Subiendo música...";
    try {
      const url = await subirArchivoMusica(file);
      await db.collection("musicaSitio").add({
        nombre: nombreVisible,
        url,
        activo: false,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        creadoPor: auth.currentUser.email || ""
      });
      estado.textContent = "Música subida. Actívala desde la lista cuando quieras.";
      archivo.value = "";
      nombre.value = "";
      await cargarMusica();
    } catch (error) {
      console.error(error);
      estado.textContent = "No se pudo subir la música. Revisa el formato MP3 y las reglas.";
    } finally {
      botonSubir.disabled = false;
    }
  }

  botonSubir.addEventListener("click", crearMusica);
  auth.onAuthStateChanged((usuario) => {
    const esAdmin = !!usuario && usuario.email === EMAIL_ADMIN;
    if (panelRoot) panelRoot.classList.toggle("oculto", !esAdmin);
    panel.classList.toggle("oculto", !esAdmin);
    if (esAdmin) cargarMusica().catch((error) => {
      console.error(error);
      estado.textContent = "No se pudo cargar la música.";
    });
  });
})();
