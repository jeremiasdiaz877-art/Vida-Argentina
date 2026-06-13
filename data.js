// ==================== DATOS DEL JUEGO ====================
// Calendario: cada turno = 1 mes, arrancando en enero 2020
const ANIO_INICIO = 2020;
const MES_INICIO = 0; // 0 = enero
const MESES_NOMBRE = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_POR_ANIO_CARRERA = 3; // cada año de carrera dura 3 turnos

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
  { emoji: "🏦", titulo: "Reintegro de Ganancias", desc: "AFIP te devolvió retenciones de más. ¡Plata que vuelve!", impacto: (s) => 130000, tipo: "pos" },
  { emoji: "🎉", titulo: "Ganaste el Quini 6", desc: "¡Acertaste varios números! Un golpe de suerte enorme.", impacto: (s) => 350000, tipo: "pos" },
  { emoji: "💳", titulo: "Reintegro de la tarjeta", desc: "Promo bancaria y cashback: te devolvieron un montón en compras.", impacto: (s) => 60000, tipo: "pos" },
  { emoji: "🚀", titulo: "Tu emprendimiento despegó", desc: "Un proyecto propio empezó a facturar fuerte este mes.", impacto: (s) => 240000, tipo: "pos" },
  { emoji: "🤑", titulo: "Cliente grande", desc: "Cerraste un contrato importante. Entró un buen adelanto.", impacto: (s) => Math.round(s * 0.11), tipo: "pos" },
  { emoji: "🏅", titulo: "Bono por productividad", desc: "El equipo cumplió los objetivos y repartieron premios.", impacto: (s) => 110000, tipo: "pos" },
  { emoji: "🧾", titulo: "IVA a favor", desc: "Te quedó saldo a favor de IVA en ARCA. ¡Plata que vuelve!", impacto: (s) => 90000, tipo: "pos" },
  { emoji: "📋", titulo: "Reintegro de percepciones", desc: "Te devolvieron percepciones que te habían cobrado de más.", impacto: (s) => 70000, tipo: "pos" },
  { emoji: "🪙", titulo: "Saldo a favor liberado", desc: "ARCA te liberó un crédito fiscal acumulado.", impacto: (s) => 100000, tipo: "pos" },
  // NEGATIVOS
  { emoji: "💥", titulo: "Devaluación del peso", desc: "El gobierno devaluó. Tus pesos perdieron poder adquisitivo.", impacto: (s) => -Math.round(s * 0.12), tipo: "neg" },
  { emoji: "🚨", titulo: "Multa de AFIP", desc: "Te llegó una intimación de AFIP. Facturaste de más sin declarar.", impacto: (s) => -150000, tipo: "neg" },
  { emoji: "🏥", titulo: "Gasto médico imprevisto", desc: "Una enfermedad o accidente te generó gastos médicos.", impacto: (s) => -200000, tipo: "neg" },
  { emoji: "🚗", titulo: "Choque de auto", desc: "Tuviste un accidente. El seguro no cubrió todo.", impacto: (s) => -180000, tipo: "neg" },
  { emoji: "🔥", titulo: "Robo en casa", desc: "Te robaron. Perdiste cosas de valor y pagaste el arreglo.", impacto: (s) => -250000, tipo: "neg" },
  { emoji: "📉", titulo: "Crisis política", desc: "La inestabilidad política afectó tu negocio o inversiones.", impacto: (s) => -Math.round(s * 0.08), tipo: "neg" },
  { emoji: "🌡️", titulo: "Inflación récord", desc: "Los precios subieron más que tu sueldo. Tu poder de compra cayó.", impacto: (s) => -Math.round(s * 0.10), tipo: "neg" },
  { emoji: "🏦", titulo: "Cepo cambiario", desc: "El gobierno restringió el acceso al dólar. Perdiste en el blue.", impacto: (s) => -100000, tipo: "neg" },
  { emoji: "⚡", titulo: "Tarifazo de servicios", desc: "Subieron luz, gas y agua. Tus gastos fijos pegaron el salto.", impacto: (s) => -80000, tipo: "neg" },
  { emoji: "🏚️", titulo: "Alquiler aumentó", desc: "Tu propietario aplicó el ajuste por inflación. Pagás más.", impacto: (s) => -90000, tipo: "neg" },
  { emoji: "📊", titulo: "Huelga en tu sector", desc: "Hubo un paro. No cobraste completo este mes.", impacto: (s) => -Math.round(s * 0.15), tipo: "neg" },
  { emoji: "🌊", titulo: "Inundación", desc: "Tu zona sufrió inundaciones. Gastos de reparación y pérdidas.", impacto: (s) => -220000, tipo: "neg" },
  { emoji: "💳", titulo: "Deuda de tarjeta", desc: "Las cuotas se acumularon. Este mes pagás más de lo esperado.", impacto: (s) => -120000, tipo: "neg" },
  { emoji: "🏢", titulo: "Despido", desc: "Te echaron del trabajo. Cobrás indemnización pero perdés ingreso.", impacto: (s) => -Math.round(s * 0.20), tipo: "neg" },
  { emoji: "🦠", titulo: "Pandemia / Cuarentena", desc: "Restricciones afectaron tu actividad. Ingresos reducidos.", impacto: (s) => -Math.round(s * 0.18), tipo: "neg" },
  { emoji: "📰", titulo: "Corralito bancario", desc: "El banco frenó los retiros. No podés acceder a tu plata.", impacto: (s) => -Math.round(s * 0.25), tipo: "neg" },
  { emoji: "🧾", titulo: "Pago de IVA", desc: "Liquidaste el IVA del mes y tocó pagarle a ARCA.", impacto: (s) => -110000, tipo: "neg" },
  { emoji: "📑", titulo: "Ingresos Brutos (IIBB)", desc: "Pagaste Ingresos Brutos provinciales este mes.", impacto: (s) => -80000, tipo: "neg" },
  { emoji: "🏛️", titulo: "Anticipo de Ganancias", desc: "ARCA te cobró un anticipo del impuesto a las Ganancias.", impacto: (s) => -130000, tipo: "neg" },
  { emoji: "💼", titulo: "Retención impositiva", desc: "Un cliente te retuvo impuestos al pagarte.", impacto: (s) => -60000, tipo: "neg" }
];

