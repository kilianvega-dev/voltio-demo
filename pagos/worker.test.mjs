// node --test pagos/worker.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { totalPesos, firmaIntegridad } from "./worker.js";

test("firma igual al ejemplo de la documentación de Wompi", async () => {
  const firma = await firmaIntegridad("sk8-438k4-xmxm392-sn2m", 2490000, "COP", "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6");
  assert.equal(firma, "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5");
});

test("total con precios de data.js y envío", () => {
  assert.equal(totalPesos([{ id: "earbuds-orbita", qty: 1 }]), 139900 + 12900);
  assert.equal(totalPesos([{ id: "audifonos-pulso", qty: 1 }]), 289900);
});

test("rechaza carritos manipulados", () => {
  assert.throws(() => totalPesos([]));
  assert.throws(() => totalPesos([{ id: "no-existe", qty: 1 }]));
  assert.throws(() => totalPesos([{ id: "earbuds-orbita", qty: 0 }]));
  assert.throws(() => totalPesos([{ id: "earbuds-orbita", qty: 1.5 }]));
});

test("la consulta previa CORS responde 204 sin cuerpo y con el origen permitido", async () => {
  const r = await worker.fetch(new Request("https://x/firma", { method: "OPTIONS", headers: { origin: "http://127.0.0.1:5179" } }), {});
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), "http://127.0.0.1:5179");
});

test("firma con el total calculado en el servidor", async () => {
  const r = await worker.fetch(new Request("https://x/firma", { method: "POST", body: JSON.stringify({ lineas: [{ id: "earbuds-orbita", qty: 1 }] }) }), { WOMPI_INTEGRITY_SECRET: "s", WOMPI_PUBLIC_KEY: "pub_test_x" });
  const f = await r.json();
  assert.equal(f.centavos, 15280000);
  assert.equal(f.firma, await firmaIntegridad(f.referencia, 15280000, "COP", "s"));
});
