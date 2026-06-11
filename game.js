// ==================== ESTADO DEL JUEGO ====================
let estado = {
  jugadores: [],
  jugadorActual: 0,
  ronda: 1,
  fase: "inicio",
  setupJugadorIdx: 0,
  setupPaso: 0,
  provinciaSeleccionada: null,
  numJugadores: 1,
  codigoSala: null,
  modoOnline: false
};

// ==================== UTILIDADES ====================
function fmt(n) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function mostrarPantalla(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function cerrarModal(id) {
  document.getElementById(id).style.display = "none";
}

const CVU_APOYO = "4530000800011940107746";
const TITULAR_APOYO = "Jeremias Joel Diaz";

function abrirCafecito() {
  document.getElementById("modal-apoyar").style.display = "flex";
}

function copiarCVU() {
  const onOk = () => alert("✅ CVU copiado al portapapeles");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(CVU_APOYO).then(onOk).catch(() => {
      prompt("Copiá el CVU manualmente:", CVU_APOYO);
    });
  } else {
    prompt("Copiá el CVU manualmente:", CVU_APOYO);
  }
}

// ==================== SALA ONLINE ====================
function irASala() {
  mostrarPantalla("pantalla-sala");
}

function cambiarTab(tab) {
  document.querySelectorAll(".sala-tab-btn").forEach((b, i) => {
    b.classList.toggle("active", (tab === "crear" && i === 0) || (tab === "unirse" && i === 1));
  });
  document.getElementById("tab-crear").classList.toggle("active", tab === "crear");
  document.getElementById("tab-unirse").classList.toggle("active", tab === "unirse");
}

let salaJugadores = [];
let intervalSala = null;

function crearSala() {
  const nombre = document.getElementById("sala-nombre-host").value.trim();
  if (!nombre) { alert("Ingresá tu nombre"); return; }
  const avatar = document.getElementById("sala-avatar-host").value;
  const codigo = generarCodigo();
  estado.codigoSala = codigo;
  estado.modoOnline = true;
  salaJugadores = [{ nombre, avatar, listo: true, esHost: true }];
  document.getElementById("codigo-sala-display").textContent = codigo;
  document.getElementById("sala-creada").style.display = "block";
  actualizarEsperaJugadores();
  // Simular que se pueden unir (en prod necesitaría backend real)
  intervalSala = setInterval(() => {
    actualizarBtnIniciar();
  }, 500);
}

function actualizarEsperaJugadores() {
  const lista = document.getElementById("espera-jugadores-lista");
  lista.innerHTML = salaJugadores.map((j, i) =>
    `<div class="espera-jugador">
      <div class="espera-status status-listo"></div>
      <span style="font-size:24px;">${j.avatar}</span>
      <span style="font-weight:600;">${j.nombre}</span>
      ${j.esHost ? '<span style="font-size:11px;background:#cce5ff;color:#004085;padding:2px 8px;border-radius:6px;margin-left:auto;">Anfitrión</span>' : ''}
    </div>`
  ).join("");
}

