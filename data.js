// ==================== DATOS DEL JUEGO ====================
// Calendario: cada turno = 1 mes, arrancando en enero 2020
const ANIO_INICIO = 2020;
const MES_INICIO = 0; // 0 = enero
const MESES_NOMBRE = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_POR_ANIO_CARRERA = 3; // cada año de carrera dura 3 turnos

// Calcula el costo de un "gasto grande" (gusto) según el patrimonio del jugador.
// Te cobra el precio COMPLETO solo si tu patrimonio es >= 1.5x el precio; si no, proporcional.
// Sin tope de saldo: si el gasto supera tu caja, quedás en rojo y tenés que liquidar activos (o usar el seguro).
function gastoGrande(saldo, patrimonio, precio) {
  const p = Math.max(0, patrimonio || 0);
  const factor = Math.min(1, p / (precio * 1.5)); // 1 cuando patrimonio >= 1.5x precio
  return Math.round(precio * factor);
}

const PROVINCIAS = [
  { nombre: "Buenos Aires", ciudades: [
    { nombre: "CABA", bonusSueldo: 0.20, costoVida: 2.0 },
    { nombre: "La Plata", bonusSueldo: 0.10, costoVida: 1.5 },
    { nombre: "Azul", bonusSueldo: 0, costoVida: 1.0 },
    { nombre: "Mar del Plata", bonusSueldo: 0.08, costoVida: 1.4 }
  ]},
  { nombre: "Córdoba", ciudades: [{ nombre: "Córdoba Capital", bonusSueldo: 0.12, costoVida: 1.6 }]},
  { nombre: "Mendoza", ciudades: [{ nombre: "Mendoza", bonusSueldo: 0.08, costoVida: 1.4 }]},
  { nombre: "Santa Fe", ciudades: [{ nombre: "Rosario", bonusSueldo: 0.10, costoVida: 1.5 }]},
  { nombre: "Tucumán", ciudades: [{ nombre: "San Miguel", bonusSueldo: 0.02, costoVida: 1.1 }]},
  { nombre: "Chubut", ciudades: [{ nombre: "Comodoro Rivadavia", bonusSueldo: 0.25, costoVida: 1.8 }]},
  { nombre: "Tierra del Fuego", ciudades: [{ nombre: "Ushuaia", bonusSueldo: 0.30, costoVida: 2.2 }]},
  { nombre: "Salta", ciudades: [{ nombre: "Salta Capital", bonusSueldo: 0.01, costoVida: 1.0 }]},
  { nombre: "Entre Ríos", ciudades: [{ nombre: "Paraná", bonusSueldo: 0.04, costoVida: 1.1 }]},
  { nombre: "Neuquén", ciudades: [{ nombre: "Neuquén Capital", bonusSueldo: 0.20, costoVida: 1.7 }]}
];

const CARRERAS = [
  { nombre: "Contador Público", emoji: "📊", duracion: 5, sueldo: 340000, costo: 0, descripcion: "Bonus +3% estudio contable propio" },
  { nombre: "Medicina", emoji: "🩺", duracion: 6, sueldo: 420000, costo: 0, descripcion: "Alta demanda laboral" },
  { nombre: "Ingeniería Industrial", emoji: "⚙️", duracion: 5, sueldo: 390000, costo: 0, descripcion: "Versatilidad laboral" },
  { nombre: "Sistemas / Programación", emoji: "💻", duracion: 3, sueldo: 580000, costo: 60000, descripcion: "Puede cobrar en USD" },
  { nombre: "Administración de Empresas", emoji: "📋", duracion: 4, sueldo: 290000, costo: 50000, descripcion: "Gestión empresarial" },
  { nombre: "Derecho", emoji: "⚖️", duracion: 5, sueldo: 310000, costo: 0, descripcion: "Puede litigar" },
  { nombre: "Gastronomía / Oficio", emoji: "👨‍🍳", duracion: 2, sueldo: 220000, costo: 60000, descripcion: "Puede emprender rápido" },
  { nombre: "Sin estudio", emoji: "🏗️", duracion: 0, sueldo: 150000, costo: 0, descripcion: "Arrancar a trabajar ya" }
];

