/*
  ===========================================
  script.js - Lógica de Colecciones de ayer y hoy
  ===========================================
  Este archivo controla el COMPORTAMIENTO de la página.
  Hasta ahora tenemos: login con Google + monedas por usuario en
  Firestore + regalo diario de 5 monedas ($500) con escena de 2 imágenes +
  link a la página personal "Mi colección" (coleccion.html).
  La tienda de verdad (con productos) la construimos en un próximo
  paso; por ahora tienda.html es solo un esqueleto.
*/

// -----------------------------------------------------------------
// 1) CONFIGURACIÓN DE FIREBASE
// -----------------------------------------------------------------
// Este objeto le dice a Firebase "a cuál proyecto tuyo me conecto".
// TENÉS QUE REEMPLAZAR estos valores por los que copiaste desde la
// consola de Firebase (Configuración del proyecto > Tus apps > Web).
//
// Aclaración de seguridad: estos valores NO son secretos, son
// identificadores públicos (parecido a la dirección de tu casa: la
// gente puede saber dónde vivís, pero eso no significa que puedan
// entrar). La seguridad real de Firebase se controla desde la consola
// (qué dominios están autorizados, reglas de la base de datos, etc.),
// no ocultando este objeto.
const firebaseConfig = {
  apiKey: "AIzaSyARy4wUAsw-_kUR70GyorGFtnb8B1Y801M",
  authDomain: "nostalgia-coleccionable.firebaseapp.com",
  projectId: "nostalgia-coleccionable",
  storageBucket: "nostalgia-coleccionable.firebasestorage.app",
  messagingSenderId: "971467965546",
  appId: "1:971467965546:web:14470274e9affe6fdc291d"
};

if (window.location.hostname === "127.0.0.1") {
  const urlLocalhost = new URL(window.location.href);
  urlLocalhost.hostname = "localhost";
  window.location.replace(urlLocalhost.toString());
}

// -----------------------------------------------------------------
// 2) INICIALIZAR FIREBASE
// -----------------------------------------------------------------
// "firebase" es un objeto global que existe gracias a los <script> que
// agregamos en index.html (firebase-app-compat.js y firebase-auth-compat.js).
// Con esta línea, le pasamos NUESTRA configuración para conectar todo.
firebase.initializeApp(firebaseConfig);

// "auth" es nuestro "controlador de sesión": con él vamos a iniciar
// sesión, cerrar sesión, y preguntar "¿hay alguien logeado ahora mismo?".
const auth = firebase.auth();

// "db" (de "database", base de datos) es nuestro controlador de
// Firestore: con él vamos a leer y escribir datos guardados en la nube,
// como las monedas de cada usuario. Es el mismo patrón que "auth":
// un objeto que Firebase nos da listo para usar, gracias al script de
// Firestore que agregamos en index.html.
const db = firebase.firestore();

// "provider" le dice a Firebase específicamente CON QUÉ método vamos a
// iniciar sesión: en este caso, con una cuenta de Google.
const googleProvider = new firebase.auth.GoogleAuthProvider();

// -----------------------------------------------------------------
// 2.1) EMAIL DE LA CUENTA ADMIN
// -----------------------------------------------------------------
// NUEVO: acá definimos, en un solo lugar, cuál es TU cuenta de admin.
// La usamos más abajo para decidir si mostramos o no el link al
// panel de productos. Al tenerla en una constante (y no repetida en
// varios lugares del código), si el día de mañana cambiás de cuenta,
// solo tenés que actualizar esta línea.
//
// Repetimos esta misma constante en js/admin.js, porque cada archivo
// JavaScript es independiente (no se "ven" entre sí a menos que uno
// cargue al otro con <script>). Es la misma idea que ya usamos con
// firebaseConfig, que también está repetida en cada archivo.
const EMAIL_ADMIN = "arielriquelme08@gmail.com";
const INTERCAMBIOS_HABILITADOS = false;

// -----------------------------------------------------------------
// 3) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
// document.getElementById busca en el HTML un elemento por su "id" y
// nos da acceso a él desde JavaScript, para poder leerlo o modificarlo.
const botonAccionPrincipal = document.getElementById("btn-accion-principal");
const tarjetaSaldo = document.querySelector(".tarjeta-saldo");
const campoReferidoLogueado = document.getElementById("campo-referido-logueado");
const inputCodigoReferido = document.getElementById("input-codigo-referido");
const botonAplicarReferido = document.getElementById("btn-aplicar-referido");
const estadoCodigoReferido = document.getElementById("estado-codigo-referido");
const parrafoEstadoUsuario = document.getElementById("estado-usuario");
const parrafoMonedas = document.getElementById("monedas-usuario");
const botonDineroDiario = document.getElementById("btn-dinero-diario") || document.createElement("button");
// Botón ilustrado (la mano con monedas) que agregamos arriba del botón de
// texto. Hace exactamente lo mismo que botonDineroDiario: en cada lugar
// donde tocamos uno, tocamos el otro igual, para que ambos se muestren,
// se habiliten/deshabiliten y reclamen el dinero de forma sincronizada.
const botonRegaloDiario = document.getElementById("btn-regalo-diario") || document.createElement("button");
const estadoDineroDiario = document.getElementById("estado-dinero-diario") || document.createElement("p");
const linkMiColeccion = document.getElementById("link-mi-coleccion");
const fotoBotonPerfil = document.getElementById("foto-boton-perfil");
const linkIntercambios = document.getElementById("link-intercambios");
const linkZonaJuego = document.getElementById("link-zona-juego") || document.createElement("a");
const linkRoot = document.getElementById("link-root");
const botonCerrarSesion = document.getElementById("btn-cerrar-sesion");
const infoRoot = document.getElementById("info-root");
const panelRecargaRoot = document.getElementById("panel-recarga-root");
const inputRecargaMonedas = document.getElementById("input-recarga-monedas");
const botonRecargarMonedas = document.getElementById("btn-recargar-monedas");
const estadoRecargaMonedas = document.getElementById("estado-recarga-monedas");
const escenaRecompensa = document.getElementById("escena-recompensa");
const escenaImagen1 = document.getElementById("escena-imagen-1");
const escenaImagen2 = document.getElementById("escena-imagen-2");
const modalLugares = document.getElementById("modal-lugares") || document.createElement("div");
const botonCerrarModalLugares = document.getElementById("btn-cerrar-modal-lugares") || document.createElement("button");
const estadoModalLugares = document.getElementById("estado-modal-lugares") || document.createElement("p");
const grillaLugaresCompra = document.getElementById("grilla-lugares-compra") || document.createElement("div");
const linkAdminModal = document.getElementById("link-admin-modal") || document.createElement("a");
const IMAGEN_LUGAR_RESPALDO = "assets/img/cheetos-tazos.png";