function actualizarBtnIniciar() {
  const btn = document.getElementById("btn-iniciar-sala");
  if (salaJugadores.length >= 2) {
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

function unirseSala() {
  const codigo = document.getElementById("codigo-ingresado").value.trim().toUpperCase();
  const nombre = document.getElementById("sala-nombre-guest").value.trim();
  if (!codigo || codigo.length !== 6) { alert("Ingresá el código de 6 caracteres"); return; }
  if (!nombre) { alert("Ingresá tu nombre"); return; }
  if (!estado.codigoSala || codigo !== estado.codigoSala) {
    alert("Código de sala no encontrado. Pedile al anfitrión el código correcto.");
    return;
  }
  const avatar = document.getElementById("sala-avatar-guest").value;
  salaJugadores.push({ nombre, avatar, listo: true, esHost: false });
  actualizarEsperaJugadores();
  actualizarBtnIniciar();
  document.getElementById("sala-unido").style.display = "block";
  const listaGuest = document.getElementById("espera-jugadores-lista-guest");
  listaGuest.innerHTML = `<div class="espera-jugador"><div class="espera-status status-listo"></div><span style="font-size:24px;">${avatar}</span><span style="font-weight:600;">${nombre} (vos)</span></div>`;
  alert(`¡Te uniste a la sala! Esperá que el anfitrión inicie la partida.\n\nJugadores en sala: ${salaJugadores.length}`);
}

function iniciarSalaOnline() {
  if (intervalSala) clearInterval(intervalSala);
  estado.jugadores = salaJugadores.map(j => crearJugadorBase(j.nombre, j.avatar));
  // Ir directo al setup para configurar carrera/ciudad
  estado.numJugadores = salaJugadores.length;
  estado.setupJugadorIdx = 0;
  estado.setupPaso = 0;
  iniciarSetup();
}

// ==================== CONFIGURAR JUGADORES LOCAL ====================
function irAJugadores() {
  mostrarPantalla("pantalla-jugadores");
  document.getElementById("num-jugadores").textContent = estado.numJugadores;
  renderizarJugadoresConfig();
}

function cambiarJugadores(delta) {
  estado.numJugadores = Math.max(1, Math.min(7, estado.numJugadores + delta));
  document.getElementById("num-jugadores").textContent = estado.numJugadores;
  renderizarJugadoresConfig();
}

const AVATARES = ["👨‍💼", "👩‍💼", "👨‍🔧", "👩‍🔬", "👨‍🌾", "👩‍🎨", "🧑‍💻", "👨‍🍳"];

function renderizarJugadoresConfig() {
  const lista = document.getElementById("jugadores-lista");
  lista.innerHTML = "";
  for (let i = 0; i < estado.numJugadores; i++) {
    const j = document.createElement("div");
    j.className = "jugador-card";
    j.innerHTML = `
      <div style="flex:1;">
        <div class="jugador-num">Jugador ${i + 1}</div>
        <div class="avatares" id="avatares-${i}">
          ${AVATARES.map((a, ai) => `<span class="avatar-opt ${ai===i%AVATARES.length?'selected':''}" onclick="selectAvatar(${i},${ai})">${a}</span>`).join("")}
        </div>
      </div>
      <input class="nombre-input" id="nombre-j${i}" placeholder="Nombre..." maxlength="12" value="Jugador ${i+1}">
    `;
    lista.appendChild(j);
  }
}

function selectAvatar(jugIdx, avIdx) {
  const container = document.getElementById(`avatares-${jugIdx}`);
  container.querySelectorAll(".avatar-opt").forEach((a, i) => a.classList.toggle("selected", i === avIdx));
}

function getAvatarSeleccionado(jugIdx) {
  const container = document.getElementById(`avatares-${jugIdx}`);
  const selected = container.querySelector(".avatar-opt.selected");
  return selected ? selected.textContent : AVATARES[jugIdx % AVATARES.length];
}

function irASetup() {
  estado.jugadores = [];
  for (let i = 0; i < estado.numJugadores; i++) {
    const nombre = document.getElementById(`nombre-j${i}`).value.trim() || `Jugador ${i+1}`;
    const avatar = getAvatarSeleccionado(i);
    estado.jugadores.push(crearJugadorBase(nombre, avatar));
  }
  estado.setupJugadorIdx = 0;
  estado.setupPaso = 0;
  iniciarSetup();
}

function crearJugadorBase(nombre, avatar) {
  return {
    nombre, avatar,
    saldo: 600000,
    sueldo: 0,
    edad: 18,
    meses: 0,
    provincia: null,
    ciudad: null,
    carrera: null,
    enCarrera: false,
    añosCarrera: 0,
    mesesCarrera: 0,
    prestamos: [],
    acciones: [],
    empresas: [],
    propiedades: [],
    eliminado: false,
    gastoBase: 0
  };
}

// ==================== SETUP POR JUGADOR ====================
function iniciarSetup() {
  mostrarPantalla("pantalla-setup");
  renderizarSetup();
}

function renderizarSetup() {
  const j = estado.jugadores[estado.setupJugadorIdx];
  document.getElementById("setup-avatar").textContent = j.avatar;
  document.getElementById("setup-nombre").textContent = j.nombre;

  const totalPasos = 2;
  const progHTML = Array.from({length: totalPasos}, (_, i) =>
    `<div class="setup-dot ${i <= estado.setupPaso ? "active" : ""}"></div>`
  ).join("");
  document.getElementById("setup-progress").innerHTML = progHTML;

  const contenido = document.getElementById("setup-contenido");

  if (estado.setupPaso === 0) {
    document.getElementById("setup-paso").textContent = "Elegí dónde vas a vivir";
    if (estado.provinciaSeleccionada === null) {
      contenido.innerHTML = `
        <p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">📍 Provincia</p>
        ${PROVINCIAS.map((p, i) => `
          <div class="opcion-card" onclick="seleccionarProvincia(${i})">
            <div>
              <div class="opcion-nombre">${p.nombre}</div>
            </div>
            <span style="font-size:12px;color:var(--gris-dark);">${p.ciudades.length} ciudad${p.ciudades.length>1?"es":""}</span>
          </div>
        `).join("")}
      `;
    } else {
      const prov = PROVINCIAS[estado.provinciaSeleccionada];
      contenido.innerHTML = `
        <button class="back-btn" onclick="volverProvincias()">← ${prov.nombre}</button>
        <p style="font-size:13px;color:var(--azul);font-weight:600;margin-bottom:12px;">Elegí tu ciudad</p>
        ${prov.ciudades.map((c, i) => `
          <div class="opcion-card" onclick="seleccionarCiudad(${i})">
            <div>
              <div class="opcion-nombre">${c.nombre}</div>
            </div>
            <div style="text-align:right;">
              ${c.bonusSueldo > 0 ? `<span class="opcion-badge badge-verde">+${Math.round(c.bonusSueldo*100)}% sueldo</span>` : ""}
              <div style="font-size:11px;color:var(--gris-dark);margin-top:2px;">${c.costoVida}x costo</div>
            </div>
          </div>
        `).join("")}
      `;
    }
  } else if (estado.setupPaso === 1) {
    document.getElementById("setup-paso").textContent = "Elegí tu carrera";
    const ciudad = j.ciudad || (estado.provinciaSeleccionada !== null
      ? PROVINCIAS[estado.provinciaSeleccionada].ciudades[j._ciudadIdx || 0]
      : null);
    contenido.innerHTML = `
      <button class="back-btn" onclick="volverACiudad()">← Cambiar provincia / ciudad</button>
      ${ciudad ? `<p style="font-size:13px;color:var(--azul);font-weight:600;margin-bottom:12px;">📍 ${ciudad.nombre}, ${j.provincia}</p>` : ""}
      ${CARRERAS.map((c, i) => {
        const sueldoFinal = Math.round(c.sueldo * (1 + (ciudad ? ciudad.bonusSueldo : 0)));
        return `
          <div class="opcion-card" onclick="seleccionarCarrera(${i})">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-size:20px;">${c.emoji}</span>
                <span class="opcion-nombre">${c.nombre}</span>
              </div>
              <div class="opcion-detail">⏱ ${c.duracion > 0 ? c.duracion + " años" : "Ya"} • 💵 ${fmt(sueldoFinal)}/mes</div>
              <div class="opcion-detail" style="color:#6c757d;">${c.descripcion}</div>
            </div>
            ${c.costo > 0 ? `<span class="opcion-badge badge-rojo">Cuota: ${fmt(c.costo)}</span>` : ""}
          </div>
        `;
      }).join("")}
    `;
  }
}

function seleccionarProvincia(idx) {
  estado.provinciaSeleccionada = idx;
  renderizarSetup();
}

function volverProvincias() {
  estado.provinciaSeleccionada = null;
  renderizarSetup();
}

function volverACiudad() {
  // Volver desde "Elegí tu carrera" a la selección de provincia/ciudad
  estado.setupPaso = 0;
  estado.provinciaSeleccionada = null;
  renderizarSetup();
}

function seleccionarCiudad(idx) {
  const j = estado.jugadores[estado.setupJugadorIdx];
  j.provincia = PROVINCIAS[estado.provinciaSeleccionada].nombre;
  j.ciudad = PROVINCIAS[estado.provinciaSeleccionada].ciudades[idx];
  j._ciudadIdx = idx;
  estado.setupPaso = 1;
  estado.provinciaSeleccionada = null;
  renderizarSetup();
}

function seleccionarCarrera(idx) {
  const j = estado.jugadores[estado.setupJugadorIdx];
  const carrera = CARRERAS[idx];
  const bonusSueldo = j.ciudad ? j.ciudad.bonusSueldo : 0;
  const costoVida = j.ciudad ? j.ciudad.costoVida : 1;
  j.carrera = carrera;
  j.sueldo = Math.round(carrera.sueldo * (1 + bonusSueldo));
  // Gastos fijos = 60% del sueldo mensual (una vez recibido)
  j.gastoBase = Math.round(j.sueldo * 0.6);
  j._costoVida = costoVida;
  j.enCarrera = carrera.duracion > 0;
  j.añosCarrera = 0;
  j.mesesCarrera = 0;

  estado.setupJugadorIdx++;
  estado.provinciaSeleccionada = null;
  estado.setupPaso = 0;

  if (estado.setupJugadorIdx >= estado.jugadores.length) {
    iniciarJuego();
  } else {
    renderizarSetup();
  }
}

// ==================== JUEGO ====================
function iniciarJuego() {
  estado.jugadorActual = 0;
  estado.ronda = 1;
  initMercado();
  mostrarPantalla("pantalla-juego");
  actualizarHUD();
  actualizarTurno();
}

// ==================== MERCADO (precios que fluctúan) ====================
function initMercado() {
  estado.precios = {};
  estado.preciosPrev = {};
  INSTRUMENTOS.forEach(inst => {
    estado.precios[inst.nombre] = inst.precio;
    estado.preciosPrev[inst.nombre] = inst.precio;
  });
}

function getPrecio(nombre) {
  if (estado.precios && estado.precios[nombre] != null) return estado.precios[nombre];
  const inst = INSTRUMENTOS.find(i => i.nombre === nombre);
  return inst ? inst.precio : 0;
}

function getInstrumento(nombre) {
  return INSTRUMENTOS.find(i => i.nombre === nombre);
}

// Dibuja el panel lateral del mercado (subas y bajas en vivo)
function actualizarMercadoPanel() {
  const panel = document.getElementById("mercado-panel");
  if (!panel) return;
  if (!estado.precios) initMercado();

  const fila = (inst) => {
    const actual = getPrecio(inst.nombre);
    const prev = (estado.preciosPrev && estado.preciosPrev[inst.nombre]) || actual;
    const pct = prev ? ((actual - prev) / prev) * 100 : 0;
    const col = pct > 0.01 ? "var(--verde)" : pct < -0.01 ? "var(--rojo)" : "var(--gris-dark)";
    const fl = pct > 0.01 ? "▲" : pct < -0.01 ? "▼" : "＝";
    return `<div class="mercado-fila">
      <span>${inst.emoji} ${inst.nombre}</span>
      <span style="text-align:right;">
        <div style="font-weight:600;">${fmt(actual)}</div>
        <div style="color:${col};font-size:11px;">${fl} ${Math.abs(pct).toFixed(1)}%</div>
      </span>
    </div>`;
  };

  panel.innerHTML = `
    <div style="font-weight:800;color:var(--azul);margin-bottom:2px;">📊 Mercado</div>
    <div style="font-size:11px;color:var(--gris-dark);">Variación del último mes</div>
    <div class="mercado-cat">Acciones</div>
    ${ACCIONES.map(fila).join("")}
    <div class="mercado-cat">FCI — Fondos Comunes</div>
    ${FCI.map(fila).join("")}
  `;
}

// Cada turno mueve el mercado con una caminata aleatoria (random walk)
function actualizarMercado() {
  if (!estado.precios) initMercado();
  INSTRUMENTOS.forEach(inst => {
    const actual = estado.precios[inst.nombre];
    estado.preciosPrev[inst.nombre] = actual;
    const cambio = (inst.drift || 0) + (Math.random() * 2 - 1) * inst.volatilidad;
    let nuevo = Math.round(actual * (1 + cambio));
    // Límites para evitar valores absurdos (entre 25% y 600% del precio base)
    nuevo = Math.max(Math.round(inst.precio * 0.25), Math.min(Math.round(inst.precio * 6), nuevo));
    estado.precios[inst.nombre] = nuevo;
  });
}

function actualizarHUD() {
  const hud = document.getElementById("jugadores-hud");
  hud.innerHTML = estado.jugadores.map((j, i) => `
    <div class="jugador-hud ${i === estado.jugadorActual ? "activo" : ""}" onclick="verFinanzas(${i})">
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="hud-avatar">${j.avatar}</span>
        <span class="hud-nombre">${j.nombre}</span>
      </div>
      <div class="hud-saldo">${fmt(j.saldo)}</div>
    </div>
  `).join("");
}

// Devuelve la fecha (mes y año) según los meses transcurridos del jugador
function fechaJugador(j) {
  const total = MES_INICIO + (j.meses || 0);
  const anio = ANIO_INICIO + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const nombreMes = MESES_NOMBRE[mes].charAt(0).toUpperCase() + MESES_NOMBRE[mes].slice(1);
  return `${nombreMes} ${anio}`;
}

function actualizarTurno() {
  const j = estado.jugadores[estado.jugadorActual];
  document.getElementById("turno-avatar").textContent = j.avatar;
  document.getElementById("turno-nombre").textContent = j.nombre;
  document.getElementById("turno-info-sub").textContent = `📅 ${fechaJugador(j)} • Edad: ${j.edad} años`;
  document.getElementById("btn-tirar").style.display = "flex";
  document.getElementById("btn-siguiente").style.display = "none";
  document.getElementById("dado-display").textContent = "⚀";
  actualizarMercadoPanel();
}

function tirarDado() {
  const dado = document.getElementById("dado-display");
  dado.classList.add("girando");
  document.getElementById("btn-tirar").style.display = "none";

  setTimeout(() => {
    dado.classList.remove("girando");
    const resultado = Math.floor(Math.random() * 6) + 1;
    dado.textContent = CARAS_DADO[resultado - 1];
    procesarTurno(resultado);
  }, 600);
}

function procesarTurno(dado) {
  const j = estado.jugadores[estado.jugadorActual];

  // Pasa un mes
  j.meses = (j.meses || 0) + 1;
  j.edad = 18 + Math.floor(j.meses / 12);

  // 1) Sueldo (completo si ya recibido, 30% mientras estudia)
  let ingresoSueldo = 0;
  if (!j.enCarrera) {
    ingresoSueldo = j.sueldo;
  } else {
    j.mesesCarrera = (j.mesesCarrera || 0) + 1;
    j.añosCarrera = Math.floor(j.mesesCarrera / MESES_POR_ANIO_CARRERA);
    if (j.mesesCarrera >= j.carrera.duracion * MESES_POR_ANIO_CARRERA) {
      j.enCarrera = false;
    }
    ingresoSueldo = Math.round(j.sueldo * 0.3);
  }

  // 2) Retorno de empresas
  let retornoEmpresa = 0;
  j.empresas.forEach(e => { retornoEmpresa += e.retornoPorTurno; });

  // 3) Alquiler de propiedades (NO entra en la base de Ganancias)
  let alquiler = 0;
  j.propiedades.forEach(p => { alquiler += p.alquilerPorTurno; });

  // 4) Gastos fijos = 60% del ingreso por sueldo de este turno
  const gastosFijos = Math.round(ingresoSueldo * 0.6);

  // 5) Préstamos: interés mensual (1.5% del monto pedido) + amortización del capital
  let interesPrestamos = 0;
  let amortizacion = 0;
  j.prestamos.forEach(p => {
    const interes = Math.round(p.monto * p.tasaMensual);
    const capital = Math.min(p.cuotaPrincipal, p.principal);
    interesPrestamos += interes;
    amortizacion += capital;
    p.principal -= capital;
  });
  j.prestamos = j.prestamos.filter(p => p.principal > 0.5);
  const cuotaTotal = interesPrestamos + amortizacion;

  // 6) Costo de carrera mientras estudia
  const costoCarrera = (j.enCarrera && j.carrera.costo > 0) ? j.carrera.costo : 0;

  // 7) El mercado se mueve este mes (precios de acciones y FCI)
  actualizarMercado();
  actualizarMercadoPanel();

  const saldoAntes = j.saldo;
  const ingresado = ingresoSueldo + retornoEmpresa + alquiler;
  const gastos = gastosFijos + cuotaTotal + costoCarrera;
  j.saldo += ingresado - gastos;

  // Acumular para el Impuesto a las Ganancias semestral
  j._acumIngresos = (j._acumIngresos || 0) + ingresoSueldo + retornoEmpresa + alquiler;
  j._acumPrestamos = (j._acumPrestamos || 0) + interesPrestamos + amortizacion;

  // Evento aleatorio (60% probabilidad)
  let evento = null, impactoEvento = 0;
  if (Math.random() < 0.6) {
    evento = EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
    impactoEvento = evento.impacto(j.saldo);
    // Los beneficios (eventos positivos) rinden un 10% más
    if (impactoEvento > 0) impactoEvento = Math.round(impactoEvento * BONUS_BENEFICIOS);
    j.saldo += impactoEvento;
  }

  // Impuesto a las Ganancias cada 6 meses (escala progresiva)
  let impuesto = 0, baseImpuesto = 0, tasaImp = 0;
  if (j.meses % 6 === 0) {
    baseImpuesto = (j._acumIngresos || 0) - (j._acumPrestamos || 0);
    tasaImp = tasaGanancias(baseImpuesto);
    impuesto = Math.round(Math.max(0, baseImpuesto) * tasaImp);
    j.saldo -= impuesto;
    j._ultimoImpuesto = impuesto;
    j._ultimaBaseImpuesto = baseImpuesto;
    j._acumIngresos = 0;
    j._acumPrestamos = 0;
  }

  // Guardar el resumen del turno para mostrarlo
  j._resumen = {
    saldoAntes, ingresoSueldo, retornoEmpresa, alquiler,
    gastosFijos, interesPrestamos, amortizacion, costoCarrera,
    evento, impactoEvento, impuesto, baseImpuesto, tasaImp, saldoDespues: j.saldo
  };

  mostrarResumenTurno(j);
}

// Escala progresiva del Impuesto a las Ganancias (sobre la base del semestre)
function tasaGanancias(base) {
  if (base < 5000000) return 0.15;
  if (base < 20000000) return 0.20;
  return 0.35;
}

// Muestra el resumen del turno (con o sin evento) y el desglose de ingresos/gastos
function mostrarResumenTurno(j) {
  const r = j._resumen;
  const cambioNeto = r.saldoDespues - r.saldoAntes;

  const linea = (label, monto, esGasto) => {
    if (!monto) return "";
    const color = esGasto ? "var(--rojo)" : "var(--verde)";
    const signo = esGasto ? "−" : "+";
    return `<tr><td style="padding:4px 0;color:var(--gris-dark);">${label}</td><td style="text-align:right;color:${color};font-weight:600;">${signo}${fmt(monto)}</td></tr>`;
  };

  let html = "";
  if (r.evento) {
    html += `
    <div class="evento-card">
      <div class="evento-emoji">${r.evento.emoji}</div>
      <div class="evento-titulo">${r.evento.titulo}</div>
      <div class="evento-desc">${r.evento.desc}</div>
      <div class="evento-impacto ${r.impactoEvento >= 0 ? "impacto-pos" : "impacto-neg"}">
        ${r.impactoEvento >= 0 ? "+" : ""}${fmt(r.impactoEvento)}
      </div>
    </div>`;
  } else {
    html += `<div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:44px;">📅</div>
      <div style="font-weight:800;color:var(--azul);font-size:18px;">Mes tranquilo</div>
      <div style="font-size:13px;color:var(--gris-dark);">No hubo eventos este turno</div>
    </div>`;
  }

  if (r.impuesto > 0) {
    html += `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;">
      <strong>🧾 Liquidación semestral de Ganancias</strong><br>
      Base del semestre (ingresos − préstamos): ${fmt(r.baseImpuesto)}<br>
      Alícuota aplicada: ${Math.round(r.tasaImp * 100)}% → pagás ${fmt(r.impuesto)}
    </div>`;
  }

  html += `<div style="background:var(--gris);border-radius:12px;padding:14px;margin-bottom:16px;">
    <p style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--azul);">📊 Resumen del turno</p>
    <table style="width:100%;font-size:14px;">
      ${linea("💵 Sueldo", r.ingresoSueldo, false)}
      ${linea("🏢 Empresas", r.retornoEmpresa, false)}
      ${linea("🏠 Alquileres", r.alquiler, false)}
      ${linea("🏠 Gastos fijos", r.gastosFijos, true)}
      ${linea("🏦 Interés préstamos (1.5%)", r.interesPrestamos, true)}
      ${linea("🏦 Amortización préstamos", r.amortizacion, true)}
      ${linea("🎓 Cuota de carrera", r.costoCarrera, true)}
      ${r.evento ? linea((r.impactoEvento >= 0 ? "🎁" : "⚠️") + " Evento", Math.abs(r.impactoEvento), r.impactoEvento < 0) : ""}
      ${r.impuesto > 0 ? linea(`🧾 Ganancias semestral (${Math.round(r.tasaImp * 100)}%)`, r.impuesto, true) : ""}
      <tr style="border-top:1px solid var(--gris-med);">
        <td style="padding:8px 0;font-weight:800;">Cambio del turno</td>
        <td style="text-align:right;font-weight:800;color:${cambioNeto >= 0 ? "var(--verde)" : "var(--rojo)"};">${cambioNeto >= 0 ? "+" : "−"}${fmt(Math.abs(cambioNeto))}</td>
      </tr>
    </table>
  </div>
  <div style="font-size:14px;color:var(--gris-dark);text-align:center;margin-bottom:12px;">
    Saldo actual: <strong>${fmt(r.saldoDespues)}</strong>
  </div>`;

  document.getElementById("evento-contenido").innerHTML = html;
  document.getElementById("modal-evento").style.display = "flex";
}

function cerrarModalEvento() {
  cerrarModal("modal-evento");
  const j = estado.jugadores[estado.jugadorActual];
  verificarQuiebra(j);
}

function verificarQuiebra(j) {
  if (j.saldo < 0) {
    const tieneActivos = j.empresas.length > 0 || j.propiedades.length > 0 || j.acciones.length > 0;
    if (tieneActivos) {
      mostrarQuiebra(j);
      return;
    } else {
      j.eliminado = true;
      alert(`💸 ${j.nombre} quedó en quiebra y fue eliminado del juego.`);
    }
  }

  verificarVictoria(j);
}

function mostrarQuiebra(j) {
  const contenido = document.getElementById("quiebra-contenido");
  let html = `<div class="quiebra-card"><strong style="color:var(--rojo);">Saldo: ${fmt(j.saldo)}</strong><br><small>Vendé activos para recuperarte</small></div>`;

  if (j.empresas.length > 0) {
    html += `<p style="font-weight:600;margin-bottom:8px;">🏢 Tus empresas:</p>`;
    html += j.empresas.map((e, i) => `
      <div class="activo-item">
        <span>${e.emoji} ${e.nombre}</span>
        <span style="color:var(--verde);font-weight:700;">${fmt(Math.round(e.precio * 0.7))}</span>
        <button class="btn btn-verde btn-sm" onclick="venderEmpresa(${i})">Vender</button>
      </div>
    `).join("");
  }

  if (j.propiedades.length > 0) {
    html += `<p style="font-weight:600;margin-bottom:8px;margin-top:12px;">🏠 Tus propiedades:</p>`;
    html += j.propiedades.map((p, i) => `
      <div class="activo-item">
        <span>${p.emoji} ${p.nombre}</span>
        <span style="color:var(--verde);font-weight:700;">${fmt(Math.round(p.precio * 0.75))}</span>
        <button class="btn btn-verde btn-sm" onclick="venderPropiedad(${i})">Vender</button>
      </div>
    `).join("");
  }

  if (j.acciones.length > 0) {
    html += `<p style="font-weight:600;margin-bottom:8px;margin-top:12px;">📈 Tus inversiones:</p>`;
    html += j.acciones.map((a, i) => `
      <div class="activo-item">
        <span>${a.emoji} ${a.nombre} x${a.cantidad}</span>
        <span style="color:var(--verde);font-weight:700;">${fmt(Math.round(getPrecio(a.nombre) * a.cantidad))}</span>
        <button class="btn btn-verde btn-sm" onclick="venderAcciones(${i})">Vender</button>
      </div>
    `).join("");
  }

  html += `<button class="btn btn-primary" onclick="continuarDespuesQuiebra()" style="margin-top:16px;">Continuar sin vender</button>`;
  contenido.innerHTML = html;
  document.getElementById("modal-quiebra").style.display = "flex";
}

function venderEmpresa(idx) {
  const j = estado.jugadores[estado.jugadorActual];
  const empresa = j.empresas[idx];
  const valor = Math.round(empresa.precio * 0.7);
  j.saldo += valor;
  j.empresas.splice(idx, 1);
  if (j.saldo >= 0) {
    cerrarModal("modal-quiebra");
    verificarVictoria(j);
  } else {
    mostrarQuiebra(j);
  }
}

function venderPropiedad(idx) {
  const j = estado.jugadores[estado.jugadorActual];
  const prop = j.propiedades[idx];
  const valor = Math.round(prop.precio * 0.75);
  j.saldo += valor;
  j.propiedades.splice(idx, 1);
  if (j.saldo >= 0) {
    cerrarModal("modal-quiebra");
    verificarVictoria(j);
  } else {
    mostrarQuiebra(j);
  }
}

function venderAcciones(idx) {
  const j = estado.jugadores[estado.jugadorActual];
  const acc = j.acciones[idx];
  const valor = Math.round(getPrecio(acc.nombre) * acc.cantidad);
  j.saldo += valor;
  j.acciones.splice(idx, 1);
  if (j.saldo >= 0) {
    cerrarModal("modal-quiebra");
    verificarVictoria(j);
  } else {
    mostrarQuiebra(j);
  }
}

function continuarDespuesQuiebra() {
  cerrarModal("modal-quiebra");
  const j = estado.jugadores[estado.jugadorActual];
  if (j.saldo < 0) {
    j.eliminado = true;
    alert(`💸 ${j.nombre} quedó en quiebra y fue eliminado del juego.`);
  }
  verificarVictoria(j);
}

function verificarVictoria(j) {
  const patrimonio = calcularPatrimonio(j);
  if (patrimonio >= META_VICTORIA) {
    mostrarVictoria(j);
    return;
  }

  const vivos = estado.jugadores.filter(x => !x.eliminado);

  // Nadie queda en pie (puede pasar en modo 1 jugador)
  if (vivos.length === 0) {
    mostrarGameOver();
    return;
  }

  // En multijugador, gana el último que queda en pie
  if (estado.jugadores.length > 1 && vivos.length === 1) {
    mostrarVictoria(vivos[0]);
    return;
  }

  actualizarHUD();
  document.getElementById("btn-siguiente").style.display = "flex";
}

function mostrarGameOver() {
  mostrarPantalla("pantalla-victoria");
  document.querySelector("#pantalla-victoria .victoria-emoji").textContent = "💸";
  document.querySelector("#pantalla-victoria .victoria-titulo").textContent = "GAME OVER";
  document.getElementById("victoria-nombre").textContent = "Quedaste en quiebra";
  document.getElementById("victoria-saldo").textContent = "No pudiste sostener tus finanzas";
  document.getElementById("ranking-final").innerHTML = "";
}

function calcularPatrimonio(j) {
  let total = j.saldo;
  j.empresas.forEach(e => total += e.precio);
  j.propiedades.forEach(p => total += p.precio);
  j.acciones.forEach(a => total += getPrecio(a.nombre) * a.cantidad);
  j.prestamos.forEach(p => total -= p.principal);
  return total;
}

function siguienteTurno() {
  do {
    estado.jugadorActual = (estado.jugadorActual + 1) % estado.jugadores.length;
    if (estado.jugadorActual === 0) estado.ronda++;
  } while (estado.jugadores[estado.jugadorActual].eliminado);

  actualizarHUD();
  actualizarTurno();
}

// ==================== VICTORIA ====================
function mostrarVictoria(ganador) {
  estado._ganador = ganador;
  const sesion = getSesion();
  if (sesion) {
    // Usuario logueado: se guarda automáticamente bajo su cuenta
    guardarGanador(sesion.nombre, calcularPatrimonio(ganador));
    mostrarPantallaVictoria(ganador);
  } else {
    document.getElementById("modal-registro").style.display = "flex";
    document.getElementById("reg-nombre").value = ganador.nombre;
  }
}

function guardarRegistro() {
  const nombre = (document.getElementById("reg-nombre").value || "").trim() || (estado._ganador ? estado._ganador.nombre : "Anónimo");
  const email = (document.getElementById("reg-email").value || "").trim();
  const patrimonio = estado._ganador ? calcularPatrimonio(estado._ganador) : 0;
  guardarGanador(nombre, patrimonio, email);
  cerrarModal("modal-registro");
  alert("✅ ¡Quedaste registrado en el Salón de la Fama!");
  mostrarPantallaVictoria(estado._ganador);
}

function saltarRegistro() {
  cerrarModal("modal-registro");
  mostrarPantallaVictoria(estado._ganador);
}

// ==================== SALÓN DE LA FAMA (ranking en localStorage) ====================
// ⚙️⚙️⚙️ CONFIGURACIÓN DE LA BASE DE DATOS (Supabase) ⚙️⚙️⚙️
// Pegá acá la URL y la clave "anon public" de tu proyecto de Supabase.
// Mientras estén en los valores de ejemplo, el ranking usa solo el dispositivo (local).
const SUPABASE_URL = "https://fbndmnooxipgjqsqxztu.supabase.co";
const SUPABASE_KEY = "sb_publishable_gptGZo6swBmtgxqA1Ya4_w_2P1fTshB";
// ⚙️⚙️⚙️ Fin de la configuración ⚙️⚙️⚙️

const RANKING_KEY = "vida_argentina_ranking";

function hayBaseDeDatos() {
  return SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("TU-PROYECTO") &&
    !SUPABASE_KEY.includes("TU-ANON");
}

// ---- Ranking local (respaldo y modo sin base de datos) ----
function leerRankingLocal() {
  try {
    const data = localStorage.getItem(RANKING_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function guardarLocal(nombre, patrimonio) {
  try {
    const ranking = leerRankingLocal();
    ranking.push({ nombre, patrimonio, fecha: new Date().toISOString() });
    ranking.sort((a, b) => b.patrimonio - a.patrimonio);
    localStorage.setItem(RANKING_KEY, JSON.stringify(ranking.slice(0, 50)));
  } catch (e) {
    console.warn("No se pudo guardar el ranking local:", e);
  }
}

// ---- Guardar un ganador (base de datos + respaldo local) ----
async function guardarGanador(nombre, patrimonio, email) {
  guardarLocal(nombre, patrimonio); // respaldo siempre
  if (!hayBaseDeDatos()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ranking`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ nombre, patrimonio })
    });
  } catch (e) {
    console.warn("No se pudo guardar en la base de datos:", e);
  }
}

// ---- Leer el ranking global desde la base de datos ----
async function obtenerRankingRemoto() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ranking?select=nombre,patrimonio,fecha&order=patrimonio.desc&limit=50`,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error("Error al leer el ranking");
  return await res.json();
}

function renderRanking(ranking, esGlobal) {
  const cont = document.getElementById("ranking-contenido");
  const posEmojis = ["🥇", "🥈", "🥉"];
  if (!ranking || ranking.length === 0) {
    cont.innerHTML = `<div style="text-align:center;color:var(--gris-dark);padding:24px 8px;">
      <div style="font-size:44px;margin-bottom:8px;">🏅</div>
      <div style="font-weight:700;color:var(--azul);">Todavía no hay ganadores</div>
      <div style="font-size:13px;margin-top:4px;">¡Ganá una partida y registrate para aparecer acá!</div>
    </div>`;
    return;
  }
  cont.innerHTML = `
    <p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">${esGlobal ? "🌍 Ranking global — mejores patrimonios" : "Mejores patrimonios (en este dispositivo)"}</p>
    ${ranking.map((g, i) => `
      <div class="ranking-item" style="max-width:none;">
        <span class="ranking-pos">${posEmojis[i] || (i + 1) + "º"}</span>
        <span class="ranking-nombre" style="flex:1;margin:0 10px;">${g.nombre}</span>
        <span class="ranking-saldo">${fmt(g.patrimonio)}</span>
      </div>
    `).join("")}`;
}

async function abrirRanking() {
  document.getElementById("modal-ranking").style.display = "flex";
  const cont = document.getElementById("ranking-contenido");
  cont.innerHTML = `<div style="text-align:center;color:var(--gris-dark);padding:24px;">⏳ Cargando ranking...</div>`;

  if (hayBaseDeDatos()) {
    try {
      const ranking = await obtenerRankingRemoto();
      renderRanking(ranking, true);
      return;
    } catch (e) {
      console.warn("Falló el ranking global, muestro el local:", e);
    }
  }
  renderRanking(leerRankingLocal(), false);
}

function borrarRanking() {
  if (!confirm("¿Borrar el historial guardado en ESTE dispositivo? (El ranking global no se toca.)")) return;
  try { localStorage.removeItem(RANKING_KEY); } catch (e) {}
  abrirRanking();
}

// ==================== CUENTAS DE USUARIO (Supabase Auth) ====================
const SESION_KEY = "vida_sesion";

function getSesion() {
  try { return JSON.parse(localStorage.getItem(SESION_KEY) || "null"); } catch (e) { return null; }
}
function setSesion(s) {
  try { localStorage.setItem(SESION_KEY, JSON.stringify(s)); } catch (e) {}
  actualizarUIAuth();
}
function cerrarSesion() {
  try { localStorage.removeItem(SESION_KEY); } catch (e) {}
  actualizarUIAuth();
  alert("Sesión cerrada. Jugás como invitado.");
}

// El usuario es un email real (Supabase valida que el dominio sea válido)
function esEmailValido(e) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

function actualizarUIAuth() {
  const cont = document.getElementById("auth-estado");
  const btn = document.getElementById("btn-auth");
  const s = getSesion();
  if (!cont) return;
  if (s) {
    cont.innerHTML = `👤 Sesión de <strong>${s.nombre}</strong> · <a href="#" onclick="cerrarSesion();return false;" style="color:var(--azul-claro);font-weight:600;">Cerrar sesión</a>`;
    if (btn) btn.style.display = "none";
  } else {
    cont.innerHTML = `Jugás como invitado`;
    if (btn) btn.style.display = "flex";
  }
}

function abrirAuth() {
  document.getElementById("auth-msg").textContent = "";
  document.getElementById("modal-auth").style.display = "flex";
}

function authTab(tab) {
  document.getElementById("auth-tab-login").classList.toggle("active", tab === "login");
  document.getElementById("auth-tab-reg").classList.toggle("active", tab === "reg");
  document.getElementById("auth-login").classList.toggle("active", tab === "login");
  document.getElementById("auth-reg").classList.toggle("active", tab === "reg");
  document.getElementById("auth-msg").textContent = "";
}

function authMsg(texto, esError) {
  const el = document.getElementById("auth-msg");
  el.style.color = esError ? "var(--rojo)" : "var(--verde)";
  el.textContent = texto;
}

async function doRegistro() {
  const email = (document.getElementById("areg-usuario").value || "").trim().toLowerCase();
  const nombre = (document.getElementById("areg-nombre").value || "").trim() || email.split("@")[0];
  const pass = document.getElementById("areg-pass").value || "";
  if (!esEmailValido(email)) { authMsg("Ingresá un email válido (ej: tu@correo.com).", true); return; }
  if (pass.length < 6) { authMsg("La contraseña debe tener al menos 6 caracteres.", true); return; }
  authMsg("Creando cuenta...", false);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, data: { nombre } })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "No se pudo registrar");
    if (data.access_token) {
      setSesion({ token: data.access_token, nombre, usuario: email, uid: data.user && data.user.id });
      cerrarModal("modal-auth");
      alert(`✅ ¡Cuenta creada! Bienvenido, ${nombre}.`);
    } else {
      authMsg("✅ Cuenta creada. Si te pide confirmar el email, revisá tu casilla. Luego iniciá sesión.", false);
      authTab("login");
      document.getElementById("alogin-usuario").value = email;
    }
  } catch (e) {
    authMsg("❌ " + e.message, true);
  }
}

async function doLogin() {
  const email = (document.getElementById("alogin-usuario").value || "").trim().toLowerCase();
  const pass = document.getElementById("alogin-pass").value || "";
  if (!esEmailValido(email) || !pass) { authMsg("Completá email y contraseña.", true); return; }
  authMsg("Entrando...", false);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Email o contraseña incorrectos");
    const nombre = (data.user && data.user.user_metadata && data.user.user_metadata.nombre) || email.split("@")[0];
    setSesion({ token: data.access_token, nombre, usuario: email, uid: data.user && data.user.id });
    cerrarModal("modal-auth");
    alert(`✅ ¡Hola de nuevo, ${nombre}!`);
  } catch (e) {
    authMsg("❌ " + e.message, true);
  }
}

function mostrarPantallaVictoria(ganador) {
  mostrarPantalla("pantalla-victoria");
  document.querySelector("#pantalla-victoria .victoria-emoji").textContent = "🏆";
  document.querySelector("#pantalla-victoria .victoria-titulo").textContent = "¡GANASTE!";
  document.getElementById("victoria-nombre").textContent = `${ganador.avatar} ${ganador.nombre}`;
  document.getElementById("victoria-saldo").textContent = `Patrimonio: ${fmt(calcularPatrimonio(ganador))}`;

  const ranking = [...estado.jugadores].sort((a, b) => calcularPatrimonio(b) - calcularPatrimonio(a));
  const posEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];
  document.getElementById("ranking-final").innerHTML = ranking.map((j, i) => `
    <div class="ranking-item">
      <span class="ranking-pos">${posEmojis[i]}</span>
      <span class="ranking-nombre">${j.avatar} ${j.nombre}</span>
      <span class="ranking-saldo">${fmt(calcularPatrimonio(j))}</span>
    </div>
  `).join("");
}

