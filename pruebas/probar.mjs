// Pruebas de navegador de Voltio (no se instala nada: puppeteer-core prestado del portafolio, Edge del sistema).
// Uso: node pruebas/probar.mjs [URL base | "local"] [carpeta-para-capturas]. Sin URL (o "local") sirve el repo él mismo.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const require = createRequire("C:/Users/User/OneDrive/Desktop/Portafolio Kilian/package.json");
const puppeteer = require("puppeteer-core");
let base = process.argv[2], servidor;
if (!base || base === "local") {
  const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
  const raiz = join(import.meta.dirname, "..");
  servidor = createServer(async (req, res) => {
    const ruta = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[\\/]+/, "") || "index.html";
    try {
      const datos = await readFile(join(raiz, ruta));
      res.writeHead(200, { "content-type": TIPOS[extname(ruta)] || "application/octet-stream" }).end(datos);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${servidor.address().port}`;
}
base = base.replace(/\/$/, "");
const capturas = process.argv[3];
const PAGINAS = ["index.html", "tienda.html", "producto.html?id=audifonos-pulso", "checkout.html", "confirmacion.html"];
const TAMANOS = [[1440, 900], [390, 844]];

let fallos = 0;
function ver(ok, texto) {
  console.log(`${ok ? "ok   " : "FALLA"} ${texto}`);
  if (!ok) fallos++;
}

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: ["--enable-unsafe-swiftshader"], // WebGL por software para la portada 3D
});

// Cada apertura usa un contexto nuevo: carrito vacío. `lento` simula un equipo de 2 núcleos.
async function abrir(w, h, { quieto = false, lento = false, ruta = "index.html", cdn = "", sinEsperar = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: quieto ? "reduce" : "no-preference" }]);
  await page.evaluateOnNewDocument((n) => {
    window.__cls = 0; // saltos de diseño acumulados desde la carga
    new PerformanceObserver((l) => l.getEntries().forEach((e) => e.hadRecentInput || (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => n });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  }, lento ? 2 : 8);
  const errores = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(String(e)));
  if (cdn) {
    // cdn: "caido" corta jsDelivr (Three.js); "lento" lo demora 3 s.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (!r.url().includes("cdn.jsdelivr.net")) return r.continue();
      if (cdn === "caido") return r.abort();
      setTimeout(() => r.continue().catch(() => {}), 3000);
    });
  }
  const carga = page.goto(`${base}/${ruta}`, { waitUntil: "networkidle0" });
  if (sinEsperar) carga.catch(() => {});
  else await carga;
  return { page, errores, cerrar: () => ctx.close() };
}

async function foto(page, nombre, opciones = {}) {
  if (capturas) await page.screenshot({ path: `${capturas}/${nombre}.png`, ...opciones });
}

// ---------- Tarea 1: marca nueva ----------
async function marca() {
  for (const ruta of PAGINAS) {
    for (const [w, h] of TAMANOS) {
      const { page, errores, cerrar } = await abrir(w, h, { ruta });
      const d = await page.evaluate(() => ({
        acc: getComputedStyle(document.documentElement).getPropertyValue("--acc").trim().toUpperCase(),
        boton: document.querySelector(".btn--blue") && getComputedStyle(document.querySelector(".btn--blue")).backgroundColor,
        tema: document.querySelector("meta[name=theme-color]")?.content.toUpperCase(),
      }));
      const en = `${ruta} ${w}px`;
      ver(errores.length === 0, `${en}: sin errores de consola ${errores.join(" | ")}`);
      ver(d.acc === "#C6FF3A", `${en}: --acc es lima (${d.acc})`);
      ver(d.boton === "rgb(198, 255, 58)", `${en}: botón principal lima (${d.boton})`);
      ver(d.tema === "#07080A", `${en}: theme-color (${d.tema})`);
      await foto(page, `${ruta.split(".")[0]}-${w}`);
      await cerrar();
    }
    const { page, cerrar } = await abrir(320, 640, { ruta });
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ver(sobra <= 0, `${ruta} 320px: sin desborde horizontal (${sobra}px)`);
    await cerrar();
  }
}

// ---------- Tarea 2: equipo lento ----------
async function equipoLento() {
  for (const [nombre, opciones, esperado] of [["normal", {}, false], ["2 núcleos", { lento: true }, true], ["movimiento reducido", { quieto: true }, true]]) {
    const { page, errores, cerrar } = await abrir(1440, 900, opciones);
    const d = await page.evaluate(() => ({
      html: document.documentElement.classList.contains("es-lento"),
      portada: document.getElementById("scrub").classList.contains("is-static"),
    }));
    ver(d.html === esperado && d.portada === esperado, `inicio ${nombre}: es-lento=${d.html}, portada fija=${d.portada} (esperado ${esperado})`);
    ver(errores.length === 0, `inicio ${nombre}: sin errores de consola ${errores.join(" | ")}`);
    await cerrar();
  }
}

// ---------- Tarea 3: bento ----------
const lum = (r, g, b) => [r, g, b].map((v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);

// Contraste real: se oculta el texto, se fotografía lo que queda debajo y se compara con el color del texto
// contra el 5 % más claro del fondo (peor caso de la foto).
async function contrasteBento(page, en) {
  await page.evaluate(async () => {
    document.getElementById("bento").scrollIntoView();
    await Promise.all([...document.querySelectorAll("#bento-grid img")].map((i) => ((i.loading = "eager"), i.decode().catch(() => {}))));
  });
  const textos = await page.evaluate(() => [...document.querySelectorAll("#bento-grid :is(.b-etq, .b-tit, .b-nombre, .b-precio, .b-num, .b-chips span)")].map((el) => {
    const rango = document.createRange();
    rango.selectNodeContents(el); // solo el texto, no el ancho del párrafo
    const r = rango.getBoundingClientRect();
    return { color: getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number), x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, texto: el.textContent.trim().slice(0, 28) };
  }));
  ver(textos.length >= 20, `${en}: hay textos del bento para medir (${textos.length})`);
  await page.addStyleTag({ content: "#bento-grid * { color: transparent !important; }" });
  let peor = { c: 99 };
  for (const t of textos) {
    const b64 = await page.screenshot({ encoding: "base64", clip: { x: t.x, y: t.y, width: t.width, height: t.height } });
    const fondo = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = new OffscreenCanvas(img.width, img.height).getContext("2d");
      c.drawImage(img, 0, 0);
      const d = c.getImageData(0, 0, img.width, img.height).data, claros = [];
      for (let i = 0; i < d.length; i += 4) claros.push([d[i], d[i + 1], d[i + 2]]);
      claros.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
      return claros[Math.floor(claros.length * 0.95)];
    }, b64);
    const c = (lum(...t.color) + 0.05) / (lum(...fondo) + 0.05);
    if (c < peor.c) peor = { c, texto: t.texto };
  }
  ver(peor.c >= 4.5, `${en}: contraste mínimo del texto del bento ${peor.c.toFixed(2)} ("${peor.texto}")`);
}

async function bento() {
  for (const [w, h, columnas] of [[1440, 900, 4], [390, 844, 1], [320, 640, 1]]) {
    const en = `bento ${w}px`;
    const { page, errores, cerrar } = await abrir(w, h, { quieto: true });
    const d = await page.evaluate(() => {
      const D = window.VOLTIO, n = new Intl.NumberFormat("es-CO");
      const tarjetas = [...document.querySelectorAll("#bento-grid .b-tarjeta")];
      const texto = (el) => el.textContent.replace(/\s+/g, " ").replace(/\$ /g, "$");
      return {
        orden: tarjetas.map((t) => t.dataset.orden).join(""),
        tamanos: tarjetas.map((t) => [...t.classList].find((c) => /^b-\dx\d$/.test(c))).join(" "),
        texto: texto(document.getElementById("bento-grid") || document.body),
        precios: D.bento ? D.bento.map((id) => { const t = document.querySelector(`#bento-grid .b-tarjeta:has(a[href="producto.html?id=${id}"])`); return !!t && texto(t).includes("$" + n.format(D.products.find((p) => p.id === id).price)); }) : [false],
        riel: !!document.getElementById("hero-rail"),
        repetidos: [...document.querySelectorAll("#best [data-add]")].filter((b) => (D.bento || []).includes(b.dataset.add)).length,
        mejores: document.querySelectorAll("#best .tile").length,
        columnas: document.getElementById("bento-grid") ? getComputedStyle(document.getElementById("bento-grid")).gridTemplateColumns.split(" ").length : 0,
        sobra: document.documentElement.scrollWidth - innerWidth,
      };
    });
    ver(d.orden === "1234567", `${en}: 7 tarjetas en orden (${d.orden})`);
    ver(d.tamanos === "b-2x2 b-1x2 b-1x1 b-1x1 b-2x1 b-1x1 b-1x1", `${en}: tamaños (${d.tamanos})`);
    for (const frase of ["Silencio total. 40 horas.", "30 h de música", "Halo 15 W", "$200.000", "Nequi", "PSE", "Tarjeta", "Contraentrega", "6 meses en todo", "Más vendido"]) ver(d.texto.includes(frase), `${en}: dice "${frase}"`);
    ver(d.precios.length === 4 && d.precios.every(Boolean), `${en}: precios de los 4 productos salen de los datos (${d.precios})`);
    ver(!d.riel, `${en}: ya no existe #hero-rail`);
    ver(d.mejores === 4 && d.repetidos === 0, `${en}: "lo más vendido" tiene 4 y no repite el bento (${d.mejores}, repetidos ${d.repetidos})`);
    ver(d.columnas === columnas, `${en}: rejilla de ${columnas} columnas (${d.columnas})`);
    ver(d.sobra <= 0, `${en}: sin desborde horizontal (${d.sobra}px)`);
    ver(errores.length === 0, `${en}: sin errores de consola ${errores.join(" | ")}`);
    if (d.orden) {
      await page.evaluate(() => document.getElementById("bento").scrollIntoView());
      const caja = await page.evaluate(() => { const r = document.getElementById("bento").getBoundingClientRect(); return { x: 0, y: r.y + scrollY, width: innerWidth, height: r.height }; });
      await foto(page, `bento-${w}`, { clip: caja });
      await contrasteBento(page, en);
    }
    await cerrar();
  }
  // Agregar desde el bento, con animaciones activas (a mitad de animación se prueba en scrubBento).
  for (const [w, h] of TAMANOS) {
    const { page, cerrar } = await abrir(w, h);
    const boton = await page.$('#bento-grid [data-add="audifonos-pulso"]');
    if (boton) {
      // Primero se lleva el scroll hasta el botón y se espera el cuadro: la posición del botón depende del scroll.
      await page.evaluate(async () => {
        document.querySelector('#bento-grid [data-add="audifonos-pulso"]').scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      });
      await boton.click();
    }
    const d = await page.evaluate(() => ({
      cuenta: document.querySelector("[data-cart-count]").textContent,
      carrito: JSON.parse(localStorage.getItem("voltio-cart") || "[]").map((l) => l.id + "×" + l.qty).join(),
      abierto: document.getElementById("cart-drawer").open,
    }));
    ver(d.cuenta === "1" && d.carrito === "audifonos-pulso×1" && d.abierto, `bento ${w}px: "Agregar" agrega Pulso y abre el carrito (${d.cuenta}, ${d.carrito}, abierto=${d.abierto})`);
    await cerrar();
  }
}

