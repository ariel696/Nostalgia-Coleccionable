/* Administrador root de códigos de regalo. */
(function () {
  const EMAIL_ADMIN = "arielriquelme08@gmail.com";
  const panel = document.getElementById("panel-codigos-regalo-root");
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
  const inputCodigo = document.getElementById("input-nuevo-codigo-regalo");
  const inputMonedas = document.getElementById("input-monedas-codigo-regalo");
  const selectLimite = document.getElementById("select-limite-codigo-regalo");
  const opcionesTiempo = document.getElementById("opciones-tiempo-codigo-regalo");
  const opcionesUsos = document.getElementById("opciones-usos-codigo-regalo");
  const inputDuracion = document.getElementById("input-duracion-codigo-regalo");
  const selectUnidad = document.getElementById("select-unidad-codigo-regalo");
  const inputMaxUsos = document.getElementById("input-max-usos-codigo-regalo");
  const botonCrear = document.getElementById("btn-crear-codigo-regalo");
  const estado = document.getElementById("estado-codigos-regalo-root");
  const lista = document.getElementById("lista-codigos-regalo-root");
  const botonToggle = document.getElementById("btn-toggle-codigos-regalo-root");
  const contenido = document.getElementById("contenido-codigos-regalo-root");

  if (botonToggle && contenido) {
    botonToggle.addEventListener("click", () => {
      const abierto = contenido.classList.toggle("oculto") === false;
      botonToggle.setAttribute("aria-expanded", String(abierto));
      botonToggle.textContent = abierto ? "Cerrar" : "Abrir";
    });
  }

  function normalizarCodigo(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 40);
  }

  function fechaLegible(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    return ts.toDate().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  }

  function crearFechaExpiracion(duracion, unidad) {
    const fecha = new Date();
    if (unidad === "dias") fecha.setDate(fecha.getDate() + duracion);
    else if (unidad === "semanas") fecha.setDate(fecha.getDate() + duracion * 7);
    else fecha.setMonth(fecha.getMonth() + duracion);
    return firebase.firestore.Timestamp.fromDate(fecha);
  }

  function mostrarOpcionesLimite() {
    const porTiempo = selectLimite.value === "tiempo";
    opcionesTiempo.classList.toggle("oculto", !porTiempo);
    opcionesUsos.classList.toggle("oculto", porTiempo);
  }

  function botonDesactivar(codigo) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-secundario boton-codigo-regalo-desactivar";
    boton.textContent = "Desactivar";
    boton.addEventListener("click", async () => {
      if (!window.confirm("¿Desactivar el código " + codigo + "?")) return;
      boton.disabled = true;
      try {
        await db.collection("codigosRegalo").doc(codigo).update({ activo: false });
        await cargarCodigos();
      } catch (error) {
        console.error(error);
        window.alert("No se pudo desactivar el código.");
        boton.disabled = false;
      }
    });
    return boton;
  }

  function pintarCodigos(documentos) {
    lista.innerHTML = "";
    if (!documentos.length) {
      lista.innerHTML = '<p class="texto-ayuda">Todavía no has creado códigos.</p>';
      return;
    }
    documentos.forEach((documento) => {
      const datos = documento.data() || {};
      const tarjeta = document.createElement("article");
      tarjeta.className = "tarjeta-codigo-regalo-root";
      const titulo = document.createElement("strong");
      titulo.textContent = documento.id;
      tarjeta.appendChild(titulo);
      const premio = document.createElement("span");
      const premioPesos = Number.isFinite(Number(datos.premioPesos))
        ? Number(datos.premioPesos)
        : (Number(datos.monedas) || 0) * 100;
      premio.textContent = "Entrega: $" + premioPesos.toLocaleString("es-CL") + " pesos";
      tarjeta.appendChild(premio);
      const limite = document.createElement("span");
      if (datos.tipoLimite === "usos") {
        limite.textContent = "Usos: " + (Number(datos.usos) || 0) + " / " + (Number(datos.maxUsos) || 0);
      } else {
        limite.textContent = "Vence: " + fechaLegible(datos.expiraEn);
      }
      tarjeta.appendChild(limite);
      const estadoCodigo = document.createElement("span");
      estadoCodigo.className = datos.activo === false ? "codigo-regalo-inactivo" : "codigo-regalo-activo";
      estadoCodigo.textContent = datos.activo === false ? "Inactivo" : "Activo";
      tarjeta.appendChild(estadoCodigo);
      if (datos.activo !== false) tarjeta.appendChild(botonDesactivar(documento.id));
      lista.appendChild(tarjeta);
    });
  }

  async function cargarCodigos() {
    const snap = await db.collection("codigosRegalo").get();
    const documentos = snap.docs.sort((a, b) => {
      const ta = a.data().creadoEn && a.data().creadoEn.toMillis ? a.data().creadoEn.toMillis() : 0;
      const tb = b.data().creadoEn && b.data().creadoEn.toMillis ? b.data().creadoEn.toMillis() : 0;
      return tb - ta;
    });
    pintarCodigos(documentos);
  }

  async function crearCodigo() {
    const codigo = normalizarCodigo(inputCodigo.value);
    const premioPesos = Math.floor(Number(inputMonedas.value));
    if (!codigo) { estado.textContent = "Escribe un código."; return; }
    if (!Number.isFinite(premioPesos) || premioPesos < 1) { estado.textContent = "Indica una cantidad de pesos mayor que 0."; return; }

    const datos = {
      codigo,
      premioPesos,
      tipoLimite: selectLimite.value,
      usos: 0,
      activo: true,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      creadoPor: auth.currentUser.email || ""
    };
    if (selectLimite.value === "tiempo") {
      const duracion = Math.floor(Number(inputDuracion.value));
      if (!Number.isFinite(duracion) || duracion < 1) { estado.textContent = "Indica una duración válida."; return; }
      datos.expiraEn = crearFechaExpiracion(duracion, selectUnidad.value);
      datos.maxUsos = null;
    } else {
      const maxUsos = Math.floor(Number(inputMaxUsos.value));
      if (!Number.isFinite(maxUsos) || maxUsos < 1) { estado.textContent = "Indica un máximo de usuarios válido."; return; }
      datos.maxUsos = maxUsos;
      datos.expiraEn = null;
    }

    botonCrear.disabled = true;
    estado.textContent = "Creando código...";
    try {
      await db.runTransaction((transaccion) => {
        const referencia = db.collection("codigosRegalo").doc(codigo);
        return transaccion.get(referencia).then((existente) => {
          if (existente.exists) throw new Error("CODIGO_EXISTENTE");
          transaccion.set(referencia, datos);
        });
      });
      estado.textContent = "Código creado: " + codigo;
      inputCodigo.value = "";
      await cargarCodigos();
    } catch (error) {
      estado.textContent = error.message === "CODIGO_EXISTENTE"
        ? "Ese código ya existe. Usa otro nombre."
        : "No se pudo crear el código.";
      console.error(error);
    } finally {
      botonCrear.disabled = false;
    }
  }

  selectLimite.addEventListener("change", mostrarOpcionesLimite);
  botonCrear.addEventListener("click", crearCodigo);
  mostrarOpcionesLimite();

  auth.onAuthStateChanged((usuario) => {
    const esAdmin = !!usuario && usuario.email === EMAIL_ADMIN;
    panel.classList.toggle("oculto", !esAdmin);
    if (esAdmin) cargarCodigos().catch((error) => {
      console.error(error);
      estado.textContent = "No se pudieron cargar los códigos.";
    });
  });
})();