const EVENTOS = [
  // POSITIVOS
  { emoji: "💸", titulo: "Bono de fin de año", desc: "Tu empresa pagó bono extraordinario. ¡Un regalo en pesos!", impacto: (s) => Math.round(s * 0.15), tipo: "pos" },
  { emoji: "📈", titulo: "Tus acciones subieron", desc: "El mercado estuvo favorable. Las acciones que tenías valorizaron.", impacto: (s) => 80000, tipo: "pos" },
  { emoji: "🎁", titulo: "Herencia inesperada", desc: "Un familiar lejano te dejó algo de plata. ¡Viva la familia!", impacto: (s) => 200000, tipo: "pos" },
  { emoji: "🤝", titulo: "Cerraste un contrato enorme", desc: "Un cliente grande firmó un contrato millonario con vos. ¡Lluvia de plata!", impacto: (s) => 1000000, tipo: "pos" },
  { emoji: "🏆", titulo: "Ganaste una licitación", desc: "Te adjudicaron una obra/servicio del Estado. Entró un adelanto enorme.", impacto: (s) => 1000000, tipo: "pos" },
  { emoji: "💼", titulo: "Oferta de trabajo mejor", desc: "Te ofrecieron un puesto mejor pagado. Aceptaste sin dudarlo.", impacto: (s) => Math.round(s * 0.10), tipo: "pos" },
  { emoji: "🏆", titulo: "Premio por desempeño", desc: "Tu jefe reconoció tu trabajo. Aumentaste el sueldo del mes.", impacto: (s) => 60000, tipo: "pos" },
  { emoji: "🌟", titulo: "Freelance exitoso", desc: "Hiciste un trabajo extra y cobaste bien. Las changas rinden.", impacto: (s) => 120000, tipo: "pos" },
  { emoji: "🏘️", titulo: "Alquiler subió", desc: "Tu propiedad vale más. Ajustaste el alquiler y cobrás más.", impacto: (s) => 90000, tipo: "pos" },
  { emoji: "💰", titulo: "Inversión de plazo fijo", desc: "Tu plazo fijo venció con buena tasa. La inflación te ayudó.", impacto: (s) => 100000, tipo: "pos" },
  { emoji: "🎰", titulo: "Premio de la quiniela", desc: "¡Pegaste un número! La suerte estuvo de tu lado hoy.", impacto: (s) => 150000, tipo: "pos" },
  { emoji: "🤝", titulo: "Sociedad rentable", desc: "Un negocio que armaste con un amigo dio frutos este mes.", impacto: (s) => 180000, tipo: "pos" },
  { emoji: "📱", titulo: "Venta en MercadoLibre", desc: "Liquidaste cosas en desuso y generaste buena plata.", impacto: (s) => 50000, tipo: "pos" },
  { emoji: "🏗️", titulo: "Obra pública cerca", desc: "El gobierno hizo una obra y tu zona valorizó.", impacto: (s) => 70000, tipo: "pos" },
  { emoji: "💡", titulo: "Idea de negocio exitosa", desc: "Implementaste una idea pequeña que generó ingresos extras.", impacto: (s) => 130000, tipo: "pos" },
  { emoji: "🌍", titulo: "Cobro en dólares", desc: "Un cliente extranjero te pagó. Al tipo de cambio, te fue bien.", impacto: (s) => 200000, tipo: "pos" },
  { emoji: "🎓", titulo: "Beca obtenida", desc: "Ganaste una beca que cubre tus gastos de estudio este mes.", impacto: (s) => 80000, tipo: "pos" },
  { emoji: "🧾", titulo: "Aguinaldo (SAC)", desc: "Cobraste el medio aguinaldo. Un respiro para el bolsillo.", impacto: (s) => 150000, tipo: "pos" },
  { emoji: "📊", titulo: "Boom de la bolsa", desc: "El Merval voló y tus inversiones acompañaron. ¡Gran mes!", impacto: (s) => Math.round(s * 0.12), tipo: "pos" },
  { emoji: "💲", titulo: "El dólar blue te favoreció", desc: "Compraste barato y vendiste caro. La brecha te dejó ganancia.", impacto: (s) => 170000, tipo: "pos" },
  { emoji: "🪙", titulo: "Blanqueo conveniente", desc: "Regularizaste ahorros con beneficios impositivos. Te quedó plata.", impacto: (s) => 220000, tipo: "pos" },
  { emoji: "📈", titulo: "Ascenso laboral", desc: "Te promovieron a un mejor puesto. Más responsabilidad, más plata.", impacto: (s) => Math.round(s * 0.13), tipo: "pos" },
  { emoji: "🏦", titulo: "Reintegro de Ganancias", desc: "AFIP te devolvió retenciones de más. ¡Plata que vuelve!", impacto: (s) => 130000, tipo: "pos", soloRI: true },
  { emoji: "🎉", titulo: "Ganaste el Quini 6", desc: "¡Acertaste varios números! Un golpe de suerte enorme.", impacto: (s) => 350000, tipo: "pos" },
  { emoji: "💳", titulo: "Reintegro de la tarjeta", desc: "Promo bancaria y cashback: te devolvieron un montón en compras.", impacto: (s) => 60000, tipo: "pos" },
  { emoji: "🚀", titulo: "Tu emprendimiento despegó", desc: "Un proyecto propio empezó a facturar fuerte este mes.", impacto: (s) => 240000, tipo: "pos" },
  { emoji: "🤑", titulo: "Cliente grande", desc: "Cerraste un contrato importante. Entró un buen adelanto.", impacto: (s) => Math.round(s * 0.11), tipo: "pos" },
  { emoji: "🏅", titulo: "Bono por productividad", desc: "El equipo cumplió los objetivos y repartieron premios.", impacto: (s) => 110000, tipo: "pos" },
  { emoji: "🧾", titulo: "IVA a favor", desc: "Te quedó saldo a favor de IVA en ARCA. ¡Plata que vuelve!", impacto: (s) => 90000, tipo: "pos", soloRI: true },
  { emoji: "📋", titulo: "Reintegro de percepciones", desc: "Te devolvieron percepciones que te habían cobrado de más.", impacto: (s) => 70000, tipo: "pos" },
  { emoji: "🪙", titulo: "Saldo a favor liberado", desc: "ARCA te liberó un crédito fiscal acumulado.", impacto: (s) => 100000, tipo: "pos" },
  { emoji: "🏆", titulo: "¡La Scaloneta salió campeón!", desc: "El país festeja y la gente sale a consumir. Tu negocio vendió como nunca.", impacto: (s) => 200000, tipo: "pos" },
  { emoji: "🐮", titulo: "Subió el precio de la hacienda", desc: "El campo liquidó a buen precio y la plata circuló. Te tocó una parte.", impacto: (s) => 180000, tipo: "pos" },
  { emoji: "🌾", titulo: "Cosecha récord de soja", desc: "El agro tuvo una campaña histórica y entraron dólares. La economía respiró.", impacto: (s) => 250000, tipo: "pos" },
  { emoji: "🧉", titulo: "Boom de las exportaciones de yerba", desc: "Tu producto pegó afuera. Las ventas al exterior dejaron buena diferencia.", impacto: (s) => 150000, tipo: "pos" },
  { emoji: "🍷", titulo: "Exportaste vino mendocino", desc: "Un importador europeo te hizo un pedido grande. Cobraste en euros.", impacto: (s) => 220000, tipo: "pos" },
  { emoji: "⚽", titulo: "Vendiste la camiseta de la Selección", desc: "Furor por la albiceleste. Volaron de las góndolas y facturaste fuerte.", impacto: (s) => 160000, tipo: "pos" },
  // NEGATIVOS
  { emoji: "💥", titulo: "Devaluación del peso", desc: "El gobierno devaluó. Tus pesos perdieron poder adquisitivo.", impacto: (s) => -Math.round(s * 0.12), tipo: "neg" },
  { emoji: "🚨", titulo: "Multa de AFIP", desc: "Te llegó una intimación de AFIP. Facturaste de más sin declarar.", impacto: (s) => -150000, tipo: "neg" },
  { emoji: "🏥", titulo: "Gasto médico imprevisto", desc: "Una enfermedad o accidente te generó gastos médicos fuertes.", impacto: (s, p) => -Math.max(200000, Math.round((p || 0) * 0.05)), tipo: "neg" },
  { emoji: "🚗", titulo: "Choque de auto", desc: "Tuviste un accidente severo. El seguro no cubrió todo el desastre.", impacto: (s, p) => -Math.max(180000, Math.round((p || 0) * 0.04)), tipo: "neg" },
  { emoji: "🔥", titulo: "Robo en casa", desc: "Te desvalijaron. Perdiste cosas de valor y pagaste el arreglo.", impacto: (s, p) => -Math.max(250000, Math.round((p || 0) * 0.06)), tipo: "neg" },
  { emoji: "📉", titulo: "Crisis política", desc: "La inestabilidad política afectó tu negocio o inversiones.", impacto: (s) => -Math.round(s * 0.08), tipo: "neg" },
  { emoji: "🌡️", titulo: "Inflación récord", desc: "Los precios subieron más que tu sueldo. Tu poder de compra cayó.", impacto: (s) => -Math.round(s * 0.10), tipo: "neg" },
  { emoji: "🏦", titulo: "Cepo cambiario", desc: "El gobierno restringió el acceso al dólar. Perdiste en el blue.", impacto: (s) => -100000, tipo: "neg" },
  { emoji: "⚡", titulo: "Tarifazo de servicios", desc: "Subieron luz, gas y agua. Tus gastos fijos pegaron el salto.", impacto: (s) => -80000, tipo: "neg" },
  { emoji: "🏚️", titulo: "Alquiler aumentó", desc: "Tu propietario aplicó el ajuste por inflación. Pagás más.", impacto: (s) => -90000, tipo: "neg" },
  { emoji: "📊", titulo: "Huelga en tu sector", desc: "Hubo un paro. No cobraste completo este mes.", impacto: (s) => -Math.round(s * 0.15), tipo: "neg" },
  { emoji: "🌊", titulo: "Inundación en tu negocio", desc: "Pérdida de stock y daños estructurales graves.", impacto: (s, p) => -Math.max(220000, Math.round((p || 0) * 0.08)), tipo: "neg" },
  { emoji: "💳", titulo: "Deuda de tarjeta", desc: "Las cuotas se acumularon. Este mes pagás más de lo esperado.", impacto: (s) => -120000, tipo: "neg" },
  { emoji: "🏢", titulo: "Despido", desc: "Te echaron del trabajo. Cobrás indemnización pero perdés ingreso.", impacto: (s) => -Math.round(s * 0.20), tipo: "neg" },
  { emoji: "🦠", titulo: "Pandemia / Cuarentena", desc: "Restricciones afectaron tu actividad. Ingresos reducidos.", impacto: (s) => -Math.round(s * 0.18), tipo: "neg" },
  { emoji: "📰", titulo: "Corralito bancario", desc: "El banco frenó los retiros. No podés acceder a tu plata.", impacto: (s) => -Math.round(s * 0.25), tipo: "neg" },
  { emoji: "🧾", titulo: "Pago de IVA", desc: "Liquidaste el IVA del mes y tocó pagarle a ARCA.", impacto: (s) => -110000, tipo: "neg", soloRI: true },
  { emoji: "📑", titulo: "Ingresos Brutos (IIBB)", desc: "Pagaste Ingresos Brutos provinciales este mes.", impacto: (s) => -80000, tipo: "neg" },
  { emoji: "🏛️", titulo: "Anticipo de Ganancias", desc: "ARCA te cobró un anticipo del impuesto a las Ganancias.", impacto: (s) => -130000, tipo: "neg", soloRI: true },
  { emoji: "💼", titulo: "Retención impositiva", desc: "Un cliente te retuvo impuestos al pagarte.", impacto: (s) => -60000, tipo: "neg" },
  // Gastos grandes (gustos): te cobran el precio COMPLETO solo si tu patrimonio es >= 1.5x el precio.
  // Si tenés menos, pagás la parte proporcional. Y como es un gasto al contado, nunca te cobran más que tu saldo.
  { emoji: "🚗", titulo: "Te compraste un auto", desc: "Te diste el gusto de un 0km, acorde a lo que tu patrimonio bancaba.", impacto: (s, p) => -gastoGrande(s, p, 5000000), tipo: "neg" },
  { emoji: "✈️", titulo: "Viaje al exterior", desc: "Te fuiste de vacaciones acorde a tu patrimonio. Tarjetazo y a pagar.", impacto: (s, p) => -gastoGrande(s, p, 3500000), tipo: "neg" },
  { emoji: "🔧", titulo: "Se rompió el auto", desc: "Fuiste al mecánico y te arrancaron la cabeza con los repuestos.", impacto: (s, p) => -gastoGrande(s, p, 350000), tipo: "neg" },
  { emoji: "📱", titulo: "Nuevo iPhone", desc: "Te tentaste con un celular nuevo, acorde a tu patrimonio.", impacto: (s, p) => -gastoGrande(s, p, 1500000), tipo: "neg" },

  // ======== EVENTOS-DECISIÓN (DILEMAS): te obligan a elegir, con riesgo/recompensa ========
  {
    emoji: "🤫", titulo: "El cliente 'creativo'", tipo: "decision",
    desc: "Un cliente acepta tu abono fijo de $20.000/mes, pero te tira un fajo extra si lo ayudás a 'dibujar' comprobantes para evadir.",
    opciones: [
      { texto: "Aceptar el trato bajo la mesa", resolver: () => Math.random() < 0.70
        ? { impacto: 180000, texto: "Salió redondo. Cobraste el extra y ARCA ni se enteró. Tu caja respira." }
        : { impacto: -450000, texto: "¡Desastre! Cruzaron datos, detectaron la maniobra y te comiste una multa catastrófica." } },
      { texto: "Rechazar por ética", resolver: () => ({ impacto: 0, texto: "Rechazaste la plata. No ganaste extra, pero dormís con la conciencia (y el CUIT) en paz." }) }
    ]
  },
  {
    emoji: "👟", titulo: "Oportunidad de stock relámpago", tipo: "decision",
    desc: "Un distribuidor liquida un lote cerrado de calzado deportivo a mitad de precio. Hay que poner el efectivo HOY.",
    opciones: [
      { texto: "Reventar la caja y comprar todo", resolver: () => Math.random() < 0.60
        ? { impacto: 350000, texto: "¡Un éxito! Ubicaste todo al precio de lista. Triplicaste la inversión." }
        : { impacto: -150000, texto: "Clavado con el stock. Los talles eran difíciles y quedó la mercadería frenada." } },
      { texto: "Dejar pasar la oportunidad", resolver: () => ({ impacto: 0, texto: "Cuidaste tu liquidez. El lote se lo llevó otro, pero seguís estable." }) }
    ]
  },
  {
    emoji: "🕵️", titulo: "Inspección sorpresa", tipo: "decision",
    desc: "Cae un inspector municipal al local. Encuentra una falta menor y te insinúa que con 'algo' lo arregla en el momento.",
    opciones: [
      { texto: "Pagar la coima ($120.000)", resolver: () => ({ impacto: -120000, texto: "Pagaste y se fue silbando. Caro, pero te sacaste el problema de encima." }) },
      { texto: "Negarte y arriesgar", resolver: () => Math.random() < 0.50
        ? { impacto: 0, texto: "El inspector era honesto (o se asustó). No pasó nada." }
        : { impacto: -400000, texto: "Te labró un acta y te clavó una multa mucho más cara que la coima." } }
    ]
  },
  {
    emoji: "📣", titulo: "Campaña de marketing", tipo: "decision",
    desc: "Una agencia te ofrece una campaña agresiva en redes. Sale plata ahora, pero podría disparar las ventas.",
    opciones: [
      { texto: "Invertir $200.000 en la campaña", resolver: () => Math.random() < 0.55
        ? { impacto: 500000, texto: "¡Se hizo viral! Las ventas explotaron y recuperaste la inversión con creces." }
        : { impacto: -200000, texto: "La campaña no pegó. Gastaste la plata y casi no movió la aguja." } },
      { texto: "No gastar en publicidad", resolver: () => ({ impacto: 0, texto: "Preferiste cuidar la caja. Tu negocio sigue como siempre." }) }
    ]
  },
  {
    emoji: "🎰", titulo: "Noche de casino", tipo: "decision",
    desc: "Unos amigos te arrastran al casino. La timba te llama y tenés unos pesos en el bolsillo.",
    opciones: [
      { texto: "Apostar fuerte", resolver: () => Math.random() < 0.45
        ? { impacto: 500000, texto: "¡Pleno! Saliste del casino como un campeón. La suerte estuvo de tu lado." }
        : { impacto: -350000, texto: "La banca siempre gana. Volviste a casa con los bolsillos vacíos." } },
      { texto: "Quedarte en casa", resolver: () => ({ impacto: 0, texto: "Mejor no tentar a la suerte. Te quedaste tranquilo viendo una serie." }) }
    ]
  },
  {
    emoji: "🐕", titulo: "Se enfermó el perro", tipo: "decision",
    desc: "Tu perro amaneció mal. El veterinario te ofrece un tratamiento completo, pero no es barato.",
    opciones: [
      { texto: "Pagar el veterinario ($150.000)", resolver: () => ({ impacto: -150000, texto: "Caro, pero tu compañero se recuperó y te llena de besos. No tiene precio." }) },
      { texto: "Probar remedios caseros", resolver: () => Math.random() < 0.5
        ? { impacto: 0, texto: "Era una panza floja nomás. Se curó solo y no gastaste un peso." }
        : { impacto: -350000, texto: "Empeoró y terminaste en la guardia veterinaria de urgencia. Salió carísimo." } }
    ]
  },
  {
    emoji: "🤝", titulo: "Un amigo te pide plata", tipo: "decision",
    desc: "Un amigo está en una mala y te pide $200.000 prestados. Jura que te los devuelve.",
    opciones: [
      { texto: "Prestarle la plata", resolver: () => Math.random() < 0.6
        ? { impacto: 250000, texto: "Cumplió: te devolvió todo con un asado de regalo incluido. Amigos así valen oro." }
        : { impacto: -200000, texto: "Desapareció del grupo de WhatsApp. La plata no volvió nunca más." } },
      { texto: "\"Justo ando corto\"", resolver: () => ({ impacto: 0, texto: "Le dijiste que no podías. Quedó la relación medio fría, pero tu plata está a salvo." }) }
    ]
  },
  {
    emoji: "📦", titulo: "Oportunidad de importación", tipo: "decision",
    desc: "Un conocido trae un contenedor de mercadería de afuera y te ofrece sumarte poniendo $300.000.",
    opciones: [
      { texto: "Poner la plata", resolver: () => Math.random() < 0.55
        ? { impacto: 600000, texto: "Llegó todo, se vendió rapidísimo y duplicaste la inversión. ¡Gran negocio!" }
        : { impacto: -300000, texto: "La aduana frenó el contenedor. Entre la coima y los costos, perdiste la plata." } },
      { texto: "No arriesgarte", resolver: () => ({ impacto: 0, texto: "Demasiado riesgo con la aduana. Preferiste no meterte." }) }
    ]
  },
  {
    emoji: "💼", titulo: "Changa en negro", tipo: "decision",
    desc: "Te ofrecen un trabajo extra muy bien pago, pero sin factura ni recibo. O lo hacés todo en blanco por menos.",
    opciones: [
      { texto: "Aceptar en negro", resolver: () => Math.random() < 0.75
        ? { impacto: 300000, texto: "Cobraste todo en mano y sin descuentos. Un golazo." }
        : { impacto: -150000, texto: "El cliente te hizo un quilombo, no te pagó y encima perdiste tiempo y materiales." } },
      { texto: "Hacerlo en blanco", resolver: () => ({ impacto: 120000, texto: "Cobraste menos pero con factura y tranquilidad. Todo legal." }) }
    ]
  },
  {
    emoji: "🎓", titulo: "Curso de criptomonedas", tipo: "decision",
    desc: "Un \"gurú\" de Instagram promete enseñarte a hacerte rico con cripto en 30 días. El curso sale $180.000.",
    opciones: [
      { texto: "Pagar el curso", resolver: () => Math.random() < 0.45
        ? { impacto: 450000, texto: "Algo bueno aprendiste: hiciste un par de operaciones y recuperaste con ganancia." }
        : { impacto: -180000, texto: "Era todo humo y frases motivacionales. Tiraste la plata a la basura." } },
      { texto: "Mirar tutoriales gratis", resolver: () => ({ impacto: 0, texto: "Para qué pagar: YouTube tiene todo gratis. Te ahorraste la plata." }) }
    ]
  }
];