// ---------- Tarea 4: el bento se arma con el scroll ----------
// Va a una posición de scroll y espera dos cuadros para que las animaciones ligadas al scroll se actualicen.
const irA = (page, y) => page.evaluate(async (y) => {
  scrollTo({ top: y, behavior: "instant" });
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
}, y);
// Opacidad y distancia (px) de cada tarjeta a su celda de la rejilla; animaciones activas sobre las tarjetas.
const estadoBento = (page) => page.evaluate(() => {
  const tarjetas = [...document.querySelectorAll("#bento-grid .b-tarjeta")];
  const ahora = tarjetas.map((t) => ({ o: +getComputedStyle(t).opacity, r: t.getBoundingClientRect() }));
  const animadas = document.getAnimations().filter((a) => a.effect?.target?.classList.contains("b-tarjeta") && a.playState !== "paused").length;
  tarjetas.forEach((t) => (t.style.animation = "none"));
  const d = ahora.map((e, i) => { const c = tarjetas[i].getBoundingClientRect(); return { o: e.o, lejos: Math.max(Math.abs(e.r.x - c.x), Math.abs(e.r.y - c.y), Math.abs(e.r.width - c.width), Math.abs(e.r.height - c.height)) }; });
  tarjetas.forEach((t) => (t.style.animation = ""));
  return { tarjetas: d, animadas, techo: document.querySelector(".bento-sec__esc").getBoundingClientRect().top };
});
const armado = (e) => e.tarjetas.length === 7 && e.tarjetas.every((t) => t.o === 1 && t.lejos <= 2);

