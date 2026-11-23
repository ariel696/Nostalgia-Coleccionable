/*
  ===========================================
  admin.js - Lógica del panel de administración
  ===========================================
  Esta página deja agregar productos nuevos (paquetes con sus
  opciones/tazos) a la colección "productos" de Firestore, sin tener
  que tocar código. Solo funciona para la cuenta admin.
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

// La misma cuenta admin que definimos en script.js. Como explicamos
// ahí, cada archivo .js es independiente, así que la repetimos acá.
const EMAIL_ADMIN = "arielriquelme08@gmail.com";

// -----------------------------------------------------------------
// 1.1) CONFIGURACIÓN DE CLOUDINARY (subida de imágenes de productos)
// -----------------------------------------------------------------
// "Cloud name": el identificador de TU cuenta de Cloudinary (lo
// sacamos del Dashboard de la consola). "Upload preset": el nombre
// de la "receta" de subida que configuraste en modo "Unsigned" (o
// sea, que cualquiera puede usar para subir SIN necesitar tu clave
// secreta, algo imprescindible acá porque este código corre en el
// navegador de quien sea que abra la página, a la vista de todos).
const CLOUDINARY_CLOUD_NAME = "os889md5";
const CLOUDINARY_UPLOAD_PRESET = "nostalgiacolecciones_productos";

// -----------------------------------------------------------------
// 2) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const mensajeSinPermiso = document.getElementById("mensaje-sin-permiso");
const panelAdmin = document.getElementById("panel-admin");
const infoAdminRoot = document.getElementById("info-admin-root");
const formNuevoProducto = document.getElementById("form-nuevo-producto");
const tituloFormLugar = document.getElementById("titulo-form-lugar");
const inputNombreProducto = document.getElementById("input-nombre-producto");
const inputImagenProducto = document.getElementById("input-imagen-producto");
const inputArchivoImagen = document.getElementById("input-archivo-imagen"); // NUEVO
const previewImagenProducto = document.getElementById("preview-imagen-producto"); // NUEVO
const textoEstadoSubida = document.getElementById("texto-estado-subida"); // NUEVO
const contenedorOpciones = document.getElementById("contenedor-opciones");
const botonAgregarOpcion = document.getElementById("boton-agregar-opcion");
const listaProductosAdmin = document.getElementById("lista-productos-admin");
const botonGuardarProducto = formNuevoProducto.querySelector(".boton-comprar"); // NUEVO
const botonCancelarEdicion = document.getElementById("boton-cancelar-edicion");
// Botón que está al lado del nombre del lugar y sirve para desbloquearlo.
const botonEditarNombreLugar = document.getElementById("boton-editar-nombre-lugar");
const parametrosAdmin = new URLSearchParams(window.location.search);
const idEditarInicial = parametrosAdmin.get("editar");

// Esta variable es una "bandera": true mientras hay una subida a
// Cloudinary en curso, false el resto del tiempo. La usamos para
// evitar que el formulario se guarde a medio subir la imagen.
let subiendoImagen = false; // NUEVO
let idLugarEditando = null;

// -----------------------------------------------------------------
// 2.1) FUNCIÓN: comprimir la imagen ANTES de subirla (NUEVO)
// -----------------------------------------------------------------
// Recibe el archivo original (tal como lo eligió el usuario, que
// puede pesar varios MB si es una foto de celular) y devuelve una
// versión más chica y liviana, lista para subir a Cloudinary.
//
// La técnica es: dibujar la imagen dentro de un <canvas> (un
// "lienzo" invisible que vive solo en la memoria del navegador,
// nunca se ve en pantalla) a un tamaño más chico, y después pedirle
// a ese canvas que la exporte como un archivo JPEG con una calidad
// reducida. Esto pasa TODO en la computadora de quien sube la foto,
// antes de que un solo byte viaje a internet, así que además de
// ahorrar espacio en Cloudinary, la subida es más rápida.
//
// Como leer un archivo y dibujar una imagen son cosas asincrónicas
// (tardan un instante), envolvemos todo en una "Promise": un objeto
// que representa "una respuesta que todavía no llegó, pero va a
// llegar". Quien use esta función espera el resultado con ".then()",
// igual que ya veníamos haciendo con fetch() y con Firestore.
function comprimirImagen(archivoOriginal) {
  const ANCHO_MAXIMO = 1000; // en píxeles: ninguna foto sale más ancha que esto
  const CALIDAD_JPEG = 0.7; // de 0 (peor calidad, menos peso) a 1 (mejor calidad, más peso)

  return new Promise((resolve, reject) => {
    // FileReader lee el contenido del archivo elegido. Se lo
    // pedimos en formato "Data URL" (un texto largo que representa
    // la imagen), porque es el formato que un <img> puede usar
    // directamente como fuente.
    const lector = new FileReader();

    lector.onload = (eventoLectura) => {
      const imagenOriginal = new Image();

      imagenOriginal.onload = () => {
        // Calculamos el nuevo ancho/alto, manteniendo la proporción
        // original (para que la foto no salga "estirada"). Si la
        // imagen ya es más chica que el máximo, la dejamos como
        // está (no tiene sentido agrandarla).
        let anchoFinal = imagenOriginal.width;
        let altoFinal = imagenOriginal.height;

        if (anchoFinal > ANCHO_MAXIMO) {
          const proporcion = ANCHO_MAXIMO / anchoFinal;
          anchoFinal = ANCHO_MAXIMO;
          altoFinal = Math.round(altoFinal * proporcion);
        }

        const canvas = document.createElement("canvas");
        canvas.width = anchoFinal;
        canvas.height = altoFinal;

        // "2d" le pide al canvas su "pincel" para dibujar formas e
        // imágenes comunes (existe también un modo "3d" para
        // gráficos más avanzados, que acá no necesitamos).
        const contexto = canvas.getContext("2d");
        contexto.drawImage(imagenOriginal, 0, 0, anchoFinal, altoFinal);

        // "toBlob" exporta el dibujo del canvas como un archivo de
        // verdad (un "Blob": un paquete de datos binarios, la misma
        // naturaleza que tiene cualquier archivo). Le pedimos
        // formato JPEG con la calidad reducida que definimos arriba.
        canvas.toBlob(
          (blobComprimido) => {
            if (blobComprimido) {
              resolve(blobComprimido);
            } else {
              reject(new Error("El canvas no pudo generar la imagen comprimida."));
            }
          },
          "image/jpeg",
          CALIDAD_JPEG
        );
      };

      imagenOriginal.onerror = () => reject(new Error("No se pudo leer la imagen elegida."));
      imagenOriginal.src = eventoLectura.target.result;
    };

    lector.onerror = () => reject(new Error("No se pudo leer el archivo elegido."));
    lector.readAsDataURL(archivoOriginal);
  });
}

// -----------------------------------------------------------------
// 2.2) FUNCIÓN: pedirle a Cloudinary el mejor formato/calidad (NUEVO)
// -----------------------------------------------------------------
// Cloudinary permite pedir "transformaciones" agregando texto
// especial adentro de la URL, justo después de "/upload/". Acá
// insertamos "f_auto,q_auto/":
//   - f_auto ("format auto"): en vez de servir siempre el mismo
//     archivo que se subió, Cloudinary detecta CON QUÉ NAVEGADOR
//     estás mirando la página y entrega el formato que mejor le
//     funcione a ESE navegador (por ejemplo WebP en Chrome, que pesa
//     bastante menos que un JPEG con la misma calidad visual).
//     Esto también nos salva de un problema común: si alguien sube
//     una foto en formato .heic (el que usan los iPhone por
//     defecto), la mayoría de los navegadores de escritorio NO
//     pueden mostrar ese formato directo — con f_auto, Cloudinary la
//     entrega ya convertida a algo que cualquier navegador entiende.
//   - q_auto ("quality auto"): además de la compresión que ya
//     hicimos en el navegador antes de subir, Cloudinary aplica su
//     propio ajuste inteligente de calidad al momento de entregarla.
//
// Ejemplo de cómo queda la URL:
//   antes:    .../upload/v1234/nostalgiacoleccion/foto.jpg
//   después:  .../upload/f_auto,q_auto/v1234/nostalgiacoleccion/foto.jpg
function optimizarUrlCloudinary(urlOriginal) {
  return urlOriginal.replace("/upload/", "/upload/f_auto,q_auto/");
}

// -----------------------------------------------------------------
// 2.3) FUNCIÓN: subir el archivo elegido a Cloudinary (NUEVO)
// -----------------------------------------------------------------
// Recibe el archivo de imagen YA comprimido (viene de
// comprimirImagen) y lo manda a la API de Cloudinary.
function subirImagenACloudinary(archivo) {
  subiendoImagen = true;
  botonGuardarProducto.disabled = true; // evita guardar a mitad de subida
  textoEstadoSubida.textContent = "Subiendo imagen...";
  previewImagenProducto.classList.add("oculto");

  // "FormData" es la forma estándar en JavaScript de armar un
  // paquete de datos que incluye un ARCHIVO adentro (algo que un
  // objeto común de JavaScript no puede llevar). Cloudinary espera
  // recibir el archivo bajo la clave "file", y el nombre de nuestro
  // preset bajo la clave "upload_preset".
  //
  // El tercer argumento de "append" (el nombre "producto.jpg") hace
  // falta porque un Blob comprimido, a diferencia del archivo
  // original, no trae un nombre propio: se lo damos nosotros.
  const datosFormulario = new FormData();
  datosFormulario.append("file", archivo, "producto.jpg");
  datosFormulario.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  // Esta es la URL fija de la API de subida de Cloudinary: siempre
  // tiene esta forma, cambiando solo tu cloud name en el medio.
  const urlDeSubida = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload";

  // "fetch" es la forma moderna en JavaScript de hacer pedidos a
  // internet (parecido a lo que hace el navegador cuando entrás a
  // una página, pero controlado por nuestro código). "method: POST"
  // significa "estoy mandando datos", no solo pidiéndolos.
  fetch(urlDeSubida, {
    method: "POST",
    body: datosFormulario
  })
    .then((respuesta) => respuesta.json())
    .then((datos) => {
      // Si todo salió bien, Cloudinary nos devuelve (entre otras
      // cosas) "secure_url": la dirección https:// pública y
      // definitiva de la imagen ya subida.
      if (datos.secure_url) {
        const urlOptimizada = optimizarUrlCloudinary(datos.secure_url);
        inputImagenProducto.value = urlOptimizada;
        previewImagenProducto.src = urlOptimizada;
        previewImagenProducto.classList.remove("oculto");
        textoEstadoSubida.textContent = "Imagen subida correctamente.";
      } else {
        console.error("Cloudinary no devolvió una URL:", datos);
        textoEstadoSubida.textContent = "No se pudo subir la imagen. Intenta de nuevo.";
      }
    })
    .catch((error) => {
      console.error("Error al subir la imagen a Cloudinary:", error.message);
      textoEstadoSubida.textContent = "Error al subir la imagen. Intenta de nuevo.";
    })
    .finally(() => {
      // ".finally()" corre siempre, haya salido bien o mal el
      // pedido. Perfecto para "apagar" el estado de carga en
      // cualquiera de los dos casos, sin repetir código.
      subiendoImagen = false;
      botonGuardarProducto.disabled = false;
    });
}

// Apenas el usuario elige un archivo en el selector, primero lo
// comprimimos y RECIÉN DESPUÉS arrancamos la subida, sin que tenga
// que apretar ningún botón aparte para ninguno de los dos pasos.
inputArchivoImagen.addEventListener("change", () => {
  const archivoElegido = inputArchivoImagen.files[0];
  if (!archivoElegido) return;

  subiendoImagen = true;
  botonGuardarProducto.disabled = true;
  textoEstadoSubida.textContent = "Comprimiendo imagen...";

  comprimirImagen(archivoElegido)
    .then((archivoComprimido) => {
      subirImagenACloudinary(archivoComprimido);
    })
    .catch((error) => {
      // Si algo sale mal comprimiendo (muy raro, pero puede pasar
      // con algunos formatos poco comunes), preferimos subir la
      // imagen ORIGINAL antes que dejar al usuario sin poder cargar
      // ningún producto.
      console.error("No se pudo comprimir, subo la imagen original:", error.message);
      subirImagenACloudinary(archivoElegido);
    });
});

// -----------------------------------------------------------------
// 2.4) EDITOR DE IMAGEN: girar con precisión (frente / reverso)
// -----------------------------------------------------------------
// Abre una ventana con la imagen y una regla de ángulo (de -180° a
// 180°, de a medio grado). La vista previa se dibuja en un <canvas>
// con exactamente el mismo código que después genera la imagen
// final, así que lo que ves es lo que se guarda. Al aplicar, se
// sube la imagen girada como una PNG nueva (con esquinas
// transparentes) y se reemplaza la anterior en el formulario.

// Dibuja "imagen" girada "grados" alrededor de su centro, dentro de
// un cuadrado de "lado" x "lado" píxeles.
function dibujarImagenGirada(contexto, imagen, lado, grados) {
  contexto.clearRect(0, 0, lado, lado);
  contexto.save();
  contexto.translate(lado / 2, lado / 2);
  contexto.rotate((grados * Math.PI) / 180);
  const escala = lado / Math.max(imagen.naturalWidth, imagen.naturalHeight);
  const ancho = imagen.naturalWidth * escala;
  const alto = imagen.naturalHeight * escala;
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(imagen, -ancho / 2, -alto / 2, ancho, alto);
  contexto.restore();
}

// Mantiene un ángulo dentro del rango -180..180 (por ejemplo 270 -> -90).
function normalizarGrados(valor) {
  return (((valor + 180) % 360) + 360) % 360 - 180;
}

function abrirEditorImagen(opciones) {
  const modalAnterior = document.querySelector(".modal-editor-imagen");
  if (modalAnterior) modalAnterior.remove();

  const modal = document.createElement("div");
  modal.className = "modal-editor-imagen";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const panel = document.createElement("div");
  panel.className = "editor-imagen";

  const titulo = document.createElement("h3");
  titulo.textContent = opciones.titulo;

  // --- Zona de vista previa (+ imagen de referencia opcional) ---
  const zona = document.createElement("div");
  zona.className = "editor-imagen-zona";

  const escenario = document.createElement("div");
  escenario.className = "editor-imagen-escenario";
  const lienzo = document.createElement("canvas");
  lienzo.width = 480;
  lienzo.height = 480;
  const guias = document.createElement("div");
  guias.className = "editor-imagen-guias";
  escenario.append(lienzo, guias);
  zona.appendChild(escenario);

  if (opciones.urlReferencia) {
    const referencia = document.createElement("figure");
    referencia.className = "editor-imagen-referencia";
    const marco = document.createElement("div");
    marco.className = "editor-imagen-marco-referencia";
    const imagenReferencia = document.createElement("img");
    imagenReferencia.src = opciones.urlReferencia;
    imagenReferencia.alt = opciones.etiquetaReferencia || "Referencia";
    const guiasReferencia = document.createElement("div");
    guiasReferencia.className = "editor-imagen-guias";
    marco.append(imagenReferencia, guiasReferencia);
    const leyenda = document.createElement("figcaption");
    leyenda.textContent = opciones.etiquetaReferencia || "Referencia";
    referencia.append(marco, leyenda);
    zona.appendChild(referencia);
  }

  // --- Controles de ángulo ---
  const filaAngulo = document.createElement("div");
  filaAngulo.className = "editor-imagen-fila-angulo";

  const regla = document.createElement("input");
  regla.type = "range";
  regla.min = "-180";
  regla.max = "180";
  regla.step = "0.5";
  regla.value = "0";
  regla.setAttribute("aria-label", "Ángulo de giro");

  const campoNumero = document.createElement("input");
  campoNumero.type = "number";
  campoNumero.min = "-180";
  campoNumero.max = "180";
  campoNumero.step = "0.5";
  campoNumero.value = "0";
  campoNumero.setAttribute("aria-label", "Ángulo en grados");

  const simboloGrados = document.createElement("span");
  simboloGrados.textContent = "°";

  filaAngulo.append(regla, campoNumero, simboloGrados);

  const pasos = document.createElement("div");
  pasos.className = "editor-imagen-pasos";

  const textoEstado = document.createElement("p");
  textoEstado.className = "texto-ayuda editor-imagen-estado";
  textoEstado.textContent = "Cargando imagen...";

  const acciones = document.createElement("div");
  acciones.className = "editor-imagen-acciones";

  const botonRestablecer = document.createElement("button");
  botonRestablecer.type = "button";
  botonRestablecer.className = "boton-secundario";
  botonRestablecer.textContent = "Restablecer";

  const botonCancelar = document.createElement("button");
  botonCancelar.type = "button";
  botonCancelar.className = "boton-secundario";
  botonCancelar.textContent = "Cancelar";

  const botonAplicar = document.createElement("button");
  botonAplicar.type = "button";
  botonAplicar.className = "boton-comprar";
  botonAplicar.textContent = "Aplicar";
  botonAplicar.disabled = true;

  acciones.append(botonRestablecer, botonCancelar, botonAplicar);

  // --- Estado del editor ---
  let imagen = null;
  let grados = 0;
  let urlTemporal = null;
  let guardando = false;

  function dibujar() {
    if (!imagen) return;
    dibujarImagenGirada(lienzo.getContext("2d"), imagen, lienzo.width, grados);
  }

  function fijarGrados(valor) {
    let numero = Number(valor);
    if (!isFinite(numero)) numero = 0;
    numero = Math.max(-180, Math.min(180, numero));
    grados = Math.round(numero * 2) / 2;
    regla.value = String(grados);
    campoNumero.value = String(grados);
    dibujar();
  }

  [-90, -5, -0.5, 0.5, 5, 90].forEach((paso) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-rotar";
    boton.textContent = (paso > 0 ? "+" : "−") + String(Math.abs(paso)).replace(".", ",") + "°";
    boton.addEventListener("click", () => fijarGrados(normalizarGrados(grados + paso)));
    pasos.appendChild(boton);
  });

  regla.addEventListener("input", () => fijarGrados(regla.value));
  campoNumero.addEventListener("change", () => fijarGrados(campoNumero.value));
  botonRestablecer.addEventListener("click", () => fijarGrados(0));

  function cerrar() {
    document.removeEventListener("keydown", alPresionarTecla);
    if (urlTemporal) URL.revokeObjectURL(urlTemporal);
    modal.remove();
  }

  function alPresionarTecla(evento) {
    if (evento.key === "Escape" && !guardando) cerrar();
  }

  botonCancelar.addEventListener("click", () => {
    if (!guardando) cerrar();
  });
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal && !guardando) cerrar();
  });
  document.addEventListener("keydown", alPresionarTecla);

  botonAplicar.addEventListener("click", () => {
    if (!imagen || guardando) return;
    if (grados === 0) {
      cerrar();
      return;
    }

    const lado = Math.min(1000, Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const lienzoFinal = document.createElement("canvas");
    lienzoFinal.width = lado;
    lienzoFinal.height = lado;
    dibujarImagenGirada(lienzoFinal.getContext("2d"), imagen, lado, grados);

    guardando = true;
    botonAplicar.disabled = true;
    botonRestablecer.disabled = true;
    botonCancelar.disabled = true;
    textoEstado.textContent = "Guardando imagen...";

    lienzoFinal.toBlob((blob) => {
      if (!blob) {
        guardando = false;
        botonAplicar.disabled = false;
        botonRestablecer.disabled = false;
        botonCancelar.disabled = false;
        textoEstado.textContent = "No se pudo generar la imagen. Intenta de nuevo.";
        return;
      }

      opciones.alGuardar(blob)
        .then(() => {
          guardando = false;
          cerrar();
        })
        .catch((error) => {
          console.error("Error al guardar la imagen editada:", error.message);
          guardando = false;
          botonAplicar.disabled = false;
          botonRestablecer.disabled = false;
          botonCancelar.disabled = false;
          textoEstado.textContent = "No se pudo subir la imagen. Intenta de nuevo.";
        });
    }, "image/png");
  });

  panel.append(titulo, zona, filaAngulo, pasos, textoEstado, acciones);
  modal.appendChild(panel);
  document.body.appendChild(modal);
  botonCancelar.focus();

  // Bajamos la imagen como archivo (blob) para poder dibujarla en el
  // canvas sin problemas de permisos entre sitios (CORS). "reload"
  // evita que el navegador reutilice una copia guardada sin esos
  // permisos.
  fetch(opciones.url, { mode: "cors", cache: "reload" })
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error("Respuesta " + respuesta.status);
      return respuesta.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      urlTemporal = URL.createObjectURL(blob);
      const imagenCargada = new Image();
      imagenCargada.onload = () => resolve(imagenCargada);
      imagenCargada.onerror = () => reject(new Error("No se pudo leer la imagen."));
      imagenCargada.src = urlTemporal;
    }))
    .then((imagenCargada) => {
      imagen = imagenCargada;
      botonAplicar.disabled = false;
      textoEstado.textContent = "Mueve la regla o usa los botones. Las guías rojas marcan el centro.";
      dibujar();
    })
    .catch((error) => {
      console.error("Error al cargar la imagen para editar:", error.message);
      textoEstado.textContent = "No se pudo cargar la imagen para editarla.";
    });
}

// Crea el botón "✎ Ajustar" que abre el editor para la imagen guardada
// en "inputUrl". Se oculta solo mientras no haya imagen (ver
// .preview-opcion.oculto + .boton-editar-imagen en style.css).
// "obtenerReferencia" es opcional: devuelve { url, etiqueta } de la
// otra cara del premio para compararlas lado a lado.
function crearBotonEditarImagen(inputUrl, vistaPrevia, textoEstado, tituloEditor, obtenerReferencia) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-editar-imagen";
  boton.textContent = "✎ Ajustar";
  boton.addEventListener("click", () => {
    if (!inputUrl.value) return;
    const referencia = obtenerReferencia ? obtenerReferencia() : null;

    abrirEditorImagen({
      url: inputUrl.value,
      titulo: tituloEditor,
      urlReferencia: referencia && referencia.url ? referencia.url : "",
      etiquetaReferencia: referencia ? referencia.etiqueta : "",
      alGuardar: (blob) => {
        subiendoImagen = true;
        botonGuardarProducto.disabled = true;
        return subirArchivoACloudinary(blob, "premio-editado.png", true)
          .then((urlNueva) => {
            inputUrl.value = urlNueva;
            vistaPrevia.src = urlNueva;
            textoEstado.textContent = "Imagen ajustada. Guarda el producto para aplicar el cambio.";
          })
          .finally(() => {
            subiendoImagen = false;
            botonGuardarProducto.disabled = false;
          });
      }
    });
  });
  return boton;
}

function subirArchivoACloudinary(archivo, nombreArchivo, sinComprimir) {
  // "sinComprimir" se usa para las imágenes editadas: se suben tal cual
  // (PNG con esquinas transparentes) en vez de pasar por el JPEG.
  const preparada = sinComprimir
    ? Promise.resolve(archivo)
    : comprimirImagen(archivo).catch(() => archivo);

  return preparada
    .then((archivoListo) => {
      const datosFormulario = new FormData();
      datosFormulario.append("file", archivoListo, nombreArchivo || "imagen.jpg");
      datosFormulario.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const urlDeSubida = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload";

      return fetch(urlDeSubida, {
        method: "POST",
        body: datosFormulario
      })
        .then((respuesta) => respuesta.json())
        .then((datos) => {
          if (!datos.secure_url) {
            throw new Error("Cloudinary no devolvio una URL.");
          }

          return optimizarUrlCloudinary(datos.secure_url);
        });
    });
}
// -----------------------------------------------------------------
// 3) FUNCIÓN: convertir un nombre en un id de documento válido
// -----------------------------------------------------------------
// Firestore permite casi cualquier texto como id de documento, pero
// para que nuestras URLs (producto.html?id=...) queden prolijas y
// sin problemas de espacios/tildes, generamos un "slug": todo en
// minúscula, sin tildes, con guiones en vez de espacios.
//
// Ejemplo: "Dragon Ball Z - Cartas" -> "dragon-ball-z-cartas"
function generarId(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD") // separa las letras de sus tildes (á -> a + ´)
    .replace(/[\u0300-\u036f]/g, "") // elimina esas tildes ya separadas
    .replace(/[^a-z0-9]+/g, "-") // cualquier cosa que no sea letra/número -> guion
    .replace(/(^-|-$)/g, ""); // saca guiones sueltos al principio/final
}

// -----------------------------------------------------------------
// 4) FUNCIÓN: agregar una fila de "opción" al formulario
// -----------------------------------------------------------------
function agregarFilaPremio(contenedorPremios, premioExistente = {}) {
  const filaPremio = document.createElement("div");
  filaPremio.className = "fila-premio";

  const inputNombrePremio = document.createElement("input");
  inputNombrePremio.type = "text";
  inputNombrePremio.placeholder = "Nombre del premio (ej: Tazo Pikachu)";
  inputNombrePremio.className = "input-nombre-premio";
  inputNombrePremio.value = premioExistente.nombre || "";

  const inputImagenPremio = document.createElement("input");
  inputImagenPremio.type = "hidden";
  inputImagenPremio.className = "input-imagen-premio";
  inputImagenPremio.value = premioExistente.imagen || "";

  const inputArchivoPremio = document.createElement("input");
  inputArchivoPremio.type = "file";
  inputArchivoPremio.accept = "image/*";
  inputArchivoPremio.className = "input-archivo-premio";

  const previewPremio = document.createElement("img");
  previewPremio.className = "preview-opcion oculto";
  previewPremio.alt = "Vista previa del premio";
  if (premioExistente.imagen) {
    previewPremio.src = premioExistente.imagen;
    previewPremio.classList.remove("oculto");
  }

  // El número en la colección ya no se escribe a mano: el campo visible se
  // eliminó. Queda un campo oculto que conserva el número que ya tenía el
  // premio, para no perderlo al guardar el producto.
  const inputNumeroPremio = document.createElement("input");
  inputNumeroPremio.type = "hidden";
  inputNumeroPremio.className = "input-numero-premio";
  inputNumeroPremio.value = premioExistente.numero || "";

  // --- Imagen trasera opcional del premio ---
  const inputImagenTraseraPremio = document.createElement("input");
  inputImagenTraseraPremio.type = "hidden";
  inputImagenTraseraPremio.className = "input-imagen-trasera-premio";
  inputImagenTraseraPremio.value = premioExistente.imagenTrasera || "";

  const inputArchivoTraseraPremio = document.createElement("input");
  inputArchivoTraseraPremio.type = "file";
  inputArchivoTraseraPremio.accept = "image/*";
  inputArchivoTraseraPremio.className = "input-archivo-opcion";

  const previewTraseraPremio = document.createElement("img");
  previewTraseraPremio.className = "preview-opcion oculto";
  previewTraseraPremio.alt = "Vista previa de la parte trasera del premio";
  if (premioExistente.imagenTrasera) {
    previewTraseraPremio.src = premioExistente.imagenTrasera;
    previewTraseraPremio.classList.remove("oculto");
  }

  const estadoTraseraPremio = document.createElement("p");
  estadoTraseraPremio.className = "estado-subida-opcion texto-ayuda";
  estadoTraseraPremio.textContent = premioExistente.imagenTrasera
    ? "Trasera actual. Puedes reemplazarla."
    : "Trasera opcional (reverso).";

  inputArchivoTraseraPremio.addEventListener("change", () => {
    const archivoElegido = inputArchivoTraseraPremio.files[0];
    if (!archivoElegido) return;

    subiendoImagen = true;
    botonGuardarProducto.disabled = true;
    estadoTraseraPremio.textContent = "Subiendo imagen trasera del premio...";

    subirArchivoACloudinary(archivoElegido, "premio-coleccionable-trasera.jpg")
      .then((urlImagen) => {
        inputImagenTraseraPremio.value = urlImagen;
        previewTraseraPremio.src = urlImagen;
        previewTraseraPremio.classList.remove("oculto");
        estadoTraseraPremio.textContent = "Imagen trasera del premio subida.";
      })
      .catch((error) => {
        console.error("Error al subir imagen trasera del premio:", error.message);
        inputImagenTraseraPremio.value = "";
        previewTraseraPremio.classList.add("oculto");
        estadoTraseraPremio.textContent = "No se pudo subir esta imagen. Intenta de nuevo.";
      })
      .finally(() => {
        subiendoImagen = false;
        botonGuardarProducto.disabled = false;
      });
  });

  const filaTraseraPremio = document.createElement("div");
  filaTraseraPremio.className = "fila-trasera-premio";
  filaTraseraPremio.appendChild(inputArchivoTraseraPremio);
  filaTraseraPremio.appendChild(inputImagenTraseraPremio);
  filaTraseraPremio.appendChild(previewTraseraPremio);
  filaTraseraPremio.appendChild(crearBotonEditarImagen(inputImagenTraseraPremio, previewTraseraPremio, estadoTraseraPremio, "Ajustar imagen trasera", () => ({ url: inputImagenPremio.value, etiqueta: "Frente" })));
  filaTraseraPremio.appendChild(estadoTraseraPremio);

  const estadoPremio = document.createElement("p");
  estadoPremio.className = "estado-subida-opcion texto-ayuda";
  estadoPremio.textContent = premioExistente.imagen
    ? "Imagen actual. Puedes reemplazarla."
    : "Imagen del premio (opcional).";

  inputArchivoPremio.addEventListener("change", () => {
    const archivoElegido = inputArchivoPremio.files[0];
    if (!archivoElegido) return;

    subiendoImagen = true;
    botonGuardarProducto.disabled = true;
    estadoPremio.textContent = "Subiendo imagen del premio...";

    subirArchivoACloudinary(archivoElegido, "premio-coleccionable.jpg")
      .then((urlImagen) => {
        inputImagenPremio.value = urlImagen;
        previewPremio.src = urlImagen;
        previewPremio.classList.remove("oculto");
        estadoPremio.textContent = "Imagen del premio subida.";
      })
      .catch((error) => {
        console.error("Error al subir imagen del premio:", error.message);
        inputImagenPremio.value = "";
        previewPremio.classList.add("oculto");
        estadoPremio.textContent = "No se pudo subir esta imagen. Intenta de nuevo.";
      })
      .finally(() => {
        subiendoImagen = false;
        botonGuardarProducto.disabled = false;
      });
  });

  const botonEliminarPremio = document.createElement("button");
  botonEliminarPremio.type = "button";
  botonEliminarPremio.textContent = "Quitar premio";
  botonEliminarPremio.className = "boton-quitar-fila";
  botonEliminarPremio.addEventListener("click", () => {
    filaPremio.remove();
  });

  // --- Bloque de la imagen DELANTERA (queda justo encima del bloque de la trasera) ---
  // Es un contenedor propio, igual al de la imagen trasera, para que ambas
  // se vean una debajo de la otra con el mismo formato.
  const filaFrontalPremio = document.createElement("div");
  // Esta clase le da el mismo estilo (fila flexible) que tiene la trasera.
  filaFrontalPremio.className = "fila-frontal-premio";
  // Botón para elegir el archivo de la imagen delantera.
  filaFrontalPremio.appendChild(inputArchivoPremio);
  // Campo oculto que guarda la URL de la imagen delantera ya subida.
  filaFrontalPremio.appendChild(inputImagenPremio);
  // Vista previa pequeña de la imagen delantera.
  filaFrontalPremio.appendChild(previewPremio);
  // Botón "Ajustar" para recortar/girar la imagen delantera.
  filaFrontalPremio.appendChild(crearBotonEditarImagen(inputImagenPremio, previewPremio, estadoPremio, "Ajustar imagen frontal", () => ({ url: inputImagenTraseraPremio.value, etiqueta: "Reverso" })));
  // Texto de estado de la imagen delantera ("Imagen del premio subida.", etc.).
  filaFrontalPremio.appendChild(estadoPremio);

  // --- Orden final de la fila del premio, de arriba hacia abajo ---
  // 1) Campo oculto con el número en la colección (no se ve en pantalla).
  filaPremio.appendChild(inputNumeroPremio);
  // 2) Nombre del premio.
  filaPremio.appendChild(inputNombrePremio);
  // 3) Imagen delantera.
  filaPremio.appendChild(filaFrontalPremio);
  // 4) Imagen trasera (justo debajo de la delantera).
  filaPremio.appendChild(filaTraseraPremio);
  // 5) Botón para quitar el premio completo.
  filaPremio.appendChild(botonEliminarPremio);
  contenedorPremios.appendChild(filaPremio);
}

// Crea un campo del producto con su etiqueta visible arriba (ej: "Nombre").
// "control" es el input o select que se coloca debajo de la etiqueta.
function crearCampoOpcion(textoEtiqueta, control, claseExtra) {
  // Contenedor del campo.
  const campo = document.createElement("div");
  campo.className = "campo-opcion" + (claseExtra ? " " + claseExtra : "");
  // Texto pequeño que explica qué se escribe en el campo.
  const etiqueta = document.createElement("span");
  etiqueta.className = "etiqueta-campo-opcion";
  etiqueta.textContent = textoEtiqueta;
  // Primero la etiqueta y debajo el campo.
  campo.appendChild(etiqueta);
  campo.appendChild(control);
  return campo;
}

function agregarFilaOpcion(opcionExistente = {}) {
  const fila = document.createElement("div");
  fila.className = "fila-opcion";

  const inputNombre = document.createElement("input");
  inputNombre.type = "text";
  inputNombre.placeholder = "Ej: Carta Goku";
  inputNombre.setAttribute("aria-label", "Nombre del producto");
  inputNombre.className = "input-nombre-opcion";
  inputNombre.value = opcionExistente.nombre || "";

  const inputSubtitulo = document.createElement("input");
  inputSubtitulo.type = "text";
  inputSubtitulo.placeholder = "Ej: Álbum Dragon Ball";
  inputSubtitulo.setAttribute("aria-label", "Subtítulo del producto");
  inputSubtitulo.className = "input-subtitulo-opcion";
  inputSubtitulo.maxLength = 80;
  inputSubtitulo.value = opcionExistente.subtitulo || "";

  const inputPrecio = document.createElement("input");
  inputPrecio.type = "number";
  inputPrecio.placeholder = "Ej: 3";
  inputPrecio.title = "Precio en monedas (1 moneda = $100)";
  inputPrecio.setAttribute("aria-label", "Precio en monedas (1 moneda = $100)");
  inputPrecio.min = "1";
  inputPrecio.step = "1";
  inputPrecio.className = "input-precio-opcion";
  inputPrecio.value = opcionExistente.precio || "";

  const selectorTipo = document.createElement("select");
  selectorTipo.className = "select-tipo-opcion";
  selectorTipo.setAttribute("aria-label", "Tipo de artículo");

  ["Coleccionable", "Objeto"].forEach((tipo) => {
    const opcionTipo = document.createElement("option");
    opcionTipo.value = tipo;
    opcionTipo.textContent = tipo;
    selectorTipo.appendChild(opcionTipo);
  });

  const tienePremiosExistentes = Array.isArray(opcionExistente.premios)
    && opcionExistente.premios.some((premio) => premio && premio.nombre);
  selectorTipo.value = opcionExistente.tipo || (tienePremiosExistentes ? "Coleccionable" : "Objeto");

  const inputImagen = document.createElement("input");
  inputImagen.type = "hidden";
  inputImagen.className = "input-imagen-opcion";
  inputImagen.value = opcionExistente.imagen || "";

  const inputArchivo = document.createElement("input");
  inputArchivo.type = "file";
  inputArchivo.accept = "image/*";
  inputArchivo.className = "input-archivo-opcion";

  const preview = document.createElement("img");
  preview.className = "preview-opcion oculto";
  preview.alt = "Vista previa del producto";
  if (opcionExistente.imagen) {
    preview.src = opcionExistente.imagen;
    preview.classList.remove("oculto");
  }

  // Miniatura del producto: siempre visible a la derecha, aunque la fila
  // esté cerrada, para reconocer el producto rápidamente.
  const miniatura = document.createElement("img");
  miniatura.className = "miniatura-opcion oculto";
  miniatura.alt = "Imagen del producto";
  if (opcionExistente.imagen) {
    miniatura.src = opcionExistente.imagen;
    miniatura.classList.remove("oculto");
  }
  // Si la imagen guardada no carga, se oculta la miniatura.
  miniatura.addEventListener("error", () => miniatura.classList.add("oculto"));

  const estado = document.createElement("p");
  estado.className = "estado-subida-opcion texto-ayuda";
  estado.textContent = opcionExistente.imagen
    ? "Imagen actual del producto. Puedes reemplazarla si lo deseas."
    : "Imagen opcional del producto que el usuario va a comprar.";

  inputArchivo.addEventListener("change", () => {
    const archivoElegido = inputArchivo.files[0];
    if (!archivoElegido) return;

    subiendoImagen = true;
    botonGuardarProducto.disabled = true;
    estado.textContent = "Subiendo imagen del producto...";

    subirArchivoACloudinary(archivoElegido, "producto-opcion.jpg")
      .then((urlImagen) => {
        inputImagen.value = urlImagen;
        preview.src = urlImagen;
        preview.classList.remove("oculto");
        // Actualiza también la miniatura que se ve con el producto cerrado.
        miniatura.src = urlImagen;
        miniatura.classList.remove("oculto");
        estado.textContent = "Imagen del producto subida.";
      })
      .catch((error) => {
        console.error("Error al subir imagen del producto:", error.message);
        inputImagen.value = "";
        preview.classList.add("oculto");
        // Sin imagen válida, la miniatura se oculta.
        miniatura.classList.add("oculto");
        estado.textContent = "No se pudo subir esta imagen. Intenta de nuevo.";
      })
      .finally(() => {
        subiendoImagen = false;
        botonGuardarProducto.disabled = false;
      });
  });

  const botonEliminar = document.createElement("button");
  botonEliminar.type = "button";
  botonEliminar.textContent = "Quitar";
  botonEliminar.className = "boton-quitar-fila";
  botonEliminar.addEventListener("click", () => {
    fila.remove();
  });

  // Botón con flecha que abre y cierra el detalle del producto
  // (cambiar imagen + premios). La flecha apunta hacia abajo cuando está
  // cerrado y hacia arriba cuando está abierto.
  const botonDesplegar = document.createElement("button");
  botonDesplegar.type = "button";
  botonDesplegar.className = "boton-desplegar-producto";

  // Botones de la derecha (flecha y "Quitar") agrupados en un solo bloque.
  const accionesProducto = document.createElement("div");
  accionesProducto.className = "acciones-opcion";
  accionesProducto.appendChild(botonDesplegar);
  accionesProducto.appendChild(botonEliminar);

  // Parte siempre visible, ordenada en cuadrícula con etiquetas:
  //   Fila 1: Nombre | Precio
  //   Fila 2: Subtítulo (ancho completo)
  //   Fila 3: Tipo   | flecha y "Quitar"
  const filaPrincipal = document.createElement("div");
  filaPrincipal.className = "fila-opcion-principal";
  // Cada campo lleva su propia clase para poder acomodarlo distinto en pantallas anchas.
  filaPrincipal.appendChild(crearCampoOpcion("Nombre", inputNombre, "campo-opcion-nombre"));
  filaPrincipal.appendChild(crearCampoOpcion("Precio (monedas)", inputPrecio, "campo-opcion-precio"));
  filaPrincipal.appendChild(crearCampoOpcion("Subtítulo (opcional)", inputSubtitulo, "campo-opcion-ancho campo-opcion-subtitulo"));
  filaPrincipal.appendChild(crearCampoOpcion("Tipo", selectorTipo, "campo-opcion-tipo"));
  filaPrincipal.appendChild(inputImagen);
  filaPrincipal.appendChild(accionesProducto);

  // Parte plegable: cambiar imagen del producto (se muestra solo al abrir).
  const filaImagen = document.createElement("div");
  filaImagen.className = "fila-opcion-imagen";
  filaImagen.appendChild(crearCampoOpcion("Imagen del producto", inputArchivo));
  filaImagen.appendChild(preview);
  filaImagen.appendChild(estado);

  const panelPremios = document.createElement("div");
  panelPremios.className = "panel-premios-opcion";

  const tituloPremios = document.createElement("h4");
  tituloPremios.textContent = "Premios opcionales del producto";

  const textoPremios = document.createElement("p");
  textoPremios.className = "texto-ayuda";
  textoPremios.textContent = "Agrega premios solo si este producto debe entregar un coleccionable al comprarlo.";

  const contenedorPremios = document.createElement("div");
  contenedorPremios.className = "contenedor-premios-opcion";

  const premiosExistentes = Array.isArray(opcionExistente.premios) ? opcionExistente.premios : [];
  premiosExistentes.forEach((premio) => agregarFilaPremio(contenedorPremios, premio));

  const botonAgregarPremio = document.createElement("button");
  botonAgregarPremio.type = "button";
  botonAgregarPremio.textContent = "+ Agregar premio";
  botonAgregarPremio.className = "boton-secundario";
  botonAgregarPremio.addEventListener("click", () => {
    agregarFilaPremio(contenedorPremios);
  });

  function actualizarPanelPremios() {
    panelPremios.classList.toggle("oculto", selectorTipo.value === "Objeto");
  }

  selectorTipo.addEventListener("change", actualizarPanelPremios);
  actualizarPanelPremios();

  panelPremios.appendChild(tituloPremios);
  panelPremios.appendChild(textoPremios);
  panelPremios.appendChild(contenedorPremios);
  panelPremios.appendChild(botonAgregarPremio);

  // Todo lo que se oculta al cerrar la flecha: imagen y premios.
  const detalleProducto = document.createElement("div");
  detalleProducto.className = "detalle-opcion";
  detalleProducto.appendChild(filaImagen);
  detalleProducto.appendChild(panelPremios);

  // Abre o cierra el detalle y actualiza la flecha y los textos de accesibilidad.
  function establecerDesplegado(abierto) {
    fila.classList.toggle("contraida", !abierto);
    botonDesplegar.textContent = abierto ? "▲" : "▼";
    botonDesplegar.setAttribute("aria-expanded", String(abierto));
    const textoBoton = abierto ? "Ocultar imagen y premios" : "Mostrar imagen y premios";
    botonDesplegar.title = textoBoton;
    botonDesplegar.setAttribute("aria-label", textoBoton);
  }
  botonDesplegar.addEventListener("click", () => {
    establecerDesplegado(fila.classList.contains("contraida"));
  });

  // Los productos que ya existen empiezan cerrados (página más corta).
  // Una fila nueva y vacía empieza abierta para poder llenarla de inmediato.
  establecerDesplegado(!opcionExistente.nombre);

  // Cabecera siempre visible: campos a la izquierda y miniatura a la derecha.
  const cabeceraProducto = document.createElement("div");
  cabeceraProducto.className = "cabecera-opcion";
  cabeceraProducto.appendChild(filaPrincipal);
  cabeceraProducto.appendChild(miniatura);

  fila.appendChild(cabeceraProducto);
  fila.appendChild(detalleProducto);
  contenedorOpciones.appendChild(fila);
}
// Conectamos el botón "+ Agregar opción" con la función de arriba.
botonAgregarOpcion.addEventListener("click", agregarFilaOpcion);

// Arrancamos el formulario con 1 fila lista, para no obligar a
// tocar "+ Agregar opción" antes de poder cargar algo.
agregarFilaOpcion();

// -----------------------------------------------------------------
// 5) FUNCIÓN: leer todas las filas de opciones y armar el array
// -----------------------------------------------------------------
function leerOpcionesDelFormulario() {
  const filas = contenedorOpciones.querySelectorAll(".fila-opcion");
  const opciones = [];
  let filaIncompleta = false;

  filas.forEach((fila) => {
    const nombre = fila.querySelector(".input-nombre-opcion").value.trim();
    const subtitulo = fila.querySelector(".input-subtitulo-opcion").value.trim();
    const precioTexto = fila.querySelector(".input-precio-opcion").value;
    const precio = Number(precioTexto);
    const tipo = fila.querySelector(".select-tipo-opcion").value;
    const imagen = fila.querySelector(".input-imagen-opcion").value.trim();
    const filasPremio = fila.querySelectorAll(".fila-premio");
    const premios = [];

    // Si el usuario dejó una fila vacía (sin nombre), la ignoramos
    // en vez de guardar una opción rota.
    if (nombre === "" || !precioTexto || precio <= 0 || !Number.isInteger(precio)) {
      if (nombre !== "" || subtitulo !== "" || precioTexto || imagen !== "") {
        filaIncompleta = true;
      }
      return;
    }

    if (tipo === "Coleccionable") filasPremio.forEach((filaPremio) => {
      const nombrePremio = filaPremio.querySelector(".input-nombre-premio").value.trim();
      const imagenPremio = filaPremio.querySelector(".input-imagen-premio").value.trim();
      const numeroTexto = filaPremio.querySelector(".input-numero-premio").value.trim();
      const imagenTraseraPremio = filaPremio.querySelector(".input-imagen-trasera-premio").value.trim();
      const numeroPremio = Number(numeroTexto);

      if (nombrePremio === "") {
        if (imagenPremio !== "") {
          filaIncompleta = true;
        }
        return;
      }

      // El número es opcional, pero si se escribe debe ser un entero >= 1.
      if (numeroTexto !== "" && (!Number.isInteger(numeroPremio) || numeroPremio < 1)) {
        filaIncompleta = true;
        return;
      }

      const premio = {
        id: generarId(nombrePremio),
        nombre: nombrePremio,
        tipo: "Coleccionable",
        imagen: imagenPremio
      };
      if (numeroTexto !== "") premio.numero = numeroPremio;
      if (imagenTraseraPremio !== "") premio.imagenTrasera = imagenTraseraPremio;
      premios.push(premio);
    });

    opciones.push({
      id: generarId(nombre),
      nombre: nombre,
      subtitulo: subtitulo,
      precio: precio,
      imagen: imagen,
      tipo: tipo,
      premios: premios
    });
  });

  if (filaIncompleta) {
    return null;
  }

  return opciones;
}

// -----------------------------------------------------------------
// 6) FUNCIÓN: guardar el producto nuevo en Firestore
// -----------------------------------------------------------------
formNuevoProducto.addEventListener("submit", (evento) => {
  // "preventDefault" evita que el navegador haga lo que hace por
  // defecto al enviar un form: recargar la página entera. Nosotros
  // queremos manejar el envío nosotros mismos, con JavaScript.
  evento.preventDefault();

  // NUEVO: si la imagen todavía se está subiendo a Cloudinary,
  // frenamos acá. Sin este chequeo, alguien que guarde muy rápido
  // podría terminar creando el producto con el campo de imagen
  // todavía vacío.
  if (subiendoImagen) {
    alert("Esperá a que termine de subirse la imagen antes de guardar.");
    return;
  }

  const nombreProducto = inputNombreProducto.value.trim();
  const imagenProducto = inputImagenProducto.value.trim();
  const opciones = leerOpcionesDelFormulario();

  if (opciones === null) {
    alert("Completa cada producto con nombre y precio. El precio debe ser un número entero de monedas (1 moneda = $100).");
    return;
  }

  const idProducto = generarId(nombreProducto);
  const idDestino = idLugarEditando || idProducto;

  db.collection("productos").doc(idDestino).set({
    nombre: nombreProducto,
    imagen: imagenProducto,
    opciones: opciones
  }).then(() => {
    alert(idLugarEditando ? "¡Lugar actualizado!" : "¡Lugar guardado! Ya debería verse en el modal de A comprar.");
    limpiarFormularioLugar();
    cargarProductosExistentes(); // refrescamos la lista de abajo
  }).catch((error) => {
    console.error("Error al guardar la tienda:", error.message);
    // Si esto falla con un error de "permisos" (permission-denied),
    // probablemente sea porque todavía no pegaste las reglas de
    // Firestore que te pasamos, o porque el email no coincide.
    alert("No se pudo guardar. Revisá la consola del navegador para más detalle.");
  });
});

// Bloquea o desbloquea el campo "Nombre del lugar".
// - bloqueado = true: el nombre solo se puede leer y aparece el botón "Actualizar nombre".
// - bloqueado = false: el nombre se puede escribir y el botón se oculta.
function bloquearNombreLugar(bloqueado) {
  // readOnly impide escribir, pero el valor igual se guarda con el formulario.
  inputNombreProducto.readOnly = bloqueado;
  // Esta clase cambia el aspecto del campo mientras está bloqueado.
  inputNombreProducto.classList.toggle("campo-bloqueado", bloqueado);
  // El botón solo se ve mientras el nombre está bloqueado.
  botonEditarNombreLugar.classList.toggle("oculto", !bloqueado);
}

// Al apretar "Actualizar nombre", recién ahí se puede cambiar el nombre.
botonEditarNombreLugar.addEventListener("click", () => {
  bloquearNombreLugar(false);
  // Se deja el cursor dentro del campo porque la persona pidió editarlo.
  inputNombreProducto.focus();
});

function limpiarFormularioLugar() {
  idLugarEditando = null;
  formNuevoProducto.reset();
  inputImagenProducto.value = "";
  previewImagenProducto.classList.add("oculto");
  previewImagenProducto.src = "";
  textoEstadoSubida.textContent = "Elige una foto desde tu computadora o celular. Se comprime y se sube automáticamente a Cloudinary al seleccionarla; no hace falta ningún paso más.";
  contenedorOpciones.innerHTML = "";
  agregarFilaOpcion();
  tituloFormLugar.textContent = "Agregar nuevo lugar de compra";
  botonGuardarProducto.textContent = "Guardar lugar";
  botonCancelarEdicion.classList.add("oculto");
  // Un lugar nuevo necesita poder escribirse; ya no se enfoca el campo solo.
  bloquearNombreLugar(false);
}

function cargarLugarEnFormulario(documento) {
  const datos = documento.data();

  idLugarEditando = documento.id;
  tituloFormLugar.textContent = "Editar lugar de compra";
  botonGuardarProducto.textContent = "Guardar cambios";
  botonCancelarEdicion.classList.remove("oculto");

  inputNombreProducto.value = datos.nombre || "";
  // Al editar, el nombre queda bloqueado hasta apretar "Actualizar nombre".
  bloquearNombreLugar(true);
  inputImagenProducto.value = datos.imagen || "";

  if (datos.imagen) {
    previewImagenProducto.src = datos.imagen;
    previewImagenProducto.classList.remove("oculto");
    textoEstadoSubida.textContent = "Imagen actual del lugar. Puedes reemplazarla si lo deseas.";
  } else {
    previewImagenProducto.classList.add("oculto");
    previewImagenProducto.src = "";
    textoEstadoSubida.textContent = "Este lugar no tiene imagen. Puedes subir una si deseas reemplazarla.";
  }

  contenedorOpciones.innerHTML = "";
  const opciones = Array.isArray(datos.opciones) ? datos.opciones : [];

  if (opciones.length === 0) {
    agregarFilaOpcion();
  } else {
    opciones.forEach((opcion) => agregarFilaOpcion(opcion));
  }

  // Se baja hasta el formulario, pero sin enfocar ningún campo.
  formNuevoProducto.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cargarLugarInicialParaEditar() {
  if (!idEditarInicial) {
    return;
  }

  db.collection("productos").doc(idEditarInicial).get().then((documento) => {
    if (!documento.exists) {
    alert("No se encontró el lugar que quieres editar.");
      return;
    }

    cargarLugarEnFormulario(documento);
  }).catch((error) => {
    console.error("Error al cargar el lugar para editar:", error.message);
    alert("No se pudo cargar el lugar para editar.");
  });
}

function crearAccionAgregarImagen() {
  const accion = document.createElement("span");
  accion.className = "miniatura-agregar-imagen-admin";
  accion.textContent = "Agregar imagen";
  return accion;
}

// -----------------------------------------------------------------
// 7) FUNCIÓN: mostrar los productos ya cargados, con botón de borrar
// -----------------------------------------------------------------
function cargarProductosExistentes() {
  db.collection("productos").get().then((coleccion) => {
    listaProductosAdmin.innerHTML = "";

    if (coleccion.empty) {
      listaProductosAdmin.innerHTML = "<p>Todavía no hay lugares cargados.</p>";
      return;
    }

    coleccion.forEach((documento) => {
      const datos = documento.data();

      const fila = document.createElement("div");
      fila.className = "tarjeta-producto-admin";

      const resumen = document.createElement("div");
      resumen.className = "resumen-producto-admin";

      const tieneImagen = typeof datos.imagen === "string" && datos.imagen.trim() !== "";
      let vistaImagen;

      if (tieneImagen) {
        vistaImagen = document.createElement("img");
        vistaImagen.className = "miniatura-producto-admin";
        vistaImagen.src = datos.imagen;
        vistaImagen.alt = datos.nombre;
        vistaImagen.onerror = () => {
          vistaImagen.replaceWith(crearAccionAgregarImagen());
        };
      } else {
        vistaImagen = crearAccionAgregarImagen();
      }

      const nombre = document.createElement("span");
      nombre.textContent = datos.nombre + " (" + datos.opciones.length + " productos)";

      resumen.appendChild(vistaImagen);
      resumen.appendChild(nombre);

      const botonEliminar = document.createElement("button");
      botonEliminar.type = "button";
      botonEliminar.textContent = "Eliminar";
      botonEliminar.className = "boton-quitar-fila";
      botonEliminar.addEventListener("click", () => {
        const confirmar = confirm("¿Seguro que quieres eliminar la tienda \"" + datos.nombre + "\"?");
        if (!confirmar) return;

        documento.ref.delete().then(() => {
          cargarProductosExistentes(); // refrescamos la lista
        });
      });

      const botonEditar = document.createElement("button");
      botonEditar.type = "button";
      botonEditar.textContent = "Editar";
      botonEditar.className = "boton-editar-fila";
      botonEditar.addEventListener("click", () => {
        cargarLugarEnFormulario(documento);
      });

      fila.appendChild(resumen);
      fila.appendChild(botonEditar);
      fila.appendChild(botonEliminar);
      listaProductosAdmin.appendChild(fila);
    });
  });
}

botonCancelarEdicion.addEventListener("click", limpiarFormularioLugar);

// Botón de engranaje junto al título "Lugares ya cargados".
const botonAjustesLugares = document.getElementById("boton-ajustes-lugares");
// Al apretarlo se muestran (o se vuelven a ocultar) los botones Editar y Eliminar.
botonAjustesLugares.addEventListener("click", () => {
  // Activa o desactiva el modo de gestión en la lista (el CSS muestra u oculta los botones).
  const activo = listaProductosAdmin.classList.toggle("modo-gestion");
  // Deja el engranaje con aspecto de "presionado" mientras los botones están visibles.
  botonAjustesLugares.classList.toggle("activo", activo);
  // Informa el estado a los lectores de pantalla.
  botonAjustesLugares.setAttribute("aria-pressed", String(activo));
  // Actualiza el texto de ayuda según el estado.
  const texto = activo ? "Ocultar botones de editar y eliminar" : "Mostrar botones de editar y eliminar";
  botonAjustesLugares.title = texto;
  botonAjustesLugares.setAttribute("aria-label", texto);
});

// -----------------------------------------------------------------
// 8) EL "CEREBRO" DE ESTA PÁGINA: revisa sesión Y email al cargar
// -----------------------------------------------------------------
auth.onAuthStateChanged((usuario) => {
  if (usuario && usuario.email === EMAIL_ADMIN) {
    // Es la cuenta admin: mostramos el panel de verdad.
    mensajeSinPermiso.classList.add("oculto");
    panelAdmin.classList.remove("oculto");
    infoAdminRoot.classList.remove("oculto");
    cargarProductosExistentes();
    cargarLugarInicialParaEditar();
  } else {
    // Cualquier otro caso (nadie logeado, o logeado con OTRA cuenta):
    // mostramos el mensaje y ocultamos el panel entero.
    mensajeSinPermiso.classList.remove("oculto");
    panelAdmin.classList.add("oculto");
    infoAdminRoot.classList.add("oculto");
  }
});
