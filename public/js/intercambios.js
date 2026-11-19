/*
  intercambios.js - Intercambios globales entre usuarios.
  Sistema de "depósito": al publicar u ofrecer, el objeto sale de tu colección
  y queda guardado en la oferta/propuesta. Al cerrar el trato, cada uno recibe
  el objeto del otro. Así cada persona solo modifica SU propia ficha.
  Colecciones: "intercambios" (ofertas) y "propuestasIntercambio".
*/
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
const FV = firebase.firestore.FieldValue;
const $ = (id) => document.getElementById(id);
const estado = $("estado-intercambios");
let yo = null, misObjetos = [], ofertas = [], recibidas = [], enviadas = [];
let catalogo = [], buscoElegido = null, ofrezcoElegido = null;
let misMonedas = 0, nombreUsuarioYo = "", ventas = [], misVentas = [], vendoElegido = null;
const fotosPerfil = new Map();

const refU = (uid) => db.collection("usuarios").doc(uid);
const refO = (id) => db.collection("intercambios").doc(id);
const refP = (id) => db.collection("propuestasIntercambio").doc(id);
const refV = (id) => db.collection("ventas").doc(id);
const nombreItem = (x) => (typeof x === "string" ? x : (x && (x.nombre || x.id)) || "Objeto");
const canon = (v) => Array.isArray(v) ? v.map(canon) : (v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v);
const mismo = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const nombreYo = () => nombreUsuarioYo || yo.displayName || "Usuario";

