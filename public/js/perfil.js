const firebaseConfig = {
  apiKey: "AIzaSyARy4wUAsw-_kUR70GyorGFtnb8B1Y801M",
  authDomain: "nostalgia-coleccionable.firebaseapp.com",
  projectId: "nostalgia-coleccionable",
  storageBucket: "nostalgia-coleccionable.firebasestorage.app",
  messagingSenderId: "971467965546",
  appId: "1:971467965546:web:14470274e9affe6fdc291d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const CLOUDINARY_CLOUD_NAME = "os889md5";
const CLOUDINARY_UPLOAD_PRESET = "nostalgiacolecciones_productos";

const estadoPerfil = document.getElementById("estado-perfil");
const cabeceraPerfil = document.getElementById("cabecera-perfil");
const fotoPerfil = document.getElementById("foto-perfil");
const nombrePerfil = document.getElementById("nombre-perfil");
const nombrePerfilHeader = document.getElementById("nombre-perfil-header");
const linkIntercambios = document.getElementById("link-intercambios");
const linkZonaJuego = document.getElementById("link-zona-juego");
const linkMiPerfil = document.getElementById("link-mi-coleccion");
const fotoBotonPerfil = document.getElementById("foto-boton-perfil");
const monedasUsuario = document.getElementById("monedas-usuario");
const muroColeccionables = document.getElementById("muro-coleccionables");
const linkInventarioPrivado = document.getElementById("link-inventario-privado");
const botonAjustes = document.getElementById("btn-ajustes");
const seccionExhibidor = document.getElementById("seccion-exhibidor");
const muroExhibidor = document.getElementById("muro-exhibidor");
const EMAIL_ADMIN = "arielriquelme08@gmail.com";
// Botón de ajustes (engranaje) en la línea del título "Exhibidor": muestra/oculta Cambiar y Quitar.
const botonAjustesExhibidor = document.getElementById("btn-ajustes-exhibidor");
const uidPerfil = new URLSearchParams(window.location.search).get("u");
const INTERCAMBIOS_HABILITADOS = false;

let usuarioAutenticado = null;
let esUsuarioRoot = false;
let uidPerfilCargado = null;

function mostrarFotoBotonPerfil(url) {
  if (!fotoBotonPerfil) return;
  const foto = typeof url === "string" ? url.trim() : "";
  if (!foto) {
    fotoBotonPerfil.removeAttribute("src");
    fotoBotonPerfil.classList.add("oculto");
    return;
  }
  fotoBotonPerfil.src = foto;
  fotoBotonPerfil.classList.remove("oculto");
  fotoBotonPerfil.onerror = () => {
    fotoBotonPerfil.removeAttribute("src");
    fotoBotonPerfil.classList.add("oculto");
  };
}

function configurarBarraPrincipal(usuario) {
  const enlaces = [linkIntercambios, linkZonaJuego, linkMiPerfil];
  if (!usuario) {
    enlaces.forEach((enlace) => enlace && enlace.classList.add("oculto"));
    if (monedasUsuario) monedasUsuario.textContent = "";
    mostrarFotoBotonPerfil("");
    return;
  }

  enlaces.forEach((enlace) => enlace && enlace.classList.remove("oculto"));
  if (!INTERCAMBIOS_HABILITADOS && linkIntercambios) linkIntercambios.classList.add("funcion-deshabilitada");
  if (linkMiPerfil) linkMiPerfil.href = "perfil.html?u=" + encodeURIComponent(usuario.uid);
  mostrarFotoBotonPerfil(usuario.photoURL || "");

  db.collection("usuarios").doc(usuario.uid).get().then((ficha) => {
    const datos = ficha.exists ? ficha.data() || {} : {};
    const monedas = Math.max(0, Number(datos.monedas) || 0) * 100;
    if (monedasUsuario) monedasUsuario.textContent = "Dinero: $" + monedas.toLocaleString("es-CL") + " pesos";
    mostrarFotoBotonPerfil(datos.fotoPerfil || usuario.photoURL || "");
  }).catch((error) => {
    console.error("No se pudo cargar el dinero del usuario:", error.message);
    if (monedasUsuario) monedasUsuario.textContent = "Dinero: $0 pesos";
  });
}

// ---------------------------------------------------------------
// Fondos del muro (imagen de portada). Cada usuario elige uno y se guarda
// en perfilesPublicos/{uid}.fondoMuro (solo el id). Los estilos de cada
// fondo están en css/style.css como body[data-fondo-muro="ID"].
// Para agregar otro fondo: súmalo aquí y crea su regla en el CSS.
// ---------------------------------------------------------------
const FONDOS_MURO = [
  { id: "predeterminado", nombre: "Original" },
  { id: "atardecer", nombre: "Atardecer" },
  { id: "cuaderno", nombre: "Cuaderno" },
  { id: "noche", nombre: "Noche estrellada" }
];
let fondoMuroActual = "predeterminado";

// Imágenes que la página ofrece para usar como foto de perfil sin subir un
// archivo. Son recursos locales del sitio, así que siguen disponibles aunque
// el usuario cambie de dispositivo.
const IMAGENES_PERFIL_SITIO_BASE = [
  { nombre: "Monedas", url: "assets/img/5monedaschile.jpg" },
  { nombre: "Guerrero dorado", url: "assets/img/album-guerrerodorado.jpg" },
  { nombre: "Cheetos tazos", url: "assets/img/cheetos-tazos.png" },
  { nombre: "Regalo", url: "assets/img/escena-recompensa-1-mama.png" },
  { nombre: "Pensando", url: "assets/img/escena-recompensa-2-pensando.png" },
  { nombre: "Coleccionable", url: "assets/img/hqdefault.jpg" },
  { nombre: "Temporal: imagen vertical", url: "assets/img/images.jfif" },
  { nombre: "Temporal: paisaje", url: "assets/img/maxresdefault (1).jpg" },
  { nombre: "Temporal: colección", url: "assets/img/watermarked_img_18184432429529158315.jpg" },
  { nombre: "Temporal: tazo", url: "assets/img/28073990_04939a.avif" }
];

function cargarImagenesPerfilSitio() {
  return db.collection("assets")
    .where("categoria", "==", "Fotos de perfil")
    .get()
    .then((snap) => {
      const administradas = snap.docs
        .map((doc) => doc.data() || {})
        .filter((asset) => asset.url)
        .map((asset) => ({ nombre: asset.nombre || "Imagen de perfil", url: asset.url }));
      const vistas = new Set();
      return administradas.concat(IMAGENES_PERFIL_SITIO_BASE).filter((imagen) => {
        if (vistas.has(imagen.url)) return false;
        vistas.add(imagen.url);
        return true;
      });
    })
    .catch(() => IMAGENES_PERFIL_SITIO_BASE);
}

function aplicarFondoMuro(id) {
  const valido = FONDOS_MURO.some((f) => f.id === id) ? id : "predeterminado";
  fondoMuroActual = valido;
  if (valido === "predeterminado") document.body.removeAttribute("data-fondo-muro");
  else document.body.setAttribute("data-fondo-muro", valido);
}

function avatarPredeterminado(nombre) {
  const inicial = (nombre || "?").trim().charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#6FC6A3"/><circle cx="80" cy="80" r="67" fill="#FFF8E7" stroke="#E6A93B" stroke-width="8"/><text x="80" y="103" text-anchor="middle" font-family="Arial" font-size="74" font-weight="700" fill="#3B2E20">${inicial}</text></svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function obtenerImagenArticulo(articulo) {
  if (articulo.imagen && articulo.imagen !== "tazo-generado") return articulo.imagen;

  if (articulo.imagen === "tazo-generado" || articulo.tipo === "Tazo Pokemon") {
    const nombre = articulo.nombre || "Tazo Pokemon";
    const numero = articulo.numero || (articulo.id || "").replace("tazo-pokemon-", "") || "001";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><rect width="320" height="320" fill="#FFF8E7"/><circle cx="160" cy="160" r="138" fill="#F6C744" stroke="#3B2E20" stroke-width="10"/><circle cx="160" cy="160" r="108" fill="#FFFDF7" stroke="#C6402E" stroke-width="7"/><text x="160" y="103" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#3B2E20">TAZO</text><text x="160" y="160" text-anchor="middle" font-family="Arial" font-size="44" font-weight="900" fill="#C6402E">#${numero}</text><text x="160" y="211" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#3B2E20">${nombre.replace(/Tazo Pokemon #[0-9]+\s*/, "")}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  return avatarPredeterminado(articulo.nombre);
}

// Crea el botón "Ver reverso" para alternar entre la imagen frontal y la
// trasera de un artículo. Devuelve null si el artículo no tiene trasera.
function crearBotonReverso(imagen, articulo, imagenFrontal) {
  if (!articulo.imagenTrasera) return null;

  // Precarga la trasera para que el giro no parpadee.
  new Image().src = articulo.imagenTrasera;

  let mostrandoReverso = false;
  let girando = false;
  let urlFrontal = imagenFrontal;
  let urlTrasera = articulo.imagenTrasera;
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-reverso";
  boton.textContent = "Ver reverso";

  function aplicarCara() {
    imagen.src = mostrandoReverso ? urlTrasera : urlFrontal;
    boton.textContent = mostrandoReverso ? "Ver frente" : "Ver reverso";
  }

  imagen.addEventListener("error", () => {
    if (mostrandoReverso) {
      mostrandoReverso = false;
      aplicarCara();
    }
  });

  function alternarCara() {
    if (girando) return;
    mostrandoReverso = !mostrandoReverso;

    const sinAnimacion = !imagen.animate
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sinAnimacion) {
      aplicarCara();
      return;
    }

    // Giro en 3D: la imagen gira hasta quedar de canto (90°),
    // cambia de cara y termina de girar hasta quedar de frente.
    girando = true;
    const ida = imagen.animate(
      [
        { transform: "perspective(700px) rotateY(0deg)" },
        { transform: "perspective(700px) rotateY(90deg)" }
      ],
      { duration: 180, easing: "ease-in", fill: "forwards" }
    );
    ida.onfinish = () => {
      aplicarCara();
      const vuelta = imagen.animate(
        [
          { transform: "perspective(700px) rotateY(-90deg)" },
          { transform: "perspective(700px) rotateY(0deg)" }
        ],
        { duration: 220, easing: "ease-out" }
      );
      ida.cancel();
      vuelta.onfinish = () => { girando = false; };
    };
  }

  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    alternarCara();
  });

  // Tocar la imagen también la voltea (con teclado: Enter o Espacio).
  imagen.classList.add("imagen-girable");
  imagen.setAttribute("role", "button");
  imagen.setAttribute("tabindex", "0");
  imagen.title = "Toca para voltear";
  imagen.addEventListener("click", (evento) => {
    evento.stopPropagation();
    alternarCara();
  });
  imagen.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternarCara();
    }
  });

  // Permite cambiar las imágenes (por ejemplo, por versiones sin fondo).
  boton.cambiarImagenes = (frontal, trasera) => {
    if (frontal) urlFrontal = frontal;
    if (trasera) urlTrasera = trasera;
    aplicarCara();
  };

  return boton;
}

// (El recorte circular de tazos vive en js/recorte-coleccionable.js, compartido con producto.js)

// Quita el fondo liso (blanco, crema, etc.) que rodea a un coleccionable para
// que "flote" solo la figura. Parte desde los bordes de la imagen y borra los
// píxeles parecidos al color del fondo hasta toparse con la figura.
// Si la imagen ya es transparente, no tiene un fondo liso o el navegador no
// deja leerla, devuelve la imagen original sin tocarla.
const CACHE_SIN_FONDO = new Map();
function quitarFondoImagen(url) {
  if (!url) return Promise.resolve(url);
  if (!CACHE_SIN_FONDO.has(url)) CACHE_SIN_FONDO.set(url, quitarFondoImagenSinCache(url));
  return CACHE_SIN_FONDO.get(url);
}