function reiniciarJuego() {
  estado = {
    jugadores: [], jugadorActual: 0, ronda: 1,
    fase: "inicio", setupJugadorIdx: 0, setupPaso: 0,
    provinciaSeleccionada: null, numJugadores: 1,
    codigoSala: null, modoOnline: false
  };
  mostrarPantalla("pantalla-inicio");
}

// ==================== MODALES DE COMPRA ====================
function abrirPrestamos() {
  let bancoSeleccionado = null;
  let cuotasSeleccionadas = null;
  let montoSeleccionado = 0;

  // Handlers asignados una sola vez (no dentro del render, así no se pierden datos)
  window.selectBanco = (i) => {
    bancoSeleccionado = i;
    cuotasSeleccionadas = null;
    montoSeleccionado = 0;
    window._prestamoPendiente = null;
    render();
  };
  window.selectCuotas = (c) => {
    cuotasSeleccionadas = c;
    render();
  };
  window.onMontoInput = (val) => {
    montoSeleccionado = parseFloat(val) || 0;
    actualizarResumenPrestamo();
  };

  function actualizarResumenPrestamo() {
    const cont = document.getElementById("resumen-prestamo");
    if (!cont) return;
    window._prestamoPendiente = null;

    if (bancoSeleccionado === null) return;
    const banco = BANCOS[bancoSeleccionado];

    if (cuotasSeleccionadas === null) {
      cont.innerHTML = `<div class="prestamo-resumen" style="background:var(--gris);border-color:var(--gris-med);color:var(--gris-dark);">Elegí en cuántas cuotas querés pagarlo.</div>`;
      return;
    }
    if (montoSeleccionado < 1000) {
      cont.innerHTML = `<div class="prestamo-resumen" style="background:#fff3cd;border-color:#ffc107;">Ingresá el monto a pedir (mínimo ${fmt(1000)}).</div>`;
      return;
    }
    if (montoSeleccionado > banco.maximo) {
      cont.innerHTML = `<div class="prestamo-resumen" style="background:#f8d7da;border-color:#f5c6cb;">Monto inválido. Máximo en ${banco.nombre}: ${fmt(banco.maximo)}</div>`;
      return;
    }

    const monto = montoSeleccionado;
    const tasaMensual = TASA_MENSUAL_PRESTAMO;
    const interesMensual = Math.round(monto * tasaMensual);
    const cuotaPrincipal = Math.round(monto / cuotasSeleccionadas);
    const pagoMensual = interesMensual + cuotaPrincipal;
    const interesTotal = interesMensual * cuotasSeleccionadas;
    const totalAPagar = monto + interesTotal;

    cont.innerHTML = `
      <div class="prestamo-resumen">
        <strong>Resumen del préstamo:</strong><br>
        Monto: ${fmt(monto)} en ${cuotasSeleccionadas} meses<br>
        Interés mensual (1.5%): ${fmt(interesMensual)}<br>
        Cuota de capital: ${fmt(cuotaPrincipal)}<br>
        <strong>Pago por mes: ${fmt(pagoMensual)}</strong><br>
        Interés total: ${fmt(interesTotal)} • Total: ${fmt(totalAPagar)}
      </div>
    `;
    window._prestamoPendiente = { banco: banco.nombre, monto, cuotas: cuotasSeleccionadas, principal: monto, cuotaPrincipal, tasaMensual };
  }
  window.actualizarResumenPrestamo = actualizarResumenPrestamo;

  window.confirmarPrestamo = () => {
    if (!window._prestamoPendiente) {
      alert("Elegí un banco, la cantidad de cuotas y un monto válido antes de solicitar.");
      return;
    }
    const j = estado.jugadores[estado.jugadorActual];
    const p = window._prestamoPendiente;
    j.saldo += p.monto;
    j.prestamos.push({ ...p });
    window._prestamoPendiente = null;
    cerrarModal("modal-prestamos");
    actualizarHUD();
    alert(`✅ Préstamo de ${fmt(p.monto)} aprobado en ${p.banco}. Te cobran 1.5%/mes de interés mientras debas.`);
  };

  // Pagar un mes adelantado (interés + cuota de capital)
  window.pagarCuota = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const p = j.prestamos[idx];
    if (!p) return;
    const interes = Math.round(p.monto * p.tasaMensual);
    const capital = Math.min(p.cuotaPrincipal, p.principal);
    const pago = interes + capital;
    if (j.saldo < pago) { alert(`No te alcanza para pagar el mes (${fmt(pago)} = ${fmt(interes)} interés + ${fmt(capital)} capital). Tenés ${fmt(j.saldo)}.`); return; }
    j.saldo -= pago;
    p.principal -= capital;
    let msg = `✅ Pagaste ${fmt(pago)} a ${p.banco} (${fmt(interes)} interés + ${fmt(capital)} capital).`;
    if (p.principal <= 0.5) {
      j.prestamos.splice(idx, 1);
      msg += `\n¡Saldaste la deuda por completo!`;
    }
    actualizarHUD();
    render();
    alert(msg);
  };

  // Cancelar toda la deuda de una vez (pagás solo el capital restante, sin más intereses)
  window.cancelarDeuda = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const p = j.prestamos[idx];
    if (!p) return;
    if (j.saldo < p.principal) { alert(`No te alcanza para cancelar la deuda. Necesitás ${fmt(p.principal)} y tenés ${fmt(j.saldo)}.`); return; }
    if (!confirm(`¿Cancelar toda la deuda con ${p.banco} por ${fmt(p.principal)}? Dejás de pagar el interés mensual.`)) return;
    j.saldo -= p.principal;
    j.prestamos.splice(idx, 1);
    actualizarHUD();
    render();
    alert(`✅ Cancelaste la deuda con ${p.banco}. Ya no pagás más intereses.`);
  };

  function render() {
    const j = estado.jugadores[estado.jugadorActual];
    let html = `<div style="margin-bottom:16px;">`;
    BANCOS.forEach((b, i) => {
      html += `<div class="prestamo-opcion ${bancoSeleccionado === i ? 'selected' : ''}" onclick="selectBanco(${i})">
        <div class="prestamo-nombre">${b.emoji} ${b.nombre}</div>
        <div class="prestamo-detalle">Interés ${(TASA_MENSUAL_PRESTAMO * 100).toFixed(1)}%/mes • Máximo ${fmt(b.maximo)}</div>
      </div>`;
    });
    html += `</div>`;

    if (bancoSeleccionado !== null) {
      const banco = BANCOS[bancoSeleccionado];
      html += `<input type="number" id="monto-prestamo" class="sala-input" placeholder="Monto a pedir (máx ${fmt(banco.maximo)})..." min="1000" max="${banco.maximo}" value="${montoSeleccionado > 0 ? montoSeleccionado : ''}" oninput="onMontoInput(this.value)">`;
      html += `<div style="display:flex;gap:8px;margin-bottom:12px;">`;
      banco.cuotas.forEach(c => {
        html += `<button class="btn ${cuotasSeleccionadas === c ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="selectCuotas(${c})" style="flex:1;">${c} meses</button>`;
      });
      html += `</div>`;
      html += `<div id="resumen-prestamo"></div>`;
      html += `<button class="btn btn-verde" onclick="confirmarPrestamo()">Solicitar préstamo</button>`;
    }

    if (j.prestamos.length > 0) {
      html += `<div style="margin-top:16px;border-top:1px solid var(--gris-med);padding-top:12px;">
        <p style="font-weight:600;font-size:14px;margin-bottom:8px;">Deudas actuales:</p>
        ${j.prestamos.map((p, idx) => `
          <div style="background:var(--gris);border-radius:8px;padding:10px;margin-bottom:6px;font-size:13px;">
            <div style="margin-bottom:8px;"><strong>${p.banco}</strong> — Capital restante: ${fmt(p.principal)} | Interés: ${fmt(Math.round(p.monto * p.tasaMensual))}/mes</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="pagarCuota(${idx})" style="flex:1;">Pagar 1 mes</button>
              <button class="btn btn-rojo btn-sm" onclick="cancelarDeuda(${idx})" style="flex:1;">Cancelar todo</button>
            </div>
          </div>
        `).join("")}
      </div>`;
    }

    document.getElementById("prestamos-contenido").innerHTML = html;
    actualizarResumenPrestamo();
  }

  render();
  document.getElementById("modal-prestamos").style.display = "flex";
}