function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function imagenItem(x) {
  if (x && x.imagen && x.imagen !== "tazo-generado") return x.imagen;
  const num = String((x && x.numero) || "").replace(/[<>&"]/g, "");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><circle cx="80" cy="80" r="72" fill="#F6C744" stroke="#3B2E20" stroke-width="6"/><circle cx="80" cy="80" r="54" fill="#FFFDF7" stroke="#C6402E" stroke-width="4"/><text x="80" y="94" text-anchor="middle" font-family="Arial" font-size="38" font-weight="900" fill="#C6402E">' + (num ? "#" + num : "?") + "</text></svg>";
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function avatarPerfil(nombre) {
  const inicial = String(nombre || "U").trim().charAt(0).toUpperCase() || "U";
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="37" fill="#C7F5E2" stroke="#2F6E55" stroke-width="4"/><text x="40" y="53" text-anchor="middle" font-family="Arial" font-size="38" font-weight="700" fill="#2F6E55">' + inicial + "</text></svg>";
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function detallePropietario(o, mia) {
  const nombre = mia ? "tú" : (o.ownerNombre || "Usuario");
  const fila = el("span", "detalle ofrecido-por");
  fila.appendChild(document.createTextNode("Ofrecido por: "));
  const img = el("img", "mini-avatar-propietario");
  img.src = fotosPerfil.get(o.ownerUid) || avatarPerfil(o.ownerNombre);
  img.alt = "Foto de perfil de " + (o.ownerNombre || "Usuario");
  img.onerror = () => { img.src = avatarPerfil(o.ownerNombre); };
  fila.append(img, document.createTextNode(" " + nombre));
  return fila;
}

function sinItem(lista, item) {
  let i = lista.findIndex((x) => mismo(x, item));
  if (i < 0 && item && item.compraId) i = lista.findIndex((x) => x && x.compraId === item.compraId);
  if (i < 0) return null;
  const copia = lista.slice();
  copia.splice(i, 1);
  return copia;
}
const coleccion = (snap) => (snap.data() || {}).coleccionables || [];
const refPP = (uid) => db.collection("perfilesPublicos").doc(uid);
// Guarda la colección en la ficha privada Y en el perfil público (son espejo).
function guardarColeccion(t, lista, extra) {
  t.update(refU(yo.uid), Object.assign({ coleccionables: lista }, extra || {}));
  t.set(refPP(yo.uid), { coleccionables: lista, nombre: nombreYo(), actualizadoEn: FV.serverTimestamp() }, { merge: true });
}

// ---------- Acciones (todas con transacción) ----------
async function publicar(item, busca, buscaObj) {
  const ref = db.collection("intercambios").doc();
  await db.runTransaction(async (t) => {
    const lista = sinItem(coleccion(await t.get(refU(yo.uid))), item);
    if (!lista) throw new Error("Ya no tienes ese objeto.");
    guardarColeccion(t, lista);
    t.set(ref, { ownerUid: yo.uid, ownerNombre: nombreYo(), item, busca, buscaItem: buscaObj ? { nombre: nombreItem(buscaObj), imagen: buscaObj.imagen || "", ...(buscaObj.numero ? { numero: buscaObj.numero } : {}) } : null, estado: "abierta", creadoEn: FV.serverTimestamp() });
  });
}

function objetoParaOferta(o) {
  const buscado = o.buscaItem || {};
  const normalizar = (v) => String(v || "").trim().toLowerCase();
  const mismoIdentificador = (a, b) => (a.compraId && b.compraId && a.compraId === b.compraId)
    || (a.id && b.id && a.id === b.id);
  return misObjetos.find((x) => mismo(x, buscado) || mismoIdentificador(x, buscado))
    || misObjetos.find((x) => normalizar(nombreItem(x)) === normalizar(buscado.nombre))
    || misObjetos.find((x) => normalizar(nombreItem(x)) === normalizar(o.busca))
    || misObjetos.find((x) => buscado.numero && String(x.numero) === String(buscado.numero));
}

async function proponerIntercambio(o, item) {
  const ref = db.collection("propuestasIntercambio").doc();
  await db.runTransaction(async (t) => {
    const [ofertaSnap, usuarioSnap] = await Promise.all([t.get(refO(o.id)), t.get(refU(yo.uid))]);
    const oferta = ofertaSnap.data() || {};
    if (oferta.estado !== "abierta") throw new Error("Esta oferta ya no está disponible.");
    const lista = sinItem(coleccion(usuarioSnap), item);
    if (!lista) throw new Error("Ya no tienes ese objeto en tu colección.");
    guardarColeccion(t, lista);
    t.set(ref, {
      ofertaId: o.id,
      ownerUid: oferta.ownerUid,
      ownerNombre: oferta.ownerNombre || "Usuario",
      fromUid: yo.uid,
      fromNombre: nombreYo(),
      item,
      estado: "pendiente",
      creadoEn: FV.serverTimestamp()
    });
  });
}

function cerrarModalIntercambio() {
  $("modal-intercambio").classList.add("oculto");
  window.removeEventListener("keydown", cerrarConEscape);
}

function cerrarConEscape(e) { if (e.key === "Escape") cerrarModalIntercambio(); }

function abrirModalIntercambio(o) {
  const item = objetoParaOferta(o);
  const detalle = $("detalle-modal-intercambio");
  detalle.innerHTML = "";
  const fila = el("div", "detalle-intercambio-modal");
  const entrega = el("div", "detalle-intercambio-columna");
  const recibe = el("div", "detalle-intercambio-columna");
  const imgEntrega = el("img"); imgEntrega.src = imagenItem(o.item); imgEntrega.alt = nombreItem(o.item);
  const imgRecibe = el("img"); imgRecibe.src = imagenItem(item || o.buscaItem); imgRecibe.alt = nombreItem(item || o.buscaItem);
  entrega.append(imgEntrega, el("strong", "", "Entregas"), el("span", "detalle", nombreItem(item || o.buscaItem)));
  recibe.append(imgRecibe, el("strong", "", "Recibes"), el("span", "detalle", nombreItem(o.item)));
  fila.append(entrega, el("span", "flecha-intercambio", "↔"), recibe);
  detalle.append(fila);
  $("texto-modal-intercambio").textContent = item
    ? (o.ownerNombre || "La otra persona") + " ofrece " + nombreItem(o.item) + " y busca " + nombreItem(item) + ". Si aceptas, tu objeto quedará reservado y se enviará la propuesta al dueño de la oferta."
    : "No tienes el tazo pedido (" + (o.busca || nombreItem(buscado)) + ") en tu colección. No puedes aceptar este intercambio todavía.";
  const aceptarBtn = $("btn-aceptar-modal-intercambio");
  aceptarBtn.disabled = false;
  aceptarBtn.onclick = async () => {
    if (!item) {
      estado.textContent = "No tienes el tazo pedido para aceptar este intercambio.";
      return;
    }
    if (!window.confirm("¿Estás seguro de que quieres aceptar este intercambio? Se entregará " + nombreItem(item) + " y recibirás " + nombreItem(o.item) + ".")) return;
    aceptarBtn.disabled = true;
    try {
      await proponerIntercambio(o, item);
      cerrarModalIntercambio();
      estado.textContent = "Propuesta enviada. El dueño de la oferta debe aceptarla para completar el intercambio.";
      await recargar();
    } catch (e) {
      console.error(e); estado.textContent = e.message || "No se pudo enviar la propuesta."; aceptarBtn.disabled = false;
    }
  };
  $("btn-cerrar-modal-intercambio").onclick = cerrarModalIntercambio;
  $("btn-rechazar-modal-intercambio").onclick = cerrarModalIntercambio;
  $("modal-intercambio").classList.remove("oculto");
  window.addEventListener("keydown", cerrarConEscape);
}

async function rechazarPendientes(ofertaId, exceptoId) {
  const lote = db.batch();
  const lista = recibidas.filter((p) => p.ofertaId === ofertaId && p.id !== exceptoId && p.estado === "pendiente");
  lista.forEach((p) => lote.update(refP(p.id), { estado: "rechazada" }));
  if (lista.length) await lote.commit();
}

async function aceptar(p) {
  await db.runTransaction(async (t) => {
    const [o, pp, u] = await Promise.all([t.get(refO(p.ofertaId)), t.get(refP(p.id)), t.get(refU(yo.uid))]);
    if (o.data().estado !== "abierta" || pp.data().estado !== "pendiente") throw new Error("Esta propuesta ya no está vigente.");
    guardarColeccion(t, coleccion(u).concat([pp.data().item]));
    t.update(refO(p.ofertaId), { estado: "cerrada", propuestaGanadora: p.id });
    t.update(refP(p.id), { estado: "aceptada" });
  });
  await rechazarPendientes(p.ofertaId, p.id);
}

async function rechazar(p) { await refP(p.id).update({ estado: "rechazada" }); }

async function cancelarOferta(o) {
  await db.runTransaction(async (t) => {
    const [s, u] = await Promise.all([t.get(refO(o.id)), t.get(refU(yo.uid))]);
    if (s.data().estado !== "abierta") throw new Error("Esta oferta ya no está abierta.");
    guardarColeccion(t, coleccion(u).concat([s.data().item]));
    t.update(refO(o.id), { estado: "cancelada" });
  });
  await rechazarPendientes(o.id, null);
}

// Retirar (pendiente), recuperar (rechazada) o reclamar (aceptada): el objeto vuelve a quien corresponde.
async function cobrar(p, modo) {
  await db.runTransaction(async (t) => {
    const [pp, u] = await Promise.all([t.get(refP(p.id)), t.get(refU(yo.uid))]);
    const d = pp.data();
    let item, cambios;
    if (modo === "retirar" && d.estado === "pendiente") { item = d.item; cambios = { estado: "retirada", recuperado: true }; }
    else if (modo === "recuperar" && d.estado === "rechazada" && !d.recuperado) { item = d.item; cambios = { recuperado: true }; }
    else if (modo === "reclamar" && d.estado === "aceptada" && !d.reclamado) { item = (await t.get(refO(d.ofertaId))).data().item; cambios = { reclamado: true }; }
    else throw new Error("Esta propuesta ya cambió. Actualizando...");
    guardarColeccion(t, coleccion(u).concat([item]));
    t.update(refP(p.id), cambios);
  });
}

// ---------- Compra y venta (con monedas) ----------
// Igual que los intercambios: al vender, el objeto sale de tu colección y queda en la venta.
// Quien compra paga desde SU ficha; el vendedor "cobra" después desde la suya.
async function ponerEnVenta(item, precioPesos) {
  const ref = db.collection("ventas").doc();
  await db.runTransaction(async (t) => {
    const lista = sinItem(coleccion(await t.get(refU(yo.uid))), item);
    if (!lista) throw new Error("Ya no tienes ese objeto.");
    guardarColeccion(t, lista);
    // Se guarda el valor líquido en pesos y también su equivalente en monedas
    // para conservar compatibilidad con los saldos existentes.
    t.set(ref, {
      ownerUid: yo.uid, ownerNombre: nombreYo(), item,
      precioPesos,
      precio: precioPesos / PESOS_POR_MONEDA,
      estado: "abierta", cobrado: false, creadoEn: FV.serverTimestamp()
    });
  });
}

const precioVentaEnPesos = (v) => Number.isFinite(Number(v.precioPesos))
  ? Number(v.precioPesos)
  : Number(v.precio || 0) * PESOS_POR_MONEDA;
const precioVentaEnMonedas = (v) => precioVentaEnPesos(v) / PESOS_POR_MONEDA;

async function comprarVenta(v) {
  await db.runTransaction(async (t) => {
    const [vs, u] = await Promise.all([t.get(refV(v.id)), t.get(refU(yo.uid))]);
    if (!vs.exists || vs.data().estado !== "abierta") throw new Error("Esta venta ya no está disponible.");
    const d = vs.data();
    if (d.ownerUid === yo.uid) throw new Error("No puedes comprar tu propio coleccionable.");
    const precioPesos = precioVentaEnPesos(d);
    const precioMonedas = precioPesos / PESOS_POR_MONEDA;
    if ((((u.data() || {}).monedas || 0) * PESOS_POR_MONEDA) < precioPesos) throw new Error("No tienes pesos suficientes.");
    guardarColeccion(t, coleccion(u).concat([d.item]), { monedas: FV.increment(-precioMonedas) });
    t.update(refV(v.id), { estado: "vendida", compradorUid: yo.uid, compradorNombre: nombreYo(), vendidaEn: FV.serverTimestamp() });
  });
}

async function cancelarVenta(v) {
  await db.runTransaction(async (t) => {
    const [vs, u] = await Promise.all([t.get(refV(v.id)), t.get(refU(yo.uid))]);
    if (vs.data().estado !== "abierta") throw new Error("Esta venta ya no está abierta.");
    guardarColeccion(t, coleccion(u).concat([vs.data().item]));
    t.update(refV(v.id), { estado: "cancelada" });
  });
}

async function cobrarVenta(v) {
  await db.runTransaction(async (t) => {
    const vs = await t.get(refV(v.id));
    const d = vs.data();
    if (d.estado !== "vendida" || d.cobrado) throw new Error("Esta venta ya fue cobrada.");
    t.update(refU(yo.uid), { monedas: FV.increment(precioVentaEnMonedas(d)) });
    t.update(refV(v.id), { cobrado: true });
  });
}

async function ejecutar(boton, fn) {
  boton.disabled = true;
  try { await fn(); estado.textContent = ""; }
  catch (e) { console.error(e); estado.textContent = e.message || "No se pudo completar la acción."; }
  await recargar();
}

function boton(texto, clase, fn) {
  const b = el("button", clase, texto);
  b.type = "button";
  b.addEventListener("click", () => ejecutar(b, fn));
  return b;
}

// ---------- Pantalla ----------
// Dibujos de las insignias de la esquina (los mismos de los botones circulares de arriba).
const ICONOS_TIPO = {
  intercambio: { texto: "Intercambio", svg: '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M10 22H52M41 11L52 22L41 33" /><path d="M54 42H12M23 31L12 42L23 53" /></svg>' },
  venta: { texto: "Venta", svg: '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path class="trazo-carrito" d="M5 12H13L19 40H47L53 21H15" /><circle class="rueda-carrito" cx="23" cy="50" r="4.5" /><circle class="rueda-carrito" cx="43" cy="50" r="4.5" /><circle class="moneda-icono" cx="45" cy="15" r="11" /><text class="texto-moneda-icono" x="45" y="21" text-anchor="middle">$</text></svg>' }
};

// tipo: "intercambio" o "venta". Pone la insignia en la esquina superior derecha
// para distinguir a primera vista de qué se trata.
function tarjeta(item, titulo, detalles, tipo) {
  const li = el("li", "tarjeta-intercambio");
  const img = el("img");
  img.src = imagenItem(item); img.alt = nombreItem(item);
  const cuerpo = el("div");
  cuerpo.appendChild(el("strong", "", titulo));
  detalles.forEach((d) => cuerpo.appendChild(typeof d === "string" ? el("span", "detalle", d) : d));
  li.append(img, cuerpo);
  const icono = ICONOS_TIPO[tipo];
  if (icono) {
    const insignia = el("span", "insignia-tipo insignia-" + tipo);
    insignia.setAttribute("role", "img");
    insignia.setAttribute("aria-label", icono.texto);
    insignia.title = icono.texto;
    insignia.innerHTML = icono.svg; // texto fijo escrito arriba (no viene de usuarios)
    li.classList.add("tarjeta-con-insignia");
    li.appendChild(insignia);
  }
  return { li, cuerpo };
}

// Cada moneda equivale a 100 pesos chilenos.
const PESOS_POR_MONEDA = 100;
const textoPesos = (p) => Number(p).toLocaleString("es-CL") + " pesos";
const textoPrecio = (v) => {
  const pesos = precioVentaEnPesos(v);
  const monedas = pesos / PESOS_POR_MONEDA;
  return textoPesos(pesos) + " (" + monedas.toLocaleString("es-CL", { maximumFractionDigits: 2 }) + " monedas)";
};

function pintarMercado() {
  $("mis-monedas").textContent = "Tus monedas: " + misMonedas.toLocaleString("es-CL") + " (" + textoPesos(misMonedas * PESOS_POR_MONEDA) + ")";
  const puede = misObjetos.length > 0;
  if (vendoElegido && !misObjetos.some((x) => mismo(x, vendoElegido))) { elegirVendo(null); $("input-vendo").value = ""; }
  $("input-vendo").disabled = !puede;
  $("input-vendo").placeholder = puede ? "¿Qué vendes? Elige uno de tus coleccionables" : "No tienes coleccionables todavía";
  $("input-precio").disabled = !puede;
  $("btn-vender").disabled = !puede;

  const lm = $("lista-mercado");
  lm.innerHTML = "";
  const ajenas = ventas.filter((v) => v.ownerUid !== yo.uid);
  if (!ajenas.length) lm.appendChild(el("li", "texto-ayuda", "Todavía no hay coleccionables en venta de otros usuarios."));
  ajenas.forEach((v) => {
    const { li, cuerpo } = tarjeta(v.item, nombreItem(v.item), ["Vende: " + v.ownerNombre, "Precio: " + textoPrecio(v.precio)], "venta");
    const acc = el("div", "acciones-intercambio");
    const precioPesos = precioVentaEnPesos(v);
    const saldoPesos = misMonedas * PESOS_POR_MONEDA;
    if (saldoPesos >= precioPesos) acc.appendChild(boton("Comprar", "boton-comprar", () => comprarVenta(v)));
    else acc.appendChild(el("span", "detalle", "Te faltan " + textoPesos(precioPesos - saldoPesos) + "."));
    cuerpo.appendChild(acc);
    lm.appendChild(li);
  });

  const lv = $("lista-mis-ventas");
  lv.innerHTML = "";
  const mias = misVentas.filter((v) => v.estado === "abierta" || (v.estado === "vendida" && !v.cobrado));
  if (!mias.length) lv.appendChild(el("li", "texto-ayuda", "No tienes ventas activas."));
  mias.forEach((v) => {
    const vendida = v.estado === "vendida";
    const { li, cuerpo } = tarjeta(v.item, nombreItem(v.item), ["Precio: " + textoPrecio(v.precio), vendida ? "¡Vendido a " + (v.compradorNombre || "otro usuario") + "!" : "En venta"], "venta");
    const acc = el("div", "acciones-intercambio");
    if (vendida) acc.appendChild(boton("Cobrar " + textoPesos(precioVentaEnPesos(v)), "boton-comprar", () => cobrarVenta(v)));
    else acc.appendChild(boton("Quitar de la venta", "boton-secundario", () => cancelarVenta(v)));
    cuerpo.appendChild(acc);
    lv.appendChild(li);
  });
}

function pintar() {
  // Si el objeto elegido ya no está en mi colección (p. ej. tras publicar), se limpia.
  if (ofrezcoElegido && !misObjetos.some((x) => mismo(x, ofrezcoElegido))) { elegirOfrezco(null); $("input-ofrezco").value = ""; }
  $("input-ofrezco").disabled = !misObjetos.length;
  $("input-ofrezco").placeholder = misObjetos.length ? "¿Qué ofreces? Ej: Tazo de Pikachu" : "No tienes coleccionables todavía";
  $("btn-publicar").disabled = !misObjetos.length;

  pintarMercado();

  const lo = $("lista-ofertas");
  lo.innerHTML = "";
  if (!ofertas.length) lo.appendChild(el("li", "texto-ayuda", "Todavía no hay ofertas abiertas. ¡Publica la primera!"));
  ofertas.forEach((o) => {
    const mia = o.ownerUid === yo.uid;
    const busca = el("span", "detalle linea-busca");
    if (o.buscaItem) { const m = el("img", "mini-busca"); m.src = imagenItem(o.buscaItem); m.alt = ""; busca.appendChild(m); }
    busca.appendChild(document.createTextNode("Busca: " + (o.busca || "ofertas abiertas")));
    const { li, cuerpo } = tarjeta(o.item, nombreItem(o.item), [detallePropietario(o, mia), busca], "intercambio");
    const acc = el("div", "acciones-intercambio");
    if (mia) {
      recibidas.filter((p) => p.ofertaId === o.id && p.estado === "pendiente").forEach((p) => {
        const fila = el("div", "propuesta-recibida");
        fila.appendChild(el("span", "detalle", p.fromNombre + " te ofrece: " + nombreItem(p.item)));
        const a = el("div", "acciones-intercambio");
        a.append(boton("Aceptar", "boton-comprar", () => aceptar(p)), boton("Rechazar", "boton-secundario", () => rechazar(p)));
        fila.appendChild(a);
        cuerpo.appendChild(fila);
      });
      acc.appendChild(boton("Cancelar mi oferta", "boton-secundario", () => cancelarOferta(o)));
    }
    if (!mia) {
      // Solo se ofrece aceptar cuando realmente tienes el objeto buscado.
      // Si no lo tienes, la oferta queda visible, pero sin botón de acción.
      if (objetoParaOferta(o)) {
        const ofrecer = boton("Aceptar intercambio", "boton-comprar", () => abrirModalIntercambio(o));
        ofrecer.setAttribute("aria-label", "Aceptar el intercambio de " + (o.ownerNombre || "otro usuario"));
        acc.appendChild(ofrecer);
        li.classList.add("tarjeta-intercambio-accionable");
        li.addEventListener("click", (e) => {
          if (!e.target.closest("button")) abrirModalIntercambio(o);
        });
      }
    }
    if (acc.children.length) cuerpo.appendChild(acc);
    lo.appendChild(li);
  });

  // Solo se muestran las propuestas que aún requieren una acción mía (retirar, reclamar
  // o recuperar el objeto). Si no hay ninguna, la sección completa queda oculta.
  const lp = $("lista-propuestas");
  lp.innerHTML = "";
  const textos = { pendiente: "Esperando respuesta", aceptada: "¡Aceptada!", rechazada: "Rechazada", retirada: "Retirada" };
  const conAccion = enviadas.filter((p) => p.estado === "pendiente"
    || (p.estado === "aceptada" && !p.reclamado)
    || (p.estado === "rechazada" && !p.recuperado));
  $("seccion-propuestas").classList.toggle("oculto", conAccion.length === 0);
  conAccion.forEach((p) => {
    const { li, cuerpo } = tarjeta(p.item, "Ofreciste: " + nombreItem(p.item), [], "intercambio");
    cuerpo.appendChild(el("span", "etiqueta-estado", textos[p.estado] || p.estado));
    const acc = el("div", "acciones-intercambio");
    if (p.estado === "pendiente") acc.appendChild(boton("Retirar propuesta", "boton-secundario", () => cobrar(p, "retirar")));
    else if (p.estado === "aceptada") acc.appendChild(p.reclamado ? el("span", "detalle", "Objeto ya reclamado.") : boton("Reclamar mi objeto", "boton-comprar", () => cobrar(p, "reclamar")));
    else if (p.estado === "rechazada") acc.appendChild(p.recuperado ? el("span", "detalle", "Tu objeto ya volvió a tu colección.") : boton("Recuperar mi objeto", "boton-secundario", () => cobrar(p, "recuperar")));
    cuerpo.appendChild(acc);
    lp.appendChild(li);
  });
}

const porFecha = (a, b) => ((b.creadoEn && b.creadoEn.seconds) || 0) - ((a.creadoEn && a.creadoEn.seconds) || 0);
const docs = (q) => q.docs.map((d) => Object.assign({ id: d.id }, d.data()));

async function recargar() {
  try {
    const ficha = await refU(yo.uid).get();
    misObjetos = coleccion(ficha);
    const datosYo = ficha.data() || {};
    misMonedas = datosYo.monedas || 0;
    nombreUsuarioYo = datosYo.nombreUsuario || yo.displayName || "Usuario";
  } catch (e) {
    console.error(e);
    estado.textContent = "No se pudo leer tu colección.";
  }
  try {
    const [ab, rec, env] = await Promise.all([
      db.collection("intercambios").where("estado", "==", "abierta").get(),
      db.collection("propuestasIntercambio").where("ownerUid", "==", yo.uid).get(),
      db.collection("propuestasIntercambio").where("fromUid", "==", yo.uid).get()
    ]);
    ofertas = docs(ab).sort(porFecha);
    recibidas = docs(rec);
    enviadas = docs(env).sort(porFecha);
    fotosPerfil.clear();
    await Promise.all([...new Set(ofertas.map((o) => o.ownerUid).filter(Boolean))].map(async (uid) => {
      try {
        const perfil = await refPP(uid).get();
        const foto = perfil.exists && perfil.data() ? perfil.data().fotoPerfil : "";
        fotosPerfil.set(uid, foto || "");
      } catch (e) { fotosPerfil.set(uid, ""); }
    }));
    if (!estado.textContent || estado.textContent.startsWith("Cargando")) estado.textContent = "";
  } catch (e) {
    console.error(e);
    estado.textContent = "No se pudieron cargar los intercambios. Revisa las reglas de Firestore.";
  }
  try {
    const [vab, vmias] = await Promise.all([
      db.collection("ventas").where("estado", "==", "abierta").get(),
      db.collection("ventas").where("ownerUid", "==", yo.uid).get()
    ]);
    ventas = docs(vab).sort(porFecha);
    misVentas = docs(vmias).sort(porFecha);
  } catch (e) {
    console.error(e);
    estado.textContent = "No se pudo cargar compra y venta. Revisa las reglas de Firestore.";
  }
  pintar();
}

$("btn-publicar").addEventListener("click", () => {
  if (!ofrezcoElegido) { estado.textContent = "Elige qué coleccionable ofreces."; return; }
  const item = ofrezcoElegido;
  ejecutar($("btn-publicar"), async () => {
    await publicar(item, $("input-busco").value.trim(), buscoElegido);
    $("input-busco").value = "";
    elegirBusco(null);
    elegirOfrezco(null);
    $("input-ofrezco").value = "";
    mostrarPanel(null);
  });
});

// ---------- "¿Qué ofreces?": elegir entre MIS coleccionables ----------
function elegirOfrezco(obj) {
  ofrezcoElegido = obj;
  const caja = $("ofrezco-elegido");
  caja.innerHTML = "";
  caja.classList.toggle("oculto", !obj);
  if (!obj) return;
  const img = el("img"); img.src = imagenItem(obj); img.alt = "";
  caja.append(img, el("span", "", "Ofreces: " + nombreItem(obj)));
}

function pintarOfrezco() {
  const panel = $("panel-ofrezco");
  const q = $("input-ofrezco").value.trim().toLowerCase();
  panel.innerHTML = "";
  const lista = misObjetos.filter((x) => !q || nombreItem(x).toLowerCase().includes(q) || String((x && x.numero) || "") === q.replace("#", "")).sort(porNumero);
  if (!lista.length) {
    panel.appendChild(el("p", "texto-ayuda", misObjetos.length ? "Ninguno de tus coleccionables coincide." : "No tienes coleccionables todavía."));
    return;
  }
  lista.forEach((x) => {
    const b = el("button", "opcion-catalogo");
    b.type = "button";
    const img = el("img"); img.src = imagenItem(x); img.alt = ""; img.loading = "lazy";
    b.append(img, el("span", "", nombreItem(x) + (x && x.numero ? " #" + x.numero : "")));
    b.addEventListener("click", () => {
      $("input-ofrezco").value = nombreItem(x);
      elegirOfrezco(x);
      panel.classList.add("oculto");
    });
    panel.appendChild(b);
  });
}

$("input-ofrezco").addEventListener("focus", () => { pintarOfrezco(); $("panel-ofrezco").classList.remove("oculto"); });
$("input-ofrezco").addEventListener("input", () => {
  if (ofrezcoElegido && $("input-ofrezco").value.trim() !== nombreItem(ofrezcoElegido)) elegirOfrezco(null);
  pintarOfrezco();
  $("panel-ofrezco").classList.remove("oculto");
});

// Ordena por número (1, 2, 3...); los que no tienen número van al final, ordenados por nombre.
const porNumero = (a, b) => {
  const na = parseInt(a && a.numero, 10), nb = parseInt(b && b.numero, 10);
  const ta = Number.isNaN(na), tb = Number.isNaN(nb);
  if (ta && tb) return nombreItem(a).localeCompare(nombreItem(b), "es", { numeric: true });
  if (ta) return 1;
  if (tb) return -1;
  return na - nb || nombreItem(a).localeCompare(nombreItem(b), "es", { numeric: true });
};

// ---------- Catálogo: objetos que existen hasta ahora (para el campo "¿Qué buscas?") ----------
async function cargarCatalogo() {
  try {
    const snap = await db.collection("productos").get();
    const vistos = new Set();
    snap.forEach((d) => {
      (d.data().opciones || []).forEach((op) => {
        (Array.isArray(op.premios) ? op.premios : []).forEach((p) => {
          if (!p || !p.nombre) return;
          const clave = p.nombre + "|" + (p.numero || "");
          if (vistos.has(clave)) return;
          vistos.add(clave);
          catalogo.push(p);
        });
      });
    });
    catalogo.sort(porNumero);
  } catch (e) { console.error("No se pudo cargar el catálogo:", e); }
}

function elegirBusco(obj) {
  buscoElegido = obj;
  const caja = $("busco-elegido");
  caja.innerHTML = "";
  caja.classList.toggle("oculto", !obj);
  caja.classList.toggle("objeto-faltante", Boolean(obj) && !tieneObjetoEnColeccion(obj));
  if (!obj) return;
  const img = el("img"); img.src = imagenItem(obj); img.alt = "";
  caja.append(img, el("span", "", "Buscas: " + nombreItem(obj)));
}

function tieneObjetoEnColeccion(obj) {
  const normalizar = (v) => String(v || "").trim().toLowerCase();
  return misObjetos.some((x) => mismo(x, obj)
    || (x.compraId && obj.compraId && x.compraId === obj.compraId)
    || (x.id && obj.id && x.id === obj.id)
    || (normalizar(nombreItem(x)) === normalizar(nombreItem(obj)) && String(x.numero || "") === String(obj.numero || "")));
}

function pintarCatalogo() {
  const panel = $("panel-catalogo");
  const q = $("input-busco").value.trim().toLowerCase();
  panel.innerHTML = "";
  const lista = catalogo.filter((x) => !q || nombreItem(x).toLowerCase().includes(q) || String(x.numero || "") === q.replace("#", "")).sort(porNumero);
  if (!lista.length) {
    panel.appendChild(el("p", "texto-ayuda", catalogo.length ? "Sin coincidencias: se publicará tu texto tal cual." : "Aún no hay objetos en el catálogo."));
    return;
  }
  lista.forEach((x) => {
    const b = el("button", "opcion-catalogo");
    b.type = "button";
    if (!tieneObjetoEnColeccion(x)) b.classList.add("opcion-catalogo-faltante");
    const img = el("img"); img.src = imagenItem(x); img.alt = ""; img.loading = "lazy";
    b.append(img, el("span", "", nombreItem(x) + (x.numero ? " #" + x.numero : "")));
    b.addEventListener("click", () => {
      $("input-busco").value = nombreItem(x);
      elegirBusco(x);
      panel.classList.add("oculto");
    });
    panel.appendChild(b);
  });
}

$("input-busco").addEventListener("focus", () => { pintarCatalogo(); $("panel-catalogo").classList.remove("oculto"); });
$("input-busco").addEventListener("input", () => {
  if (buscoElegido && $("input-busco").value.trim() !== nombreItem(buscoElegido)) elegirBusco(null);
  pintarCatalogo();
  $("panel-catalogo").classList.remove("oculto");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#campo-ofrezco")) $("panel-ofrezco").classList.add("oculto");
  if (!e.target.closest("#campo-busco")) $("panel-catalogo").classList.add("oculto");
});

// ---------- "¿Qué vendes?": elegir entre MIS coleccionables ----------
function elegirVendo(obj) {
  vendoElegido = obj;
  const caja = $("vendo-elegido");
  caja.innerHTML = "";
  caja.classList.toggle("oculto", !obj);
  if (!obj) return;
  const img = el("img"); img.src = imagenItem(obj); img.alt = "";
  caja.append(img, el("span", "", "Vendes: " + nombreItem(obj)));
}

function pintarVendo() {
  const panel = $("panel-vendo");
  const q = $("input-vendo").value.trim().toLowerCase();
  panel.innerHTML = "";
  const lista = misObjetos.filter((x) => !q || nombreItem(x).toLowerCase().includes(q) || String((x && x.numero) || "") === q.replace("#", "")).sort(porNumero);
  if (!lista.length) {
    panel.appendChild(el("p", "texto-ayuda", misObjetos.length ? "Ninguno de tus coleccionables coincide." : "No tienes coleccionables todavía."));
    return;
  }
  lista.forEach((x) => {
    const b = el("button", "opcion-catalogo");
    b.type = "button";
    const img = el("img"); img.src = imagenItem(x); img.alt = ""; img.loading = "lazy";
    b.append(img, el("span", "", nombreItem(x) + (x && x.numero ? " #" + x.numero : "")));
    b.addEventListener("click", () => {
      $("input-vendo").value = nombreItem(x);
      elegirVendo(x);
      panel.classList.add("oculto");
    });
    panel.appendChild(b);
  });
}

$("input-vendo").addEventListener("focus", () => { pintarVendo(); $("panel-vendo").classList.remove("oculto"); });
$("input-vendo").addEventListener("input", () => {
  if (vendoElegido && $("input-vendo").value.trim() !== nombreItem(vendoElegido)) elegirVendo(null);
  pintarVendo();
  $("panel-vendo").classList.remove("oculto");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#campo-vendo")) $("panel-vendo").classList.add("oculto");
});

$("btn-vender").addEventListener("click", () => {
  if (!vendoElegido) { estado.textContent = "Elige qué coleccionable vendes."; return; }
  const textoPrecioIngresado = $("input-precio").value.trim();
  // Acepta tanto 123344 como 123.344 (formato de miles chileno).
  const precioPesos = Math.floor(Number(textoPrecioIngresado.replace(/\./g, "").replace(",", ".")));
  if (!(precioPesos >= 50 && precioPesos <= 100000000)) { estado.textContent = "Pon un precio válido en pesos (mínimo 50)."; return; }
  const item = vendoElegido;
  ejecutar($("btn-vender"), async () => {
    await ponerEnVenta(item, precioPesos);
    elegirVendo(null);
    $("input-vendo").value = "";
    $("input-precio").value = "";
  });
});

// ---------- Botones circulares: "Intercambio" y "Compra y venta" ----------
function mostrarPanel(cual) {
  [["intercambio", "form-intercambio", "btn-abrir-intercambio"], ["mercado", "panel-mercado", "btn-abrir-mercado"]].forEach(([nombre, panel, boton]) => {
    const abrir = nombre === cual;
    $(panel).classList.toggle("oculto", !abrir);
    $(boton).setAttribute("aria-expanded", String(abrir));
  });
  ["panel-ofrezco", "panel-catalogo", "panel-vendo"].forEach((id) => $(id).classList.add("oculto"));
}
$("btn-abrir-intercambio").addEventListener("click", () => {
  mostrarPanel($("form-intercambio").classList.contains("oculto") ? "intercambio" : null);
});
$("btn-abrir-mercado").addEventListener("click", () => {
  mostrarPanel($("panel-mercado").classList.contains("oculto") ? "mercado" : null);
});

auth.onAuthStateChanged((usuario) => {
  if (!usuario) { window.location.href = "index.html"; return; }
  yo = usuario;
  cargarCatalogo();
  recargar();
});
