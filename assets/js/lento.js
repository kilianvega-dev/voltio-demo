// Equipo lento: se le muestra la versión quieta (portada fija, bento ya armado, sin animaciones de entrada).
// Script clásico en el <head> de cada página: pone la clase antes del primer pintado, sin esperar a Three.js.
function esLento({ reduce, webgl, nucleos, memoria }) {
  return reduce || !webgl || nucleos <= 4 || memoria <= 4; // memoria undefined (Safari, Firefox) no cuenta
}

if (typeof document !== "undefined") {
  const gl = document.createElement("canvas").getContext("webgl");
  gl?.getExtension("WEBGL_lose_context")?.loseContext(); // no gastar un contexto solo por preguntar
  const lento = esLento({
    reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: !!gl,
    nucleos: navigator.hardwareConcurrency,
    memoria: navigator.deviceMemory,
  });
  // es-fluido enciende las animaciones ligadas al scroll; sin esta clase el sitio queda quieto y armado.
  document.documentElement.classList.add(lento ? "es-lento" : "es-fluido");
}
if (typeof module !== "undefined") module.exports = { esLento }; // para pruebas/lento.test.mjs
