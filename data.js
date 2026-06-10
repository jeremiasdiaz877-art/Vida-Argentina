// ==================== DATOS DEL JUEGO ====================
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
  { emoji: "📰", titulo: "Corralito bancario", desc: "El banco frenó los retiros. No podés acceder a tu plata.", impacto: (s) => -Math.round(s * 0.25), tipo: "neg" }
];

const ACCIONES = [
  { nombre: "YPF", emoji: "⛽", precio: 150000, retorno: 0.08, volatilidad: 0.15 },
  { nombre: "Banco Galicia", emoji: "🏦", precio: 120000, retorno: 0.07, volatilidad: 0.12 },
  { nombre: "Mercado Libre", emoji: "🛒", precio: 400000, retorno: 0.12, volatilidad: 0.20 },
  { nombre: "Grupo Clarín", emoji: "📰", precio: 80000, retorno: 0.05, volatilidad: 0.10 },
  { nombre: "Loma Negra", emoji: "🏗️", precio: 100000, retorno: 0.06, volatilidad: 0.11 },
  { nombre: "Pampa Energía", emoji: "⚡", precio: 180000, retorno: 0.09, volatilidad: 0.16 }
];

const EMPRESAS = [
  { nombre: "Kiosco", emoji: "🏪", precio: 1500000, retornoPorTurno: 28000, descripcion: "Negocio simple y estable" },
  { nombre: "Panadería", emoji: "🥐", precio: 2400000, retornoPorTurno: 45500, descripcion: "Demanda constante" },
  { nombre: "Consultora", emoji: "💼", precio: 3600000, retornoPorTurno: 70000, descripcion: "Clientes corporativos" },
  { nombre: "Farmacia", emoji: "💊", precio: 6000000, retornoPorTurno: 112000, descripcion: "Alta rentabilidad" },
  { nombre: "Franquicia de comida", emoji: "🍔", precio: 10500000, retornoPorTurno: 196000, descripcion: "Marca reconocida" },
  { nombre: "Empresa de tecnología", emoji: "💻", precio: 18000000, retornoPorTurno: 350000, descripcion: "Alto crecimiento" }
];

const PROPIEDADES = [
  { nombre: "Departamento 1 amb.", emoji: "🏠", precio: 2000000, alquilerPorTurno: 80000, descripcion: "Centro de ciudad" },
  { nombre: "Casa en barrio", emoji: "🏡", precio: 3500000, alquilerPorTurno: 130000, descripcion: "Tranquila y amplia" },
  { nombre: "Local comercial", emoji: "🏪", precio: 5000000, alquilerPorTurno: 200000, descripcion: "Zona de alto tráfico" },
  { nombre: "PH con jardín", emoji: "🏘️", precio: 7000000, alquilerPorTurno: 280000, descripcion: "Lujo accesible" },
  { nombre: "Edificio de departamentos", emoji: "🏢", precio: 20000000, alquilerPorTurno: 800000, descripcion: "Inversión grande" }
];

const BANCOS = [
  { nombre: "Banco Nación", emoji: "🏛️", tasa: 0.045, maximo: 5000000, cuotas: [6, 12, 24] },
  { nombre: "Banco Provincia", emoji: "🏦", tasa: 0.05, maximo: 3000000, cuotas: [6, 12, 18] },
  { nombre: "Mercado Pago", emoji: "📱", tasa: 0.075, maximo: 800000, cuotas: [3, 6, 12] }
];

const CARAS_DADO = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const META_VICTORIA = 1000000000;