function abrirInversiones() {
  if (!estado.precios) initMercado();

  function itemHTML(inst, idx) {
    const j = estado.jugadores[estado.jugadorActual];
    const actual = getPrecio(inst.nombre);
    const prev = (estado.preciosPrev && estado.preciosPrev[inst.nombre]) || actual;
    const pct = prev ? ((actual - prev) / prev) * 100 : 0;
    const flecha = pct > 0.01 ? `<span style="color:var(--verde);">▲ ${pct.toFixed(1)}%</span>`
      : pct < -0.01 ? `<span style="color:var(--rojo);">▼ ${Math.abs(pct).toFixed(1)}%</span>`
      : `<span style="color:var(--gris-dark);">＝</span>`;
    const tenencia = j.acciones.find(a => a.nombre === inst.nombre);
    let tenenciaHTML = "";
    if (tenencia) {
      const valor = actual * tenencia.cantidad;
      const costo = tenencia.precioCompra * tenencia.cantidad;
      const pl = valor - costo;
      const plColor = pl >= 0 ? "var(--verde)" : "var(--rojo)";
      tenenciaHTML = `<div style="font-size:12px;color:var(--azul);">Tenés ${tenencia.cantidad} • Valor: ${fmt(valor)}</div>
        <div style="font-size:12px;color:${plColor};">G/P: ${pl >= 0 ? "+" : "−"}${fmt(Math.abs(pl))}</div>`;
    }
    return `<div class="mercado-item">
      <div>
        <div class="mercado-nombre">${inst.emoji} ${inst.nombre}</div>
        <div class="mercado-retorno">${flecha} <span style="color:var(--gris-dark);">este mes</span></div>
        ${tenenciaHTML}
      </div>
      <div style="text-align:right;">
        <div class="mercado-precio">${fmt(actual)}</div>
        <button class="btn btn-primary btn-sm" onclick="comprarInversion(${idx})" style="margin-top:4px;">Comprar</button>
        ${tenencia ? `<button class="btn btn-rojo btn-sm" onclick="venderInversion(${idx})" style="margin-top:4px;">Vender</button>` : ""}
      </div>
    </div>`;
  }

  function render() {
    let html = `<p style="font-size:13px;color:var(--gris-dark);margin-bottom:8px;">Los precios suben y bajan cada mes. Comprá barato y vendé caro.</p>`;
    html += `<p style="font-weight:700;color:var(--azul);font-size:14px;margin:12px 0 6px;">📈 Acciones</p>`;
    ACCIONES.forEach(a => { html += itemHTML(a, INSTRUMENTOS.indexOf(a)); });
    html += `<p style="font-weight:700;color:var(--azul);font-size:14px;margin:16px 0 6px;">🧺 FCI — Fondos Comunes</p>`;
    FCI.forEach(f => { html += itemHTML(f, INSTRUMENTOS.indexOf(f)); });
    document.getElementById("inversiones-contenido").innerHTML = html;
  }

  window.comprarInversion = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const inst = INSTRUMENTOS[idx];
    const precio = getPrecio(inst.nombre);
    if (j.saldo < precio) { alert(`No te alcanza ni para una. Precio: ${fmt(precio)}`); return; }
    const cantStr = prompt(`¿Cuántas de ${inst.nombre} querés comprar?\nPrecio actual: ${fmt(precio)} c/u\nTenés: ${fmt(j.saldo)}`);
    const cant = parseInt(cantStr);
    if (!cant || cant <= 0) return;
    const total = precio * cant;
    if (j.saldo < total) { alert(`No te alcanza. Necesitás ${fmt(total)}`); return; }
    j.saldo -= total;
    const ex = j.acciones.find(a => a.nombre === inst.nombre);
    if (ex) {
      ex.precioCompra = Math.round((ex.precioCompra * ex.cantidad + total) / (ex.cantidad + cant));
      ex.cantidad += cant;
    } else {
      j.acciones.push({ nombre: inst.nombre, emoji: inst.emoji, tipo: inst.tipo, cantidad: cant, precioCompra: precio });
    }
    actualizarHUD();
    render();
    alert(`✅ Compraste ${cant} de ${inst.nombre} por ${fmt(total)}`);
  };

  window.venderInversion = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const inst = INSTRUMENTOS[idx];
    const ex = j.acciones.find(a => a.nombre === inst.nombre);
    if (!ex) return;
    const precio = getPrecio(inst.nombre);
    const valor = Math.round(precio * ex.cantidad);
    const pl = valor - ex.precioCompra * ex.cantidad;
    j.saldo += valor;
    // La ganancia (o pérdida) realizada entra en la base del impuesto semestral
    j._acumIngresos = (j._acumIngresos || 0) + pl;
    j.acciones = j.acciones.filter(a => a.nombre !== inst.nombre);
    actualizarHUD();
    render();
    alert(`✅ Vendiste ${ex.cantidad} de ${inst.nombre} por ${fmt(valor)} (${pl >= 0 ? "ganancia" : "pérdida"} de ${fmt(Math.abs(pl))})`);
  };

  render();
  document.getElementById("modal-inversiones").style.display = "flex";
}