async function scrubBento() {
  for (const [w, h] of TAMANOS) {
    const en = `scrub ${w}px`;
    const { page, errores, cerrar } = await abrir(w, h);
    const m = await page.evaluate(() => { const b = document.getElementById("bento"); const y = b.getBoundingClientRect().top + scrollY; return { inicio: y, fin: y + b.offsetHeight - innerHeight }; });
    await irA(page, m.inicio);
    let e = await estadoBento(page);
    ver(e.tarjetas[6].o < 0.5 || e.tarjetas[6].lejos > 2, `${en}: al inicio la tarjeta 7 aún no está en su lugar (opacidad ${e.tarjetas[6].o}, a ${Math.round(e.tarjetas[6].lejos)} px)`);
    await foto(page, `scrub-${w}-0`);
    await irA(page, (m.inicio + m.fin) / 2);
    e = await estadoBento(page);
    if (w >= 1024) ver(Math.abs(e.techo) <= 1, `${en}: el escenario queda fijo a mitad del recorrido (top ${e.techo})`);
    await foto(page, `scrub-${w}-50`);
    await irA(page, m.inicio + (m.fin - m.inicio) * 0.25);
    await foto(page, `scrub-${w}-25`);
    await irA(page, m.fin);
    e = await estadoBento(page);
    ver(armado(e), `${en}: al final las 7 están visibles y en su celda (${e.tarjetas.map((t) => `${t.o}/${Math.round(t.lejos)}`).join(" ")})`);
    await foto(page, `scrub-${w}-100`);
    // Volver hacia arriba desarma, y bajar de nuevo rearma igual.
    await irA(page, m.inicio);
    const arriba = await estadoBento(page);
    await irA(page, m.fin);
    ver(!armado(arriba) && armado(await estadoBento(page)), `${en}: al subir se desarma y al bajar se rearma completo`);

    // Clic en "Agregar" con la tarjeta de Pulso a mitad de su animación.
    const boton = await page.$('#bento-grid [data-add="audifonos-pulso"]');
    let medio = null;
    for (let y = m.inicio - h; y < m.fin && !medio; y += 40) {
      await irA(page, y);
      const t = (await estadoBento(page)).tarjetas[0];
      await irA(page, y); // estadoBento reinicia las animaciones al medir: esperar a que vuelvan a su punto
      const caja = await boton.boundingBox();
      if (t.o > 0.2 && t.lejos > 2 && caja && caja.y > 130 && caja.y + caja.height < h) medio = { ...caja, o: t.o, lejos: t.lejos };
    }
    ver(!!medio, `${en}: se encontró un punto con Pulso a mitad de animación ${medio ? `(opacidad ${medio.o.toFixed(2)}, a ${Math.round(medio.lejos)} px)` : ""}`);
    if (medio) {
      await page.mouse.click(medio.x + medio.width / 2, medio.y + medio.height / 2);
      const cuenta = await page.evaluate(() => document.querySelector("[data-cart-count]").textContent);
      ver(cuenta === "1", `${en}: clic en "Agregar" a mitad de la animación agrega (${cuenta})`);
    }
    ver(errores.length === 0, `${en}: sin errores de consola ${errores.join(" | ")}`);
    await cerrar();

    // Versión quieta: armado desde el principio y sin animaciones.
    for (const [nombre, opciones] of [["movimiento reducido", { quieto: true }], ["2 núcleos", { lento: true }]]) {
      const q = await abrir(w, h, opciones);
      const y = await q.page.evaluate(() => document.getElementById("bento").getBoundingClientRect().top + scrollY);
      await irA(q.page, y - h / 2);
      const e1 = await estadoBento(q.page);
      await irA(q.page, y);
      const e2 = await estadoBento(q.page);
      ver(armado(e1) && armado(e2) && e2.animadas === 0, `${en} ${nombre}: bento armado desde el principio y sin animaciones (${e2.animadas} activas)`);
      await q.cerrar();
    }
  }
}

