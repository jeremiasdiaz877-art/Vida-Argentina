// ==================== ESTADO DEL JUEGO ====================
let estado = {
  jugadores: [],
  jugadorActual: 0,
  ronda: 1,
  fase: "inicio",
  setupJugadorIdx: 0,
  setupPaso: 0,
  provinciaSeleccionada: null,
  numJugadores: 2,
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

function abrirCafecito() {
  alert("¡Gracias por apoyar! Próximamente link de donación disponible.\n\nInstagram: @jm_administracion");
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
    provincia: null,
    ciudad: null,
    carrera: null,
    enCarrera: false,
    añosCarrera: 0,
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
  mostrarPantalla("pantalla-juego");
  actualizarHUD();
  actualizarTurno();
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

function actualizarTurno() {
  const j = estado.jugadores[estado.jugadorActual];
  document.getElementById("turno-avatar").textContent = j.avatar;
  document.getElementById("turno-nombre").textContent = j.nombre;
  document.getElementById("turno-info-sub").textContent = `Ronda ${estado.ronda} • Edad: ${j.edad} años`;
  document.getElementById("btn-tirar").style.display = "flex";
  document.getElementById("btn-siguiente").style.display = "none";
  document.getElementById("dado-display").textContent = "⚀";
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
  j.edad++;

  // 1) Sueldo (completo si ya recibido, 30% mientras estudia)
  let ingresoSueldo = 0;
  if (!j.enCarrera) {
    ingresoSueldo = j.sueldo;
  } else {
    j.añosCarrera++;
    if (j.añosCarrera >= j.carrera.duracion) {
      j.enCarrera = false;
    }
    ingresoSueldo = Math.round(j.sueldo * 0.3);
  }

  // 2) Retorno de empresas
  let retornoEmpresa = 0;
  j.empresas.forEach(e => { retornoEmpresa += e.retornoPorTurno; });

  // 3) Ganancias por acciones (rendimiento por turno sobre lo invertido)
  let retornoAcciones = 0;
  j.acciones.forEach(a => { retornoAcciones += Math.round(a.precio * a.cantidad * a.retorno); });

  // 4) Alquiler de propiedades (NO entra en la base de Ganancias)
  let alquiler = 0;
  j.propiedades.forEach(p => { alquiler += p.alquilerPorTurno; });

  // 5) Gastos fijos = 60% del ingreso por sueldo de este turno
  const gastosFijos = Math.round(ingresoSueldo * 0.6);

  // 6) Cuotas de préstamos
  let cuotaTotal = 0;
  j.prestamos = j.prestamos.filter(p => {
    if (p.remaining <= 0) return false;
    const cuota = Math.min(p.cuotaMensual, p.remaining);
    cuotaTotal += cuota;
    p.remaining -= cuota;
    return p.remaining > 0;
  });

  // 7) Costo de carrera mientras estudia
  const costoCarrera = (j.enCarrera && j.carrera.costo > 0) ? j.carrera.costo : 0;

  const ingresado = ingresoSueldo + retornoEmpresa + retornoAcciones + alquiler;
  const gastos = gastosFijos + cuotaTotal + costoCarrera;
  j.saldo += ingresado - gastos;

  // Base imponible de Ganancias (sin alquiler ni cuotas)
  j._gananciaTurno = ingresoSueldo + retornoEmpresa + retornoAcciones - gastosFijos - costoCarrera;

  // Evento aleatorio (60% probabilidad)
  if (Math.random() < 0.6) {
    mostrarEvento(j, dado);
  } else {
    finalizarTurno(j);
  }
}

// Tasa del impuesto a las ganancias: 10% si NO tiene empresas ni Local comercial; si no, 25%
function tasaGanancias(j) {
  const tieneActividadComercial = j.empresas.length > 0 ||
    j.propiedades.some(p => p.nombre === "Local comercial");
  return tieneActividadComercial ? 0.25 : 0.10;
}

// Aplica el impuesto a las ganancias del turno y devuelve el monto cobrado
function aplicarImpuestos(j) {
  const ganancia = j._gananciaTurno || 0;
  let impuesto = 0;
  if (ganancia >= 2000000) {
    impuesto = Math.round(ganancia * tasaGanancias(j));
    j.saldo -= impuesto;
  }
  j._impuestoTurno = impuesto;
  j._gananciaTurno = 0;
  return impuesto;
}

// Cierra el turno: cobra impuestos, avisa y verifica quiebra/victoria
function finalizarTurno(j) {
  const impuesto = aplicarImpuestos(j);
  if (impuesto > 0) {
    const tasa = Math.round(tasaGanancias(j) * 100);
    alert(`🧾 Impuesto a las Ganancias: pagaste ${fmt(impuesto)} (${tasa}% de tu ganancia del período).`);
  }
  verificarQuiebra(j);
}

function mostrarEvento(j, dado) {
  const evento = EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
  const impacto = evento.impacto(j.saldo);
  j.saldo += impacto;
  // El "plus económico" de los eventos también suma a la ganancia del período
  j._gananciaTurno = (j._gananciaTurno || 0) + impacto;

  const contenido = document.getElementById("evento-contenido");
  contenido.innerHTML = `
    <div class="evento-card">
      <div class="evento-emoji">${evento.emoji}</div>
      <div class="evento-titulo">${evento.titulo}</div>
      <div class="evento-desc">${evento.desc}</div>
      <div class="evento-impacto ${impacto >= 0 ? "impacto-pos" : "impacto-neg"}">
        ${impacto >= 0 ? "+" : ""}${fmt(impacto)}
      </div>
    </div>
    <div style="font-size:14px;color:var(--gris-dark);text-align:center;margin-bottom:12px;">
      Saldo actual: <strong>${fmt(j.saldo)}</strong>
    </div>
  `;

  document.getElementById("modal-evento").style.display = "flex";
}

function cerrarModalEvento() {
  cerrarModal("modal-evento");
  const j = estado.jugadores[estado.jugadorActual];
  finalizarTurno(j);
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
    html += `<p style="font-weight:600;margin-bottom:8px;margin-top:12px;">📈 Tus acciones:</p>`;
    html += j.acciones.map((a, i) => `
      <div class="activo-item">
        <span>${a.emoji} ${a.nombre} x${a.cantidad}</span>
        <span style="color:var(--verde);font-weight:700;">${fmt(Math.round(a.precio * a.cantidad * 0.9))}</span>
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
  const valor = Math.round(acc.precio * acc.cantidad * 0.9);
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
  j.acciones.forEach(a => total += a.precio * a.cantidad);
  j.prestamos.forEach(p => total -= p.remaining);
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
  document.getElementById("modal-registro").style.display = "flex";
  document.getElementById("reg-nombre").value = ganador.nombre;
  estado._ganador = ganador;
}

function guardarRegistro() {
  const nombre = document.getElementById("reg-nombre").value;
  const email = document.getElementById("reg-email").value;
  // En prod esto iría a una API
  console.log("Registro:", { nombre, email, partida: new Date().toISOString() });
  cerrarModal("modal-registro");
  mostrarPantallaVictoria(estado._ganador);
}

function saltarRegistro() {
  cerrarModal("modal-registro");
  mostrarPantallaVictoria(estado._ganador);
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
    provinciaSeleccionada: null, numJugadores: 2,
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
    const interesTotal = monto * banco.tasa * (cuotasSeleccionadas / 12);
    const totalAPagar = monto + interesTotal;
    const cuotaMensual = totalAPagar / cuotasSeleccionadas;

    // Tope de endeudamiento: deuda total no puede superar 12x el sueldo mensual
    const j = estado.jugadores[estado.jugadorActual];
    const deudaActual = j.prestamos.reduce((s, p) => s + p.remaining, 0);
    const topeDeuda = j.sueldo * 12;
    if (deudaActual + totalAPagar > topeDeuda) {
      const disponible = Math.max(0, topeDeuda - deudaActual);
      cont.innerHTML = `<div class="prestamo-resumen" style="background:#f8d7da;border-color:#f5c6cb;">
        Superás tu tope de endeudamiento.<br>
        Tope total (12× sueldo): ${fmt(topeDeuda)}<br>
        Deuda actual: ${fmt(deudaActual)}<br>
        Margen disponible para nueva deuda: ${fmt(disponible)}
      </div>`;
      return;
    }

    cont.innerHTML = `
      <div class="prestamo-resumen">
        <strong>Resumen del préstamo:</strong><br>
        Monto: ${fmt(monto)}<br>
        Interés total: ${fmt(interesTotal)}<br>
        Cuota mensual: ${fmt(cuotaMensual)} (x${cuotasSeleccionadas})<br>
        Total a pagar: ${fmt(totalAPagar)}<br>
        <span style="color:var(--gris-dark);font-size:12px;">Tope de deuda (12× sueldo): ${fmt(topeDeuda)} • Disponible: ${fmt(topeDeuda - deudaActual - totalAPagar)}</span>
      </div>
    `;
    window._prestamoPendiente = { monto, cuotaMensual, totalAPagar, remaining: totalAPagar, banco: banco.nombre, cuotas: cuotasSeleccionadas };
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
    alert(`✅ Préstamo de ${fmt(p.monto)} aprobado en ${p.banco}. El dinero fue acreditado.`);
  };

  // Pagar una cuota adelantada
  window.pagarCuota = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const p = j.prestamos[idx];
    if (!p) return;
    const pago = Math.min(p.cuotaMensual, p.remaining);
    if (j.saldo < pago) { alert(`No te alcanza para pagar la cuota (${fmt(pago)}). Tenés ${fmt(j.saldo)}.`); return; }
    j.saldo -= pago;
    p.remaining -= pago;
    let msg = `✅ Pagaste una cuota de ${fmt(pago)} a ${p.banco}.`;
    if (p.remaining <= 0) {
      j.prestamos.splice(idx, 1);
      msg += `\n¡Saldaste la deuda por completo!`;
    }
    actualizarHUD();
    render();
    alert(msg);
  };

  // Cancelar toda la deuda de una sola vez
  window.cancelarDeuda = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const p = j.prestamos[idx];
    if (!p) return;
    if (j.saldo < p.remaining) { alert(`No te alcanza para cancelar la deuda. Necesitás ${fmt(p.remaining)} y tenés ${fmt(j.saldo)}.`); return; }
    if (!confirm(`¿Cancelar toda la deuda con ${p.banco} por ${fmt(p.remaining)}? Dejás de pagar las cuotas.`)) return;
    j.saldo -= p.remaining;
    j.prestamos.splice(idx, 1);
    actualizarHUD();
    render();
    alert(`✅ Cancelaste la deuda con ${p.banco}. Ya no pagás más cuotas.`);
  };

  function render() {
    const j = estado.jugadores[estado.jugadorActual];
    let html = `<div style="margin-bottom:16px;">`;
    BANCOS.forEach((b, i) => {
      html += `<div class="prestamo-opcion ${bancoSeleccionado === i ? 'selected' : ''}" onclick="selectBanco(${i})">
        <div class="prestamo-nombre">${b.emoji} ${b.nombre}</div>
        <div class="prestamo-detalle">Tasa ${(b.tasa * 100).toFixed(1)}% anual • Máximo ${fmt(b.maximo)}</div>
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
            <div style="margin-bottom:8px;"><strong>${p.banco}</strong> — Restante: ${fmt(p.remaining)} | Cuota: ${fmt(p.cuotaMensual)}/mes</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="pagarCuota(${idx})" style="flex:1;">Pagar 1 cuota</button>
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
  const j = estado.jugadores[estado.jugadorActual];
  let html = `<p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">Comprá acciones de empresas argentinas</p>`;

  ACCIONES.forEach((a, i) => {
    const tieneAcciones = j.acciones.find(ac => ac.nombre === a.nombre);
    html += `<div class="mercado-item">
      <div>
        <div class="mercado-nombre">${a.emoji} ${a.nombre}</div>
        <div class="mercado-retorno">+${Math.round(a.retorno * 100)}% retorno/turno</div>
        ${tieneAcciones ? `<div style="font-size:12px;color:var(--azul);">Tenés: ${tieneAcciones.cantidad} acciones</div>` : ""}
      </div>
      <div style="text-align:right;">
        <div class="mercado-precio">${fmt(a.precio)}</div>
        <button class="btn btn-primary btn-sm" onclick="comprarAccion(${i})" style="margin-top:4px;">Comprar</button>
        ${tieneAcciones ? `<button class="btn btn-rojo btn-sm" onclick="venderAccionMercado(${i})" style="margin-top:4px;">Vender</button>` : ""}
      </div>
    </div>`;
  });

  window.comprarAccion = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const accion = ACCIONES[idx];
    if (j.saldo < accion.precio) { alert("No tenés suficiente saldo"); return; }
    const cantStr = prompt(`¿Cuántas acciones de ${accion.nombre} querés comprar? (Precio: ${fmt(accion.precio)} c/u)\nTenés: ${fmt(j.saldo)}`);
    const cant = parseInt(cantStr);
    if (!cant || cant <= 0) return;
    const total = accion.precio * cant;
    if (j.saldo < total) { alert(`No tenés saldo suficiente. Necesitás ${fmt(total)}`); return; }
    j.saldo -= total;
    const existente = j.acciones.find(a => a.nombre === accion.nombre);
    if (existente) { existente.cantidad += cant; }
    else { j.acciones.push({ ...accion, cantidad: cant }); }
    actualizarHUD();
    cerrarModal("modal-inversiones");
    alert(`✅ Compraste ${cant} acciones de ${accion.nombre} por ${fmt(total)}`);
  };

  window.venderAccionMercado = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const accion = ACCIONES[idx];
    const existente = j.acciones.find(a => a.nombre === accion.nombre);
    if (!existente) return;
    const valor = Math.round(accion.precio * existente.cantidad * (0.9 + Math.random() * 0.2));
    j.saldo += valor;
    j.acciones = j.acciones.filter(a => a.nombre !== accion.nombre);
    actualizarHUD();
    cerrarModal("modal-inversiones");
    alert(`✅ Vendiste ${existente.cantidad} acciones de ${accion.nombre} por ${fmt(valor)}`);
  };

  document.getElementById("inversiones-contenido").innerHTML = html;
  document.getElementById("modal-inversiones").style.display = "flex";
}

function abrirEmpresas() {
  const j = estado.jugadores[estado.jugadorActual];
  let html = `<p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">Comprá empresas que generan ingresos cada turno</p>`;

  EMPRESAS.forEach((e, i) => {
    const tieneEmpresa = j.empresas.find(em => em.nombre === e.nombre);
    html += `<div class="mercado-item">
      <div>
        <div class="mercado-nombre">${e.emoji} ${e.nombre}</div>
        <div class="mercado-retorno">+${fmt(e.retornoPorTurno)}/turno</div>
        <div style="font-size:12px;color:var(--gris-dark);">${e.descripcion}</div>
        ${tieneEmpresa ? '<div style="font-size:12px;color:var(--azul);font-weight:600;">✅ Ya la tenés</div>' : ""}
      </div>
      <div style="text-align:right;">
        <div class="mercado-precio">${fmt(e.precio)}</div>
        ${!tieneEmpresa ? `<button class="btn btn-primary btn-sm" onclick="comprarEmpresa(${i})" style="margin-top:4px;">Comprar</button>` : `<button class="btn btn-rojo btn-sm" onclick="venderEmpresaMercado(${i})" style="margin-top:4px;">Vender</button>`}
      </div>
    </div>`;
  });

  window.comprarEmpresa = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const empresa = EMPRESAS[idx];
    if (j.saldo < empresa.precio) { alert(`No tenés saldo suficiente. Necesitás ${fmt(empresa.precio)}`); return; }
    j.saldo -= empresa.precio;
    j.empresas.push({ ...empresa });
    actualizarHUD();
    cerrarModal("modal-empresas");
    alert(`✅ Compraste ${empresa.emoji} ${empresa.nombre}. Genera ${fmt(empresa.retornoPorTurno)}/turno.`);
  };

  window.venderEmpresaMercado = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const empresa = EMPRESAS[idx];
    const existente = j.empresas.find(e => e.nombre === empresa.nombre);
    if (!existente) return;
    const valor = Math.round(empresa.precio * 0.7);
    j.saldo += valor;
    j.empresas = j.empresas.filter(e => e.nombre !== empresa.nombre);
    actualizarHUD();
    cerrarModal("modal-empresas");
    alert(`✅ Vendiste ${empresa.emoji} ${empresa.nombre} por ${fmt(valor)}`);
  };

  document.getElementById("empresas-contenido").innerHTML = html;
  document.getElementById("modal-empresas").style.display = "flex";
}

