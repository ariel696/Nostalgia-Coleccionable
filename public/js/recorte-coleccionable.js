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

// Busca un círculo en los datos de una imagen (RGBA). Devuelve {cx, cy, r}
// o null si la figura no es redonda. No toca el DOM (se puede probar aparte).
function detectarCirculoColeccionable(d, w, h) {
  // 1) Centro aproximado: el promedio de todo lo que NO es fondo.
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!esPixelFondo(d, (y * w + x) * 4)) { sx += x; sy += y; n++; }
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
      if (!esPixelFondo(d, (y * w + x) * 4)) {
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