// Acciones: precio inicial, volatilidad (cuánto se mueve por turno) y drift (tendencia leve)
const ACCIONES = [
  { nombre: "YPF", emoji: "⛽", tipo: "accion", precio: 150000, volatilidad: 0.15, drift: 0.008 },
  { nombre: "Banco Galicia", emoji: "🏦", tipo: "accion", precio: 120000, volatilidad: 0.12, drift: 0.007 },
  { nombre: "Mercado Libre", emoji: "🛒", tipo: "accion", precio: 400000, volatilidad: 0.20, drift: 0.012 },
  { nombre: "Loma Negra", emoji: "🏗️", tipo: "accion", precio: 100000, volatilidad: 0.11, drift: 0.006 },
  { nombre: "CEDEAR S&P 500", emoji: "🇺🇸", tipo: "accion", precio: 35000, volatilidad: 0.08, drift: 0.015 },
  { nombre: "Bitcoin (Cripto)", emoji: "₿", tipo: "accion", precio: 600000, volatilidad: 0.35, drift: 0.025 }
];

// FCI (Fondos Comunes de Inversión): menos volátiles que las acciones, con tendencia positiva
const FCI = [
  { nombre: "FCI Money Market", emoji: "💵", tipo: "fci", precio: 100000, volatilidad: 0.02, drift: 0.006 },
  { nombre: "FCI Renta Variable", emoji: "📊", tipo: "fci", precio: 150000, volatilidad: 0.09, drift: 0.011 },
  { nombre: "FCI Dólar MEP", emoji: "💲", tipo: "fci", precio: 120000, volatilidad: 0.06, drift: 0.010 },
  { nombre: "Plazo Fijo Tradicional", emoji: "⏳", tipo: "fci", precio: 100000, volatilidad: 0.00, drift: 0.035 } // Rinde 3.5% fijo mensual sin riesgo
];

