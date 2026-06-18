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

let pantallaActual = "pantalla-inicio";
function mostrarPantalla(id) {
  pantallaActual = id;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function cerrarModal(id) {
  document.getElementById(id).style.display = "none";
}

// Registra un evento en Google Analytics (si está activo)
function track(evento, params) {
  try { if (window.gtag) window.gtag("event", evento, params || {}); } catch (e) {}
}

const CAFECITO_URL = "https://cafecito.app/vida-argentina";

function abrirCafecito() {
  track("apoyo_click");
  document.getElementById("modal-apoyar").style.display = "flex";
}

function abrirCafecitoLink() {
  window.open(CAFECITO_URL, "_blank");
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
let salaInfo = null; // { codigo, esHost, miNombre, miAvatar }

// ---- Operaciones de sala contra Supabase ----
async function supaCrearSala(codigo, jugadores) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salas`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ codigo, jugadores, estado: "esperando" })
    });
    return res.ok;
  } catch (e) { return false; }
}
async function supaGetSala(codigo) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salas?codigo=eq.${encodeURIComponent(codigo)}&select=codigo,jugadores,estado`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) return null;
    const arr = await res.json();
    return arr[0] || null;
  } catch (e) { return null; }
}
async function supaUpdateSala(codigo, fields) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salas?codigo=eq.${encodeURIComponent(codigo)}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(fields)
    });
    return res.ok;
  } catch (e) { return false; }
}

// Borra salas con más de 12 horas (la regla RLS solo permite borrar viejas)
async function limpiarSalasViejas() {
  try {
    const limite = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/salas?created_at=lt.${encodeURIComponent(limite)}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  } catch (e) {}
}

async function crearSala() {
  const nombre = document.getElementById("sala-nombre-host").value.trim();
  if (!nombre) { alert("Ingresá tu nombre"); return; }
  if (!hayBaseDeDatos()) { alert("La sala online necesita la base de datos configurada."); return; }
  limpiarSalasViejas(); // aprovecha para limpiar salas abandonadas
  const avatar = document.getElementById("sala-avatar-host").value;
  const codigo = generarCodigo();
  const miId = uid();
  salaJugadores = [{ id: miId, nombre, avatar, esHost: true }];
  const ok = await supaCrearSala(codigo, salaJugadores);
  if (!ok) { alert("No se pudo crear la sala. Probá de nuevo."); return; }
  track("sala_creada");
  salaInfo = { codigo, esHost: true, miNombre: nombre, miAvatar: avatar, miId };
  estado.codigoSala = codigo;
  estado.modoOnline = true;
  document.getElementById("codigo-sala-display").textContent = codigo;
  document.getElementById("sala-creada").style.display = "block";
  renderListaEspera();
  actualizarBtnIniciar();
  iniciarPollingSala();
}

function copiarCodigoSala() {
  const codigo = salaInfo ? salaInfo.codigo : (document.getElementById("codigo-sala-display").textContent || "").trim();
  if (!codigo || codigo === "------") return;
  const onOk = () => alert(`✅ Código copiado: ${codigo}\nCompartilo con tus amigos.`);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codigo).then(onOk).catch(() => prompt("Copiá el código:", codigo));
  } else {
    prompt("Copiá el código:", codigo);
  }
}

function renderListaEspera() {
  const html = salaJugadores.map(j =>
    `<div class="espera-jugador">
      <div class="espera-status status-listo"></div>
      <span style="font-size:24px;">${j.avatar}</span>
      <span style="font-weight:600;">${j.nombre}${salaInfo && j.nombre === salaInfo.miNombre ? " (vos)" : ""}</span>
      ${j.esHost ? '<span style="font-size:11px;background:#cce5ff;color:#004085;padding:2px 8px;border-radius:6px;margin-left:auto;">Anfitrión</span>' : ''}
    </div>`
  ).join("");
  const hostList = document.getElementById("espera-jugadores-lista");
  const guestList = document.getElementById("espera-jugadores-lista-guest");
  if (hostList) hostList.innerHTML = html;
  if (guestList) guestList.innerHTML = html;
}

function actualizarBtnIniciar() {
  const btn = document.getElementById("btn-iniciar-sala");
  if (!btn) return;
  const listos = salaJugadores.length >= 2;
  btn.disabled = !listos;
  btn.style.opacity = listos ? "1" : "0.5";
}

async function unirseSala() {
  const codigo = document.getElementById("codigo-ingresado").value.trim().toUpperCase();
  const nombre = document.getElementById("sala-nombre-guest").value.trim();
  if (!codigo || codigo.length !== 6) { alert("Ingresá el código de 6 caracteres"); return; }
  if (!nombre) { alert("Ingresá tu nombre"); return; }
  if (!hayBaseDeDatos()) { alert("La sala online necesita la base de datos configurada."); return; }
  const avatar = document.getElementById("sala-avatar-guest").value;
  const sala = await supaGetSala(codigo);
  if (!sala) { alert("Código de sala no encontrado. Pedile al anfitrión el código correcto."); return; }
  if (sala.estado !== "esperando") { alert("Esa partida ya empezó."); return; }
  const jugadores = sala.jugadores || [];
  if (jugadores.length >= 7) { alert("La sala está llena (máximo 7)."); return; }
  const miId = uid();
  jugadores.push({ id: miId, nombre, avatar, esHost: false });
  const ok = await supaUpdateSala(codigo, { jugadores });
  if (!ok) { alert("No se pudo unir a la sala. Probá de nuevo."); return; }
  track("sala_unida");
  salaInfo = { codigo, esHost: false, miNombre: nombre, miAvatar: avatar, miId };
  estado.codigoSala = codigo;
  estado.modoOnline = true;
  salaJugadores = jugadores;
  document.getElementById("sala-unido").style.display = "block";
  renderListaEspera();
  iniciarPollingSala();
}

// Consulta la sala cada 2 segundos y refleja los cambios
function iniciarPollingSala() {
  if (intervalSala) clearInterval(intervalSala);
  intervalSala = setInterval(async () => {
    if (!salaInfo) return;
    const sala = await supaGetSala(salaInfo.codigo);
    if (!sala) return;
    salaJugadores = sala.jugadores || [];
    renderListaEspera();
    actualizarBtnIniciar();
    if (sala.estado === "jugando" && !salaInfo.esHost) {
      clearInterval(intervalSala);
      const full = await supaGetSalaJuego(salaInfo.codigo);
      if (full && full.estado_juego) {
        estado = full.estado_juego;
        online.activo = true;
        online.version = full.version || 1;
        online.miIndice = estado.jugadores.findIndex(p => p.id === salaInfo.miId);
        entrarJuegoOnline();
      }
    }
  }, 2000);
}

async function iniciarSalaOnline() {
  if (!salaInfo || !salaInfo.esHost) return;
  if (salaJugadores.length < 2) { alert("Necesitás al menos 2 jugadores."); return; }
  track("partida_iniciada", { modo: "online", jugadores: salaJugadores.length });
  // 2C: cada jugador elige su provincia/ciudad/carrera por turnos
  estado.jugadores = salaJugadores.map(j => {
    const p = crearJugadorBase(j.nombre, j.avatar);
    p.id = j.id;
    return p;
  });
  estado.numJugadores = salaJugadores.length;
  estado.setupJugadorIdx = 0;
  estado.setupPaso = 0;
  estado.provinciaSeleccionada = null;
  estado.faseOnline = "setup";
  estado.terminado = null;
  partidaTerminada = false;
  online.activo = true;
  online.miIndice = estado.jugadores.findIndex(p => p.id === salaInfo.miId);
  online.version = 1;
  estado._v = 1;
  await supaUpdateSala(salaInfo.codigo, { estado: "jugando", estado_juego: estado, version: 1 });
  entrarJuegoOnline();
}

// Salir de la sala (corta el polling)
function salirSala() {
  detenerTimerTurno();
  limpiarPartidaGuardada();
  if (intervalSala) clearInterval(intervalSala);
  if (intervalSync) clearInterval(intervalSync);
  intervalSala = null;
  intervalSync = null;
  online = { activo: false, miIndice: -1, version: 0 };
  salaInfo = null;
  salaJugadores = [];
  document.getElementById("sala-creada").style.display = "none";
  document.getElementById("sala-unido").style.display = "none";
  mostrarPantalla("pantalla-inicio");
}

// ==================== SINCRONIZACIÓN ONLINE (Fase 2) ====================
let online = { activo: false, miIndice: -1, version: 0 };
let intervalSync = null;

function uid() { return Math.random().toString(36).slice(2, 10); }

