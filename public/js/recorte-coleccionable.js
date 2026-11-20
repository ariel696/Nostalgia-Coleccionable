// ---------------------------------------------------------------
// Recorte circular para tazos (y cualquier coleccionable redondo).
// Muchas fotos de tazos traen una "hoja" blanca (a veces torcida) alrededor
// del círculo. Aquí se busca el círculo exacto del tazo y se recorta la
// imagen a ese círculo, así al girarla solo se mueve el tazo.
// ---------------------------------------------------------------

// ¿Este píxel es "fondo"? (transparente o blanco/crema/gris muy claro)
function esPixelFondo(d, i) {
  if (d[i + 3] < 128) return true;
  const mn = Math.min(d[i], d[i + 1], d[i + 2]);
  const mx = Math.max(d[i], d[i + 1], d[i + 2]);
  return mn >= 215 && (mx - mn) <= 30;
}

// Aprende cómo es el fondo de ESTA imagen mirando sus bordes (en vez de suponer
// que siempre es blanco). Sirve para fondos celestes, degradados, grises, etc.
// Devuelve una lista de 0/1 (una por píxel): 1 = fondo, o null si no se pudo aprender.
// Cómo funciona:
//   1) Mira el marco de píxeles del borde de la imagen y anota qué colores hay (paleta).
//   2) Parte desde el borde y se "expande" por todos los píxeles parecidos a esa paleta
//      que estén conectados con el borde. Lo que queda sin tocar es la figura.
function calcularMascaraFondoPorBordes(d, w, h) {
  const grosor = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  // Recorre el marco del borde y cuenta los colores (agrupados de 16 en 16 por canal).
  const cuentas = new Map();
  let total = 0;
  const anotar = (p) => {
    const i = p * 4;
    if (d[i + 3] < 128) return;
    const clave = (d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4);
    const e = cuentas.get(clave) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
    cuentas.set(clave, e);
    total++;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < grosor || y < grosor || x >= w - grosor || y >= h - grosor) anotar(y * w + x);
    }
  }
  if (total === 0) return null;
  // Paleta: los colores que ocupan al menos el 2% del marco (su promedio exacto).
  const paleta = [];
  cuentas.forEach((e) => {
    if (e.n >= total * 0.02) paleta.push([e.r / e.n, e.g / e.n, e.b / e.n]);
  });
  if (!paleta.length) return null;
  // Un píxel "se parece al fondo" si está cerca de algún color de la paleta.
  const TOL = 34;
  const parece = (p) => {
    const i = p * 4;
    if (d[i + 3] < 128) return true;
    for (let k = 0; k < paleta.length; k++) {
      const c = paleta[k];
      if (Math.abs(d[i] - c[0]) <= TOL && Math.abs(d[i + 1] - c[1]) <= TOL && Math.abs(d[i + 2] - c[2]) <= TOL) return true;
    }
    return false;
  };
  // Expansión desde el borde (relleno por inundación, sin recursión).
  const fondo = new Uint8Array(w * h);
  const cola = new Int32Array(w * h);
  let ini = 0, fin = 0;
  const meter = (p) => {
    if (fondo[p] || !parece(p)) return;
    fondo[p] = 1;
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
  // Si casi no se encontró fondo, o se "comió" casi toda la imagen, no sirve.
  if (fin < w * h * 0.03 || fin > w * h * 0.97) return null;
  return fondo;
}

// Busca un círculo en los datos de una imagen (RGBA). Devuelve {cx, cy, r}
// o null si la figura no es redonda. No toca el DOM (se puede probar aparte).
// Hace hasta 2 intentos:
//   1) Fondo blanco/crema/gris claro (lo de siempre, rápido).
//   2) Si falla, aprende el color del fondo desde los bordes (fondos celestes, degradados...).
function detectarCirculoColeccionable(d, w, h) {
  const primero = detectarCirculoConFondo(d, w, h, (i) => esPixelFondo(d, i));
  if (primero) return primero;
  const mascara = calcularMascaraFondoPorBordes(d, w, h);
  if (!mascara) return null;
  return detectarCirculoConFondo(d, w, h, (i) => mascara[i >> 2] === 1);
}