// Recorrer todo el inicio con CPU 4× más lenta: ninguna tarea larga > 200 ms.
async function tareasLargas() {
  for (const [w, h] of TAMANOS) {
    const { page, cerrar } = await abrir(w, h);
    await page.emulateCPUThrottling(4);
    const peor = await page.evaluate(async () => {
      let peor = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (peor = Math.max(peor, e.duration)))).observe({ type: "longtask" });
      const fin = document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; y < fin; y += 120) { scrollTo({ top: y, behavior: "instant" }); await new Promise((ok) => setTimeout(ok, 30)); }
      await new Promise((ok) => setTimeout(ok, 300));
      // Autocomprobación: un bloqueo a propósito tiene que aparecer, o el medidor no mide nada.
      const medido = peor;
      peor = 0;
      for (const t = performance.now(); performance.now() - t < 120;);
      await new Promise((ok) => setTimeout(ok, 300));
      return { peor: Math.round(medido), mide: peor >= 100 };
    }).then((r) => (ver(r.mide, `tareas largas ${w}px: el medidor detecta un bloqueo de prueba`), r.peor));
    ver(peor <= 200, `tareas largas ${w}px con CPU 4×: la peor dura ${peor} ms (máx. 200)`);
    await cerrar();
  }
}

// ---------- Revisión final: casos fuera del camino feliz ----------
// Píxeles claros dentro de un recorte de la pantalla (para saber si el canvas 3D está pintado).
async function claros(page, clip) {
  const b64 = await page.screenshot({ encoding: "base64", clip });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height).getContext("2d");
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 300) n++;
    return n;
  }, b64);
}
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function revision() {
  // Portada fija (equipo lento): el producto 3D sigue dibujado después de cambiar el tamaño de la ventana.
  {
    const { page, cerrar } = await abrir(390, 844, { lento: true });
    const caja = () => page.$eval(".scrub__canvas", (c) => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const antes = await claros(page, await caja());
    await page.setViewport({ width: 390, height: 760 });
    await pausa(400);
    const despues = await claros(page, await caja());
    ver(antes > 2000 && despues > 2000, `portada fija: el 3D sigue dibujado tras redimensionar (píxeles claros ${antes} → ${despues})`);
    await cerrar();
  }
  // Recargar a mitad del bento deja al usuario en el bento.
  {
    const { page, cerrar } = await abrir(1440, 900);
    const m = await page.evaluate(() => { const b = document.getElementById("bento"); const y = b.getBoundingClientRect().top + scrollY; return { inicio: y, fin: y + b.offsetHeight - innerHeight }; });
    await irA(page, (m.inicio + m.fin) / 2);
    await pausa(300);
    await page.reload({ waitUntil: "networkidle0" });
    await pausa(300);
    const d = await page.evaluate(() => { const r = document.getElementById("bento").getBoundingClientRect(); return { dentro: r.top <= 1 && r.bottom >= innerHeight - 1, y: Math.round(scrollY) }; });
    ver(d.dentro, `recarga a mitad del bento: sigue dentro del bento (scroll ${d.y}, bento ${Math.round(m.inicio)}–${Math.round(m.fin)})`);
    await cerrar();
  }
  // El foco de teclado nunca cae en una tarjeta invisible.
  {
    const { page, cerrar } = await abrir(1440, 900);
    await irA(page, await page.evaluate(() => document.getElementById("bento").getBoundingClientRect().top + scrollY));
    const o = await page.evaluate(async () => {
      const t = document.querySelector('.b-tarjeta[data-orden="7"]');
      t.querySelector("a").focus({ preventScroll: true });
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      return +getComputedStyle(t).opacity;
    });
    ver(o === 1, `foco de teclado en la tarjeta 7 al inicio del recorrido: se ve (opacidad ${o})`);
    await cerrar();
  }
  // Portátil corriente (1366×768 deja ~650 px de alto): escenario fijo y nada recortado.
  {
    const { page, cerrar } = await abrir(1366, 650);
    const m = await page.evaluate(() => { const b = document.getElementById("bento"); const y = b.getBoundingClientRect().top + scrollY; return { inicio: y, fin: y + b.offsetHeight - innerHeight }; });
    await irA(page, (m.inicio + m.fin) / 2);
    const medio = await estadoBento(page);
    await irA(page, m.fin);
    const fin = await estadoBento(page);
    const d = await page.evaluate(() => ({
      recortadas: [...document.querySelectorAll(".b-tarjeta")].filter((t) => t.scrollHeight > t.clientHeight + 1).map((t) => t.dataset.orden).join(),
      cabe: document.getElementById("bento-grid").getBoundingClientRect().bottom <= innerHeight,
    }));
    ver(Math.abs(medio.techo) <= 1 && armado(fin), `portátil 1366×650: escenario fijo (top ${medio.techo}) y bento armado al final`);
    ver(d.recortadas === "" && d.cabe, `portátil 1366×650: ninguna tarjeta recorta su contenido (${d.recortadas || "ninguna"}) y la rejilla cabe en pantalla (${d.cabe})`);
    await foto(page, "bento-portatil-1366x650");
    await cerrar();
  }
  // Equipo lento: versión quieta de verdad, sin ninguna animación de entrada.
  {
    const { page, cerrar } = await abrir(1440, 900, { lento: true });
    const n = await page.evaluate(() => document.getAnimations().map((a) => a.animationName || "transición").join(", "));
    ver(n === "", `equipo lento: ninguna animación activa en el inicio (${n || "ninguna"})`);
    await cerrar();
  }
  // Three.js por CDN lento: la tienda (cabecera y bento) no espera al 3D.
  {
    const { page, cerrar } = await abrir(1440, 900, { cdn: "lento", sinEsperar: true });
    await pausa(1500);
    const d = await page.evaluate(() => ({ cabecera: !!document.querySelector("#site-header .wordmark"), tarjetas: document.querySelectorAll("#bento-grid .b-tarjeta").length })).catch(() => ({}));
    ver(d.cabecera && d.tarjetas === 7, `CDN lento: a 1,5 s ya hay cabecera y bento (cabecera ${d.cabecera}, tarjetas ${d.tarjetas})`);
    await cerrar();
  }
  // Three.js caído: portada fija con precio y botón a la vista, bento armado.
  {
    const { page, cerrar } = await abrir(1440, 900, { cdn: "caido" });
    const d = await page.evaluate(() => ({
      fija: document.getElementById("scrub").classList.contains("is-static"),
      boton: +getComputedStyle(document.querySelector('#scrub [data-add]').closest(".scrub__chapter")).opacity,
      alto: Math.round(document.getElementById("scrub").offsetHeight / innerHeight * 10) / 10,
    }));
    ver(d.fija && d.boton === 1 && d.alto < 2, `CDN caído: portada fija con el botón de compra visible (fija ${d.fija}, opacidad ${d.boton}, alto ${d.alto} pantallas)`);
    await cerrar();
  }
  // La cabecera la pinta el JS: no debe empujar la página al aparecer.
  for (const [w, h] of [[412, 823], [1440, 900]]) {
    const { page, cerrar } = await abrir(w, h);
    await pausa(500);
    const cls = await page.evaluate(() => window.__cls);
    ver(cls < 0.05, `inicio ${w}px: sin saltos de diseño al cargar (CLS ${cls.toFixed(3)})`);
    await cerrar();
  }
  // El ícono de la pestaña también es de la marca nueva.
  {
    const svg = await (await fetch(`${base}/assets/img/favicon.svg`)).text();
    ver(/c6ff3a/i.test(svg) && !/2453e6/i.test(svg), "favicon: lima, sin el azul viejo");
  }
}

// ---------- Tarea 5: resortes, demo y flujo de compra ----------
async function resortes() {
  for (const ruta of PAGINAS) {
    const { page, cerrar } = await abrir(1440, 900, { ruta });
    const d = await page.evaluate(() => {
      const R = "cubic-bezier(0.34, 1.56, 0.64, 1)";
      const els = [...document.querySelectorAll(".btn, .tile, .cat-row, .combo, .chip, .charge-btn, .icon-btn, .b-tarjeta")];
      return {
        n: els.length,
        sin: [...new Set(els.filter((e) => !getComputedStyle(e).transitionTimingFunction.includes(R)).map((e) => e.className.split(" ")[0]))].join(", "),
        pie: document.querySelector(".signature")?.textContent.includes("Diseñado y desarrollado por Kilian Vega"),
        demo: document.querySelector(".demo-strip")?.textContent.includes("demostración"),
      };
    });
    ver(d.n > 0 && d.sin === "", `${ruta}: los ${d.n} elementos interactivos usan la curva de resorte (sin ella: ${d.sin || "ninguno"})`);
    ver(d.pie && d.demo, `${ruta}: sigue marcada como demo (pie con Kilian Vega: ${d.pie}, franja de demostración: ${d.demo})`);
    await cerrar();
  }
}

async function flujo() {
  const { page, errores, cerrar } = await abrir(1440, 900, { ruta: "tienda.html" });
  await page.click('#shop-grid [data-add="teclado-sesenta"]');
  await page.click("#cart-button");
  await page.waitForSelector("#cart-drawer[open]");
  await pausa(600); // el carrito entra deslizándose
  const waCarrito = await page.$eval('#drawer-foot a[href*="wa.me"]', (a) => decodeURIComponent(a.href));
  ver(waCarrito.includes("[Demo Voltio]") && waCarrito.includes("Teclado mecánico Sesenta"), `flujo: el pedido por WhatsApp del carrito lleva "[Demo Voltio]" y el producto`);
  await Promise.all([page.waitForNavigation(), page.click('#drawer-foot a[href="checkout.html"]')]);
  ver(page.url().includes("checkout.html"), `flujo: del carrito se llega al checkout (${page.url()})`);
  const waPago = await page.$eval('#site-footer a[href*="wa.me"]', (a) => decodeURIComponent(a.href));
  ver(waPago.includes("[Demo Voltio]"), `flujo: el WhatsApp del checkout lleva "[Demo Voltio]"`);
  await page.type("#f-nombre", "Ana Pérez");
  await page.type("#f-celular", "3001234567");
  await page.evaluate(() => { const d = document.getElementById("f-departamento"); d.value = [...d.options].find((o) => o.value).value; d.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.type("#f-ciudad", "Villavicencio");
  await page.type("#f-direccion", "Calle 38 # 30-15");
  ver(await page.$eval("input[name=metodo]:checked", (r) => r.value === "contraentrega"), "flujo: contraentrega es el método elegido");
  await Promise.all([page.waitForNavigation({ timeout: 10000 }), page.click("#pay-btn")]);
  const d = await page.evaluate(() => ({
    url: location.href,
    titulo: document.querySelector(".confirm__title")?.textContent || "",
    wa: decodeURIComponent(document.querySelector('.confirm__actions a[href*="wa.me"]')?.href || ""),
    carrito: localStorage.getItem("voltio-cart"),
  }));
  ver(/confirmacion\.html\?pedido=VT-/.test(d.url) && d.titulo.includes("Ana"), `flujo: confirmación del pedido (${d.url.split("/").pop()}, "${d.titulo}")`);
  ver(d.wa.includes("[Demo Voltio]") && d.wa.includes("Contraentrega"), `flujo: el WhatsApp de la confirmación lleva "[Demo Voltio]" y el pago`);
  ver(d.carrito === "[]", `flujo: el carrito queda vacío tras el pedido (${d.carrito})`);
  ver(errores.length === 0, `flujo: sin errores de consola ${errores.join(" | ")}`);
  await foto(page, "confirmacion-pedido-1440");
  await cerrar();
}

try {
  await marca();
  await equipoLento();
  await bento();
  await scrubBento();
  await tareasLargas();
  await resortes();
  await flujo();
  await revision();
} finally {
  await browser.close();
  servidor?.close();
}
console.log(fallos ? `\n${fallos} fallas` : "\nTodo OK");
process.exit(fallos ? 1 : 0);
