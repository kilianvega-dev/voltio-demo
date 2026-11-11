// Pruebas de navegador de Voltio (no se instala nada: puppeteer-core prestado del portafolio, Edge del sistema).
// Uso: python -m http.server 4350   y   node pruebas/probar.mjs http://localhost:4350 [carpeta-para-capturas]
import { createRequire } from "node:module";

const require = createRequire("C:/Users/User/OneDrive/Desktop/Portafolio Kilian/package.json");
const puppeteer = require("puppeteer-core");
const base = (process.argv[2] || "http://localhost:4350").replace(/\/$/, "");
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

try {
  await marca();
  await equipoLento();
} finally {
  await browser.close();
}
console.log(fallos ? `\n${fallos} fallas` : "\nTodo OK");
process.exit(fallos ? 1 : 0);
