// Servidor de pagos de Voltio: firma el pago para el widget de Wompi y consulta su estado.
// El total se calcula aquí con los precios de data.js, nunca con lo que mande el navegador.
import "./ventana.js";
import "../assets/js/data.js";

const D = globalThis.VOLTIO;
const PRECIOS = Object.fromEntries([...D.products, ...D.combos].map((x) => [x.id, x.price]));
const ORIGENES = ["https://kilianvega-dev.github.io", "http://127.0.0.1", "http://localhost"];

export function totalPesos(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0 || lineas.length > 30) throw new Error("carrito inválido");
  let subtotal = 0;
  for (const l of lineas) {
    const precio = PRECIOS[l?.id];
    if (!precio || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) throw new Error("línea inválida");
    subtotal += precio * l.qty;
  }
  return subtotal + (subtotal >= D.store.freeShippingFrom ? 0 : D.store.shippingCost);
}

export async function firmaIntegridad(referencia, centavos, moneda, secreto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${referencia}${centavos}${moneda}${secreto}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function responder(datos, estado, origen) {
  const permitido = ORIGENES.some((o) => origen === o || origen?.startsWith(o + ":"));
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      "content-type": "application/json",
      ...(permitido && { "access-control-allow-origin": origen, "access-control-allow-headers": "content-type", vary: "origin" }),
    },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origen = req.headers.get("origin");
    if (req.method === "OPTIONS") return responder({}, 204, origen);

    if (req.method === "POST" && url.pathname === "/firma") {
      if (!env.WOMPI_INTEGRITY_SECRET) return responder({ error: "Pagos sin configurar" }, 503, origen);
      let centavos;
      try {
        centavos = totalPesos((await req.json()).lineas) * 100;
      } catch {
        return responder({ error: "Carrito inválido" }, 400, origen);
      }
      const referencia = "VT-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      const firma = await firmaIntegridad(referencia, centavos, "COP", env.WOMPI_INTEGRITY_SECRET);
      return responder({ referencia, centavos, moneda: "COP", llavePublica: env.WOMPI_PUBLIC_KEY, firma }, 200, origen);
    }

    if (req.method === "GET" && url.pathname === "/estado") {
      const id = url.searchParams.get("id") || "";
      if (!/^[\w-]{5,64}$/.test(id)) return responder({ error: "Id inválido" }, 400, origen);
      const r = await fetch(`${env.WOMPI_API}/transactions/${id}`);
      if (!r.ok) return responder({ error: "No se pudo consultar Wompi" }, 502, origen);
      const t = (await r.json()).data;
      return responder({ estado: t.status, referencia: t.reference, centavos: t.amount_in_cents, metodo: t.payment_method_type }, 200, origen);
    }

    return responder({ error: "No encontrado" }, 404, origen);
  },
};