function abrirEmpresas() {
  function render() {
    const j = estado.jugadores[estado.jugadorActual];
    let html = `<div style="font-size:13px;color:var(--azul);font-weight:700;margin-bottom:4px;">💵 Saldo: ${fmt(j.saldo)}</div>
      <p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">Comprá empresas que generan ingresos cada turno. Podés tener varias.</p>`;
    EMPRESAS.forEach((e, i) => {
      const cant = j.empresas.filter(em => em.nombre === e.nombre).length;
      html += `<div class="mercado-item">
        <div>
          <div class="mercado-nombre">${e.emoji} ${e.nombre}</div>
          <div class="mercado-retorno">+${fmt(e.retornoPorTurno)}/turno</div>
          <div style="font-size:12px;color:var(--gris-dark);">${e.descripcion}</div>
          ${cant > 0 ? `<div style="font-size:12px;color:var(--azul);font-weight:600;">✅ Tenés ${cant}</div>` : ""}
        </div>
        <div style="text-align:right;">
          <div class="mercado-precio">${fmt(e.precio)}</div>
          <button class="btn btn-primary btn-sm" onclick="comprarEmpresa(${i})" style="margin-top:4px;">Comprar</button>
          ${cant > 0 ? `<button class="btn btn-rojo btn-sm" onclick="venderEmpresaMercado(${i})" style="margin-top:4px;">Vender 1</button>` : ""}
        </div>
      </div>`;
    });
    document.getElementById("empresas-contenido").innerHTML = html;
  }

  window.comprarEmpresa = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const empresa = EMPRESAS[idx];
    if (j.saldo < empresa.precio) { alert(`No tenés saldo suficiente. Necesitás ${fmt(empresa.precio)}`); return; }
    j.saldo -= empresa.precio;
    j.empresas.push({ ...empresa });
    actualizarHUD();
    render();
  };

  window.venderEmpresaMercado = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const empresa = EMPRESAS[idx];
    const pos = j.empresas.findIndex(e => e.nombre === empresa.nombre);
    if (pos < 0) return;
    const valor = Math.round(empresa.precio * 0.7);
    j.saldo += valor;
    j.empresas.splice(pos, 1);
    actualizarHUD();
    render();
  };

  render();
  document.getElementById("modal-empresas").style.display = "flex";
}

