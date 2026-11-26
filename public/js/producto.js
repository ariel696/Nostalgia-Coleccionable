/*
  ===========================================
  producto.js - Lógica de la página de opciones (genérica)
  ===========================================
  Reemplaza a lo que antes era "tienda-cheetos.js". La diferencia
  clave: en vez de tener el producto y sus opciones escritos a mano
  en este archivo, ahora los busca en Firestore según el "id" que
  viene en la URL (?id=...). Así sirve para CUALQUIER producto que
  cargues desde el panel de admin, sin escribir código nuevo cada vez.
*/

// -----------------------------------------------------------------
// 1) CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// -----------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyARy4wUAsw-_kUR70GyorGFtnb8B1Y801M",
  authDomain: "nostalgia-coleccionable.firebaseapp.com",
  projectId: "nostalgia-coleccionable",
  storageBucket: "nostalgia-coleccionable.firebasestorage.app",
  messagingSenderId: "971467965546",
  appId: "1:971467965546:web:14470274e9affe6fdc291d"
};

// Solo los álbumes quedan reservados para una próxima etapa. El resto de los
// productos, como las papas, sigue disponible para comprar.
const COMPRAS_HABILITADAS = true;
const SONIDO_COMPRA_PAPAS = "assets/audio/abriendo-envase-papas.wav";

function esCompraProximamente(opcion) {
  const texto = [opcion && opcion.nombre, opcion && opcion.subtitulo]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return texto.includes("album") || texto.includes("dragon ball");
}

function reproducirSonidoCompra(opcion) {
  const texto = [opcion && opcion.nombre, opcion && opcion.subtitulo]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!texto.includes("papa") && !texto.includes("cheet")) return Promise.resolve();
  const sonido = new Audio(SONIDO_COMPRA_PAPAS);
  sonido.volume = 0.75;
  return new Promise((resolver) => {
    sonido.addEventListener("ended", resolver, { once: true });
    sonido.play().catch((error) => {
      console.warn("No se pudo reproducir el sonido de compra:", error.message);
      resolver();
    });
  });
}

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// -----------------------------------------------------------------
// 2) LEER EL "id" DEL PRODUCTO DESDE LA URL
// -----------------------------------------------------------------
// "URLSearchParams" es una herramienta del navegador que entiende el
// "?id=algo&otro=valor" que puede venir al final de una URL.
// "window.location.search" nos da esa parte de la URL actual, algo
// como "?id=cheetos-tazos".
const parametrosURL = new URLSearchParams(window.location.search);
const idProducto = parametrosURL.get("id");
// Si la URL fuera "producto.html?id=cheetos-tazos", entonces
// idProducto ahora vale el texto "cheetos-tazos".

// -----------------------------------------------------------------
// 3) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const tituloProducto = document.getElementById("titulo-producto");
const parrafoMonedasDisponibles = document.getElementById("monedas-disponibles");
const grillaOpciones = document.getElementById("grilla-opciones");
const linkEditarLugar = document.getElementById("link-editar-lugar");
const linkVolverTienda = document.querySelector(".link-volver");
const EMAIL_ADMIN = "arielriquelme08@gmail.com";

// Cloudinary entrega formatos modernos y una imagen del ancho necesario,
// reduciendo bastante el trabajo de red en celulares. Las demás URLs quedan
// intactas.
function optimizarImagenCloudinary(url, ancho) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;
  const marca = "/upload/";
  const posicion = url.indexOf(marca);
  if (posicion < 0) return url;

  const resto = url.slice(posicion + marca.length);
  const primerSegmento = resto.split("/")[0] || "";
  if (primerSegmento.includes(",") || primerSegmento.startsWith("f_")) return url;

  return url.slice(0, posicion + marca.length)
    + "f_auto,q_auto,w_" + ancho + ",c_limit/"
    + resto;
}

// Al volver desde la tienda, history.back() permite restaurar la página desde
// la caché del navegador en vez de descargar Firebase, fuentes y productos.
if (linkVolverTienda) {
  linkVolverTienda.addEventListener("click", (evento) => {
    try {
      const origen = new URL(document.referrer, window.location.href);
      const vieneDeLaTienda = origen.origin === window.location.origin
        && /\/tienda\.html$/i.test(origen.pathname);
      if (vieneDeLaTienda && window.history.length > 1) {
        evento.preventDefault();
        window.history.back();
      }
    } catch (error) {
      // El href normal sigue funcionando si el referrer no se puede leer.
    }
  });
}