// Núcleo del detector: igual que antes, pero recibe una función esFondo(i) que dice
// si el píxel que empieza en la posición i (de la lista RGBA) es fondo o no.
function detectarCirculoConFondo(d, w, h, esFondo) {
  // 1) Centro aproximado: el promedio de todo lo que NO es fondo.
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!esFondo((y * w + x) * 4)) { sx += x; sy += y; n++; }
    }
  }
  if (n < w * h * 0.03) return null;
  const c0x = sx / n, c0y = sy / n;

  // 2) Lanza rayos desde el centro hacia afuera y, para cada uno, busca desde
  //    el borde de la imagen hacia adentro el primer tramo que no es fondo:
  //    ese es un punto del contorno.
  const RAYOS = 240;
  const puntos = [];
  for (let k = 0; k < RAYOS; k++) {
    const ang = (k / RAYOS) * Math.PI * 2;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let rMax = 0;
    while (true) {
      const x = Math.round(c0x + dx * (rMax + 1)), y = Math.round(c0y + dy * (rMax + 1));
      if (x < 0 || y < 0 || x >= w || y >= h) break;
      rMax++;
    }
    let seguidos = 0;
    for (let r = rMax; r >= 0; r--) {
      const x = Math.round(c0x + dx * r), y = Math.round(c0y + dy * r);
      if (!esFondo((y * w + x) * 4)) {
        seguidos++;
        if (seguidos >= 3) { puntos.push([c0x + dx * (r + 2), c0y + dy * (r + 2)]); break; }
      } else {
        seguidos = 0;
      }
    }
  }
  if (puntos.length < RAYOS * 0.6) return null;

  // 3) Ajusta el círculo ignorando puntos sueltos (RANSAC) y lo afina
  //    con mínimos cuadrados usando solo los puntos que le calzan.
  let semilla = 12345;
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };

  const circuloDe3 = (a, b, c) => {
    const det = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(det) < 1e-6) return null;
    const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
    const cx = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / det;
    const cy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / det;
    return { cx, cy, r: Math.hypot(a[0] - cx, a[1] - cy) };
  };
  const contar = (c, tol) => {
    let k = 0;
    for (const p of puntos) if (Math.abs(Math.hypot(p[0] - c.cx, p[1] - c.cy) - c.r) <= tol) k++;
    return k;
  };
  const minR = Math.min(w, h) * 0.2, maxR = Math.max(w, h) * 0.75;

  let mejor = null, mejorN = 0;
  for (let it = 0; it < 400; it++) {
    const a = puntos[Math.floor(azar() * puntos.length)];
    const b = puntos[Math.floor(azar() * puntos.length)];
    const c = puntos[Math.floor(azar() * puntos.length)];
    const circ = circuloDe3(a, b, c);
    if (!circ || circ.r < minR || circ.r > maxR) continue;
    const q = contar(circ, Math.max(1.5, circ.r * 0.015));
    if (q > mejorN) { mejorN = q; mejor = circ; }
  }
  if (!mejor) return null;

  // Afinado (Kåsa): resuelve x²+y² + A·x + B·y + C = 0 con los puntos que calzan.
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    const tol = Math.max(1.5, mejor.r * 0.015);
    const ok = puntos.filter((p) => Math.abs(Math.hypot(p[0] - mejor.cx, p[1] - mejor.cy) - mejor.r) <= tol * 1.5);
    if (ok.length < 8) break;
    let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sz = 0, Sxz = 0, Syz = 0;
    for (const [x, y] of ok) {
      const z = x * x + y * y;
      Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; Sz += z; Sxz += x * z; Syz += y * z;
    }
    const m = ok.length;
    // Sistema 3x3:  [Sxx Sxy Sx; Sxy Syy Sy; Sx Sy m] · [A B C] = -[Sxz Syz Sz]
    const M = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, m]];
    const v = [-Sxz, -Syz, -Sz];
    const det3 = (a) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
      - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
      + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
    const D = det3(M);
    if (Math.abs(D) < 1e-9) break;
    const col = (j) => M.map((fila, i) => fila.map((val, jj) => (jj === j ? v[i] : val)));
    const A = det3(col(0)) / D, B = det3(col(1)) / D, C = det3(col(2)) / D;
    const cx = -A / 2, cy = -B / 2;
    const r2 = cx * cx + cy * cy - C;
    if (r2 <= 0) break;
    mejor = { cx, cy, r: Math.sqrt(r2) };
  }

  // 4) Solo vale si la mayoría del contorno es realmente un círculo.
  const inliers = contar(mejor, Math.max(2, mejor.r * 0.02));
  if (inliers < puntos.length * 0.6) return null;
  if (mejor.r < minR || mejor.r > maxR) return null;
  return mejor;
}

// Recorta la imagen (ya dibujada en `canvas`) al círculo encontrado:
// deja un canvas cuadrado del tamaño justo del tazo, con todo lo de afuera
// transparente (borde suavizado de ~1px).
function recortarCanvasACirculo(canvas, circulo) {
  const lado = Math.ceil(circulo.r * 2) + 2;
  const ox = Math.round(circulo.cx - lado / 2);
  const oy = Math.round(circulo.cy - lado / 2);
  const salida = document.createElement("canvas");
  salida.width = lado;
  salida.height = lado;
  const ctx = salida.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, ox, oy, lado, lado, 0, 0, lado, lado);
  const datos = ctx.getImageData(0, 0, lado, lado);
  const d = datos.data;
  const cx = circulo.cx - ox, cy = circulo.cy - oy;
  const radio = circulo.r - 0.5; // medio píxel hacia adentro: no queda aro blanco
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cobertura = Math.min(1, Math.max(0, radio - dist + 0.5));
      if (cobertura < 1) {
        const i = (y * lado + x) * 4 + 3;
        d[i] = Math.round(d[i] * cobertura);
      }
    }
  }
  ctx.putImageData(datos, 0, 0);
  return salida;
}

// Versión lista para usar: recibe la URL de una imagen y devuelve (en una promesa)
// la URL de la imagen recortada al círculo del tazo. Si la imagen no es redonda,
// no se puede leer (CORS) o falla algo, devuelve la URL original sin tocarla.
const CACHE_RECORTE_CIRCULAR = new Map();
function recortarCirculoImagen(url) {
  if (!url) return Promise.resolve(url);
  if (CACHE_RECORTE_CIRCULAR.has(url)) return CACHE_RECORTE_CIRCULAR.get(url);
  const promesa = new Promise((resolve) => {
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
        const circulo = detectarCirculoColeccionable(ctx.getImageData(0, 0, w, h).data, w, h);
        resolve(circulo ? recortarCanvasACirculo(canvas, circulo).toDataURL("image/png") : url);
      } catch (error) {
        resolve(url);
      }
    };
    img.src = url;
  });
  CACHE_RECORTE_CIRCULAR.set(url, promesa);
  return promesa;
}