function quitarFondoImagenSinCache(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(url); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(url);
    img.onload = () => {
      try {
        const MAX = 640;
        const escala = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * escala));
        const h = Math.max(1, Math.round(img.naturalHeight * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const imagenData = ctx.getImageData(0, 0, w, h);
        const d = imagenData.data;

        // Primero se intenta lo más preciso: si es un tazo redondo, se recorta
        // exactamente a su círculo (sirve aunque la hoja blanca esté torcida).
        const circulo = detectarCirculoColeccionable(d, w, h);
        if (circulo) {
          resolve(recortarCanvasACirculo(canvas, circulo).toDataURL("image/png"));
          return;
        }

        // Color del fondo: las 4 esquinas deben ser opacas y casi iguales.
        const esquinas = [0, (w - 1), (h - 1) * w, (h - 1) * w + (w - 1)].map((p) => p * 4);
        if (esquinas.some((i) => d[i + 3] < 200)) { resolve(url); return; }
        const fondo = [0, 1, 2].map((c) => Math.round(esquinas.reduce((s, i) => s + d[i + c], 0) / 4));
        const distancia = (i) => Math.max(Math.abs(d[i] - fondo[0]), Math.abs(d[i + 1] - fondo[1]), Math.abs(d[i + 2] - fondo[2]));
        if (esquinas.some((i) => distancia(i) > 24)) { resolve(url); return; }

        const TOLERANCIA = 38;
        const SUAVIZADO = 90;
        const borrado = new Uint8Array(w * h);
        const cola = new Int32Array(w * h);
        let ini = 0, fin = 0;
        const meter = (p) => {
          if (borrado[p] || distancia(p * 4) > TOLERANCIA) return;
          borrado[p] = 1;
          cola[fin++] = p;
        };
        for (let x = 0; x < w; x++) { meter(x); meter((h - 1) * w + x); }
        for (let y = 0; y < h; y++) { meter(y * w); meter(y * w + w - 1); }
        while (ini < fin) {
          const p = cola[ini++];
          const x = p % w;
          if (x > 0) meter(p - 1);
          if (x < w - 1) meter(p + 1);
          if (p >= w) meter(p - w);
          if (p < w * (h - 1)) meter(p + w);
        }
        if (fin < w * h * 0.02) { resolve(url); return; } // casi no había fondo

        // Borde suave: los píxeles junto al fondo borrado se vuelven semitransparentes
        // según qué tan parecidos al fondo sean (evita el "halo" blanco).
        for (let p = 0; p < w * h; p++) {
          if (!borrado[p]) continue;
          const x = p % w;
          const vecinos = [];
          if (x > 0) vecinos.push(p - 1);
          if (x < w - 1) vecinos.push(p + 1);
          if (p >= w) vecinos.push(p - w);
          if (p < w * (h - 1)) vecinos.push(p + w);
          vecinos.forEach((v) => {
            if (borrado[v]) return;
            const dist = distancia(v * 4);
            if (dist < SUAVIZADO) {
              const alfa = Math.round(255 * (dist - TOLERANCIA) / (SUAVIZADO - TOLERANCIA));
              if (alfa < d[v * 4 + 3]) d[v * 4 + 3] = Math.max(0, alfa);
            }
          });
        }
        for (let p = 0; p < w * h; p++) if (borrado[p]) d[p * 4 + 3] = 0;

        ctx.putImageData(imagenData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        resolve(url);
      }
    };
    img.src = url;
  });
}

// Efecto 3D: envuelve la imagen en una "tarjeta" que se inclina siguiendo
// el dedo o el cursor (sin brillos ni colores añadidos: la imagen se ve tal cual es).
// Devuelve el contenedor que hay que poner en lugar de la imagen.
function crearVisor3D(imagen) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return imagen;

  const MAX_INCLINACION = 16; // grados
  const escena = document.createElement("div");
  escena.className = "escena-3d";
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta-3d tarjeta-3d-reposo";
  tarjeta.appendChild(imagen);
  escena.appendChild(tarjeta);

  let encima = false;
  let temporizador = null;

  function inclinar(evento) {
    const caja = escena.getBoundingClientRect();
    const x = Math.min(Math.max((evento.clientX - caja.left) / caja.width, 0), 1);
    const y = Math.min(Math.max((evento.clientY - caja.top) / caja.height, 0), 1);
    const rotX = (0.5 - y) * 2 * MAX_INCLINACION;
    const rotY = (x - 0.5) * 2 * MAX_INCLINACION;

    encima = true;
    clearTimeout(temporizador);
    tarjeta.classList.remove("tarjeta-3d-reposo");
    tarjeta.style.transition = "transform 80ms linear, filter 80ms linear";
    tarjeta.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) scale(1.05)";
    tarjeta.style.setProperty("--sombra-x", (-rotY * 1.4) + "px");
    tarjeta.style.setProperty("--sombra-y", (rotX * 1.4 + 14) + "px");
  }

  function soltar() {
    encima = false;
    tarjeta.style.transition = "transform 500ms ease-out, filter 500ms ease-out";
    tarjeta.style.transform = "";
    tarjeta.style.setProperty("--sombra-x", "0px");
    tarjeta.style.setProperty("--sombra-y", "14px");
    // Pasado un momento sin tocar, vuelve a mecerse suavemente.
    temporizador = setTimeout(() => {
      if (!encima) {
        tarjeta.style.transition = "";
        tarjeta.classList.add("tarjeta-3d-reposo");
      }
    }, 600);
  }

  escena.addEventListener("pointermove", inclinar);
  escena.addEventListener("pointerdown", inclinar);
  escena.addEventListener("pointerleave", soltar);
  escena.addEventListener("pointerup", (evento) => {
    if (evento.pointerType !== "mouse") soltar();
  });
  escena.addEventListener("pointercancel", soltar);

  return escena;
}

// Giro libre de 360°, igual en computador y en celular: se mantiene presionado
// el clic (o el dedo) sobre el tazo y se arrastra. El tazo gira como una perilla
// alrededor de su centro y se queda en el ángulo donde lo sueltes.
// Un clic / toque rápido, sin arrastrar, lo voltea como siempre.
// No reemplaza nada: la inclinación 3D y el volteo (tocar / "Ver reverso")
// siguen igual. Solo se ignora el clic que termina un giro.
function activarGiroLibre(visor, rotor) {
  const MOVIMIENTO_EMPIEZA = 4;     // px: desde aquí un toque/clic deja de serlo y empieza el giro

  let estado = "reposo";            // reposo | listo (presionado) | girando
  let idPuntero = null;
  let inicioX = 0, inicioY = 0;
  let centroX = 0, centroY = 0;
  let anguloAnterior = 0;
  let rotacion = 0;
  let suprimirClick = false;
  let temporizadorLimpiar = null;

  function limpiarGesto() {
    estado = "reposo";
    idPuntero = null;
    visor.classList.remove("girando");
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", alMover, true);
    window.removeEventListener("pointerup", alSoltar, true);
    window.removeEventListener("pointercancel", alSoltar, true);
  }

  function alMover(evento) {
    if (evento.pointerId !== idPuntero) return;

    if (estado === "listo") {
      if (Math.hypot(evento.clientX - inicioX, evento.clientY - inicioY) < MOVIMIENTO_EMPIEZA) return;
      const caja = rotor.getBoundingClientRect();
      centroX = caja.left + caja.width / 2;
      centroY = caja.top + caja.height / 2;
      anguloAnterior = Math.atan2(evento.clientY - centroY, evento.clientX - centroX);
      estado = "girando";
      suprimirClick = true;                 // este gesto no debe voltear la carta
      visor.classList.add("girando");
      document.body.style.userSelect = "none";   // que no se seleccione texto al arrastrar
    }

    if (estado === "girando") {
      const angulo = Math.atan2(evento.clientY - centroY, evento.clientX - centroX);
      let delta = angulo - anguloAnterior;
      if (delta > Math.PI) delta -= 2 * Math.PI;      // evita el salto al cruzar los 180°
      if (delta < -Math.PI) delta += 2 * Math.PI;
      anguloAnterior = angulo;
      rotacion += delta * 180 / Math.PI;
      rotor.style.transform = "rotate(" + rotacion + "deg)";
      evento.stopPropagation();             // mientras gira, no se inclina en 3D
      evento.preventDefault();
    }
  }

  function alSoltar(evento) {
    if (evento.pointerId !== idPuntero) return;
    const estabaGirando = estado === "girando";
    limpiarGesto();
    if (estabaGirando) suprimirClick = true;
    // Si no llega ningún clic (p. ej. se soltó fuera del tazo), se limpia la marca.
    clearTimeout(temporizadorLimpiar);
    temporizadorLimpiar = setTimeout(() => { suprimirClick = false; }, 450);
  }

  visor.addEventListener("pointerdown", (evento) => {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    if (estado !== "reposo") return;
    suprimirClick = false;
    estado = "listo";
    idPuntero = evento.pointerId;
    inicioX = evento.clientX;
    inicioY = evento.clientY;
    window.addEventListener("pointermove", alMover, true);
    window.addEventListener("pointerup", alSoltar, true);
    window.addEventListener("pointercancel", alSoltar, true);
  });

  // El clic que termina un giro no voltea la carta; un clic/toque normal sí.
  visor.addEventListener("click", (evento) => {
    if (!suprimirClick) return;
    suprimirClick = false;
    evento.stopPropagation();
    evento.preventDefault();
  }, true);

  // Mientras se mantiene presionado, no abrir el menú de "guardar imagen".
  visor.addEventListener("contextmenu", (evento) => {
    if (estado !== "reposo") evento.preventDefault();
  });
}

// Compara una copia del artículo sin depender solo del nombre: compraId
// identifica una copia concreta cuando existe. En artículos antiguos que no
// tienen compraId usamos id/nombre/número como compatibilidad.
function coincideArticulo(a, b) {
  if (!a || !b) return false;
  if (a.compraId && b.compraId) return a.compraId === b.compraId;
  return String(a.id || "") === String(b.id || "")
    && String(a.nombre || "") === String(b.nombre || "")
    && String(a.numero || "") === String(b.numero || "");
}

function quitarUnaCoincidencia(articulos, objetivo) {
  let quitado = false;
  const lista = (Array.isArray(articulos) ? articulos : []).filter((articulo) => {
    if (!quitado && coincideArticulo(articulo, objetivo)) {
      quitado = true;
      return false;
    }
    return true;
  });
  return { lista, quitado };
}

function quitarDelExhibidor(exhibidor, objetivo) {
  return (Array.isArray(exhibidor) ? exhibidor : []).map((articulo) => (
    articulo && coincideArticulo(articulo, objetivo) ? null : articulo
  ));
}