// Trae el estado del juego compartido desde la sala
async function supaGetSalaJuego(codigo) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/salas?codigo=eq.${encodeURIComponent(codigo)}&select=estado,estado_juego,version`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) return null;
    const arr = await res.json();
    return arr[0] || null;
  } catch (e) { return null; }
}

// Empuja el estado a la nube. Las actualizaciones se ENCOLAN para que lleguen
// en orden (si no, dos pushes rápidos pueden llegar invertidos y desincronizar el turno).
let pushChain = Promise.resolve();
function pushEstado() {
  if (!online.activo || !salaInfo) return pushChain;
  online.version++;
  estado._v = online.version;
  const v = online.version;
  const snapshot = JSON.parse(JSON.stringify(estado)); // foto del estado en este momento
  const codigo = salaInfo.codigo;
  pushChain = pushChain.then(() => supaUpdateSala(codigo, { estado_juego: snapshot, version: v }))
    .catch(() => {});
  return pushChain;
}

// Entra a la pantalla de juego en modo online y arranca el sync
function entrarJuegoOnline() {
  if (intervalSala) clearInterval(intervalSala);
  if (intervalSync) clearInterval(intervalSync);
  renderOnline();
  intervalSync = setInterval(async () => {
    if (!online.activo || !salaInfo) return;
    const sala = await supaGetSalaJuego(salaInfo.codigo);
    if (!sala || !sala.estado_juego) return;
    if ((sala.version || 0) > online.version) {
      online.version = sala.version;
      estado = sala.estado_juego;
      // ¿La partida terminó? (alguien ganó o quebró) → fin para todos
      if (estado.terminado && !partidaTerminada) {
        partidaTerminada = true;
        if (intervalSync) clearInterval(intervalSync);
        intervalSync = null;
        detenerTimerTurno();
        if (estado.terminado.tipo === "gameover") {
          mostrarGameOver();
        } else {
          const ganador = estado.jugadores.find(p => p.id === estado.terminado.ganadorId) || estado.jugadores[0];
          mostrarPantallaVictoria(ganador);
        }
        return;
      }
      renderOnline();
    }
  }, 1500);
}

// Dibuja la pantalla correcta según la fase online (setup o juego)
function renderOnline() {
  if (estado.faseOnline === "jugando") {
    mostrarPantalla("pantalla-juego");
    actualizarHUD();
    actualizarTurno();
    aplicarGating();
    revisarSolicitudes(); // ¿me pidieron/ofrecieron un préstamo?
    revisarAvisos();      // ¿me respondieron una solicitud?
    return;
  }
  // Fase de setup: cada uno elige su personaje por turnos
  mostrarPantalla("pantalla-setup");
  if (estado.setupJugadorIdx === online.miIndice) {
    renderizarSetup(); // me toca configurar
  } else {
    const quien = estado.jugadores[estado.setupJugadorIdx];
    document.getElementById("setup-avatar").textContent = quien.avatar;
    document.getElementById("setup-nombre").textContent = quien.nombre;
    document.getElementById("setup-paso").textContent = "Eligiendo su personaje...";
    document.getElementById("setup-progress").innerHTML = "";
    document.getElementById("setup-contenido").innerHTML = `<div style="text-align:center;padding:30px;background:#fff3cd;border:1px solid #ffc107;border-radius:12px;">
      <div style="font-size:44px;">⏳</div>
      <div style="font-weight:800;color:var(--azul);">${quien.nombre} está eligiendo su provincia y carrera</div>
      <div style="font-size:13px;color:var(--gris-dark);margin-top:6px;">Esperá tu turno para configurar tu personaje</div>
    </div>`;
  }
}

// ¿Es mi turno? (en local siempre true)
function esMiTurno() {
  return !online.activo || estado.jugadorActual === online.miIndice;
}

// Habilita/bloquea los controles según de quién sea el turno
function aplicarGating() {
  if (!online.activo) return;
  const miTurno = esMiTurno();
  const btnTirar = document.getElementById("btn-tirar");
  const btnSig = document.getElementById("btn-siguiente");
  const footer = document.querySelector(".juego-footer");
  const aviso = document.getElementById("aviso-turno");
  const dado = document.getElementById("dado-display");
  if (miTurno) {
    if (aviso) aviso.style.display = "none";
    if (footer) { footer.style.pointerEvents = "auto"; footer.style.opacity = "1"; }
    if (dado) dado.style.pointerEvents = "auto";
  } else {
    if (btnTirar) btnTirar.style.display = "none";
    if (btnSig) btnSig.style.display = "none";
    if (dado) dado.style.pointerEvents = "none";
    if (footer) { footer.style.pointerEvents = "none"; footer.style.opacity = "0.4"; }
    if (aviso) {
      const nombre = estado.jugadores[estado.jugadorActual].nombre;
      aviso.style.display = "block";
      aviso.innerHTML = `⏳ Es el turno de <strong>${nombre}</strong>. Esperá el tuyo...
      <br><button id="btn-forzar-pase" class="btn btn-rojo btn-sm" style="display:none; margin: 12px auto 0; padding: 6px 16px;" onclick="siguienteTurno(true)">Saltar turno de ${nombre}</button>`;
    }
  }
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
    id: uid(),
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
    seguro: null,
    gastoBase: 0,
    _estadoImpositivo: "Monotributo (Cat. A)", // arrancan como monotributistas
    _saldoIvaAFavor: 0                          // sin saldo a favor de IVA al inicio
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

// En online, solo el jugador que está en su turno de setup puede tocar
function esMiSetup() { return !online.activo || estado.setupJugadorIdx === online.miIndice; }

function seleccionarProvincia(idx) {
  if (!esMiSetup()) return;
  estado.provinciaSeleccionada = idx;
  renderizarSetup();
}

function volverProvincias() {
  if (!esMiSetup()) return;
  estado.provinciaSeleccionada = null;
  renderizarSetup();
}

function volverACiudad() {
  if (!esMiSetup()) return;
  // Volver desde "Elegí tu carrera" a la selección de provincia/ciudad
  estado.setupPaso = 0;
  estado.provinciaSeleccionada = null;
  renderizarSetup();
}

function seleccionarCiudad(idx) {
  if (!esMiSetup()) return;
  const j = estado.jugadores[estado.setupJugadorIdx];
  j.provincia = PROVINCIAS[estado.provinciaSeleccionada].nombre;
  j.ciudad = PROVINCIAS[estado.provinciaSeleccionada].ciudades[idx];
  j._ciudadIdx = idx;
  estado.setupPaso = 1;
  estado.provinciaSeleccionada = null;
  renderizarSetup();
}

function seleccionarCarrera(idx) {
  if (!esMiSetup()) return;
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
    if (online.activo) {
      estado.inicioPartida = Date.now(); // reloj global de partida
      estado.faseOnline = "jugando";
      estado.jugadorActual = 0;
      estado.ronda = 1;
      initMercado();
      pushEstado();
      renderOnline();
    } else {
      iniciarJuego();
    }
  } else {
    if (online.activo) {
      pushEstado();
      renderOnline();
    } else {
      renderizarSetup();
    }
  }
}

// ==================== JUEGO ====================
function iniciarJuego() {
  estado.jugadorActual = 0;
  estado.ronda = 1;
  estado.terminado = null;
  partidaTerminada = false;
  estado.inicioPartida = Date.now(); // reloj global de partida
  initMercado();
  track("partida_iniciada", { modo: "local", jugadores: estado.jugadores.length });
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

  const noti = estado.noticiaActual;
  const notiHTML = noti ? `<div style="background:#eaf4ff;border:1px solid var(--celeste);border-radius:10px;padding:8px 10px;margin-bottom:10px;">
      <div style="font-size:12px;font-weight:800;color:var(--azul);">📰 ${noti.emoji} ${noti.titulo}</div>
      <div style="font-size:11px;color:var(--gris-dark);">${noti.texto}</div>
    </div>` : "";

  panel.innerHTML = `
    <div style="font-weight:800;color:var(--azul);margin-bottom:2px;">📊 Mercado</div>
    <div style="font-size:11px;color:var(--gris-dark);margin-bottom:8px;">Variación del último mes</div>
    ${notiHTML}
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

// Noticia del mes: elige una al azar, aplica su efecto al mercado y la guarda para mostrar
function aplicarNoticia() {
  if (!estado.precios) initMercado();
  const n = NOTICIAS[Math.floor(Math.random() * NOTICIAS.length)];
  (n.efectos || []).forEach(ef => {
    let objetivos;
    if (ef.t === "ACCIONES") objetivos = ACCIONES.map(a => a.nombre);
    else if (ef.t === "FCI") objetivos = FCI.map(f => f.nombre);
    else if (ef.t === "TODOS") objetivos = INSTRUMENTOS.map(i => i.nombre);
    else objetivos = [ef.t];
    objetivos.forEach(nombre => {
      const inst = getInstrumento(nombre);
      if (!inst || estado.precios[nombre] == null) return;
      let nuevo = Math.round(estado.precios[nombre] * (1 + ef.p));
      nuevo = Math.max(Math.round(inst.precio * 0.25), Math.min(Math.round(inst.precio * 6), nuevo));
      estado.precios[nombre] = nuevo;
    });
  });
  estado.noticiaActual = { emoji: n.emoji, titulo: n.titulo, texto: n.texto };
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
  guardarPartida();
}

// ==================== GUARDAR/CONTINUAR PARTIDA (anti-refresh) ====================
const PARTIDA_KEY = "vida_partida_actual";

function guardarPartida() {
  try {
    if (online.activo && salaInfo) {
      // Online: guardamos solo los datos para reconectar a la sala (el estado vive en la nube)
      localStorage.setItem(PARTIDA_KEY, JSON.stringify({ modo: "online", salaInfo }));
    } else if (pantallaActual === "pantalla-juego" && estado.jugadores.length > 0) {
      localStorage.setItem(PARTIDA_KEY, JSON.stringify({ modo: "local", estado }));
    }
  } catch (e) {}
}

function limpiarPartidaGuardada() {
  try { localStorage.removeItem(PARTIDA_KEY); } catch (e) {}
  const btn = document.getElementById("btn-continuar");
  if (btn) btn.style.display = "none";
}

// Al cargar la página: si hay una partida guardada, muestra el botón "Continuar"
function restaurarPartida() {
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(PARTIDA_KEY) || "null"); } catch (e) {}
  const btn = document.getElementById("btn-continuar");
  if (!btn) return;
  if (snap && (snap.modo === "local" || snap.modo === "online")) {
    btn.style.display = "flex";
  } else {
    btn.style.display = "none";
  }
}

async function continuarPartida() {
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(PARTIDA_KEY) || "null"); } catch (e) {}
  if (!snap) return;

  if (snap.modo === "local") {
    estado = snap.estado;
    online = { activo: false, miIndice: -1, version: 0 };
    mostrarPantalla("pantalla-juego");
    actualizarHUD();
    actualizarTurno();
    return;
  }

  if (snap.modo === "online" && snap.salaInfo) {
    if (!hayBaseDeDatos()) { alert("No se puede reconectar (sin base de datos)."); return; }
    salaInfo = snap.salaInfo;
    const sala = await supaGetSalaJuego(salaInfo.codigo);
    if (!sala || !sala.estado_juego) {
      alert("La sala ya no existe. La partida terminó o fue cerrada.");
      limpiarPartidaGuardada();
      return;
    }
    estado = sala.estado_juego;
    online.activo = true;
    online.version = sala.version || 1;
    online.miIndice = estado.jugadores.findIndex(p => p.id === salaInfo.miId);
    entrarJuegoOnline();
  }
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
  const resEl = document.getElementById("dado-resultado");
  if (resEl) resEl.innerHTML = "";
  actualizarMercadoPanel();
  turnoTirado = false;
  tirando = false;
  iniciarTimerTurno();
}

// ==================== CRONÓMETRO DE TURNO (1:30) ====================
const SEGUNDOS_POR_TURNO = 90;
let timerTurno = null;
let segundosTurno = SEGUNDOS_POR_TURNO;
let turnoTirado = false;

function iniciarTimerTurno() {
  detenerTimerTurno();
  segundosTurno = SEGUNDOS_POR_TURNO;
  actualizarTimerDisplay();
  timerTurno = setInterval(() => {
    segundosTurno--;
    actualizarTimerDisplay();
    checkTiempoGlobal(); // reloj global de partida
    if (segundosTurno <= 0) {
      detenerTimerTurno();
      turnoAgotado();
    }
  }, 1000);
}

function detenerTimerTurno() {
  if (timerTurno) clearInterval(timerTurno);
  timerTurno = null;
}

function actualizarTimerDisplay() {
  const el = document.getElementById("turno-timer");
  if (!el) return;
  const s = Math.max(0, segundosTurno);
  el.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  el.style.color = s <= 30 ? "var(--rojo)" : "var(--azul)";
  el.style.fontWeight = s <= 30 ? "800" : "600";

  // Mostrar botón si el tiempo llegó a 0 y es el turno del otro
  if (s <= 0 && online.activo && !esMiTurno()) {
    const btnForzar = document.getElementById("btn-forzar-pase");
    if (btnForzar) btnForzar.style.display = "block";
  }
}

function cerrarTodosModales() {
  document.querySelectorAll(".modal-overlay").forEach(m => { m.style.display = "none"; });
}

function turnoAgotado() {
  if (online.activo && !esMiTurno()) return; // solo el jugador del turno auto-pasa
  cerrarTodosModales();
  // Si se acabó el tiempo con un dilema abierto, se resuelve al azar y pasa el turno
  if (decisionPendiente) {
    const { evento, jugador } = decisionPendiente;
    aplicarDecision(jugador, evento, Math.floor(Math.random() * evento.opciones.length));
    decisionPendiente = null;
    actualizarHUD();
    if (online.activo) pushEstado();
    siguienteTurno();
    return;
  }
  if (!turnoTirado) {
    // No tiró: se le tira automáticamente para que no pierda sus ingresos, y pasa
    const dado = Math.floor(Math.random() * 6) + 1;
    document.getElementById("dado-display").textContent = CARAS_DADO[dado - 1];
    procesarTurno(dado, true);
  } else {
    siguienteTurno();
  }
}