// Acciones: precio inicial, volatilidad (cuánto se mueve por turno) y drift (tendencia leve)
const ACCIONES = [
  { nombre: "YPF", emoji: "⛽", tipo: "accion", precio: 150000, volatilidad: 0.15, drift: 0.008 },
  { nombre: "Banco Galicia", emoji: "🏦", tipo: "accion", precio: 120000, volatilidad: 0.12, drift: 0.007 },
  { nombre: "Mercado Libre", emoji: "🛒", tipo: "accion", precio: 400000, volatilidad: 0.20, drift: 0.012 },
  { nombre: "Grupo Clarín", emoji: "📰", tipo: "accion", precio: 80000, volatilidad: 0.10, drift: 0.005 },
  { nombre: "Loma Negra", emoji: "🏗️", tipo: "accion", precio: 100000, volatilidad: 0.11, drift: 0.006 },
  { nombre: "Pampa Energía", emoji: "⚡", tipo: "accion", precio: 180000, volatilidad: 0.16, drift: 0.009 }
];

// FCI (Fondos Comunes de Inversión): menos volátiles que las acciones, con tendencia positiva
const FCI = [
  { nombre: "FCI Money Market", emoji: "💵", tipo: "fci", precio: 100000, volatilidad: 0.02, drift: 0.006 },
  { nombre: "FCI Renta Fija", emoji: "📃", tipo: "fci", precio: 100000, volatilidad: 0.04, drift: 0.008 },
  { nombre: "FCI Renta Variable", emoji: "📊", tipo: "fci", precio: 150000, volatilidad: 0.09, drift: 0.011 },
  { nombre: "FCI Dólar (Cobertura)", emoji: "💲", tipo: "fci", precio: 120000, volatilidad: 0.06, drift: 0.010 }
];

// Lista combinada de instrumentos del mercado
const INSTRUMENTOS = ACCIONES.concat(FCI);

const EMPRESAS = [
  { nombre: "Kiosco", emoji: "🏪", precio: 1500000, retornoPorTurno: 28000, descripcion: "Negocio simple y estable" },
  { nombre: "Panadería", emoji: "🥐", precio: 2400000, retornoPorTurno: 45500, descripcion: "Demanda constante" },
  { nombre: "Consultora", emoji: "💼", precio: 3600000, retornoPorTurno: 70000, descripcion: "Clientes corporativos" },
  { nombre: "Farmacia", emoji: "💊", precio: 6000000, retornoPorTurno: 112000, descripcion: "Alta rentabilidad" },
  { nombre: "Franquicia de comida", emoji: "🍔", precio: 10500000, retornoPorTurno: 196000, descripcion: "Marca reconocida" },
  { nombre: "Empresa de tecnología", emoji: "💻", precio: 18000000, retornoPorTurno: 350000, descripcion: "Alto crecimiento" },
  { nombre: "Shopping", emoji: "🏬", precio: 120000000, retornoPorTurno: 2600000, descripcion: "Centro comercial gigante" }
];

const PROPIEDADES = [
  { nombre: "Departamento 1 amb.", emoji: "🏠", precio: 2000000, alquilerPorTurno: 80000, descripcion: "Centro de ciudad" },
  { nombre: "Casa en barrio", emoji: "🏡", precio: 3500000, alquilerPorTurno: 130000, descripcion: "Tranquila y amplia" },
  { nombre: "Local comercial", emoji: "🏪", precio: 5000000, alquilerPorTurno: 200000, descripcion: "Zona de alto tráfico" },
  { nombre: "PH con jardín", emoji: "🏘️", precio: 7000000, alquilerPorTurno: 280000, descripcion: "Lujo accesible" },
  { nombre: "Edificio de departamentos", emoji: "🏢", precio: 20000000, alquilerPorTurno: 800000, descripcion: "Inversión grande" },
  { nombre: "Super Edificio", emoji: "🏙️", precio: 140000000, alquilerPorTurno: 6000000, descripcion: "Torre premium de lujo" }
];

// Cada banco tiene su propia tasa mensual, monto máximo, plazos y beneficio
const BANCOS = [
  { nombre: "Banco Nación", emoji: "🏛️", tasa: 0.010, maximo: 30000000, cuotas: [12, 24, 36], beneficio: "El interés más bajo (1.0%/mes)" },
  { nombre: "Banco Provincia", emoji: "🏦", tasa: 0.015, maximo: 60000000, cuotas: [12, 24], beneficio: "Presta los montos más altos" },
  { nombre: "Banco Galicia", emoji: "🔵", tasa: 0.018, maximo: 40000000, cuotas: [12, 24, 36, 48], beneficio: "Hasta 48 meses para devolver" },
  { nombre: "Brubank", emoji: "📲", tasa: 0.025, maximo: 15000000, cuotas: [6, 12], beneficio: "No te exige patrimonio: presta igual", ignoraPatrimonio: true },
  { nombre: "Mercado Pago", emoji: "💳", tasa: 0.030, maximo: 8000000, cuotas: [3, 6, 12], beneficio: "Adelanto rápido para emergencias" }
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
const META_VICTORIA = 1000000000;

// Multiplicador de los beneficios de eventos positivos (+10%)
const BONUS_BENEFICIOS = 1.10;