// El borrado root se hace en una transacción para que la colección privada
// y la copia pública del muro no queden desincronizadas si falla una escritura.
async function eliminarArticuloComoRoot(articulo) {
  if (!esUsuarioRoot || !uidPerfilCargado) {
    throw new Error("Solo root puede eliminar objetos.");
  }

  const referenciaUsuario = db.collection("usuarios").doc(uidPerfilCargado);
  const referenciaPerfil = db.collection("perfilesPublicos").doc(uidPerfilCargado);

  await db.runTransaction(async (transaccion) => {
    const fichaUsuario = await transaccion.get(referenciaUsuario);
    const fichaPerfil = await transaccion.get(referenciaPerfil);
    const datosUsuario = fichaUsuario.exists ? fichaUsuario.data() || {} : {};
    const datosPerfil = fichaPerfil.exists ? fichaPerfil.data() || {} : {};

    // Los objetos que se abren desde el muro viven en coleccionables.
    const resultadoUsuario = quitarUnaCoincidencia(datosUsuario.coleccionables, articulo);
    if (!resultadoUsuario.quitado) {
      throw new Error("El objeto ya no está en la colección de este usuario.");
    }

    const resultadoPerfil = quitarUnaCoincidencia(datosPerfil.coleccionables, articulo);
    const cambiosPerfil = {
      coleccionables: resultadoPerfil.quitado
        ? resultadoPerfil.lista
        : (Array.isArray(datosPerfil.coleccionables) ? datosPerfil.coleccionables : []),
      exhibidor: quitarDelExhibidor(datosPerfil.exhibidor, articulo),
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    transaccion.update(referenciaUsuario, {
      coleccionables: resultadoUsuario.lista
    });
    transaccion.set(referenciaPerfil, cambiosPerfil, { merge: true });
  });
}

function agregarAccionEliminarRoot(contenido, modal, articulo) {
  if (!esUsuarioRoot || !uidPerfilCargado) return;

  const eliminar = document.createElement("button");
  eliminar.type = "button";
  eliminar.className = "boton-comprar boton-eliminar-root";
  eliminar.textContent = "Eliminar objeto del usuario";
  eliminar.setAttribute("aria-label", "Eliminar " + (articulo.nombre || "este objeto") + " del usuario");

  eliminar.addEventListener("click", async () => {
    const nombre = articulo.nombre || "este objeto";
    const confirmado = window.confirm(
      "¿Eliminar \"" + nombre + "\" de este usuario?\n\n" +
      "También se quitará del muro y del exhibidor si estaba allí."
    );
    if (!confirmado) return;

    eliminar.disabled = true;
    eliminar.textContent = "Eliminando...";
    try {
      await eliminarArticuloComoRoot(articulo);
      modal.remove();
      estadoPerfil.textContent = "Objeto eliminado del usuario.";
      await cargarPerfil(uidPerfilCargado, usuarioAutenticado);
    } catch (error) {
      console.error("Error al eliminar objeto como root:", error);
      eliminar.disabled = false;
      eliminar.textContent = "Eliminar objeto del usuario";
      window.alert("No se pudo eliminar el objeto: " + (error.message || "error desconocido"));
    }
  });

  contenido.appendChild(eliminar);
}

function mostrarDetalleArticulo(articulo, categoria) {
  const modalAnterior = document.querySelector(".modal-detalle-articulo");
  if (modalAnterior) modalAnterior.remove();

  const modal = document.createElement("div");
  modal.className = "modal-detalle-articulo";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const contenido = document.createElement("article");
  contenido.className = "detalle-articulo";
  const imagen = document.createElement("img");
  imagen.src = obtenerImagenArticulo(articulo);
  imagen.alt = articulo.nombre || "Artículo";
  const tipo = document.createElement("p");
  tipo.className = "etiqueta-detalle-articulo";
  tipo.textContent = categoria;
  const nombre = document.createElement("h2");
  nombre.textContent = articulo.nombre || "Artículo";
  const origen = document.createElement("p");
  origen.className = "texto-ayuda";
  origen.textContent = articulo.origenProductoNombre
    ? "Obtenido mediante: " + articulo.origenProductoNombre + "."
    : "Disponible en este muro.";
  const cerrar = document.createElement("button");
  cerrar.className = "boton-comprar";
  cerrar.type = "button";
  cerrar.textContent = "Cerrar";
  cerrar.addEventListener("click", () => modal.remove());

  const botonReverso = crearBotonReverso(imagen, articulo, imagen.src);
  // La imagen va dentro de un "rotor" que es lo que gira en 360°; así el giro
  // no se mezcla con la inclinación 3D ni con el volteo frente/reverso.
  const rotor = document.createElement("div");
  rotor.className = "rotor-tazo";
  imagen.draggable = false;
  rotor.appendChild(imagen);
  const visor = crearVisor3D(rotor);
  activarGiroLibre(visor, rotor);
  const pistaGiro = document.createElement("p");
  pistaGiro.className = "texto-ayuda pista-giro";
  pistaGiro.textContent = window.matchMedia("(pointer: coarse)").matches
    ? "Un toque lo voltea. Mantén el dedo apretado y arrastra para girarlo."
    : "Un clic lo voltea. Mantén presionado el clic y arrastra para girarlo.";
  contenido.classList.add("con-giro");
  contenido.append(visor, tipo, nombre, origen, pistaGiro);
  if (botonReverso) contenido.appendChild(botonReverso);
  agregarAccionEliminarRoot(contenido, modal, articulo);
  contenido.appendChild(cerrar);
  modal.appendChild(contenido);
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  cerrar.focus();

  // Mientras se quita el fondo, la imagen espera oculta para que no se vea el cuadro.
  imagen.style.opacity = "0";
  imagen.style.transition = "opacity 200ms ease-out";
  const revelar = () => { imagen.style.opacity = "1"; };
  setTimeout(revelar, 3000);
  Promise.all([
    quitarFondoImagen(obtenerImagenArticulo(articulo)),
    quitarFondoImagen(articulo.imagenTrasera)
  ]).then(([frontal, trasera]) => {
    if (document.body.contains(modal)) {
      if (botonReverso) botonReverso.cambiarImagenes(frontal, trasera);
      else imagen.src = frontal;
    }
    revelar();
  });
}

// ---------------------------------------------------------------
// Ajustes de la cuenta (engranaje). Solo lo ve el dueño del perfil.
// Los datos salen de la sesión de Firebase Auth del propio usuario
// y NO se guardan en el perfil público, así nadie más los ve.
// ---------------------------------------------------------------
const NOMBRES_PROVEEDOR = {
  "google.com": "Google",
  "password": "Correo y contraseña",
  "phone": "Número de teléfono",
  "facebook.com": "Facebook",
  "apple.com": "Apple",
  "twitter.com": "X (Twitter)",
  "github.com": "GitHub"
};

function formatearFechaCuenta(texto) {
  if (!texto) return "No disponible";
  const fecha = new Date(texto);
  if (isNaN(fecha.getTime())) return "No disponible";
  return fecha.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
}

function filaAjuste(titulo, valor) {
  const fila = document.createElement("div");
  fila.className = "fila-ajuste";
  const dt = document.createElement("dt");
  dt.textContent = titulo;
  const dd = document.createElement("dd");
  dd.textContent = valor;
  fila.append(dt, dd);
  return fila;
}

function normalizarCodigoReferidoPerfil(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
}

// También se ejecuta desde el perfil para reparar cuentas antiguas que aún
// no tenían nombreUsuario/codigoReferido guardados.
function obtenerOCrearCodigoReferido(usuario) {
  const usuarioRef = db.collection("usuarios").doc(usuario.uid);
  const nombresRef = db.collection("nombresUsuario");
  return usuarioRef.get().then((ficha) => {
    const datos = ficha.exists ? ficha.data() : {};
    const existente = datos.codigoReferido || datos.nombreUsuario;
    const nombreFueElegido = datos.nombreUsuarioPersonalizado === true;
    const baseAutomatica = normalizarCodigoReferidoPerfil(usuario.displayName) || "usuario";
    const base = nombreFueElegido && existente ? existente : baseAutomatica;
    const reservaValida = nombreFueElegido && existente
      ? nombresRef.doc(existente).get().then((reserva) => reserva.exists && reserva.data().uid === usuario.uid)
      : Promise.resolve(false);

    return reservaValida.then((esValida) => {
      if (esValida) return existente;
      // Si los datos antiguos quedaron desincronizados, intentamos reparar
      // Las cuentas antiguas sin nombre elegido se actualizan al nombre
      // completo de Google, normalizado y sin espacios.
    return db.runTransaction((transaccion) => {
      const lecturas = [];
      for (let numero = 0; numero < 100; numero += 1) {
        const candidato = numero === 0 ? base : base + (numero + 1);
        lecturas.push(transaccion.get(nombresRef.doc(candidato)));
      }
      return Promise.all(lecturas).then((fichas) => {
        const indiceLibre = fichas.findIndex((nombre) => !nombre.exists || nombre.data().uid === usuario.uid);
        if (indiceLibre < 0) throw new Error("No hay un nombre de usuario disponible.");
        const codigo = indiceLibre === 0 ? base : base + (indiceLibre + 1);
        transaccion.set(nombresRef.doc(codigo), {
          uid: usuario.uid,
          nombre: usuario.displayName || "Usuario",
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (existente && existente !== codigo) transaccion.delete(nombresRef.doc(existente));
        transaccion.set(usuarioRef, { nombreUsuario: codigo, codigoReferido: codigo }, { merge: true });
        return codigo;
      });
    });
    });
  });
}

function generarCodigoTemporalReferido(usuario) {
  const usuarioRef = db.collection("usuarios").doc(usuario.uid);
  return usuarioRef.get().then((ficha) => {
    const datos = ficha.exists ? ficha.data() : {};
    const base = normalizarCodigoReferidoPerfil(datos.nombreUsuario || usuario.displayName) || "usuario";
    const ahora = Date.now();
    const sigueActivo = (codigo, referencia) => {
      const informacion = referencia.data() || {};
      const expiraEn = informacion.expiraEn && informacion.expiraEn.toDate
        ? informacion.expiraEn.toDate().getTime()
        : 0;
      const sufijo = String(codigo).split("-").pop();
      return codigo && informacion.uid === usuario.uid && !informacion.usado
        && codigo.toLowerCase().startsWith((base + "-").toLowerCase())
        && /^[a-z0-9]{2}$/i.test(sufijo)
        && (!expiraEn || expiraEn > ahora);
    };
    const codigoGuardado = datos.codigoReferidoActivo;
    const revisarCodigoGuardado = codigoGuardado
      ? db.collection("codigosReferido").doc(codigoGuardado).get().then((referencia) => (
        referencia.exists && sigueActivo(codigoGuardado, referencia) ? codigoGuardado : null
      ))
      : Promise.resolve(null);
    const buscarCodigoAnterior = () => db.collection("codigosReferido")
      .where("uid", "==", usuario.uid)
      .get()
      .then((resultados) => {
        const activos = resultados.docs
          .filter((referencia) => sigueActivo(referencia.id, referencia))
          .sort((a, b) => {
            const fechaA = a.data().creadoEn && a.data().creadoEn.toMillis ? a.data().creadoEn.toMillis() : 0;
            const fechaB = b.data().creadoEn && b.data().creadoEn.toMillis ? b.data().creadoEn.toMillis() : 0;
            return fechaB - fechaA;
          });
        return activos.length ? activos[0].id : null;
      });
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const crearSufijo = () => Array.from({ length: 2 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join("");
    const intentar = (veces) => {
      const codigoVisible = base + "-" + crearSufijo();
      const codigo = codigoVisible.toLowerCase();
      const codigoRef = db.collection("codigosReferido").doc(codigo);
      return db.runTransaction((transaccion) => transaccion.get(codigoRef).then((existente) => {
        if (existente.exists) throw new Error("COLISION_CODIGO");
        transaccion.set(codigoRef, {
          codigo,
          codigoVisible,
          uid: usuario.uid,
          usado: false,
          creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
          expiraEn: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000))
        });
        transaccion.set(usuarioRef, { codigoReferidoActivo: codigo }, { merge: true });
        return codigoVisible;
      })).catch((error) => {
        if (error.message === "COLISION_CODIGO" && veces < 5) return intentar(veces + 1);
        throw error;
      });
    };
    return revisarCodigoGuardado.then((codigoActivo) => {
      if (codigoActivo) return codigoActivo;
      return buscarCodigoAnterior().then((codigoAnterior) => {
        if (codigoAnterior) {
          return usuarioRef.set({ codigoReferidoActivo: codigoAnterior }, { merge: true }).then(() => codigoAnterior);
        }
        return intentar(0);
      });
    });
  });
}

const DIAS_ESPERA_NOMBRE_USUARIO = 10;

function cambiarNombreUsuario(usuario, nombreNuevo, estadoElemento, mostrarNombre) {
  const nuevoCodigo = normalizarCodigoReferidoPerfil(nombreNuevo);
  if (!nuevoCodigo) {
    estadoElemento.textContent = "Escribe un nombre de usuario válido.";
    return Promise.reject(new Error("Nombre de usuario vacío."));
  }
  const usuarioRef = db.collection("usuarios").doc(usuario.uid);
  const nombresRef = db.collection("nombresUsuario");
  return db.runTransaction((transaccion) => transaccion.get(usuarioRef).then((ficha) => {
    const datos = ficha.exists ? ficha.data() : {};
    const ultimoCambio = datos.nombreUsuarioCambiadoEn && datos.nombreUsuarioCambiadoEn.toDate
      ? datos.nombreUsuarioCambiadoEn.toDate().getTime()
      : 0;
    const fechaDisponible = ultimoCambio + DIAS_ESPERA_NOMBRE_USUARIO * 24 * 60 * 60 * 1000;
    if (ultimoCambio && fechaDisponible > Date.now()) {
      const fechaTexto = new Date(fechaDisponible).toLocaleDateString("es-CL", {
        day: "numeric", month: "long", year: "numeric"
      });
      throw new Error("COOLDOWN_NOMBRE_USUARIO:" + fechaTexto);
    }
    const codigoAnterior = datos.codigoReferido || datos.nombreUsuario || "";
    const nuevoRef = nombresRef.doc(nuevoCodigo);
    const anteriorRef = codigoAnterior ? nombresRef.doc(codigoAnterior) : null;
    // El código temporal antiguo no se modifica aquí porque las reglas de
    // Firestore no permiten que su propietario edite ese documento. Al
    // quitar el puntero de la cuenta, el código deja de ser el activo y
    // conserva su expiración normal.
    return Promise.all([
      transaccion.get(nuevoRef),
      anteriorRef && codigoAnterior !== nuevoCodigo ? transaccion.get(anteriorRef) : Promise.resolve(null)
    ]).then(([nombreExistente, anterior]) => {
      if (nombreExistente.exists && nombreExistente.data().uid !== usuario.uid) {
        throw new Error("Ese nombre de usuario ya está ocupado.");
      }
      transaccion.set(nuevoRef, { uid: usuario.uid, nombre: nombreNuevo.trim(), actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (anteriorRef && codigoAnterior !== nuevoCodigo) transaccion.delete(anteriorRef);
      transaccion.set(usuarioRef, {
        nombreUsuario: nuevoCodigo,
        codigoReferido: nuevoCodigo,
        nombreUsuarioPersonalizado: true,
        nombreUsuarioCambiadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        codigoReferidoActivo: firebase.firestore.FieldValue.delete()
      }, { merge: true });
      return nuevoCodigo;
    });
  })).then((codigo) => {
    mostrarNombre(codigo);
    return db.collection("perfilesPublicos").doc(usuario.uid).set({ nombreUsuario: codigo, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(() => codigo);
  });
}

function filaNombreUsuarioEditable(usuario, estadoElemento) {
  const fila = document.createElement("div");
  fila.className = "fila-ajuste fila-nombre-usuario";
  const dt = document.createElement("dt");
  dt.textContent = "Nombre de usuario";
  const dd = document.createElement("dd");
  const valor = document.createElement("span");
  valor.textContent = "Cargando...";
  const editar = document.createElement("button");
  editar.type = "button";
  editar.className = "boton-editar-nombre";
  editar.setAttribute("aria-label", "Editar nombre de usuario");
  editar.title = "Editar nombre de usuario";
  editar.textContent = "✎";
  dd.append(valor, editar);
  fila.append(dt, dd);
  const mostrarNombre = (codigo) => { valor.textContent = codigo; editar.classList.remove("oculto"); };
  obtenerOCrearCodigoReferido(usuario).then(mostrarNombre).catch(() => { valor.textContent = "No disponible"; });
  editar.addEventListener("click", () => {
    const editor = document.createElement("span");
    editor.className = "editor-nombre-usuario";
    const input = document.createElement("input");
    input.type = "text"; input.maxLength = 40; input.value = valor.textContent === "No disponible" ? "" : valor.textContent; input.autocomplete = "off";
    input.setAttribute("aria-label", "Nuevo nombre de usuario");
    const guardar = document.createElement("button");
    guardar.type = "button"; guardar.className = "boton-mini-nombre"; guardar.textContent = "✓"; guardar.title = "Guardar nombre de usuario";
    const cancelar = document.createElement("button");
    cancelar.type = "button"; cancelar.className = "boton-mini-nombre boton-mini-cancelar"; cancelar.textContent = "×"; cancelar.title = "Cancelar";
    editor.append(input, guardar, cancelar); dd.replaceChildren(editor); input.focus();
    cancelar.addEventListener("click", () => dd.replaceChildren(valor, editar));
    guardar.addEventListener("click", () => {
      guardar.disabled = true;
      cambiarNombreUsuario(usuario, input.value, estadoElemento, mostrarNombre).then(() => {
        dd.replaceChildren(valor, editar); estadoElemento.textContent = "Nombre de usuario actualizado. Tu código de referido también cambió.";
      }).catch((error) => {
        guardar.disabled = false;
        if (error.message.indexOf("COOLDOWN_NOMBRE_USUARIO:") === 0) {
          estadoElemento.textContent = "Podrás cambiar el nombre de usuario nuevamente el "
            + error.message.replace("COOLDOWN_NOMBRE_USUARIO:", "") + ".";
        } else {
          estadoElemento.textContent = error.message === "Ese nombre de usuario ya está ocupado."
            ? error.message
            : "No se pudo actualizar el nombre de usuario.";
        }
      });
    });
  });
  return fila;
}

function mostrarAjustes(usuario) {
  const modalAnterior = document.querySelector(".modal-detalle-articulo");
  if (modalAnterior) modalAnterior.remove();

  const proveedores = usuario.providerData || [];
  const telefono = usuario.phoneNumber
    || (proveedores.find((p) => p && p.phoneNumber) || {}).phoneNumber
    || "No registrado";
  const correo = usuario.email
    || (proveedores.find((p) => p && p.email) || {}).email
    || "No registrado";
  const metodos = proveedores
    .map((p) => NOMBRES_PROVEEDOR[p.providerId] || p.providerId)
    .join(", ") || "No disponible";
  const metadatos = usuario.metadata || {};

  const modal = document.createElement("div");
  modal.className = "modal-detalle-articulo";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "titulo-ajustes");

  const contenido = document.createElement("article");
  contenido.className = "detalle-articulo detalle-ajustes";

  const etiqueta = document.createElement("p");
  etiqueta.className = "etiqueta-detalle-articulo";
  etiqueta.textContent = "Solo tú ves esto";

  const titulo = document.createElement("h2");
  titulo.id = "titulo-ajustes";
  titulo.textContent = "Mi cuenta";

  // --- Acciones del perfil: "Cambiar imagen de perfil", "Cambiar imagen de portada" y "Copiar enlace" ---
  // Antes estaban sueltas en la página; ahora viven dentro de este modal.
  const acciones = document.createElement("div");
  acciones.className = "acciones-ajustes";

  // Al tocar "Cambiar imagen de perfil" se muestran las dos alternativas:
  // elegir una imagen incluida en el sitio o cargar un archivo personal.
  const etiquetaFoto = document.createElement("button");
  etiquetaFoto.className = "boton-secundario selector-foto";
  etiquetaFoto.type = "button";
  etiquetaFoto.textContent = "Cambiar imagen de perfil";

  const inputFoto = document.createElement("input");
  inputFoto.id = "input-foto-perfil";
  inputFoto.type = "file";
  inputFoto.accept = "image/*";
  inputFoto.className = "oculto";

  const opcionesFoto = document.createElement("div");
  opcionesFoto.className = "selector-opciones-foto oculto";
  opcionesFoto.setAttribute("role", "dialog");
  opcionesFoto.setAttribute("aria-modal", "true");
  opcionesFoto.setAttribute("aria-label", "Elegir imagen de perfil");
  const contenidoOpcionesFoto = document.createElement("div");
  contenidoOpcionesFoto.className = "contenido-opciones-foto";
  const ayudaFoto = document.createElement("p");
  ayudaFoto.className = "texto-ayuda";
  ayudaFoto.textContent = "¿Cómo quieres cambiarla?";
  const botonesFoto = document.createElement("div");
  botonesFoto.className = "botones-opciones-foto";
  const botonImagenSitio = document.createElement("button");
  botonImagenSitio.className = "boton-secundario";
  botonImagenSitio.type = "button";
  botonImagenSitio.textContent = "Elegir una imagen del sitio";
  const botonCargarArchivo = document.createElement("button");
  botonCargarArchivo.className = "boton-secundario";
  botonCargarArchivo.type = "button";
  botonCargarArchivo.textContent = "Cargar una imagen de mis archivos";
  const rejillaFotos = document.createElement("div");
  rejillaFotos.className = "rejilla-fotos-perfil oculto";

  function guardarFotoElegida(url) {
    estadoAcciones.textContent = "Guardando foto...";
    Promise.all([
      db.collection("usuarios").doc(usuario.uid).set({ fotoPerfil: url }, { merge: true }),
      db.collection("perfilesPublicos").doc(usuario.uid).set({
        fotoPerfil: url,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
    ]).then(() => {
      fotoPerfil.src = url;
      estadoAcciones.textContent = "Foto de perfil actualizada.";
      rejillaFotos.classList.add("oculto");
      opcionesFoto.classList.add("oculto");
    }).catch((error) => {
      console.error("Error al guardar foto de perfil:", error.message);
      estadoAcciones.textContent = "No se pudo actualizar la foto. Intenta de nuevo.";
    });
  }

  cargarImagenesPerfilSitio().then((imagenes) => {
    rejillaFotos.innerHTML = "";
    imagenes.forEach((imagen) => {
      const opcion = document.createElement("button");
      opcion.type = "button";
      opcion.className = "opcion-foto-perfil";
      opcion.title = imagen.nombre;
      opcion.setAttribute("aria-label", "Usar imagen " + imagen.nombre);
      const miniatura = document.createElement("img");
      miniatura.src = imagen.url;
      miniatura.alt = "";
      miniatura.loading = "lazy";
      opcion.appendChild(miniatura);
      opcion.addEventListener("click", () => guardarFotoElegida(imagen.url));
      rejillaFotos.appendChild(opcion);
    });
  });
  botonesFoto.append(botonImagenSitio, botonCargarArchivo);
  contenidoOpcionesFoto.append(ayudaFoto, botonesFoto, rejillaFotos);
  opcionesFoto.appendChild(contenidoOpcionesFoto);
  etiquetaFoto.addEventListener("click", () => {
    opcionesFoto.classList.toggle("oculto");
    rejillaFotos.classList.add("oculto");
  });
  botonImagenSitio.addEventListener("click", () => rejillaFotos.classList.toggle("oculto"));
  botonCargarArchivo.addEventListener("click", () => inputFoto.click());
  opcionesFoto.addEventListener("click", (evento) => {
    if (evento.target === opcionesFoto) opcionesFoto.classList.add("oculto");
  });

  // Párrafo donde se muestran mensajes ("Subiendo foto...", "Enlace copiado.", etc.)
  const estadoAcciones = document.createElement("p");
  estadoAcciones.className = "texto-ayuda";

  // Cuando el usuario elige una imagen, se sube y se actualiza su foto.
  inputFoto.addEventListener("change", () => {
    const archivo = inputFoto.files[0];
    if (archivo) subirFotoPerfil(archivo, usuario, estadoAcciones);
  });

  // "Cambiar imagen de portada": abre/cierra el selector de fondos del muro.
  const botonPortada = document.createElement("button");
  botonPortada.className = "boton-secundario";
  botonPortada.type = "button";
  botonPortada.textContent = "Cambiar imagen de portada";
  botonPortada.setAttribute("aria-expanded", "false");
  botonPortada.setAttribute("aria-controls", "selector-portada");

  const selectorPortada = document.createElement("div");
  selectorPortada.id = "selector-portada";
  selectorPortada.className = "selector-portada oculto";
  const ayudaPortada = document.createElement("p");
  ayudaPortada.className = "texto-ayuda";
  ayudaPortada.textContent = "Elige el fondo de tu muro:";
  const rejillaPortada = document.createElement("div");
  rejillaPortada.className = "rejilla-portada";

  const opcionesPortada = {};
  function marcarOpcionPortada() {
    FONDOS_MURO.forEach((f) => {
      const activa = f.id === fondoMuroActual;
      opcionesPortada[f.id].classList.toggle("elegida", activa);
      opcionesPortada[f.id].setAttribute("aria-pressed", String(activa));
    });
  }

  FONDOS_MURO.forEach((fondo) => {
    const opcion = document.createElement("button");
    opcion.type = "button";
    opcion.className = "opcion-portada";
    opcion.setAttribute("data-fondo", fondo.id);
    const muestra = document.createElement("span");
    muestra.className = "muestra-portada";
    muestra.setAttribute("aria-hidden", "true");
    const nombreFondo = document.createElement("span");
    nombreFondo.textContent = fondo.nombre;
    opcion.append(muestra, nombreFondo);
    opcion.addEventListener("click", () => guardarFondoMuro(fondo.id, usuario, estadoAcciones, marcarOpcionPortada));
    opcionesPortada[fondo.id] = opcion;
    rejillaPortada.appendChild(opcion);
  });
  selectorPortada.append(ayudaPortada, rejillaPortada);
  marcarOpcionPortada();

  botonPortada.addEventListener("click", () => {
    const abierto = selectorPortada.classList.toggle("oculto") === false;
    botonPortada.setAttribute("aria-expanded", String(abierto));
  });

  const botonCopiar = document.createElement("button");
  botonCopiar.className = "boton-secundario boton-copiar-enlace";
  botonCopiar.type = "button";
  botonCopiar.textContent = "Copiar enlace";
  // Copia la dirección de esta página (el perfil público) al portapapeles.
  botonCopiar.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      estadoAcciones.textContent = "Enlace copiado.";
    }).catch(() => {
      estadoAcciones.textContent = "Copia la dirección de esta página desde el navegador.";
    });
  });

  const botonReferido = document.createElement("button");
  botonReferido.className = "boton-secundario boton-codigo-referido";
  botonReferido.type = "button";
  const textoCodigo = document.createElement("span");
  textoCodigo.textContent = "Mi código de referido";
  const iconoCopiar = document.createElement("span");
  iconoCopiar.className = "icono-copiar-codigo oculto";
  iconoCopiar.setAttribute("aria-hidden", "true");
  iconoCopiar.textContent = "⧉";
  botonReferido.append(textoCodigo, iconoCopiar);

  // Nota breve que explica para qué sirve el código. Empieza oculta y aparece
  // justo debajo del botón cuando el código ya se muestra.
  const notaReferido = document.createElement("p");
  notaReferido.className = "nota-referido oculto";
  const textoNotaReferido = document.createTextNode("Invita a más personas a la página y entrégales tu código de referido: cuando lo usen, ");
  const destacadoNotaReferido = document.createElement("strong");
  destacadoNotaReferido.textContent = "ambos reciben monedas de regalo";
  const finNotaReferido = document.createTextNode(". Cada código sirve para una persona.");
  notaReferido.append(textoNotaReferido, destacadoNotaReferido, finNotaReferido);

  // Bloque que junta el botón y su nota, para que la nota quede pegada debajo del botón.
  const bloqueReferido = document.createElement("div");
  bloqueReferido.className = "bloque-referido";
  bloqueReferido.append(botonReferido, notaReferido);

  botonReferido.addEventListener("click", () => {
    const codigo = botonReferido.dataset.codigo;
    if (codigo) {
      navigator.clipboard.writeText(codigo).then(() => {
        estadoAcciones.textContent = "Código copiado: " + codigo;
      }).catch(() => {
        estadoAcciones.textContent = "No se pudo copiar el código. Inténtalo nuevamente.";
      });
      return;
    }
    generarCodigoTemporalReferido(usuario).then((codigoListo) => {
      botonReferido.dataset.codigo = codigoListo;
      textoCodigo.textContent = "Mi código: " + codigoListo;
      iconoCopiar.classList.remove("oculto");
      // Con el código ya visible, mostramos debajo para qué sirve.
      notaReferido.classList.remove("oculto");
      estadoAcciones.textContent = "";
    }).catch(() => {
      estadoAcciones.textContent = "No se pudo generar el código. Inténtalo nuevamente.";
    });
  });

  acciones.append(etiquetaFoto, inputFoto, opcionesFoto, botonPortada, bloqueReferido, botonCopiar, selectorPortada, estadoAcciones);

  // --- Botón "Más información de mi cuenta" ---
  // Los datos privados quedan escondidos hasta que se toque este botón.
  const botonMasInfo = document.createElement("button");
  botonMasInfo.className = "boton-secundario boton-mas-info";
  botonMasInfo.type = "button";
  botonMasInfo.textContent = "Más información de mi cuenta";
  botonMasInfo.setAttribute("aria-expanded", "false");
  botonMasInfo.setAttribute("aria-controls", "info-cuenta-privada");

  // Contenedor de la información privada (empieza oculto con la clase "oculto").
  const infoPrivada = document.createElement("div");
  infoPrivada.id = "info-cuenta-privada";
  infoPrivada.className = "oculto";

  // Al tocar el botón se muestra u oculta la información, y el texto cambia.
  botonMasInfo.addEventListener("click", () => {
    const estabaOculta = infoPrivada.classList.toggle("oculto") === false;
    botonMasInfo.setAttribute("aria-expanded", String(estabaOculta));
    botonMasInfo.textContent = estabaOculta
      ? "Ocultar información de mi cuenta"
      : "Más información de mi cuenta";
  });

  const lista = document.createElement("dl");
  lista.className = "lista-ajustes";
  lista.append(
    filaNombreUsuarioEditable(usuario, estadoAcciones),
    filaAjuste("Correo (Gmail)", correo + (usuario.email ? (usuario.emailVerified ? " ✓ verificado" : " (sin verificar)") : "")),
    filaAjuste("Teléfono asociado", telefono),
    filaAjuste("Se registró con", metodos),
    filaAjuste("Cuenta creada", formatearFechaCuenta(metadatos.creationTime)),
    filaAjuste("Último ingreso", formatearFechaCuenta(metadatos.lastSignInTime)),
    filaAjuste("ID de usuario", usuario.uid)
  );

  const nota = document.createElement("p");
  nota.className = "texto-ayuda";
  nota.textContent = "Estos datos son privados y no aparecen en tu perfil público.";

  const cerrar = document.createElement("button");
  cerrar.className = "boton-comprar";
  cerrar.type = "button";
  cerrar.textContent = "Cerrar";
  cerrar.addEventListener("click", () => modal.remove());

  // La lista de datos y la nota van dentro del contenedor que se muestra al tocar el botón.
  infoPrivada.append(lista, nota);

  contenido.append(etiqueta, titulo, acciones, botonMasInfo, infoPrivada, cerrar);
  modal.appendChild(contenido);
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  cerrar.focus();
}

// Quita de la lista los "paquetes" que ya se abrieron (ej.: las papas fritas).
// Antes, al comprar un producto con premios se guardaban el paquete Y el premio
// (el tazo). Ahora solo se guarda el premio, pero hay compras antiguas con el
// paquete guardado. Un artículo es un paquete abierto cuando:
//   - su id es igual al del producto del que viene (origenProductoId), y
//   - en la misma lista hay otro artículo de ese mismo producto con id distinto
//     (el premio que salió de él).
// Los coleccionables comprados directamente (sin premios) no se tocan.
function quitarPaquetesAbiertos(articulos) {
  return articulos.filter((articulo) => {
    if (!articulo || typeof articulo !== "object") return true;
    if (!articulo.origenProductoId || articulo.id !== articulo.origenProductoId) return true;
    const tienePremio = articulos.some((otro) => otro && typeof otro === "object"
      && otro.origenProductoId === articulo.origenProductoId
      && otro.origenTiendaId === articulo.origenTiendaId
      && otro.id !== articulo.id);
    return !tienePremio;
  });
}

function mostrarArticulos(lista, articulos, vacio, categoria) {
  lista.innerHTML = "";
  if (!articulos.length) {
    const mensaje = document.createElement("li");
    mensaje.className = "muro-vacio";
    mensaje.textContent = vacio;
    lista.appendChild(mensaje);
    return;
  }

  articulos.forEach((articulo) => {
    const elemento = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-articulo-muro";
    boton.setAttribute("aria-label", "Ver " + (articulo.nombre || "artículo"));
    const imagen = document.createElement("img");
    imagen.src = obtenerImagenArticulo(articulo);
    imagen.alt = articulo.nombre || "Artículo";
    const nombre = document.createElement("strong");
    nombre.textContent = articulo.nombre || "Artículo";
    boton.append(imagen, nombre);
    boton.addEventListener("click", () => mostrarDetalleArticulo(articulo, categoria));
    elemento.appendChild(boton);
    lista.appendChild(elemento);
  });
}

// ---------------------------------------------------------------
// "Mis cositas" plegable: en vez de mostrar todos los tazos de golpe,
// se ve UN solo botón con la carátula de la colección de tazos de
// Dragon Ball. Al tocarlo se despliegan todos los tazos (la grilla de
// siempre) y al volver a tocarlo se pliegan.
// ---------------------------------------------------------------
// Si algún día quieres una foto fija como carátula, pon aquí su ruta
// (ej: "assets/img/caratula-tazos.jpg"). Vacío = se arma sola con
// los primeros tazos del usuario.
const PORTADA_TAZOS_URL = "";
const TITULO_PORTADA_TAZOS = "Tazos Dragon Ball";
let coleccionDesplegada = false; // se recuerda si se vuelve a pintar el muro

function mostrarColeccionPlegable(lista, articulos, vacio, categoria) {
  // Primero se crean todas las tarjetas de tazos como siempre.
  mostrarArticulos(lista, articulos, vacio, categoria);
  // Si no hay nada, queda el mensaje "Aún no hay coleccionables públicos."
  if (!articulos.length) return;

  lista.classList.add("coleccion-plegable");

  const elemento = document.createElement("li");
  elemento.className = "portada-coleccion";
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-articulo-muro boton-portada-coleccion";

  // Carátula: una foto fija o, si no hay, un abanico con 3 tazos del usuario.
  const caratula = document.createElement("div");
  caratula.className = "caratula-tazos";
  if (PORTADA_TAZOS_URL) {
    const foto = document.createElement("img");
    foto.src = PORTADA_TAZOS_URL;
    foto.alt = "";
    caratula.appendChild(foto);
  } else {
    articulos.slice(0, 3).forEach((articulo) => {
      const tazo = document.createElement("img");
      tazo.src = obtenerImagenArticulo(articulo);
      tazo.alt = "";
      caratula.appendChild(tazo);
    });
  }

  const textos = document.createElement("div");
  textos.className = "textos-portada-coleccion";
  const titulo = document.createElement("strong");
  titulo.textContent = TITULO_PORTADA_TAZOS;
  const cantidad = document.createElement("span");
  cantidad.textContent = articulos.length + (articulos.length === 1 ? " tazo coleccionado" : " tazos coleccionados");
  const indicador = document.createElement("span");
  indicador.className = "indicador-portada-coleccion";

  textos.append(titulo, cantidad, indicador);
  const logoSabritas = document.createElement("img");
  logoSabritas.className = "logo-sabritas-coleccion";
  logoSabritas.src = "assets/img/sabritas-smiley.webp";
  logoSabritas.alt = "";
  logoSabritas.setAttribute("aria-hidden", "true");
  logoSabritas.decoding = "async";

  boton.append(caratula, textos, logoSabritas);
  elemento.appendChild(boton);
  lista.insertBefore(elemento, lista.firstChild);

  function aplicarEstado() {
    lista.classList.toggle("coleccion-cerrada", !coleccionDesplegada);
    boton.setAttribute("aria-expanded", coleccionDesplegada ? "true" : "false");
    boton.setAttribute("aria-label", (coleccionDesplegada ? "Cerrar " : "Abrir ") + TITULO_PORTADA_TAZOS);
    indicador.textContent = coleccionDesplegada ? "Cerrar ▴" : "Abrir ▾";
  }
  boton.addEventListener("click", () => {
    coleccionDesplegada = !coleccionDesplegada;
    aplicarEstado();
  });
  aplicarEstado();
}

// ---------------------------------------------------------------
// Exhibidor: 3 casillas FIJAS (izquierda, centro y derecha) donde el
// dueño del perfil pone los tazos (u otros coleccionables) que quiere
// lucir arriba de "Mis cositas". Cada casilla es independiente: el
// dueño puede agregar un tazo en CUALQUIERA de las 3, y quitar o cambiar
// cualquiera, así él decide el orden en que lo ve el público.
// Se guarda en perfilesPublicos/{uid}.exhibidor como una lista de
// 3 posiciones: cada posición es una copia del artículo o null (casilla vacía).
// ---------------------------------------------------------------
// Cantidad de casillas que tiene el exhibidor.
const MAX_EXHIBIDOR = 3;
// Coleccionables del perfil (sin paquetes abiertos).
let coleccionPerfil = [];
// Las 3 casillas del exhibidor: cada una es un artículo o null si está vacía.
let exhibidorPerfil = [null, null, null];
// Es true cuando quien mira el perfil es su dueño (el único que puede editar).
let esDuenoPerfil = false;
// UID del dueño del perfil (se usa para guardar en Firestore).
let uidDuenoPerfil = null;
// Es true cuando el dueño apretó el engranaje y quiere ver los botones Cambiar y Quitar.
// Por defecto está apagado para que la página se vea limpia.
let modoEdicionExhibidor = false;
// Es true cuando el exhibidor guardado en Firestore tenía tazos que el usuario ya no posee.
// Si quien mira es el dueño, se limpia también en Firestore (ver cargarPerfil).
let exhibidorDesactualizado = false;

// Crea una "clave" de texto para reconocer si dos artículos son el mismo (id | nombre | número).
const claveArticulo = (a) => [a && a.id, a && a.nombre, a && a.numero].map((x) => x || "").join("|");

// Ordena por número (1, 2, 3...); los que no tienen número van al final.
function porNumeroArticulo(a, b) {
  // Convierte el número de cada artículo a entero (si no es número, queda NaN).
  const na = parseInt(a && a.numero, 10), nb = parseInt(b && b.numero, 10);
  // Marca cuáles artículos NO tienen número válido.
  const sa = Number.isNaN(na), sb = Number.isNaN(nb);
  // Función auxiliar: desempata comparando los nombres (con orden natural: "2" antes que "10").
  const nombre = () => String((a && a.nombre) || "").localeCompare(String((b && b.nombre) || ""), "es", { numeric: true });
  // Si ninguno tiene número, se ordenan por nombre.
  if (sa && sb) return nombre();
  // Si solo "a" no tiene número, va después de "b".
  if (sa) return 1;
  // Si solo "b" no tiene número, va después de "a".
  if (sb) return -1;
  // Si ambos tienen número, se ordena por número y, si empatan, por nombre.
  return na - nb || nombre();
}

// Copia solo los datos necesarios (Firestore no acepta valores "undefined").
function copiaParaExhibidor(articulo) {
  // Objeto nuevo donde se guardan solo los campos que importan.
  const copia = {};
  // Recorre cada campo permitido y lo copia solo si tiene un valor real.
  ["id", "nombre", "numero", "tipo", "imagen", "imagenTrasera", "origenProductoNombre", "estilo"].forEach((campo) => {
    if (articulo[campo] !== undefined && articulo[campo] !== null && articulo[campo] !== "") copia[campo] = articulo[campo];
  });
  // Si el artículo no tenía nombre, le ponemos uno genérico.
  if (!copia.nombre) copia.nombre = "Artículo";
  return copia;
}

// Revisa que cada tazo del exhibidor siga estando en la colección del usuario.
// Si el usuario ya no tiene un tazo (lo vendió, lo intercambió, lo publicó en
// Intercambios, el administrador vació su colección, etc.), esa casilla queda vacía.
// Devuelve la lista de 3 casillas ya corregida y si hubo algún cambio.
function conciliarExhibidorConColeccion(casillas, coleccion) {
  // Cuántas copias de cada artículo tiene realmente el usuario en su colección.
  const disponibles = {};
  coleccion.forEach((articulo) => {
    // La "clave" identifica al artículo (id | nombre | número).
    const clave = claveArticulo(articulo);
    disponibles[clave] = (disponibles[clave] || 0) + 1;
  });
  // Marca si alguna casilla tuvo que vaciarse.
  let huboCambios = false;
  // Recorre las 3 casillas en orden y conserva solo las que todavía se poseen.
  const conciliadas = casillas.map((articulo) => {
    // Una casilla vacía sigue vacía.
    if (!articulo) return null;
    const clave = claveArticulo(articulo);
    // Si queda al menos una copia disponible, el tazo se queda y se gasta esa copia
    // (así, si hay 2 casillas con el mismo tazo, hacen falta 2 copias).
    if (disponibles[clave] > 0) {
      disponibles[clave] -= 1;
      return articulo;
    }
    // Si ya no lo tiene, la casilla se vacía.
    huboCambios = true;
    return null;
  });
  return { conciliadas, huboCambios };
}

// Convierte lo que viene guardado en Firestore en una lista de exactamente 3 casillas.
// Sirve también para perfiles antiguos, que guardaban solo los tazos elegidos
// (por ejemplo 2 tazos): esos quedan en las primeras casillas y el resto vacías.
function normalizarExhibidor(guardado) {
  // Si lo guardado no es una lista, partimos con una lista vacía.
  const lista = Array.isArray(guardado) ? guardado : [];
  // Para cada una de las 3 casillas, usamos el artículo guardado o null si no hay.
  return Array.from({ length: MAX_EXHIBIDOR }, (_, i) => {
    const articulo = lista[i];
    return articulo && typeof articulo === "object" ? articulo : null;
  });
}

// Guarda las 3 casillas en Firestore y, si sale bien, vuelve a dibujar el exhibidor.
function guardarExhibidor(nuevo) {
  return db.collection("perfilesPublicos").doc(uidDuenoPerfil).set({
    // Se guarda la lista completa (con null en las casillas vacías).
    exhibidor: nuevo,
    // Marca de tiempo de la última actualización del perfil.
    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(() => {
    // Recién cuando Firestore confirma, actualizamos lo que se ve en pantalla.
    exhibidorPerfil = nuevo;
    pintarExhibidor();
  });
}

// ---------------------------------------------------------------
// Formas de exhibir un tazo ("skins" del exhibidor).
// El dueño elige una con el botón "Modificar" y queda guardada en el
// propio tazo del exhibidor (campo "estilo"). Todos los visitantes la ven.
// Para agregar un efecto nuevo: 1) súmalo a esta lista, 2) agrega su
// bloque en crearEscenarioTazo y 3) escribe su CSS (sección 20 de style.css).
// ---------------------------------------------------------------
const ESTILOS_EXHIBIDOR = [
  // "ninguno" = el tazo se ve como siempre, sin efectos.
  { id: "ninguno", nombre: "Normal" },
  // Resplandor azul y violeta que respira alrededor del tazo.
  { id: "aura", nombre: "Aura" },
  // Llamas doradas y halo amarillo, como la transformación Super Saiyajin.
  { id: "saiyajin", nombre: "Super Saiyajin" },
  // Rayos eléctricos que parpadean sobre un cielo de tormenta.
  { id: "truenos", nombre: "Truenos" },
  // El tazo sentado sobre un trono real.
  { id: "trono", nombre: "En un trono" },
  // Barrido de luz y chispas que titilan.
  { id: "brillo", nombre: "Brillo" }
];

// Devuelve el id del estilo si existe en la lista; si no, "ninguno".
// Así un valor raro o antiguo guardado en Firestore nunca rompe la página.
function estiloExhibidorValido(id) {
  return ESTILOS_EXHIBIDOR.some((e) => e.id === id) ? id : "ninguno";
}

// Construye el "escenario" de un tazo: una caja cuadrada con el fondo y los
// efectos del estilo elegido, y la imagen del tazo encima.
// Se usa en la tarjeta del exhibidor, en la vista previa y en las miniaturas.
// Todo el tamaño de los efectos va en porcentajes, así sirve para cualquier tamaño.
function crearEscenarioTazo(src, alt, estilo) {
  // Caja contenedora: la clase "escenario-<estilo>" activa el CSS de ese estilo.
  const escenario = document.createElement("div");
  escenario.className = "escenario-tazo escenario-" + estilo;

  // Capas decorativas que van DETRÁS del tazo (se escriben como HTML fijo, sin datos del usuario).
  let capasDetras = "";
  // Capas decorativas que van ENCIMA del tazo.
  let capasDelante = "";

  if (estilo === "aura") {
    // Un aro luminoso que pulsa y otro que gira.
    capasDetras = '<span class="fx fx-aura"></span><span class="fx fx-aura-anillo"></span>';
  } else if (estilo === "saiyajin") {
    // Halo amarillo + 5 llamas que parpadean + 3 chispas que suben.
    capasDetras =
      '<span class="fx fx-halo"></span>' +
      '<span class="fx fx-llama l1"></span><span class="fx fx-llama l2"></span>' +
      '<span class="fx fx-llama l3"></span><span class="fx fx-llama l4"></span>' +
      '<span class="fx fx-llama l5"></span>';
    capasDelante = '<span class="fx fx-ascua a1"></span><span class="fx fx-ascua a2"></span><span class="fx fx-ascua a3"></span>';
  } else if (estilo === "truenos") {
    // Cuatro rayos (uno por esquina) dibujados con un polígono SVG, más un anillo eléctrico.
    const rayo = '<svg class="fx fx-rayo" viewBox="0 0 100 100" aria-hidden="true"><polygon points="58,0 22,52 46,52 32,100 80,40 54,40 74,0"></polygon></svg>';
    capasDetras =
      '<span class="fx fx-anillo-electrico"></span>' +
      rayo.replace('class="fx fx-rayo"', 'class="fx fx-rayo r1"') +
      rayo.replace('class="fx fx-rayo"', 'class="fx fx-rayo r2"') +
      rayo.replace('class="fx fx-rayo"', 'class="fx fx-rayo r3"') +
      rayo.replace('class="fx fx-rayo"', 'class="fx fx-rayo r4"');
    // Un destello blanco muy corto que simula el relámpago.
    capasDelante = '<span class="fx fx-relampago"></span>';
  } else if (estilo === "trono") {
    // Trono dibujado en SVG: respaldo con arco, apoyabrazos, asiento y base.
    capasDetras =
      '<svg class="fx fx-trono" viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="tr-terciopelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a2133"/><stop offset="1" stop-color="#561019"/></linearGradient>' +
      '<linearGradient id="tr-oro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08f"/><stop offset="1" stop-color="#c88a22"/></linearGradient>' +
      '</defs>' +
      // Respaldo alto con la parte de arriba en arco.
      '<path d="M20 94 L20 24 Q20 6 50 4 Q80 6 80 24 L80 94 Z" fill="url(#tr-terciopelo)" stroke="#e6b94a" stroke-width="2"/>' +
      // Panel interior del respaldo.
      '<path d="M28 90 L28 26 Q28 14 50 12 Q72 14 72 26 L72 90 Z" fill="#7a1726" stroke="#e6b94a" stroke-width="1" opacity="0.9"/>' +
      // Joya dorada arriba del respaldo.
      '<circle cx="50" cy="5" r="3.4" fill="url(#tr-oro)" stroke="#8a5e10" stroke-width="0.8"/>' +
      // Apoyabrazos izquierdo y derecho.
      '<rect x="9" y="58" width="13" height="36" rx="4" fill="url(#tr-terciopelo)" stroke="#e6b94a" stroke-width="1.6"/>' +
      '<rect x="78" y="58" width="13" height="36" rx="4" fill="url(#tr-terciopelo)" stroke="#e6b94a" stroke-width="1.6"/>' +
      '<circle cx="15.5" cy="58" r="4" fill="url(#tr-oro)"/><circle cx="84.5" cy="58" r="4" fill="url(#tr-oro)"/>' +
      // Asiento dorado y base oscura.
      '<rect x="16" y="82" width="68" height="10" rx="3" fill="url(#tr-oro)" stroke="#8a5e10" stroke-width="1"/>' +
      '<rect x="12" y="92" width="76" height="8" rx="2" fill="#3a2a14"/>' +
      '</svg>';
  } else if (estilo === "brillo") {
    // Chispas con forma de estrella de 4 puntas.
    capasDelante =
      '<span class="fx fx-barrido-circulo"><span class="fx-barrido"></span></span>' +
      '<span class="fx fx-chispa c1"></span><span class="fx fx-chispa c2"></span>' +
      '<span class="fx fx-chispa c3"></span><span class="fx fx-chispa c4"></span>';
  }

  // Primero las capas de atrás, luego el tazo, luego las de adelante.
  escenario.insertAdjacentHTML("beforeend", capasDetras);
  const imagen = document.createElement("img");
  imagen.src = src;
  imagen.alt = alt || "Tazo";
  imagen.loading = "lazy";
  escenario.appendChild(imagen);
  escenario.insertAdjacentHTML("beforeend", capasDelante);
  return escenario;
}

// Dibuja las 3 casillas del exhibidor.
function pintarExhibidor() {
  // Limpia lo que hubiera dibujado antes.
  muroExhibidor.innerHTML = "";

  // Los visitantes no ven la sección si el dueño aún no puso nada.
  if (!exhibidorPerfil.some(Boolean) && !esDuenoPerfil) {
    seccionExhibidor.classList.add("oculto");
    return;
  }
  // Si hay algo que mostrar (o es el dueño), la sección se ve.
  seccionExhibidor.classList.remove("oculto");

  // El engranaje lo ve siempre el dueño: es la única forma de agregar, cambiar o quitar tazos.
  // Si quien mira no es el dueño, el modo edición queda apagado.
  if (!esDuenoPerfil) modoEdicionExhibidor = false;
  botonAjustesExhibidor.classList.toggle("oculto", !esDuenoPerfil);
  // Marca el botón como "activo" (presionado) mientras el modo edición está encendido.
  botonAjustesExhibidor.classList.toggle("activo", modoEdicionExhibidor);
  botonAjustesExhibidor.setAttribute("aria-pressed", String(modoEdicionExhibidor));

  // Recorre las 3 casillas respetando su posición (0 = izquierda, 1 = centro, 2 = derecha).
  exhibidorPerfil.forEach((articulo, posicion) => {
    if (articulo) {
      // --- Casilla con tazo ---
      // Reutilizamos mostrarArticulos para dibujar la tarjeta, pero en una lista temporal.
      const temporal = document.createElement("ul");
      mostrarArticulos(temporal, [articulo], "", "Exhibidor");
      // Tomamos la tarjeta (el <li>) ya dibujada.
      const tarjeta = temporal.firstElementChild;

      // Si el dueño eligió una forma de exhibir este tazo (botón "Modificar"), cambiamos
      // la imagen simple por el escenario con efectos. Lo ven el dueño y todos los visitantes.
      const estiloGuardado = estiloExhibidorValido(articulo.estilo);
      if (estiloGuardado !== "ninguno") {
        // Imagen que dibujó mostrarArticulos dentro de la tarjeta.
        const imagenOriginal = tarjeta.querySelector("img");
        // Se reemplaza por el escenario (que trae su propia imagen del mismo tazo).
        if (imagenOriginal) imagenOriginal.replaceWith(crearEscenarioTazo(imagenOriginal.src, imagenOriginal.alt, estiloGuardado));
      }

      // Solo el dueño, y solo con el modo edición encendido (engranaje), ve los botones para cambiar o quitar.
      if (esDuenoPerfil && modoEdicionExhibidor) {
        const acciones = document.createElement("div");
        acciones.className = "acciones-casilla-exhibidor";

        // Botón "Cambiar": abre el selector para reemplazar el tazo de ESTA casilla.
        const cambiar = document.createElement("button");
        cambiar.type = "button";
        cambiar.className = "boton-mini-exhibidor";
        cambiar.textContent = "\u21C4\uFE0E";
        cambiar.title = "Cambiar";
        cambiar.setAttribute("aria-label", "Cambiar el tazo de esta casilla");
        cambiar.addEventListener("click", () => abrirSelectorExhibidor(posicion));

        // Botón "Modificar": va justo debajo de "Cambiar" y abre la ventana para elegir
        // la forma de exhibir este tazo (aura, Super Saiyajin, truenos, trono, brillo...).
        const modificar = document.createElement("button");
        modificar.type = "button";
        modificar.className = "boton-mini-exhibidor boton-mini-modificar";
        modificar.textContent = "\u270E\uFE0E";
        modificar.title = "Modificar";
        modificar.setAttribute("aria-label", "Modificar la forma de exhibir el tazo de esta casilla");
        modificar.addEventListener("click", () => abrirModalEstiloExhibidor(posicion));

        // Botón "Quitar": deja vacía SOLO esta casilla (las otras no se mueven).
        const quitar = document.createElement("button");
        quitar.type = "button";
        quitar.className = "boton-mini-exhibidor boton-mini-quitar";
        quitar.textContent = "\u2715\uFE0E";
        quitar.title = "Quitar";
        quitar.setAttribute("aria-label", "Quitar el tazo de esta casilla");
        quitar.addEventListener("click", () => {
          // Evita doble clic mientras se guarda.
          quitar.disabled = true;
          // Copia de las casillas con la de esta posición vacía.
          const nuevo = exhibidorPerfil.slice();
          nuevo[posicion] = null;
          guardarExhibidor(nuevo).catch((error) => {
            console.error("Error al quitar del exhibidor:", error.message);
            quitar.disabled = false;
            window.alert("No se pudo quitar el tazo. Intenta de nuevo.");
          });
        });

        // Orden de arriba hacia abajo: Cambiar, Modificar, Quitar.
        acciones.append(cambiar, modificar, quitar);
        tarjeta.appendChild(acciones);
      }
      muroExhibidor.appendChild(tarjeta);
    } else if (esDuenoPerfil) {
      // --- Casilla vacía (solo la ve el dueño) ---
      // Con el modo edición apagado se ve translúcida, solo como sugerencia, y no se puede usar.
      // Con el modo edición encendido (engranaje) queda activa para agregar un tazo.
      const hueco = document.createElement("li");
      hueco.className = "hueco-exhibidor" + (modoEdicionExhibidor ? "" : " hueco-sugerido");
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-hueco-exhibidor";
      boton.setAttribute("aria-label", "Agregar un tazo en esta casilla del exhibidor");
      boton.innerHTML = '<span aria-hidden="true">+</span><small>Agregar tazo</small>';
      if (modoEdicionExhibidor) {
        // Al hacer clic se abre el selector para ESTA casilla exacta.
        boton.addEventListener("click", () => abrirSelectorExhibidor(posicion));
      } else {
        // Modo edición apagado: solo sugerencia visual, sin acción ni foco.
        boton.disabled = true;
        boton.tabIndex = -1;
        boton.setAttribute("aria-hidden", "true");
      }
      hueco.appendChild(boton);
      muroExhibidor.appendChild(hueco);
    }
  });
}

// Ventana para elegir UN tazo y ponerlo en la casilla indicada (0, 1 o 2).
function abrirSelectorExhibidor(posicion) {
  // Solo el dueño del perfil puede editar.
  if (!esDuenoPerfil || !uidDuenoPerfil) return;
  // Si ya había una ventana abierta, la cerramos.
  const modalAnterior = document.querySelector(".modal-detalle-articulo");
  if (modalAnterior) modalAnterior.remove();

  // Cuántas copias de cada artículo tiene el usuario en su colección.
  const poseidos = {};
  coleccionPerfil.forEach((a) => { const k = claveArticulo(a); poseidos[k] = (poseidos[k] || 0) + 1; });
  // Cuántas copias ya están en OTRAS casillas del exhibidor (la casilla actual no cuenta,
  // porque su tazo se va a reemplazar).
  const usados = {};
  exhibidorPerfil.forEach((a, i) => {
    if (a && i !== posicion) { const k = claveArticulo(a); usados[k] = (usados[k] || 0) + 1; }
  });
  // Lista ordenada por número, quitando los tazos que ya están en otra casilla
  // (así no se repite el mismo tazo en dos casillas, salvo que tenga copias).
  const mostrados = {};
  const entradas = coleccionPerfil
    .map((articulo) => ({ articulo }))
    .sort((x, y) => porNumeroArticulo(x.articulo, y.articulo))
    .filter(({ articulo }) => {
      const k = claveArticulo(articulo);
      const disponibles = (poseidos[k] || 0) - (usados[k] || 0);
      mostrados[k] = (mostrados[k] || 0) + 1;
      return mostrados[k] <= disponibles;
    });

  // Fondo oscuro de la ventana emergente.
  const modal = document.createElement("div");
  modal.className = "modal-detalle-articulo";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "titulo-editor-exhibidor");

  // Contenido de la ventana.
  const contenido = document.createElement("article");
  contenido.className = "detalle-articulo editor-exhibidor";

  // Título: indica en qué casilla se va a poner el tazo.
  const nombresCasillas = ["izquierda", "del centro", "derecha"];
  const titulo = document.createElement("h2");
  titulo.id = "titulo-editor-exhibidor";
  titulo.textContent = "Elige un tazo para la casilla " + nombresCasillas[posicion];
  const ayuda = document.createElement("p");
  ayuda.className = "texto-ayuda";
  ayuda.textContent = "Toca el tazo que quieres lucir en esta casilla.";

  // Rejilla con las opciones y párrafo para mensajes de estado.
  const rejilla = document.createElement("div");
  rejilla.className = "rejilla-exhibidor";
  const estado = document.createElement("p");
  estado.className = "texto-ayuda";

  // Si no hay nada para elegir, lo avisamos.
  if (!entradas.length) {
    const vacio = document.createElement("p");
    vacio.className = "texto-ayuda";
    vacio.textContent = "No tienes más coleccionables disponibles para exhibir.";
    rejilla.appendChild(vacio);
  }

  // Un botón por cada coleccionable disponible.
  entradas.forEach(({ articulo }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opcion-catalogo opcion-exhibidor";
    const img = document.createElement("img");
    img.src = obtenerImagenArticulo(articulo);
    img.alt = "";
    img.loading = "lazy";
    const nombre = document.createElement("span");
    nombre.textContent = (articulo.nombre || "Artículo") + (articulo.numero && !String(articulo.nombre || "").includes("#") ? " #" + articulo.numero : "");
    b.append(img, nombre);

    // Al elegir un tazo se guarda de inmediato en la casilla indicada.
    b.addEventListener("click", () => {
      // Bloquea todas las opciones mientras se guarda, para evitar clics dobles.
      rejilla.querySelectorAll("button").forEach((otro) => { otro.disabled = true; });
      estado.textContent = "Guardando...";
      // Copia de las casillas con el tazo nuevo SOLO en esta posición.
      const nuevo = exhibidorPerfil.slice();
      nuevo[posicion] = copiaParaExhibidor(articulo);
      // Si la casilla ya tenía una forma de exhibir elegida, el tazo nuevo la conserva.
      const estiloPrevio = exhibidorPerfil[posicion] && exhibidorPerfil[posicion].estilo;
      if (estiloPrevio && estiloPrevio !== "ninguno") nuevo[posicion].estilo = estiloPrevio;
      guardarExhibidor(nuevo).then(() => {
        modal.remove();
      }).catch((error) => {
        console.error("Error al guardar el exhibidor:", error.message);
        estado.textContent = "No se pudo guardar. Intenta de nuevo.";
        rejilla.querySelectorAll("button").forEach((otro) => { otro.disabled = false; });
      });
    });
    rejilla.appendChild(b);
  });

  // Botón para cerrar sin cambiar nada.
  const acciones = document.createElement("div");
  acciones.className = "acciones-exhibidor";
  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.className = "boton-secundario";
  cancelar.textContent = "Cancelar";
  cancelar.addEventListener("click", () => modal.remove());

  // Arma la ventana y la muestra.
  acciones.append(cancelar);
  contenido.append(titulo, ayuda, rejilla, estado, acciones);
  modal.appendChild(contenido);
  // Clic en el fondo oscuro también cierra la ventana.
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  cancelar.focus();
}

// Ventana "Modificar": muestra el tazo en grande y las formas de exhibirlo.
// Al tocar una forma se ve al instante en la vista previa; "Guardar" la deja fija.
function abrirModalEstiloExhibidor(posicion) {
  // Solo el dueño del perfil puede editar, y la casilla debe tener un tazo.
  if (!esDuenoPerfil || !uidDuenoPerfil) return;
  const articulo = exhibidorPerfil[posicion];
  if (!articulo) return;
  // Si había otra ventana abierta, la cerramos.
  const modalAnterior = document.querySelector(".modal-detalle-articulo");
  if (modalAnterior) modalAnterior.remove();

  // Estilo que está elegido en este momento (parte con el que ya tenía guardado).
  let estiloElegido = estiloExhibidorValido(articulo.estilo);
  // Imagen y nombre del tazo para dibujarlo en la vista previa y las miniaturas.
  const srcTazo = obtenerImagenArticulo(articulo);
  const nombreTazo = articulo.nombre || "Tazo";

  // Fondo oscuro de la ventana emergente.
  const modal = document.createElement("div");
  modal.className = "modal-detalle-articulo";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "titulo-modificar-exhibidor");

  // Contenido de la ventana.
  const contenido = document.createElement("article");
  contenido.className = "detalle-articulo editor-exhibidor editor-estilo-exhibidor";

  // Título y nombre del tazo que se está modificando.
  const titulo = document.createElement("h2");
  titulo.id = "titulo-modificar-exhibidor";
  titulo.textContent = "Modificar exhibición";
  const ayuda = document.createElement("p");
  ayuda.className = "texto-ayuda";
  ayuda.textContent = nombreTazo + ": elige cómo quieres lucirlo.";

  // Contenedor de la vista previa grande.
  const vistaPrevia = document.createElement("div");
  vistaPrevia.className = "vista-previa-estilo";

  // Rejilla con una miniatura por cada forma de exhibir.
  const rejilla = document.createElement("div");
  rejilla.className = "rejilla-estilos-exhibidor";
  rejilla.setAttribute("role", "radiogroup");
  rejilla.setAttribute("aria-label", "Formas de exhibir el tazo");

  // Párrafo para mensajes ("Guardando...", errores).
  const estado = document.createElement("p");
  estado.className = "texto-ayuda";

  // Dibuja de nuevo la vista previa con el estilo elegido.
  function pintarVistaPrevia() {
    vistaPrevia.innerHTML = "";
    vistaPrevia.appendChild(crearEscenarioTazo(srcTazo, nombreTazo, estiloElegido));
  }

  // Marca visualmente cuál opción está elegida.
  function marcarOpciones() {
    rejilla.querySelectorAll(".opcion-estilo").forEach((boton) => {
      const activa = boton.dataset.estilo === estiloElegido;
      boton.classList.toggle("elegida", activa);
      boton.setAttribute("aria-checked", String(activa));
    });
  }

  // Un botón por cada forma de exhibir.
  ESTILOS_EXHIBIDOR.forEach((estilo) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "opcion-estilo";
    boton.dataset.estilo = estilo.id;
    boton.setAttribute("role", "radio");
    // Miniatura: el mismo escenario, pero pequeño.
    const miniatura = document.createElement("div");
    miniatura.className = "miniatura-estilo";
    miniatura.appendChild(crearEscenarioTazo(srcTazo, nombreTazo, estilo.id));
    // Nombre del estilo debajo de la miniatura.
    const etiqueta = document.createElement("span");
    etiqueta.textContent = estilo.nombre;
    boton.append(miniatura, etiqueta);
    // Al tocar la opción se actualiza la vista previa (todavía no se guarda).
    boton.addEventListener("click", () => {
      estiloElegido = estilo.id;
      estado.textContent = "";
      pintarVistaPrevia();
      marcarOpciones();
    });
    rejilla.appendChild(boton);
  });

  // Botones de abajo: Guardar y Cancelar.
  const acciones = document.createElement("div");
  acciones.className = "acciones-exhibidor";

  const guardar = document.createElement("button");
  guardar.type = "button";
  guardar.className = "boton-comprar";
  guardar.textContent = "Guardar";
  guardar.addEventListener("click", () => {
    // Evita doble clic mientras se guarda.
    guardar.disabled = true;
    estado.textContent = "Guardando...";
    // Copia de las casillas con el estilo nuevo SOLO en esta posición.
    const nuevo = exhibidorPerfil.slice();
    const copia = Object.assign({}, nuevo[posicion]);
    // "Normal" no se guarda como campo (Firestore no acepta "undefined", así que se borra).
    if (estiloElegido === "ninguno") delete copia.estilo; else copia.estilo = estiloElegido;
    nuevo[posicion] = copia;
    guardarExhibidor(nuevo).then(() => {
      modal.remove();
    }).catch((error) => {
      console.error("Error al guardar la forma de exhibir:", error.message);
      estado.textContent = "No se pudo guardar. Intenta de nuevo.";
      guardar.disabled = false;
    });
  });

  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.className = "boton-secundario";
  cancelar.textContent = "Cancelar";
  cancelar.addEventListener("click", () => modal.remove());

  // Arma la ventana y la muestra.
  acciones.append(guardar, cancelar);
  contenido.append(titulo, ayuda, vistaPrevia, rejilla, estado, acciones);
  modal.appendChild(contenido);
  // Clic en el fondo oscuro también cierra la ventana.
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  pintarVistaPrevia();
  marcarOpciones();
  guardar.focus();
}

// Al apretar el engranaje se enciende o apaga el modo edición del exhibidor y se vuelve a dibujar.
botonAjustesExhibidor.addEventListener("click", () => {
  modoEdicionExhibidor = !modoEdicionExhibidor;
  pintarExhibidor();
});

function mostrarPerfil(perfil) {
  const nombre = perfil.nombreUsuario || perfil.nombre || "Usuario";
  if (nombrePerfilHeader) nombrePerfilHeader.textContent = nombre;
  nombrePerfil.textContent = nombre;
  fotoPerfil.src = perfil.fotoPerfil || avatarPredeterminado(nombre);
  fotoPerfil.alt = "Foto de perfil de " + nombre;
  fotoPerfil.onerror = () => { fotoPerfil.src = avatarPredeterminado(nombre); };
  aplicarFondoMuro(perfil.fondoMuro);
  coleccionPerfil = quitarPaquetesAbiertos(Array.isArray(perfil.coleccionables) ? perfil.coleccionables : []);
  // Lo guardado en el exhibidor se compara con la colección real: los tazos que el
  // usuario ya no tiene salen del exhibidor (para el dueño y para todos los visitantes).
  const resultadoConciliado = conciliarExhibidorConColeccion(normalizarExhibidor(perfil.exhibidor), coleccionPerfil);
  exhibidorPerfil = resultadoConciliado.conciliadas;
  exhibidorDesactualizado = resultadoConciliado.huboCambios;
  pintarExhibidor();
  mostrarColeccionPlegable(muroColeccionables, coleccionPerfil, "Aún no hay coleccionables públicos.", "Coleccionable");
  estadoPerfil.textContent = "";
  cabeceraPerfil.classList.remove("oculto");
}

// Guarda el fondo elegido en el perfil público y lo aplica al instante.
function guardarFondoMuro(id, usuario, estadoElemento, alTerminar) {
  const anterior = fondoMuroActual;
  aplicarFondoMuro(id);
  if (alTerminar) alTerminar();
  estadoElemento.textContent = "Guardando fondo...";
  db.collection("perfilesPublicos").doc(usuario.uid).set({
    fondoMuro: id,
    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(() => {
    estadoElemento.textContent = "Imagen de portada actualizada.";
  }).catch((error) => {
    console.error("Error al guardar el fondo del muro:", error.message);
    aplicarFondoMuro(anterior);
    if (alTerminar) alTerminar();
    estadoElemento.textContent = "No se pudo cambiar la portada. Intenta de nuevo.";
  });
}

// "estadoElemento" es el párrafo del modal donde se escriben los mensajes.
function subirFotoPerfil(archivo, usuario, estadoElemento) {
  estadoElemento.textContent = "Subiendo foto...";
  const datos = new FormData();
  datos.append("file", archivo, "perfil.jpg");
  datos.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload", { method: "POST", body: datos })
    .then((respuesta) => respuesta.json())
    .then((resultado) => {
      if (!resultado.secure_url) throw new Error("Cloudinary no devolvió una imagen.");
      const url = resultado.secure_url.replace("/upload/", "/upload/f_auto,q_auto,c_fill,g_face,w_320,h_320/");
      return Promise.all([
        db.collection("usuarios").doc(usuario.uid).set({ fotoPerfil: url }, { merge: true }),
        db.collection("perfilesPublicos").doc(usuario.uid).set({
          fotoPerfil: url,
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
      ]).then(() => url);
    })
    .then((url) => {
      fotoPerfil.src = url;
      estadoElemento.textContent = "Foto de perfil actualizada.";
    })
    .catch((error) => {
      console.error("Error al subir foto de perfil:", error.message);
      estadoElemento.textContent = "No se pudo actualizar la foto. Intenta de nuevo.";
    });
}

function cargarPerfil(uid, usuarioActual) {
  uidPerfilCargado = uid;
  db.collection("perfilesPublicos").doc(uid).get().then((documento) => {
    if (!documento.exists) {
      estadoPerfil.textContent = "Este perfil todavía no está disponible.";
      return;
    }
    mostrarPerfil(documento.data());
    if (usuarioActual && usuarioActual.uid === uid) {
      esDuenoPerfil = true;
      uidDuenoPerfil = uid;
      // Si el exhibidor tenía tazos que ya no están en la colección, el dueño deja
      // guardada la versión limpia en Firestore (los visitantes no pueden escribir).
      if (exhibidorDesactualizado) {
        exhibidorDesactualizado = false;
        guardarExhibidor(exhibidorPerfil).catch((error) => {
          console.error("No se pudo limpiar el exhibidor:", error.message);
        });
      }
      pintarExhibidor();
      linkInventarioPrivado.href = "coleccion.html?uid=" + encodeURIComponent(uid);
      linkInventarioPrivado.classList.remove("oculto");
      botonAjustes.classList.remove("oculto");
      botonAjustes.onclick = () => mostrarAjustes(usuarioActual);
    }
  }).catch((error) => {
    console.error("Error al cargar perfil:", error.message);
    estadoPerfil.textContent = "No se pudo cargar este perfil.";
  });
}

auth.onAuthStateChanged((usuario) => {
  usuarioAutenticado = usuario;
  esUsuarioRoot = !!usuario && usuario.email === EMAIL_ADMIN;
  configurarBarraPrincipal(usuario);
  const uidObjetivo = uidPerfil || (usuario && usuario.uid);
  if (!uidObjetivo) {
    estadoPerfil.textContent = "Inicia sesión para crear tu perfil.";
    return;
  }
  cargarPerfil(uidObjetivo, usuario);
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    const modal = document.querySelector(".modal-detalle-articulo");
    if (modal) modal.remove();
  }
});