// Lista combinada de instrumentos del mercado
const INSTRUMENTOS = ACCIONES.concat(FCI);

const EMPRESAS = [
  { nombre: "Kiosco", emoji: "🏪", precio: 1500000, retornoPorTurno: 75000, descripcion: "Negocio simple. Rentabilidad: 5%/mes" },
  { nombre: "Estudio Contable y Admin", emoji: "📋", precio: 2500000, retornoPorTurno: 137500, descripcion: "Gestión de PyMEs. Rentabilidad: 5.5%/mes" },
  { nombre: "Tienda de Calzado Deportivo", emoji: "👟", precio: 4000000, retornoPorTurno: 240000, descripcion: "Retail físico y online. Rentabilidad: 6%/mes" },
  { nombre: "Franquicia de comida", emoji: "🍔", precio: 10500000, retornoPorTurno: 682500, descripcion: "Marca reconocida. Rentabilidad: 6.5%/mes" },
  { nombre: "Empresa de tecnología", emoji: "💻", precio: 18000000, retornoPorTurno: 1260000, descripcion: "Alto margen. Rentabilidad: 7%/mes" },
  { nombre: "Constructora", emoji: "🏗️", precio: 45000000, retornoPorTurno: 3375000, descripcion: "Obras privadas. Rentabilidad: 7.5%/mes" },
  { nombre: "Empresa Agropecuaria", emoji: "🚜", precio: 80000000, retornoPorTurno: 6400000, descripcion: "Exportación pura. Rentabilidad: 8%/mes" }
];