const TAZOS_POKEMON_51 = [
  "Tazo Pokemon #001 Bulbasaur",
  "Tazo Pokemon #002 Ivysaur",
  "Tazo Pokemon #003 Venusaur",
  "Tazo Pokemon #004 Charmander",
  "Tazo Pokemon #005 Charmeleon",
  "Tazo Pokemon #006 Charizard",
  "Tazo Pokemon #007 Squirtle",
  "Tazo Pokemon #008 Wartortle",
  "Tazo Pokemon #009 Blastoise",
  "Tazo Pokemon #010 Caterpie",
  "Tazo Pokemon #011 Metapod",
  "Tazo Pokemon #012 Butterfree",
  "Tazo Pokemon #013 Weedle",
  "Tazo Pokemon #014 Kakuna",
  "Tazo Pokemon #015 Beedrill",
  "Tazo Pokemon #016 Pidgey",
  "Tazo Pokemon #017 Pidgeotto",
  "Tazo Pokemon #018 Pidgeot",
  "Tazo Pokemon #019 Rattata",
  "Tazo Pokemon #020 Raticate",
  "Tazo Pokemon #021 Spearow",
  "Tazo Pokemon #022 Fearow",
  "Tazo Pokemon #023 Ekans",
  "Tazo Pokemon #024 Arbok",
  "Tazo Pokemon #025 Pikachu",
  "Tazo Pokemon #026 Raichu",
  "Tazo Pokemon #027 Sandshrew",
  "Tazo Pokemon #028 Sandslash",
  "Tazo Pokemon #029 Nidoran F",
  "Tazo Pokemon #030 Nidorina",
  "Tazo Pokemon #031 Nidoqueen",
  "Tazo Pokemon #032 Nidoran M",
  "Tazo Pokemon #033 Nidorino",
  "Tazo Pokemon #034 Nidoking",
  "Tazo Pokemon #035 Clefairy",
  "Tazo Pokemon #036 Clefable",
  "Tazo Pokemon #037 Vulpix",
  "Tazo Pokemon #038 Ninetales",
  "Tazo Pokemon #039 Jigglypuff",
  "Tazo Pokemon #040 Wigglytuff",
  "Tazo Pokemon #041 Zubat",
  "Tazo Pokemon #042 Golbat",
  "Tazo Pokemon #043 Oddish",
  "Tazo Pokemon #044 Gloom",
  "Tazo Pokemon #045 Vileplume",
  "Tazo Pokemon #046 Paras",
  "Tazo Pokemon #047 Parasect",
  "Tazo Pokemon #048 Venonat",
  "Tazo Pokemon #049 Venomoth",
  "Tazo Pokemon #050 Diglett",
  "Tazo Pokemon #051 Dugtrio"
];

const COLORES_TAZOS = [
  "#F6C744",
  "#E65A3A",
  "#4FA382",
  "#3B82C4",
  "#8B5FBF",
  "#F08A24"
];

function colorParaTazo(indice) {
  return COLORES_TAZOS[indice % COLORES_TAZOS.length];
}