let tirando = false;
function tirarDado() {
  if (!esMiTurno() || tirando) return; // online: solo actúa el jugador del turno
  tirando = true;
  const dado = document.getElementById("dado-display");
  const res = document.getElementById("dado-resultado");
  document.getElementById("btn-tirar").style.display = "none";
  if (res) res.innerHTML = "";

  const resultado = Math.floor(Math.random() * 6) + 1;
  dado.classList.add("girando");

  // El dado "rueda" cambiando de cara ~1 segundo
  let ticks = 0;
  const giro = setInterval(() => {
    dado.textContent = CARAS_DADO[Math.floor(Math.random() * 6)];
    if (++ticks >= 12) {
      clearInterval(giro);
      dado.classList.remove("girando");
      dado.textContent = CARAS_DADO[resultado - 1];
      dado.classList.add("cayo");
      setTimeout(() => dado.classList.remove("cayo"), 400);

      // Mostrar solo el número que salió
      if (res) {
        res.innerHTML = `<div style="font-size:20px;font-weight:800;color:var(--azul);">Sacaste un ${resultado}</div>`;
      }

      // Recién ahí (tras leer el número) aparece el evento
      setTimeout(() => { tirando = false; procesarTurno(resultado); }, 1100);
    }
  }, 85);
}

function procesarTurno(dado, auto) {
  // El cronómetro NO se frena al tirar: sigue corriendo hasta "Siguiente turno"
  turnoTirado = true;
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

  // 2) Retorno de empresas (CON RIESGO: una empresa puede tener un mal mes o uno flojo)
  let retornoEmpresa = 0;
  let empresasRiesgo = []; // avisos de empresas con problemas este mes
  j.empresas.forEach(e => {
    const suerte = Math.random();
    if (suerte < 0.04) {
      // Mal mes (4%): en vez de ganar, la empresa genera pérdida (entre 0.8x y 1.5x el retorno)
      const perdida = Math.round(e.retornoPorTurno * (0.8 + Math.random() * 0.7));
      retornoEmpresa -= perdida;
      empresasRiesgo.push({ nombre: e.nombre, emoji: e.emoji, tipo: "perdida", monto: -perdida });
    } else if (suerte < 0.12) {
      // Mes flojo (8%): rinde solo el 40%
      const flojo = Math.round(e.retornoPorTurno * 0.4);
      retornoEmpresa += flojo;
      empresasRiesgo.push({ nombre: e.nombre, emoji: e.emoji, tipo: "flojo", monto: flojo });
    } else {
      // Mes normal (88%)
      retornoEmpresa += e.retornoPorTurno;
    }
  });

  // 3) Alquiler de propiedades (NO entra en la base de Ganancias)
  let alquiler = 0;
  j.propiedades.forEach(p => { alquiler += p.alquilerPorTurno; });

  // 4) Gastos fijos = 60% del ingreso por sueldo de este turno
  const gastosFijos = Math.round(ingresoSueldo * 0.6);

  // 5) Préstamos: Sistema Alemán — capital fijo + interés sobre el saldo deudor (baja mes a mes)
  let interesPrestamos = 0;
  let amortizacion = 0;
  j.prestamos.forEach(p => {
    const interes = Math.round(p.principal * p.tasaMensual);
    const capital = Math.min(p.cuotaPrincipal, p.principal);
    interesPrestamos += interes;
    amortizacion += capital;
    p.principal -= capital;
    // Si es un préstamo de otro jugador, el prestamista cobra la cuota
    if (p.tipo === "jugador" && p.acreedorId) {
      const acreedor = estado.jugadores.find(x => x.id === p.acreedorId);
      if (acreedor) acreedor.saldo += interes + capital;
    }
  });
  j.prestamos = j.prestamos.filter(p => p.principal > 0.5);
  const cuotaTotal = interesPrestamos + amortizacion;

  // 6) Costo de carrera mientras estudia
  const costoCarrera = (j.enCarrera && j.carrera.costo > 0) ? j.carrera.costo : 0;

  // 6b) Prima mensual del seguro de quiebra (si tiene uno contratado)
  const primaSeguro = j.seguro ? j.seguro.prima : 0;

  // 7) El mercado se mueve este mes y aparece la noticia del mes
  actualizarMercado();
  aplicarNoticia();
  actualizarMercadoPanel();

  // Liquidación impositiva mensual según el régimen del jugador
  const esRI = j._estadoImpositivo === "Responsable Inscripto";
  let pagoIva = 0, ivaUsadoAFavor = 0, pagoMonotributo = 0;
  if (esRI) {
    // Responsable Inscripto: IVA mensual = Débito (ventas) − Crédito (compras)
    const ivaDebito = retornoEmpresa * 0.21; // ventas: si la empresa pierde, el débito es negativo (genera crédito)
    const ivaCredito = (gastosFijos * 0.40) * 0.21; // crédito fiscal por gastos operativos con IVA
    const posicionMensual = Math.round(ivaDebito - ivaCredito);
    if (posicionMensual > 0) {
      const aFavor = j._saldoIvaAFavor || 0;
      if (aFavor >= posicionMensual) {
        ivaUsadoAFavor = posicionMensual;
        j._saldoIvaAFavor = aFavor - posicionMensual;
      } else {
        ivaUsadoAFavor = aFavor;
        pagoIva = posicionMensual - aFavor;
        j._saldoIvaAFavor = 0;
      }
    } else {
      // Más compras que ventas: se acumula saldo a favor técnico para el mes siguiente
      j._saldoIvaAFavor = (j._saldoIvaAFavor || 0) + Math.abs(posicionMensual);
    }
  } else {
    // Monotributista: cuota fija mensual según categoría (incluye impuesto + jubilación + obra social)
    const reg = j._estadoImpositivo || "Monotributo (Cat. A)";
    if (reg.includes("Cat. C")) pagoMonotributo = 50000;
    else if (reg.includes("Cat. H")) pagoMonotributo = 100000;
    else pagoMonotributo = 25000; // Cat. A o por defecto
  }

  const saldoAntes = j.saldo;
  const ingresado = ingresoSueldo + retornoEmpresa + alquiler;
  const gastos = gastosFijos + cuotaTotal + costoCarrera + primaSeguro + pagoIva + pagoMonotributo;
  j.saldo += ingresado - gastos;

  // Acumular para la liquidación semestral
  j._acumIngresos = (j._acumIngresos || 0) + ingresoSueldo + retornoEmpresa + alquiler;
  // Deducciones permitidas: intereses de préstamos (NO el capital), cuota de carrera y 20% de gastos fijos
  // (simulando deducciones de la actividad: home office, ropa de trabajo, etc.)
  j._acumDeducciones = (j._acumDeducciones || 0) + interesPrestamos + costoCarrera + Math.round(gastosFijos * 0.20);

  // El dado decide la suerte: bajo = malo, medio = neutro/chico, alto = bueno
  // Los eventos reciben (saldo, patrimonio): los gastos grandes usan el patrimonio
  let evento = null, impactoEvento = 0, esEventoDecision = false;
  const patri = calcularPatrimonio(j);
  // Los eventos fiscales de IVA/Ganancias (soloRI) solo le aparecen al Responsable Inscripto
  const positivos = EVENTOS.filter(e => e.tipo === "pos" && (!e.soloRI || esRI));
  const negativos = EVENTOS.filter(e => e.tipo === "neg" && (!e.soloRI || esRI));
  const decisiones = EVENTOS.filter(e => e.tipo === "decision" && (!e.soloRI || esRI));
  // 30% de las veces aparece un DILEMA (rompe la predictibilidad del dado y obliga a decidir)
  if (decisiones.length && Math.random() < 0.30) {
    evento = decisiones[Math.floor(Math.random() * decisiones.length)];
    esEventoDecision = true; // el impacto lo define la decisión del jugador, no el dado
  } else if (dado <= 2) {
    // 1-2: evento negativo
    evento = negativos[Math.floor(Math.random() * negativos.length)];
    impactoEvento = evento.impacto(j.saldo, patri);
  } else if (dado <= 4) {
    // 3-4: neutro o pequeña oportunidad (50%)
    if (Math.random() < 0.5) {
      evento = positivos[Math.floor(Math.random() * positivos.length)];
      impactoEvento = Math.round(evento.impacto(j.saldo, patri) * 0.4); // oportunidad chica
    }
  } else {
    // 5-6: evento positivo (pleno, con el +10% de beneficios)
    evento = positivos[Math.floor(Math.random() * positivos.length)];
    impactoEvento = Math.round(evento.impacto(j.saldo, patri) * BONUS_BENEFICIOS);
  }
  let eventoIvaAFavor = false;
  if (evento && !esEventoDecision) {
    if (evento.titulo === "IVA a favor" && esRI) {
      // El IVA a favor NO es plata en mano: va a tu cuenta de ARCA (saldo a favor técnico)
      j._saldoIvaAFavor = (j._saldoIvaAFavor || 0) + Math.abs(impactoEvento);
      eventoIvaAFavor = true;
    } else {
      j.saldo += impactoEvento;
      // Si sufriste una retención, queda como saldo a cuenta del impuesto del semestre
      if (evento.titulo === "Retención impositiva") {
        j._acumRetenciones = (j._acumRetenciones || 0) + Math.abs(impactoEvento);
      }
    }
  }

  // Recategorización y liquidación impositiva cada 6 meses (Monotributo vs Responsable Inscripto)
  let impuesto = 0, baseImpuesto = 0, impuestoDeterminado = 0;
  if (j.meses > 0 && j.meses % 6 === 0) {
    // La base imponible descuenta los gastos deducibles (NO el capital de los préstamos)
    baseImpuesto = Math.max(0, (j._acumIngresos || 0) - (j._acumDeducciones || 0));
    const LIMITE_MONOTRIBUTO = 15000000; // tope de facturación semestral (valor de juego)
    if (baseImpuesto <= LIMITE_MONOTRIBUTO) {
      // Monotributo: la cuota ya se cobra mes a mes, así que en la liquidación semestral NO paga Ganancias.
      // El semestre solo lo recategoriza (le actualiza la letra según cuánto facturó).
      const categoria = baseImpuesto <= 5000000 ? "A" : (baseImpuesto <= 10000000 ? "C" : "H");
      impuestoDeterminado = 0;
      j._estadoImpositivo = `Monotributo (Cat. ${categoria})`;
    } else {
      // Responsable Inscripto: tope del Monotributo + 30% del excedente (sin salto brusco)
      impuestoDeterminado = Math.round(liquidarGananciasRI(baseImpuesto));
      j._estadoImpositivo = "Responsable Inscripto";
    }
    // Las retenciones sufridas son pago a cuenta: se restan del impuesto determinado
    const retencionesAcumuladas = j._acumRetenciones || 0;
    impuesto = Math.max(0, impuestoDeterminado - retencionesAcumuladas);
    const saldoAFavor = Math.max(0, retencionesAcumuladas - impuestoDeterminado);
    j.saldo -= impuesto;
    if (saldoAFavor > 0) j.saldo += saldoAFavor; // te retuvieron de más: reintegro
    // Historial para mostrar en pantalla
    j._ultimoImpuesto = impuesto;
    j._ultimaBaseImpuesto = baseImpuesto;
    j._ultimasDeducciones = j._acumDeducciones || 0;
    j._ultimasRetenciones = retencionesAcumuladas;
    j._ultimoImpuestoDeterminado = impuestoDeterminado;
    // Reset de acumuladores del semestre
    j._acumIngresos = 0;
    j._acumDeducciones = 0;
    j._acumRetenciones = 0;
    j._prestamosSemestre = {}; // nuevo semestre: se reinician los créditos por banco
  }

  // Guardar el resumen del turno para mostrarlo
  j._resumen = {
    saldoAntes, ingresoSueldo, retornoEmpresa, alquiler, empresasRiesgo,
    gastosFijos, interesPrestamos, amortizacion, costoCarrera, primaSeguro,
    pagoIva, ivaUsadoAFavor, saldoIva: j._saldoIvaAFavor, pagoMonotributo, eventoIvaAFavor,
    evento, impactoEvento, impuesto, baseImpuesto, estadoImpositivo: j._estadoImpositivo, saldoDespues: j.saldo
  };

  // Si tocó un dilema, hay que resolverlo antes de cerrar el turno
  if (esEventoDecision) {
    if (auto) {
      // Sin jugador (tiempo agotado / bot): se elige al azar y sigue
      aplicarDecision(j, evento, Math.floor(Math.random() * evento.opciones.length));
    } else {
      mostrarModalDecision(evento, j); // el turno continúa en resolverDecision()
      return;
    }
  }

  if (auto) {
    // Auto-pase por tiempo agotado: sin modal, verifica victoria y pasa
    if (online.activo) pushEstado();
    if (calcularPatrimonio(j) >= META_VICTORIA) { detenerTimerTurno(); mostrarVictoria(j); return; }
    siguienteTurno();
    return;
  }

  mostrarResumenTurno(j);
  if (online.activo) pushEstado(); // sincronizar el resultado del turno
}

