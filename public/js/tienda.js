/*
  ===========================================
  tienda.js - Lógica del catálogo de la tienda
  ===========================================
  Lee todos los productos guardados en la colección "productos" de
  Firestore (cargados desde el panel de admin) y dibuja una tarjeta
  por cada uno, cada una linkeando a su propia página de opciones
  (producto.html?id=...).
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const EMAIL_ADMIN = "arielriquelme08@gmail.com";

// -----------------------------------------------------------------
// 2) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const grillaProductos = document.getElementById("grilla-productos");
const IMAGEN_PRODUCTO_RESPALDO = "assets/img/cheetos-tazos.png";

let usuarioActual = null;
let ultimaColeccion = null;

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

// -----------------------------------------------------------------
// 3) FUNCIÓN: dibujar una tarjeta por cada producto
// -----------------------------------------------------------------
function dibujarProductos(coleccion) {
  ultimaColeccion = coleccion;
  // Vaciamos la grilla (por ahora tiene el mensaje de "Cargando...").
  grillaProductos.innerHTML = "";

  if (coleccion.empty) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "Todavía no hay productos cargados.";
    grillaProductos.appendChild(mensaje);

    if (usuarioActual && usuarioActual.email === EMAIL_ADMIN) {
      const linkAdmin = document.createElement("a");
      linkAdmin.href = "admin.html";
      linkAdmin.className = "tarjeta-producto tarjeta-admin-vacia";
      linkAdmin.textContent = "Agregar tiendas y productos con imágenes";
      grillaProductos.appendChild(linkAdmin);
    } else {
      const volver = document.createElement("p");
      volver.textContent = "¡Vuelve pronto!";
      grillaProductos.appendChild(volver);
    }
    return;
  }

  coleccion.forEach((documento, indice) => {
    // "documento.id" es el id del documento en Firestore (el "slug"
    // que armamos en admin.js, ej: "dragon-ball-z-cartas").
    // "documento.data()" nos da el objeto con nombre/imagen/opciones.
    const datos = documento.data();

    const tarjeta = document.createElement("a");
    tarjeta.className = "tarjeta-producto";
    // Armamos la URL con el id como parámetro: producto.html?id=xxxx
    tarjeta.href = "producto.html?id=" + documento.id;

    const imagen = document.createElement("img");
    imagen.src = optimizarImagenCloudinary(datos.imagen, 640) || IMAGEN_PRODUCTO_RESPALDO;
    imagen.alt = datos.nombre;
    imagen.className = "imagen-producto";
    imagen.loading = indice === 0 ? "eager" : "lazy";
    imagen.decoding = "async";
    if (indice === 0) imagen.fetchPriority = "high";
    imagen.onerror = () => {
      imagen.src = IMAGEN_PRODUCTO_RESPALDO;
    };

    const nombre = document.createElement("span");
    nombre.className = "nombre-producto";
    nombre.textContent = datos.nombre;

    tarjeta.appendChild(imagen);
    tarjeta.appendChild(nombre);
    grillaProductos.appendChild(tarjeta);
  });
}

function cargarProductos() {
  db.collection("productos").get().then((coleccion) => {
  dibujarProductos(coleccion);
  }).catch((error) => {
  console.error("Error al cargar los productos:", error.message);
  grillaProductos.innerHTML = "<p>Ocurrió un error al cargar los productos.</p>";
  });
}

// -----------------------------------------------------------------
// 4) TRAER LOS PRODUCTOS APENAS CARGA LA PÁGINA
// -----------------------------------------------------------------
// El catálogo es público: no hay que esperar a Firebase Auth para
// mostrarlo. Esperar aquí hacía que al volver desde producto.html la
// tienda quedara varios segundos en "Cargando productos..." en móviles.
cargarProductos();

auth.onAuthStateChanged((usuario) => {
  usuarioActual = usuario;
  // Si la primera carga ya terminó, solo redibujamos para actualizar
  // el acceso administrativo cuando corresponda.
  if (ultimaColeccion) dibujarProductos(ultimaColeccion);
});
