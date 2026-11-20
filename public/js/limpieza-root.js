/*
  ===========================================
  limpieza-root.js - Limpieza de cuentas de prueba
  ===========================================
  Esta sección ANTES vivía en admin.html (junto a "Administrar lugares").
  Ahora vive en root.html (la página del usuario root), porque ahí es
  donde van a ir ordenadas todas las herramientas exclusivas del root.

  Qué hace: busca usuarios y deja restablecer sus monedas/colección,
  borrar sus ventas e intercambios, o eliminar sus datos de Firestore.
  Se usa solo en root.html.

  Ojo: la protección real está en las reglas de Firestore. Este archivo
  solo evita mostrar la herramienta (y cargar usuarios) si no eres admin.
*/

// Envolvemos todo en una función que se ejecuta sola (IIFE) para que
// las variables de este archivo no choquen con las de assets.js.
(function () {
  // La misma cuenta admin que usan admin.js, script.js y assets.js.
  // Cada archivo .js es independiente, por eso se repite acá.
  const EMAIL_ADMIN = "arielriquelme08@gmail.com";

  // -----------------------------------------------------------------
  // 1) REFERENCIAS A LOS ELEMENTOS DEL HTML (están en root.html)
  // -----------------------------------------------------------------
  // La sección completa de limpieza (para poder mostrarla u ocultarla).
  const seccion = document.getElementById("limpieza-root");
  // Si esta página no tiene la sección, no hay nada que hacer: salimos.
  if (!seccion) return;
  // Caja de texto donde se escribe el nombre, código o UID a buscar.
  const inputBuscarUsuarioRoot = document.getElementById("input-buscar-usuario-root");
  // Contenedor donde se dibujan las tarjetas de usuarios.
  const listaUsuariosRoot = document.getElementById("lista-usuarios-root");
  // Aquí guardamos todos los usuarios leídos de Firestore (para filtrar sin releer).
  let usuariosRoot = [];
  // Bandera: evita pedir la lista de usuarios más de una vez al iniciar sesión.
  let cargado = false;

  // -----------------------------------------------------------------
  // 2) INICIALIZACIÓN DE FIREBASE
  // -----------------------------------------------------------------
  // Si assets.js (u otra página) ya inicializó Firebase, no lo repetimos.
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
  // Servicio de autenticación (saber quién inició sesión).
  const auth = firebase.auth();
  // Servicio de base de datos Firestore.
  const db = firebase.firestore();

  // -----------------------------------------------------------------
  // 3) LIMPIEZA ROOT DE DATOS DE PRUEBA
  // -----------------------------------------------------------------
  // Devuelve el mejor nombre disponible del usuario para mostrarlo.
  function nombreVisibleUsuarioRoot(d) {
    // Prueba nombreUsuario, luego nombre, luego displayName; si no hay, un texto de respaldo.
    return d.nombreUsuario || d.nombre || d.displayName || "Usuario sin nombre";
  }

  // Pide confirmación al root antes de hacer algo permanente.
  async function confirmarRoot(mensaje) {
    // window.confirm abre el cuadro nativo con "Aceptar / Cancelar" y devuelve true o false.
    return window.confirm(mensaje + "\n\nEsta acción no se puede deshacer desde la página.");
  }

  // Borra una lista de documentos en lotes (Firestore permite máximo 500 por lote).
  async function comprometerBorradosRoot(documentos) {
    // Recorremos la lista de 400 en 400 para quedar bajo el límite.
    for (let i = 0; i < documentos.length; i += 400) {
      // Creamos un lote de escrituras.
      const lote = db.batch();
      // Tomamos el trozo actual (de i a i+400).
      const trozo = documentos.slice(i, i + 400);
      // Marcamos cada documento del trozo para borrarlo.
      trozo.forEach((doc) => lote.delete(doc.ref));
      // Solo ejecutamos el lote si el trozo tiene algo.
      if (trozo.length) await lote.commit();
    }
  }

  // Busca todo lo que el usuario tiene en el "mercado": ventas, intercambios y propuestas.
  async function documentosMercadoDeUsuario(uid) {
    // Leemos las tres colecciones al mismo tiempo (más rápido que una por una).
    const [ventas, intercambios, propuestas] = await Promise.all([
      db.collection("ventas").get(),
      db.collection("intercambios").get(),
      db.collection("propuestasIntercambio").get()
    ]);
    // Juntamos en una sola lista los documentos que pertenecen a este usuario.
    return [
      // Ventas donde el usuario es el vendedor o el comprador.
      ...ventas.docs.filter((d) => {
        const x = d.data() || {};
        return x.ownerUid === uid || x.compradorUid === uid;
      }),
      // Intercambios publicados por el usuario.
      ...intercambios.docs.filter((d) => (d.data() || {}).ownerUid === uid),
      // Propuestas que el usuario recibió o envió.
      ...propuestas.docs.filter((d) => {
        const x = d.data() || {};
        return x.ownerUid === uid || x.fromUid === uid;
      })
    ];
  }

  // Devuelve los datos de juego al estado inicial, sin borrar su identidad.
  async function restablecerUsuarioRoot(uid) {
    // También reiniciamos el regalo diario para que pueda volver a reclamarlo.
    await Promise.all([
      db.collection("usuarios").doc(uid).set({
        monedas: 0,
        ultimoReclamo: null,
        coleccionables: [],
        inventario: [],
        codigoReferidoUsado: firebase.firestore.FieldValue.delete(),
        codigoReferidoActivo: firebase.firestore.FieldValue.delete(),
        codigosRegaloUsados: firebase.firestore.FieldValue.delete()
      }, { merge: true }),
      db.collection("perfilesPublicos").doc(uid).set({
        coleccionables: [],
        inventario: []
      }, { merge: true }),
      db.collection("referidos").doc(uid).delete()
    ]);
  }

  // Elimina las ventas, ofertas y propuestas del usuario.
  async function limpiarMercadoUsuarioRoot(uid) {
    await comprometerBorradosRoot(await documentosMercadoDeUsuario(uid));
  }

  // Elimina TODOS los datos de Firestore del usuario (no borra su acceso de Google).
  async function eliminarDatosUsuarioRoot(uid) {
    // Primero limpiamos su mercado.
    await limpiarMercadoUsuarioRoot(uid);
    // Buscamos los nombres de usuario reservados que apuntan a este uid.
    const nombres = await db.collection("nombresUsuario").where("uid", "==", uid).get();
    // Y su documento de referidos (puede no existir).
    const referidos = await db.collection("referidos").doc(uid).get();
    // Armamos la lista de documentos a borrar.
    const documentos = [...nombres.docs];
    // Solo agregamos referidos si realmente existe.
    if (referidos.exists) documentos.push(referidos);
    // Borramos esos documentos.
    await comprometerBorradosRoot(documentos);
    // Y por último borramos el documento privado y el perfil público.
    await Promise.all([
      db.collection("usuarios").doc(uid).delete(),
      db.collection("perfilesPublicos").doc(uid).delete()
    ]);
  }

  // Crea un botón de limpieza que ejecuta una acción y luego recarga la lista.
  function botonLimpiezaRoot(texto, clase, accion) {
    // Creamos el elemento <button>.
    const b = document.createElement("button");
    // type="button" para que nunca actúe como botón de enviar formulario.
    b.type = "button"; b.textContent = texto; b.className = clase;
    // Al hacer clic:
    b.addEventListener("click", async () => {
      // Desactivamos el botón para evitar doble clic mientras trabaja.
      b.disabled = true;
      try { await accion(); await cargarUsuariosRoot(); }
      // Si algo falla, lo mostramos en consola y avisamos con una alerta.
      catch (e) { console.error(e); window.alert("No se pudo completar la limpieza: " + (e.message || "error desconocido")); }
      // Pase lo que pase, volvemos a activar el botón.
      finally { b.disabled = false; }
    });
    return b;
  }

  // Dibuja las tarjetas de usuarios, aplicando el texto del buscador.
  function pintarUsuariosRoot() {
    // Texto buscado, sin espacios sobrantes y en minúsculas.
    const q = (inputBuscarUsuarioRoot.value || "").trim().toLowerCase();
    // Vaciamos la lista antes de redibujarla.
    listaUsuariosRoot.innerHTML = "";
    // Nos quedamos con los usuarios que coinciden en uid, nombre, displayName o email.
    const encontrados = usuariosRoot.filter((u) => {
      const d = u.data || {};
      return !q || [u.id, d.nombreUsuario, d.nombre, d.displayName, d.email].some((v) => String(v || "").toLowerCase().includes(q));
    });
    // Si no hay coincidencias, avisamos y terminamos.
    if (!encontrados.length) { listaUsuariosRoot.appendChild(document.createElement("p")).textContent = "No se encontraron usuarios."; return; }
    // Una tarjeta por cada usuario encontrado.
    encontrados.forEach((u) => {
      const d = u.data || {};
      // Tarjeta contenedora.
      const fila = document.createElement("div"); fila.className = "tarjeta-usuario-root";
      // Bloque de información (nombre + UID).
      const info = document.createElement("div");
      const nombre = document.createElement("strong"); nombre.textContent = nombreVisibleUsuarioRoot(d);
      const uid = document.createElement("span"); uid.className = "detalle"; uid.textContent = "UID: " + u.id;
      info.append(nombre, uid);
      // Bloque de botones de acciones.
      const acciones = document.createElement("div"); acciones.className = "acciones-intercambio";
      acciones.append(
        // Botón 1: deja monedas en 0 y colección vacía.
        botonLimpiezaRoot("Restablecer monedas y colección", "boton-secundario", async () => {
          if (await confirmarRoot("¿Restablecer monedas y colección de " + nombreVisibleUsuarioRoot(d) + "?")) await restablecerUsuarioRoot(u.id);
        }),
        // Botón 2: borra ventas, ofertas y propuestas.
        botonLimpiezaRoot("Eliminar ventas e intercambios", "boton-secundario", async () => {
          if (await confirmarRoot("¿Eliminar las ventas, ofertas y propuestas de " + nombreVisibleUsuarioRoot(d) + "?")) await limpiarMercadoUsuarioRoot(u.id);
        }),
        // Botón 3 (rojo): hace lo de los dos botones anteriores juntos.
        botonLimpiezaRoot("Restablecer todo", "boton-comprar", async () => {
          if (await confirmarRoot("¿Restablecer colección, monedas y mercado de " + nombreVisibleUsuarioRoot(d) + "?")) {
            await restablecerUsuarioRoot(u.id); await limpiarMercadoUsuarioRoot(u.id);
          }
        }),
        // Botón 4: elimina todos los datos de Firestore del usuario.
        botonLimpiezaRoot("Eliminar datos de cuenta", "boton-secundario", async () => {
          if (await confirmarRoot("¿Eliminar todos los datos de Firestore de " + nombreVisibleUsuarioRoot(d) + "?")) await eliminarDatosUsuarioRoot(u.id);
        })
      );
      // Metemos info y acciones dentro de la tarjeta, y la tarjeta en la lista.
      fila.append(info, acciones); listaUsuariosRoot.appendChild(fila);
    });
  }

  // Lee todos los usuarios de Firestore, los ordena por nombre y los dibuja.
  async function cargarUsuariosRoot() {
    // Mensaje mientras carga.
    listaUsuariosRoot.textContent = "Cargando usuarios...";
    // Pedimos la colección completa "usuarios".
    const snap = await db.collection("usuarios").get();
    // Convertimos a { id, data } y ordenamos alfabéticamente en español.
    usuariosRoot = snap.docs.map((d) => ({ id: d.id, data: d.data() || {} })).sort((a, b) => nombreVisibleUsuarioRoot(a.data).localeCompare(nombreVisibleUsuarioRoot(b.data), "es"));
    // Dibujamos el resultado.
    pintarUsuariosRoot();
  }

  // Cada vez que se escribe en el buscador, se vuelve a filtrar la lista.
  inputBuscarUsuarioRoot.addEventListener("input", pintarUsuariosRoot);

  // -----------------------------------------------------------------
  // 4) SESIÓN: mostrar y cargar solo si es la cuenta admin
  // -----------------------------------------------------------------
  auth.onAuthStateChanged((usuario) => {
    // ¿Hay sesión y es el correo del admin?
    const esAdmin = !!usuario && usuario.email === EMAIL_ADMIN;
    // Mostramos u ocultamos la sección según corresponda.
    seccion.classList.toggle("oculto", !esAdmin);
    // Solo cargamos usuarios la primera vez que entra el admin.
    if (esAdmin && !cargado) {
      cargado = true;
      // Si falla (por ejemplo, reglas de Firestore), lo mostramos en la lista.
      cargarUsuariosRoot().catch((e) => {
        console.error(e);
        listaUsuariosRoot.textContent = "No se pudieron cargar los usuarios.";
        // Permitimos reintentar en el próximo cambio de sesión.
        cargado = false;
      });
    }
  });
})();
