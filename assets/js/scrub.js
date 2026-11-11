// Portada con scroll scrubbing: el estuche de los Earbuds Órbita se abre y los audífonos salen mientras bajas.
// Se dibuja en vivo con Three.js (sin secuencia de imágenes); el progreso del scroll se suaviza como `scrub: 1` de GSAP.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const section = document.getElementById("scrub");
const canvas = section.querySelector(".scrub__canvas");
const chapters = [...section.querySelectorAll(".scrub__chapter")];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch {
  renderer = null;
}
if (!renderer || reduce) {
  // Sin WebGL o con movimiento reducido: portada fija, se ven el título y el precio.
  section.classList.add("is-static");
  if (!renderer) section.classList.add("no-gl");
}
if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  const rim = new THREE.PointLight(0x5fd8ff, 0, 12); // cian de carga: crece al abrir
  rim.position.set(0, 0.6, 0.4);
  scene.add(key, rim);

  // Materiales: estuche azul marino lacado, audífonos claros, puntas de silicona grises, LED cian.
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x1a2a6b, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15 });
  const cavity = new THREE.MeshStandardMaterial({ color: 0x060a1c, roughness: 0.9 });
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xeef1fa, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const silicone = new THREE.MeshStandardMaterial({ color: 0x8a90a8, roughness: 0.75 });
  const led = new THREE.MeshStandardMaterial({ color: 0x0a1a24, emissive: 0x5fe0ff, emissiveIntensity: 0.2 });

  const W = 3.2, D = 2.1;
  const product = new THREE.Group();
  scene.add(product);

  const caseGroup = new THREE.Group();
  product.add(caseGroup);
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, 1.5, D, 6, 0.36), navy);
  base.position.y = -0.75;
  const hole = new THREE.Mesh(new RoundedBoxGeometry(W - 0.9, 0.02, D - 0.9, 4, 0.01), cavity);
  hole.position.y = 0.002;
  const strip = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.07, 0.04, 2, 0.02), led);
  strip.position.set(0, -0.55, D / 2 + 0.005);
  caseGroup.add(base, hole, strip);

  // Tapa con bisagra en el borde trasero.
  const hinge = new THREE.Group();
  hinge.position.set(0, 0, -D / 2 + 0.05);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(W, 0.8, D, 6, 0.36), navy);
  lid.position.set(0, 0.4, D / 2 - 0.05);
  hinge.add(lid);
  caseGroup.add(hinge);

  function bud(side) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 28), shell);
    head.scale.set(1, 0.92, 1.05);
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.95, 8, 20), shell);
    stem.position.set(0.12 * side, -0.68, 0.1);
    stem.rotation.z = 0.16 * side;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 20), silicone);
    tip.scale.set(1, 1, 0.75);
    tip.position.set(-0.3 * side, 0.05, -0.18);
    const dot = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 24), led);
    dot.position.set(0.18 * side, -1.18, 0.21);
    dot.rotation.y = 0.2 * side;
    g.add(head, stem, tip, dot);
    return g;
  }
  const buds = [bud(-1), bud(1)];
  buds.forEach((b) => product.add(b));

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  let wide = true;
  const still = section.classList.contains("is-static");
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w / h > 1.1 && w >= 700;
    camera.position.set(0, 1.6, wide ? 11 : still ? 12 : 19);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  // Escena en función del progreso p (0..1) y el tiempo t para un leve flotar.
  function pose(p, t) {
    const open = ease(seg(p, 0.14, 0.4));
    const rise = ease(seg(p, 0.4, 0.68));
    const settle = ease(seg(p, 0.72, 0.95));
    const float = reduce ? 0 : Math.sin(t * 1.4) * 0.05;

    // En pantalla ancha el producto vive a la derecha del texto; en celular, arriba.
    product.position.x = wide ? lerp(1.9, 2.1, settle) : 0;
    product.position.y = wide ? lerp(-0.2, 0.1, rise) : still ? 0 : lerp(1.25, 1.5, rise);
    product.rotation.y = lerp(-0.55, 0.35, ease(seg(p, 0, 0.7))) + settle * -0.35;
    product.rotation.x = lerp(0.18, 0.05, open);

    hinge.rotation.x = -open * 1.95;
    rim.intensity = open * 6;
    led.emissiveIntensity = 0.2 + open * 2.2;

    caseGroup.position.y = lerp(0, -2.4, settle);
    caseGroup.scale.setScalar(lerp(1, 0.55, settle));

    buds.forEach((b, i) => {
      const s = i ? 1 : -1;
      const x0 = 0.62 * s, y0 = -0.05, z0 = 0;
      b.position.set(
        lerp(x0, 1.15 * s, rise),
        lerp(y0, 1.9, rise) + lerp(0, -1.2, settle) + float * (i ? -1 : 1),
        lerp(z0, 0.6, rise)
      );
      b.rotation.set(lerp(0, 0.25, rise), lerp(0, -0.9 * s, rise) + settle * 0.5 * s, lerp(0, -0.35 * s, rise));
    });
  }

  // Texto por capítulos: cada uno aparece en su tramo del scroll.
  const windows = [[-1, 0, 0.1, 0.16], [0.16, 0.22, 0.36, 0.42], [0.44, 0.5, 0.64, 0.7], [0.74, 0.82, 2, 2]];
  const meter = section.querySelector(".scrub__meter-fill");
  function text(p) {
    chapters.forEach((el, i) => {
      const [a, b, c, d] = windows[i];
      const o = p < b ? seg(p, a, b) : 1 - seg(p, c, d);
      el.style.opacity = o.toFixed(3);
      el.style.translate = `0 ${((1 - o) * (p < b ? 24 : -24)).toFixed(1)}px`;
      el.inert = o < 0.5;
    });
    meter.style.scale = `1 ${p.toFixed(4)}`;
  }

  function target() {
    const r = section.getBoundingClientRect();
    return clamp01(-r.top / (r.height - innerHeight));
  }

  resize();
  addEventListener("resize", resize);

  if (reduce) {
    pose(0.62, 0);
    renderer.render(scene, camera);
    return;
  }

  let p = target(), visible = true, raf = 0;
  const clock = new THREE.Clock();
  function frame() {
    raf = 0;
    p += (target() - p) * 0.12; // suavizado del scrub
    pose(p, clock.getElapsedTime());
    text(p);
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(section);
  section.classList.add("is-live");
  frame();
}
