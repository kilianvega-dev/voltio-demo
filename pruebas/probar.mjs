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
async function abrir(w, h, { quieto = false, lento = false, ruta = "index.html" } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: quieto ? "reduce" : "no-preference" }]);
  await page.evaluateOnNewDocument((n) => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => n });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  }, lento ? 2 : 8);
  const errores = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(String(e)));
  await page.goto(`${base}/${ruta}`, { waitUntil: "networkidle0" });
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
  // Agregar desde el bento, con animaciones activas.
  for (const [w, h] of TAMANOS) {
    const { page, cerrar } = await abrir(w, h);
    const boton = await page.$('#bento-grid [data-add="audifonos-pulso"]');
    if (boton) await boton.click();
    const d = await page.evaluate(() => ({
      cuenta: document.querySelector("[data-cart-count]").textContent,
      carrito: JSON.parse(localStorage.getItem("voltio-cart") || "[]").map((l) => l.id + "×" + l.qty).join(),
      abierto: document.getElementById("cart-drawer").open,
    }));
    ver(d.cuenta === "1" && d.carrito === "audifonos-pulso×1" && d.abierto, `bento ${w}px: "Agregar" agrega Pulso y abre el carrito (${d.cuenta}, ${d.carrito}, abierto=${d.abierto})`);
    await cerrar();
  }
}

try {
  await marca();
  await equipoLento();
  await bento();
} finally {
  await browser.close();
  servidor?.close();
}
console.log(fallos ? `\n${fallos} fallas` : "\nTodo OK");
process.exit(fallos ? 1 : 0);
