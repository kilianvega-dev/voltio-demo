import test from "node:test";
import assert from "node:assert/strict";
import { esLento } from "../assets/js/lento.js";

const rapido = { reduce: false, webgl: true, nucleos: 8, memoria: 8 };

test("un equipo rápido no es lento", () => assert.equal(esLento(rapido), false));
test("sin dato de memoria (Safari, Firefox) no cuenta como lento", () => assert.equal(esLento({ ...rapido, memoria: undefined }), false));
test("movimiento reducido es lento", () => assert.equal(esLento({ ...rapido, reduce: true }), true));
test("sin WebGL es lento", () => assert.equal(esLento({ ...rapido, webgl: false }), true));
test("4 núcleos o menos es lento", () => assert.equal(esLento({ ...rapido, nucleos: 4 }), true));
test("4 GB o menos es lento", () => assert.equal(esLento({ ...rapido, memoria: 4 }), true));