// Estrategia de gestión de cada empresa (la elige el jugador y la puede cambiar).
// mult = cuánto rinde en un mes normal | pMal = prob. mal mes (pérdida) | pFlojo = prob. mes flojo (40%)
// perdMin/perdRange = magnitud de la pérdida en un mal mes (× el retorno base)
const MODOS_EMPRESA = {
  estable:  { label: "Estable",  emoji: "🛡️", mult: 0.70, pMal: 0.00, pFlojo: 0.10, perdMin: 0,   perdRange: 0,   desc: "Rinde menos (70%) pero casi nunca falla. Seguro." },
  normal:   { label: "Normal",   emoji: "⚖️", mult: 1.00, pMal: 0.08, pFlojo: 0.12, perdMin: 0.8, perdRange: 0.7, desc: "Equilibrado: rinde 100%, riesgo medio." },
  agresiva: { label: "Agresiva", emoji: "🚀", mult: 1.60, pMal: 0.20, pFlojo: 0.10, perdMin: 1.0, perdRange: 1.0, desc: "Rinde 160% cuando va bien, pero más meses malos y pérdidas grandes." }
};

const PROPIEDADES = [
  { nombre: "Cochera céntrica", emoji: "🅿️", precio: 1500000, alquilerPorTurno: 30000, descripcion: "Poco mantenimiento" },
  { nombre: "Departamento 1 amb.", emoji: "🏠", precio: 4000000, alquilerPorTurno: 60000, descripcion: "Alquiler tradicional" },
  { nombre: "Local comercial", emoji: "🏪", precio: 8000000, alquilerPorTurno: 140000, descripcion: "Zona de alto tráfico" },
  { nombre: "Lote en barrio privado", emoji: "🌳", precio: 15000000, alquilerPorTurno: 180000, descripcion: "Inversión a largo plazo", premium: true },
  { nombre: "PH con jardín", emoji: "🏘️", precio: 25000000, alquilerPorTurno: 375000, descripcion: "Lujo accesible", premium: true },
  { nombre: "Campo agrícola", emoji: "🌾", precio: 90000000, alquilerPorTurno: 1350000, descripcion: "Arrendamiento en dólares", premium: true },
  { nombre: "Torre Premium", emoji: "🏙️", precio: 200000000, alquilerPorTurno: 3000000, descripcion: "Inversión gigante", premium: true }
];