function crearImagenTazoDataUri(coleccionable) {
  const numero = coleccionable.numero || (coleccionable.id || "").replace("tazo-pokemon-", "") || "???";
  const nombreCorto = (coleccionable.nombre || "Tazo Pokemon").replace(/^Tazo Pokemon #[0-9]+\s*/, "");
  const color = coleccionable.color || "#F6C744";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${coleccionable.nombre || "Tazo Pokemon"}">
      <rect width="320" height="320" fill="#FFF8E7"/>
      <circle cx="160" cy="160" r="140" fill="${color}" stroke="#3B2E20" stroke-width="10"/>
      <circle cx="160" cy="160" r="112" fill="#FFFDF7" stroke="#C6402E" stroke-width="7"/>
      <circle cx="160" cy="140" r="54" fill="${color}" opacity="0.85"/>
      <text x="160" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#3B2E20">TAZO</text>
      <text x="160" y="153" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#C6402E">#${numero}</text>
      <text x="160" y="205" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#3B2E20">${nombreCorto}</text>
      <text x="160" y="244" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#7A6A54">Pokemon 51</text>
    </svg>`;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function escaparTextoSvg(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function crearImagenColeccionableDataUri(coleccionable) {
  const nombre = escaparTextoSvg(coleccionable.nombre || "Coleccionable");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${nombre}">
      <rect width="320" height="320" rx="26" fill="#FFF8E7"/>
      <rect x="22" y="22" width="276" height="276" rx="22" fill="#FFFDF7" stroke="#E6A93B" stroke-width="8"/>
      <circle cx="160" cy="126" r="54" fill="#6FC6A3" opacity="0.82"/>
      <path d="M98 218c18-42 106-42 124 0" fill="none" stroke="#C6402E" stroke-width="16" stroke-linecap="round"/>
      <text x="160" y="254" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#3B2E20">COLECCIONABLE</text>
    </svg>`;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function obtenerImagenColeccionable(coleccionable) {
  if (coleccionable.imagen && coleccionable.imagen !== "tazo-generado") {
    return coleccionable.imagen;
  }

  if (coleccionable.imagen === "tazo-generado" || coleccionable.tipo === "Tazo Pokemon") {
    return crearImagenTazoDataUri(coleccionable);
  }

  return crearImagenColeccionableDataUri(coleccionable);
}

function elegirColeccionableAleatorio(opcion) {
  const premiosPersonalizados = Array.isArray(opcion.premios)
    ? opcion.premios.filter((premio) => premio && premio.nombre)
    : [];

  if (premiosPersonalizados.length === 0) return null;

  const indicePremio = Math.floor(Math.random() * premiosPersonalizados.length);
  const premio = premiosPersonalizados[indicePremio];
  const idPremio = premio.id || premio.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return {
    id: idPremio,
    nombre: premio.nombre,
    tipo: premio.tipo || "Coleccionable",
    imagen: premio.imagen || "",
    ...(premio.numero ? { numero: premio.numero } : {}),
    ...(premio.imagenTrasera ? { imagenTrasera: premio.imagenTrasera } : {}),
    origenTiendaId: idProducto,
    origenProductoId: opcion.id,
    origenProductoNombre: opcion.nombre,
    obtenidoEn: new Date().toISOString(),
    compraId: idProducto + "__" + opcion.id + "__" + Date.now() + "__" + Math.floor(Math.random() * 100000)
  };
}

function elegirColeccionablesGanados(opcion) {
  if (obtenerTipoArticulo(opcion) !== "Coleccionable") return [];

  const tienePremios = Array.isArray(opcion.premios) && opcion.premios.some((premio) => premio && premio.nombre);
  if (!tienePremios) return [];

  const ganaPremioDoble = Math.random() < 0.03;
  const cantidad = ganaPremioDoble ? 2 : 1;
  const ganados = [];

  for (let i = 0; i < cantidad; i++) {
    ganados.push(elegirColeccionableAleatorio(opcion));
  }

  return ganados;
}

function obtenerTipoArticulo(opcion) {
  if (opcion.tipo === "Coleccionable") return "Coleccionable";
  if (opcion.tipo === "Objeto") return "Objeto";

  const tienePremios = Array.isArray(opcion.premios) && opcion.premios.some((premio) => premio && premio.nombre);
  return tienePremios ? "Coleccionable" : "Objeto";
}

function crearArticuloComprado(opcion, tipo) {
  return {
    id: opcion.id,
    nombre: opcion.nombre,
    tipo: tipo,
    imagen: opcion.imagen || "",
    origenTiendaId: idProducto,
    origenProductoId: opcion.id,
    origenProductoNombre: opcion.nombre,
    obtenidoEn: new Date().toISOString(),
    compraId: idProducto + "__" + opcion.id + "__" + Date.now() + "__" + Math.floor(Math.random() * 100000)
  };
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

  // Permite cambiar las imágenes por las versiones recortadas (sin el borde blanco).
  boton.cambiarImagenes = (frontal, trasera) => {
    if (frontal) urlFrontal = frontal;
    if (trasera) urlTrasera = trasera;
    aplicarCara();
  };

  return boton;
}

function mostrarCompraConfirmada(articuloComprado, coleccionablesGanados, tipoArticulo) {
  const modalExistente = document.querySelector(".modal-premio");
  if (modalExistente) {
    modalExistente.remove();
  }

  const modal = document.createElement("div");
  modal.className = "modal-premio";

  const contenido = document.createElement("div");
  contenido.className = "modal-premio-contenido";

  // Obtener dos coleccionables es un premio poco frecuente: la ventana toma
  // una apariencia de celebración y lo anuncia claramente.
  const esPremioDoble = Array.isArray(coleccionablesGanados) && coleccionablesGanados.length > 1;
  if (esPremioDoble) modal.classList.add("modal-premio-celebracion");

  const titulo = document.createElement("h2");
  titulo.textContent = esPremioDoble
    ? "¡Ganaste el doble!"
    : "Compraste " + articuloComprado.nombre;

  const bajada = document.createElement("p");
  bajada.textContent = esPremioDoble
    ? "¡Qué suerte! Esta compra te dio dos coleccionables."
    : tipoArticulo === "Objeto"
    ? "El objeto se agregó a tu inventario."
    : "El coleccionable se agregó a tu colección.";

  // En el modal mostramos solo lo que realmente se guardó: los premios si
  // los hay (los tazos), o el artículo comprado si no había premios.
  const articulosMostrados = coleccionablesGanados.length > 0
    ? coleccionablesGanados
    : [articuloComprado];

  const grilla = document.createElement("div");
  grilla.className = "modal-premio-tazos";

  articulosMostrados.forEach((coleccionable) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-tazo-premio";

    const imagen = document.createElement("img");
    imagen.className = "imagen-tazo-premio";
    imagen.src = obtenerImagenColeccionable(coleccionable);
    imagen.alt = coleccionable.nombre;

    const nombre = document.createElement("strong");
    nombre.textContent = coleccionable.nombre;

    tarjeta.appendChild(imagen);
    tarjeta.appendChild(nombre);

    const botonReverso = crearBotonReverso(imagen, coleccionable, imagen.src);
    if (botonReverso) tarjeta.appendChild(botonReverso);

    // Recorta el tazo a su círculo exacto (sin el borde/halo blanco). Mientras
    // tanto la imagen espera oculta para que no se vea el contorno feo.
    const urlOriginal = imagen.src;
    imagen.style.opacity = "0";
    imagen.style.transition = "opacity 200ms ease-out";
    const revelar = () => { imagen.style.opacity = "1"; };
    setTimeout(revelar, 3000);
    Promise.all([
      recortarCirculoImagen(urlOriginal),
      recortarCirculoImagen(coleccionable.imagenTrasera)
    ]).then(([frontal, trasera]) => {
      if (document.body.contains(modal)) {
        if (botonReverso) botonReverso.cambiarImagenes(frontal, trasera);
        else imagen.src = frontal;
      }
      revelar();
    });

    // Si el premio tiene número de colección, se muestra bajo el nombre.
    if (coleccionable.numero) {
      const numero = document.createElement("span");
      numero.className = "numero-tazo-premio";
      numero.textContent = "#" + coleccionable.numero;
      tarjeta.appendChild(numero);
    }

    grilla.appendChild(tarjeta);
  });

  const botonCerrar = document.createElement("button");
  botonCerrar.className = "boton-comprar";
  botonCerrar.textContent = "Aceptar";
  botonCerrar.addEventListener("click", () => modal.remove());

  contenido.appendChild(titulo);
  contenido.appendChild(bajada);
  contenido.appendChild(grilla);
  contenido.appendChild(botonCerrar);
  modal.appendChild(contenido);
  document.body.appendChild(modal);
}

// -----------------------------------------------------------------
// 3b) FUNCIÓN: ventana con el detalle de una opción
// -----------------------------------------------------------------
// Muestra la imagen en grande a la izquierda y, a la derecha, el nombre,
// la descripción, lo que se podría obtener y el precio con su botón.
// Deja cada tazo como un CÍRCULO PERFECTO sin el fondo de la foto.
// No borra por color (eso se "colaba" por los huecos del borde y comía partes
// de adentro). En cambio: 1) busca dónde está el tazo (todo lo que no es fondo
// claro y liso), 2) calcula su centro y su radio, y 3) recorta un círculo
// exacto. Todo lo que queda dentro del círculo se conserva intacto, incluso lo
// blanco o desgastado. Devuelve un PNG transparente, o null si no se puede
// (imagen de otro sitio sin permiso CORS, o no parece un tazo redondo, como un
// álbum); en ese caso se usa la imagen original.
const cacheImagenesSinFondo = new Map();

function quitarFondoClaro(origen) {
  if (!origen || origen.indexOf("data:") === 0) return Promise.resolve(null);
  if (cacheImagenesSinFondo.has(origen)) return cacheImagenesSinFondo.get(origen);

  const promesa = new Promise((resolver) => {
    const imagen = new Image();
    imagen.crossOrigin = "anonymous";
    imagen.onload = () => {
      try {
        // --- 1) Analizamos una copia chica para encontrar el tazo ---
        const ANALISIS = 180;
        const escala = Math.min(1, ANALISIS / Math.max(imagen.naturalWidth, imagen.naturalHeight));
        const aw = Math.max(1, Math.round(imagen.naturalWidth * escala));
        const ah = Math.max(1, Math.round(imagen.naturalHeight * escala));
        const lienzoA = document.createElement("canvas");
        lienzoA.width = aw;
        lienzoA.height = ah;
        const ctxA = lienzoA.getContext("2d", { willReadFrequently: true });
        ctxA.drawImage(imagen, 0, 0, aw, ah);
        const px = ctxA.getImageData(0, 0, aw, ah).data;

        const conteoColumnas = new Uint16Array(aw);
        const conteoFilas = new Uint16Array(ah);
        for (let y = 0; y < ah; y += 1) {
          for (let x = 0; x < aw; x += 1) {
            const i = (y * aw + x) * 4;
            const r = px[i], g = px[i + 1], b = px[i + 2];
            const minimo = Math.min(r, g, b);
            // Es "tazo" si no es un fondo claro y sin color.
            if (px[i + 3] > 20 && (minimo < 185 || Math.max(r, g, b) - minimo > 55)) {
              conteoColumnas[x] += 1;
              conteoFilas[y] += 1;
            }
          }
        }
        const UMBRAL = 8; // ignora motas sueltas y sombras
        let izq = -1, der = -1, arr = -1, aba = -1;
        for (let x = 0; x < aw; x += 1) if (conteoColumnas[x] >= UMBRAL) { if (izq < 0) izq = x; der = x + 1; }
        for (let y = 0; y < ah; y += 1) if (conteoFilas[y] >= UMBRAL) { if (arr < 0) arr = y; aba = y + 1; }
        if (izq < 0 || arr < 0) { resolver(null); return; }

        const ancho = der - izq;
        const alto = aba - arr;
        // Si no es más o menos cuadrado, no es un tazo redondo (ej.: un álbum).
        if (Math.abs(ancho - alto) > 0.12 * Math.max(ancho, alto) || Math.max(ancho, alto) < 0.5 * Math.max(aw, ah)) {
          resolver(null);
          return;
        }

        // --- 2) Centro y radio (en píxeles de la imagen original) ---
        const factor = imagen.naturalWidth / aw;
        const cx = ((izq + der) / 2) * factor;
        const cy = ((arr + aba) / 2) * (imagen.naturalHeight / ah);
        // Un pelín menos de radio para no dejar un halo blanco en el borde.
        const radio = (Math.max(ancho, alto) / 2 - 0.5) * factor;
        if (!(radio > 8)) { resolver(null); return; }

        // --- 3) Recortamos el círculo perfecto ---
        const SALIDA = 192;
        const lienzo = document.createElement("canvas");
        lienzo.width = SALIDA;
        lienzo.height = SALIDA;
        const ctx = lienzo.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.beginPath();
        ctx.arc(SALIDA / 2, SALIDA / 2, SALIDA / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(imagen, cx - radio, cy - radio, radio * 2, radio * 2, 0, 0, SALIDA, SALIDA);
        resolver(lienzo.toDataURL("image/png"));
      } catch (error) {
        resolver(null); // lienzo "contaminado" por CORS u otro problema
      }
    };
    imagen.onerror = () => resolver(null);
    imagen.src = origen;
  });

  cacheImagenesSinFondo.set(origen, promesa);
  return promesa;
}

// Imagen lista para mostrar en la grilla de premios. Primero se busca una
// miniatura ya recortada en círculo, guardada junto a la original en una
// carpeta "min" (ej.: .../dragon-ball-z/1tazo.webp -> .../dragon-ball-z/min/1tazo.webp).
// Pesa ~15 KB en vez de ~170 KB, así que aparece casi al instante. Si no
// existe, se recorta en el navegador con quitarFondoClaro().
const cacheImagenesPremio = new Map();

function urlMiniaturaPremio(origen) {
  if (!origen || /^(data:|https?:|\/\/)/i.test(origen)) return null;
  const partes = origen.match(/^(.*\/)?([^\/?#]+?)\.[a-z0-9]+([?#].*)?$/i);
  if (!partes) return null;
  return (partes[1] || "") + "min/" + partes[2] + ".webp";
}

function imagenListaPremio(origen) {
  if (cacheImagenesPremio.has(origen)) return cacheImagenesPremio.get(origen);
  const urlMin = urlMiniaturaPremio(origen);
  const promesa = new Promise((resolver) => {
    const alternativa = () => quitarFondoClaro(origen).then(resolver);
    if (!urlMin) { alternativa(); return; }
    const prueba = new Image();
    prueba.onload = () => resolver(urlMin);
    prueba.onerror = alternativa;
    prueba.src = urlMin;
  });
  cacheImagenesPremio.set(origen, promesa);
  return promesa;
}

// Lista de coleccionables que el usuario ya tiene (null = todavía no se sabe,
// por ejemplo sin sesión o mientras carga). Sirve para oscurecer, en el modal
// del producto, los premios que todavía le faltan.
let coleccionUsuarioActual = null;

function idDePremio(premio) {
  return premio.id || String(premio.nombre || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function usuarioTienePremio(premio) {
  if (!Array.isArray(coleccionUsuarioActual)) return true; // sin datos: no oscurecemos
  const idBuscado = idDePremio(premio);
  return coleccionUsuarioActual.some((item) => {
    if (!item) return false;
    if (item.id && item.id === idBuscado) return true;
    return item.nombre === premio.nombre
      && String(item.numero || "") === String(premio.numero || "");
  });
}

function mostrarDetalleOpcion(opcion, textoDescripcion, referenciaUsuario) {
  const modalExistente = document.querySelector(".modal-detalle-producto");
  if (modalExistente) modalExistente.remove();

  const modal = document.createElement("div");
  modal.className = "modal-detalle-producto";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", opcion.nombre);

  const contenido = document.createElement("div");
  contenido.className = "detalle-producto";

  const cerrar = () => {
    modal.remove();
    document.removeEventListener("keydown", alPresionarTecla);
  };
  const alPresionarTecla = (evento) => {
    if (evento.key === "Escape") cerrar();
  };
  document.addEventListener("keydown", alPresionarTecla);
  // Tocar el fondo oscuro (fuera de la ventana) también la cierra.
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) cerrar();
  });

  const botonX = document.createElement("button");
  botonX.type = "button";
  botonX.className = "detalle-producto-cerrar";
  botonX.setAttribute("aria-label", "Cerrar");
  botonX.textContent = "\u00D7";
  botonX.addEventListener("click", cerrar);

  // ---- Columna izquierda: imagen grande ----
  const columnaImagen = document.createElement("div");
  columnaImagen.className = "detalle-producto-imagen";
  const tieneImagen = typeof opcion.imagen === "string" && opcion.imagen.trim() !== "";
  if (tieneImagen) {
    const imagen = document.createElement("img");
    imagen.src = optimizarImagenCloudinary(opcion.imagen, 640);
    imagen.alt = opcion.nombre;
    imagen.decoding = "async";
    imagen.onerror = () => {
      imagen.remove();
      columnaImagen.classList.add("sin-imagen");
      columnaImagen.textContent = "Sin imagen";
    };
    columnaImagen.appendChild(imagen);
  } else {
    columnaImagen.classList.add("sin-imagen");
    columnaImagen.textContent = "Sin imagen";
  }
  const compraDisponible = COMPRAS_HABILITADAS && !esCompraProximamente(opcion);
  columnaImagen.classList.toggle("producto-proximamente", !compraDisponible);

  // ---- Columna derecha: textos y compra ----
  const columnaInfo = document.createElement("div");
  columnaInfo.className = "detalle-producto-info";

  const titulo = document.createElement("h2");
  titulo.textContent = opcion.nombre;

  const descripcion = document.createElement("p");
  descripcion.className = "detalle-producto-descripcion";
  descripcion.textContent = textoDescripcion;

  columnaInfo.appendChild(titulo);
  columnaInfo.appendChild(descripcion);

  // Si el producto trae premios, listamos qué se podría obtener.
  const premios = (Array.isArray(opcion.premios) ? opcion.premios : [])
    .filter((premio) => premio && premio.nombre);
  if (obtenerTipoArticulo(opcion) === "Coleccionable" && premios.length > 0) {
    const subtitulo = document.createElement("h3");
    subtitulo.textContent = premios.length === 1
      ? "Podr\u00EDas obtener:"
      : "Podr\u00EDas obtener uno de estos " + premios.length + ":";

    const sabeColeccion = Array.isArray(coleccionUsuarioActual);
    const cantidadTenidos = sabeColeccion ? premios.filter(usuarioTienePremio).length : 0;
    if (sabeColeccion) {
      subtitulo.textContent += " (tienes " + cantidadTenidos + ")";
    }

    const lista = document.createElement("ul");
    lista.className = "detalle-producto-premios";
    premios.forEach((premio) => {
      const item = document.createElement("li");
      item.className = "detalle-premio";
      if (sabeColeccion && !usuarioTienePremio(premio)) {
        item.classList.add("detalle-premio-faltante");
        item.title = "Aún no lo tienes";
      }

      const miniatura = document.createElement("img");
      miniatura.className = "detalle-premio-imagen";
      miniatura.loading = "lazy";
      miniatura.decoding = "async";
      miniatura.alt = premio.nombre;
      const origenImagen = optimizarImagenCloudinary(obtenerImagenColeccionable(premio), 180);
      miniatura.onerror = () => {
        miniatura.onerror = null;
        miniatura.src = crearImagenColeccionableDataUri(premio);
      };
      // Primero se limpia el fondo y recién después se muestra, para que no
      // aparezca un instante con el fondo blanco.
      miniatura.classList.add("cargando");
      imagenListaPremio(origenImagen).then((sinFondo) => {
        miniatura.src = sinFondo || origenImagen;
        miniatura.classList.remove("cargando");
      });

      const nombrePremio = document.createElement("span");
      nombrePremio.className = "detalle-premio-nombre";
      nombrePremio.textContent = (premio.numero ? "#" + premio.numero + " " : "") + premio.nombre;

      item.append(miniatura, nombrePremio);
      lista.appendChild(item);
    });

    columnaInfo.appendChild(subtitulo);
    columnaInfo.appendChild(lista);
  }

  const compra = document.createElement("div");
  compra.className = "detalle-producto-compra";

  const precio = document.createElement("p");
  precio.className = "precio-opcion";
  precio.textContent = Moneda.formatearMonedas(opcion.precio);

  const botonComprar = document.createElement("button");
  botonComprar.type = "button";
  botonComprar.className = "boton-comprar";
  botonComprar.textContent = "Comprar";
  botonComprar.disabled = !compraDisponible;
  botonComprar.setAttribute("aria-disabled", String(!compraDisponible));
  if (compraDisponible) botonComprar.addEventListener("click", () => {
    cerrar();
    comprarOpcion(referenciaUsuario, opcion);
  });

  compra.appendChild(precio);
  compra.appendChild(botonComprar);
  columnaInfo.appendChild(compra);

  contenido.appendChild(botonX);
  contenido.appendChild(columnaImagen);
  contenido.appendChild(columnaInfo);
  modal.appendChild(contenido);
  document.body.appendChild(modal);
  botonComprar.focus();
}

// -----------------------------------------------------------------
// 4) FUNCIÓN: dibujar la grilla de opciones en pantalla
// -----------------------------------------------------------------
// Recibe la lista de opciones (ahora viene de Firestore, ya no de
// una lista escrita a mano) y la referencia al usuario.
function dibujarOpciones(opciones, referenciaUsuario) {
  grillaOpciones.innerHTML = "";

  opciones.forEach((opcion) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-opcion";

    const vistaProducto = document.createElement("div");
    vistaProducto.className = "vista-producto-comprable";
    const compraDisponible = COMPRAS_HABILITADAS && !esCompraProximamente(opcion);
    vistaProducto.classList.toggle("producto-proximamente", !compraDisponible);
    vistaProducto.setAttribute("aria-label", opcion.nombre + (compraDisponible ? "" : ". Próximamente."));

    const descripcionElemento = document.createElement("div");
    descripcionElemento.className = "descripcion-opcion";

    const nombreElemento = document.createElement("strong");
    nombreElemento.className = "nombre-opcion";
    nombreElemento.textContent = opcion.nombre;

    const textoDescripcion = document.createElement("span");
    const tipoArticulo = obtenerTipoArticulo(opcion);
    const tienePremios = tipoArticulo === "Coleccionable"
      && Array.isArray(opcion.premios) && opcion.premios.some((premio) => premio && premio.nombre);
    textoDescripcion.textContent = opcion.descripcion || (tienePremios
      ? "Abre este artículo y gana un coleccionable al azar."
      : tipoArticulo === "Objeto"
        ? "Compra este objeto para tu inventario."
        : "Compra este coleccionable para tu colección.");

    descripcionElemento.appendChild(nombreElemento);
    descripcionElemento.appendChild(textoDescripcion);

    const tieneImagen = typeof opcion.imagen === "string" && opcion.imagen.trim() !== "";

    if (tieneImagen) {
      const imagenElemento = document.createElement("img");
      imagenElemento.className = "imagen-opcion";
      imagenElemento.src = optimizarImagenCloudinary(opcion.imagen, 480);
      imagenElemento.alt = opcion.nombre;
      imagenElemento.loading = "lazy";
      imagenElemento.decoding = "async";
      imagenElemento.onerror = () => {
        imagenElemento.remove();
        vistaProducto.classList.add("sin-imagen");
      };
      vistaProducto.appendChild(imagenElemento);
    } else {
      vistaProducto.classList.add("sin-imagen");
    }

    vistaProducto.appendChild(descripcionElemento);

    // Al hacer clic (o Enter/Espacio) en el producto se abre el detalle con
    // la descripción y los premios que se pueden ganar.
    vistaProducto.setAttribute("role", "button");
    vistaProducto.setAttribute("tabindex", "0");
    vistaProducto.style.cursor = "pointer";
    vistaProducto.addEventListener("click", () => {
      mostrarDetalleOpcion(opcion, textoDescripcion.textContent, referenciaUsuario);
    });
    vistaProducto.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        mostrarDetalleOpcion(opcion, textoDescripcion.textContent, referenciaUsuario);
      }
    });

    tarjeta.appendChild(vistaProducto);
    if (opcion.subtitulo) {
      const subtituloElemento = document.createElement("p");
      subtituloElemento.className = "subtitulo-opcion";
      subtituloElemento.textContent = opcion.subtitulo;
      tarjeta.appendChild(subtituloElemento);
    }

    const compraProducto = document.createElement("div");
    compraProducto.className = "compra-producto";

    const precioElemento = document.createElement("p");
    precioElemento.className = "precio-opcion";
    precioElemento.textContent = Moneda.formatearMonedas(opcion.precio);

    const botonComprar = document.createElement("button");
    botonComprar.className = "boton-comprar";
    botonComprar.type = "button";
    botonComprar.textContent = "Comprar";
    botonComprar.disabled = !compraDisponible;
    botonComprar.setAttribute("aria-disabled", String(!compraDisponible));
    if (compraDisponible) botonComprar.addEventListener("click", () => {
      comprarOpcion(referenciaUsuario, opcion);
    });

    compraProducto.appendChild(precioElemento);
    compraProducto.appendChild(botonComprar);
    tarjeta.appendChild(compraProducto);
    grillaOpciones.appendChild(tarjeta);
  });
}

