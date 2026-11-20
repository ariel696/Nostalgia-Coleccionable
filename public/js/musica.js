/* Reproductor discreto de la música activa del sitio. */
(function () {
  if (!window.firebase) return;
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

  function montarReproductor(datos) {
    const audio = document.createElement("audio");
    audio.src = datos.url;
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0.28;

    const control = document.createElement("div");
    control.className = "control-musica-sitio";
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-musica-sitio";
    boton.setAttribute("aria-label", "Reproducir música de fondo");
    boton.textContent = "♫";
    const etiqueta = document.createElement("span");
    etiqueta.textContent = datos.nombre || "Música de fondo";
    control.append(boton, etiqueta);
    document.body.append(audio, control);

    function actualizar(sonando) {
      boton.textContent = sonando ? "Ⅱ" : "♫";
      boton.setAttribute("aria-label", sonando ? "Pausar música de fondo" : "Reproducir música de fondo");
      control.classList.toggle("musica-sonando", sonando);
    }

    boton.addEventListener("click", () => {
      if (audio.paused) audio.play().then(() => actualizar(true)).catch(() => {});
      else { audio.pause(); actualizar(false); }
    });

    // El primer clic del usuario permite iniciar la música sin bloquear la
    // página ni forzar audio inesperado al abrirla.
    const iniciar = () => {
      audio.play().then(() => actualizar(true)).catch(() => {});
      document.removeEventListener("pointerdown", iniciar);
    };
    document.addEventListener("pointerdown", iniciar, { once: true });
  }

  auth.onAuthStateChanged((usuario) => {
    if (!usuario) return;
    db.collection("musicaSitio").where("activo", "==", true).limit(1).get()
      .then((snap) => { if (!snap.empty) montarReproductor(snap.docs[0].data()); })
      .catch((error) => console.warn("No se pudo cargar la música de fondo:", error.message));
  });
})();
