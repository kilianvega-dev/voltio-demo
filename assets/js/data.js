// Datos de la tienda. Todo es ficticio: productos, precios y reseñas son de demostración.
window.VOLTIO = {
  store: {
    name: "Voltio",
    tagline: "tecnología que se siente",
    whatsapp: "573125825273",
    freeShippingFrom: 200000,
    shippingCost: 12900,
    author: { name: "Kilian Vega", whatsapp: "573125825273" },
  },

  categories: [
    { id: "audio", name: "Audio", blurb: "Audífonos, earbuds y parlantes" },
    { id: "carga", name: "Carga", blurb: "Cargadores, power banks y hubs" },
    { id: "setup", name: "Setup", blurb: "Teclado, mouse y headset gamer" },
    { id: "wearables", name: "Wearables", blurb: "Relojes y bandas" },
  ],

  products: [
    {
      id: "audifonos-pulso", name: "Audífonos Pulso ANC", category: "audio",
      price: 289900, before: 349900, rating: 4.8, reviews: 126, badge: "Más vendido",
      short: "Cancelación de ruido activa y 40 horas de batería.",
      specs: ["Cancelación de ruido activa", "40 h de batería, carga rápida USB-C", "Bluetooth 5.3 multipunto", "Plegables, con estuche"],
    },
    {
      id: "earbuds-orbita", name: "Earbuds Órbita", category: "audio",
      price: 139900, before: 179900, rating: 4.6, reviews: 211,
      short: "Inalámbricos, resistentes al sudor, estuche de carga.",
      specs: ["Bluetooth 5.3", "6 h + 24 h con el estuche", "Resistentes al agua IPX5", "Controles táctiles"],
    },
    {
      id: "cargador-halo", name: "Cargador inalámbrico Halo", category: "carga",
      price: 89900, rating: 4.7, reviews: 88, badge: "Nuevo",
      short: "Carga rápida de 15 W con anillo de luz.",
      specs: ["15 W carga rápida Qi", "Anillo LED indicador", "Compatible con iPhone y Android", "Incluye cable USB-C"],
    },
    {
      id: "headset-arena", name: "Headset Arena", category: "setup",
      price: 219900, before: 259900, rating: 4.7, reviews: 74,
      short: "Sonido envolvente y micrófono desmontable.",
      specs: ["Sonido envolvente 7.1", "Micrófono desmontable", "Almohadillas de espuma viscoelástica", "Base de soporte incluida"],
    },
    {
      id: "reloj-ritmo", name: "Smartwatch Ritmo", category: "wearables",
      price: 259900, before: 299900, rating: 4.5, reviews: 97,
      short: "Pantalla AMOLED, GPS y 10 días de batería.",
      specs: ["Pantalla AMOLED 1,8\"", "GPS integrado", "Ritmo cardiaco y sueño", "Hasta 10 días de batería"],
    },
    {
      id: "banda-impulso", name: "Banda Impulso", category: "wearables",
      price: 119900, rating: 4.4, reviews: 152,
      short: "Pasos, sueño y notificaciones por 14 días.",
      specs: ["Pantalla a color", "14 días de batería", "Resistente al agua 5 ATM", "Más de 100 modos deportivos"],
    },
    {
      id: "parlante-cubo", name: "Parlante Cubo", category: "audio",
      price: 159900, rating: 4.6, reviews: 63,
      short: "Pequeño, potente y con 12 horas de música.",
      specs: ["10 W de potencia", "12 h de batería", "Resistente a salpicaduras", "Correa de cuero"],
    },
    {
      id: "teclado-sesenta", name: "Teclado mecánico Sesenta", category: "setup",
      price: 249900, before: 289900, rating: 4.9, reviews: 58, badge: "Favorito",
      short: "Formato 60 %, switches intercambiables.",
      specs: ["Formato compacto 60 %", "Switches hot-swap", "Teclas PBT", "Bluetooth y cable USB-C"],
    },
    {
      id: "mouse-trazo", name: "Mouse inalámbrico Trazo", category: "setup",
      price: 79900, rating: 4.5, reviews: 140,
      short: "Silencioso, ergonómico, 12 meses de pila.",
      specs: ["Clics silenciosos", "Receptor USB nano", "DPI ajustable hasta 2400", "12 meses con una pila AA"],
    },
    {
      id: "powerbank-reserva", name: "Power bank Reserva 20.000", category: "carga",
      price: 129900, before: 149900, rating: 4.7, reviews: 119,
      short: "20.000 mAh en aluminio, carga dos equipos a la vez.",
      specs: ["20.000 mAh", "Carga rápida 22,5 W", "USB-C y USB-A", "Carcasa de aluminio"],
    },
    {
      id: "hub-nodo", name: "Hub USB-C Nodo 7 en 1", category: "carga",
      price: 149900, rating: 4.6, reviews: 45,
      short: "HDMI 4K, lector SD y carga de 100 W.",
      specs: ["HDMI 4K 30 Hz", "2 USB-A 3.0", "Lector SD y microSD", "Carga PD 100 W"],
    },
    {
      id: "cargador-gan", name: "Cargador GaN 65 W", category: "carga",
      price: 119900, rating: 4.8, reviews: 91,
      short: "Carga portátil, celular y tablet con un solo cargador.",
      specs: ["65 W con tecnología GaN", "2 USB-C y 1 USB-A", "Clavija plegable", "Protección contra sobrecalentamiento"],
    },
  ],

  featured: ["audifonos-pulso", "earbuds-orbita", "cargador-halo"],

  combos: [
    { id: "combo-setup", name: "Combo Setup", items: ["teclado-sesenta", "mouse-trazo", "headset-arena"], price: 499900, pitch: "Todo para jugar o trabajar en tu escritorio." },
    { id: "combo-carga", name: "Combo Carga Total", items: ["cargador-halo", "powerbank-reserva", "cargador-gan"], price: 299900, pitch: "Nunca más con el celular en 1 %." },
    { id: "combo-entreno", name: "Combo Entreno", items: ["banda-impulso", "earbuds-orbita"], price: 229900, pitch: "Mide tu ritmo y ponle música." },
  ],

  reviews: [
    { name: "Laura M.", city: "Villavicencio", product: "audifonos-pulso", stars: 5, text: "Los uso en el bus todos los días y no escucho nada del ruido. Llegaron al día siguiente." },
    { name: "Andrés P.", city: "Bogotá", product: "teclado-sesenta", stars: 5, text: "Pedí contraentrega y pagué al recibir. El teclado se siente muy sólido." },
    { name: "Camila R.", city: "Medellín", product: "powerbank-reserva", stars: 4, text: "Carga mi celular tres veces. Es un poco pesada, pero vale la pena." },
    { name: "Julián S.", city: "Cali", product: "earbuds-orbita", stars: 5, text: "Me respondieron rápido por WhatsApp para elegir entre dos modelos." },
  ],

  faq: [
    { q: "¿Cuánto tarda el envío?", a: "Entre 24 y 48 horas en ciudades principales y de 3 a 5 días hábiles en el resto del país. Te enviamos la guía por WhatsApp." },
    { q: "¿Puedo pagar contraentrega?", a: "Sí. Pagas en efectivo cuando recibes el pedido, sin costo adicional." },
    { q: "¿Qué medios de pago aceptan?", a: "Nequi, PSE, tarjeta débito o crédito y contraentrega. También puedes pedir por WhatsApp y te ayudamos a pagar." },
    { q: "¿Tienen garantía?", a: "Todos los productos tienen 6 meses de garantía por defectos de fábrica. Si algo falla, lo cambiamos." },
    { q: "¿Cuándo es gratis el envío?", a: "En compras desde $200.000. La barra de carga del carrito te muestra cuánto te falta." },
  ],
};