// Victoria inmobiliaria: ser dueño de esta cantidad de propiedades PREMIUM (sin estar en quiebra)
const META_PROPIEDADES_PREMIUM = 4;

// Aseguradoras contra quiebra: pagás una prima mensual y, si quebrás SIN activos para vender,
// la aseguradora cubre el rojo (hasta su cobertura total) y eso se vuelve una deuda con interés alto.
// Más cobertura = prima mensual más cara.
const ASEGURADORAS = [
  { nombre: "Seguro Básico", emoji: "🛡️", cobertura: 2000000, prima: 45000, tasa: 0.20, descripcion: "Cubre hasta $2M. Si lo usás, devolvés con 20%/mes de interés." },
  { nombre: "Seguro Premium", emoji: "🏰", cobertura: 5000000, prima: 90000, tasa: 0.20, descripcion: "Cubre hasta $5M. Si lo usás, devolvés con 20%/mes de interés." },
  { nombre: "Seguro Elite", emoji: "💎", cobertura: 10000000, prima: 170000, tasa: 0.20, descripcion: "Cubre hasta $10M. Si lo usás, devolvés con 20%/mes de interés." }
];

// Cada banco tiene su propia tasa mensual, monto máximo, plazos y beneficio
const BANCOS = [
  { nombre: "Banco Nación", emoji: "🏛️", tasa: 0.010, maximo: 30000000, cuotas: [12, 24, 36], maxPorSemestre: 2, beneficio: "El interés más bajo (1.0%/mes)" },
  { nombre: "Banco Provincia", emoji: "🏦", tasa: 0.015, maximo: 60000000, cuotas: [12, 24], maxPorSemestre: 2, beneficio: "Presta los montos más altos" },
  { nombre: "Banco Galicia", emoji: "🔵", tasa: 0.018, maximo: 40000000, cuotas: [12, 24, 36, 48], maxPorSemestre: 1, beneficio: "Hasta 48 meses, pero 1 crédito por semestre" },
  { nombre: "Brubank", emoji: "📲", tasa: 0.025, maximo: 15000000, cuotas: [6, 12], maxPorSemestre: 2, beneficio: "No te exige patrimonio: presta igual", ignoraPatrimonio: true },
  { nombre: "Mercado Pago", emoji: "💳", tasa: 0.030, maximo: 8000000, cuotas: [3, 6, 12], maxPorSemestre: 2, beneficio: "Adelanto rápido para emergencias" }
];

