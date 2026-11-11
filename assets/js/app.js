(function () {
  "use strict";

  const D = window.VOLTIO;
  const S = D.store;
  const byId = Object.fromEntries(D.products.map((p) => [p.id, p]));
  const comboById = Object.fromEntries(D.combos.map((c) => [c.id, c]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- utilidades ----------

  const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const fmt = (n) => money.format(n).replace(/\s/g, " ");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* almacenamiento bloqueado: la tienda sigue funcionando en memoria */ }
    return null;
  }

  // Íconos dibujados a mano en una grilla de 24, trazo uniforme.
  const ICONS = {
    bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    bank: '<path d="M3 9.5 12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
  };
  const WA_PATH = '<path fill="currentColor" stroke="none" d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.8l4.9-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.6-.4Z"/>';

  function icon(name, cls = "") {
    const body = name === "whatsapp" ? WA_PATH : ICONS[name];
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  const stars = (r) =>
    `<span class="stars" aria-label="${String(r).replace(".", ",")} de 5 estrellas">` +
    Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.round(r) ? "on" : ""}">${icon("star")}</span>`).join("") +
    `</span>`;

  function waLink(text, number = S.whatsapp) {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  // ---------- carrito ----------

  let cart = store("voltio-cart") || [];

  function lineInfo(line) {
    const p = byId[line.id];
    if (p) return { name: p.name, price: p.price, img: `assets/img/${p.id}-sm.webp`, href: `producto.html?id=${p.id}` };
    const c = comboById[line.id];
    if (c) return { name: c.name, price: c.price, img: `assets/img/${c.items[0]}-sm.webp`, href: "index.html#combos", combo: c };
    return null;
  }

  function totals() {
    const subtotal = cart.reduce((s, l) => s + (lineInfo(l)?.price || 0) * l.qty, 0);
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const free = subtotal >= S.freeShippingFrom;
    const shipping = count === 0 || free ? 0 : S.shippingCost;
    return { subtotal, count, shipping, total: subtotal + shipping, free, charge: Math.min(1, subtotal / S.freeShippingFrom), missing: Math.max(0, S.freeShippingFrom - subtotal) };
  }

  function saveCart() {
    cart = cart.filter((l) => l.qty > 0 && lineInfo(l));
    store("voltio-cart", cart);
    renderCharge();
    renderDrawer();
    window.dispatchEvent(new Event("voltio:cart"));
  }

  function addToCart(id, qty = 1) {
    const before = totals().free;
    const line = cart.find((l) => l.id === id);
    if (line) line.qty = Math.min(9, line.qty + qty);
    else cart.push({ id, qty });
    saveCart();
    jolt();
    const t = totals();
    const name = lineInfo({ id }).name;
    announce(!before && t.free ? `${name} agregado. Envío gratis desbloqueado.` : `${name} agregado al carrito.`);
  }

  function setQty(id, qty) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    line.qty = Math.max(0, Math.min(9, qty));
    saveCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
  }

  function cartMessage(extra = "") {
    const t = totals();
    const lines = cart.map((l) => {
      const i = lineInfo(l);
      return `• ${l.qty} × ${i.name}: ${fmt(i.price * l.qty)}`;
    });
    return `[Demo Voltio] Hola, quiero hacer este pedido:\n${lines.join("\n")}\nSubtotal: ${fmt(t.subtotal)}\nEnvío: ${t.shipping ? fmt(t.shipping) : "gratis"}\nTotal: ${fmt(t.total)}${extra}`;
  }

  // ---------- batería: la carga del carrito hacia el envío gratis ----------

  function batteryMarkup(cls = "") {
    return `<span class="battery ${cls}" aria-hidden="true"><span class="battery__cell"><span class="battery__fill"></span></span><span class="battery__cap"></span>${icon("bolt", "battery__bolt")}</span>`;
  }

  function renderCharge() {
    const t = totals();
    document.documentElement.style.setProperty("--charge", t.charge.toFixed(3));
    document.documentElement.toggleAttribute("data-charged", t.free);
    $$("[data-charge-pct]").forEach((el) => (el.textContent = `${Math.round(t.charge * 100)} %`));
    $$("[data-charge-short]").forEach((el) => (el.textContent = t.free ? "envío gratis listo" : "hacia envío gratis"));
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = t.count;
      el.hidden = t.count === 0;
    });
    $$("[data-charge-label]").forEach((el) => {
      el.textContent = t.free ? "Envío gratis desbloqueado" : t.count ? `Te faltan ${fmt(t.missing)} para envío gratis` : `Envío gratis desde ${fmt(S.freeShippingFrom)}`;
    });
    const btn = $("#cart-button");
    if (btn) btn.setAttribute("aria-label", `Carrito: ${plural(t.count, "producto", "productos")}, ${Math.round(t.charge * 100)} % hacia envío gratis`);
  }

  function jolt() {
    const btn = $("#cart-button");
    if (!btn) return;
    btn.classList.remove("is-jolted");
    void btn.offsetWidth;
    btn.classList.add("is-jolted");
  }

  // ---------- estructura compartida ----------

  function layout(page) {
    const nav = [
      ["index.html", "Inicio", "home"],
      ["tienda.html", "Tienda", "shop"],
      ["index.html#combos", "Combos", "combos"],
      ["index.html#preguntas", "Preguntas", "faq"],
    ];
    const header = $("#site-header");
    header.innerHTML = `
      <div class="header__inner">
        <a class="wordmark" href="index.html" aria-label="Voltio, inicio">${icon("bolt", "wordmark__bolt")}<span>Voltio</span></a>
        <nav class="nav" aria-label="Principal">
          ${nav.map(([href, label, key]) => `<a href="${href}" ${key === page ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
        </nav>
        <div class="header__actions">
          <a class="icon-btn" href="tienda.html#buscar" aria-label="Buscar productos">${icon("search")}</a>
          <button class="charge-btn" id="cart-button" type="button" aria-haspopup="dialog">
            ${batteryMarkup()}
            <span class="charge-btn__text"><span class="charge-btn__pct" data-charge-pct>0 %</span><small data-charge-short>hacia envío gratis</small></span>
            <span class="charge-btn__count" data-cart-count hidden>0</span>
          </button>
        </div>
      </div>
      <div class="demo-strip">Tienda de demostración · los pagos no son reales</div>`;

    $("#site-footer").innerHTML = `
      <div class="footer__inner">
        <div class="footer__brand">
          <a class="wordmark wordmark--lg" href="index.html">${icon("bolt", "wordmark__bolt")}<span>Voltio</span></a>
          <p>${esc(S.tagline.charAt(0).toUpperCase() + S.tagline.slice(1))}. Envíos a toda Colombia.</p>
        </div>
        <nav class="footer__links" aria-label="Tienda">
          <a href="tienda.html">Todos los productos</a>
          ${D.categories.map((c) => `<a href="tienda.html?cat=${c.id}">${c.name}</a>`).join("")}
        </nav>
        <nav class="footer__links" aria-label="Ayuda">
          <a href="index.html#preguntas">Envíos y garantía</a>
          <a href="${waLink("[Demo Voltio] Hola, tengo una pregunta.")}" target="_blank" rel="noopener">WhatsApp</a>
          <a href="checkout.html">Finalizar compra</a>
        </nav>
      </div>
      <div class="signature">
        <p>Sitio de demostración · Diseñado y desarrollado por <a href="${waLink("Hola Kilian, vi la demo de Voltio y quiero una página para mi negocio.", S.author.whatsapp)}" target="_blank" rel="noopener">Kilian Vega</a></p>
        <p class="signature__fine">Productos, precios y reseñas son ficticios. Fotos: Unsplash.</p>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="drawer" id="cart-drawer" aria-labelledby="drawer-title">
        <div class="drawer__panel">
          <header class="drawer__head">
            <h2 id="drawer-title">Tu carrito</h2>
            <button class="icon-btn" type="button" data-close-drawer aria-label="Cerrar carrito">${icon("close")}</button>
          </header>
          <div class="charge-meter" data-meter>
            <div class="charge-meter__track"><div class="charge-meter__fill"></div><span class="charge-meter__ticks"><i></i><i></i><i></i><i></i></span></div>
            <p class="charge-meter__label">${icon("bolt")}<span data-charge-label></span></p>
          </div>
          <div class="drawer__body" id="drawer-body"></div>
          <footer class="drawer__foot" id="drawer-foot"></footer>
        </div>
      </dialog>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`);

    const drawer = $("#cart-drawer");
    $("#cart-button").addEventListener("click", () => openDrawer());
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer || e.target.closest("[data-close-drawer]")) drawer.close();
    });

    renderCharge();
    renderDrawer();
  }

  function openDrawer() {
    const d = $("#cart-drawer");
    if (!d.open) d.showModal();
  }

  function renderDrawer() {
    const body = $("#drawer-body");
    const foot = $("#drawer-foot");
    if (!body) return;
    const t = totals();
    if (!cart.length) {
      body.innerHTML = `<div class="empty">${batteryMarkup("battery--xl")}<p class="empty__title">Tu carrito está en 0 %</p><p>Agrega productos y mira cómo se carga hasta el envío gratis.</p><a class="btn btn--blue" href="tienda.html">Ver la tienda ${icon("arrow")}</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = `<ul class="lines">${cart.map((l) => {
      const i = lineInfo(l);
      const sub = i.combo ? `<span class="line__sub">${i.combo.items.map((id) => byId[id].name).join(" + ")}</span>` : "";
      return `<li class="line">
        <a class="line__img" href="${i.href}"><img src="${i.img}" alt="" width="72" height="72"></a>
        <div class="line__info">
          <a class="line__name" href="${i.href}">${esc(i.name)}</a>${sub}
          <span class="line__price num">${fmt(i.price * l.qty)}</span>
          <div class="qty" role="group" aria-label="Cantidad de ${esc(i.name)}">
            <button type="button" data-qty="${l.id}" data-delta="-1" aria-label="Quitar uno">${icon(l.qty === 1 ? "trash" : "minus")}</button>
            <output class="num">${l.qty}</output>
            <button type="button" data-qty="${l.id}" data-delta="1" aria-label="Agregar uno" ${l.qty >= 9 ? "disabled" : ""}>${icon("plus")}</button>
          </div>
        </div>
      </li>`;
    }).join("")}</ul>${suggestion(t)}`;

    foot.innerHTML = `
      <dl class="sum">
        <div><dt>Subtotal</dt><dd class="num">${fmt(t.subtotal)}</dd></div>
        <div><dt>Envío</dt><dd class="num">${t.shipping ? fmt(t.shipping) : '<span class="free">Gratis</span>'}</dd></div>
        <div class="sum__total"><dt>Total</dt><dd class="num">${fmt(t.total)}</dd></div>
      </dl>
      <a class="btn btn--blue btn--block" href="checkout.html">Ir a pagar ${icon("arrow")}</a>
      <a class="btn btn--ghost btn--block" href="${waLink(cartMessage())}" target="_blank" rel="noopener">${icon("whatsapp")} Pedir por WhatsApp</a>`;
  }

  // Sugiere el producto más barato que completa el envío gratis.
  function suggestion(t) {
    if (t.free) return "";
    const inCart = new Set(cart.map((l) => l.id));
    const pick = D.products.filter((p) => !inCart.has(p.id) && p.price >= t.missing).sort((a, b) => a.price - b.price)[0];
    if (!pick) return "";
    return `<div class="suggest">
      <img src="assets/img/${pick.id}-sm.webp" alt="" width="56" height="56">
      <p>Con <strong>${esc(pick.name)}</strong> completas el envío gratis.</p>
      <button class="btn btn--sm btn--blue" type="button" data-add="${pick.id}">Agregar <span class="num">${fmt(pick.price)}</span></button>
    </div>`;
  }

  function announce(msg) {
    const t = $("#toast");
    if (!t) return;
    t.innerHTML = `${icon("check")}<span>${esc(msg)}</span><button type="button" class="toast__link" data-open-cart>Ver carrito</button>`;
    t.classList.add("is-on");
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => t.classList.remove("is-on"), 3200);
  }

  // Delegación global: agregar, cantidades, abrir carrito.
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      e.preventDefault();
      const qtyInput = add.dataset.qtyFrom ? $(add.dataset.qtyFrom) : null;
      addToCart(add.dataset.add, qtyInput ? Number(qtyInput.value) || 1 : 1);
      if (add.hasAttribute("data-then-open")) openDrawer();
      return;
    }
    const q = e.target.closest("[data-qty]");
    if (q) {
      const line = cart.find((l) => l.id === q.dataset.qty);
      if (line) setQty(line.id, line.qty + Number(q.dataset.delta));
      return;
    }
    if (e.target.closest("[data-open-cart]")) {
      $("#toast")?.classList.remove("is-on");
      openDrawer();
    }
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "voltio-cart") {
      cart = store("voltio-cart") || [];
      renderCharge();
      renderDrawer();
    }
  });

  // ---------- piezas de producto ----------

  function priceBlock(p, cls = "") {
    const off = p.before ? Math.round((1 - p.price / p.before) * 100) : 0;
    return `<p class="price ${cls}"><span class="price__now num">${fmt(p.price)}</span>${p.before ? `<s class="price__before num" aria-label="Antes ${fmt(p.before)}">${fmt(p.before)}</s><span class="price__off num">−${off} %</span>` : ""}</p>`;
  }

  function tile(p) {
    const cat = D.categories.find((c) => c.id === p.category);
    return `<article class="tile">
      <a class="tile__media" href="producto.html?id=${p.id}">
        <img src="assets/img/${p.id}-sm.webp" alt="${esc(p.name)}" width="480" height="480" loading="lazy">
        ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
      </a>
      <div class="tile__body">
        <h3 class="tile__name"><a href="producto.html?id=${p.id}">${esc(p.name)}</a></h3>
        <p class="tile__meta">${cat.name}</p>
        <p class="tile__rating">${stars(p.rating)}<span class="num">${String(p.rating).replace(".", ",")}</span><span class="muted">(${p.reviews})</span></p>
        ${priceBlock(p)}
        <button class="btn btn--blue btn--sm tile__add" type="button" data-add="${p.id}">${icon("plus")} Agregar</button>
      </div>
    </article>`;
  }

  // ---------- páginas ----------

  const pages = {
    home() {
      // Banda infinita: corre sola, acelera con la velocidad del scroll y sigue su sentido.
      const band = $(".band__text");
      if (band && !reduceMotion.matches) {
        let x = 0, dir = 1, boost = 0, lastY = scrollY, on = false;
        const step = () => {
          const dy = scrollY - lastY; lastY = scrollY;
          if (dy) dir = Math.sign(dy);
          boost = boost * 0.9 + Math.min(Math.abs(dy), 80) * 0.1;
          x -= (0.6 + boost * 0.5) * dir;
          const half = band.scrollWidth / 2;
          if (x <= -half) x += half; else if (x > 0) x -= half;
          band.style.transform = `translate3d(${x}px,0,0)`;
          if (on) requestAnimationFrame(step);
        };
        new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) { lastY = scrollY; requestAnimationFrame(step); } }).observe(band);
      }
      const rail = $("#hero-rail");
      rail.innerHTML = D.featured.map((id, n) => {
        const p = byId[id];
        return `<article class="rail-item ${n === 0 ? "rail-item--lead" : ""}">
          <a class="rail-item__media" href="producto.html?id=${p.id}">
            <img src="assets/img/${p.id}.webp" alt="${esc(p.name)}" width="1000" height="1000" ${n === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
            ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
            ${p.before ? `<span class="tag tag--off num" aria-hidden="true">−${Math.round((1 - p.price / p.before) * 100)} %</span>` : ""}
          </a>
          <div class="rail-item__body">
            <div>
              <h2 class="rail-item__name"><a href="producto.html?id=${p.id}">${esc(p.name)}</a></h2>
              <p class="rail-item__short">${esc(p.short)}</p>
            </div>
            <div class="rail-item__buy">
              ${priceBlock(p)}
              <button class="btn btn--blue" type="button" data-add="${p.id}">${icon("plus")} Agregar</button>
            </div>
          </div>
        </article>`;
      }).join("");

      $("#cats").innerHTML = D.categories.map((c) => {
        const items = D.products.filter((p) => p.category === c.id);
        return `<li><a class="cat-row" href="tienda.html?cat=${c.id}">
          <span class="cat-row__name">${c.name}</span>
          <span class="cat-row__blurb">${c.blurb}</span>
          <span class="cat-row__thumbs">${items.slice(0, 3).map((p) => `<img src="assets/img/${p.id}-sm.webp" alt="" width="64" height="64" loading="lazy">`).join("")}</span>
          <span class="cat-row__count num">${plural(items.length, "producto", "productos")} ${icon("arrow")}</span>
        </a></li>`;
      }).join("");

      $("#best").innerHTML = D.products.filter((p) => !D.featured.includes(p.id)).slice(0, 4).map(tile).join("");

      $("#combo-list").innerHTML = D.combos.map((c) => {
        const full = c.items.reduce((s, id) => s + byId[id].price, 0);
        return `<article class="combo">
          <div class="combo__stack">${c.items.map((id) => `<img src="assets/img/${id}-sm.webp" alt="${esc(byId[id].name)}" width="480" height="480">`).join("")}</div>
          <h3 class="combo__name">${esc(c.name)}</h3>
          <p class="combo__pitch">${esc(c.pitch)}</p>
          <ul class="combo__items">${c.items.map((id) => `<li>${esc(byId[id].name)}</li>`).join("")}</ul>
          <p class="combo__price"><span class="num">${fmt(c.price)}</span><s class="num">${fmt(full)}</s></p>
          <p class="combo__save">Ahorras <span class="num">${fmt(full - c.price)}</span></p>
          <button class="btn btn--white" type="button" data-add="${c.id}">${icon("plus")} Agregar combo</button>
        </article>`;
      }).join("");

      $("#review-list").innerHTML = D.reviews.map((r) => `<figure class="review">
        ${stars(r.stars)}
        <blockquote>${esc(r.text)}</blockquote>
        <figcaption><strong>${esc(r.name)}</strong> · ${esc(r.city)} · compró <a href="producto.html?id=${r.product}">${esc(byId[r.product].name)}</a></figcaption>
      </figure>`).join("");

      $("#faq-list").innerHTML = D.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}${icon("plus")}</summary><p>${esc(f.a)}</p></details>`).join("");
      $("#wa-close").href = waLink("[Demo Voltio] Hola, quiero que me ayuden a elegir un producto.");
    },

    shop() {
      const params = new URLSearchParams(location.search);
      const state = { cat: params.get("cat") || "all", q: "", sort: "relevance" };
      const grid = $("#shop-grid");
      const count = $("#shop-count");
      const chips = $("#chips");
      chips.innerHTML = [{ id: "all", name: "Todo" }, ...D.categories].map((c) =>
        `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === state.cat}">${c.name}</button>`).join("");

      function draw() {
        const q = fold(state.q.trim());
        let list = D.products.filter((p) => (state.cat === "all" || p.category === state.cat) && (!q || fold(`${p.name} ${p.short} ${p.specs.join(" ")}`).includes(q)));
        if (state.sort === "price-asc") list = list.slice().sort((a, b) => a.price - b.price);
        if (state.sort === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);
        if (state.sort === "rating") list = list.slice().sort((a, b) => b.rating - a.rating);
        count.textContent = plural(list.length, "producto", "productos");
        grid.innerHTML = list.length ? list.map(tile).join("") :
          `<div class="empty empty--wide"><p class="empty__title">No encontramos “${esc(state.q)}”</p><p>Prueba con otra palabra o pregúntanos por WhatsApp.</p><button class="btn btn--ghost" type="button" id="reset-search">Ver todos los productos</button></div>`;
        $$(".chip", chips).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
        const url = new URL(location.href);
        if (state.cat === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", state.cat);
        history.replaceState(null, "", url);
      }

      chips.addEventListener("click", (e) => {
        const b = e.target.closest("[data-cat]");
        if (!b) return;
        state.cat = b.dataset.cat;
        draw();
      });
      const search = $("#buscar");
      search.addEventListener("input", () => { state.q = search.value; draw(); });
      $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; draw(); });
      grid.addEventListener("click", (e) => {
        if (e.target.closest("#reset-search")) { search.value = ""; state.q = ""; state.cat = "all"; draw(); search.focus(); }
      });
      if (location.hash === "#buscar") search.focus();
      draw();
    },

    product() {
      const p = byId[new URLSearchParams(location.search).get("id")] || D.products[0];
      const cat = D.categories.find((c) => c.id === p.category);
      document.title = `${p.name} · Voltio`;
      const reviews = D.reviews.filter((r) => r.product === p.id);
      const related = D.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
      const inCombo = D.combos.find((c) => c.items.includes(p.id));

      $("#product").innerHTML = `
        <nav class="crumbs" aria-label="Ruta"><a href="tienda.html">Tienda</a><span aria-hidden="true">/</span><a href="tienda.html?cat=${cat.id}">${cat.name}</a></nav>
        <div class="pdp">
          <div class="gallery">
            <div class="gallery__main" id="gallery-main" data-view="0">
              <img src="assets/img/${p.id}.webp" alt="${esc(p.name)}" width="1000" height="1000" fetchpriority="high">
              ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
            </div>
            <div class="gallery__thumbs" role="group" aria-label="Vistas del producto">
              <button type="button" class="gallery__thumb" data-view="0" aria-pressed="true"><span class="gallery__frame"><img src="assets/img/${p.id}-sm.webp" alt="" width="96" height="96"></span><span>Vista general</span></button>
              <button type="button" class="gallery__thumb gallery__thumb--zoom" data-view="1" aria-pressed="false"><span class="gallery__frame"><img src="assets/img/${p.id}-sm.webp" alt="" width="96" height="96"></span><span>Detalle</span></button>
            </div>
          </div>
          <div class="pdp__info">
            <h1 class="pdp__name">${esc(p.name)}</h1>
            <p class="tile__rating">${stars(p.rating)}<span class="num">${String(p.rating).replace(".", ",")}</span><a class="muted" href="#opiniones">${plural(p.reviews, "opinión", "opiniones")}</a></p>
            ${priceBlock(p, "price--lg")}
            <p class="pdp__short">${esc(p.short)}</p>
            <div class="pdp__buy">
              <label class="qty-select"><span>Cantidad</span>
                <select id="pdp-qty">${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join("")}</select>
              </label>
              <button class="btn btn--blue btn--lg" type="button" data-add="${p.id}" data-qty-from="#pdp-qty" data-then-open>${icon("plus")} Agregar al carrito</button>
            </div>
            <a class="btn btn--ghost btn--block" href="${waLink(`[Demo Voltio] Hola, tengo una pregunta sobre ${p.name} (${fmt(p.price)}).`)}" target="_blank" rel="noopener">${icon("whatsapp")} Preguntar por WhatsApp</a>
            <ul class="perks">
              <li>${icon("truck")}<span>Envío 24–48 h en ciudades principales. <strong data-charge-label></strong></span></li>
              <li>${icon("cash")}<span>Paga contraentrega, Nequi, PSE o tarjeta</span></li>
              <li>${icon("shield")}<span>Garantía de 6 meses</span></li>
            </ul>
            <h2 class="pdp__h">Características</h2>
            <ul class="specs">${p.specs.map((s) => `<li>${icon("check")}${esc(s)}</li>`).join("")}</ul>
            ${inCombo ? `<div class="pdp-combo"><p>También viene en el <strong>${esc(inCombo.name)}</strong>: ${inCombo.items.map((id) => esc(byId[id].name)).join(" + ")} por <span class="num">${fmt(inCombo.price)}</span>.</p><button class="btn btn--sm btn--white" type="button" data-add="${inCombo.id}">Agregar combo</button></div>` : ""}
          </div>
        </div>
        <section class="pdp-reviews" id="opiniones" aria-labelledby="op-h">
          <h2 id="op-h" class="section__title section__title--sm">Opiniones</h2>
          <div class="pdp-reviews__score"><span class="pdp-reviews__big num">${String(p.rating).replace(".", ",")}</span>${stars(p.rating)}<span class="muted">${plural(p.reviews, "opinión", "opiniones")} de demostración</span></div>
          ${reviews.length ? reviews.map((r) => `<figure class="review review--plain">${stars(r.stars)}<blockquote>${esc(r.text)}</blockquote><figcaption><strong>${esc(r.name)}</strong> · ${esc(r.city)}</figcaption></figure>`).join("") : `<p class="muted">Aún no hay opiniones escritas para este producto.</p>`}
        </section>
        ${related.length ? `<section class="related" aria-labelledby="rel-h"><h2 id="rel-h" class="section__title section__title--sm">También en ${cat.name}</h2><div class="grid">${related.map(tile).join("")}</div></section>` : ""}`;

      const main = $("#gallery-main");
      $$(".gallery__thumb").forEach((b) => b.addEventListener("click", () => {
        main.dataset.view = b.dataset.view;
        $$(".gallery__thumb").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      }));
      renderCharge();
    },

    checkout() {
      const form = $("#checkout-form");
      const summary = $("#summary");
      function drawSummary() {
        if (form.dataset.sent) return true;
        const t = totals();
        if (!cart.length) {
          $("#checkout-main").innerHTML = `<div class="empty empty--wide">${batteryMarkup("battery--xl")}<p class="empty__title">No hay nada que pagar todavía</p><p>Tu carrito está vacío. Agrega productos para continuar.</p><a class="btn btn--blue" href="tienda.html">Ir a la tienda ${icon("arrow")}</a></div>`;
          return false;
        }
        summary.innerHTML = `
          <h2 class="summary__title">Resumen</h2>
          <ul class="summary__lines">${cart.map((l) => { const i = lineInfo(l); return `<li><img src="${i.img}" alt="" width="48" height="48"><span>${esc(i.name)} <span class="muted num">× ${l.qty}</span></span><span class="num">${fmt(i.price * l.qty)}</span></li>`; }).join("")}</ul>
          <dl class="sum sum--on-blue">
            <div><dt>Subtotal</dt><dd class="num">${fmt(t.subtotal)}</dd></div>
            <div><dt>Envío</dt><dd class="num">${t.shipping ? fmt(t.shipping) : "Gratis"}</dd></div>
            <div class="sum__total"><dt>Total</dt><dd class="num">${fmt(t.total)}</dd></div>
          </dl>
          <p class="summary__charge">${icon("bolt")}<span data-charge-label></span></p>
          <button type="button" class="summary__edit" data-open-cart>Editar carrito</button>`;
        renderCharge();
        return true;
      }
      if (!drawSummary()) return;
      window.addEventListener("voltio:cart", drawSummary);

      // Métodos de pago: cada uno muestra sus propios campos.
      const methods = $$("input[name=metodo]", form);
      function syncMethod() {
        const m = methods.find((r) => r.checked)?.value;
        $$("[data-method-panel]", form).forEach((p) => {
          const on = p.dataset.methodPanel === m;
          p.hidden = !on;
          $$("input, select", p).forEach((i) => (i.disabled = !on));
        });
        $("#pay-label").textContent = m === "contraentrega" ? "Confirmar pedido" : "Pagar ahora";
      }
      methods.forEach((r) => r.addEventListener("change", syncMethod));
      syncMethod();

      // Formato de tarjeta y teléfono mientras se escribe.
      form.addEventListener("input", (e) => {
        const el = e.target;
        if (el.name === "tarjeta") el.value = el.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
        if (el.name === "vence") el.value = el.value.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
        if (["celular", "nequi", "cvv"].includes(el.name)) el.value = el.value.replace(/\D/g, "");
        if (el.closest(".field")?.classList.contains("has-error")) validate(el);
        if (!$(".has-error", form)) $("#form-status").textContent = "";
      });
      form.addEventListener("focusout", (e) => { if (e.target.matches("input, select") && e.target.value) validate(e.target); });

      const MSG = {
        nombre: "Escribe tu nombre completo.",
        celular: "Escribe un celular de 10 dígitos que empiece por 3.",
        ciudad: "Escribe la ciudad de entrega.",
        direccion: "Escribe la dirección con número, por ejemplo Calle 38 # 30-15.",
        departamento: "Elige el departamento.",
        nequi: "Escribe el número de Nequi de 10 dígitos.",
        banco: "Elige tu banco.",
        tarjeta: "Escribe los 16 dígitos de la tarjeta.",
        vence: "Escribe la fecha como MM/AA.",
        cvv: "Escribe los 3 dígitos del reverso.",
      };
      function validate(el) {
        if (el.disabled || !el.name || !(el.name in MSG)) return true;
        const v = el.value.trim();
        let ok = v.length > 0;
        if (el.name === "nombre") ok = v.split(/\s+/).length >= 2;
        if (el.name === "celular" || el.name === "nequi") ok = /^3\d{9}$/.test(v);
        if (el.name === "direccion") ok = /\d/.test(v) && v.length >= 6;
        if (el.name === "tarjeta") ok = v.replace(/\s/g, "").length === 16;
        if (el.name === "vence") ok = /^(0[1-9]|1[0-2])\/\d{2}$/.test(v);
        if (el.name === "cvv") ok = /^\d{3}$/.test(v);
        const field = el.closest(".field");
        const err = field && $(".field__error", field);
        field?.classList.toggle("has-error", !ok);
        el.setAttribute("aria-invalid", String(!ok));
        if (err) err.textContent = ok ? "" : MSG[el.name];
        return ok;
      }

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fields = $$("input, select", form).filter((i) => !i.disabled && i.name in MSG);
        const bad = fields.filter((f) => !validate(f));
        if (bad.length) {
          bad[0].focus();
          $("#form-status").textContent = `Revisa ${plural(bad.length, "campo", "campos")} marcados en rojo.`;
          return;
        }
        $("#form-status").textContent = "";
        const btn = $("#pay-btn");
        btn.disabled = true;
        btn.classList.add("is-loading");
        $("#pay-label").textContent = "Procesando pago de prueba…";
        const data = Object.fromEntries(new FormData(form));
        const t = totals();
        const order = {
          id: "VT-" + Date.now().toString(36).slice(-6).toUpperCase(),
          date: new Date().toISOString(),
          lines: cart.map((l) => ({ ...l, name: lineInfo(l).name, price: lineInfo(l).price })),
          totals: t,
          customer: { nombre: data.nombre, celular: data.celular, ciudad: data.ciudad, departamento: data.departamento, direccion: data.direccion, barrio: data.barrio || "" },
          metodo: data.metodo,
        };
        setTimeout(() => {
          form.dataset.sent = "1";
          store("voltio-order", order);
          clearCart();
          location.href = `confirmacion.html?pedido=${order.id}`;
        }, 1400);
      });
    },

    confirm() {
      const o = store("voltio-order");
      const main = $("#confirm");
      const wanted = new URLSearchParams(location.search).get("pedido");
      if (!o || (wanted && wanted !== o.id)) {
        main.innerHTML = `<div class="empty empty--wide"><p class="empty__title">No encontramos ese pedido</p><p>Los pedidos de esta demo solo se guardan en este navegador.</p><a class="btn btn--blue" href="tienda.html">Ir a la tienda ${icon("arrow")}</a></div>`;
        return;
      }
      const METHOD = { nequi: "Nequi", pse: "PSE", tarjeta: "Tarjeta", contraentrega: "Contraentrega (pagas al recibir)" };
      const msg = `[Demo Voltio] Hola, hice el pedido ${o.id} por ${fmt(o.totals.total)}. Pago: ${METHOD[o.metodo]}. Envío a ${o.customer.direccion}, ${o.customer.ciudad}.`;
      const firstName = o.customer.nombre.split(/\s+/)[0];
      main.innerHTML = `
        <div class="confirm__hero">
          ${batteryMarkup("battery--xl battery--full")}
          <h1 class="confirm__title">¡Listo, ${esc(firstName)}! Tu pedido está cargado.</h1>
          <p class="confirm__id">Pedido <strong class="num">${esc(o.id)}</strong> · ${o.metodo === "contraentrega" ? "pagas al recibir" : "pago de prueba aprobado"}</p>
        </div>
        <ol class="steps">
          <li class="is-done"><span>${icon("check")}</span><div><strong>Pedido recibido</strong><p>Te escribimos por WhatsApp al ${esc(o.customer.celular)}.</p></div></li>
          <li><span>${icon("box")}</span><div><strong>Preparando</strong><p>Empacamos y revisamos tus productos.</p></div></li>
          <li><span>${icon("truck")}</span><div><strong>En camino</strong><p>Llega a ${esc(o.customer.ciudad)} en 24–48 h hábiles.</p></div></li>
        </ol>
        <div class="confirm__grid">
          <section class="confirm__box" aria-labelledby="c-items">
            <h2 id="c-items">Productos</h2>
            <ul class="summary__lines">${o.lines.map((l) => `<li><span>${esc(l.name)} <span class="muted num">× ${l.qty}</span></span><span class="num">${fmt(l.price * l.qty)}</span></li>`).join("")}</ul>
            <dl class="sum">
              <div><dt>Envío</dt><dd class="num">${o.totals.shipping ? fmt(o.totals.shipping) : "Gratis"}</dd></div>
              <div class="sum__total"><dt>Total</dt><dd class="num">${fmt(o.totals.total)}</dd></div>
            </dl>
          </section>
          <section class="confirm__box" aria-labelledby="c-ship">
            <h2 id="c-ship">Entrega</h2>
            <p>${esc(o.customer.nombre)}<br>${esc(o.customer.direccion)}${o.customer.barrio ? ", " + esc(o.customer.barrio) : ""}<br>${esc(o.customer.ciudad)}, ${esc(o.customer.departamento)}</p>
            <h2>Pago</h2>
            <p>${METHOD[o.metodo]}</p>
          </section>
        </div>
        <div class="confirm__actions">
          <a class="btn btn--blue btn--lg" href="${waLink(msg)}" target="_blank" rel="noopener">${icon("whatsapp")} Enviar pedido por WhatsApp</a>
          <a class="btn btn--ghost btn--lg" href="tienda.html">Seguir comprando</a>
        </div>
        <p class="demo-note">Esto es una demostración: no se cobró dinero ni se envió ningún dato. El pedido solo existe en tu navegador.</p>`;
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    layout(page);
    pages[page]?.();
    requestAnimationFrame(() => document.documentElement.classList.add("is-ready"));
  });
})();
