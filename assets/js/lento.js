// Equipo lento: se le muestra la versión quieta (portada fija, bento ya armado).
export function esLento({ reduce, webgl, nucleos, memoria }) {
  return reduce || !webgl || nucleos <= 4 || memoria <= 4; // memoria undefined (Safari, Firefox) no cuenta
}

export function detectar() {
  const gl = document.createElement("canvas").getContext("webgl");
  gl?.getExtension("WEBGL_lose_context")?.loseContext(); // no gastar un contexto solo por preguntar
  const lento = esLento({
    reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: !!gl,
    nucleos: navigator.hardwareConcurrency,
    memoria: navigator.deviceMemory,
  });
  document.documentElement.classList.toggle("es-lento", lento);
  return lento;
}