// -----------------------------------------------------------------
// 5) FUNCIÓN: comprar una opción
// -----------------------------------------------------------------
function comprarOpcion(referenciaUsuario, opcion) {
  if (!COMPRAS_HABILITADAS || esCompraProximamente(opcion)) return;
  if (!auth.currentUser || !referenciaUsuario) {
    alert("Inicia sesión con Google para comprar este producto.");
    return;
  }

  referenciaUsuario.get().then((ficha) => {
    const datos = ficha.data();
    const monedasActuales = datos.monedas;

    if (monedasActuales < opcion.precio) {
      alert("Todavía no tienes dinero suficiente para esta opción.");
      return;
    }

    const coleccionablesGanados = elegirColeccionablesGanados(opcion);
    const tipoArticulo = obtenerTipoArticulo(opcion);
    const articuloComprado = crearArticuloComprado(opcion, tipoArticulo);

    // Qué se guarda en la colección del usuario:
    // - Si el producto traía premios (ej.: papas fritas con tazos), se guardan
    //   SOLO los premios. El paquete (las papas) se compra únicamente para
    //   abrirlo, así que no es un coleccionable.
    // - Si no traía premios, se guarda el artículo comprado como antes.
    const articulosParaGuardar = coleccionablesGanados.length > 0
      ? coleccionablesGanados
      : [articuloComprado];

    const cambiosCompra = {
      monedas: firebase.firestore.FieldValue.increment(-opcion.precio)
    };

    if (tipoArticulo === "Objeto") {
      cambiosCompra.inventario = firebase.firestore.FieldValue.arrayUnion(articuloComprado);
    } else {
      cambiosCompra.coleccionables = firebase.firestore.FieldValue.arrayUnion(...articulosParaGuardar);
    }

    const cambiosPerfilPublico = {
      nombre: datos.nombreUsuario || auth.currentUser.displayName || "Usuario",
      nombreUsuario: datos.nombreUsuario || "",
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (tipoArticulo === "Objeto") {
      cambiosPerfilPublico.inventario = firebase.firestore.FieldValue.arrayUnion(articuloComprado);
    } else {
      cambiosPerfilPublico.coleccionables = firebase.firestore.FieldValue.arrayUnion(...articulosParaGuardar);
    }

    const loteCompra = db.batch();
    loteCompra.update(referenciaUsuario, cambiosCompra);
    loteCompra.set(db.collection("perfilesPublicos").doc(auth.currentUser.uid), cambiosPerfilPublico, { merge: true });

    loteCompra.commit().then(() => {
      // Actualizamos la copia local para que el modal ya muestre lo recién ganado.
      if (tipoArticulo !== "Objeto" && Array.isArray(coleccionUsuarioActual)) {
        coleccionUsuarioActual = coleccionUsuarioActual.concat(articulosParaGuardar);
      }
      return reproducirSonidoCompra(opcion).then(() => {
        mostrarCompraConfirmada(articuloComprado, coleccionablesGanados, tipoArticulo);
        mostrarMonedasDisponibles(monedasActuales - opcion.precio);
      });
    }).catch((error) => {
      console.error("Error al comprar:", error.message);
      alert("Ocurrió un error al procesar la compra. Intenta de nuevo.");
    });
  }).catch((error) => {
    console.error("Error al leer las monedas antes de comprar:", error.message);
  });
}

// -----------------------------------------------------------------
// 6) FUNCIÓN: mostrar el texto de monedas disponibles
// -----------------------------------------------------------------
function mostrarMonedasDisponibles(cantidad) {
  parrafoMonedasDisponibles.textContent = "Tienes " + Moneda.formatearMonedas(cantidad) + " disponibles.";
}

function obtenerDatosUsuario(referenciaUsuario, usuario) {
  return referenciaUsuario.get().then((fichaUsuario) => {
    if (fichaUsuario.exists) {
      const datos = fichaUsuario.data() || {};
      const monedas = Number(datos.monedas) || 0;
      return Object.assign({}, datos, { monedas });
    }

    const datosIniciales = {
      nombre: usuario.displayName || "Usuario",
      correo: usuario.email || "",
      fotoPerfil: usuario.photoURL || "",
      monedas: 0,
      coleccionables: [],
      inventario: [],
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    return referenciaUsuario.set(datosIniciales, { merge: true }).then(() => datosIniciales);
  });
}

// -----------------------------------------------------------------
// 7) EL "CEREBRO" DE ESTA PÁGINA
// -----------------------------------------------------------------
// Acá encadenamos DOS revisiones antes de mostrar nada:
//   1) ¿Vino un "id" válido en la URL? Si alguien entra a
//      "producto.html" a secas, sin "?id=...", no tenemos qué
//      mostrar.
//   2) ¿Hay una sesión activa? (igual que en coleccion.js).
if (!idProducto) {
  tituloProducto.textContent = "Producto no encontrado";
  parrafoMonedasDisponibles.textContent = "";
  grillaOpciones.innerHTML = "<p>Vuelve a la tienda y elige un producto de la lista.</p>";
} else {
  let datosProductoCargado = null;
  let referenciaUsuarioActual = null;

  function pintarOpcionesDisponibles() {
    if (!datosProductoCargado) return;
    const opciones = Array.isArray(datosProductoCargado.opciones) ? datosProductoCargado.opciones : [];
    dibujarOpciones(opciones, referenciaUsuarioActual);
  }

  // El catálogo se carga independientemente de Authentication. Así una
  // sesión caducada no deja la página vacía ni escondida en una carga eterna.
  db.collection("productos").doc(idProducto).get().then((documentoProducto) => {
    if (!documentoProducto.exists) {
      tituloProducto.textContent = "Producto no encontrado";
      parrafoMonedasDisponibles.textContent = "";
      grillaOpciones.innerHTML = "<p>Ese producto ya no está disponible.</p>";
      return;
    }

    datosProductoCargado = documentoProducto.data();
    tituloProducto.textContent = datosProductoCargado.nombre || "Producto";
    pintarOpcionesDisponibles();
  }).catch((error) => {
    console.error("Error al cargar el producto:", error.message);
    parrafoMonedasDisponibles.textContent = "";
    grillaOpciones.innerHTML = "<p>Ocurrió un error al cargar este producto.</p>";
  });

  auth.onAuthStateChanged((usuario) => {
    referenciaUsuarioActual = usuario ? db.collection("usuarios").doc(usuario.uid) : null;

    if (!usuario) {
      coleccionUsuarioActual = null;
      linkEditarLugar.classList.add("oculto");
      parrafoMonedasDisponibles.textContent = "Inicia sesión para ver tu saldo y comprar.";
      pintarOpcionesDisponibles();
      return;
    }

    if (usuario.email === EMAIL_ADMIN) {
      linkEditarLugar.href = "admin.html?editar=" + encodeURIComponent(idProducto);
      linkEditarLugar.classList.remove("oculto");
    } else {
      linkEditarLugar.classList.add("oculto");
    }

    pintarOpcionesDisponibles();
    obtenerDatosUsuario(referenciaUsuarioActual, usuario).then((datosUsuario) => {
      coleccionUsuarioActual = Array.isArray(datosUsuario.coleccionables) ? datosUsuario.coleccionables : [];
      mostrarMonedasDisponibles(datosUsuario.monedas);
      pintarOpcionesDisponibles();
    }).catch((error) => {
      console.error("Error al cargar la ficha del usuario:", error.message);
      parrafoMonedasDisponibles.textContent = "No se pudo cargar tu saldo. Puedes iniciar sesión nuevamente.";
      pintarOpcionesDisponibles();
    });
  });
}

// Monedas y billetes que existen en la página (solo informativo).
if (document.getElementById("denominaciones-producto")) {
  Moneda.pintarDenominaciones(document.getElementById("denominaciones-producto"));
}