function abrirPropiedades() {
  function render() {
    const j = estado.jugadores[estado.jugadorActual];
    let html = `<div style="font-size:13px;color:var(--azul);font-weight:700;margin-bottom:4px;">💵 Saldo: ${fmt(j.saldo)}</div>
      <p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">Comprá propiedades que generan alquiler cada turno. Podés tener varias.</p>`;
    PROPIEDADES.forEach((p, i) => {
      const cant = j.propiedades.filter(pr => pr.nombre === p.nombre).length;
      html += `<div class="mercado-item">
        <div>
          <div class="mercado-nombre">${p.emoji} ${p.nombre}</div>
          <div class="mercado-retorno">+${fmt(p.alquilerPorTurno)}/turno alquiler</div>
          <div style="font-size:12px;color:var(--gris-dark);">${p.descripcion}</div>
          ${cant > 0 ? `<div style="font-size:12px;color:var(--azul);font-weight:600;">✅ Tenés ${cant}</div>` : ""}
        </div>
        <div style="text-align:right;">
          <div class="mercado-precio">${fmt(p.precio)}</div>
          <button class="btn btn-primary btn-sm" onclick="comprarPropiedad(${i})" style="margin-top:4px;">Comprar</button>
          ${cant > 0 ? `<button class="btn btn-rojo btn-sm" onclick="venderPropiedadMercado(${i})" style="margin-top:4px;">Vender 1</button>` : ""}
        </div>
      </div>`;
    });
    document.getElementById("propiedades-contenido").innerHTML = html;
  }

  window.comprarPropiedad = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const prop = PROPIEDADES[idx];
    if (j.saldo < prop.precio) { alert(`No tenés saldo suficiente. Necesitás ${fmt(prop.precio)}`); return; }
    j.saldo -= prop.precio;
    j.propiedades.push({ ...prop });
    actualizarHUD();
    render();
  };

  window.venderPropiedadMercado = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const prop = PROPIEDADES[idx];
    const pos = j.propiedades.findIndex(p => p.nombre === prop.nombre);
    if (pos < 0) return;
    const valor = Math.round(prop.precio * 0.75);
    j.saldo += valor;
    j.propiedades.splice(pos, 1);
    actualizarHUD();
    render();
  };

  document.getElementById("propiedades-contenido").innerHTML = "";
  render();
  document.getElementById("modal-propiedades").style.display = "flex";
}