function abrirPropiedades() {
  const j = estado.jugadores[estado.jugadorActual];
  let html = `<p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">Comprá propiedades que generan alquiler cada turno</p>`;

  PROPIEDADES.forEach((p, i) => {
    const tieneProp = j.propiedades.find(pr => pr.nombre === p.nombre);
    html += `<div class="mercado-item">
      <div>
        <div class="mercado-nombre">${p.emoji} ${p.nombre}</div>
        <div class="mercado-retorno">+${fmt(p.alquilerPorTurno)}/turno alquiler</div>
        <div style="font-size:12px;color:var(--gris-dark);">${p.descripcion}</div>
        ${tieneProp ? '<div style="font-size:12px;color:var(--azul);font-weight:600;">✅ Ya la tenés</div>' : ""}
      </div>
      <div style="text-align:right;">
        <div class="mercado-precio">${fmt(p.precio)}</div>
        ${!tieneProp ? `<button class="btn btn-primary btn-sm" onclick="comprarPropiedad(${i})" style="margin-top:4px;">Comprar</button>` : `<button class="btn btn-rojo btn-sm" onclick="venderPropiedadMercado(${i})" style="margin-top:4px;">Vender</button>`}
      </div>
    </div>`;
  });

  window.comprarPropiedad = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const prop = PROPIEDADES[idx];
    if (j.saldo < prop.precio) { alert(`No tenés saldo suficiente. Necesitás ${fmt(prop.precio)}`); return; }
    j.saldo -= prop.precio;
    j.propiedades.push({ ...prop });
    actualizarHUD();
    cerrarModal("modal-propiedades");
    alert(`✅ Compraste ${prop.emoji} ${prop.nombre}. Genera ${fmt(prop.alquilerPorTurno)}/turno de alquiler.`);
  };

  window.venderPropiedadMercado = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const prop = PROPIEDADES[idx];
    const existente = j.propiedades.find(p => p.nombre === prop.nombre);
    if (!existente) return;
    const valor = Math.round(prop.precio * 0.75);
    j.saldo += valor;
    j.propiedades = j.propiedades.filter(p => p.nombre !== prop.nombre);
    actualizarHUD();
    cerrarModal("modal-propiedades");
    alert(`✅ Vendiste ${prop.emoji} ${prop.nombre} por ${fmt(valor)}`);
  };

  document.getElementById("propiedades-contenido").innerHTML = html;
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
      <div style="font-size:13px;color:var(--gris-dark);">Edad: ${j.edad} años | ${j.ciudad ? j.ciudad.nombre + ", " : ""}${j.provincia || ""}</div>
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
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🧾 Impuesto últ. turno (${Math.round(tasaGanancias(j)*100)}%)</td><td style="text-align:right;font-weight:600;color:var(--naranja);">${fmt(j._impuestoTurno || 0)}</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏢 Empresas</td><td style="text-align:right;font-weight:600;">${j.empresas.length} (${fmt(j.empresas.reduce((s,e)=>s+e.precio,0))})</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏠 Propiedades</td><td style="text-align:right;font-weight:600;">${j.propiedades.length} (${fmt(j.propiedades.reduce((s,p)=>s+p.precio,0))})</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">📈 Acciones</td><td style="text-align:right;font-weight:600;">${j.acciones.length} tipos</td></tr>
      <tr><td style="padding:6px 0;color:var(--gris-dark);">🏦 Deudas</td><td style="text-align:right;font-weight:600;color:var(--rojo);">${fmt(j.prestamos.reduce((s,p)=>s+p.remaining,0))}</td></tr>
      <tr style="border-top:2px solid var(--azul);"><td style="padding:10px 0;font-weight:800;color:var(--azul);">💰 Patrimonio total</td><td style="text-align:right;font-weight:800;font-size:18px;color:var(--azul);">${fmt(patrimonio)}</td></tr>
    </table>

    ${j.enCarrera ? `<div style="background:#cce5ff;border-radius:8px;padding:12px;margin-top:12px;font-size:13px;">🎓 Estudiando ${j.carrera.nombre} — Año ${j.añosCarrera}/${j.carrera.duracion}</div>` : ""}
  `;

  document.getElementById("finanzas-contenido").innerHTML = html;
  document.getElementById("modal-finanzas").style.display = "flex";
}