function normalizarCodigoRegalo(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 40);
}

function mostrarErrorInicioSesion(error) {
  const codigo = error && error.code ? error.code : "";

  if (codigo === "auth/unauthorized-domain") {
    parrafoEstadoUsuario.textContent = "Firebase no permite iniciar sesión desde esta dirección. Abre la página como localhost o agrega este dominio en Firebase Auth.";
    return;
  }

  if (codigo === "auth/popup-closed-by-user") {
    parrafoEstadoUsuario.textContent = "Se cerró la ventana de Google antes de terminar el inicio de sesión.";
    return;
  }

  if (codigo === "auth/popup-blocked") {
    parrafoEstadoUsuario.textContent = "El navegador bloqueó la ventana de Google. Permití ventanas emergentes para este sitio e intentá de nuevo.";
    return;
  }

  parrafoEstadoUsuario.textContent = "No se pudo iniciar sesión con Google. Intentá de nuevo en unos segundos.";
}

// -----------------------------------------------------------------
// 4) FUNCIÓN: iniciar sesión con Google
// -----------------------------------------------------------------
function iniciarSesionConGoogle() {
  // signInWithPopup abre la típica ventanita de Google para elegir
  // cuenta e iniciar sesión. Es una función "asíncrona": no responde
  // al instante, responde cuando el usuario termina de interactuar
  // con esa ventana (por eso usamos .then() y .catch()).
  botonAccionPrincipal.disabled = true;
  botonAccionPrincipal.textContent = "Abriendo Google...";
  parrafoEstadoUsuario.textContent = "";

  auth.signInWithPopup(googleProvider)
    .then((resultado) => {
      // Si llegamos aquí, el login fue exitoso.
      // No necesitamos hacer nada más manualmente aquí: la función
      // onAuthStateChanged (más abajo) se va a dar cuenta sola de
      // que ahora hay un usuario logeado, y actualizará la pantalla.
      console.log("Sesión iniciada como:", resultado.user.displayName);
    })
    .catch((error) => {
      // Si algo sale mal (por ejemplo, el usuario cierra la ventana
      // sin elegir cuenta), lo mostramos en consola y también en pantalla.
      console.error("Error al iniciar sesión:", error.code, error.message);
      mostrarErrorInicioSesion(error);
    })
    .finally(() => {
      botonAccionPrincipal.disabled = false;
      if (!auth.currentUser) {
        botonAccionPrincipal.textContent = "Iniciar sesión con Google";
      }
    });
}