// ==================== EVENTOS-DECISIÓN (DILEMAS) ====================
let decisionPendiente = null;

function mostrarModalDecision(evento, jugador) {
  decisionPendiente = { evento, jugador };
  document.getElementById("decision-emoji").textContent = evento.emoji;
  document.getElementById("decision-titulo").textContent = evento.titulo;
  document.getElementById("decision-desc").textContent = evento.desc;
  const cont = document.getElementById("decision-opciones");
  cont.innerHTML = "";
  evento.opciones.forEach((opc, i) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.textContent = opc.texto;
    btn.onclick = () => resolverDecision(i);
    cont.appendChild(btn);
  });
  document.getElementById("modal-decision").style.display = "flex";
}

// Aplica el resultado de la opción elegida al jugador y al resumen del turno
function aplicarDecision(jugador, evento, indexOpcion) {
  const resultado = evento.opciones[indexOpcion].resolver();
  jugador.saldo += resultado.impacto;
  // El evento del resumen pasa a mostrar el desenlace de la decisión
  jugador._resumen.evento = { emoji: evento.emoji, titulo: evento.titulo, desc: resultado.texto };
  jugador._resumen.impactoEvento = resultado.impacto;
  jugador._resumen.saldoDespues = jugador.saldo;
  return resultado;
}

function resolverDecision(indexOpcion) {
  if (!decisionPendiente) return;
  const { evento, jugador } = decisionPendiente;
  aplicarDecision(jugador, evento, indexOpcion);
  document.getElementById("modal-decision").style.display = "none";
  decisionPendiente = null;
  actualizarHUD();
  mostrarResumenTurno(jugador);
  if (online.activo) pushEstado();
}

// Impuesto del Responsable Inscripto: paga el tope del Monotributo + 30% del excedente sobre el límite.
// Así el cruce de Monotributo a RI es gradual y no hay un "salto" que castigue facturar un peso de más.
function liquidarGananciasRI(base) {
  const LIMITE = 15000000;
  const TOPE_MONOTRIBUTO = 600000;
  return TOPE_MONOTRIBUTO + Math.max(0, base - LIMITE) * 0.30;
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
      ${r.eventoIvaAFavor ? `<div style="font-size:11px;color:var(--gris-dark);margin-top:4px;">↳ va a tu saldo a favor de IVA, no a la caja</div>` : ""}
    </div>`;
  }

  if (r.empresasRiesgo && r.empresasRiesgo.length) {
    const filas = r.empresasRiesgo.map(er => {
      const txt = er.tipo === "perdida"
        ? `tuvo un <strong style="color:var(--rojo);">mal mes</strong> (${fmt(er.monto)})`
        : `tuvo un <strong style="color:var(--naranja);">mes flojo</strong> (+${fmt(er.monto)})`;
      return `<div style="margin-top:4px;">${er.emoji} <strong>${er.nombre}</strong> ${txt}</div>`;
    }).join("");
    html += `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--gris-dark);">
      <div style="font-size:12px;font-weight:800;color:#b8860b;letter-spacing:1px;">🏢 TUS EMPRESAS ESTE MES</div>
      ${filas}
    </div>`;
  }

  if (estado.noticiaActual) {
    html += `<div style="background:#eaf4ff;border:1px solid var(--celeste);border-radius:12px;padding:12px;margin-bottom:14px;">
      <div style="font-size:12px;font-weight:800;color:var(--azul);letter-spacing:1px;">📰 NOTICIA DEL MES</div>
      <div style="font-weight:700;color:var(--azul);margin-top:4px;">${estado.noticiaActual.emoji} ${estado.noticiaActual.titulo}</div>
      <div style="font-size:13px;color:var(--gris-dark);">${estado.noticiaActual.texto}</div>
    </div>`;
  }

  if (j._estadoImpositivo === "Responsable Inscripto") {
    let ivaAviso;
    if (r.pagoIva > 0) ivaAviso = `Tuviste que pagar <strong>${fmt(r.pagoIva)}</strong> de IVA a ARCA.`;
    else if (r.ivaUsadoAFavor > 0) ivaAviso = `Compensaste <strong>${fmt(r.ivaUsadoAFavor)}</strong> con tu saldo a favor.`;
    else ivaAviso = `Tuviste más compras que ventas: no pagaste IVA este mes.`;
    html += `<div style="background:#f8f9fa;border:1px solid #ced4da;border-left:4px solid var(--azul-claro);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--gris-dark);">
      <strong>🏛️ Posición mensual de IVA</strong><br>
      ${ivaAviso} Saldo a favor técnico: <strong>${fmt(r.saldoIva || 0)}</strong>
    </div>`;
  }

  if (j.meses > 0 && j.meses % 6 === 0) {
    const regimenStr = j._estadoImpositivo || "Régimen impositivo";
    const esRIliq = regimenStr === "Responsable Inscripto";
    const retencionesStr = (j._ultimasRetenciones > 0) ? `<br><span style="color:var(--verde);">Pago a cuenta (retenciones): −${fmt(j._ultimasRetenciones)}</span>` : "";
    const deduccionesStr = `<br><span style="font-size:12px;color:var(--gris-dark);">Se dedujeron ${fmt(j._ultimasDeducciones || 0)} por intereses, carrera y gastos de actividad.</span>`;
    const titulo = esRIliq ? "🧾 Liquidación semestral de GANANCIAS" : "🔄 Recategorización de Monotributo";
    const lineaPago = esRIliq
      ? `Impuesto determinado: ${fmt(j._ultimoImpuestoDeterminado || 0)}${retencionesStr}<br>Saldo a pagar hoy: <strong style="color:var(--rojo);">${fmt(j._ultimoImpuesto || 0)}</strong>`
      : `<span style="color:var(--verde);">No pagás Ganancias. Tu cuota mensual de Monotributo se ajusta a tu categoría.</span>`;
    html += `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;">
      <strong>${titulo}</strong><br>
      Base imponible neta: <strong>${fmt(j._ultimaBaseImpuesto || 0)}</strong>${deduccionesStr}<br>
      Tu condición: <strong>${regimenStr}</strong><br>
      ${lineaPago}
    </div>`;
  }

  html += `<div style="background:var(--gris);border-radius:12px;padding:14px;margin-bottom:16px;">
    <p style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--azul);">📊 Resumen del turno</p>
    <table style="width:100%;font-size:14px;">
      ${linea("💵 Sueldo", r.ingresoSueldo, false)}
      ${r.retornoEmpresa !== 0 ? linea("🏢 Empresas", Math.abs(r.retornoEmpresa), r.retornoEmpresa < 0) : ""}
      ${linea("🏠 Alquileres", r.alquiler, false)}
      ${linea("🏠 Gastos fijos", r.gastosFijos, true)}
      ${linea("🏦 Interés préstamos (1.5%)", r.interesPrestamos, true)}
      ${linea("🏦 Amortización préstamos", r.amortizacion, true)}
      ${linea("🎓 Cuota de carrera", r.costoCarrera, true)}
      ${linea("🛡️ Prima del seguro", r.primaSeguro, true)}
      ${r.pagoMonotributo > 0 ? linea("📝 Cuota de Monotributo", r.pagoMonotributo, true) : ""}
      ${r.pagoIva > 0 ? linea("🏛️ Pago de IVA mensual", r.pagoIva, true) : ""}
      ${r.evento && !r.eventoIvaAFavor ? linea((r.impactoEvento >= 0 ? "🎁" : "⚠️") + " Evento", Math.abs(r.impactoEvento), r.impactoEvento < 0) : ""}
      ${r.impuesto > 0 ? linea(`🧾 Impuestos semestrales`, r.impuesto, true) : ""}
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

// Cobertura DISPONIBLE = tope total − lo que todavía debés del rescate (capital).
// Así, cuando terminás de pagar el capital, vuelve exacta al tope. El interés NO la afecta.
function coberturaSeguroDisponible(j) {
  if (!j.seguro) return 0;
  const total = j.seguro.coberturaTotal || j.seguro.cobertura || 0;
  const enUso = (j.prestamos || []).filter(p => p.tipo === "seguro").reduce((s, p) => s + p.principal, 0);
  return Math.max(0, Math.round(total - enUso));
}

// Intenta rescatar al jugador con su seguro. Devuelve true si lo salvó.
function intentarRescateSeguro(j) {
  if (!j.seguro || j.saldo >= 0) return false;
  const rojo = -j.saldo;
  const disponible = coberturaSeguroDisponible(j);
  if (disponible < rojo) {
    alert(`⚠️ Tu ${j.seguro.nombre} tiene ${fmt(disponible)} de cobertura disponible, pero tu deuda es de ${fmt(rojo)}. No alcanza a salvarte.`);
    return false;
  }
  j.saldo = 0;
  // Lo que cubrió se transforma en una deuda en cuotas con interés. Esa deuda "ocupa" la cobertura;
  // a medida que devolvés el capital, la cobertura disponible vuelve a subir hacia el tope.
  const cuotas = 12;
  j.prestamos.push({
    banco: `🛡️ ${j.seguro.nombre}`,
    monto: rojo, principal: rojo,
    cuotaPrincipal: Math.round(rojo / cuotas),
    tasaMensual: j.seguro.tasa,
    tipo: "seguro"
  });
  alert(`🛡️ ¡SALVADO POR EL SEGURO!\n${j.seguro.nombre} cubrió ${fmt(rojo)}.\n\nLo devolvés en ${cuotas} cuotas al ${(j.seguro.tasa * 100).toFixed(1)}%/mes (el interés se cobra aparte).\nCobertura disponible ahora: ${fmt(coberturaSeguroDisponible(j))}.`);
  actualizarHUD();
  if (online.activo) pushEstado();
  return true;
}

function verificarQuiebra(j) {
  if (j.saldo < 0) {
    const tieneActivos = j.empresas.length > 0 || j.propiedades.length > 0 || j.acciones.length > 0;
    if (tieneActivos) {
      mostrarQuiebra(j); // primero te ofrece vender activos
      return;
    }
    // Sin activos para responder: último recurso, el seguro
    if (intentarRescateSeguro(j)) { verificarVictoria(j); return; }
    // Sin seguro (o cobertura insuficiente): eliminado
    j.eliminado = true;
    alert(`💸 ${j.nombre} quedó en quiebra y fue eliminado del juego.`);
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
    // Vendió lo que pudo y sigue en rojo: último recurso, el seguro
    if (!intentarRescateSeguro(j)) {
      j.eliminado = true;
      alert(`💸 ${j.nombre} quedó en quiebra y fue eliminado del juego.`);
    }
  }
  verificarVictoria(j);
}

function verificarVictoria(j) {
  const patrimonio = calcularPatrimonio(j);
  if (patrimonio >= META_VICTORIA) {
    finalizarPartida("victoria", j);
    return;
  }

  const vivos = estado.jugadores.filter(x => !x.eliminado);

  // Nadie queda en pie (puede pasar en modo 1 jugador)
  if (vivos.length === 0) {
    finalizarPartida("gameover", null);
    return;
  }

  // En multijugador, gana el último que queda en pie
  if (estado.jugadores.length > 1 && vivos.length === 1) {
    finalizarPartida("victoria", vivos[0]);
    return;
  }

  actualizarHUD();
  document.getElementById("btn-siguiente").style.display = "flex";
}