function abrirFinanzas() {
  verFinanzas(estado.jugadorActual);
}

function verFinanzas(idx) {
  const j = estado.jugadores[idx];
  const patrimonio = calcularPatrimonio(j);
  const progreso = Math.min(100, (patrimonio / META_VICTORIA) * 100);

  let html = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:40px;">${j.avatar}</div>
      <div style="font-size:20px;font-weight:800;color:var(--azul);">${j.nombre}</div>
      <div style="font-size:13px;color:var(--gris-dark);">📅 ${fechaJugador(j)} • Edad: ${j.edad} años</div>
      <div style="font-size:13px;color:var(--gris-dark);">${j.ciudad ? j.ciudad.nombre + ", " : ""}${j.provincia || ""}</div>
    </div>

    <div style="background:var(--gris);border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--gris-dark);">Progreso a la victoria</span>
        <span style="font-size:13px;font-weight:600;">${progreso.toFixed(1)}%</span>
      </div>
      <div style="background:var(--gris-med);border-radius:4px;height:8px;">
        <div style="background:var(--azul);border-radius:4px;height:8px;width:${progreso}%;transition:width 0.3s;"></div>
      </div>
      <div style="font-size:11px;color:var(--gris-dark);margin-top:4px;">Meta: ${fmt(META_VICTORIA)}</div>
    </div>

    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:6px 0;color:var(--gris-dark);">💵 Saldo efectivo</td><td style="text-align:right;font-weight:700;color:${j.saldo>=0?'var(--verde)':'var(--rojo)'};">${fmt(j.saldo)}</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">📊 Sueldo mensual</td><td style="text-align:right;font-weight:600;">${fmt(j.sueldo)}</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏠 Gastos fijos (60% sueldo)</td><td style="text-align:right;font-weight:600;color:var(--naranja);">${fmt(j.gastoBase)}</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🧾 Últ. impuesto semestral</td><td style="text-align:right;font-weight:600;color:var(--naranja);">${fmt(j._ultimoImpuesto || 0)}</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">📒 Base acumulada (semestre)</td><td style="text-align:right;font-weight:600;">${fmt(Math.max(0, (j._acumIngresos || 0) - (j._acumPrestamos || 0)))} · próx. en ${6 - (j.meses % 6 === 0 ? 0 : j.meses % 6)} mes(es)</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏢 Empresas</td><td style="text-align:right;font-weight:600;">${j.empresas.length} (${fmt(j.empresas.reduce((s,e)=>s+e.precio,0))})</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏠 Propiedades</td><td style="text-align:right;font-weight:600;">${j.propiedades.length} (${fmt(j.propiedades.reduce((s,p)=>s+p.precio,0))})</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">📈 Inversiones</td><td style="text-align:right;font-weight:600;">${j.acciones.length} (${fmt(j.acciones.reduce((s,a)=>s+getPrecio(a.nombre)*a.cantidad,0))})</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏦 Deudas (capital)</td><td style="text-align:right;font-weight:600;color:var(--rojo);">${fmt(j.prestamos.reduce((s,p)=>s+p.principal,0))}</td></tr>
      <tr style="border-top:2px solid var(--azul);"><td style="padding:10px 0;font-weight:800;color:var(--azul);">💰 Patrimonio total</td><td style="text-align:right;font-weight:800;font-size:18px;color:var(--azul);">${fmt(patrimonio)}</td></tr>
    </table>

    ${j.enCarrera ? `<div style="background:#cce5ff;border-radius:8px;padding:12px;margin-top:12px;font-size:13px;">🎓 Estudiando ${j.carrera.nombre} — Año ${Math.min(j.carrera.duracion, Math.floor(j.mesesCarrera / MESES_POR_ANIO_CARRERA) + 1)}/${j.carrera.duracion}</div>` : ""}
  `;

  document.getElementById("finanzas-contenido").innerHTML = html;
  document.getElementById("modal-finanzas").style.display = "flex";
}

// Al cargar la página, refleja si hay una sesión guardada
actualizarUIAuth();