// Convierte un nombre o código en una clave estable. Conservamos el guion
// porque forma parte de los códigos temporales de referido.
function normalizarCodigoReferido(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// Reserva el nombre de usuario en un documento cuyo ID es el propio código.
// Si el nombre ya existe, agrega un número para mantener la unicidad.
function reservarNombreUsuario(usuario) {
  const base = normalizarCodigoReferido(usuario.displayName) || "usuario";
  const usuariosNombre = db.collection("nombresUsuario");
  return db.runTransaction((transaccion) => {
    const lecturas = [];
    for (let numero = 0; numero < 100; numero += 1) {
      const candidato = numero === 0 ? base : base + (numero + 1);
      lecturas.push(transaccion.get(usuariosNombre.doc(candidato)));
    }
    return Promise.all(lecturas).then((fichas) => {
      const indiceLibre = fichas.findIndex((ficha) => !ficha.exists || ficha.data().uid === usuario.uid);
      if (indiceLibre < 0) throw new Error("No se pudo reservar un nombre de usuario.");
      const nombreUsuario = indiceLibre === 0 ? base : base + (indiceLibre + 1);
      transaccion.set(usuariosNombre.doc(nombreUsuario), {
        uid: usuario.uid,
        nombre: usuario.displayName || "Usuario",
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return nombreUsuario;
    });
  });
}

function buscarReferenciaCodigoReferido(codigo) {
  const codigoLegado = codigo.includes("-")
    ? codigo.split("-")[0] + "-" + codigo.split("-").slice(1).join("-").toUpperCase()
    : codigo;
  const idsDirectos = [...new Set([codigo, codigoLegado])];
  const referencias = idsDirectos.map((id) => db.collection("codigosReferido").doc(id));
  return Promise.all(referencias.map((referencia) => referencia.get())).then((fichas) => {
    const indice = fichas.findIndex((ficha) => ficha.exists);
    if (indice >= 0) return referencias[indice];
    // Respaldo para códigos antiguos cuyo identificador quedó con otra
    // combinación de mayúsculas: comparamos el valor normalizado.
    return db.collection("codigosReferido").get().then((coleccion) => {
      const encontrado = coleccion.docs.find((documento) => {
        const datos = documento.data() || {};
        return [documento.id, datos.codigo, datos.codigoVisible]
          .some((valor) => normalizarCodigoReferido(valor) === codigo);
      });
      return encontrado ? encontrado.ref : null;
    });
  });
}

function aplicarCodigoReferidoPendiente(usuario, nombreUsuario) {
  const avisarCodigo = (mensaje) => {
    if (estadoCodigoReferido) estadoCodigoReferido.textContent = mensaje;
  };
  const codigo = normalizarCodigoReferido(localStorage.getItem("codigoReferidoPendiente"));
  localStorage.removeItem("codigoReferidoPendiente");
  if (!codigo) {
    avisarCodigo("Ingresa un código de referido.");
    return Promise.resolve(false);
  }
  if (codigo === nombreUsuario) {
    avisarCodigo("No puedes usar tu propio código de referido.");
    return Promise.resolve(false);
  }

  const invitacionRef = db.collection("referidos").doc(usuario.uid);
  const usuarioRef = db.collection("usuarios").doc(usuario.uid);
  return buscarReferenciaCodigoReferido(codigo).then((codigoTemporalRef) => {
    if (!codigoTemporalRef) {
      avisarCodigo("Ese código de referido no existe o no es válido.");
      return false;
    }
    return db.runTransaction((transaccion) => Promise.all([
      transaccion.get(codigoTemporalRef),
      transaccion.get(invitacionRef),
      transaccion.get(usuarioRef)
    ]).then(([codigoTemporal, invitacion, ficha]) => {
    if (!codigoTemporal || !codigoTemporal.exists) {
      avisarCodigo("Ese código de referido no existe o ya expiró.");
      return false;
    }
    const referido = codigoTemporal.data();
    const fechaExpiracion = referido.expiraEn && referido.expiraEn.toDate ? referido.expiraEn.toDate() : null;
    if (referido.usado || (fechaExpiracion && fechaExpiracion.getTime() <= Date.now())) {
      avisarCodigo("Ese código de referido ya fue usado o expiró.");
      return false;
    }
    if (invitacion.exists) {
      avisarCodigo("Esta cuenta ya usó un código de referido.");
      return false;
    }
    if (!ficha.exists) {
      avisarCodigo("Primero debes completar tu registro.");
      return false;
    }
    const referrerUid = referido.uid;
    if (!referrerUid || referrerUid === usuario.uid) {
      avisarCodigo("No puedes usar tu propio código de referido.");
      return false;
    }
    const monedas = Number(ficha.data().monedas) || 0;
    transaccion.update(usuarioRef, {
      monedas: monedas + 5,
      codigoReferidoUsado: codigo,
      codigoReferidoActivo: firebase.firestore.FieldValue.delete()
    });
    transaccion.update(codigoTemporal.ref, { usado: true, usadoPor: usuario.uid, usadoEn: firebase.firestore.FieldValue.serverTimestamp() });
    transaccion.set(invitacionRef, {
      referidoUid: usuario.uid,
      referrerUid,
      codigo: codigoTemporal.id,
      beneficioNuevoUsuario: 5,
      comisionInvitador: 10,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    return referrerUid;
    }));
  }).then((referrerUid) => {
    if (!referrerUid) return false;
    const referrerRef = db.collection("usuarios").doc(referrerUid);
    return db.runTransaction((transaccion) => transaccion.get(referrerRef).then((fichaInvitador) => {
      if (!fichaInvitador.exists) return false;
      const monedasInvitador = Number(fichaInvitador.data().monedas) || 0;
      transaccion.update(referrerRef, { monedas: monedasInvitador + 10 });
      return true;
    }));
  }).then((aplicado) => {
    if (aplicado) {
      parrafoEstadoUsuario.textContent = "¡Código aceptado! Recibiste 5 monedas ($500). Tu invitador recibió 10 monedas ($1.000).";
    }
    return aplicado;
  });
}

function actualizarCampoReferido(usuario) {
  if (!usuario || !campoReferidoLogueado) return;
  Promise.all([
    db.collection("usuarios").doc(usuario.uid).get(),
    db.collection("referidos").doc(usuario.uid).get()
  ]).then(([ficha, invitacion]) => {
    const datos = ficha.exists ? ficha.data() : {};
    const yaUsoCodigo = invitacion.exists || datos.codigoReferidoUsado;
    if (!datos.codigoReferidoUsado && invitacion.exists) {
      // Si root formateó la cuenta, el campo de uso ya fue eliminado y este
      // documento restante es un registro antiguo que debe limpiarse.
      return db.collection("referidos").doc(usuario.uid).delete().then(() => {
        campoReferidoLogueado.classList.remove("oculto");
      });
    }
    // El mismo campo también sirve para códigos de regalo, por eso debe
    // seguir visible aunque la cuenta ya haya usado un código de referido.
    campoReferidoLogueado.classList.remove("oculto");
  }).catch(() => campoReferidoLogueado.classList.remove("oculto"));
}

// -----------------------------------------------------------------
// 5) FUNCIÓN: buscar (o crear) la ficha del usuario en Firestore
// -----------------------------------------------------------------
// Esta función recibe el objeto "usuario" que nos da Firebase Auth
// (tiene su uid, nombre, foto, etc.) y hace lo siguiente:
//   1) Busca en la colección "usuarios" un documento con ese uid.
//   2) Si NO existe (es la primera vez que esta persona entra a la
//      página), le crea uno nuevo con 0 monedas y sin reclamos previos.
//   3) Si YA existe, simplemente lee sus datos.
//   4) En cualquiera de los dos casos, al final actualiza la pantalla
//      para mostrar cuántas monedas tiene.
function cerrarSesion() {
  auth.signOut().catch((error) => {
    console.error("Error al cerrar sesión:", error.message);
  });
}

function actualizarFotoBotonPerfil(url) {
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

function obtenerOCrearUsuario(usuario) {
  // db.collection("usuarios") -> apunta a la "carpeta" de usuarios.
  // .doc(usuario.uid) -> apunta a la "ficha" específica de esta persona,
  //   usando su código único (uid) como nombre de la ficha.
  const referenciaUsuario = db.collection("usuarios").doc(usuario.uid);

  // .get() busca esa ficha en la nube. Es asíncrono (tarda un
  // instante en responder), por eso usamos .then(), igual que con el
  // login.
  referenciaUsuario.get().then((ficha) => {
    // "ficha.exists" es true si ya existía un documento con ese uid,
    // y false si esta es la primera vez que vemos a este usuario.
    if (ficha.exists) {
      // Caso: ya teníamos una ficha guardada. Leemos sus datos con
      // ficha.data(), que nos devuelve un objeto como
      // { monedas: 500, ultimoReclamo: ... }
      const datos = ficha.data();
      const monedas = Number(datos.monedas) || 0;
      actualizarFotoBotonPerfil(datos.fotoPerfil || usuario.photoURL || "");
      parrafoEstadoUsuario.textContent = "Hola, " + (datos.nombreUsuario || usuario.displayName || "Usuario");
      mostrarMonedasEnPantalla(monedas);
      actualizarEstadoDineroDiario(datos.ultimoReclamo);

      // Guardamos (o actualizamos) el correo y el nombre de la cuenta de Google en la
      // ficha privada, para que el usuario root pueda verlos en su lista de registrados.
      // Así también se completan las cuentas antiguas la próxima vez que ingresen.
      const datosCuenta = {};
      if (usuario.email && datos.email !== usuario.email) datosCuenta.email = usuario.email;
      if (usuario.displayName && datos.nombre !== usuario.displayName) datosCuenta.nombre = usuario.displayName;
      if (Object.keys(datosCuenta).length) {
        referenciaUsuario.set(datosCuenta, { merge: true }).catch((error) => {
          console.error("Error al guardar el correo y nombre de la cuenta:", error.message);
        });
      }

      if (!Number.isFinite(Number(datos.monedas))) {
        referenciaUsuario.set({ monedas: monedas }, { merge: true });
      }

      const nombreListo = datos.nombreUsuario
        ? Promise.resolve(datos.nombreUsuario)
        : reservarNombreUsuario(usuario).then((nombreUsuario) => {
          return referenciaUsuario.set({ nombreUsuario, codigoReferido: nombreUsuario }, { merge: true }).then(() => nombreUsuario);
        });
      // Los códigos solo se aplican durante la creación inicial de la cuenta.
      localStorage.removeItem("codigoReferidoPendiente");
      nombreListo.then((nombreUsuario) => {
        sincronizarPerfilPublico(usuario, Object.assign({}, datos, { nombreUsuario }));
      }).catch((error) => console.error("Error al preparar el nombre de usuario:", error.message));
    } else {
      // Caso: primera vez que esta persona inicia sesión. Creamos su
      // ficha desde cero con valores iniciales.
      const datosIniciales = {
        monedas: 0,
        ultimoReclamo: null, // null = "todavía nunca reclamó nada"
        coleccionables: [], // [] = una lista vacía: todavía no tiene ningún objeto coleccionable
        inventario: [],
        fotoPerfil: usuario.photoURL || "",
        // Datos de la cuenta de Google (ficha privada: solo el dueño y el root la leen).
        email: usuario.email || "",
        nombre: usuario.displayName || "",
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      };

      reservarNombreUsuario(usuario).then((nombreUsuario) => {
      datosIniciales.nombreUsuario = nombreUsuario;
      datosIniciales.codigoReferido = nombreUsuario;
      // .set() escribe (guarda) esos datos en la ficha del usuario.
      // También esto es asíncrono, así que encadenamos otro .then().
      referenciaUsuario.set(datosIniciales).then(() => {
        return aplicarCodigoReferidoPendiente(usuario, nombreUsuario);
      }).then((aplicado) => {
        actualizarFotoBotonPerfil(datosIniciales.fotoPerfil || usuario.photoURL || "");
        parrafoEstadoUsuario.textContent = "Hola, " + nombreUsuario;
        if (aplicado) datosIniciales.monedas += 5;
        mostrarMonedasEnPantalla(datosIniciales.monedas);
        actualizarEstadoDineroDiario(datosIniciales.ultimoReclamo);
        sincronizarPerfilPublico(usuario, datosIniciales);
      });
      }).catch((error) => console.error("Error al reservar el nombre de usuario:", error.message));
    }
  }).catch((error) => {
    // Si algo falla al hablar con Firestore (por ejemplo, sin
    // internet), lo dejamos registrado en la consola por ahora.
    console.error("Error al leer/crear el usuario en Firestore:", error.message);
  });
}

function sincronizarPerfilPublico(usuario, datosUsuario) {
  db.collection("perfilesPublicos").doc(usuario.uid).set({
    // El nombre público único es el nombre de usuario. Eliminamos el campo
    // antiguo para que no vuelva a mostrarse el nombre real por accidente.
    nombre: firebase.firestore.FieldValue.delete(),
    nombreUsuario: datosUsuario.nombreUsuario || "",
    fotoPerfil: datosUsuario.fotoPerfil || usuario.photoURL || "",
    coleccionables: Array.isArray(datosUsuario.coleccionables) ? datosUsuario.coleccionables : [],
    inventario: Array.isArray(datosUsuario.inventario) ? datosUsuario.inventario : [],
    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch((error) => {
    console.error("Error al actualizar el perfil público:", error.message);
  });
}

// -----------------------------------------------------------------
// 6) FUNCIÓN: mostrar la cantidad de monedas en pantalla
// -----------------------------------------------------------------
// Función chica y simple, separada aparte porque la vamos a necesitar
// llamar desde varios lugares distintos más adelante (por ejemplo,
// cuando el usuario gane el regalo diario, para actualizar el número
// en pantalla al instante).
function mostrarMonedasEnPantalla(cantidad) {
  // Convertimos la cantidad recibida a número (si viene vacía o inválida, usamos 0).
  const monedas = Number(cantidad) || 0;
  // Cada moneda equivale a $100 pesos chilenos, así que multiplicamos por 100.
  const pesos = monedas * 100;
  // Mostramos solo el dinero total: el signo "$" adelante, puntos de miles (formato chileno) y terminando en "pesos".
  // Ejemplo: 3.910 monedas -> "Dinero: $391.000 pesos"
  parrafoMonedas.textContent = "Dinero: $" + pesos.toLocaleString("es-CL") + " pesos";
}

function obtenerFechaDesdeReclamo(ultimoReclamo) {
  if (!ultimoReclamo) {
    return null;
  }

  if (typeof ultimoReclamo.toDate === "function") {
    return ultimoReclamo.toDate();
  }

  const fecha = new Date(ultimoReclamo);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatearTiempoRestanteReclamo(ultimoReclamo) {
  const fechaUltimoReclamo = obtenerFechaDesdeReclamo(ultimoReclamo);

  if (!fechaUltimoReclamo) {
    return "";
  }

  const proximoReclamo = new Date(fechaUltimoReclamo.getTime() + 24 * 60 * 60 * 1000);
  const milisegundosRestantes = proximoReclamo - new Date();

  if (milisegundosRestantes <= 0) {
    return "Disponible";
  }

  const minutosTotales = Math.ceil(milisegundosRestantes / (1000 * 60));
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;

  if (horas === 0) {
    return minutos <= 1 ? "menos de 1 min" : minutos + " min";
  }

  return horas + " h " + String(minutos).padStart(2, "0") + " min";
}

// Muestra u oculta SOLO el botón de texto "Reclamar dinero diario". Las monedas
// ilustradas (botonRegaloDiario) se ven siempre: cuando no se puede reclamar
// quedan deshabilitadas, como antes. Usa su propia clase ("reclamo-no-disponible")
// y no "oculto", porque "oculto" ya lo usa el inicio/cierre de sesión.
let temporizadorReclamoDisponible = null;

function mostrarBotonesDineroDiario(visible) {
  botonDineroDiario.classList.toggle("reclamo-no-disponible", !visible);
}

function actualizarEstadoDineroDiario(ultimoReclamo) {
  clearTimeout(temporizadorReclamoDisponible);

  if (verificarSiTocaRecompensa(ultimoReclamo)) {
    mostrarBotonesDineroDiario(true);
    botonDineroDiario.disabled = false;
    botonRegaloDiario.disabled = false;
      estadoDineroDiario.textContent = "Tienes $500 pesos disponibles para reclamar hoy.";
  } else {
    // Todavía no se puede reclamar: el botón de texto desaparece hasta que pasen las 24 h
    // (las monedas quedan visibles pero deshabilitadas).
    mostrarBotonesDineroDiario(false);
    botonDineroDiario.disabled = true;
    botonRegaloDiario.disabled = true;
    estadoDineroDiario.textContent = "Ya reclamaste tu dinero diario. Podrás reclamarlo de nuevo en " + formatearTiempoRestanteReclamo(ultimoReclamo) + ".";

    // Si la página sigue abierta cuando se cumplan las 24 h, el botón reaparece solo.
    const fechaUltimoReclamo = obtenerFechaDesdeReclamo(ultimoReclamo);
    if (fechaUltimoReclamo) {
      const faltan = fechaUltimoReclamo.getTime() + 24 * 60 * 60 * 1000 - Date.now();
      // setTimeout no acepta esperas mayores a ~24,8 días; 24 h está de sobra.
      temporizadorReclamoDisponible = setTimeout(() => actualizarEstadoDineroDiario(ultimoReclamo), Math.max(faltan, 0) + 1000);
    }
  }
}


// -----------------------------------------------------------------
// 7) FUNCIÓN: ¿ya pasaron 24 horas desde el último reclamo?
// -----------------------------------------------------------------
// Recibe el valor de "ultimoReclamo" tal como está guardado en
// Firestore, y devuelve "true" (le toca el regalo) o "false" (todavía
// no le toca).
function verificarSiTocaRecompensa(ultimoReclamo) {
  // Caso 1: nunca reclamó nada todavía (así arrancan todos los
  // usuarios nuevos, según definimos en el Paso 2). Le toca sí o sí.
  if (!ultimoReclamo) {
    return true;
  }

  // Firestore no guarda fechas como las entiende JavaScript
  // directamente: las guarda en un formato propio llamado "Timestamp".
  // El método .toDate() lo convierte a un objeto Date normal de
  // JavaScript, con el que sí sabemos trabajar.
  const fechaUltimoReclamo = obtenerFechaDesdeReclamo(ultimoReclamo);

  if (!fechaUltimoReclamo) {
    return true;
  }

  // "new Date()" sin argumentos crea un objeto Date con el momento
  // EXACTO de ahora mismo (fecha y hora actuales).
  const ahora = new Date();

  // Restar dos objetos Date en JavaScript da como resultado la
  // diferencia entre ambos, medida en MILISEGUNDOS.
  const milisegundosTranscurridos = ahora - fechaUltimoReclamo;

  // Convertimos esos milisegundos a horas, para que sea más fácil de
  // leer y comparar:
  // 1000 milisegundos = 1 segundo
  // 1000 * 60 = 1 minuto
  // 1000 * 60 * 60 = 1 hora
  const horasTranscurridas = milisegundosTranscurridos / (1000 * 60 * 60);

  // Si pasaron 24 horas o más, le toca el regalo.
  return horasTranscurridas >= 24;
}

// -----------------------------------------------------------------
// 8) FUNCIÓN: mostrar la escena de las 2 imágenes y entregar el regalo
// -----------------------------------------------------------------
// Recibe la referencia a la ficha del usuario en Firestore (para poder
// actualizarla) y sus monedas actuales (para saber cuánto sumarle).
function mostrarEscenaDeRecompensa(referenciaUsuario, monedasActuales) {
  // Sacamos la clase "oculto" de la sección completa, para que
  // aparezca en pantalla. En este momento se ve la imagen 1 (la mamá),
  // porque es la única de las dos que NO tiene la clase "oculto".
  escenaRecompensa.classList.remove("oculto");

  // A los 2.5 segundos (2500 milisegundos), cambiamos de imagen:
  // ocultamos la 1 y mostramos la 2. setTimeout es una función que
  // "programa" código para que se ejecute más adelante, sin bloquear
  // el resto de la página mientras tanto.
  setTimeout(() => {
    escenaImagen1.classList.add("oculto");
    escenaImagen2.classList.remove("oculto");
  }, 2500);

  // Calculamos el nuevo total de monedas, sumando 5 monedas ($500).
  const monedasNuevas = monedasActuales + 5;

  // Actualizamos la ficha del usuario en Firestore con dos cambios:
  // - Le sumamos 5 monedas, equivalentes a $500.
  // - Guardamos el momento actual como su nuevo "ultimoReclamo", así
  //   mañana (cuando vuelva a intentar) va a tener que esperar de
  //   nuevo las 24 horas completas.
  //
  // firebase.firestore.FieldValue.serverTimestamp() le pide a
  // Firebase que use SU PROPIO reloj (el del servidor) para anotar la
  // hora, en vez de usar el reloj de la computadora del usuario. Esto
  // evita trampas: si alguien atrasara el reloj de su computadora a
  // propósito para reclamar el regalo antes de tiempo, no le
  // funcionaría, porque lo que cuenta es la hora real del servidor.
  referenciaUsuario.update({
    monedas: monedasNuevas,
    ultimoReclamo: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    // Actualizamos el número en pantalla al instante, sin esperar a
    // que la página se recargue.
    mostrarMonedasEnPantalla(monedasNuevas);
  }).catch((error) => {
    console.error("Error al entregar el regalo diario:", error.message);
  });

  // A los 5 segundos, dejamos de mostrar la escena y avanzamos solos
  // hacia la tienda (así el usuario alcanza a ver bien las 2 imágenes
  // antes de que la página cambie).
  setTimeout(() => {
    irATienda();
  }, 5000);
}

// -----------------------------------------------------------------
// 9) FUNCIÓN: ir a la tienda
// -----------------------------------------------------------------
// window.location.href es la forma en JavaScript de decirle al
// navegador "navegá a esta otra página", como si el usuario hubiera
// escrito esa dirección o hecho clic en un link.
function irATienda() {
  window.location.href = "tienda.html";
}

// -----------------------------------------------------------------
// 10) FUNCIÓN: qué pasa cuando el usuario logeado hace click en el botón
// -----------------------------------------------------------------
function irAComprar() {
  abrirModalLugaresCompra();
}

function cerrarModalLugaresCompra() {
  modalLugares.classList.add("oculto");
}

function crearTarjetaLugarCompra(documento) {
  const datos = documento.data();

  const tarjeta = document.createElement("a");
  tarjeta.className = "tarjeta-lugar-compra";
  tarjeta.href = "producto.html?id=" + encodeURIComponent(documento.id);

  const imagen = document.createElement("img");
  imagen.src = datos.imagen || IMAGEN_LUGAR_RESPALDO;
  imagen.alt = datos.nombre || "Lugar de compra";
  imagen.onerror = () => {
    imagen.src = IMAGEN_LUGAR_RESPALDO;
  };

  const nombre = document.createElement("span");
  nombre.textContent = datos.nombre || "Lugar de compra";

  tarjeta.appendChild(imagen);
  tarjeta.appendChild(nombre);

  return tarjeta;
}

function mostrarLugaresCompra(coleccion) {
  grillaLugaresCompra.innerHTML = "";

  if (auth.currentUser && auth.currentUser.email === EMAIL_ADMIN) {
    linkAdminModal.classList.remove("oculto");
  } else {
    linkAdminModal.classList.add("oculto");
  }

  if (coleccion.empty) {
    estadoModalLugares.textContent = auth.currentUser && auth.currentUser.email === EMAIL_ADMIN
      ? "Todavía no hay lugares cargados. Agrega el primero para que los usuarios puedan comprar."
      : "Todavía no hay lugares disponibles para comprar.";
    return;
  }

  estadoModalLugares.textContent = "Toca una imagen para ver qué puedes comprar ahí.";

  coleccion.forEach((documento) => {
    grillaLugaresCompra.appendChild(crearTarjetaLugarCompra(documento));
  });
}

function abrirModalLugaresCompra() {
  modalLugares.classList.remove("oculto");
  estadoModalLugares.textContent = "Cargando lugares...";
  grillaLugaresCompra.innerHTML = "";

  db.collection("productos").get().then((coleccion) => {
    mostrarLugaresCompra(coleccion);
  }).catch((error) => {
    console.error("Error al cargar lugares de compra:", error.message);
    estadoModalLugares.textContent = "No se pudieron cargar los lugares. Intenta de nuevo.";
    linkAdminModal.classList.add("oculto");
  });
}

function agarrarDineroDiario() {
  const usuario = auth.currentUser;

  if (!usuario) {
    return;
  }

  const referenciaUsuario = db.collection("usuarios").doc(usuario.uid);
  botonDineroDiario.disabled = true;
  botonRegaloDiario.disabled = true;
  estadoDineroDiario.textContent = "Agarrando dinero diario...";

  db.runTransaction((transaccion) => {
    return transaccion.get(referenciaUsuario).then((ficha) => {
      const datos = ficha.exists ? ficha.data() : {};
      const monedasActuales = Number(datos.monedas) || 0;

      if (!verificarSiTocaRecompensa(datos.ultimoReclamo || null)) {
        return {
          entregado: false,
          monedas: monedasActuales,
          ultimoReclamo: datos.ultimoReclamo || null
        };
      }

      const monedasNuevas = monedasActuales + 5;

      transaccion.set(referenciaUsuario, {
        monedas: monedasNuevas,
        ultimoReclamo: firebase.firestore.FieldValue.serverTimestamp(),
        coleccionables: datos.coleccionables || []
      }, { merge: true });

      return {
        entregado: true,
        monedas: monedasNuevas,
        ultimoReclamo: new Date()
      };
    });
  }).then((resultado) => {
    mostrarMonedasEnPantalla(resultado.monedas);

    if (resultado.entregado) {
      estadoDineroDiario.textContent = "Te dieron $500 pesos. Podrás reclamarlos de nuevo en " + formatearTiempoRestanteReclamo(resultado.ultimoReclamo) + ".";
      // Ya reclamó: se esconde el botón de texto y se programa su regreso en 24 h.
      actualizarEstadoDineroDiario(resultado.ultimoReclamo);
      estadoDineroDiario.textContent = "Te dieron $500 pesos. Podrás reclamarlos de nuevo en " + formatearTiempoRestanteReclamo(resultado.ultimoReclamo) + ".";
    } else {
      actualizarEstadoDineroDiario(resultado.ultimoReclamo);
    }
  }).catch((error) => {
    console.error("Error al agarrar dinero diario:", error.message);
    estadoDineroDiario.textContent = "No se pudo reclamar el dinero diario. Intenta de nuevo.";
    botonDineroDiario.disabled = false;
    botonRegaloDiario.disabled = false;
  });
}

// -----------------------------------------------------------------
// 11) EL "CEREBRO": reacciona cada vez que cambia el estado de sesión
// -----------------------------------------------------------------
// onAuthStateChanged es una función especial de Firebase que se
// ejecuta automáticamente:
//   - Una vez ni bien carga la página (para avisarnos si ya había una
//     sesión guardada de una visita anterior).
//   - Cada vez que el usuario inicia o cierra sesión.
//
// El parámetro "usuario" será:
//   - un objeto con sus datos (nombre, foto, email) si SÍ está logeado.
//   - "null" (nada) si NO está logeado.
function recargarMonedasRoot() {
  const usuario = auth.currentUser;

  if (!usuario || usuario.email !== EMAIL_ADMIN) {
    return;
  }

  const cantidad = Number(inputRecargaMonedas.value);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    estadoRecargaMonedas.textContent = "Ingresa una cantidad válida.";
    return;
  }

  botonRecargarMonedas.disabled = true;
  estadoRecargaMonedas.textContent = "Recargando monedas...";

  const referenciaUsuario = db.collection("usuarios").doc(usuario.uid);

  referenciaUsuario.update({
    monedas: firebase.firestore.FieldValue.increment(cantidad)
  }).then(() => {
    return referenciaUsuario.get();
  }).then((fichaActualizada) => {
    const datosActualizados = fichaActualizada.data();
    mostrarMonedasEnPantalla(datosActualizados.monedas);
    estadoRecargaMonedas.textContent = "Listo: sumaste " + cantidad + " monedas.";
  }).catch((error) => {
    console.error("Error al recargar monedas:", error.message);
    estadoRecargaMonedas.textContent = "No se pudieron recargar las monedas.";
  }).finally(() => {
    botonRecargarMonedas.disabled = false;
  });
}

function canjearCodigoRegalo(usuario, codigo) {
  const referenciaUsuario = db.collection("usuarios").doc(usuario.uid);
  const referenciaCodigo = db.collection("codigosRegalo").doc(codigo);

  return db.runTransaction((transaccion) => transaccion.get(referenciaCodigo).then((codigoSnap) => {
    if (!codigoSnap.exists) throw new Error("CODIGO_NO_EXISTE");
    const datosCodigo = codigoSnap.data() || {};
    const premioPesos = Number.isFinite(Number(datosCodigo.premioPesos))
      ? Math.floor(Number(datosCodigo.premioPesos))
      : Math.floor(Number(datosCodigo.monedas) || 0) * 100;
    const premioMonedas = premioPesos / 100;
    const expiraEn = datosCodigo.expiraEn;
    const vencido = expiraEn && typeof expiraEn.toMillis === "function" && expiraEn.toMillis() <= Date.now();
    if (datosCodigo.activo === false || !Number.isFinite(premioPesos) || premioPesos < 1 || vencido) {
      throw new Error("CODIGO_NO_VALIDO");
    }
    if (datosCodigo.tipoLimite === "usos" && Number(datosCodigo.usos) >= Number(datosCodigo.maxUsos)) {
      throw new Error("CODIGO_AGOTADO");
    }
    return transaccion.get(referenciaUsuario).then((ficha) => {
      if (!ficha.exists) throw new Error("REGISTRO_INCOMPLETO");
      const datos = ficha.data() || {};
      const usados = Array.isArray(datos.codigosRegaloUsados) ? datos.codigosRegaloUsados : [];
      if (usados.includes(codigo)) throw new Error("CODIGO_YA_USADO");
      const monedas = Number(datos.monedas) || 0;
      transaccion.update(referenciaUsuario, {
        monedas: monedas + premioMonedas,
        codigosRegaloUsados: [...usados, codigo]
      });
      transaccion.update(referenciaCodigo, {
        usos: (Number(datosCodigo.usos) || 0) + 1
      });
      return { monedasNuevas: monedas + premioMonedas, premioPesos };
    });
  }));
}

function aplicarCodigoUnificado() {
  const usuario = auth.currentUser;
  const texto = inputCodigoReferido && inputCodigoReferido.value.trim();
  if (!usuario || !inputCodigoReferido || !botonAplicarReferido || !estadoCodigoReferido) return;
  if (!texto) {
    estadoCodigoReferido.textContent = "Ingresa un código de referido o de regalo.";
    return;
  }

  botonAplicarReferido.disabled = true;
  estadoCodigoReferido.textContent = "Comprobando código...";
  const codigoRegalo = normalizarCodigoRegalo(texto);
  const codigoReferido = normalizarCodigoReferido(texto);
  db.collection("codigosRegalo").doc(codigoRegalo).get().then((codigoRegaloSnap) => {
    if (codigoRegaloSnap.exists) {
      return canjearCodigoRegalo(usuario, codigoRegalo).then(({ monedasNuevas, premioPesos }) => {
        mostrarMonedasEnPantalla(monedasNuevas);
        inputCodigoReferido.value = "";
        estadoCodigoReferido.textContent = "¡Código aceptado! Recibiste $" + premioPesos.toLocaleString("es-CL") + " pesos.";
        return true;
      });
    }
    localStorage.setItem("codigoReferidoPendiente", codigoReferido);
    return db.collection("usuarios").doc(usuario.uid).get().then((ficha) => {
      const datos = ficha.exists ? ficha.data() : {};
      return aplicarCodigoReferidoPendiente(usuario, datos.nombreUsuario || datos.codigoReferido || "");
    }).then((aplicado) => {
      if (aplicado) {
        campoReferidoLogueado.classList.add("oculto");
        inputCodigoReferido.value = "";
        estadoCodigoReferido.textContent = "Tu código de referido ha sido ingresado exitosamente.";
      } else if (!estadoCodigoReferido.textContent) {
        estadoCodigoReferido.textContent = "El código no existe o no es válido.";
      }
      return aplicado;
    });
  }).catch((error) => {
    if (error.message === "CODIGO_YA_USADO") {
      estadoCodigoReferido.textContent = "Ya usaste este código de regalo en esta cuenta.";
    } else if (error.message === "REGISTRO_INCOMPLETO") {
      estadoCodigoReferido.textContent = "Primero debes completar tu registro.";
    } else if (error.message === "CODIGO_AGOTADO") {
      estadoCodigoReferido.textContent = "Este código ya alcanzó su límite de usos.";
    } else if (error.message === "CODIGO_NO_VALIDO") {
      estadoCodigoReferido.textContent = "Ese código está vencido o ya no está activo.";
    } else {
      console.error("Error al aplicar código:", error.message);
      estadoCodigoReferido.textContent = "El código no existe o no es válido.";
    }
  }).finally(() => {
    botonAplicarReferido.disabled = false;
  });
}

auth.onAuthStateChanged((usuario) => {
  if (usuario) {
    // Caso: hay alguien logeado.
    tarjetaSaldo.classList.remove("oculto");
    actualizarCampoReferido(usuario);
    actualizarFotoBotonPerfil(usuario.photoURL || "");
    parrafoEstadoUsuario.textContent = "Hola, " + usuario.displayName;
    botonAccionPrincipal.textContent = "A comprar";

    // NUEVO: como ya hay alguien logeado, le mostramos el link a su
    // colección personal, sacándole la clase "oculto".
    linkMiColeccion.href = "perfil.html?u=" + encodeURIComponent(usuario.uid);
    botonDineroDiario.classList.remove("oculto");
    botonRegaloDiario.classList.remove("oculto");
    linkMiColeccion.classList.remove("oculto");
    linkIntercambios.classList.remove("oculto");
    if (!INTERCAMBIOS_HABILITADOS) linkIntercambios.classList.add("funcion-deshabilitada");
    linkZonaJuego.classList.remove("oculto");
    botonCerrarSesion.classList.remove("oculto");

    // NUEVO: acá comparamos el email de quien inició sesión contra
    // nuestra constante EMAIL_ADMIN. "usuario.email" nos lo da
    // Firebase automáticamente al loguearse con Google, no hace
    // falta pedírselo aparte. Si coinciden, le mostramos el link al
    // panel de administración; a cualquier otra persona (incluso
    // logeada), se lo dejamos oculto.
    if (usuario.email === EMAIL_ADMIN) {
      infoRoot.classList.remove("oculto");
      panelRecargaRoot.classList.remove("oculto");
      if (linkRoot) linkRoot.classList.remove("oculto");
    } else {
      infoRoot.classList.add("oculto");
      panelRecargaRoot.classList.add("oculto");
      if (linkRoot) linkRoot.classList.add("oculto");
    }

    // NUEVO: ahora que sabemos quién es, vamos a buscar (o crear) su
    // ficha en Firestore, para mostrar sus monedas en pantalla.
    obtenerOCrearUsuario(usuario);
  } else {
    // Caso: nadie logeado.
    tarjetaSaldo.classList.add("oculto");
    if (campoReferidoLogueado) campoReferidoLogueado.classList.add("oculto");
    parrafoEstadoUsuario.textContent = "";
    actualizarFotoBotonPerfil("");
    botonAccionPrincipal.textContent = "Iniciar sesión con Google";

    // NUEVO: sin nadie logeado, no existe "su" colección, así que
    // volvemos a ocultar el link.
    linkMiColeccion.href = "perfil.html";
    botonDineroDiario.classList.add("oculto");
    botonRegaloDiario.classList.add("oculto");
    linkMiColeccion.classList.add("oculto");
    linkIntercambios.classList.add("oculto");
    linkZonaJuego.classList.add("oculto");
    botonCerrarSesion.classList.add("oculto");

    // NUEVO: tampoco tiene sentido mostrar el link de admin sin
    // sesión activa.
    infoRoot.classList.add("oculto");
    panelRecargaRoot.classList.add("oculto");
    if (linkRoot) linkRoot.classList.add("oculto");

    // NUEVO: si nadie está logeado, no tiene sentido mostrar monedas
    // de nadie, así que limpiamos ese párrafo también.
    parrafoMonedas.textContent = "";
    clearTimeout(temporizadorReclamoDisponible);
    estadoDineroDiario.textContent = "";
  }
  // Solo mostramos el estado final cuando Firebase ya confirmó la sesión.
  document.body.classList.remove("auth-cargando");
});

// -----------------------------------------------------------------
// 12) CONECTAR EL CLICK DEL BOTÓN CON LA FUNCIÓN CORRECTA
// -----------------------------------------------------------------
// addEventListener es como decirle al botón: "quedate atento, y
// cuando alguien haga click, avisame para ejecutar esta función".
botonAccionPrincipal.addEventListener("click", () => {
  if (auth.currentUser) {
    // Si YA hay alguien logeado -> vamos al flujo de compra.
    irAComprar();
  } else {
    // Si NO hay nadie logeado -> abrimos el login de Google.
    iniciarSesionConGoogle();
  }
});

botonCerrarSesion.addEventListener("click", cerrarSesion);

botonDineroDiario.addEventListener("click", agarrarDineroDiario);
botonRegaloDiario.addEventListener("click", agarrarDineroDiario);

botonCerrarModalLugares.addEventListener("click", cerrarModalLugaresCompra);

modalLugares.addEventListener("click", (evento) => {
  if (evento.target === modalLugares) {
    cerrarModalLugaresCompra();
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalLugares.classList.contains("oculto")) {
    cerrarModalLugaresCompra();
  }
});

botonRecargarMonedas.addEventListener("click", recargarMonedasRoot);

botonAplicarReferido.addEventListener("click", aplicarCodigoUnificado);
inputCodigoReferido.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") aplicarCodigoUnificado();
});