// Noticias del mes: algunas mueven el mercado (efectos), otras son color.
// t = instrumento por nombre, o "ACCIONES" / "FCI" / "TODOS"; p = % de cambio
const NOTICIAS = [
  { emoji: "🛢️", titulo: "Boom petrolero", texto: "Sube el crudo y las energéticas vuelan.", efectos: [{ t: "YPF", p: 0.10 }, { t: "Pampa Energía", p: 0.12 }] },
  { emoji: "⚡", titulo: "Crisis energética", texto: "Cortes de luz por la ola de calor. Pampa Energía sube 12%.", efectos: [{ t: "Pampa Energía", p: 0.12 }] },
  { emoji: "🛒", titulo: "Récord de ventas online", texto: "Mercado Libre marca un nuevo máximo histórico.", efectos: [{ t: "Mercado Libre", p: 0.15 }] },
  { emoji: "🏦", titulo: "El Banco Central sube las tasas", texto: "Los plazos fijos y los FCI ahora rinden más.", efectos: [{ t: "FCI", p: 0.05 }] },
  { emoji: "🏗️", titulo: "Plan de obra pública", texto: "Más cemento en la calle: Loma Negra se beneficia.", efectos: [{ t: "Loma Negra", p: 0.10 }] },
  { emoji: "💵", titulo: "Salta el dólar blue", texto: "El FCI Dólar de cobertura se dispara.", efectos: [{ t: "FCI Dólar (Cobertura)", p: 0.09 }] },
  { emoji: "📉", titulo: "Corrida bancaria", texto: "Nerviosismo en los bancos: Galicia cae 12%.", efectos: [{ t: "Banco Galicia", p: -0.12 }] },
  { emoji: "📰", titulo: "Escándalo mediático", texto: "Grupo Clarín bajo presión, su acción retrocede.", efectos: [{ t: "Grupo Clarín", p: -0.10 }] },
  { emoji: "🤝", titulo: "Acuerdo con el FMI", texto: "El mercado lo festeja: suben las acciones.", efectos: [{ t: "ACCIONES", p: 0.05 }] },
  { emoji: "💥", titulo: "Tensión financiera", texto: "Jornada de pánico: cae todo el panel.", efectos: [{ t: "ACCIONES", p: -0.08 }] },
  { emoji: "🌾", titulo: "Súper cosecha", texto: "Entran dólares del campo y el mercado mejora.", efectos: [{ t: "TODOS", p: 0.04 }] },
  { emoji: "🏭", titulo: "Reactivación industrial", texto: "Repuntan la producción y las energéticas.", efectos: [{ t: "YPF", p: 0.07 }, { t: "Pampa Energía", p: 0.06 }] },
  { emoji: "🎉", titulo: "¡La Selección campeona!", texto: "Euforia nacional. El país entero festeja.", efectos: [] },
  { emoji: "🚇", titulo: "Paro de transporte", texto: "Jornada complicada para moverse por la ciudad.", efectos: [] },
  { emoji: "🌡️", titulo: "Ola de calor histórica", texto: "Récord de temperatura en todo el país.", efectos: [] },
  { emoji: "🎬", titulo: "Estreno récord", texto: "El cine argentino la rompe en taquilla.", efectos: [] }
];