// Termina la partida (en online avisa a todos los dispositivos)
let partidaTerminada = false;
function finalizarPartida(tipo, ganador) {
  partidaTerminada = true;
  if (online.activo) {
    estado.terminado = { tipo: tipo, ganadorId: ganador ? ganador.id : null };
    pushEstado(); // que los demás se enteren del fin
    if (intervalSync) clearInterval(intervalSync);
    intervalSync = null;
  }
  if (tipo === "gameover") mostrarGameOver();
  else mostrarVictoria(ganador);
}

function mostrarGameOver() {
  detenerTimerTurno();
  limpiarPartidaGuardada();
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

// Límite de deuda = patrimonio total (saldo + activos). Frena el crecimiento rápido.
// El encadenar muchos préstamos se controla con el límite por semestre.
function capacidadEndeudamiento(j) {
  let total = j.saldo;
  j.empresas.forEach(e => total += e.precio);
  j.propiedades.forEach(p => total += p.precio);
  j.acciones.forEach(a => total += getPrecio(a.nombre) * a.cantidad);
  return Math.max(0, Math.round(total));
}

function siguienteTurno(forzar = false) {
  if (online.activo && !esMiTurno() && !forzar) return; // online: solo el jugador del turno puede pasar (o forzar)
  detenerTimerTurno(); // se frena al pasar el turno (se reinicia en el próximo)
  do {
    estado.jugadorActual = (estado.jugadorActual + 1) % estado.jugadores.length;
    if (estado.jugadorActual === 0) estado.ronda++;
  } while (estado.jugadores[estado.jugadorActual].eliminado);

  actualizarHUD();
  actualizarTurno();
  aplicarGating();
  if (online.activo) pushEstado(); // sincronizar el cambio de turno
}

// ==================== VICTORIA ====================
function mostrarVictoria(ganador) {
  detenerTimerTurno();
  limpiarPartidaGuardada();
  estado._ganador = ganador;
  const patr = calcularPatrimonio(ganador);
  track("partida_terminada", { meses: ganador.meses || 0, patrimonio: patr });
  // Solo los usuarios registrados entran al Salón de la Fama; se guarda su MAYOR patrimonio.
  const sesion = getSesion();
  if (sesion && patr > 0) {
    guardarGanador(sesion.nombre, patr, ganador.meses || 0, sesion.usuario || sesion.nombre);
  }
  mostrarPantallaVictoria(ganador);
}

function guardarRegistro() {
  const nombre = (document.getElementById("reg-nombre").value || "").trim() || (estado._ganador ? estado._ganador.nombre : "Anónimo");
  const patrimonio = estado._ganador ? calcularPatrimonio(estado._ganador) : 0;
  const meses = estado._ganador ? (estado._ganador.meses || 0) : 0;
  guardarGanador(nombre, patrimonio, meses, nombre); // invitado: la clave es el nombre
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

// Guarda el récord local del jugador (una entrada por jugador, su MAYOR patrimonio)
function guardarLocal(nombre, patrimonio, meses, jugadorKey) {
  try {
    const ranking = leerRankingLocal();
    const prev = ranking.find(r => (r.jugador || (r.nombre || "").toLowerCase()) === jugadorKey);
    if (prev) {
      if ((patrimonio || 0) > (prev.patrimonio || 0)) {
        prev.nombre = nombre; prev.patrimonio = patrimonio; prev.meses = meses || 0; prev.jugador = jugadorKey; prev.fecha = new Date().toISOString();
      }
    } else {
      ranking.push({ nombre, patrimonio, meses: meses || 0, jugador: jugadorKey, fecha: new Date().toISOString() });
    }
    ranking.sort((a, b) => (b.patrimonio || 0) - (a.patrimonio || 0));
    localStorage.setItem(RANKING_KEY, JSON.stringify(ranking.slice(0, 50)));
  } catch (e) {
    console.warn("No se pudo guardar el ranking local:", e);
  }
}

// ---- Guardar un ganador: un récord por jugador, se actualiza solo si mejora ----
async function guardarGanador(nombre, patrimonio, meses, jugadorKey) {
  jugadorKey = (jugadorKey || nombre || "anon").toLowerCase().trim();
  meses = meses || 0;
  guardarLocal(nombre, patrimonio, meses, jugadorKey); // respaldo siempre
  if (!hayBaseDeDatos()) return;
  const H = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" };
  try {
    // ¿ya tiene un récord este jugador?
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ranking?jugador=eq.${encodeURIComponent(jugadorKey)}&select=patrimonio`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } });
    const existentes = res.ok ? await res.json() : [];
    if (existentes.length > 0) {
      const mejor = Math.max(...existentes.map(e => e.patrimonio || 0));
      if (patrimonio > mejor) {
        // superó su récord de patrimonio: actualizar
        await fetch(`${SUPABASE_URL}/rest/v1/ranking?jugador=eq.${encodeURIComponent(jugadorKey)}`,
          { method: "PATCH", headers: H, body: JSON.stringify({ nombre, patrimonio, meses, fecha: new Date().toISOString() }) });
      }
      // si no mejoró, no se hace nada
    } else {
      // primer récord del jugador
      await fetch(`${SUPABASE_URL}/rest/v1/ranking`,
        { method: "POST", headers: H, body: JSON.stringify({ nombre, patrimonio, meses, jugador: jugadorKey }) });
    }
  } catch (e) {
    console.warn("No se pudo guardar en la base de datos:", e);
  }
}

// ---- Leer el ranking global desde la base de datos (ordenado por tiempo) ----
async function obtenerRankingRemoto() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ranking?select=nombre,patrimonio,meses,jugador,fecha&patrimonio=gt.0&order=patrimonio.desc&limit=50`,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error("Error al leer el ranking");
  return await res.json();
}

// Convierte una cantidad de meses en "X años Y meses"
function fmtTiempo(meses) {
  meses = meses || 0;
  const a = Math.floor(meses / 12), m = meses % 12;
  if (a <= 0) return `${m} ${m === 1 ? "mes" : "meses"}`;
  if (m === 0) return `${a} ${a === 1 ? "año" : "años"}`;
  return `${a} ${a === 1 ? "año" : "años"} ${m} ${m === 1 ? "mes" : "meses"}`;
}

function renderRanking(ranking, esGlobal) {
  const cont = document.getElementById("ranking-contenido");
  const posEmojis = ["🥇", "🥈", "🥉"];
  ranking = (ranking || []).filter(g => (g.patrimonio || 0) > 0).sort((a, b) => (b.patrimonio || 0) - (a.patrimonio || 0));
  // Una entrada por jugador: nos quedamos con su mayor patrimonio (el primero, ya ordenado)
  const vistos = new Set();
  ranking = ranking.filter(g => {
    const clave = (g.jugador || g.nombre || "").trim().toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  if (ranking.length === 0) {
    cont.innerHTML = `<div style="text-align:center;color:var(--gris-dark);padding:24px 8px;">
      <div style="font-size:44px;margin-bottom:8px;">🏅</div>
      <div style="font-weight:700;color:var(--azul);">Todavía no hay campeones</div>
      <div style="font-size:13px;margin-top:4px;">¡Jugá una partida con tu cuenta y tu mayor patrimonio aparecerá acá!</div>
    </div>`;
    return;
  }
  cont.innerHTML = `
    <p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">${esGlobal ? "🌍" : "📱"} Mayor patrimonio alcanzado ${esGlobal ? "(global)" : "(este dispositivo)"}</p>
    ${ranking.map((g, i) => `
      <div class="ranking-item" style="max-width:none;">
        <span class="ranking-pos">${posEmojis[i] || (i + 1) + "º"}</span>
        <span class="ranking-nombre" style="flex:1;margin:0 10px;">${g.nombre}</span>
        <span class="ranking-saldo" style="white-space:nowrap;font-weight:700;">${fmt(g.patrimonio)}</span>
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
  const promo = document.getElementById("promo-registro"); // la tarjeta destacada del inicio
  const s = getSesion();
  if (s) {
    if (cont) cont.innerHTML = `👤 Sesión de <strong>${s.nombre}</strong> · <a href="#" onclick="cerrarSesion();return false;" style="color:var(--azul-claro);font-weight:600;">Cerrar sesión</a>`;
    if (promo) promo.style.display = "none"; // ya está registrado: ocultamos la invitación
  } else {
    if (cont) cont.innerHTML = `Jugás como invitado`;
    if (promo) promo.style.display = "flex"; // invitado: mostramos la invitación
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
      track("registro");
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
    track("login");
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
  // Si no hay sesión, invitamos a registrarse (solo los registrados entran al ranking global)
  const hint = getSesion() ? "" : `<div style="background:#eaf4ff;border:1px solid var(--celeste);border-radius:10px;padding:10px;margin-bottom:10px;font-size:12px;color:var(--azul);text-align:center;">🏆 Iniciá sesión para guardar tu patrimonio en el Salón de la Fama global.</div>`;
  document.getElementById("ranking-final").innerHTML = hint + ranking.map((j, i) => `
    <div class="ranking-item">
      <span class="ranking-pos">${posEmojis[i]}</span>
      <span class="ranking-nombre">${j.avatar} ${j.nombre}</span>
      <span class="ranking-saldo">${fmt(calcularPatrimonio(j))}</span>
    </div>
  `).join("");
}

function reiniciarJuego() {
  detenerTimerTurno();
  partidaTerminada = false;
  limpiarPartidaGuardada();
  if (intervalSync) clearInterval(intervalSync);
  intervalSync = null;
  online = { activo: false, miIndice: -1, version: 0 };
  salaInfo = null;
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
  if (!esMiTurno()) { alert("Esperá tu turno para operar."); return; }
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

    const j = estado.jugadores[estado.jugadorActual];

    // Límite de créditos por semestre por banco
    const maxSem = banco.maxPorSemestre || 2;
    const usados = (j._prestamosSemestre && j._prestamosSemestre[banco.nombre]) || 0;
    if (usados >= maxSem) {
      cont.innerHTML = `<div class="prestamo-resumen" style="background:#f8d7da;border-color:#f5c6cb;">
        Ya usaste tus ${maxSem} crédito${maxSem > 1 ? "s" : ""} de ${banco.nombre} este semestre.<br>
        <span style="font-size:12px;color:var(--gris-dark);">Esperá al próximo semestre o probá con otro banco.</span>
      </div>`;
      return;
    }

    // Tope según patrimonio: la deuda total no puede superar lo que podés solventar
    // (salvo bancos que no exigen patrimonio, ej: Brubank)
    const capacidad = capacidadEndeudamiento(j);
    const deudaActual = j.prestamos.reduce((s, p) => s + p.principal, 0);
    if (!banco.ignoraPatrimonio && (deudaActual + montoSeleccionado) > capacidad) {
      const disponible = Math.max(0, capacidad - deudaActual);
      cont.innerHTML = `<div class="prestamo-resumen" style="background:#f8d7da;border-color:#f5c6cb;">
        Superás tu límite de deuda.<br>
        Deuda máxima (tu patrimonio): ${fmt(capacidad)}<br>
        Deuda actual: ${fmt(deudaActual)} • Disponible: ${fmt(disponible)}<br>
        <span style="font-size:12px;color:var(--gris-dark);">💡 Brubank presta sin exigir patrimonio.</span>
      </div>`;
      return;
    }

    const monto = montoSeleccionado;
    const tasaMensual = banco.tasa;
    const cuotaPrincipal = Math.round(monto / cuotasSeleccionadas);
    const interesInicial = Math.round(monto * tasaMensual);
    const primeraCuota = cuotaPrincipal + interesInicial;
    // Sistema Alemán: el interés total ≈ suma aritmética (la cuota baja mes a mes)
    const interesTotal = Math.round(interesInicial * (cuotasSeleccionadas + 1) / 2);

    cont.innerHTML = `
      <div class="prestamo-resumen">
        <strong>Resumen del préstamo (${banco.nombre}) — Sistema Alemán:</strong><br>
        Monto: ${fmt(monto)} en ${cuotasSeleccionadas} meses<br>
        Cuota de capital (fija): ${fmt(cuotaPrincipal)}<br>
        Interés inicial (${(tasaMensual * 100).toFixed(1)}% sobre saldo): ${fmt(interesInicial)}<br>
        <strong>Primera cuota: ${fmt(primeraCuota)}</strong><br>
        <span style="font-size:12px;color:var(--gris-dark);">💡 La cuota baja mes a mes. Interés total est.: ${fmt(interesTotal)}</span>
      </div>
    `;
    window._prestamoPendiente = { banco: banco.nombre, monto, cuotas: cuotasSeleccionadas, principal: monto, cuotaPrincipal, tasaMensual, tipo: "banco" };
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
    // contar el crédito en el semestre actual
    if (!j._prestamosSemestre) j._prestamosSemestre = {};
    j._prestamosSemestre[p.banco] = (j._prestamosSemestre[p.banco] || 0) + 1;
    window._prestamoPendiente = null;
    cerrarModal("modal-prestamos");
    actualizarHUD();
    if (online.activo) pushEstado();
    const tasaTxt = (p.tasaMensual * 100).toFixed(1);
    alert(`✅ Préstamo de ${fmt(p.monto)} aprobado en ${p.banco}. Te cobran ${tasaTxt}%/mes mientras debas.`);
  };

  // Pagar un mes adelantado (interés sobre saldo deudor + cuota de capital) — Sistema Alemán
  window.pagarCuota = (idx) => {
    const j = estado.jugadores[estado.jugadorActual];
    const p = j.prestamos[idx];
    if (!p) return;
    const interes = Math.round(p.principal * p.tasaMensual);
    const capital = Math.min(p.cuotaPrincipal, p.principal);
    const pago = interes + capital;
    if (j.saldo < pago) { alert(`No te alcanza para pagar el mes (${fmt(pago)} = ${fmt(interes)} interés + ${fmt(capital)} capital). Tenés ${fmt(j.saldo)}.`); return; }
    j.saldo -= pago;
    p.principal -= capital;
    if (p.tipo === "jugador" && p.acreedorId) {
      const ac = estado.jugadores.find(x => x.id === p.acreedorId);
      if (ac) ac.saldo += pago;
    }
    let msg = `✅ Pagaste ${fmt(pago)} a ${p.banco} (${fmt(interes)} interés + ${fmt(capital)} capital).`;
    if (p.principal <= 0.5) {
      j.prestamos.splice(idx, 1);
      msg += `\n¡Saldaste la deuda por completo!`;
    }
    actualizarHUD();
    if (online.activo) pushEstado();
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
    if (p.tipo === "jugador" && p.acreedorId) {
      const ac = estado.jugadores.find(x => x.id === p.acreedorId);
      if (ac) ac.saldo += p.principal;
    }
    j.saldo -= p.principal;
    j.prestamos.splice(idx, 1);
    actualizarHUD();
    if (online.activo) pushEstado();
    render();
    alert(`✅ Cancelaste la deuda con ${p.banco}. Ya no pagás más intereses.`);
  };

  function render() {
    const j = estado.jugadores[estado.jugadorActual];
    let html = `<div style="margin-bottom:16px;">`;
    BANCOS.forEach((b, i) => {
      html += `<div class="prestamo-opcion ${bancoSeleccionado === i ? 'selected' : ''}" onclick="selectBanco(${i})">
        <div class="prestamo-nombre">${b.emoji} ${b.nombre}</div>
        <div class="prestamo-detalle">Interés ${(b.tasa * 100).toFixed(1)}%/mes • Máximo ${fmt(b.maximo)}</div>
        <div class="prestamo-detalle" style="color:var(--verde);">✨ ${b.beneficio}</div>
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
            <div style="margin-bottom:8px;"><strong>${p.banco}</strong> — ${p.tipo === "jugador" ? "Resta" : "Capital restante"}: ${fmt(p.principal)}<br>${p.tipo === "jugador" ? `Cuota: ${fmt(p.cuotaPrincipal)}/mes` : `Próxima cuota: ${fmt(Math.min(p.cuotaPrincipal, p.principal) + Math.round(p.principal * p.tasaMensual))} (${fmt(Math.min(p.cuotaPrincipal, p.principal))} cap + ${fmt(Math.round(p.principal * p.tasaMensual))} int)`}</div>
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

// ==================== SEGURO DE QUIEBRA ====================
function abrirSeguro() {
  if (!esMiTurno()) { alert("Esperá tu turno para operar."); return; }

  window.contratarSeguro = (i) => {
    const j = estado.jugadores[estado.jugadorActual];
    const a = ASEGURADORAS[i];
    if (j.seguro) { alert("Ya tenés un seguro contratado. Cancelalo primero si querés cambiar."); return; }
    if (j.saldo < a.prima) { alert(`No te alcanza para pagar la primera prima (${fmt(a.prima)}). Tenés ${fmt(j.saldo)}.`); return; }
    j.saldo -= a.prima; // pagás el primer mes al contratar
    j.seguro = { nombre: a.nombre, emoji: a.emoji, cobertura: a.cobertura, coberturaTotal: a.cobertura, prima: a.prima, tasa: a.tasa };
    actualizarHUD();
    if (online.activo) pushEstado();
    render();
    alert(`🛡️ Contrataste ${a.nombre}.\nPagás ${fmt(a.prima)}/mes y te cubre hasta ${fmt(a.cobertura)} si quebrás sin activos.`);
  };

  window.cancelarSeguro = () => {
    const j = estado.jugadores[estado.jugadorActual];
    if (!j.seguro) return;
    if (!confirm(`¿Cancelar tu ${j.seguro.nombre}? Dejás de pagar la prima pero perdés la cobertura. No hay reembolso.`)) return;
    j.seguro = null;
    actualizarHUD();
    if (online.activo) pushEstado();
    render();
    alert("Cancelaste el seguro.");
  };

  function render() {
    const j = estado.jugadores[estado.jugadorActual];
    let html = `<p style="font-size:13px;color:var(--gris-dark);margin-bottom:14px;">Si quebrás y no te quedan activos para vender, tu seguro cubre el rojo (hasta su tope) y lo devolvés en cuotas con interés. Es una <strong>línea revolvente</strong>: a medida que pagás esa deuda, la cobertura se recupera. Más cobertura = prima mensual más cara.</p>`;

    if (j.seguro) {
      const s = j.seguro;
      const disponible = coberturaSeguroDisponible(j);
      const enUso = Math.max(0, (s.coberturaTotal || s.cobertura) - disponible);
      html += `<div style="background:#eaf7f0;border:2px solid var(--verde);border-radius:14px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:800;color:var(--azul);font-size:15px;">${s.emoji} ${s.nombre} <span style="color:var(--verde);">· ACTIVO</span></div>
        <div style="font-size:13px;color:var(--gris-dark);margin-top:6px;line-height:1.6;">
          Prima: <strong>${fmt(s.prima)}/mes</strong><br>
          Cobertura total: <strong>${fmt(s.coberturaTotal)}</strong><br>
          ${enUso > 0 ? `En uso por rescate (se recupera al pagar el capital): <strong style="color:var(--naranja);">${fmt(enUso)}</strong><br>` : ""}
          Disponible ahora: <strong style="color:var(--verde);">${fmt(disponible)}</strong><br>
          Interés del rescate: <strong>${(s.tasa * 100).toFixed(1)}%/mes</strong> <span style="font-size:11px;">(se cobra aparte, no descuenta cobertura)</span>
        </div>
        <button class="btn btn-rojo btn-sm" style="margin-top:10px;" onclick="cancelarSeguro()">Cancelar seguro</button>
      </div>`;
    }

    html += ASEGURADORAS.map((a, i) => `
      <div class="prestamo-opcion" ${j.seguro ? 'style="opacity:0.55;"' : ''}>
        <div class="prestamo-nombre">${a.emoji} ${a.nombre}</div>
        <div class="prestamo-detalle">Cobertura ${fmt(a.cobertura)} • Prima ${fmt(a.prima)}/mes • Interés ${(a.tasa * 100).toFixed(1)}%/mes</div>
        <div class="prestamo-detalle" style="color:var(--gris-dark);">${a.descripcion}</div>
        ${j.seguro ? '' : `<button class="btn btn-verde btn-sm" style="margin-top:8px;" onclick="contratarSeguro(${i})">Contratar</button>`}
      </div>`).join("");

    document.getElementById("seguro-contenido").innerHTML = html;
  }

  render();
  document.getElementById("modal-seguro").style.display = "flex";
}

// ==================== PRÉSTAMOS ENTRE JUGADORES ====================
// Concreta el préstamo: transfiere la plata y crea la deuda
function ejecutarPrestamoJugador(prestamista, deudor, monto, total, meses, cuotaMensual) {
  prestamista.saldo -= monto;
  deudor.saldo += monto;
  deudor.prestamos.push({
    tipo: "jugador",
    acreedorId: prestamista.id,
    banco: "Préstamo de " + prestamista.nombre,
    monto: monto,             // lo que recibió
    totalAPagar: total,       // capital + interés
    cuotas: meses,
    principal: total,         // se amortiza hasta 0
    cuotaPrincipal: cuotaMensual,
    tasaMensual: 0            // el interés ya está dentro del total
  });
}

// Online: revisa si tengo solicitudes de préstamo pendientes y las muestro para aceptar/rechazar
function revisarSolicitudes() {
  if (!online.activo || !salaInfo) return;
  if (window._solicitudAbierta) return; // evita mostrar dos veces
  const lista = estado.solicitudesPrestamo || [];
  const miId = salaInfo.miId;
  const sol = lista.find(s => s.aceptanteId === miId);
  if (!sol) return;

  const prestamista = estado.jugadores.find(x => x.id === sol.prestamistaId);
  const deudor = estado.jugadores.find(x => x.id === sol.deudorId);
  if (!prestamista || !deudor) {
    estado.solicitudesPrestamo = lista.filter(s => s.id !== sol.id);
    pushEstado();
    return;
  }

  window._solicitudAbierta = true;
  const soyPrestamista = prestamista.id === miId;
  const pregunta = soyPrestamista
    ? `🤝 ${deudor.nombre} te pide prestado ${fmt(sol.monto)}.\nTe devuelve ${fmt(sol.total)} en ${sol.meses} cuotas de ${fmt(sol.cuotaMensual)}/mes.\n\n¿Aceptás prestarle?`
    : `🤝 ${prestamista.nombre} te ofrece un préstamo de ${fmt(sol.monto)}.\nDevolvés ${fmt(sol.total)} en ${sol.meses} cuotas de ${fmt(sol.cuotaMensual)}/mes.\n\n¿Aceptás la deuda?`;

  const acepta = confirm(pregunta);
  estado.solicitudesPrestamo = (estado.solicitudesPrestamo || []).filter(s => s.id !== sol.id);

  if (acepta) {
    if (prestamista.saldo < sol.monto) {
      alert("No se pudo concretar: el prestamista ya no tiene saldo suficiente.");
    } else {
      ejecutarPrestamoJugador(prestamista, deudor, sol.monto, sol.total, sol.meses, sol.cuotaMensual);
      if (!estado.avisos) estado.avisos = [];
      estado.avisos.push({ id: uid(), paraId: soyPrestamista ? deudor.id : prestamista.id, texto: `✅ Préstamo aceptado: ${prestamista.nombre} le prestó ${fmt(sol.monto)} a ${deudor.nombre} (${fmt(sol.cuotaMensual)}/mes × ${sol.meses}).` });
      alert("✅ Préstamo concretado.");
    }
  } else {
    if (!estado.avisos) estado.avisos = [];
    estado.avisos.push({ id: uid(), paraId: soyPrestamista ? deudor.id : prestamista.id, texto: `❌ Tu solicitud de préstamo fue rechazada.` });
  }
  actualizarHUD();
  pushEstado();
  window._solicitudAbierta = false;
}

// Online: muestra avisos dirigidos a mí (resultado de mis solicitudes)
function revisarAvisos() {
  if (!online.activo || !salaInfo) return;
  const lista = estado.avisos || [];
  const miId = salaInfo.miId;
  const mios = lista.filter(a => a.paraId === miId);
  if (mios.length === 0) return;
  estado.avisos = lista.filter(a => a.paraId !== miId);
  mios.forEach(a => alert(a.texto));
  actualizarHUD();
  pushEstado();
}

function abrirPrestamosJugadores() {
  if (!esMiTurno()) { alert("Esperá tu turno para operar."); return; }
  const yo = estado.jugadores[estado.jugadorActual];
  const otros = estado.jugadores.filter(x => x.id !== yo.id && !x.eliminado);
  if (otros.length === 0) { alert("No hay otros jugadores en la partida para prestar/pedir."); return; }

  let otroId = otros[0].id;
  let direccion = "presto"; // "presto" = yo le presto a el; "pido" = el me presta a mi

  window.pjSelOtro = (id) => { otroId = id; render(); };
  window.pjSelDir = (d) => { direccion = d; render(); };
  window.pjActualizar = () => calcular();

  function calcular() {
    const cont = document.getElementById("pj-resumen");
    if (!cont) return;
    const monto = parseFloat((document.getElementById("pj-monto") || {}).value) || 0;
    const interes = parseFloat((document.getElementById("pj-interes") || {}).value);
    const meses = parseInt((document.getElementById("pj-cuotas") || {}).value) || 0;
    window._pjPend = null;
    if (monto < 1000) { cont.innerHTML = `<div class="prestamo-resumen" style="background:#fff3cd;border-color:#ffc107;">Ingresá el monto que se presta (mínimo ${fmt(1000)}).</div>`; return; }
    if (isNaN(interes) || interes < 0) { cont.innerHTML = `<div class="prestamo-resumen" style="background:#fff3cd;border-color:#ffc107;">Ingresá el interés total en $ (ej: 400).</div>`; return; }
    if (meses < 1 || meses > 24) { cont.innerHTML = `<div class="prestamo-resumen" style="background:#fff3cd;border-color:#ffc107;">Los meses para devolver van de 1 a 24.</div>`; return; }
    const otro = estado.jugadores.find(x => x.id === otroId);
    const prestamista = direccion === "presto" ? yo : otro;
    if (prestamista.saldo < monto) {
      cont.innerHTML = `<div class="prestamo-resumen" style="background:#f8d7da;border-color:#f5c6cb;">${direccion === "presto" ? "No tenés" : prestamista.nombre + " no tiene"} saldo suficiente. Hace falta ${fmt(monto)} y hay ${fmt(prestamista.saldo)}.</div>`;
      return;
    }
    const total = monto + interes;
    const cuotaMensual = Math.round((total / meses) * 100) / 100;
    cont.innerHTML = `<div class="prestamo-resumen">
      <strong>${direccion === "presto" ? "Vos le prestás a " + otro.nombre : otro.nombre + " te presta a vos"}</strong><br>
      Presta: ${fmt(monto)}<br>
      Interés total: ${fmt(interes)} → Total a devolver: ${fmt(total)}<br>
      <strong>Cuota: ${fmt(cuotaMensual)}/mes × ${meses} meses</strong>
    </div>`;
    window._pjPend = { monto, interes, total, meses, cuotaMensual, otroId, direccion };
  }

  window.pjConfirmar = () => {
    if (!window._pjPend) { alert("Completá monto, interés y meses."); return; }
    const p = window._pjPend;
    const otro = estado.jugadores.find(x => x.id === p.otroId);
    const prestamista = p.direccion === "presto" ? yo : otro;
    const deudor = p.direccion === "presto" ? otro : yo;
    if (prestamista.saldo < p.monto) { alert("Saldo insuficiente del prestamista."); return; }

    // ⚠️ El otro jugador SIEMPRE tiene que aceptar (nadie te puede sacar plata ni meterte deuda sin tu OK)
    if (online.activo) {
      // Online: se manda una solicitud y el otro la acepta/rechaza desde su dispositivo
      if (!estado.solicitudesPrestamo) estado.solicitudesPrestamo = [];
      estado.solicitudesPrestamo.push({
        id: uid(),
        aceptanteId: otro.id,
        prestamistaId: prestamista.id,
        deudorId: deudor.id,
        monto: p.monto, interes: p.interes, total: p.total, meses: p.meses, cuotaMensual: p.cuotaMensual
      });
      window._pjPend = null;
      pushEstado();
      cerrarModal("modal-pjugador");
      alert(`📨 Solicitud enviada a ${otro.nombre}. El préstamo se concreta solo si acepta.`);
      return;
    }

    // Local (mismo dispositivo): el otro jugador acepta acá mismo
    const pregunta = p.direccion === "presto"
      ? `${otro.nombre}: ${yo.nombre} te ofrece un préstamo de ${fmt(p.monto)}.\nDevolvés ${fmt(p.total)} en ${p.meses} cuotas de ${fmt(p.cuotaMensual)}/mes.\n\n¿Aceptás la deuda?`
      : `${otro.nombre}: ${yo.nombre} te pide prestado ${fmt(p.monto)}.\nTe devuelve ${fmt(p.total)} en ${p.meses} cuotas de ${fmt(p.cuotaMensual)}/mes.\n\n¿Aceptás prestarle?`;
    if (!confirm(pregunta)) {
      alert(`❌ ${otro.nombre} rechazó el préstamo.`);
      return;
    }
    ejecutarPrestamoJugador(prestamista, deudor, p.monto, p.total, p.meses, p.cuotaMensual);
    window._pjPend = null;
    actualizarHUD();
    cerrarModal("modal-pjugador");
    alert(`✅ Préstamo acordado: ${prestamista.nombre} le prestó ${fmt(p.monto)} a ${deudor.nombre}. Devuelve ${fmt(p.total)} en ${p.meses} meses (${fmt(p.cuotaMensual)}/mes).`);
  };

  function render() {
    let html = `<div style="font-size:13px;color:var(--azul);font-weight:700;margin-bottom:4px;">💵 Tu saldo: ${fmt(yo.saldo)}</div>
      <p style="font-size:13px;color:var(--gris-dark);margin-bottom:12px;">Prestá o pedí plata a otro jugador con la tasa y los meses que acuerden. Sin el 1.5% del banco.</p>`;

    html += `<p style="font-weight:600;font-size:13px;margin-bottom:6px;">¿Con quién?</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">`;
    otros.forEach(o => {
      html += `<button class="btn ${otroId === o.id ? "btn-primary" : "btn-secondary"} btn-sm" onclick="pjSelOtro('${o.id}')">${o.avatar} ${o.nombre}</button>`;
    });
    html += `</div>`;

    html += `<p style="font-weight:600;font-size:13px;margin-bottom:6px;">Dirección</p><div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn ${direccion === "presto" ? "btn-primary" : "btn-secondary"} btn-sm" onclick="pjSelDir('presto')" style="flex:1;">Yo le presto</button>
      <button class="btn ${direccion === "pido" ? "btn-primary" : "btn-secondary"} btn-sm" onclick="pjSelDir('pido')" style="flex:1;">Me presta</button>
    </div>`;

    html += `<input type="number" id="pj-monto" class="sala-input" placeholder="Monto que se presta (ej: 4000)" min="1000" oninput="pjActualizar()">
      <input type="number" id="pj-interes" class="sala-input" placeholder="Interés total en $ (ej: 400)" min="0" oninput="pjActualizar()">
      <input type="number" id="pj-cuotas" class="sala-input" placeholder="Meses para devolver (1 a 24)" min="1" max="24" oninput="pjActualizar()">
      <div id="pj-resumen"></div>
      <button class="btn btn-verde" onclick="pjConfirmar()">Confirmar préstamo</button>`;

    // Lo que me deben otros jugadores
    const meDeben = [];
    estado.jugadores.forEach(d => {
      (d.prestamos || []).forEach(pr => {
        if (pr.tipo === "jugador" && pr.acreedorId === yo.id) meDeben.push({ deudor: d.nombre, restante: pr.principal, cuota: pr.cuotaPrincipal });
      });
    });
    if (meDeben.length > 0) {
      html += `<div style="margin-top:16px;border-top:1px solid var(--gris-med);padding-top:12px;">
        <p style="font-weight:600;font-size:14px;margin-bottom:8px;">💰 Te deben:</p>
        ${meDeben.map(m => `<div style="background:#d4edda;border-radius:8px;padding:10px;margin-bottom:6px;font-size:13px;"><strong>${m.deudor}</strong> — Capital: ${fmt(m.restante)} | Cobrás ${fmt(m.cuota)}/mes</div>`).join("")}
      </div>`;
    }

    document.getElementById("pjugador-contenido").innerHTML = html;
    calcular();
  }

  render();
  document.getElementById("modal-pjugador").style.display = "flex";
}

function abrirInversiones() {
  if (!esMiTurno()) { alert("Esperá tu turno para operar."); return; }
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
    if (online.activo) pushEstado();
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
    if (online.activo) pushEstado();
    render();
    alert(`✅ Vendiste ${ex.cantidad} de ${inst.nombre} por ${fmt(valor)} (${pl >= 0 ? "ganancia" : "pérdida"} de ${fmt(Math.abs(pl))})`);
  };

  render();
  document.getElementById("modal-inversiones").style.display = "flex";
}

function abrirEmpresas() {
  if (!esMiTurno()) { alert("Esperá tu turno para operar."); return; }
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
    if (online.activo) pushEstado();
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
    if (online.activo) pushEstado();
    render();
  };

  render();
  document.getElementById("modal-empresas").style.display = "flex";
}

function abrirPropiedades() {
  if (!esMiTurno()) { alert("Esperá tu turno para operar."); return; }
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
    if (online.activo) pushEstado();
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
    if (online.activo) pushEstado();
    render();
  };

  document.getElementById("propiedades-contenido").innerHTML = "";
  render();
  document.getElementById("modal-propiedades").style.display = "flex";
}

function abrirTributos() {
  const j = estado.jugadores[estado.jugadorActual];
  const regimen = j._estadoImpositivo || "Monotributo (Cat. A)";
  const esRI = regimen === "Responsable Inscripto";
  const proxRecat = 6 - (j.meses % 6 === 0 ? 0 : j.meses % 6);
  const baseParcial = Math.max(0, (j._acumIngresos || 0) - (j._acumDeducciones || 0));

  const fila = (l, v, col) => `<div class="estado-row" style="display:flex;justify-content:space-between;padding:5px 0;"><span style="color:var(--gris-dark);">${l}</span><span style="font-weight:700;${col ? "color:" + col + ";" : ""}">${v}</span></div>`;

  let html = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="display:inline-block;background:${esRI ? "var(--azul)" : "var(--verde)"};color:white;font-weight:800;font-size:15px;padding:8px 18px;border-radius:50px;">${esRI ? "🏛️" : "🧾"} ${regimen}</div>
      <div style="font-size:12px;color:var(--gris-dark);margin-top:8px;">Próxima recategorización en <strong>${proxRecat}</strong> mes(es)</div>
    </div>`;

  // Semestre en curso
  html += `<div class="estado-box">
    <div class="estado-titulo">📅 Semestre en curso</div>
    ${fila("Facturación acumulada", fmt(j._acumIngresos || 0))}
    ${fila("Deducciones acumuladas", "−" + fmt(j._acumDeducciones || 0), "var(--verde)")}
    ${fila("Base imponible parcial", fmt(baseParcial))}
    ${fila("Retenciones a favor", fmt(j._acumRetenciones || 0), "var(--verde)")}
    ${esRI ? fila("Saldo a favor de IVA", fmt(j._saldoIvaAFavor || 0), "var(--verde)") : ""}
  </div>`;

  // Última liquidación (si ya hubo una)
  if (j._ultimoImpuesto !== undefined) {
    html += `<div class="estado-box">
      <div class="estado-titulo">🧾 Última liquidación semestral</div>
      ${fila("Base imponible neta", fmt(j._ultimaBaseImpuesto || 0))}
      ${fila("Deducciones aplicadas", "−" + fmt(j._ultimasDeducciones || 0), "var(--verde)")}
      ${fila("Impuesto determinado", fmt(j._ultimoImpuestoDeterminado || 0))}
      ${(j._ultimasRetenciones > 0) ? fila("Retenciones (pago a cuenta)", "−" + fmt(j._ultimasRetenciones), "var(--verde)") : ""}
      ${fila("Pagado", fmt(j._ultimoImpuesto || 0), "var(--rojo)")}
    </div>`;
  }

  // Explicación de los regímenes
  html += `<div style="background:var(--gris);border-radius:12px;padding:12px;font-size:12px;color:var(--gris-dark);line-height:1.6;">
    <strong>¿Cómo tributás?</strong><br>
    🧾 <strong>Monotributo</strong>: hasta ${fmt(15000000)} de base semestral. Cuota fija <strong>mensual</strong> ($25k Cat. A / $50k Cat. C / $100k Cat. H). Todo unificado, no pagás Ganancias ni IVA aparte.<br>
    🏛️ <strong>Responsable Inscripto</strong>: si superás ese tope. Pagás Ganancias semestral (tope + 30% del excedente) <em>y</em> liquidás <strong>IVA mensual</strong> (Débito por ventas − Crédito por compras).<br>
    💡 Las <strong>deducciones</strong> (intereses, carrera, gastos) bajan la base. Las <strong>retenciones</strong> son plata que ya pagaste a cuenta del impuesto.
  </div>`;

  document.getElementById("tributos-contenido").innerHTML = html;
  document.getElementById("modal-tributos").style.display = "flex";
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

  `;

  // ===== Estado de Situación Patrimonial (Balance) =====
  const caja = j.saldo;
  const inv = j.acciones.reduce((s, a) => s + getPrecio(a.nombre) * a.cantidad, 0);
  const emp = j.empresas.reduce((s, e) => s + e.precio, 0);
  const props = j.propiedades.reduce((s, p) => s + p.precio, 0);
  const totalActivo = caja + inv + emp + props;
  const deudaBanco = j.prestamos.filter(p => p.tipo !== "jugador").reduce((s, p) => s + p.principal, 0);
  const deudaJug = j.prestamos.filter(p => p.tipo === "jugador").reduce((s, p) => s + p.principal, 0);
  const totalPasivo = deudaBanco + deudaJug;
  const pn = totalActivo - totalPasivo;
  const fila = (l, v, col) => `<tr class="estado-row"><td>${l}</td><td style="text-align:right;font-weight:600;${col ? "color:" + col + ";" : ""}">${fmt(v)}</td></tr>`;
  const sub = (l, v, col) => `<tr class="estado-sub"><td>${l}</td><td style="text-align:right;${col ? "color:" + col + ";" : ""}">${fmt(v)}</td></tr>`;

  html += `<div class="estado-box">
    <div class="estado-titulo">📋 Estado de Situación Patrimonial</div>
    <table>
      <tr><td class="estado-cat" colspan="2">ACTIVO</td></tr>
      ${fila("💵 Caja y bancos", caja, caja < 0 ? "var(--rojo)" : "")}
      ${fila("📈 Inversiones (acciones y FCI)", inv)}
      ${fila("🏢 Empresas", emp)}
      ${fila("🏠 Propiedades", props)}
      ${sub("Total Activo", totalActivo)}
      <tr><td class="estado-cat" colspan="2">PASIVO</td></tr>
      ${fila("🏦 Deudas bancarias", deudaBanco, "var(--rojo)")}
      ${deudaJug > 0 ? fila("🤝 Deudas con jugadores", deudaJug, "var(--rojo)") : ""}
      ${sub("Total Pasivo", totalPasivo, "var(--rojo)")}
      <tr class="estado-total"><td>💰 PATRIMONIO NETO</td><td style="text-align:right;">${fmt(pn)}</td></tr>
    </table>
  </div>`;

  // ===== Estado de Resultados (último mes) =====
  const r = j._resumen;
  if (r) {
    const evPos = (r.impactoEvento > 0 && !r.eventoIvaAFavor) ? r.impactoEvento : 0; // el IVA a favor no es ingreso de caja
    const evNeg = r.impactoEvento < 0 ? -r.impactoEvento : 0;
    // Las empresas pueden tener un mal mes: si el retorno es negativo, va a EGRESOS (pérdida)
    const empPos = (r.retornoEmpresa || 0) > 0 ? r.retornoEmpresa : 0;
    const empNeg = (r.retornoEmpresa || 0) < 0 ? -r.retornoEmpresa : 0;
    const totalIng = (r.ingresoSueldo || 0) + empPos + (r.alquiler || 0) + evPos;
    const totalEgr = (r.gastosFijos || 0) + (r.interesPrestamos || 0) + (r.amortizacion || 0) + (r.costoCarrera || 0) + (r.impuesto || 0) + evNeg + empNeg + (r.primaSeguro || 0) + (r.pagoIva || 0) + (r.pagoMonotributo || 0);
    const resultado = totalIng - totalEgr;
    html += `<div class="estado-box">
      <div class="estado-titulo">📈 Estado de Resultados — ${fechaJugador(j)}</div>
      <table>
        <tr><td class="estado-cat" colspan="2">INGRESOS</td></tr>
        ${r.ingresoSueldo ? fila("💵 Sueldo", r.ingresoSueldo, "var(--verde)") : ""}
        ${empPos ? fila("🏢 Empresas", empPos, "var(--verde)") : ""}
        ${r.alquiler ? fila("🏠 Alquileres", r.alquiler, "var(--verde)") : ""}
        ${evPos ? fila("🎁 Evento favorable", evPos, "var(--verde)") : ""}
        ${sub("Total Ingresos", totalIng, "var(--verde)")}
        <tr><td class="estado-cat" colspan="2">EGRESOS</td></tr>
        ${r.gastosFijos ? fila("🏠 Gastos fijos", r.gastosFijos, "var(--rojo)") : ""}
        ${empNeg ? fila("🏢 Pérdida de empresas", empNeg, "var(--rojo)") : ""}
        ${r.interesPrestamos ? fila("🏦 Interés de préstamos", r.interesPrestamos, "var(--rojo)") : ""}
        ${r.amortizacion ? fila("🏦 Amortización", r.amortizacion, "var(--rojo)") : ""}
        ${r.costoCarrera ? fila("🎓 Cuota de carrera", r.costoCarrera, "var(--rojo)") : ""}
        ${r.primaSeguro ? fila("🛡️ Prima del seguro", r.primaSeguro, "var(--rojo)") : ""}
        ${r.pagoMonotributo ? fila("📝 Cuota de Monotributo", r.pagoMonotributo, "var(--rojo)") : ""}
        ${r.pagoIva ? fila("🏛️ IVA mensual (RI)", r.pagoIva, "var(--rojo)") : ""}
        ${r.impuesto ? fila("🧾 Impuesto a las Ganancias", r.impuesto, "var(--rojo)") : ""}
        ${evNeg ? fila("⚠️ Evento desfavorable", evNeg, "var(--rojo)") : ""}
        ${sub("Total Egresos", totalEgr, "var(--rojo)")}
        <tr class="estado-total"><td>📊 RESULTADO DEL MES</td><td style="text-align:right;color:${resultado >= 0 ? "var(--verde)" : "var(--rojo)"};">${resultado >= 0 ? "+" : "−"}${fmt(Math.abs(resultado))}</td></tr>
      </table>
    </div>`;
  }

  // Nota de impuesto + carrera
  html += `<div style="font-size:12px;color:var(--gris-dark);margin-bottom:8px;background:#fff3cd;padding:8px;border-radius:6px;border:1px solid #ffc107;">🧾 Régimen actual: <strong>${j._estadoImpositivo || "No categorizado"}</strong> · Últ. pago: ${fmt(j._ultimoImpuesto || 0)} · Base imponible parcial: ${fmt(Math.max(0, (j._acumIngresos || 0) - (j._acumDeducciones || 0)))} · Retenciones a favor: ${fmt(j._acumRetenciones || 0)} · próx. recategorización en ${6 - (j.meses % 6 === 0 ? 0 : j.meses % 6)} mes(es)</div>`;
  html += `${j.enCarrera ? `<div style="background:#cce5ff;border-radius:8px;padding:12px;font-size:13px;">🎓 Estudiando ${j.carrera.nombre} — Año ${Math.min(j.carrera.duracion, Math.floor(j.mesesCarrera / MESES_POR_ANIO_CARRERA) + 1)}/${j.carrera.duracion}</div>` : ""}`;

  document.getElementById("finanzas-contenido").innerHTML = html;
  document.getElementById("modal-finanzas").style.display = "flex";
}

// Al cargar la página, refleja si hay una sesión guardada
actualizarUIAuth();
// Si quedó una partida sin terminar, muestra el botón "Continuar"
restaurarPartida();

// ==================== RELOJ GLOBAL DE PARTIDA ====================
function checkTiempoGlobal() {
  if (!estado.inicioPartida || partidaTerminada) return;
  
  const limiteMs = 35 * 60 * 1000;
  const transcurrido = Date.now() - estado.inicioPartida;
  const restante = limiteMs - transcurrido;

  const elHUD = document.getElementById("reloj-global");
  if (!elHUD) return;

  elHUD.style.display = "block";

  if (restante <= 0) {
    elHUD.innerHTML = "⏳ 00:00";
    finalizarPorTiempo();
  } else {
    const min = Math.floor(restante / 60000);
    const sec = Math.floor((restante % 60000) / 1000);
    elHUD.innerHTML = `⏱️ Fin en: ${min}:${sec.toString().padStart(2, '0')}`;
  }
}

function finalizarPorTiempo() {
  if (partidaTerminada) return;
  
  const vivos = estado.jugadores.filter(x => !x.eliminado);
  if (vivos.length === 0) { finalizarPartida("gameover", null); return; }
  
  // Gana el que acumuló mayor patrimonio
  const ganador = vivos.reduce((prev, current) => (calcularPatrimonio(prev) > calcularPatrimonio(current)) ? prev : current);
  
  alert("⏱️ ¡TIEMPO AGOTADO!\nSe cumplieron los 35 minutos de partida.\nEl ganador se define por quién tiene el mayor patrimonio total (Caja + Activos).");
  finalizarPartida("victoria", ganador);
}
