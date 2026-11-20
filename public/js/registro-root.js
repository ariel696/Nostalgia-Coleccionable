/*
  ===========================================
  registro-root.js - Lista de usuarios registrados
  ===========================================
  Muestra, solo a la cuenta root, cuántos usuarios se han registrado y una
  lista con su nickname (nombre de usuario del sitio), el nombre de su cuenta
  de Google y su correo. Desde el engranaje también permite administrar las
  monedas y reiniciar los datos de juego de cada usuario. Se usa solo en root.html.

  Ojo: la protección real está en las reglas de Firestore (solo el admin puede
  leer todos los usuarios). Este archivo solo evita mostrar y cargar la lista
  si no eres admin.
*/
(function () {
  // La misma cuenta admin que usan los demás archivos .js.
  const EMAIL_ADMIN = "arielriquelme08@gmail.com";

  const seccion = document.getElementById("registro-root");
  if (!seccion) return;
  const total = document.getElementById("registro-root-total");
  const lista = document.getElementById("registro-root-lista");

  // Si otro archivo ya inicializó Firebase, no lo repetimos.
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
  let cargado = false;

  // Agrega a la tarjeta una línea "Etiqueta: valor" (con textContent, nunca innerHTML).
  function linea(padre, etiqueta, valor) {
    const p = document.createElement("span");
    p.className = "registro-root-dato";
    const vacio = valor === null || valor === undefined || valor === "";
    p.textContent = etiqueta + ": " + (vacio ? "—" : valor);
    padre.appendChild(p);
  }

  // Calcula los días transcurridos sin guardar un contador que haya que actualizar.
  function tiempoCuenta(ts) {
    if (!ts) return "";
    const creado = typeof ts.toMillis === "function"
      ? ts.toMillis()
      : (typeof ts.toDate === "function" ? ts.toDate().getTime() : NaN);
    if (!Number.isFinite(creado)) return "";
    const dias = Math.max(0, Math.floor((Date.now() - creado) / 86400000));
    return dias + (dias === 1 ? " día" : " días");
  }

  function dineroLegible(monedas) {
    const cantidad = Math.max(0, Number(monedas) || 0) * 100;
    return "$" + cantidad.toLocaleString("es-CL") + " pesos";
  }

  function cantidadObjetos(d) {
    const coleccionables = Array.isArray(d.coleccionables) ? d.coleccionables.length : 0;
    const inventario = Array.isArray(d.inventario) ? d.inventario.length : 0;
    return coleccionables + inventario;
  }

  function nombreVisible(d) {
    return d.nombreUsuario || d.nombre || d.displayName || "este usuario";
  }

  function botonAccionUsuario(texto, clase, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = clase;
    boton.textContent = texto;
    boton.addEventListener("click", async () => {
      boton.disabled = true;
      try {
        await accion();
        await cargar();
      } catch (error) {
        console.error("Error al administrar usuario:", error);
        window.alert("No se pudo completar la acción: " + (error.message || "error desconocido"));
      } finally {
        boton.disabled = false;
      }
    });
    return boton;
  }

  async function cambiarMonedas(uid, delta) {
    const referencia = db.collection("usuarios").doc(uid);
    await db.runTransaction(async (transaccion) => {
      const ficha = await transaccion.get(referencia);
      const actuales = ficha.exists ? Number(ficha.data().monedas) || 0 : 0;
      const nuevas = Math.max(0, actuales + delta);
      transaccion.set(referencia, { monedas: nuevas }, { merge: true });
    });
  }

  async function reiniciarDatosDeJuego(uid) {
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

  function crearAccionesUsuarioRoot(u, d) {
    const acciones = document.createElement("div");
    acciones.className = "registro-root-acciones";

    const etiqueta = document.createElement("label");
    etiqueta.className = "registro-root-monto-label";
    etiqueta.textContent = "Monedas:";
    const monto = document.createElement("input");
    monto.type = "number";
    monto.min = "1";
    monto.step = "1";
    monto.value = "5";
    monto.className = "registro-root-monto";
    monto.setAttribute("aria-label", "Cantidad de monedas para " + nombreVisible(d));
    etiqueta.appendChild(monto);

    const dar = botonAccionUsuario("Dar monedas", "boton-secundario", async () => {
      const cantidad = Math.floor(Number(monto.value));
      if (!Number.isFinite(cantidad) || cantidad < 1) {
        window.alert("Ingresa una cantidad de monedas mayor que 0.");
        return;
      }
      await cambiarMonedas(u.id, cantidad);
    });
    const quitar = botonAccionUsuario("Quitar monedas", "boton-secundario", async () => {
      const cantidad = Math.floor(Number(monto.value));
      if (!Number.isFinite(cantidad) || cantidad < 1) {
        window.alert("Ingresa una cantidad de monedas mayor que 0.");
        return;
      }
      await cambiarMonedas(u.id, -cantidad);
    });
    const reiniciar = botonAccionUsuario("Formatear cuenta", "boton-comprar", async () => {
      const confirmado = window.confirm(
        "¿Formatear los datos de juego de " + nombreVisible(d) + "?\n\n" +
        "Quedará con 0 monedas, sin colección ni inventario y podrá volver a reclamar el regalo diario."
      );
      if (confirmado) await reiniciarDatosDeJuego(u.id);
    });

    acciones.append(etiqueta, dar, quitar, reiniciar);
    return acciones;
  }

  function pintar(usuarios) {
    total.textContent = String(usuarios.length);
    lista.innerHTML = "";
    if (!usuarios.length) {
      const vacio = document.createElement("li");
      vacio.className = "texto-ayuda";
      vacio.textContent = "Todavía no hay usuarios registrados.";
      lista.appendChild(vacio);
      return;
    }
    usuarios.forEach((u) => {
      const d = u.data;
      const li = document.createElement("li");
      li.className = "registro-root-item";
      const nick = document.createElement("strong");
      nick.textContent = d.nombreUsuario || "Sin nickname";
      const cabecera = document.createElement("div");
      cabecera.className = "registro-root-item-cabecera";
      const engranajeUsuario = document.createElement("button");
      engranajeUsuario.type = "button";
      engranajeUsuario.className = "btn-engranaje-usuario";
      engranajeUsuario.textContent = "⚙";
      engranajeUsuario.title = "Administrar usuario";
      engranajeUsuario.setAttribute("aria-label", "Administrar a " + nombreVisible(d));
      engranajeUsuario.setAttribute("aria-expanded", "false");
      engranajeUsuario.addEventListener("click", () => {
        const abierto = li.classList.toggle("usuario-herramientas-abiertas");
        engranajeUsuario.setAttribute("aria-expanded", String(abierto));
      });
      cabecera.append(nick, engranajeUsuario);
      li.appendChild(cabecera);
      linea(li, "Nombre", d.nombre || d.displayName);
      linea(li, "Correo", d.email);
      linea(li, "Tiempo", tiempoCuenta(d.creadoEn));
      linea(li, "Dinero", dineroLegible(d.monedas));
      linea(li, "Objetos", cantidadObjetos(d));
      li.appendChild(crearAccionesUsuarioRoot(u, d));
      lista.appendChild(li);
    });
  }

  async function cargar() {
    const snap = await db.collection("usuarios").get();
    const usuarios = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));
    // Los más recientes primero; las cuentas sin fecha de registro van al final, por nickname.
    usuarios.sort((a, b) => {
      const ta = a.data.creadoEn && a.data.creadoEn.toMillis ? a.data.creadoEn.toMillis() : 0;
      const tb = b.data.creadoEn && b.data.creadoEn.toMillis ? b.data.creadoEn.toMillis() : 0;
      if (ta !== tb) return tb - ta;
      return String(a.data.nombreUsuario || "").localeCompare(String(b.data.nombreUsuario || ""), "es");
    });
    pintar(usuarios);
  }

  // -----------------------------------------------------------------
  // Engranaje de ajustes y modal de "Limpieza de cuentas de prueba"
  // (la lógica de la limpieza en sí vive en limpieza-root.js)
  // -----------------------------------------------------------------
  const btnEngranaje = document.getElementById("btn-engranaje-root");
  const panelAjustes = document.getElementById("registro-root-ajustes");
  const btnAbrirLimpieza = document.getElementById("btn-abrir-limpieza-root");
  const modalLimpieza = document.getElementById("modal-limpieza-root");
  const btnCerrarLimpieza = document.getElementById("btn-cerrar-limpieza-root");

  if (btnEngranaje && panelAjustes) {
    // Engranaje: muestra u oculta las herramientas generales y las acciones de cada usuario.
    btnEngranaje.addEventListener("click", () => {
      const abierto = panelAjustes.classList.toggle("oculto") === false;
      seccion.classList.toggle("root-herramientas-abiertas", abierto);
      if (!abierto) {
        lista.querySelectorAll(".registro-root-item.usuario-herramientas-abiertas").forEach((item) => {
          item.classList.remove("usuario-herramientas-abiertas");
          const boton = item.querySelector(".btn-engranaje-usuario");
          if (boton) boton.setAttribute("aria-expanded", "false");
        });
      }
      btnEngranaje.setAttribute("aria-expanded", String(abierto));
    });
  }

  function abrirLimpieza() {
    if (!modalLimpieza) return;
    modalLimpieza.classList.remove("oculto");
    const buscador = document.getElementById("input-buscar-usuario-root");
    if (buscador) buscador.focus();
  }
  function cerrarLimpieza() {
    if (!modalLimpieza || modalLimpieza.classList.contains("oculto")) return;
    modalLimpieza.classList.add("oculto");
    if (btnAbrirLimpieza) btnAbrirLimpieza.focus();
  }
  if (btnAbrirLimpieza) btnAbrirLimpieza.addEventListener("click", abrirLimpieza);
  if (btnCerrarLimpieza) btnCerrarLimpieza.addEventListener("click", cerrarLimpieza);
  if (modalLimpieza) {
    // Clic en el fondo oscuro (fuera de la tarjeta) cierra el modal.
    modalLimpieza.addEventListener("click", (e) => { if (e.target === modalLimpieza) cerrarLimpieza(); });
  }
  // Tecla Escape también cierra el modal.
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarLimpieza(); });

  auth.onAuthStateChanged((usuario) => {
    const esAdmin = !!usuario && usuario.email === EMAIL_ADMIN;
    seccion.classList.toggle("oculto", !esAdmin);
    if (!esAdmin && modalLimpieza) modalLimpieza.classList.add("oculto");
    if (esAdmin && !cargado) {
      cargado = true;
      cargar().catch((e) => {
        console.error(e);
        total.textContent = "?";
        lista.innerHTML = "";
        const error = document.createElement("li");
        error.className = "texto-ayuda";
        error.textContent = "No se pudieron cargar los usuarios.";
        lista.appendChild(error);
        cargado = false;
      });
    }
  });
})();