const CARAS_DADO = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const META_VICTORIA = 500000000;

// Multiplicador de los beneficios de eventos positivos (+10%)
const BONUS_BENEFICIOS = 1.10;

// Refuerzo extra a TODOS los eventos positivos (+20%), para aliviar la dificultad (sobre todo en 2 jugadores)
const BOOST_POSITIVOS = 1.20;

// Logros: se desbloquean una sola vez cuando check(j) da true. patrimonio() usa calcularPatrimonio (global en runtime).
const LOGROS = [
  { id: "empresa1",   emoji: "🏢", titulo: "Primera empresa",            check: j => j.empresas.length >= 1 },
  { id: "propiedad1", emoji: "🏠", titulo: "Primera propiedad",          check: j => j.propiedades.length >= 1 },
  { id: "inversion1", emoji: "📈", titulo: "Primera inversión",          check: j => j.acciones.length >= 1 },
  { id: "prestamo1",  emoji: "🏦", titulo: "Primer préstamo",            check: j => j.prestamos.length >= 1 },
  { id: "seguro1",    emoji: "🛡️", titulo: "Asegurado",                  check: j => !!j.seguro },
  { id: "millon",     emoji: "💵", titulo: "Primer millón",              check: j => calcularPatrimonio(j) >= 1000000 },
  { id: "ri",         emoji: "🏛️", titulo: "Responsable Inscripto",      check: j => j._estadoImpositivo === "Responsable Inscripto" },
  { id: "imperio",    emoji: "🚀", titulo: "Pequeño imperio (5 empresas)", check: j => j.empresas.length >= 5 },
  { id: "multi",      emoji: "💰", titulo: "Multimillonario ($100M)",    check: j => calcularPatrimonio(j) >= 100000000 }
];
