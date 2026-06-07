/* ============================================================
   RAMIREZ GROUP — APP.JS (Fase 1 + Fase 2)
   Restaurante y Pescadería Ramírez
   Autor: Oscar Polania | Cel: 3103230712
   ============================================================
   Fase 1: Login, inicio multi-negocio, menú restaurante por rol,
           PWA, API helpers, navegación, auto-update.
   Fase 2: Vistas Catálogo, Mesas, Inventario.
   ============================================================ */

/* ============================================================
   CONFIGURACIÓN — EDITAR ESTAS CONSTANTES
   ============================================================ */
const API_BASE = 'https://script.google.com/macros/s/AKfycbx25rbzh5YOXcX_w-Ex6TTw5s5bfeDOy_y1elfltx4VFfCtUxsyCmxUKPo3OPe57PEK/exec';

const firebaseConfig = {
  apiKey: "AIzaSyC5B-1yMbzyfTdtsQ9gtKU2886uzUluIn4",
  authDomain: "ramirez-group-e13f9.firebaseapp.com",
  databaseURL: "https://ramirez-group-e13f9-default-rtdb.firebaseio.com",
  projectId: "ramirez-group-e13f9",
  storageBucket: "ramirez-group-e13f9.firebasestorage.app",
  messagingSenderId: "920709963941",
  appId: "1:920709963941:web:6e5fcdd369fdfe16ab6d4c",
  measurementId: "G-TN02DHQ7XE"
};

/* ============================================================
   CONSTANTES GENERALES
   ============================================================ */
let APP_VERSION_LOADED = ''; // se llena al leer version.js (lógica /supervision/)
const NEGOCIO_RESTAURANTE_ID = 'NEG-001';
const SESSION_KEY = 'rgSession';

const SOUNDS = {
  login: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_star_g1owy4.mp3',
  click:    'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Namedrop_Popup_ale2zy.mp3',
  ok:       'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Keyboard_Enter_b9k2dc.mp3',
  err:      'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  warn:     'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  pedido:   'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3',
  caja:     'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3'
};

const ICONOS = {
  mesa:       'https://res.cloudinary.com/dqqeavica/image/upload/v1778186310/mesa_frkyix.png',
  chef:       'https://res.cloudinary.com/dqqeavica/image/upload/v1778186302/chef_oetbym.png',
  caja:       'https://res.cloudinary.com/dqqeavica/image/upload/v1778186302/caja_hxbdmv.webp',
  plato:      'https://res.cloudinary.com/dqqeavica/image/upload/v1778186302/plato_cmnvge.webp',
  botella:    'https://res.cloudinary.com/dqqeavica/image/upload/v1778186303/botella_mn6yyp.webp',
  ticket:     'https://res.cloudinary.com/dqqeavica/image/upload/v1778186303/ticket_zl6cgz.webp',
  whatsapp:   'https://res.cloudinary.com/dqqeavica/image/upload/v1759166341/WhatsApp_mljaqm.webp',
  camara:     'https://res.cloudinary.com/dqqeavica/image/upload/v1777513961/camara_mahfd6.webp',
  impresora:  'https://res.cloudinary.com/dqqeavica/image/upload/v1778186304/impresora_gkpbci.webp',
  excel:      'https://res.cloudinary.com/dqqeavica/image/upload/v1778186304/excel_rkcld6.webp',
  luna:       'https://res.cloudinary.com/dqqeavica/image/upload/v1778186305/luna_mfjvx6.webp',
  mesero:     'https://res.cloudinary.com/dqqeavica/image/upload/v1778186305/mesero_fs2r5u.webp',
 bot:        'https://res.cloudinary.com/dqqeavica/image/upload/v1780053848/heartsync_ojmqxm.gif'
};

const PLACEHOLDER_PRODUCTO = 'https://res.cloudinary.com/dqqeavica/image/upload/v1778186302/plato_cmnvge.webp';

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const state = {
  user: null,
  negocioActual: null,
  negocios: [],
  pinBuffer: ''
};

/* ============================================================
   HELPERS UI
   ============================================================ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function startLoading() {
  const l = $('#loader');
  if (l) l.classList.remove('hidden');
}
function stopLoading() {
  const l = $('#loader');
  if (l) l.classList.add('hidden');
}

let _lastSoundTs = 0;
function playSoundOnce(url, gap = 200) {
  const now = Date.now();
  if (now - _lastSoundTs < gap) return;
  _lastSoundTs = now;
  try {
    const a = new Audio(url);
    a.volume = 0.7;
    a.play().catch(() => {});
  } catch (_) {}
}

function fmtPesos(n) {
  const num = Number(n) || 0;
  return '$ ' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtFechaCorta(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
           ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return '—'; }
}

function showView(viewId) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const v = document.getElementById('view-' + viewId);
  if (v) {
    v.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function rolEs(...roles) {
  const r = String(state.user?.rol || '').toUpperCase();
  const lista = roles.map(x => String(x).toUpperCase());
  // El DESARROLLADOR hereda todos los permisos del SUPERUSUARIO
  if (r === 'DESARROLLADOR' && lista.indexOf('SUPERUSUARIO') >= 0) return true;
  return lista.indexOf(r) >= 0;
}

/* ============================================================
   API — comunica con Apps Script
   ============================================================ */
async function apiGet(action, params = {}) {
  if (!API_BASE) throw new Error('API_BASE no configurado');
  const qs = new URLSearchParams({ action, ...params }).toString();
  const r = await fetch(`${API_BASE}?${qs}`, { method: 'GET' });
  const json = await r.json();
  if (!json.ok) throw new Error(json.error || 'Error desconocido');
  return json.data;
}

async function apiPost(action, body = {}) {
  if (!API_BASE) throw new Error('API_BASE no configurado');
  const r = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
    body: JSON.stringify(body)
  });
  const json = await r.json();
  if (!json.ok) throw new Error(json.error || 'Error desconocido');
  return json.data;
}

/* Adjunta automáticamente el usuario logueado a cada POST */
function withUser(body = {}) {
  return {
    ...body,
    usuario: state.user ? {
      id: state.user.id,
      nombre: state.user.nombre,
      rol: state.user.rol
    } : null
  };
}

/* ============================================================
   SWEETALERT — wrappers con sonido
   ============================================================ */
const Toast = (typeof Swal !== 'undefined') ? Swal.mixin({
  toast: true, position: 'top', showConfirmButton: false,
  timer: 2400, timerProgressBar: true,
  didOpen: (t) => {
    t.addEventListener('mouseenter', Swal.stopTimer);
    t.addEventListener('mouseleave', Swal.resumeTimer);
  }
}) : null;

function alertOk(title, html = '') {
  playSoundOnce(SOUNDS.ok);
  return Swal.fire({ icon: 'success', title, html, confirmButtonText: 'OK', timer: 2400, showConfirmButton: false });
}
function alertErr(title, html = '') {
  playSoundOnce(SOUNDS.err);
  return Swal.fire({ icon: 'error', title, html, confirmButtonText: 'Entendido' });
}
function alertWarn(title, html = '') {
  playSoundOnce(SOUNDS.warn);
  return Swal.fire({ icon: 'warning', title, html, confirmButtonText: 'Entendido' });
}
function alertInfo(title, html = '') {
  return Swal.fire({ icon: 'info', title, html, confirmButtonText: 'OK' });
}
function confirmar(title, html = '', confirmText = 'Sí, continuar') {
  return Swal.fire({
    icon: 'question', title, html,
    showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: 'Cancelar',
    reverseButtons: true
  }).then(r => r.isConfirmed);
}

/* ============================================================
   PWA — INSTALL + SERVICE WORKER + AUTO-UPDATE
   ============================================================ */
let deferredPrompt = null;

function isStandalone() {
  const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dmInstalled  = window.matchMedia('(display-mode: installed)').matches;
  const iosStandalone = (window.navigator.standalone === true);
  return dmStandalone || dmInstalled || iosStandalone;
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isMarkedInstalled() {
  try { return localStorage.getItem('pwaInstalledFlag') === '1'; } catch(_) { return false; }
}
function markInstalled() {
  try { localStorage.setItem('pwaInstalledFlag', '1'); } catch(_) {}
}
function clearInstalledMark() {
  try { localStorage.removeItem('pwaInstalledFlag'); } catch(_) {}
}
async function detectInstalled() {
  // Defensa: si por alguna razón isStandalone no está definido (caché viejo
  // del SW sirviendo una versión incompleta), evaluamos inline en lugar de fallar.
  let standalone = false;
  try {
    if (typeof isStandalone === 'function') {
      standalone = isStandalone();
    } else {
      standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: installed)').matches ||
        (window.navigator.standalone === true);
    }
  } catch (_) {}
  if (standalone) return true;

  if (typeof navigator.getInstalledRelatedApps === 'function') {
    try {
      const apps = await navigator.getInstalledRelatedApps();
      const found = apps.some(a =>
        a.platform === 'webapp' &&
        typeof a.url === 'string' &&
        /manifest\.webmanifest$/.test(a.url)
      );
      if (found) { markInstalled(); return true; }
      else { clearInstalledMark(); }
    } catch(_) {}
  }
  return isMarkedInstalled();
}

/* Actualiza qué contenedor de instalación se muestra según el estado real.
   Solo muestra #install-android cuando deferredPrompt ya está disponible.
   Esto elimina el bug "Aún no disponible". */
function updateInstallSection() {
  const installed = isMarkedInstalled() || isStandalone();
  $('#install-android')?.classList.add('hidden');
  $('#install-ios')?.classList.add('hidden');
  if (installed) return;
  if (isIOS()) {
    $('#install-ios')?.classList.remove('hidden');
  } else {
    // Bloque visible siempre (para mostrar "Continuar en el navegador").
    // El botón "Instalar" solo aparece si Chrome ya disparó beforeinstallprompt
    // (idéntico a supervision: btn-instalar oculto hasta que el navegador lo permita).
    $('#install-android')?.classList.remove('hidden');
    const btn = $('#btn-install');
    if (btn) btn.style.display = (deferredPrompt || isIOS()) ? '' : 'none';
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallSection();
});

window.addEventListener('appinstalled', () => {
  markInstalled();
  deferredPrompt = null;
  updateInstallSection();
});

async function setupPWA() {
  // Service worker
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); }
    catch (e) { console.warn('SW no registrado:', e); }
  }
  // Detectar si ya está instalada (incluye flag persistente)
  const installed = await detectInstalled();
  if (installed) {
    iniciarSesion();
  } else {
    showView('instalar');
    updateInstallSection();
  }
}

function iniciarSesion() {
  // Si ya hay sesión guardada, ir directo a inicio
  const saved = localStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      state.user = JSON.parse(saved);
      // Fase 5 / Bloque G — suscribir config también al re-abrir la app
      try { Config.subscribeRTDB(NEGOCIO_RESTAURANTE_ID); } catch (_) {}
      // Fase 7 / Bloque Q — Listener global de reservas para badge en vivo
      try { Reservas.engancharRTDB(); } catch (_) {}
      irAInicio();
      return;
    } catch (_) {}
  }
  showView('login');
}

/* Auto-update — lógica portada de /supervision/.
   No usa constante hardcoded: la primera versión leída del archivo se
   guarda en APP_VERSION_LOADED y las siguientes lecturas se comparan
   contra ella. Si cambia, limpia caches y recarga. */
let __versionCheckInFlight = false;

async function checkVersion() {
  if (__versionCheckInFlight) return;
  __versionCheckInFlight = true;
  try {
    const r = await fetch('./version.js?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    const serverVersion = String(j.version || '').trim();
    if (!serverVersion) return;

// Primera lectura: guardar la versión actual y pintarla en todos los spans
    if (!APP_VERSION_LOADED) {
      APP_VERSION_LOADED = serverVersion;
      const numEl1 = $('#app-version-number');
      const numEl2 = $('#app-version-number-2');
      const numEl3 = $('#app-version-number-3');
      if (numEl1) numEl1.textContent = 'Versión ' + serverVersion;
      if (numEl2) numEl2.textContent = 'Versión ' + serverVersion;
      if (numEl3) numEl3.textContent = 'Versión ' + serverVersion;
      return;
    }

    // Lecturas posteriores: si cambió, recargar silenciosamente
    if (serverVersion !== APP_VERSION_LOADED) {
      console.log('Nueva versión disponible:', serverVersion);
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch(_) {}
      window.location.reload();
    }
  } catch (_) {
    /* sin red: silencio */
  } finally {
    __versionCheckInFlight = false;
  }
}

/* Recarga automática cuando el SW nuevo toma control (con anti-loop) */
if ('serviceWorker' in navigator) {
  let __reloadingFromSW = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (__reloadingFromSW) return;
    const lastReload = Number(sessionStorage.getItem('__swReloadTs') || 0);
    const now = Date.now();
    if (now - lastReload < 10000) return;
    __reloadingFromSW = true;
    sessionStorage.setItem('__swReloadTs', String(now));
    location.reload();
  });
}

/* Chequeo extra cuando la pestaña vuelve a estar visible (máx 1 vez / 30s) */
let __lastVersionCheck = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const now = Date.now();
  if (now - __lastVersionCheck < 30000) return;
  __lastVersionCheck = now;
  checkVersion();
});

/* ============================================================
   LOGIN — PIN y Documento
   ============================================================ */
function setupLoginUI() {
  // Tabs
  $$('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.login-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $('#tab-pin').classList.toggle('hidden', target !== 'pin');
      $('#tab-doc').classList.toggle('hidden', target !== 'doc');
      state.pinBuffer = '';
      pintarPinDots();
    });
  });

  // Keypad
  $$('.pin-key').forEach(k => {
    k.addEventListener('click', () => {
      const key = k.dataset.key;
      if (key === 'clear') {
        state.pinBuffer = '';
      } else if (key === 'back') {
        state.pinBuffer = state.pinBuffer.slice(0, -1);
      } else if (/^\d$/.test(key)) {
        if (state.pinBuffer.length < 4) {
          state.pinBuffer += key;
          playSoundOnce(SOUNDS.click, 80);
        }
      }
      pintarPinDots();
      if (state.pinBuffer.length === 4) hacerLoginPin();
    });
  });

  // Login por documento
  const btnDoc = $('#btn-login-doc');
  if (btnDoc) btnDoc.addEventListener('click', hacerLoginDoc);
  const inpDoc = $('#login-doc');
  if (inpDoc) {
    inpDoc.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') hacerLoginDoc();
    });
  }
}

function pintarPinDots() {
  $$('.pin-dot').forEach((d, i) => {
    d.classList.toggle('filled', i < state.pinBuffer.length);
  });
}

async function hacerLoginPin() {
  startLoading();
  try {
    const data = await apiGet('loginPin', { pin: state.pinBuffer });
    if (!data.encontrado) {
      state.pinBuffer = '';
      pintarPinDots();
      stopLoading();
      return alertErr('PIN incorrecto', 'Verifica tu PIN de 4 dígitos.');
    }
    procesarLoginExitoso(data);
  } catch (e) {
    state.pinBuffer = '';
    pintarPinDots();
    stopLoading();
    alertErr('Error', e.message);
  }
}

async function hacerLoginDoc() {
  const doc = $('#login-doc').value.trim();
  if (!doc) return alertWarn('Documento requerido', 'Ingresa tu documento para continuar.');
  startLoading();
  try {
    const data = await apiGet('login', { documento: doc });
    if (!data.encontrado) {
      stopLoading();
      return alertErr('Usuario no encontrado', 'No existe un usuario activo con ese documento.');
    }
    procesarLoginExitoso(data);
  } catch (e) {
    stopLoading();
    alertErr('Error', e.message);
  }
}

function procesarLoginExitoso(user) {
  state.user = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  playSoundOnce(SOUNDS.login);
  stopLoading();
  // Fase 5 / Bloque G — Suscribirse al config global vía RTDB.
  // Otros dispositivos reciben los cambios sin esperar el TTL local.
  try { Config.subscribeRTDB(NEGOCIO_RESTAURANTE_ID); } catch (_) {}
  // Fase 7 / Bloque Q — Listener global de reservas para badge en vivo
  // (solo se monta si el rol es SUPER o ADMIN; el método valida internamente).
  try { Reservas.engancharRTDB(); } catch (_) {}
  irAInicio();
}

function logout() {
   try { Bot.detenerPollingQR(); } catch (_) {}
  // Fase 5 / Bloque G — Desuscribir listener de config antes de cerrar
  try { Config.unsubscribeRTDB(); } catch (_) {}
  // Fase 7 / Bloque Q — Desuscribir listener de reservas (badge global)
  try { Reservas.desengancharRTDB(); } catch (_) {}
  Config.invalidate();
  localStorage.removeItem(SESSION_KEY);
  state.user = null;
  state.negocioActual = null;
  state.pinBuffer = '';
  pintarPinDots();
  showView('login');
}

/* ============================================================
   INICIO MULTI-NEGOCIO
   ============================================================ */
async function irAInicio() {
  if (!state.user) return showView('login');
  // Pintar bienvenida
  $('#welcome-name').textContent = state.user.nombre;
  $('#welcome-rol').textContent  = state.user.rol;
  // Bloque I — avatar: foto si la hay, fallback a inicial
  const inicial = String(state.user.nombre || '?').trim().charAt(0).toUpperCase();
  const avatarEl = $('#welcome-avatar');
  if (state.user.fotoUrl) {
    avatarEl.innerHTML = `<span class="welcome-bar__avatar-txt">${inicial}</span>` +
                         `<img class="welcome-bar__avatar-img" src="${state.user.fotoUrl}" alt="" onerror="this.remove()" />`;
  } else {
    avatarEl.textContent = inicial;
  }
  // Cargar negocios disponibles
  await cargarNegocios();
  showView('inicio');
}

async function cargarNegocios() {
  // En Fase 1 sólo está el restaurante. Cuando se agreguen más,
  // se cargan dinámicamente desde el servidor.
  const negocios = [
    {
      id: NEGOCIO_RESTAURANTE_ID,
      nombre: 'Restaurante y Pescadería Ramírez',
      tipo: 'Restaurante',
      logoUrl: 'https://res.cloudinary.com/dqqeavica/image/upload/v1778181656/Restaurante_vrwguv.png',
      view: 'restaurante'
    }
    // Espacio reservado para Tienda u otros negocios futuros
  ];
  state.negocios = negocios;

  const accesibles = state.user.isSuper
    ? negocios
    : negocios.filter(n => (state.user.negocios || []).indexOf(n.id) >= 0);

  const grid = $('#business-grid');
  grid.innerHTML = '';

  if (!accesibles.length) {
    grid.innerHTML = `
      <div class="card text-center" style="grid-column: 1 / -1;">
        <h3>Sin acceso a negocios</h3>
        <p class="muted">Tu usuario no tiene acceso asignado a ningún negocio. Contacta al administrador.</p>
      </div>`;
    return;
  }

  accesibles.forEach(n => {
    const card = document.createElement('div');
    card.className = 'business-card';
    card.innerHTML = `
      <img class="business-card__logo" src="${n.logoUrl}" alt="${n.nombre}" loading="lazy" />
      <div class="business-card__info">
        <h3 class="business-card__name">${n.nombre}</h3>
        <p class="business-card__type">${n.tipo}</p>
      </div>
      <span class="business-card__arrow">→</span>
    `;
    card.addEventListener('click', () => abrirNegocio(n));
    grid.appendChild(card);
  });
}

function abrirNegocio(negocio) {
  state.negocioActual = negocio;
  playSoundOnce(SOUNDS.click);
  if (negocio.id === NEGOCIO_RESTAURANTE_ID) {
    irAMenuRestaurante();
  }
}

/* ============================================================
   MENÚ DEL RESTAURANTE — tiles según rol
   ============================================================ */
function irAMenuRestaurante() {
  const rol = String(state.user.rol || '').toUpperCase();
  $('#header-user-name').textContent = state.user.nombre.split(' ')[0];

  // Definición de tiles disponibles
  const TILES = [
    {
      key: 'tomar-pedido', titulo: 'Tomar pedido', desc: 'Mesas y comandas',
      icono: ICONOS.mesa,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','MESERO'],
      view: 'tomar-pedido'
    },
    {
      key: 'comanda', titulo: 'Comanda', desc: 'Vista de cocina',
      icono: ICONOS.chef,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','COCINA'],
      view: 'comanda'
    },
    {
      key: 'pagos', titulo: 'Caja', desc: 'Cobrar y comprobantes',
      icono: ICONOS.caja,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CAJA'],
      view: 'caja'
    },
    {
      key: 'catalogo', titulo: 'Catálogo', desc: 'Productos y precios',
      icono: ICONOS.plato,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR','MESERO','COCINA','CAJA'],
      view: 'catalogo'
    },
    {
      key: 'inventario', titulo: 'Inventario', desc: 'Stock de bebidas',
      icono: ICONOS.botella,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR'],
      view: 'inventario'
    },
    {
      key: 'mesas', titulo: 'Mesas', desc: 'Configurar mesas',
      icono: ICONOS.mesa,
      roles: ['SUPERUSUARIO','ADMINISTRADOR'],
      view: 'mesas'
    },
 {
      key: 'anclaje', titulo: 'Anclaje del día', desc: 'Cierre diario',
      icono: ICONOS.luna,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR'],
      view: 'anclaje'
    },
{
      key: 'balances', titulo: 'Balances', desc: 'Reportes y análisis',
      icono: ICONOS.excel,
      roles: ['SUPERUSUARIO','CONTADOR'],
      view: 'balances'
    },
    {
      key: 'reservas', titulo: 'Reservas', desc: 'Solicitudes de clientes',
      icono: 'https://res.cloudinary.com/dqqeavica/image/upload/v1779830189/reserva_pto4kr.webp',
      roles: ['SUPERUSUARIO','ADMINISTRADOR'],
      view: 'reservas'
    },
     {
      key: 'creditos', titulo: 'Créditos', desc: 'Cartera y cuentas por cobrar',
      icono: 'https://res.cloudinary.com/dqqeavica/image/upload/v1780708292/credito_etlvso.webp',
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR','CAJA'],
      view: 'creditos'
    },
    {
      key: 'usuarios', titulo: 'Usuarios', desc: 'Gestionar equipo',
      icono: ICONOS.mesero,
      roles: ['SUPERUSUARIO'],
      view: 'usuarios'
    },
   {
      key: 'auditoria', titulo: 'Auditoría', desc: 'Registro de acciones',
      icono: ICONOS.ticket,
      roles: ['SUPERUSUARIO','CONTADOR'],
      view: 'auditoria'
    },
   {
      key: 'config', titulo: 'Configuración', desc: 'Ajustes del sistema',
      icono: ICONOS.impresora,
      roles: ['SUPERUSUARIO'],
      view: 'configuracion'
    },
     {
      key: 'bot', titulo: 'Mi Bot', desc: 'Control de WhatsApp',
      icono: ICONOS.bot,
      roles: ['SUPERUSUARIO'],   // DESARROLLADOR ve todos los tiles igual
      view: 'bot'
    }
  ];

// DESARROLLADOR: acceso total a todos los tiles, sin importar la whitelist de cada uno
  const visibles = (rol === 'DESARROLLADOR')
    ? TILES
    : TILES.filter(t => t.roles.indexOf(rol) >= 0);

  const grid = $('#restaurante-menu-grid');
  grid.innerHTML = '';
  visibles.forEach(t => {
  const tile = document.createElement('button');
    tile.className = 'menu-tile';
    tile.innerHTML = `
      <img src="${t.icono}" alt="${t.titulo}" loading="lazy" />
      <div class="menu-tile__title">${t.titulo}</div>
      <div class="menu-tile__desc">${t.desc}</div>
      ${t.key === 'reservas' ? '<span id="res-tile-badge" class="menu-tile__badge hidden">0</span>' : ''}
    `;
   tile.addEventListener('click', () => {
      playSoundOnce(SOUNDS.click);
      if (t.view === 'pendiente') {
        $('#pendiente-title').textContent = t.placeholder;
        $('#pendiente-h2').textContent = t.placeholder;
        showView('pendiente');
      } else if (t.view === 'catalogo') {
        Catalogo.abrir();
      } else if (t.view === 'mesas') {
        Mesas.abrir();
      } else if (t.view === 'inventario') {
        Inventario.abrir();
     } else if (t.view === 'tomar-pedido') {
        Pedidos.abrir();
    } else if (t.view === 'comanda') {
        Comanda.abrir();
     } else if (t.view === 'caja') {
        Caja.abrir();
      } else if (t.view === 'anclaje') {
        Anclaje.abrir();
      } else if (t.view === 'usuarios') {
        Usuarios.abrir();
      } else if (t.view === 'configuracion') {
        Configuracion.abrir();
    } else if (t.view === 'auditoria') {
        Auditoria.abrir();
      } else if (t.view === 'balances') {
        Balances.abrir();
      } else if (t.view === 'reservas') {
        Reservas.abrir();
      } else if (t.view === 'bot') {
        Bot.abrir();
      } else if (t.view === 'creditos') {
        Creditos.abrir();
      } else {
        showView(t.view);
      }
    });
    grid.appendChild(tile);
  });

if (!visibles.length) {
    grid.innerHTML = `
      <div class="card text-center" style="grid-column: 1 / -1;">
        <h3>Sin permisos</h3>
        <p class="muted">Tu rol no tiene acciones asignadas en este negocio.</p>
      </div>`;
  }

  // Q4 — hidratar el badge del tile Reservas con el último conteo conocido
  // del listener RTDB global (si ya está montado por SUPER/ADMIN)
  try {
    if (typeof Reservas !== 'undefined' && Reservas._ref) {
      Reservas.actualizarBadgeTile(Reservas._pendientesPrev || 0);
    }
  } catch (_) {}

  showView('restaurante');
}

/* ============================================================
   NAVEGACIÓN POR data-go
   ============================================================ */
function setupNavegacion() {
document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (!t) return;
    const dest = t.dataset.go;
    // Si veníamos de Comanda, desenganchar listener + cronómetro
  if (typeof Comanda !== 'undefined') Comanda.desenganchar();
    if (typeof Caja    !== 'undefined') Caja.desenganchar();
    if (typeof Anclaje !== 'undefined') Anclaje.desenganchar();
    if (typeof Usuarios !== 'undefined') Usuarios.desenganchar();
   if (typeof Auditoria !== 'undefined') Auditoria.desenganchar();
    if (typeof Balances !== 'undefined') Balances.desenganchar();
    if (typeof Reservas !== 'undefined') Reservas.desenganchar();
   if (typeof Creditos !== 'undefined') Creditos.desenganchar();
   if (typeof Bot !== 'undefined') Bot.detenerPollingQR();
    if (dest === 'inicio') irAInicio();
    else if (dest === 'restaurante') irAMenuRestaurante();
    else showView(dest);
  });

  // Logout en welcome bar
  const btnLogout = $('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      const ok = await confirmar('Cerrar sesión', '¿Salir de la aplicación?', 'Sí, salir');
      if (ok) logout();
    });
  }

  // Chip de usuario en header → menú breve
  const chip = $('#header-user-chip');
  if (chip) {
    chip.addEventListener('click', async () => {
      const rolCol = ({
        SUPERUSUARIO: '#7c3aed', ADMINISTRADOR: '#2563eb', CONTADOR: '#0891b2',
        MESERO: '#c2792a', COCINA: '#dc2626', CAJA: '#16a34a'
      })[String(state.user.rol).toUpperCase()] || '#06402B';
      const r = await Swal.fire({
        title: state.user.nombre,
        html: `
          <div style="text-align:center; margin-top:6px;">
            <span style="display:inline-block; padding:4px 12px; border-radius:999px;
                         background:${rolCol}; color:#fff; font-weight:700; font-size:0.78rem;
                         letter-spacing:0.5px; text-transform:uppercase;">
              ${state.user.rol}
            </span>
            <p class="muted" style="margin-top:14px; font-size:0.82rem;">
              Documento: ${state.user.documento}<br>
              ${state.user.telefono ? 'Teléfono: ' + state.user.telefono : ''}
            </p>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Volver al inicio',
        denyButtonText: 'Cerrar sesión',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      });
      if (r.isConfirmed) irAInicio();
      else if (r.isDenied) {
        const ok = await confirmar('Cerrar sesión', '¿Salir de la aplicación?', 'Sí, salir');
        if (ok) logout();
      }
    });
  }
}

/* ============================================================
   PWA: BOTONES DE INSTALACIÓN
   ============================================================ */
function setupInstall() {
  const btnInstall = $('#btn-install');
  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      // Flujo iOS: instrucciones con GIF (idéntico a supervision)
      if (isIOS()) {
        Swal.fire({
          icon: 'info',
          title: '¡Para Instalar en tu Iphone!',
          html: `
            <div style="text-align:center; margin-top:8px;">
              <img
                src="https://res.cloudinary.com/dqqeavica/image/upload/v1780053848/heartsync_ojmqxm.gif"
                alt="Instalación de IOS"
                style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
              >
              <div style="margin-top:10px;">
                <b>1.</b> Toca Compartir.<br><b>2.</b> Elige "Agregar a pantalla de inicio".<br><b>3.</b> Confirma "Agregar".
              </div>
            </div>
          `
        });
        return;
      }
      // Android: requiere beforeinstallprompt
      if (!deferredPrompt) {
        Swal.fire({ icon: 'info', title: 'Instalación no disponible todavía' });
        return;
      }
      const dp = deferredPrompt;
      dp.prompt();
      const choice = await dp.userChoice;
      deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        markInstalled();
        Swal.fire({
          icon: 'success',
          title: '¡App instalándose!',
          html: `
            <div style="text-align:center; margin-top:8px;">
              <img
                src="https://res.cloudinary.com/dqqeavica/image/upload/v1780053848/heartsync_ojmqxm.gif"
                alt="Instalando app"
                style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
              >
              <div>Debes esperar unos segundos mientras el sistema instala la App.</div>
              <div style="margin-top:10px;">
                <b>Al desaparecer este aviso, puedes salir de esta vista. La App aparecerá en la pantalla principal de este dispositivo.</b>
              </div>
            </div>
          `,
          timer: 12000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({ icon: 'info', title: 'Instalación cancelada' });
      }
      updateInstallSection();
    });
  }
   ['btn-cont-web', 'btn-cont-web-ios'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', iniciarSesion);
  });
}

/* ============================================================
   FIREBASE — inicialización lazy (Fase 3 lo usará)
   ============================================================ */
let _firebase = null;
async function getFirebase() {
  if (_firebase) return _firebase;
  if (!firebaseConfig.databaseURL) return null;
  // Carga dinámica desde CDN
  await Promise.all([
    cargarScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
    cargarScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js')
  ]);
  // eslint-disable-next-line no-undef
  if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
  // eslint-disable-next-line no-undef
  _firebase = firebase;
  return _firebase;
}
function cargarScript(src) {
  return new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

/* ============================================================
   UTILIDAD: leer archivo como base64
   ============================================================ */
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result || '');
      // Quitar el prefijo data:...;base64,
      const idx = result.indexOf(',');
      res(idx >= 0 ? result.substring(idx + 1) : result);
    };
    r.onerror = () => rej(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
}

/* ============================================================
   ============================================================
   FASE 2 — VISTA CATÁLOGO
   ============================================================
   ============================================================ */
const Catalogo = {
  data: null,                  // { categorias, productos, modificadores, inventario }
  filtroTexto: '',
  expandidas: new Set(),       // ids de categorías expandidas

  async abrir() {
    showView('catalogo');
    await this.cargar();
  },

  async cargar() {
    startLoading();
    try {
      this.data = await apiGet('getCatalogo');
      // Por defecto expandir la primera categoría con productos
      if (this.expandidas.size === 0) {
        const conProds = this.data.categorias.find(c =>
          this.data.productos.some(p => p.categoriaId === c.id)
        );
        if (conProds) this.expandidas.add(conProds.id);
      }
      this.render();
    } catch (e) {
      alertErr('Error al cargar catálogo', e.message);
    } finally {
      stopLoading();
    }
  },

  render() {
    const puedeEditar = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
    const fab = $('#catalogo-fab');
    if (fab) fab.classList.toggle('hidden', !puedeEditar);

    const cont = $('#catalogo-content');
    if (!this.data) { cont.innerHTML = ''; return; }

    const filtro = this.filtroTexto.trim().toLowerCase();
    const cats = this.data.categorias;
    const prodsPorCat = {};
    this.data.productos.forEach(p => {
      if (filtro) {
        const hit = p.nombre.toLowerCase().includes(filtro) ||
                    (p.descripcion || '').toLowerCase().includes(filtro);
        if (!hit) return;
      }
      if (!prodsPorCat[p.categoriaId]) prodsPorCat[p.categoriaId] = [];
      prodsPorCat[p.categoriaId].push(p);
    });

    if (filtro) {
      // En modo búsqueda, expandir todas las que tengan resultados
      cats.forEach(c => { if ((prodsPorCat[c.id] || []).length) this.expandidas.add(c.id); });
    }

    const visibles = cats.filter(c => filtro ? (prodsPorCat[c.id] || []).length : true);

    if (!visibles.length) {
      cont.innerHTML = `
        <div class="card text-center">
          <h3>Sin resultados</h3>
          <p class="muted">No encontramos productos que coincidan con tu búsqueda.</p>
        </div>`;
      return;
    }

    cont.innerHTML = visibles.map(cat => {
      const prods = prodsPorCat[cat.id] || [];
      const expanded = this.expandidas.has(cat.id);
      return `
        <section class="cat-acordeon ${expanded ? 'open' : ''}" data-cat="${cat.id}">
          <button class="cat-acordeon__head" data-toggle-cat="${cat.id}">
            <span class="cat-acordeon__bullet" style="background:${cat.color || '#06402B'}"></span>
            <span class="cat-acordeon__name">${escapeHtml(cat.nombre)}</span>
            <span class="cat-acordeon__count">${prods.length}</span>
            <svg class="cat-acordeon__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="cat-acordeon__body">
            ${prods.length
              ? `<div class="prod-grid">${prods.map(p => this.renderProductoCard(p, puedeEditar)).join('')}</div>`
              : `<p class="muted" style="padding:8px 4px;">Sin productos en esta categoría.</p>`}
          </div>
        </section>
      `;
    }).join('');

    // Bind acordeón
    $$('[data-toggle-cat]', cont).forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.toggleCat;
        if (this.expandidas.has(id)) this.expandidas.delete(id);
        else this.expandidas.add(id);
        this.render();
      });
    });

    // Bind cards de producto
    $$('[data-prod-edit]', cont).forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.prodEdit;
        const p = this.data.productos.find(x => x.id === id);
        if (p) this.abrirModalProducto(p);
      });
    });
    $$('[data-prod-toggle]', cont).forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = b.dataset.prodToggle;
        await this.toggleDisponible(id);
      });
    });
  },

  renderProductoCard(p, puedeEditar) {
    const inv = this.data.inventario[p.id];
    const stockBajo = inv && p.manejaStock && inv.stockActual <= inv.stockMinimo;
    const agotado = !p.disponible;
    const img = p.imagenUrl || PLACEHOLDER_PRODUCTO;
    const mods = (this.data.modificadores[p.id] || []).length;
    return `
      <article class="prod-card ${agotado ? 'is-agotado' : ''}">
        <div class="prod-card__img-wrap">
          <img class="prod-card__img" src="${img}" alt="${escapeHtml(p.nombre)}"
               loading="lazy" onerror="this.src='${PLACEHOLDER_PRODUCTO}'" />
          ${agotado    ? `<span class="prod-badge badge-danger">Agotado</span>` : ''}
          ${stockBajo && !agotado ? `<span class="prod-badge badge-warn">Stock bajo</span>` : ''}
          ${p.tipo === 'RAPIDO' ? `<span class="prod-badge badge-rapido">⚡</span>` : ''}
        </div>
        <div class="prod-card__body">
          <h4 class="prod-card__name">${escapeHtml(p.nombre)}</h4>
          ${p.descripcion ? `<p class="prod-card__desc">${escapeHtml(p.descripcion)}</p>` : ''}
          <div class="prod-card__foot">
            <span class="prod-card__price">${fmtPesos(p.precioBase)}</span>
            ${mods ? `<span class="prod-card__mods">${mods} mod.</span>` : ''}
          </div>
        </div>
        ${puedeEditar ? `
          <div class="prod-card__actions">
            <button class="prod-action" data-prod-toggle="${p.id}" title="${agotado ? 'Marcar disponible' : 'Marcar agotado'}">
              ${agotado
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`}
            </button>
            <button class="prod-action" data-prod-edit="${p.id}" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        ` : ''}
      </article>
    `;
  },

  async toggleDisponible(id) {
    const p = this.data.productos.find(x => x.id === id);
    if (!p) return;
    startLoading();
    try {
      await apiPost('toggleDisponible', withUser({ id }));
      p.disponible = !p.disponible;
      stopLoading();
      this.render();
      Toast && Toast.fire({ icon: 'success', title: p.disponible ? 'Disponible' : 'Marcado agotado' });
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  abrirModalProducto(producto) {
    const isNew = !producto;
   const p = producto || {
      id: '', categoriaId: this.data.categorias[0]?.id || '', nombre: '', descripcion: '',
      precioBase: 0, imagenUrl: '', tipo: 'PREPARACION', tiempoPrep: 15,
      manejaStock: false, disponible: true, requiereNota: false, orden: 0
    };
    const mods = isNew ? [] : (this.data.modificadores[p.id] || []);

    const cats = this.data.categorias;
    const optsCats = cats.map(c =>
      `<option value="${c.id}" ${c.id === p.categoriaId ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
    ).join('');

    const html = `
      <div class="prod-modal">
        <div class="prod-modal__img" id="prod-img-wrap">
          <img id="prod-img-preview" src="${p.imagenUrl || PLACEHOLDER_PRODUCTO}"
               onerror="this.src='${PLACEHOLDER_PRODUCTO}'" />
          <label class="prod-modal__img-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Cambiar foto</span>
            <input type="file" id="prod-img-input" accept="image/*" hidden />
          </label>
        </div>

        <label>Nombre</label>
        <input type="text" id="m-nombre" value="${escapeHtml(p.nombre)}" placeholder="Ej: BANDEJA DE TILAPIA" />

        <label>Descripción</label>
        <textarea id="m-descripcion" placeholder="Descripción breve">${escapeHtml(p.descripcion)}</textarea>

        <div class="grid-2">
          <div>
            <label>Categoría</label>
            <select id="m-categoria">${optsCats}</select>
          </div>
          <div>
            <label>Precio base</label>
            <input type="number" id="m-precio" value="${p.precioBase}" min="0" step="100" />
          </div>
        </div>

        <div class="grid-2">
          <div>
            <label>Tipo</label>
            <select id="m-tipo">
              <option value="PREPARACION" ${p.tipo === 'PREPARACION' ? 'selected' : ''}>Preparación (cocina)</option>
              <option value="RAPIDO"      ${p.tipo === 'RAPIDO' ? 'selected' : ''}>Rápido (sin cocina)</option>
            </select>
          </div>
          <div>
            <label>Tiempo prep. (min)</label>
            <input type="number" id="m-tiempo" value="${p.tiempoPrep}" min="0" max="120" />
          </div>
        </div>

        <label class="check-row">
          <input type="checkbox" id="m-stock" ${p.manejaStock ? 'checked' : ''} />
          <span>Maneja stock (bebidas / cervezas)</span>
        </label>

        <label class="check-row">
          <input type="checkbox" id="m-disp" ${p.disponible ? 'checked' : ''} />
          <span>Disponible para vender</span>
        </label>

        <label class="check-row">
          <input type="checkbox" id="m-nota-oblig" ${p.requiereNota ? 'checked' : ''} />
          <span>Nota obligatoria al pedir (ej: ALMUERZO corriente)</span>
        </label>

        ${isNew ? `
          <p class="muted" style="margin-top:14px; font-size:0.78rem;">
            Los modificadores se podrán agregar después de guardar el producto.
          </p>
        ` : `
          <div class="mods-section">
            <div class="mods-section__head">
              <h4>Modificadores</h4>
              <button type="button" class="btn btn-ghost btn-sm" id="mod-nuevo-grupo">+ Grupo</button>
            </div>
            <div id="mods-list">${this.renderModsListHTML(mods)}</div>
          </div>
        `}
      </div>
    `;

    const self = this;
    let imgBase64 = null;
    let imgFilename = null;

    Swal.fire({
      title: isNew ? 'Nuevo producto' : 'Editar producto',
      html,
      width: 640,
      showCancelButton: true,
      confirmButtonText: isNew ? 'Crear' : 'Guardar',
      cancelButtonText: 'Cancelar',
      showDenyButton: !isNew,
      denyButtonText: 'Eliminar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => {
        // Imagen: preview en local
        const inp = document.getElementById('prod-img-input');
        const preview = document.getElementById('prod-img-preview');
        if (inp) {
          inp.addEventListener('change', async () => {
            const file = inp.files && inp.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) {
              alertWarn('Imagen muy grande', 'La imagen no puede pesar más de 4 MB.');
              inp.value = '';
              return;
            }
            try {
              imgBase64 = await fileToBase64(file);
              imgFilename = file.name;
              preview.src = URL.createObjectURL(file);
            } catch (e) {
              alertErr('Error', e.message);
            }
          });
        }
        // Modificadores: bind acciones
        if (!isNew) self.bindModsActions(p.id);
      },
      preConfirm: () => {
        const nombre = $('#m-nombre').value.trim();
        if (!nombre) { Swal.showValidationMessage('Nombre requerido'); return false; }
        const precio = Number($('#m-precio').value);
        if (!(precio >= 0)) { Swal.showValidationMessage('Precio inválido'); return false; }
        return {
          nombre,
          descripcion: $('#m-descripcion').value.trim(),
          categoriaId: $('#m-categoria').value,
          precioBase: precio,
          tipo: $('#m-tipo').value,
          tiempoPrep: Number($('#m-tiempo').value) || 0,
        manejaStock: $('#m-stock').checked,
          disponible: $('#m-disp').checked,
          requiereNota: $('#m-nota-oblig').checked,
          imgBase64, imgFilename
        };
      }
    }).then(async (res) => {
      if (res.isDenied) {
        const ok = await confirmar('Eliminar producto',
          `¿Eliminar <b>${escapeHtml(p.nombre)}</b>? Esta acción es reversible (soft delete).`,
          'Sí, eliminar');
        if (ok) await self.eliminarProducto(p.id);
      } else if (res.isConfirmed) {
        await self.guardarProducto(isNew ? null : p.id, res.value);
      }
    });
  },

  renderModsListHTML(mods) {
    if (!mods || !mods.length) {
      return `<p class="muted" style="font-size:0.82rem; padding:6px 2px;">
                Sin modificadores. Toca <b>+ Grupo</b> para crear uno.
              </p>`;
    }
    return mods.map(g => `
      <div class="mod-group" data-grupo="${escapeHtml(g.grupo)}">
        <div class="mod-group__head">
          <div>
            <strong>${escapeHtml(g.nombreGrupo || g.grupo)}</strong>
            <span class="mod-tag">${g.tipoSeleccion || 'UNICA'}</span>
            ${g.obligatorio ? `<span class="mod-tag mod-tag--obligatorio">obligatorio</span>` : ''}
          </div>
          <button type="button" class="mod-btn-add" data-mod-add-opt="${escapeHtml(g.grupo)}" title="Agregar opción">+</button>
        </div>
        <ul class="mod-opts">
          ${g.opciones.map(o => `
            <li class="mod-opt">
              <span class="mod-opt__name">${escapeHtml(o.opcion)}</span>
              <span class="mod-opt__delta">${o.precioDelta > 0 ? '+' : ''}${fmtPesos(o.precioDelta)}</span>
              <button type="button" class="mod-opt__edit"   data-mod-edit="${o.id}"   title="Editar">✎</button>
              <button type="button" class="mod-opt__delete" data-mod-delete="${o.id}" title="Eliminar">×</button>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  },

  bindModsActions(productoId) {
    const self = this;
    $('#mod-nuevo-grupo')?.addEventListener('click', () => self.dialogoNuevoGrupo(productoId));
    $$('[data-mod-add-opt]').forEach(b => {
      b.addEventListener('click', () => {
        const grupo = b.dataset.modAddOpt;
        const mods = self.data.modificadores[productoId] || [];
        const g = mods.find(x => String(x.grupo) === String(grupo));
        if (g) self.dialogoNuevaOpcion(productoId, g);
      });
    });
    $$('[data-mod-edit]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.modEdit;
        const mods = self.data.modificadores[productoId] || [];
        for (const g of mods) {
          const o = g.opciones.find(x => x.id === id);
          if (o) { self.dialogoEditarOpcion(productoId, g, o); break; }
        }
      });
    });
    $$('[data-mod-delete]').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.modDelete;
        const ok = await confirmar('Eliminar opción', '¿Eliminar esta opción del modificador?', 'Sí, eliminar');
        if (!ok) return;
        await self.eliminarModificador(productoId, id);
      });
    });
  },

  async dialogoNuevoGrupo(productoId) {
    const r = await Swal.fire({
      title: 'Nuevo grupo de modificadores',
      html: `
        <label>Código (mayúsculas, sin espacios)</label>
        <input id="mg-grupo" placeholder="Ej: TAMAÑO" />
        <label>Nombre visible</label>
        <input id="mg-nombre" placeholder="Ej: Tamaño" />
        <div class="grid-2">
          <div>
            <label>Selección</label>
            <select id="mg-tipo">
              <option value="UNICA">Única</option>
              <option value="MULTIPLE">Múltiple</option>
            </select>
          </div>
          <div>
            <label class="check-row" style="margin-top:22px;">
              <input type="checkbox" id="mg-obligatorio" checked />
              <span>Obligatorio</span>
            </label>
          </div>
        </div>
        <hr style="border:0; border-top:1px dashed var(--border); margin:14px 0;" />
        <label>Primera opción</label>
        <input id="mg-opcion" placeholder="Ej: Pequeño" />
        <label>Precio delta (puede ser 0 o negativo)</label>
        <input id="mg-delta" type="number" value="0" step="100" />
      `,
      showCancelButton: true, confirmButtonText: 'Crear grupo', cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const grupo = $('#mg-grupo').value.trim().toUpperCase().replace(/\s+/g, '_');
        const nombreGrupo = $('#mg-nombre').value.trim() || grupo;
        const tipoSeleccion = $('#mg-tipo').value;
        const obligatorio = $('#mg-obligatorio').checked;
        const opcion = $('#mg-opcion').value.trim();
        const precioDelta = Number($('#mg-delta').value) || 0;
        if (!grupo)  { Swal.showValidationMessage('Código del grupo requerido'); return false; }
        if (!opcion) { Swal.showValidationMessage('Primera opción requerida'); return false; }
        return { grupo, nombreGrupo, tipoSeleccion, obligatorio, opcion, precioDelta };
      }
    });
    if (!r.isConfirmed) return;
    startLoading();
    try {
      await apiPost('upsertModificador', withUser({
        productoId, ...r.value, orden: 1
      }));
      await this.cargar();
      // Re-abrir modal de producto con datos frescos
      const fresh = this.data.productos.find(x => x.id === productoId);
      if (fresh) this.abrirModalProducto(fresh);
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async dialogoNuevaOpcion(productoId, grupo) {
    const r = await Swal.fire({
      title: `Nueva opción en "${escapeHtml(grupo.nombreGrupo || grupo.grupo)}"`,
      html: `
        <label>Opción</label>
        <input id="mo-opcion" placeholder="Ej: Grande" />
        <label>Precio delta</label>
        <input id="mo-delta" type="number" value="0" step="100" />
      `,
      showCancelButton: true, confirmButtonText: 'Agregar', cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const opcion = $('#mo-opcion').value.trim();
        const precioDelta = Number($('#mo-delta').value) || 0;
        if (!opcion) { Swal.showValidationMessage('Opción requerida'); return false; }
        return { opcion, precioDelta };
      }
    });
    if (!r.isConfirmed) return;
    startLoading();
    try {
      await apiPost('upsertModificador', withUser({
        productoId,
        grupo: grupo.grupo,
        nombreGrupo: grupo.nombreGrupo,
        tipoSeleccion: grupo.tipoSeleccion,
        obligatorio: grupo.obligatorio,
        opcion: r.value.opcion,
        precioDelta: r.value.precioDelta,
        orden: (grupo.opciones.length + 1)
      }));
      await this.cargar();
      const fresh = this.data.productos.find(x => x.id === productoId);
      if (fresh) this.abrirModalProducto(fresh);
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async dialogoEditarOpcion(productoId, grupo, opcion) {
    const r = await Swal.fire({
      title: 'Editar opción',
      html: `
        <label>Opción</label>
        <input id="moe-opcion" value="${escapeHtml(opcion.opcion)}" />
        <label>Precio delta</label>
        <input id="moe-delta" type="number" value="${opcion.precioDelta}" step="100" />
      `,
      showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const opc = $('#moe-opcion').value.trim();
        const delta = Number($('#moe-delta').value) || 0;
        if (!opc) { Swal.showValidationMessage('Opción requerida'); return false; }
        return { opcion: opc, precioDelta: delta };
      }
    });
    if (!r.isConfirmed) return;
    startLoading();
    try {
      await apiPost('upsertModificador', withUser({
        id: opcion.id,
        productoId,
        grupo: grupo.grupo,
        nombreGrupo: grupo.nombreGrupo,
        tipoSeleccion: grupo.tipoSeleccion,
        obligatorio: grupo.obligatorio,
        opcion: r.value.opcion,
        precioDelta: r.value.precioDelta,
        orden: opcion.orden
      }));
      await this.cargar();
      const fresh = this.data.productos.find(x => x.id === productoId);
      if (fresh) this.abrirModalProducto(fresh);
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async eliminarModificador(productoId, id) {
    startLoading();
    try {
      await apiPost('eliminarModificador', withUser({ id }));
      await this.cargar();
      const fresh = this.data.productos.find(x => x.id === productoId);
      if (fresh) this.abrirModalProducto(fresh);
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async guardarProducto(id, datos) {
    startLoading();
    try {
      let imagenUrl = null;
      // 1. Si hay imagen nueva, subirla primero
      if (datos.imgBase64) {
        const up = await apiPost('subirImagenProducto', withUser({
          productoId: id || null,
          filename: datos.imgFilename || 'producto.jpg',
          base64: datos.imgBase64
        }));
        imagenUrl = up.url;
      }
      // 2. Upsert producto
      const body = {
        id: id || null,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        categoriaId: datos.categoriaId,
        precioBase: datos.precioBase,
        tipo: datos.tipo,
        tiempoPrep: datos.tiempoPrep,
        manejaStock: datos.manejaStock,
        disponible: datos.disponible,
        requiereNota: datos.requiereNota
      };
      if (imagenUrl) body.imagenUrl = imagenUrl;
      // Conservar URL existente si el usuario no cambió la foto
      if (!imagenUrl && id) {
        const orig = this.data.productos.find(x => x.id === id);
        if (orig) body.imagenUrl = orig.imagenUrl;
      }
      await apiPost('upsertProducto', withUser(body));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: id ? 'Producto actualizado' : 'Producto creado' });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error al guardar', e.message);
    }
  },

  async eliminarProducto(id) {
    startLoading();
    try {
      await apiPost('eliminarProducto', withUser({ id }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Producto eliminado' });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  setupListeners() {
    // FAB nuevo producto
    const fab = $('#catalogo-fab');
    if (fab && !fab._bound) {
      fab.addEventListener('click', () => this.abrirModalProducto(null));
      fab._bound = true;
    }
    // Búsqueda
    const btn = $('#catalogo-search-btn');
    const bar = $('#catalogo-search-bar');
    const inp = $('#catalogo-search-input');
    if (btn && !btn._bound) {
      btn.addEventListener('click', () => {
        bar.classList.toggle('hidden');
        if (!bar.classList.contains('hidden')) inp.focus();
        else { inp.value = ''; this.filtroTexto = ''; this.render(); }
      });
      btn._bound = true;
    }
    if (inp && !inp._bound) {
      let t = null;
      inp.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.filtroTexto = inp.value;
          this.render();
        }, 180);
      });
      inp._bound = true;
    }
  }
};

/* ============================================================
   ============================================================
   FASE 2 — VISTA MESAS
   ============================================================
   ============================================================ */
const Mesas = {
  data: [],

  async abrir() {
    showView('mesas');
    await this.cargar();
  },

  async cargar() {
    startLoading();
    try {
      this.data = await apiGet('listMesas');
      this.render();
    } catch (e) {
      alertErr('Error al cargar mesas', e.message);
    } finally {
      stopLoading();
    }
  },

  render() {
    const puedeEditar = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
    const fab = $('#mesas-fab');
    if (fab) fab.classList.toggle('hidden', !puedeEditar);

    const sub = $('#mesas-subtitle');
    if (sub) sub.textContent = `${this.data.length} mesa${this.data.length === 1 ? '' : 's'} configurada${this.data.length === 1 ? '' : 's'}`;

    const cont = $('#mesas-content');
    if (!this.data.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:16px;">
          <h3>No hay mesas configuradas</h3>
          <p class="muted">Toca <b>+</b> para crear la primera mesa.</p>
        </div>`;
      return;
    }

    cont.innerHTML = this.data.map(m => `
      <div class="mesa-cfg-card mesa-libre" data-mesa-id="${m.id}">
        <div class="mesa-cfg-card__num">${m.numero}</div>
        <div class="mesa-cfg-card__meta">
          <span class="mesa-cfg-card__cap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:3px;">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>${m.capacidad}
          </span>
          <span class="mesa-cfg-card__zona">${escapeHtml(m.zona || 'SALON')}</span>
        </div>
        ${puedeEditar ? `
          <button class="mesa-cfg-card__edit" data-mesa-edit="${m.id}" title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `).join('');

    if (puedeEditar) {
      $$('[data-mesa-edit]', cont).forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.mesaEdit;
          const m = this.data.find(x => x.id === id);
          if (m) this.abrirModalMesa(m);
        });
      });
    }
  },

  abrirModalMesa(mesa) {
    const isNew = !mesa;
    const m = mesa || { id: '', numero: this.proximoNumero(), capacidad: 4, zona: 'SALON' };
    const self = this;
    Swal.fire({
      title: isNew ? 'Nueva mesa' : `Mesa ${m.numero}`,
      html: `
        <label>Número de mesa</label>
        <input id="ms-numero" type="number" min="1" value="${m.numero}" />
        <div class="grid-2">
          <div>
            <label>Capacidad</label>
            <input id="ms-cap" type="number" min="1" max="20" value="${m.capacidad}" />
          </div>
          <div>
            <label>Zona</label>
            <select id="ms-zona">
              ${['SALON','TERRAZA','BAR','VIP','EXTERIOR'].map(z =>
                `<option value="${z}" ${z === (m.zona || 'SALON') ? 'selected' : ''}>${z}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isNew ? 'Crear mesa' : 'Guardar',
      cancelButtonText: 'Cancelar',
      showDenyButton: !isNew,
      denyButtonText: 'Eliminar',
      reverseButtons: true,
      preConfirm: () => {
        const numero = Number($('#ms-numero').value);
        const capacidad = Number($('#ms-cap').value);
        const zona = $('#ms-zona').value;
        if (!(numero > 0)) { Swal.showValidationMessage('Número inválido'); return false; }
        if (!(capacidad > 0)) { Swal.showValidationMessage('Capacidad inválida'); return false; }
        // Validar duplicado
        const dup = self.data.find(x => Number(x.numero) === numero && x.id !== m.id);
        if (dup) { Swal.showValidationMessage(`Ya existe una mesa #${numero}`); return false; }
        return { numero, capacidad, zona };
      }
    }).then(async (res) => {
      if (res.isDenied) {
        const ok = await confirmar('Eliminar mesa',
          `¿Eliminar la mesa <b>#${m.numero}</b>?`, 'Sí, eliminar');
        if (ok) await self.eliminar(m.id);
      } else if (res.isConfirmed) {
        await self.guardar(isNew ? null : m.id, res.value);
      }
    });
  },

  proximoNumero() {
    if (!this.data.length) return 1;
    return Math.max(...this.data.map(m => Number(m.numero) || 0)) + 1;
  },

  async guardar(id, datos) {
    startLoading();
    try {
      await apiPost('upsertMesa', withUser({
        id: id || null,
        numero: datos.numero,
        capacidad: datos.capacidad,
        zona: datos.zona
      }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: id ? 'Mesa actualizada' : 'Mesa creada' });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async eliminar(id) {
    startLoading();
    try {
      await apiPost('eliminarMesa', withUser({ id }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Mesa eliminada' });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  setupListeners() {
    const fab = $('#mesas-fab');
    if (fab && !fab._bound) {
      fab.addEventListener('click', () => this.abrirModalMesa(null));
      fab._bound = true;
    }
  }
};

/* ============================================================
   ============================================================
   FASE 2 — VISTA INVENTARIO
   ============================================================
   ============================================================ */
const Inventario = {
  data: [],

  async abrir() {
    showView('inventario');
    await this.cargar();
  },

  async cargar() {
    startLoading();
    try {
      this.data = await apiGet('getInventario');
      this.render();
    } catch (e) {
      alertErr('Error al cargar inventario', e.message);
    } finally {
      stopLoading();
    }
  },

  render() {
    const puedeAjustar = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
    const cont = $('#inventario-content');
    const sum = $('#inventario-summary');

    if (!this.data.length) {
      sum.innerHTML = '';
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:16px;">
          <h3>Sin productos con stock</h3>
          <p class="muted">Marca <b>"Maneja stock"</b> en los productos del catálogo para que aparezcan aquí.</p>
        </div>`;
      return;
    }

    // Orden: alerta primero, luego nombre
    const items = [...this.data].sort((a, b) => {
      if (a.enAlerta !== b.enAlerta) return a.enAlerta ? -1 : 1;
      return String(a.nombre).localeCompare(String(b.nombre), 'es');
    });

    const alertas = items.filter(i => i.enAlerta).length;
    sum.innerHTML = `
      <div class="inv-summary__row">
        <div class="inv-summary__chip">
          <span class="inv-summary__num">${items.length}</span>
          <span class="inv-summary__lbl">Productos</span>
        </div>
        <div class="inv-summary__chip ${alertas ? 'inv-summary__chip--alert' : ''}">
          <span class="inv-summary__num">${alertas}</span>
          <span class="inv-summary__lbl">En alerta</span>
        </div>
      </div>
    `;

    cont.innerHTML = items.map(i => {
      const alerta = i.enAlerta;
      return `
        <div class="inv-row ${alerta ? 'inv-row--alerta' : ''}">
          <div class="inv-row__main">
            <h4 class="inv-row__name">${escapeHtml(i.nombre)}</h4>
            <div class="inv-row__meta">
              <span>Mín: <b>${i.stockMinimo}</b></span>
              <span>·</span>
              <span>Últ. entrada: ${fmtFechaCorta(i.fechaUltimaEntrada)}</span>
            </div>
          </div>
          <div class="inv-row__stock">
            <div class="inv-row__num ${alerta ? 'is-alerta' : ''}">${i.stockActual}</div>
            <div class="inv-row__unit">${escapeHtml(i.unidad || 'UND')}</div>
          </div>
          ${puedeAjustar ? `
            <div class="inv-row__actions">
              <button class="btn-ico btn-ico--ok"   data-inv-mov="ENTRADA" data-inv-id="${i.id}" title="Entrada">＋</button>
              <button class="btn-ico btn-ico--info" data-inv-mov="AJUSTE"  data-inv-id="${i.id}" title="Ajuste">≡</button>
              <button class="btn-ico btn-ico--err"  data-inv-mov="MERMA"   data-inv-id="${i.id}" title="Merma">−</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    if (puedeAjustar) {
      $$('[data-inv-mov]', cont).forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.invId;
          const tipo = b.dataset.invMov;
          const item = items.find(x => x.id === id);
          if (item) this.abrirModalAjuste(item, tipo);
        });
      });
    }
  },

  abrirModalAjuste(item, tipo) {
    const titulos = { ENTRADA: 'Entrada de stock', AJUSTE: 'Ajuste de stock', MERMA: 'Merma' };
    const ayudas = {
      ENTRADA: `Suma al stock actual de <b>${item.stockActual}</b>.`,
      AJUSTE:  `Reemplaza el stock actual (<b>${item.stockActual}</b>) por el valor que ingreses.`,
      MERMA:   `Resta del stock actual (<b>${item.stockActual}</b>). Pérdida, vencimiento o avería.`
    };
    const ph = tipo === 'AJUSTE' ? 'Stock final exacto' : 'Cantidad';
    const self = this;

    Swal.fire({
      title: titulos[tipo] + ' — ' + item.nombre,
      html: `
        <p class="muted" style="font-size:0.85rem; margin-bottom:14px;">${ayudas[tipo]}</p>
        <label>${ph}</label>
        <input id="aj-cant" type="number" min="0" step="1" placeholder="0" autofocus />
        <label>Observaciones (opcional)</label>
        <textarea id="aj-obs" placeholder="Ej: factura proveedor, vencimiento..."></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aplicar ' + (tipo === 'ENTRADA' ? 'entrada' : tipo === 'AJUSTE' ? 'ajuste' : 'merma'),
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const cant = Number($('#aj-cant').value);
        if (isNaN(cant) || cant < 0) { Swal.showValidationMessage('Cantidad inválida'); return false; }
        if (tipo !== 'AJUSTE' && cant === 0) { Swal.showValidationMessage('Cantidad debe ser mayor a 0'); return false; }
        return { cant, obs: $('#aj-obs').value.trim() };
      }
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      await self.aplicar(item.id, tipo, res.value.cant, res.value.obs);
    });
  },

  async aplicar(inventarioId, tipo, cantidad, observaciones) {
    startLoading();
    try {
      const r = await apiPost('ajustarStock', withUser({
        inventarioId,
        tipoMovimiento: tipo,
        cantidad,
        observaciones
      }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: `Stock actualizado: ${r.stockDespues}` });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  setupListeners() { /* nada por ahora */ }
};

/* ============================================================
   ============================================================
   FASE 3 — TOMAR PEDIDO
   Grilla en vivo + apertura/edición de pedido + catálogo embebido
   ============================================================
   ============================================================ */
const Pedidos = {
  // === Grilla ===
  mesasConfig: [],
  estados: {},
  _refMesas: null,

  // === Pedido abierto ===
  pedidoActual: null,
  _refPedido: null,
  optimistas: {},       // { itemId: { estadoPrep?, cancelado? } } — overrides locales

  // === Catálogo para agregar items ===
  catalogo: null,
  filtroCat: '',
  expandidasCat: new Set(),

  /* ────────────────────────────────────────────
     ENTRADA / GRILLA
     ──────────────────────────────────────────── */
async abrir() {
    showView('tomar-pedido');
    // 1. Hidratar mesasConfig desde cache local (instantáneo)
    if (!this.mesasConfig.length) {
      const cached = localStorage.getItem('rg.mesasConfig');
      if (cached) {
        try { this.mesasConfig = JSON.parse(cached); } catch (_) {}
      }
    }
    // 2. Render inmediato + enganchar listener RTDB (no bloqueante)
    this.render();
    this.engancharRTDB();
    // 3. Refrescar config de mesas en background si cambió
    this.refrescarMesasConfigBg();
    // 4. Forzar sincronización del RTDB con throttle de 30s
    this.sincronizarVistaBg();
  },

async cargarInicial() {
    // Compat con código previo. abrir() ya orquesta todo y los fetches
    // van en background. Mantenemos el método por si algo externo lo llama.
    await this.refrescarMesasConfigBg();
    this.sincronizarVistaBg();
  },

  async refrescarMesasConfigBg() {
    try {
      const fresh = await apiGet('listMesas');
      if (JSON.stringify(fresh) !== JSON.stringify(this.mesasConfig)) {
        this.mesasConfig = fresh;
        localStorage.setItem('rg.mesasConfig', JSON.stringify(fresh));
        this.render();
      }
    } catch (e) { console.error('listMesas:', e); }
  },

  sincronizarVistaBg() {
    const KEY = 'rg.sync.pedidos';
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30 * 1000) return;
    localStorage.setItem(KEY, String(Date.now()));
    apiPost('sincronizarVistaPedidos', withUser({})).catch(e => {
      localStorage.removeItem(KEY);
      console.error('sincronizarVistaPedidos:', e);
    });
  },

  async engancharRTDB() {
    if (this._refMesas) return;
    const fb = await getFirebase();
    if (!fb) return;
    this._refMesas = fb.database()
      .ref('/negocios/' + NEGOCIO_RESTAURANTE_ID + '/mesas');
    this._refMesas.on('value', (snap) => {
      this.estados = snap.val() || {};
      this.render();
    }, (err) => {
      console.error('RTDB listener mesas:', err);
    });
  },

  claseEstado(estado) {
    switch (String(estado || 'LIBRE').toUpperCase()) {
      case 'ABIERTO':
      case 'EN_COCINA':         return 'mesa-pedido';
      case 'PARCIAL_SERVIDO':   return 'mesa-parcial';
      case 'SERVIDO':
      case 'PIDIENDO_CUENTA':   return 'mesa-servida';
      default:                  return 'mesa-libre';
    }
  },

  render() {
    const cont = $('#tomar-pedido-content');
    if (!cont) return;

    if (!this.mesasConfig.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:16px;">
          <h3>No hay mesas configuradas</h3>
          <p class="muted">Ve a <b>Mesas</b> en el menú principal para crear la primera.</p>
        </div>`;
      return;
    }

    const sorted = [...this.mesasConfig].sort(
      (a, b) => Number(a.numero) - Number(b.numero)
    );

    cont.innerHTML = sorted.map(m => {
      const st       = this.estados[m.id] || {};
      const estado   = (st.estado || 'LIBRE').toUpperCase();
      const cls      = this.claseEstado(estado);
      const libre    = estado === 'LIBRE';
      const pidiendo = estado === 'PIDIENDO_CUENTA' || st.pidiendoCuenta;
      const mesero = !libre && st.meseroNombre
        ? `<div class="mesa-tile__ped">${escapeHtml(String(st.meseroNombre).split(' ')[0])}</div>`
        : '';
      const total = (!libre && Number(st.total) > 0)
        ? `<div class="mesa-tile__total">${fmtPesos(st.total)}</div>`
        : '';
      const badge = pidiendo
        ? `<span class="mesa-tile__badge" title="Pidiendo cuenta">💰</span>`
        : '';
      return `
        <div class="mesa-tile ${cls}" data-mesa-id="${m.id}">
          ${badge}
          <div class="mesa-tile__num">${m.numero}</div>
          ${mesero}
          ${total}
          <div class="mesa-tile__zona">${escapeHtml(m.zona || 'SALON')}</div>
        </div>
      `;
    }).join('');

    // Tap → abrir mesa
    $$('[data-mesa-id]', cont).forEach(el => {
      el.addEventListener('click', () => this.clickMesa(el.dataset.mesaId));
    });
  },

  /* ────────────────────────────────────────────
     ABRIR PEDIDO (crear o cargar)
     ──────────────────────────────────────────── */
 async clickMesa(mesaId) {
    const st = this.estados[mesaId] || {};
    playSoundOnce(SOUNDS.click);

    if (st.pedidoId) {
      const esMio = String(st.meseroId) === String(state.user.id);
      const esSuperAdmin = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
      if (!esSuperAdmin && !esMio) {
        return alertWarn('Mesa ocupada',
          `Esta mesa la abrió <b>${escapeHtml(st.meseroNombre || '?')}</b>. Sólo el mesero asignado puede modificar el pedido.`);
      }
      this.abrirPedidoExistente(st.pedidoId, mesaId);
    } else {
      // Sin confirmar previo: un tap es suficiente. Si fue accidental
      // se cancela el pedido desde el detalle.
      this.crearYAbrirPedido(mesaId);
    }
  },
   
async crearYAbrirPedido(mesaId) {
    const mesaCfg = this.mesasConfig.find(m => m.id === mesaId);
    // Stub optimista: navegar YA, antes del POST
    this.pedidoActual = {
      id: null,
      meta: {
        mesaNumero:    mesaCfg ? mesaCfg.numero : '?',
        meseroNombre:  state.user.nombre,
        estado:        'ABIERTO',
        subtotal: 0, total: 0, descuentoValor: 0
      },
      items: {}
    };
    showView('pedido-detalle');
    this.renderDetalle();
    try {
      const r = await apiPost('crearPedido', withUser({ mesaId }));
      this.pedidoActual.id = r.id;
      // crearPedido ya proyectó al RTDB. Enganchamos.
      this.engancharRTDBPedido(r.id);
    } catch (e) {
      alertErr('Error al abrir mesa', e.message);
      this.volverAGrilla();
    }
  },

abrirPedidoExistente(pedidoId, mesaId) {
    // Stub optimista con info del RTDB cacheado en this.estados
    const st = (mesaId && this.estados[mesaId]) || {};
    const mesaCfg = mesaId ? this.mesasConfig.find(m => m.id === mesaId) : null;
    this.pedidoActual = {
      id: pedidoId,
      meta: {
        mesaNumero:     mesaCfg ? mesaCfg.numero : '?',
        meseroNombre:   st.meseroNombre || '',
        estado:         st.estado || 'ABIERTO',
        subtotal:       st.total || 0,
        total:          st.total || 0,
        descuentoValor: 0
      },
      items: {}
    };
    showView('pedido-detalle');
    this.renderDetalle();
    // RTDB ya está fresco (cualquier acción previa lo proyectó).
    // El listener trae items reales en <300ms.
    this.engancharRTDBPedido(pedidoId);
  },

  engancharRTDBPedido(pedidoId) {
    this.desengancharRTDBPedido();
    getFirebase().then(fb => {
      if (!fb) return;
      const path = '/negocios/' + NEGOCIO_RESTAURANTE_ID + '/pedidos/' + pedidoId;
      this._refPedido = fb.database().ref(path);
      this._refPedido.on('value', (snap) => {
        const data = snap.val();
        if (!data) {
          this.pedidoActual = null;
          const dv = $('#view-pedido-detalle');
          if (dv && dv.classList.contains('active')) {
            alertInfo('Pedido cerrado', 'Este pedido ya fue cobrado o cancelado.');
            this.volverAGrilla();
          }
          return;
        }
        // Preservar ítems _tmp que aún no se confirmen en este snapshot
        const tmps = {};
        if (this.pedidoActual && this.pedidoActual.items) {
          Object.entries(this.pedidoActual.items).forEach(([id, it]) => {
            if (it && it._tmp) tmps[id] = it;
          });
        }
        this.pedidoActual = { id: pedidoId, ...data };
        if (!this.pedidoActual.items) this.pedidoActual.items = {};
        Object.entries(tmps).forEach(([tmpId, tmpItem]) => {
          const yaConfirmado = Object.values(this.pedidoActual.items).some(real =>
            !real._tmp &&
            real.productoId === tmpItem.productoId &&
            Number(real.cantidad) === Number(tmpItem.cantidad) &&
            Number(real.subtotal) === Number(tmpItem.subtotal)
          );
          if (!yaConfirmado) this.pedidoActual.items[tmpId] = tmpItem;
        });
        // Limpiar overrides optimistas que ya coinciden con el snapshot real
        Object.keys(this.optimistas).forEach(itemId => {
          const real = this.pedidoActual.items[itemId];
          if (!real) { delete this.optimistas[itemId]; return; }
          const ov = this.optimistas[itemId];
          const realEstado = String(real.estadoPrep || '').toUpperCase();
          if (ov.estadoPrep && realEstado === String(ov.estadoPrep).toUpperCase()) {
            delete this.optimistas[itemId];
          } else if (ov.cancelado && real.cancelado) {
            delete this.optimistas[itemId];
          }
        });
        this.renderDetalle();
      }, (err) => {
        console.error('RTDB listener pedido:', err);
      });
    });
  },

  desengancharRTDBPedido() {
    if (this._refPedido) {
      this._refPedido.off();
      this._refPedido = null;
    }
  },

  /* ────────────────────────────────────────────
     VISTA DETALLE DEL PEDIDO
     ──────────────────────────────────────────── */
  renderDetalle() {
    const p = this.pedidoActual;
    if (!p) return;
    const meta = p.meta || {};
    const items = p.items || {};

    $('#pd-mesa-num').textContent = meta.mesaNumero || '?';
    $('#pd-mesero').textContent = meta.meseroNombre
      ? String(meta.meseroNombre).split(' ')[0]
      : '';
    $('#pd-estado').textContent = this.labelEstado(meta.estado);
    $('#pd-estado').className = 'pd-chip pd-chip--' +
      String(meta.estado || 'ABIERTO').toLowerCase().replace('_', '-');

    const cont = $('#pd-items');
    const itemsArr = Object.entries(items)
      .map(([id, it]) => {
        const ov = this.optimistas[id];
        if (ov) {
          const merged = { id, ...it, _tmp: true };
          if (ov.estadoPrep)              merged.estadoPrep = ov.estadoPrep;
          if (ov.cancelado !== undefined) merged.cancelado  = ov.cancelado;
          return merged;
        }
        return { id, ...it };
      })
      .sort((a, b) => String(a.fechaPedido).localeCompare(String(b.fechaPedido)));

    if (!itemsArr.length) {
      cont.innerHTML = `
        <div class="pd-empty">
          <div style="font-size:2.4rem; opacity:0.4;">🍽️</div>
          <p class="muted">Aún no hay productos. Toca <b>+</b> para empezar.</p>
        </div>`;
} else {
      cont.innerHTML = itemsArr.map(it => this.renderItem(it)).join('');
      $$('[data-item-cancel]', cont).forEach(b => {
        b.addEventListener('click', () => this.cancelarItem(b.dataset.itemCancel));
      });
      $$('[data-item-servir]', cont).forEach(b => {
        b.addEventListener('click', () => this.marcarServido(b.dataset.itemServir));
      });
      // Fase 4D — tap sobre el nombre del ítem (sólo si editable) abre el modal de edición
 $$('[data-item-edit]', cont).forEach(b => {
        b.addEventListener('click', () => this.editarItem(b.dataset.itemEdit));
      });
    }

    // ▼▼ NUEVO: mostrar/ocultar botón "Liberar mesa"
    const btnCerrar = $('#pd-btn-cerrar-mesa');
    if (btnCerrar) {
      const sinProductos = itemsArr.length === 0;
      btnCerrar.classList.toggle('hidden', !(sinProductos && !!p.id));
    }
    // ▲▲ FIN NUEVO

    $('#pd-subtotal').textContent = fmtPesos(meta.subtotal || 0);
    $('#pd-total').textContent = fmtPesos(meta.total || 0);
    const descRow = $('#pd-descuento-row');
    if ((meta.descuentoValor || 0) > 0) {
      descRow.classList.remove('hidden');
      $('#pd-descuento-pct').textContent = (meta.descuentoPct || 0) + '%';
      $('#pd-descuento-val').textContent = '-' + fmtPesos(meta.descuentoValor || 0);
    } else {
      descRow.classList.add('hidden');
    }
 // Botón "Pedir cuenta": SÓLO visible cuando TODO el pedido está SERVIDO
    // (todos los ítems no-cancelados ya marcados servidos). Si aún hay algo
    // en cocina o pendiente, el botón ni aparece — protege al cliente de
    // pedir cuenta con platos pendientes.
    const btnCuenta = $('#pd-btn-cuenta');
    if (btnCuenta) {
      const est = String(meta.estado || '').toUpperCase();
      const puedePedir = est === 'SERVIDO';
      const yaPedida   = est === 'PIDIENDO_CUENTA';
      btnCuenta.classList.toggle('hidden', !(puedePedir || yaPedida));
      btnCuenta.disabled = yaPedida;
      btnCuenta.textContent = yaPedida ? '💰 Cuenta pedida' : '💰 Pedir cuenta';
    }
  },

  labelEstado(estado) {
    const map = {
      ABIERTO: 'Abierto',
      EN_COCINA: 'En cocina',
      PARCIAL_SERVIDO: 'Parcial',
      SERVIDO: 'Servido',
      PIDIENDO_CUENTA: 'Pidiendo cuenta'
    };
    return map[String(estado || '').toUpperCase()] || estado || '';
  },

  renderItem(it) {
    const cancelado = it.cancelado;
    const estPrep   = String(it.estadoPrep || '').toUpperCase();
    const esRapido  = !it.esPreparacion;
    // Fase 4D — Editable si: no cancelado, no temporal, y aún no fue a cocina
    // (PENDIENTE para preparación; NO_APLICA para rápidos). Servido / listo /
    // en cocina ya NO se editan — sólo se cancelan.
    const editable = !cancelado && !it._tmp &&
                     (estPrep === 'PENDIENTE' || estPrep === 'NO_APLICA');

    const badge = (() => {
      if (cancelado) return `<span class="pd-item__badge pd-item__badge--cancel">Cancelado</span>`;
      if (esRapido)  return `<span class="pd-item__badge pd-item__badge--rapido">Listo</span>`;
      switch (estPrep) {
        case 'PENDIENTE':  return `<span class="pd-item__badge pd-item__badge--pendiente">Pendiente</span>`;
        case 'PREPARANDO': return `<span class="pd-item__badge pd-item__badge--preparando">En cocina</span>`;
        case 'LISTO':      return `<span class="pd-item__badge pd-item__badge--listo">¡Listo!</span>`;
        case 'SERVIDO':    return `<span class="pd-item__badge pd-item__badge--servido">Servido</span>`;
      }
      return '';
    })();

    const mods = (it.modificadores || []).map(m =>
      `<li class="pd-item__mod">${escapeHtml(m.nombreGrupo || m.grupo)}: <b>${escapeHtml(m.opcion)}</b></li>`
    ).join('');
    const desc = it.descripcion
      ? `<div class="pd-item__desc">📝 ${escapeHtml(it.descripcion)}</div>`
      : '';

    let acciones = '';
    if (!cancelado && estPrep !== 'SERVIDO') {
      acciones += `<button class="pd-item__act pd-item__act--cancel" data-item-cancel="${it.id}" title="Cancelar">✕</button>`;
      const puedeServir = esRapido || estPrep === 'LISTO';
      if (puedeServir) {
        acciones += `<button class="pd-item__act pd-item__act--servir" data-item-servir="${it.id}" title="Marcar servido">✓</button>`;
      }
    }

    const nameAttr = editable
      ? `class="pd-item__name pd-item__name--editable" data-item-edit="${it.id}" title="Tocar para editar"`
      : `class="pd-item__name"`;

    return `
      <article class="pd-item ${cancelado ? 'is-cancelado' : ''} ${it._tmp ? 'is-tmp' : ''}">
        <div class="pd-item__qty">${it.cantidad}×</div>
        <div class="pd-item__body">
          <div class="pd-item__head">
            <h4 ${nameAttr}>${escapeHtml(it.nombre)}${editable ? ' <span class="pd-item__edit-hint">✎</span>' : ''}</h4>
            ${badge}
          </div>
          ${mods ? `<ul class="pd-item__mods">${mods}</ul>` : ''}
          ${desc}
          ${it.motivoCancelacion ? `<div class="pd-item__motivo">Motivo: ${escapeHtml(it.motivoCancelacion)}</div>` : ''}
        </div>
        <div class="pd-item__right">
          <div class="pd-item__price">${fmtPesos(it.subtotal)}</div>
          ${acciones ? `<div class="pd-item__actions">${acciones}</div>` : ''}
        </div>
      </article>
    `;
  },
  volverAGrilla() {
    this.desengancharRTDBPedido();
    this.pedidoActual = null;
    showView('tomar-pedido');
  },

   /* ────────────────────────────────────────────
     LIBERAR / CERRAR MESA VACÍA
     Solo cuando el pedido no tiene productos. Borra
     la fila en la hoja PEDIDOS y deja la mesa LIBRE.
     ──────────────────────────────────────────── */
  async cerrarMesa() {
    const p = this.pedidoActual;
    if (!p || !p.id) return;
    if (Object.keys(p.items || {}).length > 0) {
      return alertWarn('La mesa tiene productos',
        'Solo puedes liberar una mesa que no tenga productos.');
    }
    // Sin confirmar ni Toast. Tap único → la mesa volviendo a gris (LIBRE)
    // en la grilla es el feedback. Si fue accidental, basta tocar la mesa
    // de nuevo (estaba vacía, se recrea el pedido).
    // Desenganchar el listener ANTES del POST: al borrar el backend el nodo
    // del RTDB, el snapshot null dispararía el aviso "pedido cerrado".
    this.desengancharRTDBPedido();
    startLoading();
    try {
      await apiPost('cerrarMesaVacia', withUser({ pedidoId: p.id }));
      stopLoading();
      playSoundOnce(SOUNDS.ok);
      this.volverAGrilla();
    } catch (e) {
      stopLoading();
      // Reconectar el listener para seguir en el detalle si falló
      this.engancharRTDBPedido(p.id);
      alertErr('No se pudo liberar', e.message);
    }
  },
   
  /* ────────────────────────────────────────────
     CATÁLOGO EMBEBIDO
     ──────────────────────────────────────────── */
 async abrirCatalogo() {
    if (!this.pedidoActual) return;
    if (!this.pedidoActual.id) {
      Toast && Toast.fire({ icon: 'info', title: 'Un momento, abriendo mesa…' });
      return;
    }
    showView('pedido-catalogo');
    if (!this.catalogo) await this.cargarCatalogo();
    this.renderCatalogo();
  },

  async cargarCatalogo() {
    startLoading();
    try {
      this.catalogo = await apiGet('getCatalogo');
      if (this.expandidasCat.size === 0) {
        const conProds = this.catalogo.categorias.find(c =>
          this.catalogo.productos.some(p => p.categoriaId === c.id && p.disponible)
        );
        if (conProds) this.expandidasCat.add(conProds.id);
      }
    } catch (e) {
      alertErr('Error al cargar catálogo', e.message);
    } finally {
      stopLoading();
    }
  },

  renderCatalogo() {
    const cont = $('#pc-content');
    if (!cont || !this.catalogo) return;

    const filtro = this.filtroCat.trim().toLowerCase();
    const cats = this.catalogo.categorias;
    const prodsPorCat = {};
    this.catalogo.productos.forEach(p => {
      if (!p.disponible) return;
      if (filtro) {
        const hit = p.nombre.toLowerCase().includes(filtro) ||
                    (p.descripcion || '').toLowerCase().includes(filtro);
        if (!hit) return;
      }
      if (!prodsPorCat[p.categoriaId]) prodsPorCat[p.categoriaId] = [];
      prodsPorCat[p.categoriaId].push(p);
    });

    if (filtro) {
      cats.forEach(c => { if ((prodsPorCat[c.id] || []).length) this.expandidasCat.add(c.id); });
    }

    const visibles = cats.filter(c => filtro ? (prodsPorCat[c.id] || []).length : true);
    if (!visibles.length) {
      cont.innerHTML = `<div class="card text-center"><h3>Sin resultados</h3></div>`;
      return;
    }

    cont.innerHTML = visibles.map(cat => {
      const prods = prodsPorCat[cat.id] || [];
      const exp = this.expandidasCat.has(cat.id);
      return `
        <section class="cat-acordeon ${exp ? 'open' : ''}" data-cat="${cat.id}">
          <button class="cat-acordeon__head" data-toggle-cat-pc="${cat.id}">
            <span class="cat-acordeon__bullet" style="background:${cat.color || '#06402B'}"></span>
            <span class="cat-acordeon__name">${escapeHtml(cat.nombre)}</span>
            <span class="cat-acordeon__count">${prods.length}</span>
            <svg class="cat-acordeon__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="cat-acordeon__body">
            ${prods.length
              ? `<div class="pc-prod-grid">${prods.map(p => this.renderProdMini(p)).join('')}</div>`
              : `<p class="muted">Sin productos.</p>`}
          </div>
        </section>
      `;
    }).join('');

    $$('[data-toggle-cat-pc]', cont).forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.toggleCatPc;
        if (this.expandidasCat.has(id)) this.expandidasCat.delete(id);
        else this.expandidasCat.add(id);
        this.renderCatalogo();
      });
    });
    $$('[data-pc-prod]', cont).forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.pcProd;
        const p = this.catalogo.productos.find(x => x.id === id);
        if (p) this.abrirModalProducto(p);
      });
    });
  },

  renderProdMini(p) {
    const img = p.imagenUrl || PLACEHOLDER_PRODUCTO;
    return `
      <button class="pc-prod" data-pc-prod="${p.id}">
        <img class="pc-prod__img" src="${img}" alt="${escapeHtml(p.nombre)}"
             loading="lazy" onerror="this.src='${PLACEHOLDER_PRODUCTO}'" />
        <div class="pc-prod__body">
          <h4 class="pc-prod__name">${escapeHtml(p.nombre)}</h4>
          <div class="pc-prod__price">${fmtPesos(p.precioBase)}</div>
        </div>
      </button>
    `;
  },

  volverADetalle() {
    showView('pedido-detalle');
    this.renderDetalle();
  },

  /* ────────────────────────────────────────────
     MODAL DE PRODUCTO (cantidad + mods + nota)
     ──────────────────────────────────────────── */
abrirModalProducto(producto, initial) {
    // Fase 4D — `initial` opcional: { cantidad, modificadores, descripcion, itemId }
    // Si viene, el modal arranca en modo edición (precargado + título "Editar").
    const grupos = (this.catalogo.modificadores[producto.id] || []);
    const self = this;
    const esEdicion = !!(initial && initial.itemId);
    // Set rápido de "grupo|opcion" -> true para marcar las opciones preseleccionadas
    const seleccionPrev = {};
    if (initial && initial.modificadores) {
      initial.modificadores.forEach(m => {
        seleccionPrev[String(m.grupo) + '|' + String(m.opcion)] = true;
      });
    }

    // Visibilidad condicional (caso desayunos): si el producto tiene una opción
    // "Solo caldo", los grupos cuyo nombre contenga "bandeja" se ocultan al
    // marcarla. Genérico: si el producto no encaja, los índices quedan en -1
    // y el modal se comporta como siempre.
    const grupoCtlIdx = grupos.findIndex(g =>
      (g.opciones || []).some(o => String(o.opcion || '').toLowerCase().trim() === 'solo caldo')
    );
    const opcionSoloCaldoIdx = grupoCtlIdx >= 0
      ? grupos[grupoCtlIdx].opciones.findIndex(o =>
          String(o.opcion || '').toLowerCase().trim() === 'solo caldo')
      : -1;
    const esGrupoDep = (g) => /bandeja/i.test(String(g.nombreGrupo || g.grupo || ''));

    const gruposHTML = grupos.map((g, gi) => {
      const isUnica = String(g.tipoSeleccion || 'UNICA').toUpperCase() === 'UNICA';
      const esCtl = (gi === grupoCtlIdx);
      const esDep = esGrupoDep(g);
      const opsHTML = g.opciones.map((o, oi) => {
        const type = isUnica ? 'radio' : 'checkbox';
        const name = isUnica ? `mp-g-${gi}` : `mp-g-${gi}-${oi}`;
        // Si estamos en edición, marcar las opciones que el ítem ya tenía
        const preMarcado = seleccionPrev[String(g.grupo) + '|' + String(o.opcion)];
        const defaultMark = (isUnica && g.obligatorio && oi === 0 && !esEdicion);
        const checked = (preMarcado || defaultMark) ? 'checked' : '';
        const delta = Number(o.precioDelta) || 0;
        const deltaStr = delta === 0 ? '' :
          (delta > 0 ? `+${fmtPesos(delta)}` : `${fmtPesos(delta)}`);
        const soloCaldoAttr = (esCtl && oi === opcionSoloCaldoIdx) ? ' data-mp-solo-caldo="1"' : '';
        return `
          <label class="mp-opt">
            <input type="${type}" name="${name}" value="${oi}"
                   data-mp-grupo="${gi}" data-mp-opcion="${oi}"
                   data-mp-delta="${delta}"${soloCaldoAttr} ${checked} />
            <span class="mp-opt__name">${escapeHtml(o.opcion)}</span>
            ${deltaStr ? `<span class="mp-opt__delta">${deltaStr}</span>` : ''}
          </label>
        `;
      }).join('');
      const dataAttrs = `data-mp-grupo-idx="${gi}"` +
        (esCtl ? ' data-mp-grupo-ctl="1"' : '') +
        (esDep ? ' data-mp-grupo-dep="1"' : '');
      return `
        <div class="mp-grupo" ${dataAttrs}>
          <div class="mp-grupo__head">
            <strong>${escapeHtml(g.nombreGrupo || g.grupo)}</strong>
            ${g.obligatorio ? `<span class="mp-tag mp-tag--oblig">Obligatorio</span>` : ''}
            <span class="mp-tag">${isUnica ? 'Única' : 'Múltiple'}</span>
          </div>
          <div class="mp-opts">${opsHTML}</div>
        </div>
      `;
    }).join('');

    const cantIni = (initial && initial.cantidad) ? Math.max(1, Number(initial.cantidad)) : 1;
    const notaIni = (initial && initial.descripcion) ? initial.descripcion : '';

    Swal.fire({
      title: esEdicion ? `Editar: ${producto.nombre}` : producto.nombre,
      html: `
        <div class="mp">
          <div class="mp__img-wrap">
            <img class="mp__img" src="${producto.imagenUrl || PLACEHOLDER_PRODUCTO}"
                 onerror="this.src='${PLACEHOLDER_PRODUCTO}'" />
          </div>
          ${producto.descripcion ? `<p class="mp__desc">${escapeHtml(producto.descripcion)}</p>` : ''}

          <div class="mp__qty-row">
            <span class="mp__qty-lbl">Cantidad</span>
            <div class="mp__qty">
              <button type="button" class="mp__qty-btn" data-mp-qty="-">−</button>
              <input type="number" id="mp-cantidad" value="${cantIni}" min="1" max="50" />
              <button type="button" class="mp__qty-btn" data-mp-qty="+">+</button>
            </div>
          </div>

          ${gruposHTML}

          <label>Nota especial ${producto.requiereNota ? '(requerida)' : '(opcional)'}</label>
          <textarea id="mp-nota" placeholder="${producto.requiereNota ? 'Escribe el detalle del pedido…' : 'Ej: sin cebolla, punto medio…'}">${escapeHtml(notaIni)}</textarea>

          <div class="mp__total-row">
            <span>Total</span>
            <span class="mp__total" id="mp-total">${fmtPesos(producto.precioBase)}</span>
          </div>
        </div>
      `,
      width: 560,
      showCancelButton: true,
      confirmButtonText: esEdicion ? 'Guardar cambios' : 'Agregar al pedido',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => {
        const recalc = () => {
          const cant = Math.max(1, Number($('#mp-cantidad').value) || 1);
          let delta = 0;
          $$('input[data-mp-delta]:checked').forEach(el => {
            // Ignorar deltas de grupos ocultos (dependientes de "Solo caldo")
            const grupoEl = el.closest('.mp-grupo');
            if (grupoEl && grupoEl.classList.contains('hidden')) return;
            delta += Number(el.dataset.mpDelta) || 0;
          });
          const total = (Number(producto.precioBase) + delta) * cant;
          $('#mp-total').textContent = fmtPesos(total);
        };
        // Mostrar/ocultar grupos dependientes según "Solo caldo"
        const toggleDeps = () => {
          if (grupoCtlIdx < 0) return;
          const soloCaldoMarcado = !!document.querySelector('input[data-mp-solo-caldo="1"]:checked');
          $$('.mp-grupo[data-mp-grupo-dep="1"]').forEach(el => {
            el.classList.toggle('hidden', soloCaldoMarcado);
            if (soloCaldoMarcado) {
              // Limpiar selección de bandeja al volver a "Solo caldo"
              $$('input[data-mp-delta]', el).forEach(inp => { inp.checked = false; });
            }
          });
          recalc();
        };
        $$('[data-mp-qty]').forEach(b => {
          b.addEventListener('click', () => {
            const inp = $('#mp-cantidad');
            let v = Math.max(1, Number(inp.value) || 1);
            v = b.dataset.mpQty === '+' ? Math.min(50, v + 1) : Math.max(1, v - 1);
            inp.value = v;
            recalc();
          });
        });
        $('#mp-cantidad').addEventListener('input', recalc);
        $$('input[data-mp-delta]').forEach(el => el.addEventListener('change', recalc));
        if (grupoCtlIdx >= 0) {
          $$(`input[data-mp-grupo="${grupoCtlIdx}"]`).forEach(el =>
            el.addEventListener('change', toggleDeps));
          toggleDeps(); // estado inicial (cubre edición con "Solo caldo" preseleccionado)
        } else {
          recalc();
        }
      },
      preConfirm: () => {
        const seleccion = [];
        for (let gi = 0; gi < grupos.length; gi++) {
          const g = grupos[gi];
          // Saltar grupos dependientes ocultos (caso "Solo caldo")
          const grupoEl = document.querySelector(`.mp-grupo[data-mp-grupo-idx="${gi}"]`);
          if (grupoEl && grupoEl.classList.contains('hidden')) continue;
          const checks = $$(`input[data-mp-grupo="${gi}"]:checked`);
          if (g.obligatorio && !checks.length) {
            Swal.showValidationMessage(`Selecciona una opción en "${g.nombreGrupo || g.grupo}"`);
            return false;
          }
          checks.forEach(el => {
            const oi = Number(el.dataset.mpOpcion);
            const op = g.opciones[oi];
            seleccion.push({
              grupo: g.grupo,
              nombreGrupo: g.nombreGrupo || g.grupo,
              opcion: op.opcion,
              precioDelta: Number(op.precioDelta) || 0
            });
          });
        }
       const notaVal = $('#mp-nota').value.trim();
        if (producto.requiereNota && !notaVal) {
          Swal.showValidationMessage('La nota es obligatoria para este producto');
          return false;
        }
        return {
          cantidad: Math.max(1, Number($('#mp-cantidad').value) || 1),
          modificadores: seleccion,
          descripcion: notaVal
        };
      }
   }).then(async (res) => {
      if (!res.isConfirmed) return;
      if (esEdicion) {
        await self.guardarEdicionItem(initial.itemId, producto, res.value);
      } else {
        await self.agregarItem(producto, res.value);
      }
    });
  },

 async agregarItem(producto, datos) {
    if (!this.pedidoActual) return;

    // Optimistic UI: cerrar modal + volver al detalle YA
    this.volverADetalle();
    playSoundOnce(SOUNDS.pedido);

    // Cálculos locales para mostrar el ítem antes de que el backend responda
    const deltaTotal = (datos.modificadores || [])
      .reduce((s, m) => s + (Number(m.precioDelta) || 0), 0);
    const precio   = (Number(producto.precioBase) || 0) + deltaTotal;
    const subtotal = precio * datos.cantidad;
    const esPrep   = String(producto.tipo).toUpperCase() === 'PREPARACION';

    const tmpId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const tmpItem = {
      productoId:    producto.id,
      nombre:        producto.nombre,
      cantidad:      datos.cantidad,
      precioUnitario: precio,
      subtotal:      subtotal,
      modificadores: datos.modificadores || [],
      descripcion:   datos.descripcion || '',
      esPreparacion: esPrep,
      estadoPrep:    esPrep ? 'PENDIENTE' : 'NO_APLICA',
      fechaPedido:   new Date().toISOString(),
      cancelado:     false,
      _tmp:          true
    };
    if (!this.pedidoActual.items) this.pedidoActual.items = {};
    this.pedidoActual.items[tmpId] = tmpItem;
   if (!this.pedidoActual.meta) this.pedidoActual.meta = {};
    const meta = this.pedidoActual.meta;
    meta.subtotal = (Number(meta.subtotal) || 0) + subtotal;
    meta.total    = meta.subtotal - (Number(meta.descuentoValor) || 0);
    this.renderDetalle();

    // Sin Toast — el ítem nuevo apareciendo en la lista con badge ⏳ es el feedback.
    // POST en background. El listener RTDB confirma (o no llega y revertimos).
    try {
      await apiPost('agregarItem', withUser({
        pedidoId:      this.pedidoActual.id,
        productoId:    producto.id,
        cantidad:      datos.cantidad,
        modificadores: datos.modificadores,
        descripcion:   datos.descripcion
      }));
   } catch (e) {
      // Revertir: borrar el tmp y restar del total
      if (this.pedidoActual && this.pedidoActual.items && this.pedidoActual.items[tmpId]) {
        delete this.pedidoActual.items[tmpId];
        const m = this.pedidoActual.meta;
        m.subtotal = (Number(m.subtotal) || 0) - subtotal;
        m.total    = m.subtotal - (Number(m.descuentoValor) || 0);
        this.renderDetalle();
      }
      alertErr('Error al agregar', e.message);
    }
  },

  /* ────────────────────────────────────────────
     FASE 4D — EDITAR ÍTEM YA INGRESADO
     ──────────────────────────────────────────── */
  async editarItem(itemId) {
    if (!this.pedidoActual) return;
    const it = (this.pedidoActual.items || {})[itemId];
    if (!it) return;
    // Defensa: aunque el badge ya no debería renderizar el botón si no es
    // editable, validamos por si el snapshot RTDB cambió mientras tanto.
    const estPrep = String(it.estadoPrep || '').toUpperCase();
    if (estPrep !== 'PENDIENTE' && estPrep !== 'NO_APLICA') {
      Toast && Toast.fire({ icon: 'warning', title: 'Ya no se puede editar — está en cocina' });
      return;
    }
    if (!this.catalogo) await this.cargarCatalogo();
    const producto = this.catalogo.productos.find(p => p.id === it.productoId);
    if (!producto) return alertErr('Error', 'No se encontró el producto en el catálogo.');
    this.abrirModalProducto(producto, {
      itemId,
      cantidad:      it.cantidad,
      modificadores: it.modificadores || [],
      descripcion:   it.descripcion   || ''
    });
  },

  async guardarEdicionItem(itemId, producto, datos) {
    if (!this.pedidoActual) return;
    const it = (this.pedidoActual.items || {})[itemId];
    if (!it) return;

    // Cálculo optimista del nuevo subtotal
    const deltaTotal = (datos.modificadores || [])
      .reduce((s, m) => s + (Number(m.precioDelta) || 0), 0);
    const precioNuevo   = (Number(producto.precioBase) || 0) + deltaTotal;
    const subtotalNuevo = precioNuevo * datos.cantidad;
    const subtotalPrev  = Number(it.subtotal) || 0;

    // Aplicar overrides locales del ítem y recalcular totales del pedido
    const itPrev = { ...it };
    it.cantidad       = datos.cantidad;
    it.precioUnitario = precioNuevo;
    it.subtotal       = subtotalNuevo;
    it.modificadores  = datos.modificadores || [];
    it.descripcion    = datos.descripcion   || '';
    it._tmp           = true;  // pinta ⏳ hasta que confirme el RTDB

    const meta = this.pedidoActual.meta;
    meta.subtotal = (Number(meta.subtotal) || 0) - subtotalPrev + subtotalNuevo;
    meta.total    = meta.subtotal - (Number(meta.descuentoValor) || 0);
    this.renderDetalle();

    try {
      await apiPost('editarItem', withUser({
        itemId,
        cantidad:      datos.cantidad,
        modificadores: datos.modificadores,
        descripcion:   datos.descripcion
      }));
      // El listener RTDB confirma — pero por si llega tarde, limpiamos _tmp
      // proactivamente para que el badge ⏳ desaparezca.
      if (this.pedidoActual.items[itemId]) {
        this.pedidoActual.items[itemId]._tmp = false;
        this.renderDetalle();
      }
    } catch (e) {
      // Revertir
      if (this.pedidoActual.items[itemId]) {
        Object.assign(this.pedidoActual.items[itemId], itPrev);
      }
      meta.subtotal = (Number(meta.subtotal) || 0) + subtotalPrev - subtotalNuevo;
      meta.total    = meta.subtotal - (Number(meta.descuentoValor) || 0);
      this.renderDetalle();
      alertErr('Error al editar', e.message);
    }
  },

  /* ────────────────────────────────────────────
     ACCIONES SOBRE ITEMS
     ──────────────────────────────────────────── */
  async cancelarItem(itemId) {
    const p = this.pedidoActual;
    if (!p) return;
    const it = (p.items || {})[itemId];
    if (!it) return;
    const estPrep = String(it.estadoPrep || '').toUpperCase();
    const requiereMotivo = it.esPreparacion && estPrep !== 'PENDIENTE';

    let motivo = '';
    if (requiereMotivo) {
      const r = await Swal.fire({
        title: 'Cancelar ítem',
        html: `
          <p>Este ítem ya fue enviado a cocina. Indica el motivo:</p>
          <input id="ci-motivo" type="text" placeholder="Ej: error de mesa, cliente cambió de opinión…" />
        `,
        showCancelButton: true, confirmButtonText: 'Cancelar ítem', cancelButtonText: 'Volver',
        reverseButtons: true,
        preConfirm: () => {
          const m = $('#ci-motivo').value.trim();
          if (!m) { Swal.showValidationMessage('El motivo es obligatorio'); return false; }
          return m;
        }
      });
      if (!r.isConfirmed) return;
      motivo = r.value;
   }
    // Sin confirmar previo si no requiere motivo: tap único → optimistic UI.
    // El ítem queda tachado en pantalla, ese es el feedback.

    this.optimistas[itemId] = { cancelado: true };
    this.renderDetalle();

    try {
      await apiPost('cancelarItem', withUser({ itemId, motivo }));
       // El listener RTDB confirma y limpia el override
    } catch (e) {
      delete this.optimistas[itemId];
      this.renderDetalle();
      alertErr('Error', e.message);
    }
  },

async marcarServido(itemId) {
    if (!this.pedidoActual || !this.pedidoActual.items[itemId]) return;
    // Optimista: aplicar override → render → POST en background
    this.optimistas[itemId] = { estadoPrep: 'SERVIDO' };
    this.renderDetalle();
    playSoundOnce(SOUNDS.ok);
    try {
      await apiPost('marcarPrep', withUser({ itemId, nuevoEstado: 'SERVIDO' }));
      // El listener RTDB confirma y limpia el override
    } catch (e) {
      delete this.optimistas[itemId];
      this.renderDetalle();
      alertErr('Error', e.message);
    }
  },

  /* ────────────────────────────────────────────
     LISTENERS GLOBALES
     ──────────────────────────────────────────── */
  setupListeners() {
    const fab = $('#pd-fab-add');
    if (fab && !fab._bound) {
      fab.addEventListener('click', () => this.abrirCatalogo());
      fab._bound = true;
    }
    const back = $('#pc-back');
    if (back && !back._bound) {
      back.addEventListener('click', () => this.volverADetalle());
      back._bound = true;
    }
    const backDet = $('#pd-back');
    if (backDet && !backDet._bound) {
      backDet.addEventListener('click', () => this.volverAGrilla());
      backDet._bound = true;
    }
    const sBtn = $('#pc-search-btn');
    const sBar = $('#pc-search-bar');
    const sInp = $('#pc-search-input');
    if (sBtn && !sBtn._bound) {
      sBtn.addEventListener('click', () => {
        sBar.classList.toggle('hidden');
        if (!sBar.classList.contains('hidden')) sInp.focus();
        else { sInp.value = ''; this.filtroCat = ''; this.renderCatalogo(); }
      });
      sBtn._bound = true;
    }
if (sInp && !sInp._bound) {
      let t = null;
      sInp.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { this.filtroCat = sInp.value; this.renderCatalogo(); }, 180);
      });
      sInp._bound = true;
    }
const btnC = $('#pd-btn-cuenta');
    if (btnC && !btnC._bound) {
      btnC.addEventListener('click', () => this.pedirCuenta());
      btnC._bound = true;
    }

    // ▼▼ NUEVO
    const btnCerrar = $('#pd-btn-cerrar-mesa');
    if (btnCerrar && !btnCerrar._bound) {
      btnCerrar.addEventListener('click', () => this.cerrarMesa());
      btnCerrar._bound = true;
    }
    // ▲▲ FIN NUEVO
  },

  async pedirCuenta() {
    if (!this.pedidoActual) return;
    const meta = this.pedidoActual.meta || {};
    if (String(meta.estado).toUpperCase() === 'PIDIENDO_CUENTA') return;

    // Sin confirmar ni Toast. Tap único → optimistic UI YA → POST background.
    // El feedback es el botón cambiando a "💰 Cuenta pedida" deshabilitado.
    const estadoPrev = meta.estado;
    meta.estado = 'PIDIENDO_CUENTA';
    this.renderDetalle();
    playSoundOnce(SOUNDS.pedido);

    try {
      await apiPost('pedirCuenta', withUser({ pedidoId: this.pedidoActual.id }));
      // Sin Toast — el botón ya muestra "Cuenta pedida".
    } catch (e) {
      meta.estado = estadoPrev;
      this.renderDetalle();
      alertErr('Error', e.message);
    }
  }
};

/* ============================================================
   ============================================================
   FASE 3B — COMANDA COCINA
   Tablero kanban en vivo: PENDIENTES → EN COCINA → LISTOS
   ============================================================
   ============================================================ */
const Comanda = {
  items: {},          // { itemId: {pedidoId, mesaNumero, nombre, estadoPrep, ...} }
  optimistas: {},     // { itemId: 'PREPARANDO' | 'LISTO' } — estados forzados localmente
  _ref: null,
  _tickInterval: null,
  _unsubConfig: null,
  _warnMin: 15,       // defaults por si Config aún no cargó
  _lateMin: 25,

async abrir() {
    showView('comanda');
    // Render inmediato + enganchar listener (no bloqueante)
    this.render();
    this.engancharRTDB();
    this.startTicker();
    // Fase 5 / Bloque G — leer umbrales del config + escuchar cambios en vivo
    this._aplicarConfig(await Config.get().catch(() => ({})));
    this._unsubConfig = Config.on((cfg) => this._aplicarConfig(cfg));
    // Sincronización del RTDB en background con throttle 30s
    this.sincronizarVistaBg();
  },

  _aplicarConfig(cfg) {
    this._warnMin = Number(cfg.COCINA_WARN_MIN) || 15;
    this._lateMin = Number(cfg.COCINA_LATE_MIN) || 25;
    // Repintar cronos si la vista está activa
    const view = $('#view-comanda');
    if (view && view.classList.contains('active')) this.tickCronos();
  },

async cargarInicial() {
    // Compat — abrir() ya orquesta todo en background.
    this.sincronizarVistaBg();
  },

  sincronizarVistaBg() {
    const KEY = 'rg.sync.cocina';
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30 * 1000) return;
    localStorage.setItem(KEY, String(Date.now()));
    apiPost('sincronizarVistaCocina', withUser({})).catch(e => {
      localStorage.removeItem(KEY);
      console.error('sincronizarVistaCocina:', e);
    });
  },

  async engancharRTDB() {
    if (this._ref) return;
    const fb = await getFirebase();
    if (!fb) return;
    this._ref = fb.database()
      .ref('/negocios/' + NEGOCIO_RESTAURANTE_ID + '/cocina/pendientes');
    this._ref.on('value', (snap) => {
      this.items = snap.val() || {};
      // Limpiar optimistas que ya se confirmaron en el snapshot
      Object.keys(this.optimistas).forEach(itemId => {
        const real = this.items[itemId];
        if (!real || String(real.estadoPrep).toUpperCase() === this.optimistas[itemId]) {
          delete this.optimistas[itemId];
        }
      });
      this.render();
    }, (err) => {
      console.error('RTDB listener cocina:', err);
    });
  },

  startTicker() {
    if (this._tickInterval) return;
    // Re-render cada segundo SOLO los cronómetros (sin reconstruir DOM completo)
    this._tickInterval = setInterval(() => this.tickCronos(), 1000);
  },

  stopTicker() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  },

  estadoEfectivo(itemId, item) {
    return this.optimistas[itemId] || String(item.estadoPrep || 'PENDIENTE').toUpperCase();
  },

  render() {
    const cont = $('#comanda-content');
    if (!cont) return;

    // Agrupar por estado efectivo
    const cols = { PENDIENTE: [], PREPARANDO: [], LISTO: [] };
    Object.entries(this.items).forEach(([id, it]) => {
      const est = this.estadoEfectivo(id, it);
      if (cols[est]) cols[est].push({ id, ...it });
    });

    // Ordenar por fechaPedido (más antiguo arriba)
    Object.keys(cols).forEach(k => {
      cols[k].sort((a, b) => String(a.fechaPedido).localeCompare(String(b.fechaPedido)));
    });

    const total = cols.PENDIENTE.length + cols.PREPARANDO.length + cols.LISTO.length;
    $('#comanda-subtitle').textContent = total
      ? `${total} ítem${total === 1 ? '' : 's'} en cocina`
      : 'Sin ítems en cocina';

    if (!total) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:32px;">
          <div style="font-size: 3rem; margin-bottom: 8px;">👨‍🍳</div>
          <h3>Todo al día</h3>
          <p class="muted">No hay platos pendientes en cocina.</p>
        </div>`;
      return;
    }

    cont.innerHTML = `
      <div class="kanban">
        ${this.renderColumna('PENDIENTE',  'Pendientes', cols.PENDIENTE)}
        ${this.renderColumna('PREPARANDO', 'En cocina',  cols.PREPARANDO)}
        ${this.renderColumna('LISTO',      'Listos',     cols.LISTO)}
      </div>
    `;

    // Bind acciones
    $$('[data-cmd-start]', cont).forEach(b => {
      b.addEventListener('click', () => this.cambiarEstado(b.dataset.cmdStart, 'PREPARANDO'));
    });
    $$('[data-cmd-ready]', cont).forEach(b => {
      b.addEventListener('click', () => this.cambiarEstado(b.dataset.cmdReady, 'LISTO'));
    });
    $$('[data-cmd-back]', cont).forEach(b => {
      b.addEventListener('click', () => this.cambiarEstado(b.dataset.cmdBack, 'PENDIENTE'));
    });
  },

  renderColumna(estado, titulo, items) {
    const cards = items.length
      ? items.map(it => this.renderTarjeta(it, estado)).join('')
      : `<div class="kanban-col__empty">—</div>`;
    return `
      <section class="kanban-col kanban-col--${estado.toLowerCase()}">
        <header class="kanban-col__head">
          <h3>${titulo}</h3>
          <span class="kanban-col__count">${items.length}</span>
        </header>
        <div class="kanban-col__body">${cards}</div>
      </section>
    `;
  },

  renderTarjeta(it, estado) {
    const mods = (it.modificadores || []).map(m =>
      `<li>${escapeHtml(m.nombreGrupo || m.grupo)}: <b>${escapeHtml(m.opcion)}</b></li>`
    ).join('');
    const desc = it.descripcion
      ? `<div class="cmd-card__desc ${it.requiereNota ? 'cmd-card__desc--destacada' : ''}">📝 ${escapeHtml(it.descripcion)}</div>`
      : '';
    const tmp = this.optimistas[it.id] ? 'is-tmp' : '';

    let acciones = '';
    if (estado === 'PENDIENTE') {
      acciones = `<button class="cmd-btn cmd-btn--ready" data-cmd-ready="${it.id}" title="Marcar listo directo">Listo</button>` +
                 `<button class="cmd-btn cmd-btn--start" data-cmd-start="${it.id}">Empezar</button>`;
    } else if (estado === 'PREPARANDO') {
      acciones = `
        <button class="cmd-btn cmd-btn--back"  data-cmd-back="${it.id}" title="Devolver a pendientes">↶</button>
        <button class="cmd-btn cmd-btn--ready" data-cmd-ready="${it.id}">Marcar listo</button>
      `;
    } else {
      acciones = `<button class="cmd-btn cmd-btn--back" data-cmd-start="${it.id}" title="Volver a cocina">↶ Volver</button>`;
    }

    return `
      <article class="cmd-card cmd-card--${estado.toLowerCase()} ${tmp}" data-cmd-id="${it.id}">
        <div class="cmd-card__head">
          <div class="cmd-card__mesa">Mesa <b>${it.mesaNumero || '?'}</b></div>
          <div class="cmd-card__crono" data-crono-from="${it.fechaPedido || ''}">—</div>
        </div>
        <div class="cmd-card__body">
          <div class="cmd-card__qty">${it.cantidad}×</div>
          <div class="cmd-card__name">${escapeHtml(it.nombre)}</div>
        </div>
        ${mods ? `<ul class="cmd-card__mods">${mods}</ul>` : ''}
        ${desc}
        <div class="cmd-card__foot">
          <span class="cmd-card__mesero">${escapeHtml(String(it.meseroNombre || '').split(' ')[0])}</span>
          <div class="cmd-card__actions">${acciones}</div>
        </div>
      </article>
    `;
  },

tickCronos() {
    const view = $('#view-comanda');
    if (!view || !view.classList.contains('active')) return;
    const now = Date.now();
    const warnMin = this._warnMin;
    const lateMin = this._lateMin;
    $$('[data-crono-from]', view).forEach(el => {
      const iso = el.dataset.cronoFrom;
      if (!iso) { el.textContent = '—'; return; }
      // "yyyy-MM-dd HH:mm:ss" en zona Bogotá, parseado como local porque
      // el equipo está en la misma zona física.
      const ts = Date.parse(iso.replace(' ', 'T'));
      if (isNaN(ts)) { el.textContent = '—'; return; }
      const secs = Math.max(0, Math.floor((now - ts) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      // Fase 5 / Bloque G — umbrales desde config
      el.classList.toggle('is-warn',  m >= warnMin && m < lateMin);
      el.classList.toggle('is-late',  m >= lateMin);
    });
  },

  async cambiarEstado(itemId, nuevoEstado) {
    const it = this.items[itemId];
    if (!it) return;
    // Optimista
    this.optimistas[itemId] = nuevoEstado;
    this.render();
    playSoundOnce(nuevoEstado === 'LISTO' ? SOUNDS.ok : SOUNDS.click);

    try {
      await apiPost('marcarPrep', withUser({ itemId, nuevoEstado }));
      // El listener RTDB confirmará y limpiará el optimista
    } catch (e) {
      delete this.optimistas[itemId];
      this.render();
      alertErr('Error', e.message);
    }
  },

desenganchar() {
    if (this._ref) {
      this._ref.off();
      this._ref = null;
    }
    this.stopTicker();
    if (this._unsubConfig) { this._unsubConfig(); this._unsubConfig = null; }
  },

  setupListeners() { /* nada por ahora */ }
};

/* ============================================================
   ============================================================
   FASE 3C — CAJA
   Lista en vivo de pedidos por cobrar + modal de cobro
   ============================================================
   ============================================================ */
const Caja = {
  pedidos: {},        // { pedidoId: {mesaNumero, total, ...} }
  config: { descuentoMaxPct: 10, propinaSugeridaPct: 10, warnMin: 3, lateMin: 7 },
  _ref: null,
  _tickInterval: null,
  _unsubConfig: null,

  async abrir() {
    showView('caja');
    // Fase 5 / Bloque G — leer del Config global (5 min TTL, broadcast RTDB)
    this._aplicarConfig(await Config.get().catch(() => ({})));
    this._unsubConfig = Config.on((cfg) => this._aplicarConfig(cfg));
    // Render inmediato + enganchar listener
    this.render();
    this.engancharRTDB();
    this.startTicker();
    // Background sync con throttle 30s
    this.sincronizarVistaBg();
  },

async cargarInicial() {
    // Compat — abrir() ya orquesta todo en background.
    this.sincronizarVistaBg();
  },

  _aplicarConfig(cfg) {
    this.config = {
      descuentoMaxPct:    Number(cfg.CAJA_DESCUENTO_MAX_PCT) || 10,
      propinaSugeridaPct: Number(cfg.PROPINA_SUGERIDA_PCT)   || 10,
      warnMin:            Number(cfg.CAJA_WARN_MIN)          || 3,
      lateMin:            Number(cfg.CAJA_LATE_MIN)          || 7
    };
    // Repintar cronos si la vista está activa
    const view = $('#view-caja');
    if (view && view.classList.contains('active')) this.tickEsperas();
  },

  sincronizarVistaBg() {
    const KEY = 'rg.sync.caja';
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30 * 1000) return;
    localStorage.setItem(KEY, String(Date.now()));
    apiPost('sincronizarVistaCaja', withUser({})).catch(e => {
      localStorage.removeItem(KEY);
      console.error('sincronizarVistaCaja:', e);
    });
  },

  async engancharRTDB() {
    if (this._ref) return;
    const fb = await getFirebase();
    if (!fb) return;
    this._ref = fb.database()
      .ref('/negocios/' + NEGOCIO_RESTAURANTE_ID + '/caja/porCobrar');
    this._ref.on('value', (snap) => {
      this.pedidos = snap.val() || {};
      // Fase 4 — si hay un modal de cobro abierto, NO re-renderizamos la
      // grilla detrás (rompería el modal de SweetAlert). Solo actualizamos
      // los datos en memoria; al cerrar el modal se vuelve a pintar.
      if (this._modalAbierto) return;
      this.render();
    }, (err) => {
      console.error('RTDB listener caja:', err);
    });
  },

  startTicker() {
    if (this._tickInterval) return;
    this._tickInterval = setInterval(() => this.tickEsperas(), 1000);
  },

desenganchar() {
    if (this._ref) { this._ref.off(); this._ref = null; }
    if (this._tickInterval) { clearInterval(this._tickInterval); this._tickInterval = null; }
    if (this._unsubConfig) { this._unsubConfig(); this._unsubConfig = null; }
  },

  render() {
    const cont = $('#caja-content');
    if (!cont) return;

    const list = Object.entries(this.pedidos)
      .map(([id, p]) => ({ id, ...p }))
      .filter(o => !(this._cobrando && this._cobrando[o.id]))
      .sort((a, b) => {
        // Primero los que pidieron cuenta, ordenados por fecha
        const aPide = a.pidiendoCuenta ? 0 : 1;
        const bPide = b.pidiendoCuenta ? 0 : 1;
        if (aPide !== bPide) return aPide - bPide;
        return String(a.pidiendoCuentaDesde || a.fechaApertura)
          .localeCompare(String(b.pidiendoCuentaDesde || b.fechaApertura));
      });

    const conCuenta = list.filter(p => p.pidiendoCuenta).length;
    $('#caja-subtitle').textContent = list.length
      ? `${list.length} pedido${list.length === 1 ? '' : 's'} por cobrar` +
        (conCuenta ? ` · ${conCuenta} pidiendo cuenta` : '')
      : 'Sin pedidos por cobrar';

    if (!list.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:32px;">
          <div style="font-size:3rem; margin-bottom:8px;">💵</div>
          <h3>Todo cobrado</h3>
          <p class="muted">No hay pedidos pendientes de pago.</p>
        </div>`;
      return;
    }

    cont.innerHTML = `<div class="caja-list">${list.map(p => this.renderTarjeta(p)).join('')}</div>`;

    $$('[data-cobrar]', cont).forEach(b => {
      b.addEventListener('click', () => this.abrirModalCobro(b.dataset.cobrar));
    });
  },

  renderTarjeta(p) {
    const pidiendo = p.pidiendoCuenta;
    const cls = pidiendo ? 'caja-card--alerta' : '';
    const espera = pidiendo && p.pidiendoCuentaDesde
      ? `<div class="caja-card__espera" data-espera-from="${p.pidiendoCuentaDesde}">—</div>`
      : '';
    const cliente = p.clienteNombre
      ? `<div class="caja-card__cliente">${escapeHtml(p.clienteNombre)}</div>`
      : '';
    return `
      <article class="caja-card ${cls}">
        ${pidiendo ? '<span class="caja-card__badge">💰 Pide cuenta</span>' : ''}
        <div class="caja-card__head">
          <div class="caja-card__mesa">Mesa <b>${p.mesaNumero || '?'}</b></div>
          ${espera}
        </div>
        <div class="caja-card__body">
          <div class="caja-card__mesero">Mesero: <b>${escapeHtml(String(p.meseroNombre || '').split(' ')[0])}</b></div>
          ${cliente}
        </div>
        <div class="caja-card__foot">
          <div class="caja-card__total">
            <span class="caja-card__total-lbl">Total</span>
            <span class="caja-card__total-val">${fmtPesos(p.total)}</span>
          </div>
          <button class="btn btn-success" data-cobrar="${p.id}">
            Cobrar
          </button>
        </div>
      </article>
    `;
  },

tickEsperas() {
    const view = $('#view-caja');
    if (!view || !view.classList.contains('active')) return;
    const now = Date.now();
    const warnMin = this.config.warnMin;
    const lateMin = this.config.lateMin;
    $$('[data-espera-from]', view).forEach(el => {
      const iso = el.dataset.esperaFrom;
      const ts = Date.parse(iso.replace(' ', 'T'));
      if (isNaN(ts)) { el.textContent = '—'; return; }
      const secs = Math.max(0, Math.floor((now - ts) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = '⏱ ' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      el.classList.toggle('is-warn', m >= warnMin && m < lateMin);
      el.classList.toggle('is-late', m >= lateMin);
    });
  },

  /* ────────────────────────────────────────────
     MODAL DE COBRO
     ──────────────────────────────────────────── */
  async abrirModalCobro(pedidoId) {
    const p = this.pedidos[pedidoId];
    if (!p) return;
     
// Estado interno del modal
    const propinaPct = this.config.propinaSugeridaPct;
    const subtotalNum = Number(p.subtotal) || 0;
    const totalNum    = Number(p.total)    || 0;
    const st = {
      pedidoId,
      subtotal:       subtotalNum,
      descuentoPct:   0,
      descuentoValor: 0,
      total:          totalNum,
      metodo:         'EFECTIVO',
      montoEfectivo:  0,
      montoTransfer:  0,
      comprobanteB64: null,
      comprobanteFn:  null,
      // Fase 4 — cliente
      esGenerico:        true,
      clienteNombre:     '',
      clienteTelefono:   '',
      clienteIdExistente: null,
      // Fase 4 — ticket bajo demanda
      ticketUrl:         null,
      ticketGenerando:   false,
    // Fase 5 / Bloque G — propina sugerida (informativa, no se cobra)
      propinaSugeridaPct: propinaPct,
      propinaSugerida:    Math.round(totalNum * propinaPct / 100),
     // Cambio 2 — propina opcional (check) + observación
      propinaIncluida:    false,
      // Ajuste 3 — valor editable de la propina (arranca en la sugerida)
      propinaValor:       Math.round(totalNum * propinaPct / 100),
      propinaTocada:      false,   // true si el cajero editó el monto a mano
      observaciones:      ''
    };
    st.descuentoMaxPct = this.config.descuentoMaxPct;

    const self = this;
    this._modalAbierto = true;
    Swal.fire({
      title: `Cobrar mesa ${p.mesaNumero}`,
      width: 560,
      html: this.htmlModalCobro(p, st),
      showCancelButton: true,
      confirmButtonText: 'Cobrar y cerrar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => self.bindModalCobro(p, st),
      preConfirm: () => self.validarCobro(p, st)
    }).then((res) => {
      self._modalAbierto = false;
      if (!res.isConfirmed) { self.render(); return; }
      // Optimista: ejecutarCobro quita la tarjeta YA y hace el POST en background.
      self.ejecutarCobro(p, st, res.value);
    });
  },

htmlModalCobro(p, st) {
    return `
      <div class="cobro">

        <!-- Fase 4 — Cliente -->
        <div class="cobro__cliente">
          <label class="cobro__toggle">
            <input type="checkbox" id="cb-generico" checked />
            <span class="cobro__toggle-lbl">👤 Cliente general (sin identificar)</span>
          </label>
          <div id="cb-cliente-fields" class="cobro__cliente-fields hidden">
            <label>Nombre</label>
            <input type="text" id="cb-cli-nombre" placeholder="Nombre del cliente" autocomplete="off" />
            <label>WhatsApp (10 dígitos, debe iniciar en 3)</label>
            <div class="cobro__tel-row">
              <input type="tel" id="cb-cli-tel" maxlength="10" inputmode="numeric"
                     placeholder="3001234567" autocomplete="off" />
              <span id="cb-cli-status" class="cobro__cli-status"></span>
            </div>
            <p class="muted" style="font-size:0.74rem; margin-top:4px;">
              📱 Se enviará el resumen por WhatsApp al cerrar la cuenta.
            </p>
            <button type="button" id="cb-btn-ticket" class="btn-ticket-pdf" disabled>
              🧾 Generar ticket PDF
            </button>
            <p class="muted" id="cb-ticket-hint" style="font-size:0.72rem; margin-top:4px;">
              Opcional. Si lo generas, se incluirá el link en el WhatsApp.
            </p>
          </div>
        </div>

        <div class="cobro__totales">
          <div class="cobro__row">
            <span>Subtotal</span>
            <span id="cb-subtotal">${fmtPesos(st.subtotal)}</span>
          </div>
          <div class="cobro__row cobro__row--desc">
            <label for="cb-desc">Descuento %</label>
            <input type="number" id="cb-desc" min="0" max="${st.descuentoMaxPct}" step="1" value="0" />
            <span id="cb-desc-val">$ 0</span>
          </div>
         <div class="cobro__row cobro__row--total">
          <span>TOTAL</span>
          <span id="cb-total">${fmtPesos(st.total)}</span>
        </div>
       <label class="cobro__propina-toggle" id="cb-propina-hint">
          <input type="checkbox" id="cb-propina-chk" />
          <span>💡 Incluir propina sugerida (${st.propinaSugeridaPct}%):
            <b id="cb-propina-val">${fmtPesos(st.propinaSugerida)}</b></span>
        </label>
        <div class="cobro__row cobro__row--virtual hidden" id="cb-virtual-row">
          <span>TOTAL CON PROPINA</span>
          <span id="cb-total-virtual">${fmtPesos(st.total + st.propinaSugerida)}</span>
        </div>
      </div>

      <div id="cb-propina-input-row" class="cobro__propina-input hidden">
        <label>Valor de la propina (editable)</label>
        <input type="number" id="cb-propina-monto" min="0" step="500"
               value="${st.propinaSugerida}" inputmode="numeric" />
      </div>

      <label>Método de pago</label>
        <div class="cobro__metodos">
          <button type="button" class="cobro__metodo is-active" data-metodo="EFECTIVO">
            💵 Efectivo
          </button>
          <button type="button" class="cobro__metodo" data-metodo="TRANSFERENCIA">
            📱 Transferencia
          </button>
          <button type="button" class="cobro__metodo" data-metodo="MIXTO">
            🔀 Mixto
          </button>
        </div>

        <div id="cb-mixto-row" class="hidden">
          <label>Efectivo</label>
          <input type="number" id="cb-monto-ef" min="0" step="100" placeholder="0" />
          <label>Transferencia</label>
          <input type="number" id="cb-monto-tr" min="0" step="100" placeholder="0" />
        </div>

        <div id="cb-comprobante-row" class="hidden">
          <label>Comprobante de transferencia</label>
          <label class="cobro__file-btn">
            <span id="cb-file-name">📎 Adjuntar imagen</span>
            <input type="file" id="cb-comprobante" accept="image/*" hidden />
          </label>
        </div>

        <label>Observación (opcional)</label>
        <textarea id="cb-obs" rows="2" placeholder="Notas del cobro (opcional)…">${escapeHtml(st.observaciones || '')}</textarea>
      </div>
    `;
  },

bindModalCobro(p, st) {
    const self = this;
    const upd = () => {
      $('#cb-subtotal').textContent  = fmtPesos(st.subtotal);
      $('#cb-desc-val').textContent  = '-' + fmtPesos(st.descuentoValor);
      $('#cb-total').textContent     = fmtPesos(st.total);
    };

    // Fase 4 — habilita/deshabilita botón "Generar ticket PDF" según el estado
    const updTicketBtn = () => {
      const btn  = $('#cb-btn-ticket');
      const hint = $('#cb-ticket-hint');
      if (!btn) return;
      if (st.ticketUrl) {
        btn.textContent = '✓ Ticket creado';
        btn.disabled = true;
        btn.classList.add('is-done');
        if (hint) hint.textContent = 'Se enviará el link al cerrar la cuenta.';
        return;
      }
      if (st.ticketGenerando) {
        btn.textContent = '⏳ Generando…';
        btn.disabled = true;
        return;
      }
      btn.textContent = '🧾 Generar ticket PDF';
      btn.classList.remove('is-done');
      const nombreOk = (st.clienteNombre || '').trim().length > 0;
      const telOk    = /^3\d{9}$/.test(st.clienteTelefono || '');
      btn.disabled = st.esGenerico || !nombreOk || !telOk;
      if (hint) {
        hint.textContent = st.esGenerico
          ? 'Solo disponible para clientes identificados.'
          : 'Opcional. Si lo generas, se incluirá el link en el WhatsApp.';
      }
    };

    // Click del botón
    $('#cb-btn-ticket').addEventListener('click', () => self.crearTicket(p, st, updTicketBtn));

    // Fase 4 — Toggle Cliente general
    const chkGen      = $('#cb-generico');
    const fieldsCli   = $('#cb-cliente-fields');
    const inpNombre   = $('#cb-cli-nombre');
    const inpTel      = $('#cb-cli-tel');
    const statusCli   = $('#cb-cli-status');

    chkGen.addEventListener('change', () => {
      st.esGenerico = chkGen.checked;
      fieldsCli.classList.toggle('hidden', st.esGenerico);
      if (st.esGenerico) {
        st.clienteNombre = '';
        st.clienteTelefono = '';
        st.clienteIdExistente = null;
        // Fase 4 — si había ticket creado, se invalida al volver a genérico
        st.ticketUrl = null;
        statusCli.textContent = '';
        statusCli.className = 'cobro__cli-status';
        inpNombre.value = '';
        inpTel.value = '';
      }
      updTicketBtn();
    });

    inpNombre.addEventListener('input', () => {
      st.clienteNombre = inpNombre.value.trim();
      updTicketBtn();
    });

    // Lookup por teléfono con debounce
    let lookupT = null;
    inpTel.addEventListener('input', () => {
      // Solo permitir dígitos
      const v = inpTel.value.replace(/\D/g, '').substring(0, 10);
      if (v !== inpTel.value) inpTel.value = v;
      st.clienteTelefono = v;
      st.clienteIdExistente = null;
      // Fase 4 — si había ticket y se cambia el teléfono, invalidar
      if (st.ticketUrl) st.ticketUrl = null;
      updTicketBtn();

      // Estado visual del campo
      if (v.length === 0) {
        statusCli.textContent = '';
        statusCli.className = 'cobro__cli-status';
      } else if (!/^3\d{0,9}$/.test(v)) {
        statusCli.textContent = '⚠️';
        statusCli.className = 'cobro__cli-status is-err';
      } else if (v.length < 10) {
        statusCli.textContent = '...';
        statusCli.className = 'cobro__cli-status is-loading';
      }

      clearTimeout(lookupT);
      if (v.length !== 10 || !/^3\d{9}$/.test(v)) return;

      lookupT = setTimeout(async () => {
        statusCli.textContent = '🔎';
        statusCli.className = 'cobro__cli-status is-loading';
        try {
          const r = await apiGet('buscarCliente', { telefono: v });
         if (r && r.encontrado) {
            st.clienteIdExistente = r.id;
            if (!inpNombre.value.trim()) {
              inpNombre.value = r.nombre;
              st.clienteNombre = r.nombre;
            }
            statusCli.textContent = '✓';
            statusCli.className = 'cobro__cli-status is-ok';
            updTicketBtn();   // Cambio 2 — habilita "Generar ticket" para cliente existente
          } else {
            statusCli.textContent = '+';
            statusCli.className = 'cobro__cli-status is-new';
            statusCli.title = 'Cliente nuevo';
          }
        } catch (e) {
          statusCli.textContent = '⚠';
          statusCli.className = 'cobro__cli-status is-err';
        }
      }, 400);
    });

    // Descuento
    $('#cb-desc').addEventListener('input', (e) => {
      let pct = Number(e.target.value) || 0;
      if (pct < 0) pct = 0;
      const tope = st.descuentoMaxPct;
      const esSuperAdmin = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
      if (!esSuperAdmin && pct > tope) {
        pct = tope;
        e.target.value = pct;
        Toast && Toast.fire({ icon: 'warning', title: `Máximo ${tope}%` });
      }
 st.descuentoPct   = pct;
      st.descuentoValor = Math.round(st.subtotal * pct / 100);
      st.total          = st.subtotal - st.descuentoValor;
     // Fase 5 / Bloque G — recalcular propina sugerida sobre el nuevo total
      st.propinaSugerida = Math.round(st.total * st.propinaSugeridaPct / 100);
      const propVal = $('#cb-propina-val');
      if (propVal) propVal.textContent = fmtPesos(st.propinaSugerida);
      // Ajuste 3 — re-sincronizar la propina/virtual con el nuevo total
      if (typeof self._reSyncPropina === 'function') self._reSyncPropina();
      upd();
    });

    // Botones de método
    $$('.cobro__metodo').forEach(b => {
      b.addEventListener('click', () => {
        $$('.cobro__metodo').forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
        st.metodo = b.dataset.metodo;
        $('#cb-mixto-row').classList.toggle('hidden', st.metodo !== 'MIXTO');
        $('#cb-comprobante-row').classList.toggle('hidden',
          st.metodo !== 'TRANSFERENCIA' && st.metodo !== 'MIXTO');
      });
    });

  // Comprobante
    $('#cb-comprobante').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        alertWarn('Imagen muy grande', 'Máximo 4 MB.');
        e.target.value = '';
        return;
      }
      try {
        st.comprobanteB64 = await fileToBase64(file);
        st.comprobanteFn  = file.name;
        $('#cb-file-name').textContent = '✓ ' + file.name;
      } catch (err) { alertErr('Error', err.message); }
    });

// Ajuste 3 — Propina: check + total virtual + monto editable.
    // La propina NO se suma al total real; solo se muestra el "virtual"
    // (total + propina) para que caja le diga al cliente cuánto pagaría
    // con propina. Lo que se cobra/guarda como TOTAL sigue siendo el real.
    const chkProp   = $('#cb-propina-chk');
    const virtRow   = $('#cb-virtual-row');
    const virtVal   = $('#cb-total-virtual');
    const propRow   = $('#cb-propina-input-row');
    const propMonto = $('#cb-propina-monto');

    const repintarVirtual = () => {
      if (virtVal) virtVal.textContent = fmtPesos(st.total + (Number(st.propinaValor) || 0));
    };
    // Expuesto para que el handler de descuento lo reutilice
    self._reSyncPropina = () => {
      if (!st.propinaTocada) {
        st.propinaValor = st.propinaSugerida;
        if (propMonto) propMonto.value = st.propinaSugerida;
      }
      repintarVirtual();
    };

    if (chkProp) {
      chkProp.addEventListener('change', () => {
        st.propinaIncluida = chkProp.checked;
        virtRow && virtRow.classList.toggle('hidden', !chkProp.checked);
        propRow && propRow.classList.toggle('hidden', !chkProp.checked);
        if (chkProp.checked) {
          // Al activar, si no la han tocado, parte de la sugerida
          if (!st.propinaTocada) {
            st.propinaValor = st.propinaSugerida;
            if (propMonto) propMonto.value = st.propinaSugerida;
          }
          repintarVirtual();
        }
      });
    }
    if (propMonto) {
      propMonto.addEventListener('input', () => {
        const v = Math.max(0, Number(propMonto.value) || 0);
        st.propinaValor  = v;
        st.propinaTocada = true;
        repintarVirtual();
      });
    }

    // Cambio 2 — Observación opcional
    const obsEl = $('#cb-obs');
    if (obsEl) {
      obsEl.addEventListener('input', () => { st.observaciones = obsEl.value.trim(); });
    }

    // Fase 4 — pintar estado inicial del botón de ticket
    updTicketBtn();
  },

 validarCobro(p, st) {
    const tope = st.descuentoMaxPct;
    const esSuperAdmin = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
    if (!esSuperAdmin && st.descuentoPct > tope) {
      Swal.showValidationMessage(`Descuento máximo ${tope}%`);
      return false;
    }
    // Fase 4 — validar cliente si NO es genérico
    if (!st.esGenerico) {
      const nombre = (st.clienteNombre || '').trim();
      const tel    = (st.clienteTelefono || '').trim();
      if (!nombre) {
        Swal.showValidationMessage('Ingresa el nombre del cliente');
        return false;
      }
      if (!/^3\d{9}$/.test(tel)) {
        Swal.showValidationMessage('WhatsApp debe ser un celular válido (10 dígitos, inicia en 3)');
        return false;
      }
    }
    let pagos = [];
    if (st.metodo === 'EFECTIVO') {
      pagos.push({ metodo: 'EFECTIVO', valor: st.total });
    } else if (st.metodo === 'TRANSFERENCIA') {
      if (!st.comprobanteB64) {
        Swal.showValidationMessage('Sube el comprobante de transferencia');
        return false;
      }
      pagos.push({ metodo: 'TRANSFERENCIA', valor: st.total, comprobanteUrl: null });
    } else if (st.metodo === 'MIXTO') {
      const ef = Number($('#cb-monto-ef').value) || 0;
      const tr = Number($('#cb-monto-tr').value) || 0;
      if (ef <= 0 || tr <= 0) {
        Swal.showValidationMessage('Ambos montos deben ser mayores a 0');
        return false;
      }
      if (Math.abs(ef + tr - st.total) > 1) {
        Swal.showValidationMessage(`La suma (${fmtPesos(ef + tr)}) no coincide con el total (${fmtPesos(st.total)})`);
        return false;
      }
      if (!st.comprobanteB64) {
        Swal.showValidationMessage('Sube el comprobante de transferencia');
        return false;
      }
      pagos.push({ metodo: 'EFECTIVO',      valor: ef });
      pagos.push({ metodo: 'TRANSFERENCIA', valor: tr, comprobanteUrl: null });
    }
   return {
      pagos,
      descuentoPct:   st.descuentoPct,
      descuentoValor: st.descuentoValor,
      total:          st.total,
      comprobanteB64: st.comprobanteB64,
      comprobanteFn:  st.comprobanteFn,
      // Fase 4 — cliente
      esGenerico:       st.esGenerico,
      clienteNombre:    st.clienteNombre,
      clienteTelefono:  st.clienteTelefono,
      // Ajuste 3 — propina editable (solo si el check está activo) + observación
      propina:          st.propinaIncluida ? Math.max(0, Number(st.propinaValor) || 0) : 0,
      observaciones:    st.observaciones || ''
    };
  },

 async ejecutarCobro(p, st, datos) {
    const pedidoId = st.pedidoId;
    // Optimista: marcar "cobrando" y sacar la tarjeta de la grilla de inmediato.
    this._cobrando = this._cobrando || {};
    this._cobrando[pedidoId] = true;
    const snapshot = this.pedidos[pedidoId];   // por si hay que revertir
    this.render();
    playSoundOnce(SOUNDS.caja);

    try {
      // 1. Comprobante primero (necesitamos la URL antes de cobrar)
      let comprobanteUrl = null;
      if (datos.comprobanteB64) {
        const up = await apiPost('subirComprobante', withUser({
          pedidoId:  pedidoId,
          filename:  datos.comprobanteFn,
          base64:    datos.comprobanteB64
        }));
        comprobanteUrl = up.url || up.URL || null;
        datos.pagos.forEach(pg => {
          if (pg.metodo === 'TRANSFERENCIA') pg.comprobanteUrl = comprobanteUrl;
        });
      }

      // 2. Cobrar — asigna cliente, propina y observación en UNA sola llamada
      await apiPost('cobrarPedido', withUser({
        pedidoId:       pedidoId,
        descuentoPct:   datos.descuentoPct,
        descuentoValor: datos.descuentoValor,
        total:          datos.total,
        pagos:          datos.pagos,
        propina:        datos.propina,
        observaciones:  datos.observaciones,
        // cliente en la misma llamada (el backend lo asigna antes de cobrar)
        esGenerico:     !!datos.esGenerico,
        cliente:        datos.esGenerico ? null : {
          nombre:   datos.clienteNombre,
          telefono: datos.clienteTelefono
        }
      }));

      // OK — el listener RTDB ya quitó el nodo; soltamos el flag.
      delete this._cobrando[pedidoId];
    } catch (e) {
      // Revertir: devolver la tarjeta a la grilla
      delete this._cobrando[pedidoId];
      if (snapshot) this.pedidos[pedidoId] = snapshot;
      this.render();
      alertErr('Error al cobrar', e.message);
    }
  },

  /* ────────────────────────────────────────────
     FASE 4 — Generar ticket PDF bajo demanda
     ──────────────────────────────────────────── */
 async crearTicket(p, st, refresh) {
    // Validaciones SIN alertWarn (alertWarn dispara Swal.fire y cierra el modal de cobro)
    const nombre = (st.clienteNombre || '').trim();
    const tel    = (st.clienteTelefono || '').trim();
    if (st.esGenerico) return;
    if (!nombre || !/^3\d{9}$/.test(tel)) {
      Toast && Toast.fire({ icon: 'warning', title: 'Datos del cliente incompletos' });
      return;
    }

    st.ticketGenerando = true;
    refresh();

    try {
      // 1. Asignar cliente al pedido (mismo flujo que ejecutarCobro)
      await apiPost('asignarClientePedido', withUser({
        pedidoId:   st.pedidoId,
        esGenerico: false,
        cliente:    { nombre, telefono: tel }
      }));

      // 2. Generar el PDF — SIN swallow, el error sube si falla
      const r = await apiPost('generarTicket', withUser({ pedidoId: st.pedidoId }));
      st.ticketUrl = r.ticketUrl;
      st.ticketGenerando = false;
      refresh();

   playSoundOnce(SOUNDS.ok);
      // Banner inline DENTRO del modal — no usar Toast/Swal porque cierran el modal padre
      this._mostrarBannerTicket('ok', 'Ticket creado · Se enviará al cobrar');
    } catch (e) {
      st.ticketGenerando = false;
      refresh();
// Banner inline DENTRO del modal — no usar Toast/Swal porque cierran el modal padre
      this._mostrarBannerTicket('err', 'No se pudo crear: ' + e.message);
    }
  },

  /**
   * FASE 4 — Banner de feedback DENTRO del modal de cobro.
   * No usa Swal/Toast porque SweetAlert v11 solo permite un popup activo,
   * y abrir un Toast cerraría el modal padre. Esto es un div inyectado en
   * el cuerpo del modal que se autoelimina a los 2.4s.
   */
  _mostrarBannerTicket(tipo, mensaje) {
    const cont = document.querySelector('.swal2-html-container .cobro');
    if (!cont) return;
    // Quitar banner previo si existe
    const prev = cont.querySelector('.cobro__banner-ticket');
    if (prev) prev.remove();
    // Crear nuevo banner
    const banner = document.createElement('div');
    banner.className = 'cobro__banner-ticket cobro__banner-ticket--' + tipo;
    banner.innerHTML = (tipo === 'ok' ? '✓ ' : '⚠ ') + escapeHtml(mensaje);
    cont.insertBefore(banner, cont.firstChild);
    // Autoeliminar tras 2.4s con fade
    setTimeout(() => {
      banner.classList.add('is-fading');
      setTimeout(() => banner.remove(), 300);
    }, 2400);
  },

  setupListeners() { /* nada por ahora */ }
};

/* ============================================================
   ============================================================
   FASE 5 / BLOQUE B — ANCLAJE DEL DÍA
   Pantalla del cierre diario: resumen en vivo, declaración
   de caja, anclaje + histórico. Auto-refresh cada 30s.
   ============================================================
   ============================================================ */
const Anclaje = {
  preview: null,
  historico: [],
  cargandoHistorico: false,
  _refreshInterval: null,
  _fechaInicial: null,

  async abrir() {
    showView('anclaje');
    this._fechaInicial = this.fechaYyyyMmDdLocal();
    this.renderHero();
    this.pintarLoading();
    await Promise.all([this.cargarPreview(), this.cargarHistorico()]);
    this.render();
    this.startAutoRefresh();
  },

  fechaYyyyMmDdLocal() {
    const d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  },

  async cargarPreview() {
    try { this.preview = await apiGet('previewAnclaje'); }
    catch (e) { console.error('previewAnclaje:', e); this.preview = null; }
  },

  async cargarHistorico() {
    if (this.cargandoHistorico) return;
    this.cargandoHistorico = true;
    try { this.historico = await apiGet('listAnclajes', { limit: 30 }); }
    catch (e) { console.error('listAnclajes:', e); this.historico = []; }
    finally { this.cargandoHistorico = false; }
  },

  pintarLoading() {
    const cont = $('#anc-content');
    if (cont) cont.innerHTML = `
      <div class="anc-loading">
        <div class="spinner">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p class="muted">Cargando datos del día…</p>
      </div>`;
    const foot = $('#anc-footer');
    if (foot) foot.classList.add('hidden');
  },

  renderHero() {
    const hoy = new Date();
    let fechaStr = hoy.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
    const hero = $('#anc-hero');
    if (hero) hero.innerHTML = `
      <div class="anc-hero__label">Corte del día</div>
      <h2 class="anc-hero__fecha">${escapeHtml(fechaStr)}</h2>
      <p class="anc-hero__sub muted">Corte automático programado para las <b>10:00 PM</b> si no anclas antes.</p>
    `;
  },

  render() {
    this.renderHero();
    if (!this.preview) {
      const cont = $('#anc-content');
      if (cont) cont.innerHTML = `
        <div class="card text-center" style="margin-top:16px;">
          <div style="font-size:2.4rem; opacity:0.4;">⚠️</div>
          <h3>Error al cargar</h3>
          <p class="muted">No pudimos obtener los datos del día. Revisa tu conexión.</p>
          <button class="btn btn-ghost mt-md" id="anc-btn-retry">Reintentar</button>
        </div>`;
      $('#anc-btn-retry')?.addEventListener('click', () => this.abrir());
      $('#anc-footer')?.classList.add('hidden');
      return;
    }
    if (this.preview.yaAnclado)              this.renderEstadoAnclado();
    else if (this.preview.pedidosAbiertos.length) this.renderEstadoBloqueado();
    else                                     this.renderEstadoLimpio();
    this.renderHistorico();
  },

  renderEstadoLimpio() {
    const p = this.preview;
    const cont = $('#anc-content');
    cont.innerHTML = `
      <div class="anc-card anc-card--resumen">
        <h3 class="anc-card__title">Resumen del día</h3>
        <div class="anc-row">
          <span class="anc-row__lbl">Pedidos cobrados</span>
          <span class="anc-row__val">${p.cantPedidos}</span>
        </div>
        <div class="anc-row">
          <span class="anc-row__lbl">Total ventas</span>
          <span class="anc-row__val">${fmtPesos(p.totalVentas)}</span>
        </div>
        ${p.totalDescuentos > 0 ? `
          <div class="anc-row anc-row--desc">
            <span class="anc-row__lbl">Descuentos</span>
            <span class="anc-row__val">-${fmtPesos(p.totalDescuentos)}</span>
          </div>` : ''}
        <div class="anc-row anc-row--total">
          <span class="anc-row__lbl">Total neto</span>
          <span class="anc-row__val">${fmtPesos(p.totalNeto)}</span>
        </div>
        ${(p.propinaSistema || 0) > 0 ? `
        <div class="anc-row">
          <span class="anc-row__lbl">🎁 Propinas (informativo)</span>
          <span class="anc-row__val">${fmtPesos(p.propinaSistema)}</span>
        </div>` : ''}
      </div>

      <div class="anc-card">
        <h3 class="anc-card__title">Pagos del día — Sistema vs Declarado</h3>
        ${this.renderBloquePago('Efectivo', '💵', 'ef', p.efectivoSistema)}
        ${this.renderBloquePago('Transferencia', '📱', 'tr', p.transferSistema)}
        <label for="anc-obs">Observación (opcional)</label>
        <textarea id="anc-obs" maxlength="500"
                  placeholder="Notas, novedades, justificación de diferencias…"></textarea>
        <div class="anc-obs__counter"><span id="anc-obs-count">0</span> / 500</div>
      </div>

      ${(p.top3Productos || []).length ? `
        <div class="anc-card">
          <h3 class="anc-card__title">Top 3 productos del día</h3>
          <ol class="anc-top3">
            ${p.top3Productos.map((tp, i) => `
              <li class="anc-top3__item">
                <span class="anc-top3__rank">${i + 1}</span>
                <span class="anc-top3__name">${escapeHtml(tp.nombre)}</span>
                <span class="anc-top3__qty">${tp.cantidad}</span>
              </li>
            `).join('')}
          </ol>
        </div>` : ''}

      ${(p.propinasMeseros || []).length ? `
        <div class="anc-card">
          <h3 class="anc-card__title">🎁 Propinas por mesero</h3>
          <ul class="anc-prop-list">
            ${p.propinasMeseros.map(m => `
              <li class="anc-prop-row">
                <span class="anc-prop-row__name">${escapeHtml(String(m.nombre).split(' ').slice(0, 2).join(' '))}</span>
                <span class="anc-prop-row__val">${fmtPesos(m.propinas)}</span>
              </li>
            `).join('')}
            <li class="anc-prop-row anc-prop-row--total">
              <span class="anc-prop-row__name">Total propinas</span>
              <span class="anc-prop-row__val">${fmtPesos((p.propinaSistema || 0))}</span>
            </li>
          </ul>
        </div>` : ''}
    `;

    const inpEf = $('#anc-ef');
    const inpTr = $('#anc-tr');
    const recalc = () => {
      const ef = Number(inpEf.value) || 0;
      const tr = Number(inpTr.value) || 0;
      this.pintarDiferencia('#anc-dif-ef', ef - p.efectivoSistema, p.efectivoSistema);
      this.pintarDiferencia('#anc-dif-tr', tr - p.transferSistema, p.transferSistema);
    };
    inpEf.addEventListener('input', recalc);
    inpTr.addEventListener('input', recalc);
    recalc();

    const obs = $('#anc-obs');
    const cnt = $('#anc-obs-count');
    obs.addEventListener('input', () => { cnt.textContent = obs.value.length; });

    const foot = $('#anc-footer');
    foot.classList.remove('hidden');
    foot.innerHTML = `<button class="btn btn-success btn-lg btn-block" id="anc-btn-anclar">🌙 Anclar día</button>`;
    $('#anc-btn-anclar').addEventListener('click', () => this.confirmarYAnclar());
  },

  renderBloquePago(titulo, icono, key, sistema) {
    return `
      <div class="anc-pago">
        <div class="anc-pago__head">
          <span class="anc-pago__icon">${icono}</span>
          <span class="anc-pago__title">${titulo}</span>
        </div>
        <div class="anc-pago__body">
          <div class="anc-pago__sis">
            <span class="anc-pago__sublbl">Sistema</span>
            <span class="anc-pago__sisval">${fmtPesos(sistema)}</span>
          </div>
          <div class="anc-pago__dec">
            <label for="anc-${key}">Declarado</label>
            <input id="anc-${key}" type="number" min="0" step="1000" placeholder="0" inputmode="numeric" />
          </div>
          <div class="anc-pago__dif" id="anc-dif-${key}">
            <span class="anc-pago__sublbl">Diferencia</span>
            <span class="anc-pago__difval">$ 0</span>
          </div>
        </div>
      </div>
    `;
  },

  pintarDiferencia(sel, dif, sistema) {
    const cont = $(sel);
    if (!cont) return;
    const val = cont.querySelector('.anc-pago__difval');
    const abs = Math.abs(dif);
    let cls = 'anc-pago__difval--ok';
    if (abs > 0) {
      const tope = (sistema || 0) * 0.05;
      cls = abs > tope ? 'anc-pago__difval--err' : 'anc-pago__difval--warn';
    }
    val.className = 'anc-pago__difval ' + cls;
    val.textContent = (dif > 0 ? '+' : dif < 0 ? '-' : '') + fmtPesos(abs);
  },

  renderEstadoBloqueado() {
    const p = this.preview;
    const cont = $('#anc-content');
    const items = p.pedidosAbiertos.map(pe => `
      <li class="anc-pendiente">
        <span class="anc-pendiente__mesa">Mesa ${pe.mesaNumero}</span>
        <span class="anc-pendiente__mesero">${escapeHtml(String(pe.meseroNombre || '?').split(' ')[0])}</span>
        <span class="anc-pendiente__total">${fmtPesos(pe.total)}</span>
      </li>`).join('');
    cont.innerHTML = `
      <div class="anc-card anc-card--warn">
        <div class="anc-warn__icon">⚠️</div>
        <h3>${p.pedidosAbiertos.length} pedido(s) abierto(s)</h3>
        <p>Cierra y cobra todos los pedidos antes de anclar el día.</p>
        <ul class="anc-pendientes">${items}</ul>
        <button class="btn btn-ghost btn-block" id="anc-btn-refresh">🔄 Refrescar</button>
      </div>`;
    $('#anc-btn-refresh').addEventListener('click', () => this.refrescar(false));
    $('#anc-footer').classList.add('hidden');
  },

  renderEstadoAnclado() {
    const anc = this.preview.anclajePrevio;
    const cont = $('#anc-content');
    cont.innerHTML = `
      <div class="anc-card anc-card--ok">
        <div class="anc-ok__icon">✓</div>
        <h3>Día anclado</h3>
        <p class="anc-ok__sub">
          ${escapeHtml(anc.fechaCorte)}<br>
          por <b>${escapeHtml(anc.usuarioNombre)}</b> · ${escapeHtml(anc.rol)} · ${escapeHtml(anc.modo)}
        </p>
        <button class="btn btn-ghost mt-md" id="anc-btn-ver-detalle">Ver detalle del anclaje</button>
      </div>`;
    $('#anc-btn-ver-detalle').addEventListener('click', () => this.abrirDetalleAnclaje(anc.id));
    $('#anc-footer').classList.add('hidden');
  },

  renderHistorico() {
    const cont = $('#anc-historico');
    if (!cont) return;
    if (!this.historico.length) {
      cont.innerHTML = `
        <div class="anc-card">
          <h3 class="anc-card__title">Histórico</h3>
          <p class="muted text-center" style="margin-top:8px;">Aún no hay anclajes registrados.</p>
        </div>`;
      return;
    }
    cont.innerHTML = `
      <div class="anc-card">
        <h3 class="anc-card__title">Histórico (${this.historico.length})</h3>
        <ul class="anc-hist-list">
          ${this.historico.map(a => `
            <li class="anc-hist-row" data-anc-hist="${a.id}">
              <div class="anc-hist-row__head">
                <span class="anc-hist-row__fecha">${escapeHtml(a.fechaCorte)}</span>
                <span class="anc-hist-row__modo anc-hist-row__modo--${String(a.modo).toLowerCase()}">${escapeHtml(a.modo)}</span>
              </div>
              <div class="anc-hist-row__body">
                <span class="anc-hist-row__user">${escapeHtml(String(a.usuarioNombre || '').split(' ')[0])}</span>
                <span class="anc-hist-row__total">${fmtPesos(a.totalNeto)}</span>
                <span class="anc-hist-row__peds">${a.cantPedidos} ped.</span>
              </div>
              ${(a.difEfectivo !== 0 || a.difTransfer !== 0) ? `
                <div class="anc-hist-row__difs">
                  ${a.difEfectivo !== 0 ? `<span class="anc-hist-row__dif">Ef: ${a.difEfectivo > 0 ? '+' : '-'}${fmtPesos(Math.abs(a.difEfectivo))}</span>` : ''}
                  ${a.difTransfer !== 0 ? `<span class="anc-hist-row__dif">Tr: ${a.difTransfer > 0 ? '+' : '-'}${fmtPesos(Math.abs(a.difTransfer))}</span>` : ''}
                </div>` : ''}
            </li>`).join('')}
        </ul>
      </div>`;
    $$('[data-anc-hist]', cont).forEach(el => {
      el.addEventListener('click', () => this.abrirDetalleAnclaje(el.dataset.ancHist));
    });
  },

  async confirmarYAnclar() {
    const p = this.preview;
    const ef = Number($('#anc-ef').value) || 0;
    const tr = Number($('#anc-tr').value) || 0;
    const observacion = $('#anc-obs').value.trim();
    const difEf = ef - p.efectivoSistema;
    const difTr = tr - p.transferSistema;
    const hayDif = Math.abs(difEf) > 0 || Math.abs(difTr) > 0;

    if (hayDif && !observacion) {
      const ok = await confirmar(
        'Diferencia sin observación',
        `Hay diferencias (Ef: ${fmtPesos(Math.abs(difEf))}, Tr: ${fmtPesos(Math.abs(difTr))}) pero la observación está vacía. ¿Continuar?`,
        'Continuar sin observación'
      );
      if (!ok) { $('#anc-obs').focus(); return; }
    }

    const html = `
      <div class="anc-confirm">
        <div class="anc-confirm__row"><span>Total neto</span><b>${fmtPesos(p.totalNeto)}</b></div>
        ${(p.propinaSistema || 0) > 0 ? `<div class="anc-confirm__row"><span>🎁 Propinas (informativo)</span><b>${fmtPesos(p.propinaSistema)}</b></div>` : ''}
        <div class="anc-confirm__row"><span>Pedidos cobrados</span><b>${p.cantPedidos}</b></div>
        <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
        <div class="anc-confirm__row"><span>Efectivo sistema</span><b>${fmtPesos(p.efectivoSistema)}</b></div>
        <div class="anc-confirm__row"><span>Efectivo declarado</span><b>${fmtPesos(ef)}</b></div>
        <div class="anc-confirm__row ${this._difCls(difEf, p.efectivoSistema)}"><span>Diferencia efectivo</span><b>${difEf > 0 ? '+' : difEf < 0 ? '-' : ''}${fmtPesos(Math.abs(difEf))}</b></div>
        <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
        <div class="anc-confirm__row"><span>Transfer sistema</span><b>${fmtPesos(p.transferSistema)}</b></div>
        <div class="anc-confirm__row"><span>Transfer declarado</span><b>${fmtPesos(tr)}</b></div>
        <div class="anc-confirm__row ${this._difCls(difTr, p.transferSistema)}"><span>Diferencia transfer</span><b>${difTr > 0 ? '+' : difTr < 0 ? '-' : ''}${fmtPesos(Math.abs(difTr))}</b></div>
        ${observacion ? `
          <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
          <div class="anc-confirm__obs">📝 ${escapeHtml(observacion)}</div>` : ''}
      </div>`;
    const ok = await Swal.fire({
      title: 'Confirmar anclaje', html, width: 480,
      showCancelButton: true,
      confirmButtonText: 'Sí, anclar día',
      cancelButtonText: 'Revisar',
      reverseButtons: true
    }).then(r => r.isConfirmed);
    if (!ok) return;

    startLoading();
    try {
      await apiPost('anclarDia', withUser({
        efectivoDeclarado: ef,
        transferDeclarado: tr,
        observacion
      }));
      stopLoading();
      playSoundOnce(SOUNDS.ok);
      Toast && Toast.fire({ icon: 'success', title: 'Día anclado' });
      await Promise.all([this.cargarPreview(), this.cargarHistorico()]);
      this.render();
    } catch (e) {
      stopLoading();
      const msg = e.message || 'Error al anclar';
      if (msg.indexOf('Ya se ancló') >= 0) {
        await alertWarn('Ya estaba anclado',
          'Alguien más ancló el día mientras llenabas el formulario. Refrescamos para mostrarte el estado actual.');
        await this.refrescar(true);
      } else if (msg.indexOf('pedido(s) abierto(s)') >= 0) {
        await alertWarn('Hay pedidos abiertos',
          'Se abrió un pedido nuevo justo antes del anclaje. Refrescamos para mostrártelo.');
        await this.refrescar(true);
      } else {
        alertErr('Error', msg);
      }
    }
  },

  _difCls(dif, sistema) {
    const abs = Math.abs(dif);
    if (abs === 0) return 'anc-confirm__row--ok';
    const tope = (sistema || 0) * 0.05;
    return abs > tope ? 'anc-confirm__row--err' : 'anc-confirm__row--warn';
  },

  async abrirDetalleAnclaje(id) {
    startLoading();
    try {
      const a = await apiGet('getAnclaje', { id });
      stopLoading();
      Swal.fire({
        title: 'Detalle del anclaje',
        html: `
          <div class="anc-confirm">
            <div class="anc-confirm__row"><span>ID</span><b>${escapeHtml(a.id)}</b></div>
            <div class="anc-confirm__row"><span>Fecha corte</span><b>${escapeHtml(a.fechaCorte)}</b></div>
            <div class="anc-confirm__row"><span>Ancló</span><b>${escapeHtml(a.usuarioNombre)} (${escapeHtml(a.rol)})</b></div>
            <div class="anc-confirm__row"><span>Modo</span><b>${escapeHtml(a.modo)}</b></div>
            <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
            <div class="anc-confirm__row"><span>Total ventas</span><b>${fmtPesos(a.totalVentas)}</b></div>
            ${a.totalDescuentos > 0 ? `<div class="anc-confirm__row"><span>Descuentos</span><b>-${fmtPesos(a.totalDescuentos)}</b></div>` : ''}
            <div class="anc-confirm__row anc-confirm__row--total"><span>Total neto</span><b>${fmtPesos(a.totalNeto)}</b></div>
            ${(a.propinaSistema || 0) > 0 ? `<div class="anc-confirm__row"><span>🎁 Propinas (informativo)</span><b>${fmtPesos(a.propinaSistema)}</b></div>` : ''}
            <div class="anc-confirm__row"><span>Pedidos</span><b>${a.cantPedidos}</b></div>
            <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
            <div class="anc-confirm__row"><span>Efectivo sistema</span><b>${fmtPesos(a.efectivoSistema)}</b></div>
            <div class="anc-confirm__row"><span>Efectivo declarado</span><b>${fmtPesos(a.efectivoDeclarado)}</b></div>
            <div class="anc-confirm__row ${this._difCls(a.difEfectivo, a.efectivoSistema)}"><span>Diferencia</span><b>${a.difEfectivo > 0 ? '+' : a.difEfectivo < 0 ? '-' : ''}${fmtPesos(Math.abs(a.difEfectivo))}</b></div>
            <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
            <div class="anc-confirm__row"><span>Transfer sistema</span><b>${fmtPesos(a.transferSistema)}</b></div>
            <div class="anc-confirm__row"><span>Transfer declarado</span><b>${fmtPesos(a.transferDeclarado)}</b></div>
            <div class="anc-confirm__row ${this._difCls(a.difTransfer, a.transferSistema)}"><span>Diferencia</span><b>${a.difTransfer > 0 ? '+' : a.difTransfer < 0 ? '-' : ''}${fmtPesos(Math.abs(a.difTransfer))}</b></div>
            ${a.observacion ? `
              <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
              <div class="anc-confirm__obs">📝 ${escapeHtml(a.observacion)}</div>` : ''}
            <hr style="border:0;border-top:1px dashed var(--border);margin:10px 0;" />
            <div class="anc-confirm__row anc-confirm__row--muted">
              <span>WhatsApp al dueño</span><b>${a.enviadoWa ? '✓ Enviado' : '— No enviado'}</b>
            </div>
          </div>`,
        width: 520,
        confirmButtonText: 'Cerrar'
      });
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async refrescar(silent) {
    if (!silent) startLoading();
    await this.cargarPreview();
    if (!silent) stopLoading();
    this.render();
  },

  _snapshotMacro() {
    if (!this.preview) return 'error';
    if (this.preview.yaAnclado) return 'anclado';
    if (this.preview.pedidosAbiertos.length) {
      return 'bloqueado:' + this.preview.pedidosAbiertos.length;
    }
    return [
      'limpio',
      this.preview.cantPedidos,
      this.preview.totalVentas,
      this.preview.totalDescuentos,
      this.preview.efectivoSistema,
      this.preview.transferSistema
    ].join(':');
  },

  startAutoRefresh() {
    this.stopAutoRefresh();
    this._refreshInterval = setInterval(async () => {
      // No tocar la UI si hay un modal de SweetAlert abierto
      if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) return;

      // Cambio de día → recargar la vista por completo
      const ahora = this.fechaYyyyMmDdLocal();
      if (this._fechaInicial && ahora !== this._fechaInicial) {
        console.log('Anclaje: cambió el día, recargando…');
        location.reload();
        return;
      }

      const prev = this._snapshotMacro();
      await this.cargarPreview();
      const next = this._snapshotMacro();
      if (prev === next) return; // nada cambió, no repintar

      // Preservar lo que el cajero tenía escrito en el formulario
      const efVal  = $('#anc-ef')?.value;
      const trVal  = $('#anc-tr')?.value;
      const obsVal = $('#anc-obs')?.value;

      this.render();

      if (efVal !== undefined && $('#anc-ef'))  $('#anc-ef').value  = efVal;
      if (trVal !== undefined && $('#anc-tr'))  $('#anc-tr').value  = trVal;
      if (obsVal !== undefined && $('#anc-obs')) {
        $('#anc-obs').value = obsVal;
        const cnt = $('#anc-obs-count');
        if (cnt) cnt.textContent = obsVal.length;
      }
      // Re-calcular diferencias con los inputs restaurados
      $('#anc-ef')?.dispatchEvent(new Event('input'));
    }, 30 * 1000);
  },

  stopAutoRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  },

desenganchar() { this.stopAutoRefresh(); },

  setupListeners() { /* nada por ahora */ }
};

/* ============================================================
   ============================================================
   FASE 5 / BLOQUE E — USUARIOS (gestión de equipo)
   Solo SUPERUSUARIO. Lista + buscar + crear + editar + eliminar.
   ============================================================
   ============================================================ */
const Usuarios = {
  usuarios: [],
  negocios: [],
  filtroTexto: '',

  ROLES: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR','MESERO','COCINA','CAJA'],

  async abrir() {
    showView('usuarios');
    await this.cargar();
  },

  async cargar() {
    startLoading();
    try {
      const [users, negs] = await Promise.all([
        apiPost('listUsuarios', withUser({})),
        apiGet('listNegocios')
      ]);
      this.usuarios = users || [];
      this.negocios = negs || [];
      this.render();
    } catch (e) {
      alertErr('Error al cargar usuarios', e.message);
    } finally {
      stopLoading();
    }
  },

  render() {
    const cont = $('#usr-content');
    if (!cont) return;
    const sub = $('#usr-subtitle');

    const filtro = this.filtroTexto.trim().toLowerCase();
    const visibles = this.usuarios
      .filter(u => {
        if (!filtro) return true;
        return [u.nombre, u.documento, u.telefono, u.rol]
          .map(x => String(x || '').toLowerCase())
          .some(x => x.indexOf(filtro) >= 0);
      })
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));

    if (sub) {
      const total = this.usuarios.length;
      const txt = filtro
        ? `${visibles.length} de ${total} usuario${total === 1 ? '' : 's'}`
        : `${total} usuario${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}`;
      sub.textContent = txt;
    }

    if (!visibles.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:16px;">
          <h3>${filtro ? 'Sin resultados' : 'Sin usuarios'}</h3>
          <p class="muted">${filtro ? 'Nadie coincide con tu búsqueda.' : 'Toca <b>+</b> para crear el primer usuario.'}</p>
        </div>`;
      return;
    }

    cont.innerHTML = visibles.map(u => this.renderTarjeta(u)).join('');
    $$('[data-usr-edit]', cont).forEach(el => {
      el.addEventListener('click', () => {
        const u = this.usuarios.find(x => x.id === el.dataset.usrEdit);
        if (u) this.abrirModal(u);
      });
    });
  },

renderTarjeta(u) {
    const iniciales = this.iniciales(u.nombre);
    const rolKey = String(u.rol).toLowerCase();
    const negociosTags = (u.negocios || []).map(id => {
      const n = this.negocios.find(x => x.id === id);
      const label = n ? (n.tipo || n.nombre || id) : id;
      return `<span class="usr-tag">${escapeHtml(label)}</span>`;
    }).join('');
    // Bloque I — si hay foto, la pintamos encima de las iniciales. Si la
    // imagen falla, onerror la quita y vuelven a verse las iniciales.
    const imgHTML = u.fotoUrl
      ? `<img class="usr-card__avatar__img" src="${escapeHtml(u.fotoUrl)}"
              alt="" loading="lazy" onerror="this.remove()" />`
      : '';
    return `
      <article class="usr-card" data-usr-edit="${u.id}">
        <div class="usr-card__avatar usr-card__avatar--${rolKey}">
          <span class="usr-card__avatar__txt">${escapeHtml(iniciales)}</span>
          ${imgHTML}
        </div>
        <div class="usr-card__body">
          <div class="usr-card__head">
            <h4 class="usr-card__name">${escapeHtml(u.nombre)}</h4>
            <span class="usr-chip usr-chip--${rolKey}">${escapeHtml(u.rol)}</span>
          </div>
          <div class="usr-card__meta">
            <span>Doc: <b>${escapeHtml(u.documento)}</b></span>
            <span>·</span>
            <span>Tel: <b>${escapeHtml(this.fmtTel(u.telefono))}</b></span>
          </div>
          ${negociosTags ? `<div class="usr-card__tags">${negociosTags}</div>` : ''}
          ${u.ultimoLogin ? `<div class="usr-card__last">Último login: ${escapeHtml(fmtFechaCorta(u.ultimoLogin))}</div>` : ''}
        </div>
      </article>
    `;
  },

  iniciales(nombre) {
    const partes = String(nombre || '?').trim().split(/\s+/);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  },

  fmtTel(t) {
    const s = String(t || '');
    if (s.length !== 10) return s;
    return s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6);
  },

abrirModal(usuario) {
    const isNew = !usuario;
    const u = usuario || {
      id: '', nombre: '', documento: '', telefono: '',
      rol: 'MESERO', pin: '', negocios: [], email: '', fotoUrl: ''
    };
    const self = this;
    const esYoMismo = !isNew && String(u.id) === String(state.user?.id);
    // Bloque I — estado mutable de la foto durante la edición del modal.
    // Si el usuario sube nueva, fotoState.url cambia. Si toca "Quitar", queda ''.
    const fotoState = { url: u.fotoUrl || '', cambiado: false };

    const optsRoles = this.ROLES.map(r =>
      `<option value="${r}" ${r === u.rol ? 'selected' : ''}>${r}</option>`
    ).join('');

    const negsHtml = this.negocios.length
      ? this.negocios.map(n => {
          const checked = (u.negocios || []).indexOf(n.id) >= 0 ? 'checked' : '';
          return `
            <label class="usr-negocio-opt">
              <input type="checkbox" data-usr-neg="${n.id}" ${checked} />
              <span>${escapeHtml(n.nombre)}</span>
            </label>`;
        }).join('')
      : `<p class="muted" style="font-size:0.82rem;">No hay negocios activos.</p>`;

    // PIN: en CREACIÓN visible siempre. En EDICIÓN oculto con toggle.
    const pinHtml = isNew
      ? `<input id="u-pin" type="text" maxlength="4" inputmode="numeric"
             placeholder="4 dígitos" value="" />`
      : `<div class="usr-pin-row">
           <input id="u-pin" type="password" maxlength="4" inputmode="numeric"
                  value="${escapeHtml(u.pin)}" />
           <button type="button" id="u-pin-toggle" class="usr-pin-toggle"
                   title="Mostrar / ocultar PIN">👁</button>
         </div>`;

    const iniModal = this.iniciales(u.nombre || '?');
    const html = `
      <div class="usr-modal">
        <div id="u-avatar-wrap" class="usr-modal__avatar usr-card__avatar--${String(u.rol || 'MESERO').toLowerCase()}">
          <span class="usr-card__avatar__txt">${escapeHtml(iniModal)}</span>
          ${fotoState.url
            ? `<img id="u-avatar-img" class="usr-card__avatar__img" src="${escapeHtml(fotoState.url)}" alt="" onerror="this.remove()" />`
            : ''}
        </div>
        <div class="usr-modal__foto-btns">
          <label class="usr-modal__foto-btn">
            📷 ${fotoState.url ? 'Cambiar foto' : 'Subir foto'}
            <input id="u-foto-file" type="file" accept="image/*" hidden />
          </label>
          <button type="button" id="u-foto-quitar" class="usr-modal__foto-btn usr-modal__foto-btn--quitar ${fotoState.url ? '' : 'hidden'}">
            🗑 Quitar foto
          </button>
        </div>

        <label>Nombre completo</label>
        <input id="u-nombre" type="text" value="${escapeHtml(u.nombre)}"
               placeholder="Ej: JUAN PÉREZ TORRES" maxlength="80" />

        <div class="grid-2">
          <div>
            <label>Documento</label>
            <input id="u-documento" type="tel" inputmode="numeric" maxlength="10"
                   value="${escapeHtml(u.documento)}" placeholder="1234567890" />
          </div>
          <div>
            <label>Teléfono (cel. CO)</label>
            <input id="u-telefono" type="tel" inputmode="numeric" maxlength="10"
                   value="${escapeHtml(u.telefono)}" placeholder="3001234567" />
          </div>
        </div>

        <div class="grid-2">
          <div>
            <label>Rol</label>
            <select id="u-rol" ${esYoMismo ? 'data-yo-mismo="1"' : ''}>
              ${optsRoles}
            </select>
          </div>
          <div>
            <label>PIN (4 dígitos)</label>
            ${pinHtml}
          </div>
        </div>

        <label>Negocios asignados</label>
        <div class="usr-negocios">${negsHtml}</div>

        <label>Email (opcional)</label>
        <input id="u-email" type="email" value="${escapeHtml(u.email)}"
               placeholder="usuario@ejemplo.com" />

        ${esYoMismo ? `
          <p class="muted" style="font-size:0.74rem; margin-top:10px;">
            ⚠️ Estás editando tu propio usuario. No puedes cambiar tu rol fuera de SUPERUSUARIO ni eliminarte.
          </p>` : ''}
      </div>
    `;

    Swal.fire({
      title: isNew ? 'Nuevo usuario' : 'Editar usuario',
      html,
      width: 560,
      showCancelButton: true,
      confirmButtonText: isNew ? 'Crear' : 'Guardar',
      cancelButtonText: 'Cancelar',
      showDenyButton: !isNew && !esYoMismo,
      denyButtonText: 'Eliminar',
      reverseButtons: true,
      focusConfirm: false,
     didOpen: () => {
        const toggle = $('#u-pin-toggle');
        if (toggle) {
          toggle.addEventListener('click', () => {
            const inp = $('#u-pin');
            inp.type = inp.type === 'password' ? 'text' : 'password';
            toggle.textContent = inp.type === 'password' ? '👁' : '🙈';
          });
        }
        // Sanitizar inputs numéricos en vivo
        ['u-documento','u-telefono','u-pin'].forEach(id => {
          const el = $('#' + id);
          if (el) el.addEventListener('input', () => {
            el.value = el.value.replace(/\D/g, '');
          });
        });

        // ── Bloque I — Banner inline DENTRO del modal ─────────────
        // Mismo patrón que Caja._mostrarBannerTicket: no podemos usar
        // Toast/Swal porque cerrarían el modal padre (Swal solo soporta
        // un popup activo a la vez). Banner se autoelimina a los 2.4s.
        const mostrarBanner = (tipo, mensaje) => {
          const cont = document.querySelector('.swal2-html-container .usr-modal');
          if (!cont) return;
          const prev = cont.querySelector('.usr-modal__banner');
          if (prev) prev.remove();
          const banner = document.createElement('div');
          banner.className = 'usr-modal__banner usr-modal__banner--' + tipo;
          banner.innerHTML = (tipo === 'ok' ? '✓ ' : tipo === 'warn' ? '⚠ ' : '⚠ ') + escapeHtml(mensaje);
          cont.insertBefore(banner, cont.firstChild);
          setTimeout(() => {
            banner.classList.add('is-fading');
            setTimeout(() => banner.remove(), 300);
          }, 2400);
        };

        // ── Bloque I — Helpers de avatar + file picker ────────────
        const refrescarAvatar = () => {
          const wrap = $('#u-avatar-wrap');
          if (!wrap) return;
          const oldImg = $('#u-avatar-img');
          if (oldImg) oldImg.remove();
          if (fotoState.url) {
            const img = document.createElement('img');
            img.id = 'u-avatar-img';
            img.className = 'usr-card__avatar__img';
            img.src = fotoState.url;
            img.alt = '';
            img.onerror = () => img.remove();
            wrap.appendChild(img);
          }
          $('#u-foto-quitar')?.classList.toggle('hidden', !fotoState.url);
          const lbl = document.querySelector('.usr-modal__foto-btn:not(.usr-modal__foto-btn--quitar)');
          if (lbl) lbl.innerHTML = (fotoState.url ? '📷 Cambiar foto' : '📷 Subir foto') +
                                    '<input id="u-foto-file" type="file" accept="image/*" hidden />';
          bindFotoFile();
        };
        const bindFotoFile = () => {
          const inp = $('#u-foto-file');
          if (!inp) return;
          inp.addEventListener('change', async () => {
            const file = inp.files && inp.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) {
              mostrarBanner('warn', 'Imagen muy grande (máx 4 MB)');
              inp.value = '';
              return;
            }
            const lbl = inp.parentElement;
            const restaurarLabel = () => {
              if (!lbl) return;
              lbl.innerHTML = (fotoState.url ? '📷 Cambiar foto' : '📷 Subir foto') +
                              '<input id="u-foto-file" type="file" accept="image/*" hidden />';
              bindFotoFile();
            };
            try {
              lbl.innerHTML = '⏳ Subiendo…';
              const base64 = await fileToBase64(file);
              const r = await apiPost('subirFotoUsuario', withUser({
                usuarioId:  u.id || null,
                filename:   file.name,
                base64,
                // Bloque I — la foto anterior (subida en este mismo modal o ya
                // persistida desde antes) se borra del Drive al subir la nueva
                fotoPrevia: fotoState.url || ''
              }));
              fotoState.url = r.url;
              fotoState.cambiado = true;
              refrescarAvatar();   // restaura label a "Cambiar foto"
              mostrarBanner('ok', 'Foto lista — guarda para aplicar');
            } catch (e) {
              restaurarLabel();
              mostrarBanner('err', 'No se pudo subir: ' + e.message);
            }
          });
        };
        bindFotoFile();
        $('#u-foto-quitar')?.addEventListener('click', () => {
          // Solo marcamos en estado local. El borrado real de Drive ocurre
          // en el backend dentro de apiUpsertUsuario_ cuando confirma la
          // transacción (Sheets y Drive quedan siempre sincronizados, y
          // si el usuario cancela el modal no se borra nada).
          fotoState.url = '';
          fotoState.cambiado = true;
          refrescarAvatar();
        });
      },
      preConfirm: () => {
        const datos = {
          nombre:    $('#u-nombre').value.trim().toUpperCase(),
          documento: $('#u-documento').value.trim(),
          telefono:  $('#u-telefono').value.trim(),
          rol:       $('#u-rol').value,
          pin:       $('#u-pin').value.trim(),
          email:     $('#u-email').value.trim(),
          negocios:  $$('[data-usr-neg]:checked').map(el => el.dataset.usrNeg)
        };
        // Bloque I — sólo mandamos fotoUrl si el usuario tocó algo en el modal.
        // Si no, el backend deja la foto existente intacta (undefined no la sobreescribe).
        if (fotoState.cambiado) datos.fotoUrl = fotoState.url;
        const err = self.validarLocal(datos, isNew ? null : u.id);
        if (err) { Swal.showValidationMessage(err); return false; }
        return datos;
      }
    }).then(async (res) => {
      if (res.isDenied) {
        const ok = await confirmar('Eliminar usuario',
          `¿Eliminar a <b>${escapeHtml(u.nombre)}</b>? Esta acción es irreversible.`,
          'Sí, eliminar');
        if (ok) await self.eliminar(u);
      } else if (res.isConfirmed) {
        await self.guardar(res.value, isNew ? null : u.id);
      }
    });
  },

  validarLocal(d, idEditando) {
    if (!d.nombre || d.nombre.length < 3) return 'Nombre debe tener al menos 3 caracteres';
    if (!/^\d{6,10}$/.test(d.documento)) return 'Documento debe tener entre 6 y 10 dígitos';
    if (!/^3\d{9}$/.test(d.telefono)) return 'Teléfono debe ser celular Colombia (10 dígitos, inicia en 3)';
    if (!/^\d{4}$/.test(d.pin)) return 'PIN debe tener exactamente 4 dígitos';
    if (this.ROLES.indexOf(d.rol) < 0) return 'Selecciona un rol válido';
    if (!d.negocios.length) return 'Selecciona al menos un negocio';
    if (d.email && d.email.indexOf('@') < 0) return 'Email debe contener "@"';

    // Auto-degradación
    if (idEditando && String(idEditando) === String(state.user?.id) && d.rol !== 'SUPERUSUARIO') {
      return 'No puedes cambiar tu propio rol fuera de SUPERUSUARIO';
    }

    // Unicidad local — el backend re-valida pero esto evita el round-trip
    const otros = this.usuarios.filter(u => u.id !== idEditando);
    if (otros.find(u => String(u.documento) === d.documento)) {
      return 'Ya existe un usuario con el documento ' + d.documento;
    }
    if (otros.find(u => String(u.pin) === d.pin)) {
      return 'El PIN ' + d.pin + ' ya está usado por otro usuario';
    }
    return null;
  },

  async guardar(datos, idEditando) {
    startLoading();
    try {
      const body = {
        nombre:    datos.nombre,
        documento: datos.documento,
        telefono:  datos.telefono,
        rol:       datos.rol,
        pin:       datos.pin,
        email:     datos.email,
        negocios:  datos.negocios
      };
      // Bloque I — fotoUrl solo viaja si el modal lo marcó como cambiado
      if (datos.fotoUrl !== undefined) body.fotoUrl = datos.fotoUrl;
      if (idEditando) body.id = idEditando;
      await apiPost('upsertUsuario', withUser(body));
      stopLoading();
      Toast && Toast.fire({
        icon: 'success',
        title: idEditando ? 'Usuario actualizado' : 'Usuario creado'
      });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error al guardar', e.message);
    }
  },

  async eliminar(u) {
    startLoading();
    try {
      await apiPost('eliminarUsuario', withUser({ id: u.id }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Usuario eliminado' });
      await this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('No se pudo eliminar', e.message);
    }
  },

  desenganchar() { /* sin listeners persistentes */ },

setupListeners() {
    const fab = $('#usr-fab');
    if (fab && !fab._bound) {
      fab.addEventListener('click', () => this.abrirModal(null));
      fab._bound = true;
    }
    const btn = $('#usr-search-btn');
    const bar = $('#usr-search-bar');
    const inp = $('#usr-search-input');
    if (btn && !btn._bound) {
      btn.addEventListener('click', () => {
        bar.classList.toggle('hidden');
        if (!bar.classList.contains('hidden')) inp.focus();
        else { inp.value = ''; this.filtroTexto = ''; this.render(); }
      });
      btn._bound = true;
    }
    if (inp && !inp._bound) {
      let t = null;
      inp.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { this.filtroTexto = inp.value; this.render(); }, 180);
      });
      inp._bound = true;
    }
  }
};

/* ============================================================
   ============================================================
   FASE 5 / BLOQUE F — CONFIG GLOBAL (cache 5 min)
   ============================================================
   Lectura cacheada del config para que las vistas (Caja, Cocina,
   tickets, etc) no hagan un round-trip cada vez. Bloque G cablea
   las vistas a esto.
   ============================================================
   ============================================================ */
const Config = {
  _CACHE_KEY: 'rg.config',
  _TTL_MS: 5 * 60 * 1000,
  _inflight: null,
  _listeners: [],         // callbacks notificados al cambiar el config
  _rtdbRef: null,         // ref Firebase activa
  _primeraVezRtdb: true,  // para no notificar en el snapshot inicial

  async get() {
    const cached = this._readCache();
    if (cached) return cached;
    if (this._inflight) return this._inflight;
    // Enviamos el id de usuario para que el backend decida si revela secretos
    // (BB_API_KEY) — solo al DESARROLLADOR. apiGet serializa params en la query.
    const u = state.user;
    const qp = u ? { 'usuario.id': u.id } : {};
    this._inflight = apiGet('getConfig', qp).then(cfg => {
      this._writeCache(cfg);
      this._inflight = null;
      return cfg;
    }).catch(e => {
      this._inflight = null;
      throw e;
    });
    return this._inflight;
  },

  async refresh() {
    this.invalidate();
    return this.get();
  },

  invalidate() {
    try { localStorage.removeItem(this._CACHE_KEY); } catch (_) {}
  },

  /* Suscripción imperativa: callback recibe el config actualizado.
     Devuelve función para desuscribir. */
  on(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(c => c !== callback);
    };
  },

  _notify(cfg) {
    this._listeners.forEach(cb => {
      try { cb(cfg); } catch (e) { console.error('Config listener error:', e); }
    });
  },

  /* Listener global RTDB. Se monta tras login y se mantiene hasta
     logout. Cualquier `setConfig` en otro dispositivo dispara este
     callback, invalida cache y notifica a los listeners locales. */
  async subscribeRTDB(negocioId) {
    if (this._rtdbRef) return;
    const fb = await getFirebase();
    if (!fb) return;
    this._primeraVezRtdb = true;
    this._rtdbRef = fb.database().ref('/negocios/' + negocioId + '/config');
    this._rtdbRef.on('value', (snap) => {
      const data = snap.val();
      if (!data) return;
      if (this._primeraVezRtdb) {
        // Snapshot inicial: si no hay cache, lo seedeamos. Si hay cache
        // fresco (TTL no expirado), lo respetamos por consistencia.
        this._primeraVezRtdb = false;
        if (!this._readCache()) this._writeCache(data);
        return;
      }
      // Cambio: invalidar, persistir y notificar
      this._writeCache(data);
      this._notify(data);
    }, (err) => {
      console.error('RTDB config listener:', err);
    });
  },

  unsubscribeRTDB() {
    if (this._rtdbRef) {
      this._rtdbRef.off();
      this._rtdbRef = null;
      this._primeraVezRtdb = true;
    }
  },

  _readCache() {
    try {
      const raw = localStorage.getItem(this._CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.data) return null;
      if (Date.now() - obj.ts > this._TTL_MS) return null;
      return obj.data;
    } catch (_) { return null; }
  },

  _writeCache(data) {
    try {
      localStorage.setItem(this._CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {}
  }
};

/* ============================================================
   ============================================================
   FASE 5 / BLOQUE F — VISTA CONFIGURACIÓN
   Solo SUPERUSUARIO. 5 secciones colapsables con guardado
   independiente por sección. Plantillas WA con preview en vivo.
   ============================================================
   ============================================================ */
const Configuracion = {
  cfg: {},
  abiertas: new Set(),       // claves de secciones expandidas
  guardando: false,

SECCIONES: [
    { key: 'datos',     titulo: '🏷  Datos del restaurante' },
    { key: 'operacion', titulo: '💼  Operación' },
    { key: 'tiempos',   titulo: '⏱  Tiempos de alerta' },
    { key: 'whatsapp',  titulo: '💬  WhatsApp' },
    { key: 'horario',   titulo: '🕒  Horario' },
    { key: 'reservas',  titulo: '📅  Reservas' },
   { key: 'creditos',  titulo: '💳  Créditos' },
  ],

  // Defaults usados como hints visuales y para preview de plantillas
  DEFAULTS: {
   WA_TEMPLATE_TICKET:
      '🍽️ *¡Gracias por visitarnos, {cliente}!* 🐟\n\n' +
      '✨ *{razonSocial}*\n' +
      '📍 {direccion}\n\n' +
      '━━━━━━━━━━━━━━━━━\n' +
      '🧾 *Resumen de tu pedido*\n' +
      '━━━━━━━━━━━━━━━━━\n' +
      '{items}\n' +
      '━━━━━━━━━━━━━━━━━\n' +
      '{descuentoLinea}\n' +
      '💰 *TOTAL:* {total}\n' +
      '💳 Método: {metodo}\n' +
      '{ticketLink}\n' +
      '{comprobante}\n\n' +
      '💚 Te esperamos pronto. Para cualquier comentario, escríbenos a este mismo número.\n' +
      '_{pie}_',
    WA_TEMPLATE_PLATO_LISTO:
      '🍽️ *Plato listo*\n\n' +
      'Mesa {mesa}\n' +
      '{plato}\n\n' +
      'Por favor recoger en cocina.',
     WA_TEMPLATE_CAJA_CUENTA:
      '💰 *Cuenta solicitada*\n\n' +
      'Mesa {mesa}\n' +
      'Mesero: {mesero}\n' +
      'Total: {total}\n\n' +
      'El cliente está pidiendo la cuenta.',
    WA_TEMPLATE_CIERRE:
      '🌙 *ANCLAJE DEL DÍA*\n' +
      '*{razonSocial}*\n\n' +
      '📅 {fechaCorte}\n' +
      '👤 Ancló: {usuarioNombre} ({rol})\n' +
      '⚙️ Modo: {modo}\n\n' +
      '─────────────────\n' +
      '💰 *Ventas*\n' +
      'Pedidos cobrados: {cantPedidos}\n' +
      'Total ventas: {totalVentas}\n' +
      '*Total neto: {totalNeto}*\n\n' +
      '─────────────────\n' +
      '💵 *Efectivo*\n' +
      'Sistema: {efectivo}\n' +
      'Declarado: {efectivoDeclarado}\n' +
      'Diferencia: {difEfectivo}\n\n' +
      '📱 *Transferencia*\n' +
      'Sistema: {transfer}\n' +
      'Declarado: {transferDeclarado}\n' +
      'Diferencia: {difTransfer}\n\n' +
      '─────────────────\n' +
      '🏆 *Top 3 productos*\n' +
      '{top3}\n\n' +
      '📝 {observacion}',
    // Fase 7 / Bloque Q — Reservas
    WA_TEMPLATE_RESERVA_CLIENTE:
      '✨ ¡Hola {cliente}! Recibimos tu solicitud de reserva 🐟\n\n' +
      '📅 *{fechaReservaLarga}*\n' +
      '👥 {personas} persona(s)\n' +
      '🎉 {tipoEvento}\n\n' +
      'En el menor tiempo posible revisaremos tu solicitud y te confirmaremos por este mismo medio. 💚\n\n' +
      'Puedes consultar el estado o cancelar tu reserva aquí:\n' +
      '{consultaUrl}\n\n' +
      '🍽️ *{razonSocial}*',
    WA_TEMPLATE_RESERVA_GRUPO:
      '🚨 *NUEVA SOLICITUD DE RESERVA* 🚨\n\n' +
      '🕒 Solicitada: {fechaSolicitudLarga}\n' +
      '📅 Para: *{fechaReservaLarga}*\n\n' +
      '👤 {clienteNombre}\n' +
      '📱 {clienteTelefono}\n' +
      '👥 {personas} persona(s)\n' +
      '🎉 {tipoEvento}\n' +
      '📝 {observaciones}\n\n' +
      '⚡ Revisar en la app y confirmar o rechazar.',
    WA_TEMPLATE_RESERVA_CONFIRMACION:
      '🎉 ¡{cliente}, tu reserva está *{estadoTexto}*! 🐟\n\n' +
      '📅 *{fechaReservaLarga}*\n' +
      '👥 {personas} persona(s)\n' +
      '{mesaLinea}' +
      '{motivoLinea}' +
      '\n📍 {direccion}\n' +
      '📞 {telefonoRestaurante}\n\n' +
      '💚 *{razonSocial}* te espera.',
     WA_TEMPLATE_CREDITO_VENTA:
      '🧾 *{razonSocial}*\n\n' +
      '¡Hola {cliente}! Registramos tu pedido a crédito:\n\n' +
      '🍽️ {cantidad} × {momento} — {valorUnidad} c/u\n' +
      '💰 *Total de esta compra:* {total}\n\n' +
      '━━━━━━━━━━━━━━━━━\n' +
      '📊 *Tu deuda actual:* {saldo}\n' +
      '{cupoLinea}' +
      '━━━━━━━━━━━━━━━━━\n\n' +
      '💚 Gracias por tu confianza.',
    WA_TEMPLATE_CREDITO_CUENTA:
      '📋 *Estado de cuenta — {razonSocial}*\n\n' +
      'Hola {cliente}, este es el resumen de tu crédito:\n\n' +
      '{detalle}\n' +
      '━━━━━━━━━━━━━━━━━\n' +
      '💰 *Deuda total:* {saldo}\n' +
      '{cupoLinea}' +
      '━━━━━━━━━━━━━━━━━\n\n' +
      '📍 {direccion}\n' +
      '📞 {telefonoRestaurante}\n\n' +
      '💚 Puedes acercarte a cancelar cuando gustes.',
    WA_TEMPLATE_CREDITO_PAGO:
      '✅ *Pago recibido — {razonSocial}*\n\n' +
      '¡Gracias {cliente}! Registramos tu abono:\n\n' +
      '💵 *Abono:* {valor} ({metodo})\n' +
      '📊 *Saldo restante:* {saldo}\n' +
      '{cupoLinea}\n' +
      '💚 Gracias por tu puntualidad.'
  },

PREVIEW_DATA: {
    cliente: 'Juan', razonSocial: 'Restaurante y Pescadería Ramírez',
    direccion: 'Calle 1 # 23-45, Bogotá',
    total: '$ 85.000', metodo: 'EFECTIVO',
    items: '2× BANDEJA DE TILAPIA            $ 70.000\n1× CERVEZA                       $ 15.000',
    descuentoLinea: '',
    ticketLink: '🧾 *Ver tu ticket completo:*\nhttps://...',
    comprobante: '',
    pie: 'Creado por: Oscar Polania | Cel: 3103230712',
    mesero: 'Carlos', mesa: '5', plato: '2× BANDEJA DE TILAPIA',
    fechaCorte: '25/05/2026 22:00:00',
    usuarioNombre: 'Oscar Polania', rol: 'SUPERUSUARIO', modo: 'MANUAL',
    cantPedidos: '32',
    totalVentas: '$ 1.250.000', totalNeto: '$ 1.200.000',
    efectivo: '$ 800.000', efectivoDeclarado: '$ 800.000', difEfectivo: '$ 0',
    transfer: '$ 400.000', transferDeclarado: '$ 400.000', difTransfer: '$ 0',
    top3: '1. BANDEJA DE TILAPIA × 8\n2. CALDO DE PESCADO × 5\n3. CERVEZA × 12',
    observacion: 'Sin novedades.',
    // Fase 7 / Bloque Q — Reservas
    fechaReservaLarga:   'Martes, 28 de Mayo de 2026 5:00 PM',
    fechaSolicitudLarga: 'Lunes, 26 de Mayo de 2026 3:30 PM',
    personas: '4',
    tipoEvento: 'Cumpleaños',
    consultaUrl: 'https://reservas.ramirez.com?token=abc123def456',
    clienteNombre: 'JUAN PÉREZ TORRES',
    clienteTelefono: '3001234567',
    observaciones: 'Mesa cerca a la ventana, por favor',
    estadoTexto: 'CONFIRMADA ✅',
    mesaLinea: '🪑 Mesa asignada: 5\n',
    motivoLinea: '',
    direccion: 'Calle 1 # 23-45, Bogotá',
    telefonoRestaurante: '3001112233',
   momento: 'Almuerzo',
    cantidad: '3',
    valorUnidad: '$ 13.000',
    saldo: '$ 89.000',
    cupoLinea: '🎯 Cupo: $ 300.000\n🟢 Disponible: $ 211.000\n',
    detalle: '• 2026-06-03 · 3× Almuerzo — $ 39.000\n• 2026-06-04 · 2× Desayuno — $ 16.000',
    valor: '$ 50.000',
    metodo: 'Efectivo'
  },

  async abrir() {
    showView('configuracion');
    if (!this.abiertas.size) this.abiertas.add('datos');  // primera abierta por default
    await this.cargar();
  },

  async cargar() {
    startLoading();
    try {
      this.cfg = await Config.refresh();   // forzar refresh
      this.render();
    } catch (e) {
      alertErr('Error al cargar configuración', e.message);
    } finally {
      stopLoading();
    }
  },

  render() {
    const cont = $('#cfg-content');
    if (!cont) return;
    cont.innerHTML = this.SECCIONES.map(s => this.renderSeccion(s)).join('');

    // Acordeón
    $$('[data-cfg-toggle]', cont).forEach(h => {
      h.addEventListener('click', () => {
        const key = h.dataset.cfgToggle;
        if (this.abiertas.has(key)) this.abiertas.delete(key);
        else this.abiertas.add(key);
        this.render();
      });
    });
    // Botones de guardar por sección
    $$('[data-cfg-save]', cont).forEach(b => {
      b.addEventListener('click', () => this.guardarSeccion(b.dataset.cfgSave));
    });
    // Subir logo
    const fileLogo = $('#cfg-logo-file');
    if (fileLogo) fileLogo.addEventListener('change', () => this.subirLogo(fileLogo));
    // Preview plantillas
  ['WA_TEMPLATE_TICKET','WA_TEMPLATE_PLATO_LISTO','WA_TEMPLATE_CAJA_CUENTA','WA_TEMPLATE_CIERRE',
     'WA_TEMPLATE_RESERVA_CLIENTE','WA_TEMPLATE_RESERVA_GRUPO','WA_TEMPLATE_RESERVA_CONFIRMACION',
     'WA_TEMPLATE_CREDITO_VENTA','WA_TEMPLATE_CREDITO_CUENTA','WA_TEMPLATE_CREDITO_PAGO'].forEach(k => {
      const ta = $('#cfg-' + k);
      if (ta) ta.addEventListener('input', () => this.actualizarPreview(k));
    });
// Mostrar / ocultar todos los campos secretos de WhatsApp
    $$('[data-toggle]', cont).forEach(b => {
      b.addEventListener('click', () => {
        const inp = $('#' + b.dataset.toggle);
        if (!inp) return;
        inp.type = inp.type === 'password' ? 'text' : 'password';
        b.textContent = inp.type === 'password' ? '👁' : '🙈';
      });
    });
  },

renderSeccion(s) {
    const open = this.abiertas.has(s.key);
    const body = this.renderBody(s.key);
    // WhatsApp y Reservas: si NO es DEV, su contenido es solo-lectura
    // (plantillas), así que no mostramos el botón Guardar.
    const dev = this.esDev();
    const soloLecturaSeccion = !dev && (s.key === 'whatsapp' || s.key === 'reservas');
    return `
      <section class="cfg-section ${open ? 'open' : ''}">
        <button type="button" class="cfg-section__head" data-cfg-toggle="${s.key}">
          <span class="cfg-section__title">${s.titulo}</span>
          <svg class="cfg-section__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="cfg-section__body">
          ${body}
          ${soloLecturaSeccion ? '' : `
          <div class="cfg-section__foot">
            <button class="btn btn-primary btn-sm" data-cfg-save="${s.key}">
              💾 Guardar sección
            </button>
          </div>`}
        </div>
      </section>`;
  },

  esDev() {
    return String(state.user?.rol || '').toUpperCase() === 'DESARROLLADOR';
  },

  renderBody(key) {
    const c = this.cfg;
    const dev = this.esDev();
    const v = (k, def) => escapeHtml(String(c[k] == null ? (def || '') : c[k]));
    switch (key) {
      case 'datos':
        return `
          <label>Razón social</label>
          <input id="cfg-RESTAURANTE_RAZON_SOCIAL" type="text" value="${v('RESTAURANTE_RAZON_SOCIAL')}" />
          <div class="grid-2">
            <div>
              <label>NIT</label>
              <input id="cfg-RESTAURANTE_NIT" type="text" value="${v('RESTAURANTE_NIT')}" />
            </div>
            <div>
              <label>Teléfono</label>
              <input id="cfg-RESTAURANTE_TELEFONO" type="tel" value="${v('RESTAURANTE_TELEFONO')}" />
            </div>
          </div>
          <label>Dirección</label>
          <input id="cfg-RESTAURANTE_DIRECCION" type="text" value="${v('RESTAURANTE_DIRECCION')}" />
          <label>Logo del restaurante</label>
          <div class="cfg-logo">
            <img id="cfg-logo-preview" src="${v('RESTAURANTE_LOGO_URL') || PLACEHOLDER_PRODUCTO}"
                 alt="Logo" onerror="this.src='${PLACEHOLDER_PRODUCTO}'" />
            <div class="cfg-logo__right">
              <input id="cfg-RESTAURANTE_LOGO_URL" type="text" value="${v('RESTAURANTE_LOGO_URL')}"
                     placeholder="https://..." />
              <label class="cfg-logo__btn">
                📷 Subir nueva
                <input id="cfg-logo-file" type="file" accept="image/*" hidden />
              </label>
            </div>
          </div>
        ${dev ? `
          <label>Pie del ticket (texto pequeño al final)</label>
          <textarea id="cfg-RESTAURANTE_TICKET_PIE" rows="2">${v('RESTAURANTE_TICKET_PIE')}</textarea>` : ''}`;

      case 'operacion':
        return `
          <div class="grid-2">
            <div>
              <label>Descuento máximo de caja (%)</label>
              <input id="cfg-CAJA_DESCUENTO_MAX_PCT" type="number" min="0" max="100" step="1"
                     value="${v('CAJA_DESCUENTO_MAX_PCT', '10')}" />
              <p class="muted" style="font-size:0.74rem;">Si caja necesita más, el SUPER lo puede autorizar.</p>
            </div>
            <div>
              <label>Propina sugerida (%)</label>
              <input id="cfg-PROPINA_SUGERIDA_PCT" type="number" min="0" max="30" step="1"
                     value="${v('PROPINA_SUGERIDA_PCT', '10')}" />
              <p class="muted" style="font-size:0.74rem;">Se mostrará como sugerencia al cobrar.</p>
            </div>
          </div>`;

      case 'tiempos':
        return `
          <h4 class="cfg-sub">Cocina (Comanda)</h4>
          <div class="grid-2">
            <div>
              <label>Amarillo a los (min)</label>
              <input id="cfg-COCINA_WARN_MIN" type="number" min="1" max="120" step="1"
                     value="${v('COCINA_WARN_MIN', '15')}" />
            </div>
            <div>
              <label>Rojo a los (min)</label>
              <input id="cfg-COCINA_LATE_MIN" type="number" min="1" max="120" step="1"
                     value="${v('COCINA_LATE_MIN', '25')}" />
            </div>
          </div>
          <h4 class="cfg-sub" style="margin-top:14px;">Caja (esperando cuenta)</h4>
          <div class="grid-2">
            <div>
              <label>Amarillo a los (min)</label>
              <input id="cfg-CAJA_WARN_MIN" type="number" min="1" max="60" step="1"
                     value="${v('CAJA_WARN_MIN', '3')}" />
            </div>
            <div>
              <label>Rojo a los (min)</label>
              <input id="cfg-CAJA_LATE_MIN" type="number" min="1" max="60" step="1"
                     value="${v('CAJA_LATE_MIN', '7')}" />
            </div>
          </div>`;

      case 'whatsapp':
        return `
          ${dev ? `
          <label>URL del bot WhatsApp</label>
          <div class="cfg-secret-row">
            <input id="cfg-BB_API_URL" type="password" value="${v('BB_API_URL')}" placeholder="https://app.builderbot.cloud/api/v2/..." autocomplete="off" spellcheck="false" />
            <button type="button" class="cfg-secret-toggle" data-toggle="cfg-BB_API_URL">👁</button>
          </div>
          <p class="muted" style="font-size:0.72rem;">🔒 Secreto. Solo visible para DESARROLLADOR. Se usa en el header <code>x-api-heartsync</code> al enviar mensajes.</p>

          <label>API Key del bot (HeartSync)</label>
          <div class="cfg-secret-row">
            <input id="cfg-BB_API_KEY" type="password" value="${v('BB_API_KEY')}" placeholder="bb-..." autocomplete="off" spellcheck="false" />
            <button type="button" class="cfg-secret-toggle" data-toggle="cfg-BB_API_KEY">👁</button>
          </div>
          <p class="muted" style="font-size:0.72rem;">🔒 Secreto. Solo visible para DESARROLLADOR. Se usa en el header <code>x-api-heartsync</code> al enviar mensajes.</p>

          <label>Endpoint base</label>
          <div class="cfg-secret-row">
            <input id="cfg-BB_ENDPOINT_BASE" type="password" value="${v('BB_ENDPOINT_BASE','https://app.builderbot.cloud')}" placeholder="https://app.builderbot.cloud" autocomplete="off" spellcheck="false" />
            <button type="button" class="cfg-secret-toggle" data-toggle="cfg-BB_ENDPOINT_BASE">👁</button>
          </div>

          <label>Bot ID (API v2)</label>
          <div class="cfg-secret-row">
            <input id="cfg-BB_BOT_ID" type="password" value="${v('BB_BOT_ID')}" placeholder="xxxxxxxx-xxxx-..." autocomplete="off" spellcheck="false" />
            <button type="button" class="cfg-secret-toggle" data-toggle="cfg-BB_BOT_ID">👁</button>
          </div>

          <label>Project ID (API v1 manager)</label>
          <div class="cfg-secret-row">
            <input id="cfg-BB_PROJECT_ID" type="password" value="${v('BB_PROJECT_ID')}" placeholder="xxxxxxxx-xxxx-..." autocomplete="off" spellcheck="false" />
            <button type="button" class="cfg-secret-toggle" data-toggle="cfg-BB_PROJECT_ID">👁</button>
          </div>

          <label>API Manager · general (bbc-…) — estado y QR</label>
          <div class="cfg-secret-row">
            <input id="cfg-BB_MANAGER_API" type="password" value="${v('BB_MANAGER_API')}" placeholder="bbc-..." autocomplete="off" spellcheck="false" />
            <button type="button" class="cfg-secret-toggle" data-toggle="cfg-BB_MANAGER_API">👁</button>
          </div>
          <p class="muted" style="font-size:0.72rem;">🔒 Secreto. Solo DESARROLLADOR. Se usa para consultar estado y generar el QR.</p>

          <label>Teléfono del dueño (recibe el resumen diario)</label>
          <input id="cfg-WA_TELEFONO_DUENO" type="tel" inputmode="numeric" maxlength="10" value="${v('WA_TELEFONO_DUENO')}" placeholder="3001234567" />
          ` : ''}

          ${this.renderTemplate('WA_TEMPLATE_TICKET', 'Plantilla: ticket al cliente')}
          ${this.renderTemplate('WA_TEMPLATE_PLATO_LISTO', 'Plantilla: plato listo (mesero)')}
          ${this.renderTemplate('WA_TEMPLATE_CAJA_CUENTA', 'Plantilla: cuenta solicitada (caja)')}
          ${this.renderTemplate('WA_TEMPLATE_CIERRE', 'Plantilla: resumen diario al dueño')}`;

   case 'horario':
        return `
          <div class="grid-2">
            <div>
              <label>Hora de apertura (HH:mm)</label>
              <input id="cfg-RESTAURANTE_HORA_APERTURA" type="text" maxlength="5"
                     value="${v('RESTAURANTE_HORA_APERTURA', '11:00')}" placeholder="11:00" />
            </div>
            <div>
              <label>Hora de cierre (HH:mm)</label>
              <input id="cfg-RESTAURANTE_HORA_CIERRE" type="text" maxlength="5"
                     value="${v('RESTAURANTE_HORA_CIERRE', '22:00')}" placeholder="22:00" />
            </div>
          </div>
          <p class="muted" style="font-size:0.74rem;">
            Si el cierre es menor que la apertura (ej. 11:00 → 02:00), se entiende cierre al día siguiente.
          </p>`;

          case 'creditos':
        return `
          <label>Alerta de cupo (% del tope para ponerse amarillo)</label>
          <input id="cfg-CREDITO_ALERTA_PCT" type="number" min="1" max="100" step="1"
                 value="${v('CREDITO_ALERTA_PCT', '80')}" />
          <p class="muted" style="font-size:0.74rem;">
            Cuando un cliente particular llega a este % de su cupo, su tarjeta se pone amarilla.
          </p>
          ${this.renderTemplate('WA_TEMPLATE_CREDITO_VENTA',  'Plantilla: comprobante de venta a crédito')}
          ${this.renderTemplate('WA_TEMPLATE_CREDITO_CUENTA', 'Plantilla: estado de cuenta (Enviar cuenta)')}
          ${this.renderTemplate('WA_TEMPLATE_CREDITO_PAGO',   'Plantilla: confirmación de abono')}`;

      case 'reservas':
        return `
          ${dev ? `
          <label>ID del grupo de WhatsApp del equipo</label>
          <input id="cfg-WA_GRUPO_RESERVAS_ID" type="text" value="${v('WA_GRUPO_RESERVAS_ID', 'GBtxT6Grel2DcU4sWrGnpx')}"
                 placeholder="GBtxT6Grel2DcU4sWrGnpx" />
          <p class="muted" style="font-size:0.72rem;">
            ID alfanumérico del grupo en BuilderBot. Es donde llegan las solicitudes nuevas para que el equipo confirme o rechace.
          </p>

          <label>URL base del sitio público de reservas</label>
          <input id="cfg-RESERVAS_URL_PUBLICA" type="url" value="${v('RESERVAS_URL_PUBLICA')}"
                 placeholder="https://reservas.tu-dominio.com" />
          <p class="muted" style="font-size:0.72rem;">
            Sin el parámetro <code>?token=</code>. Se usa para construir el link que se envía al cliente en el WhatsApp #1.
          </p>` : ''}

          ${this.renderTemplate('WA_TEMPLATE_RESERVA_CLIENTE',      'Plantilla #1: solicitud recibida (al cliente)')}
          ${this.renderTemplate('WA_TEMPLATE_RESERVA_GRUPO',        'Plantilla #2: nueva solicitud (al equipo del grupo)')}
          ${this.renderTemplate('WA_TEMPLATE_RESERVA_CONFIRMACION', 'Plantilla #3: confirmación o rechazo (al cliente)')}`;
    }
    return '';
  },

  renderTemplate(clave, label) {
    const dev = this.esDev();
    const valor = String(this.cfg[clave] == null ? '' : this.cfg[clave]);
    const defStr = this.DEFAULTS[clave] || '';
    // Camino A: el textarea SIEMPRE muestra contenido editable. Si la hoja
    // está vacía, precargamos el default REAL del backend para que el DEV
    // vea y edite el texto verdadero (no uno pobre).
    const textoMostrado = valor || defStr;
    const previewStr = this.calcularPreview(textoMostrado);
    return `
      <div class="cfg-template">
        <label>${escapeHtml(label)}</label>
        <textarea id="cfg-${clave}" rows="9" ${dev ? '' : 'readonly'}
                  placeholder="Plantilla por defecto">${escapeHtml(textoMostrado)}</textarea>
        <p class="muted" style="font-size:0.7rem; margin: 2px 0 6px;">
          ${dev
            ? (valor ? 'Plantilla personalizada activa.' : 'Mostrando la plantilla por defecto. Edítala y guarda para personalizarla.')
            : '🔒 Solo lectura. Solo el DESARROLLADOR puede editar las plantillas.'}
        </p>
        <div class="cfg-preview-label">Vista previa con datos de ejemplo:</div>
        <pre class="cfg-preview" id="cfg-preview-${clave}">${escapeHtml(previewStr)}</pre>
      </div>`;
  },

  calcularPreview(template) {
    let out = String(template || '');
    Object.entries(this.PREVIEW_DATA).forEach(([k, v]) => {
      out = out.split('{' + k + '}').join(v);
    });
    return out;
  },

  actualizarPreview(clave) {
    const ta = $('#cfg-' + clave);
    const prev = $('#cfg-preview-' + clave);
    if (!ta || !prev) return;
    const valor = ta.value || this.DEFAULTS[clave] || '';
    prev.textContent = this.calcularPreview(valor);
  },

  // ── Validaciones por sección ──────────────────────────────
  validarSeccion(key, datos) {
    if (key === 'datos') {
      const rs = String(datos.RESTAURANTE_RAZON_SOCIAL || '').trim();
      if (rs.length < 3) return 'Razón social debe tener al menos 3 caracteres';
      const url = String(datos.RESTAURANTE_LOGO_URL || '').trim();
      if (url && !/^https?:\/\//.test(url)) return 'La URL del logo debe empezar con https://';
    }
    if (key === 'operacion') {
      const d = Number(datos.CAJA_DESCUENTO_MAX_PCT);
      if (!(d >= 0 && d <= 100)) return 'Descuento máximo entre 0 y 100';
      const p = Number(datos.PROPINA_SUGERIDA_PCT);
      if (!(p >= 0 && p <= 30)) return 'Propina sugerida entre 0 y 30';
    }
    if (key === 'tiempos') {
      const cw = Number(datos.COCINA_WARN_MIN), cl = Number(datos.COCINA_LATE_MIN);
      const xw = Number(datos.CAJA_WARN_MIN),   xl = Number(datos.CAJA_LATE_MIN);
      if (!(cw >= 1 && cw <= 120)) return 'Cocina amarillo entre 1 y 120 min';
      if (!(cl >= 1 && cl <= 120)) return 'Cocina rojo entre 1 y 120 min';
      if (cl <= cw) return 'Cocina rojo debe ser mayor que cocina amarillo';
      if (!(xw >= 1 && xw <= 60))  return 'Caja amarillo entre 1 y 60 min';
      if (!(xl >= 1 && xl <= 60))  return 'Caja rojo entre 1 y 60 min';
      if (xl <= xw) return 'Caja rojo debe ser mayor que caja amarillo';
    }
    if (key === 'whatsapp') {
      const u = String(datos.BB_API_URL || '').trim();
      if (u && !/^https?:\/\//.test(u)) return 'La URL del bot debe empezar con https://';
      const t = String(datos.WA_TELEFONO_DUENO || '').trim();
      if (t && !/^3\d{9}$/.test(t)) return 'Teléfono del dueño debe ser celular Colombia (10 dígitos, inicia en 3)';
    }
if (key === 'horario') {
      const re = /^\d{2}:\d{2}$/;
      const ha = String(datos.RESTAURANTE_HORA_APERTURA || '').trim();
      const hc = String(datos.RESTAURANTE_HORA_CIERRE || '').trim();
      if (!re.test(ha)) return 'Hora de apertura debe tener formato HH:mm';
      if (!re.test(hc)) return 'Hora de cierre debe tener formato HH:mm';
      const [ah, am] = ha.split(':').map(Number);
      const [ch, cm] = hc.split(':').map(Number);
      if (ah > 23 || am > 59 || ch > 23 || cm > 59) return 'Hora inválida (rango 00:00 - 23:59)';
    }
    if (key === 'reservas') {
      const idg = String(datos.WA_GRUPO_RESERVAS_ID || '').trim();
      if (!idg) return 'ID del grupo de WhatsApp requerido';
      if (idg.length < 8) return 'ID del grupo demasiado corto (mínimo 8 caracteres)';
      const url = String(datos.RESERVAS_URL_PUBLICA || '').trim();
      if (url && !/^https?:\/\//.test(url)) return 'La URL del sitio público debe empezar con https:// (o http://)';
      // Las 3 plantillas no son obligatorias (vacío = usar la del config inicial)
      // pero si están, deben tener algo razonable
      ['WA_TEMPLATE_RESERVA_CLIENTE','WA_TEMPLATE_RESERVA_GRUPO','WA_TEMPLATE_RESERVA_CONFIRMACION'].forEach(k => {});
    }
    return null;
  },

  // ── Mapeo sección → claves ────────────────────────────────
 clavesDeSeccion(key) {
    switch (key) {
      case 'datos':     return ['RESTAURANTE_RAZON_SOCIAL','RESTAURANTE_NIT','RESTAURANTE_TELEFONO',
                                'RESTAURANTE_DIRECCION','RESTAURANTE_LOGO_URL','RESTAURANTE_TICKET_PIE'];
      case 'operacion': return ['CAJA_DESCUENTO_MAX_PCT','PROPINA_SUGERIDA_PCT'];
      case 'tiempos':   return ['COCINA_WARN_MIN','COCINA_LATE_MIN','CAJA_WARN_MIN','CAJA_LATE_MIN'];
      case 'whatsapp':  return ['BB_API_URL','BB_API_KEY','BB_ENDPOINT_BASE','BB_BOT_ID',
                                'BB_PROJECT_ID','BB_MANAGER_API','WA_TELEFONO_DUENO',
                                'WA_TEMPLATE_TICKET','WA_TEMPLATE_PLATO_LISTO',
                                'WA_TEMPLATE_CAJA_CUENTA','WA_TEMPLATE_CIERRE'];
      case 'horario':   return ['RESTAURANTE_HORA_APERTURA','RESTAURANTE_HORA_CIERRE'];
      case 'reservas':  return ['WA_GRUPO_RESERVAS_ID','RESERVAS_URL_PUBLICA',
                                'WA_TEMPLATE_RESERVA_CLIENTE','WA_TEMPLATE_RESERVA_GRUPO',
                                'WA_TEMPLATE_RESERVA_CONFIRMACION'];
      case 'creditos':  return ['CREDITO_ALERTA_PCT',
                                'WA_TEMPLATE_CREDITO_VENTA','WA_TEMPLATE_CREDITO_CUENTA',
                                'WA_TEMPLATE_CREDITO_PAGO'];
    }
    return [];
  },

  async guardarSeccion(key) {
    if (this.guardando) return;
    // Blindaje: WhatsApp y Reservas solo las guarda el DESARROLLADOR
    if ((key === 'whatsapp' || key === 'reservas') && !this.esDev()) {
      return alertWarn('Solo lectura', 'Solo el DESARROLLADOR puede editar esta sección.');
    }
    const claves = this.clavesDeSeccion(key);
    const datos = {};
    claves.forEach(k => {
      const el = $('#cfg-' + k);
      if (el) datos[k] = el.value;
    });
    const err = this.validarSeccion(key, datos);
    if (err) return alertWarn('Revisa los datos', err);

    this.guardando = true;
    startLoading();
    try {
      await apiPost('setConfig', withUser({ seccion: key.toUpperCase(), config: datos }));
      // Sincronizar estado local + invalidar cache global
      claves.forEach(k => { this.cfg[k] = datos[k]; });
      Config.invalidate();
      stopLoading();
      this.guardando = false;
      Toast && Toast.fire({ icon: 'success', title: 'Sección guardada' });
    } catch (e) {
      stopLoading();
      this.guardando = false;
      alertErr('Error al guardar', e.message);
    }
  },

  async subirLogo(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alertWarn('Imagen muy grande', 'Máximo 4 MB.');
      inputEl.value = '';
      return;
    }
    startLoading();
    try {
      const base64 = await fileToBase64(file);
      const r = await apiPost('subirLogoConfig', withUser({
        filename: file.name, base64
      }));
      // Actualizar input + preview, pero NO guardar todavía:
      // el usuario debe hacer "Guardar sección" para persistir.
      const inp = $('#cfg-RESTAURANTE_LOGO_URL');
      const img = $('#cfg-logo-preview');
      if (inp) inp.value = r.url;
      if (img) img.src   = r.url;
      stopLoading();
      Toast && Toast.fire({
        icon: 'info',
        title: 'Logo subido — recuerda guardar la sección'
      });
    } catch (e) {
      stopLoading();
      alertErr('No se pudo subir el logo', e.message);
    } finally {
      inputEl.value = '';
    }
  },

  desenganchar() { /* sin listeners persistentes */ },
  setupListeners() { /* binds se hacen en render() */ }
};

/* ============================================================
   ============================================================
   FASE 6 / BLOQUE K — VISTA AUDITORÍA
   Bitácora forense con filtros, agrupación por día, scroll
   infinito y export CSV. Solo SUPER + CONTADOR.
   ============================================================
   ============================================================ */
const Auditoria = {
  items: [],
  filtros: { desde: '', hasta: '', usuarioId: '', modulo: '', busqueda: '' },
  periodoActivo: '7d',
  offset: 0,
  limit: 100,
  total: 0,
  hasMore: false,
  cargando: false,
  filtrosCatalogo: { usuarios: [], modulos: [] },

  // ── Mapper de emojis por acción (semántico, no por módulo) ─────
  emojiPorAccion(accion) {
    const a = String(accion || '').toUpperCase();
    if (/COBRA|PAGO|PAGAD/.test(a))             return '💰';
    if (/CANCELA|ELIMINA/.test(a))              return '❌';
    if (/CREAD|NUEVO/.test(a))                  return '✨';
    if (/ACTUALIZA|EDITAD|TOGGLE/.test(a))      return '✏️';
    if (/LOGIN|AUTH/.test(a))                   return '🔐';
    if (/CONFIG|LOGO|FOTO|IMAGEN/.test(a))      return '🔧';
    if (/ANCLA|CIERRE/.test(a))                 return '🌙';
    if (/STOCK|INVENTARIO/.test(a))             return '📦';
    if (/TICKET|CUENTA/.test(a))                return '🧾';
    return '📝';
  },

  async abrir() {
    showView('auditoria');
    // Período por defecto: 7 días
    this.aplicarPeriodo('7d', false);
    await this.cargarCatalogoFiltros();
    await this.cargar(true);
  },

  async cargarCatalogoFiltros() {
    try {
      const r = await apiPost('listAuditoriaFiltros', withUser({}));
      this.filtrosCatalogo = r || { usuarios: [], modulos: [] };
    } catch (e) {
      console.error('listAuditoriaFiltros:', e);
      this.filtrosCatalogo = { usuarios: [], modulos: [] };
    }
  },

  async cargar(reset) {
    if (this.cargando) return;
    this.cargando = true;
    if (reset) {
      this.items = [];
      this.offset = 0;
      this.pintarLoading();
    } else {
      this.pintarLoadMoreSpinner();
    }
    try {
      const r = await apiPost('listAuditoria', withUser({
        ...this.filtros,
        offset: this.offset,
        limit: this.limit
      }));
      this.items = this.items.concat(r.items || []);
      this.offset += (r.items || []).length;
      this.total = r.total || 0;
      this.hasMore = !!r.hasMore;
      this.render();
    } catch (e) {
      this.pintarError(e.message);
    } finally {
      this.cargando = false;
    }
  },

  pintarLoading() {
    const cont = $('#aud-content');
    if (cont) cont.innerHTML = `
      <div class="aud-loading">
        <div class="spinner">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p class="muted">Cargando registros…</p>
      </div>`;
    const foot = $('#aud-footer-load');
    if (foot) foot.innerHTML = '';
  },

  pintarLoadMoreSpinner() {
    const foot = $('#aud-footer-load');
    if (foot) foot.innerHTML = `<div class="aud-loading-mini">Cargando 100 más…</div>`;
  },

  pintarError(msg) {
    const cont = $('#aud-content');
    if (cont) cont.innerHTML = `
      <div class="card text-center">
        <h3>Error al cargar</h3>
        <p class="muted">${escapeHtml(msg || '')}</p>
        <button class="btn btn-ghost mt-md" id="aud-btn-retry">Reintentar</button>
      </div>`;
    $('#aud-btn-retry')?.addEventListener('click', () => this.cargar(true));
  },

  render() {
    // 1. Actualizar contadores y label del período
    $('#aud-total').textContent = this.total.toLocaleString('es-CO');
    $('#aud-total-s').textContent = this.total === 1 ? '' : 's';
    $('#aud-period-label').textContent = this.labelPeriodo();

    // 2. Pills
    this.actualizarPills();

    // 3. Lista
    const cont = $('#aud-content');
    if (!this.items.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:20px;">
          <div style="font-size:2.4rem; opacity:0.4;">🔍</div>
          <h3>Sin resultados</h3>
          <p class="muted">No hay registros con los filtros actuales.</p>
        </div>`;
      $('#aud-footer-load').innerHTML = '';
      return;
    }

    // Agrupar por yyyy-MM-dd (extraído del prefijo de FECHA)
    const grupos = {};
    this.items.forEach(it => {
      const dia = String(it.fecha || '').substring(0, 10); // yyyy-MM-dd
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(it);
    });
    const diasOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

    cont.innerHTML = diasOrdenados.map(dia => {
      const items = grupos[dia];
      return `
        <section class="aud-dia">
          <header class="aud-dia__head">
            <span class="aud-dia__icon">📌</span>
            <span class="aud-dia__lbl">${this.etiquetaDia(dia)}</span>
            <span class="aud-dia__count">${items.length}</span>
          </header>
          <div class="aud-dia__body">
            ${items.map(it => this.renderCard(it)).join('')}
          </div>
        </section>`;
    }).join('');

    // Tap en card → modal con JSON
    $$('[data-aud-card]', cont).forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.audCard;
        const it = this.items.find(x => String(x.id) === String(id));
        if (it) this.abrirModalDetalle(it);
      });
    });

    // Footer "Cargar más"
    const foot = $('#aud-footer-load');
    if (this.hasMore) {
      foot.innerHTML = `<button class="btn btn-ghost btn-block" id="aud-btn-more">Cargar 100 más</button>`;
      $('#aud-btn-more').addEventListener('click', () => this.cargar(false));
    } else if (this.items.length) {
      foot.innerHTML = `<div class="aud-end">— Fin de los resultados —</div>`;
    } else {
      foot.innerHTML = '';
    }
  },

  renderCard(it) {
    const hora = String(it.fecha || '').substring(11, 16); // HH:mm
    const horaAmPm = this.formatearHora12(hora);
    const emoji = this.emojiPorAccion(it.accion);
    const rolKey = String(it.rol || '').toLowerCase();
    const iniciales = this.iniciales(it.nombreUsuario);
    const avatarHTML = it.fotoUrl
      ? `<img class="aud-card__avatar-img" src="${escapeHtml(it.fotoUrl)}" alt="" onerror="this.remove()" />`
      : '';
    const resumen = this.resumenDetalle(it.detalle);
    return `
      <article class="aud-card" data-aud-card="${escapeHtml(it.id)}">
        <div class="aud-card__hora">${escapeHtml(horaAmPm)}</div>
        <div class="aud-card__body">
          <div class="aud-card__head">
            <div class="aud-card__avatar aud-card__avatar--${rolKey}">
              <span class="aud-card__avatar-txt">${escapeHtml(iniciales)}</span>
              ${avatarHTML}
            </div>
            <div class="aud-card__who">
              <div class="aud-card__name">${escapeHtml(it.nombreUsuario || 'Sistema')}</div>
              <div class="aud-card__rol">${escapeHtml(it.rol || '—')}</div>
            </div>
          </div>
          <div class="aud-card__action">
            <span class="aud-card__emoji">${emoji}</span>
            <span class="aud-card__modulo">${escapeHtml(it.modulo || '')}</span>
            <span class="aud-card__sep">·</span>
            <span class="aud-card__accion">${escapeHtml(it.accion || '')}</span>
          </div>
          ${resumen ? `<div class="aud-card__resumen">${resumen}</div>` : ''}
        </div>
        <div class="aud-card__chev">›</div>
      </article>`;
  },

  // ── Helpers de presentación ─────────────────────────────────────
  iniciales(nombre) {
    const partes = String(nombre || '?').trim().split(/\s+/);
    if (!partes.length || !partes[0]) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  },

  formatearHora12(hhmm) {
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return '—';
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return (h12 < 10 ? '0' : '') + h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  },

  etiquetaDia(yyyyMmDd) {
    // Formato pedido: "Martes, 26 de mayo de 2026"
    if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd;
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    let s = dt.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    // Capitalizar primera letra (toLocaleDateString devuelve "martes,")
    s = s.charAt(0).toUpperCase() + s.slice(1);
    // Prefijo "Hoy / Ayer" si aplica
    const hoy = this.fechaYyyyMmDdLocal();
    const ayer = this.fechaYyyyMmDdLocalOffset(-1);
    if (yyyyMmDd === hoy)  return 'HOY — ' + s;
    if (yyyyMmDd === ayer) return 'AYER — ' + s;
    return s;
  },

  fechaYyyyMmDdLocal(d) {
    d = d || new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  },
  fechaYyyyMmDdLocalOffset(deltaDias) {
    const d = new Date();
    d.setDate(d.getDate() + deltaDias);
    return this.fechaYyyyMmDdLocal(d);
  },

  resumenDetalle(detalleStr) {
    if (!detalleStr) return '';
    let obj;
    try { obj = JSON.parse(detalleStr); }
    catch (_) { return escapeHtml(String(detalleStr).substring(0, 100)); }
    if (!obj || typeof obj !== 'object') return '';

    // Heurísticas: prioriza campos que el usuario va a reconocer
    const partes = [];
    if (obj.mesaNumero != null) partes.push('Mesa ' + obj.mesaNumero);
    if (obj.nombre) partes.push(escapeHtml(obj.nombre));
    if (obj.total != null) partes.push(fmtPesos(obj.total));
    if (obj.totalVentas != null) partes.push(fmtPesos(obj.totalVentas));
    if (obj.rol) partes.push('rol: ' + escapeHtml(obj.rol));
    if (obj.pedidoId) partes.push(escapeHtml(obj.pedidoId));
    if (obj.productoId) partes.push(escapeHtml(obj.productoId));
    if (obj.motivo) partes.push('motivo: ' + escapeHtml(obj.motivo));
    if (obj.fecha) partes.push('fecha: ' + escapeHtml(obj.fecha));

    if (!partes.length) {
      // Fallback: primer key=value
      const k = Object.keys(obj)[0];
      if (k) {
        const v = obj[k];
        const vstr = (typeof v === 'object') ? JSON.stringify(v) : String(v);
        partes.push(escapeHtml(k + ': ' + vstr.substring(0, 50)));
      }
    }
    return partes.slice(0, 3).join(' · ');
  },

  labelPeriodo() {
    const map = {
      hoy:    'Hoy',
      ayer:   'Ayer',
      '7d':   'Últimos 7 días',
      mes:    'Este mes',
      todo:   'Todo el histórico',
      custom: this.filtros.desde === this.filtros.hasta
                ? this.filtros.desde
                : (this.filtros.desde + ' → ' + this.filtros.hasta)
    };
    return map[this.periodoActivo] || '';
  },

  // ── Pills (usuario + módulo) ────────────────────────────────────
  actualizarPills() {
    const pu = $('#aud-pill-usuario');
    const pm = $('#aud-pill-modulo');
    if (pu) {
      if (this.filtros.usuarioId) {
        const u = this.filtrosCatalogo.usuarios.find(x => x.id === this.filtros.usuarioId);
        pu.querySelector('.aud-pill__lbl').textContent = u ? u.nombre : this.filtros.usuarioId;
        pu.querySelector('.aud-pill__x').classList.remove('hidden');
        pu.classList.add('is-active');
      } else {
        pu.querySelector('.aud-pill__lbl').textContent = 'Todos los usuarios';
        pu.querySelector('.aud-pill__x').classList.add('hidden');
        pu.classList.remove('is-active');
      }
    }
    if (pm) {
      if (this.filtros.modulo) {
        pm.querySelector('.aud-pill__lbl').textContent = this.filtros.modulo;
        pm.querySelector('.aud-pill__x').classList.remove('hidden');
        pm.classList.add('is-active');
      } else {
        pm.querySelector('.aud-pill__lbl').textContent = 'Todos los módulos';
        pm.querySelector('.aud-pill__x').classList.add('hidden');
        pm.classList.remove('is-active');
      }
    }
  },

  abrirPillUsuario() {
    const opciones = this.filtrosCatalogo.usuarios;
    const items = [`<button class="aud-opt" data-aud-usr="">
        <span class="aud-opt__avatar aud-opt__avatar--neutral">·</span>
        <span>Todos los usuarios</span>
      </button>`]
      .concat(opciones.map(u => {
        const rolKey = String(u.rol || '').toLowerCase();
        const ini = this.iniciales(u.nombre);
        const img = u.fotoUrl
          ? `<img class="aud-opt__avatar-img" src="${escapeHtml(u.fotoUrl)}" alt="" onerror="this.remove()" />`
          : '';
        return `
          <button class="aud-opt" data-aud-usr="${escapeHtml(u.id)}">
            <span class="aud-opt__avatar aud-opt__avatar--${rolKey}">
              <span class="aud-opt__avatar-txt">${escapeHtml(ini)}</span>
              ${img}
            </span>
            <span>${escapeHtml(u.nombre)}</span>
            <span class="aud-opt__rol">${escapeHtml(u.rol || '')}</span>
          </button>`;
      }));
    Swal.fire({
      title: 'Filtrar por usuario',
      html: `<div class="aud-opts">${items.join('')}</div>`,
      width: 480,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      didOpen: () => {
        $$('[data-aud-usr]').forEach(b => {
          b.addEventListener('click', () => {
            this.filtros.usuarioId = b.dataset.audUsr || '';
            Swal.close();
            this.cargar(true);
          });
        });
      }
    });
  },

  abrirPillModulo() {
    const opciones = this.filtrosCatalogo.modulos;
    const items = [`<button class="aud-opt" data-aud-mod="">
        <span class="aud-opt__icon">📦</span><span>Todos los módulos</span>
      </button>`]
      .concat(opciones.map(m => `
        <button class="aud-opt" data-aud-mod="${escapeHtml(m)}">
          <span class="aud-opt__icon">${this.emojiPorAccion(m)}</span>
          <span>${escapeHtml(m)}</span>
        </button>`));
    Swal.fire({
      title: 'Filtrar por módulo',
      html: `<div class="aud-opts">${items.join('')}</div>`,
      width: 420,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      didOpen: () => {
        $$('[data-aud-mod]').forEach(b => {
          b.addEventListener('click', () => {
            this.filtros.modulo = b.dataset.audMod || '';
            Swal.close();
            this.cargar(true);
          });
        });
      }
    });
  },

  // ── Período ─────────────────────────────────────────────────────
  aplicarPeriodo(periodo, recargar) {
    this.periodoActivo = periodo;
    const hoy  = this.fechaYyyyMmDdLocal();
    const ayer = this.fechaYyyyMmDdLocalOffset(-1);
    const hace7 = this.fechaYyyyMmDdLocalOffset(-6);
    const primMes = (() => {
      const d = new Date();
      d.setDate(1);
      return this.fechaYyyyMmDdLocal(d);
    })();
    switch (periodo) {
      case 'hoy':   this.filtros.desde = hoy;     this.filtros.hasta = hoy; break;
      case 'ayer':  this.filtros.desde = ayer;    this.filtros.hasta = ayer; break;
      case '7d':    this.filtros.desde = hace7;   this.filtros.hasta = hoy; break;
      case 'mes':   this.filtros.desde = primMes; this.filtros.hasta = hoy; break;
      case 'todo':  this.filtros.desde = '';      this.filtros.hasta = ''; break;
    }
    $$('.aud-chip', $('#aud-chips-periodo')).forEach(c => {
      c.classList.toggle('is-active', c.dataset.periodo === periodo);
    });
    if (recargar) this.cargar(true);
  },

  abrirPickerCustom() {
    Swal.fire({
      title: 'Período personalizado',
      html: `
        <label>Desde</label>
        <input id="aud-desde" type="date" value="${this.filtros.desde || ''}" />
        <label>Hasta</label>
        <input id="aud-hasta" type="date" value="${this.filtros.hasta || ''}" />`,
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const d = $('#aud-desde').value;
        const h = $('#aud-hasta').value;
        if (!d || !h) { Swal.showValidationMessage('Llena ambas fechas'); return false; }
        if (d > h) { Swal.showValidationMessage('Desde no puede ser mayor que hasta'); return false; }
        return { d, h };
      }
    }).then(r => {
      if (!r.isConfirmed) {
        // Restaurar el chip activo previo (no quedó nada seleccionado por error)
        $$('.aud-chip', $('#aud-chips-periodo')).forEach(c => {
          c.classList.toggle('is-active', c.dataset.periodo === this.periodoActivo);
        });
        return;
      }
      this.periodoActivo = 'custom';
      this.filtros.desde = r.value.d;
      this.filtros.hasta = r.value.h;
      $$('.aud-chip', $('#aud-chips-periodo')).forEach(c => {
        c.classList.toggle('is-active', c.dataset.periodo === 'custom');
      });
      this.cargar(true);
    });
  },

  // ── Modal de detalle (JSON completo) ────────────────────────────
  abrirModalDetalle(it) {
    let json;
    try { json = JSON.stringify(JSON.parse(it.detalle || '{}'), null, 2); }
    catch (_) { json = String(it.detalle || ''); }
    const fechaLarga = this.fechaLargaItem(it.fecha);
    const emoji = this.emojiPorAccion(it.accion);
    Swal.fire({
      title: emoji + ' ' + escapeHtml(it.accion || ''),
      html: `
        <div class="aud-modal">
          <div class="aud-modal__meta">
            <div class="aud-modal__row"><span>📅</span> ${escapeHtml(fechaLarga)}</div>
            <div class="aud-modal__row"><span>👤</span> ${escapeHtml(it.nombreUsuario || '—')} <span class="aud-modal__rol">${escapeHtml(it.rol || '')}</span></div>
            <div class="aud-modal__row"><span>📦</span> Módulo: <b>${escapeHtml(it.modulo || '')}</b></div>
            <div class="aud-modal__row"><span>🆔</span> ${escapeHtml(it.id)}</div>
          </div>
          <div class="aud-modal__detalle-lbl">DETALLE</div>
          <pre class="aud-modal__json">${escapeHtml(json)}</pre>
        </div>`,
      width: 560,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar'
    });
  },

  fechaLargaItem(fechaStr) {
    // "yyyy-MM-dd HH:mm:ss" → "Martes, 26 de mayo de 2026, 02:34:11 PM"
    if (!fechaStr) return '—';
    const [fecha, hora] = String(fechaStr).split(' ');
    if (!fecha || !hora) return fechaStr;
    const [y, m, d] = fecha.split('-').map(Number);
    const [hh, mm, ss] = hora.split(':').map(Number);
    const dt = new Date(y, m - 1, d, hh, mm, ss);
    let dia = dt.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    dia = dia.charAt(0).toUpperCase() + dia.slice(1);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh === 0 ? 12 : (hh > 12 ? hh - 12 : hh);
    const horaStr = (h12 < 10 ? '0' : '') + h12 + ':' +
                    (mm < 10 ? '0' : '') + mm + ':' +
                    (ss < 10 ? '0' : '') + ss + ' ' + ampm;
    return dia + ', ' + horaStr;
  },

  // ── Exportar CSV ────────────────────────────────────────────────
  exportarCSV() {
    if (!this.items.length) {
      Toast && Toast.fire({ icon: 'info', title: 'No hay datos para exportar' });
      return;
    }
    const headers = ['ID','FECHA','USUARIO_ID','NOMBRE_USUARIO','ROL','MODULO','ACCION','DETALLE'];
    const escapar = (v) => {
      const s = String(v == null ? '' : v).replace(/"/g, '""');
      return '"' + s + '"';
    };
    const lines = [headers.join(',')];
    this.items.forEach(it => {
      lines.push([
        it.id, it.fecha, it.usuarioId, it.nombreUsuario,
        it.rol, it.modulo, it.accion, it.detalle
      ].map(escapar).join(','));
    });
    // BOM para Excel/Sheets reconozca UTF-8
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = this.fechaYyyyMmDdLocal().replace(/-/g, '') + '_' +
               String(new Date().getHours()).padStart(2, '0') +
               String(new Date().getMinutes()).padStart(2, '0');
    a.download = 'auditoria_' + ts + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Toast && Toast.fire({ icon: 'success', title: 'CSV descargado' });
  },

  desenganchar() { /* sin listeners persistentes */ },

  setupListeners() {
    // Chips de período
    $$('.aud-chip', $('#aud-chips-periodo')).forEach(c => {
      if (c._bound) return;
      c._bound = true;
      c.addEventListener('click', () => {
        const p = c.dataset.periodo;
        if (p === 'custom') return this.abrirPickerCustom();
        this.aplicarPeriodo(p, true);
      });
    });
    // Pills
    const pu = $('#aud-pill-usuario');
    if (pu && !pu._bound) {
      pu._bound = true;
      pu.addEventListener('click', (e) => {
        if (e.target.classList.contains('aud-pill__x')) {
          this.filtros.usuarioId = '';
          this.cargar(true);
          return;
        }
        this.abrirPillUsuario();
      });
    }
    const pm = $('#aud-pill-modulo');
    if (pm && !pm._bound) {
      pm._bound = true;
      pm.addEventListener('click', (e) => {
        if (e.target.classList.contains('aud-pill__x')) {
          this.filtros.modulo = '';
          this.cargar(true);
          return;
        }
        this.abrirPillModulo();
      });
    }
    // Búsqueda
    const btn = $('#aud-search-btn');
    const bar = $('#aud-search-bar');
    const inp = $('#aud-search-input');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', () => {
        bar.classList.toggle('hidden');
        if (!bar.classList.contains('hidden')) inp.focus();
        else { inp.value = ''; this.filtros.busqueda = ''; this.cargar(true); }
      });
    }
    if (inp && !inp._bound) {
      inp._bound = true;
      let t = null;
      inp.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          this.filtros.busqueda = inp.value.trim();
          this.cargar(true);
        }, 350);
      });
    }
    // CSV
    const csv = $('#aud-csv');
    if (csv && !csv._bound) {
      csv._bound = true;
      csv.addEventListener('click', () => this.exportarCSV());
    }
  }
};

/* ============================================================
   ============================================================
   FASE 6 / BLOQUE L — VISTA BALANCES
   ============================================================
   Dashboard analítico del negocio con KPIs, charts SVG hechos a
   mano, top productos / meseros / horas pico y bloque de insights
   en lenguaje natural. Solo SUPER + CONTADOR.
   ============================================================
   ============================================================ */
const Balances = {
  periodoActivo: 'semana',
  desde: '',
  hasta: '',
  data: null,
  cargando: false,

  async abrir() {
    showView('balances');
    this.aplicarPeriodo('semana', false);
    await this.cargar();
  },

  // ── Períodos ────────────────────────────────────────────────────
  aplicarPeriodo(periodo, recargar) {
    this.periodoActivo = periodo;
    const hoy = this.hoyYmd();
    switch (periodo) {
      case 'hoy':
        this.desde = hoy; this.hasta = hoy; break;
      case 'semana': {
        // Lunes a hoy (si es lunes, solo el lunes). Si querían lun-dom siempre,
        // habría que tomar lun de la semana actual hasta su domingo (puede ser futuro).
        // Defaulteo a "lunes de esta semana → hoy" — más útil real-time.
        const d = new Date();
        const dow = d.getDay() || 7;   // 1..7 (lunes=1, domingo=7)
        const lun = new Date(d);
        lun.setDate(d.getDate() - (dow - 1));
        this.desde = this.dateToYmd(lun);
        this.hasta = hoy;
        break;
      }
      case 'mes': {
        const d = new Date();
        d.setDate(1);
        this.desde = this.dateToYmd(d);
        this.hasta = hoy;
        break;
      }
      case 'ano': {
        const d = new Date();
        this.desde = d.getFullYear() + '-01-01';
        this.hasta = hoy;
        break;
      }
    }
    $$('.aud-chip', $('#bal-chips-periodo')).forEach(c => {
      c.classList.toggle('is-active', c.dataset.periodo === periodo);
    });
    if (recargar) this.cargar();
  },

  abrirPickerCustom() {
    Swal.fire({
      title: 'Período personalizado',
      html: `
        <label>Desde</label>
        <input id="bal-desde" type="date" value="${this.desde || ''}" />
        <label>Hasta</label>
        <input id="bal-hasta" type="date" value="${this.hasta || ''}" />`,
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const d = $('#bal-desde').value;
        const h = $('#bal-hasta').value;
        if (!d || !h) { Swal.showValidationMessage('Llena ambas fechas'); return false; }
        if (d > h) { Swal.showValidationMessage('Desde no puede ser mayor que hasta'); return false; }
        return { d, h };
      }
    }).then(r => {
      if (!r.isConfirmed) {
        $$('.aud-chip', $('#bal-chips-periodo')).forEach(c => {
          c.classList.toggle('is-active', c.dataset.periodo === this.periodoActivo);
        });
        return;
      }
      this.periodoActivo = 'custom';
      this.desde = r.value.d;
      this.hasta = r.value.h;
      $$('.aud-chip', $('#bal-chips-periodo')).forEach(c => {
        c.classList.toggle('is-active', c.dataset.periodo === 'custom');
      });
      this.cargar();
    });
  },

  hoyYmd() {
    return this.dateToYmd(new Date());
  },
  dateToYmd(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  },
  ymdToDate(s) {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  labelPeriodo() {
    const map = {
      hoy:    'Hoy',
      semana: 'Esta semana',
      mes:    'Este mes',
      ano:    'Este año',
      custom: 'Período personalizado'
    };
    return map[this.periodoActivo] || '';
  },

  labelRango() {
    if (!this.desde || !this.hasta) return '—';
    const fmt = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      let str = dt.toLocaleDateString('es-CO', {
        weekday: 'short', day: 'numeric', month: 'short'
      });
      return str.replace('.', '');
    };
    if (this.desde === this.hasta) {
      const [y, m, d] = this.desde.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      let str = dt.toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    return fmt(this.desde) + ' → ' + fmt(this.hasta);
  },

  // ── Carga ───────────────────────────────────────────────────────
  async cargar() {
    if (this.cargando) return;
    this.cargando = true;
    this.pintarLoading();
    $('#bal-period-label').textContent = this.labelPeriodo();
    $('#bal-period-rango').textContent = this.labelRango();
    try {
      this.data = await apiPost('getBalance', withUser({
        desde: this.desde,
        hasta: this.hasta,
        comparativo: true
      }));
      this.render();
    } catch (e) {
      this.pintarError(e.message);
    } finally {
      this.cargando = false;
    }
  },

  pintarLoading() {
    const cont = $('#bal-content');
    if (cont) cont.innerHTML = `
      <div class="aud-loading">
        <div class="spinner">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p class="muted">Calculando balance…</p>
      </div>`;
  },

  pintarError(msg) {
    const cont = $('#bal-content');
    if (cont) cont.innerHTML = `
      <div class="card text-center">
        <h3>Error al cargar</h3>
        <p class="muted">${escapeHtml(msg || '')}</p>
        <button class="btn btn-ghost mt-md" id="bal-btn-retry">Reintentar</button>
      </div>`;
    $('#bal-btn-retry')?.addEventListener('click', () => this.cargar());
  },

  render() {
    const cont = $('#bal-content');
    if (!cont || !this.data) return;
    const d = this.data.actual;
    if (d.totalPedidos === 0) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:20px;">
          <div style="font-size:2.4rem; opacity:0.4;">📊</div>
          <h3>Sin ventas en este período</h3>
          <p class="muted">No hay pedidos pagados entre ${escapeHtml(this.desde)} y ${escapeHtml(this.hasta)}.</p>
        </div>`;
      return;
    }

    cont.innerHTML = [
      this.renderKpis(),
      this.renderVentasPorDia(),
      this.renderTopProductos(),
      this.renderTopMeseros(),
      this.renderHorasPico(),
      this.renderMetodosPago(),
      this.renderCategorias(),
      this.renderClientes(),
      this.renderInsights()
    ].join('');

    // Bind taps
    $('#bal-ver-productos')?.addEventListener('click', () => this.abrirDetalleProductos());
    $('#bal-ver-meseros')?.addEventListener('click', () => this.abrirDetalleMeseros());
    $$('[data-bal-mesero]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.balMesero;
        const m = this.data.actual.topMeseros.find(x => x.id === id);
        if (m) this.abrirDetalleMesero(m);
      });
    });
  },

  // ── Render: KPIs hero ───────────────────────────────────────────
  renderKpis() {
    const a = this.data.actual;
    const ant = this.data.anterior;
    const pctVentas  = this.pctCambio(a.totalVentas, ant?.totalVentas);
    const pctPedidos = this.pctCambio(a.totalPedidos, ant?.totalPedidos);
    const pctTicket  = this.pctCambio(a.ticketPromedio, ant?.ticketPromedio);
    const totalMetodos = a.totalEfectivo + a.totalTransferencia;
    const pctEfectivo = totalMetodos > 0 ? Math.round(a.totalEfectivo / totalMetodos * 100) : 0;
    const pctTransfer = totalMetodos > 0 ? 100 - pctEfectivo : 0;

    return `
      <section class="bal-section bal-section--hero">
        <div class="bal-kpi-hero">
          <div class="bal-kpi-hero__icon">💰</div>
          <div class="bal-kpi-hero__main">
            <div class="bal-kpi-hero__lbl">Ventas totales</div>
            <div class="bal-kpi-hero__val">${fmtPesos(a.totalVentas)}</div>
            ${this.renderDelta(pctVentas, ant?.totalVentas, 'vs. período anterior')}
          </div>
        </div>
        <div class="bal-kpi-grid">
          <div class="bal-kpi">
            <div class="bal-kpi__icon">🧾</div>
            <div class="bal-kpi__val">${a.totalPedidos.toLocaleString('es-CO')}</div>
            <div class="bal-kpi__lbl">Pedidos</div>
            ${this.renderDeltaMini(pctPedidos)}
          </div>
          <div class="bal-kpi">
            <div class="bal-kpi__icon">🎯</div>
            <div class="bal-kpi__val">${fmtPesos(a.ticketPromedio)}</div>
            <div class="bal-kpi__lbl">Ticket promedio</div>
            ${this.renderDeltaMini(pctTicket)}
          </div>
          <div class="bal-kpi">
            <div class="bal-kpi__icon">💵</div>
            <div class="bal-kpi__val">${pctEfectivo}%</div>
            <div class="bal-kpi__lbl">Efectivo</div>
            <div class="bal-kpi__sub">${fmtPesos(a.totalEfectivo)}</div>
          </div>
          <div class="bal-kpi">
            <div class="bal-kpi__icon">📱</div>
            <div class="bal-kpi__val">${pctTransfer}%</div>
            <div class="bal-kpi__lbl">Transferencia</div>
            <div class="bal-kpi__sub">${fmtPesos(a.totalTransferencia)}</div>
          </div>
        </div>
      </section>`;
  },

  pctCambio(actual, anterior) {
    if (anterior == null) return null;
    if (!anterior) return actual > 0 ? 999 : 0;
    return Math.round(((actual - anterior) / anterior) * 100);
  },

  renderDelta(pct, valorAnterior, contexto) {
    if (pct == null) return '';
    const abs = Math.abs(pct);
    const isUp = pct > 0;
    const isFlat = pct === 0;
    const cls = isFlat ? 'flat' : (isUp ? 'up' : 'down');
    const arrow = isFlat ? '→' : (isUp ? '▲' : '▼');
    const display = pct >= 999 ? '+∞' : (pct >= 0 ? '+' : '-') + abs + '%';
    return `
      <div class="bal-delta bal-delta--${cls}">
        <span class="bal-delta__arrow">${arrow}</span>
        <span class="bal-delta__pct">${display}</span>
        <span class="bal-delta__ctx">${escapeHtml(contexto)}</span>
      </div>`;
  },

  renderDeltaMini(pct) {
    if (pct == null) return '';
    const isUp = pct > 0;
    const isFlat = pct === 0;
    const cls = isFlat ? 'flat' : (isUp ? 'up' : 'down');
    const arrow = isFlat ? '→' : (isUp ? '▲' : '▼');
    const display = (pct >= 0 ? '+' : '-') + Math.abs(pct) + '%';
    return `<div class="bal-delta-mini bal-delta-mini--${cls}">${arrow} ${display}</div>`;
  },

  // ── Render: Ventas por día (barras HTML legibles) ──────────────
  renderVentasPorDia() {
    const serie = this.data.actual.serieVentas || [];
    if (!serie.length) return '';
    const max = Math.max(...serie.map(d => d.ventas), 1);
    const mejor = this.data.actual.mejorDia;

    const barras = serie.map(d => {
      const h = Math.max(2, Math.round((d.ventas / max) * 100));
      const esBest = mejor && d.fecha === mejor.fecha;
      return `
        <div class="bal-bar2 ${esBest ? 'bal-bar2--best' : ''}"
             title="${escapeHtml(this.diaCortoConFecha(d.fecha))}: ${fmtPesos(d.ventas)} · ${d.pedidos} ped">
          <div class="bal-bar2__track"><div class="bal-bar2__fill" style="height:${h}%"></div></div>
          <div class="bal-bar2__lbl">${this.diaCorto(d.fecha)}</div>
        </div>`;
    }).join('');

    return `
      <section class="bal-section">
        <h3 class="bal-section__title">📈 Ventas por día</h3>
        <div class="bal-bars">${barras}</div>
        ${mejor ? `
          <div class="bal-chart__hint">
            🏆 Mejor día: <b>${this.diaLargoConFecha(mejor.fecha)}</b> con <b>${fmtPesos(mejor.ventas)}</b>
          </div>` : ''}
      </section>`;
  },

  diaCorto(ymd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dias = ['D','L','M','M','J','V','S'];
    return dias[dt.getDay()] + d;
  },
  diaCortoConFecha(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  },
  diaLargoConFecha(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    let s = dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  // ── Render: Top productos ──────────────────────────────────────
  renderTopProductos() {
    const top = (this.data.actual.topProductos || []).slice(0, 5);
    if (!top.length) return '';
    const maxQty = Math.max(...top.map(p => p.cantidad), 1);
    const medallas = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    return `
      <section class="bal-section">
        <div class="bal-section__head">
          <h3 class="bal-section__title">🍽️ Top 5 productos</h3>
          ${this.data.actual.topProductos.length > 5
            ? `<button id="bal-ver-productos" class="bal-section__more">Ver todos ›</button>` : ''}
        </div>
        <div class="bal-rank-list">
          ${top.map((p, i) => `
            <div class="bal-rank-row">
              <div class="bal-rank-row__medal">${medallas[i] || (i + 1)}</div>
              <div class="bal-rank-row__main">
                <div class="bal-rank-row__name">${escapeHtml(p.nombre)}</div>
                <div class="bal-rank-row__bar">
                  <div class="bal-rank-row__bar-fill" style="width:${(p.cantidad / maxQty * 100).toFixed(1)}%"></div>
                </div>
              </div>
              <div class="bal-rank-row__qty">${p.cantidad}×</div>
              <div class="bal-rank-row__amt">${fmtPesos(p.monto)}</div>
            </div>`).join('')}
        </div>
      </section>`;
  },

  // ── Render: Top meseros ────────────────────────────────────────
  renderTopMeseros() {
    const top = (this.data.actual.topMeseros || []).slice(0, 5);
    if (!top.length) return '';
    return `
      <section class="bal-section">
        <div class="bal-section__head">
          <h3 class="bal-section__title">👥 Top meseros</h3>
          ${this.data.actual.topMeseros.length > 5
            ? `<button id="bal-ver-meseros" class="bal-section__more">Ver todos ›</button>` : ''}
        </div>
        <div class="bal-meseros">
          ${top.map((m, i) => {
            const ini = this.iniciales(m.nombre);
            const rolKey = String(m.rol || '').toLowerCase();
            const img = m.fotoUrl
              ? `<img class="bal-mesero__avatar-img" src="${escapeHtml(m.fotoUrl)}" alt="" onerror="this.remove()" />`
              : '';
            return `
              <div class="bal-mesero" data-bal-mesero="${escapeHtml(m.id)}">
                <div class="bal-mesero__rank">${i + 1}</div>
                <div class="bal-mesero__avatar bal-mesero__avatar--${rolKey}">
                  <span class="bal-mesero__avatar-txt">${escapeHtml(ini)}</span>
                  ${img}
                </div>
                <div class="bal-mesero__body">
                  <div class="bal-mesero__name">${escapeHtml(m.nombre)}</div>
                <div class="bal-mesero__meta">${m.pedidos} ped · ticket ${fmtPesos(m.ticketPromedio)}${(m.propinas || 0) > 0 ? ' · 🎁 ' + fmtPesos(m.propinas) : ''}</div>
                </div>
                <div class="bal-mesero__ventas">${fmtPesos(m.ventas)}</div>
              </div>`;
          }).join('')}
        </div>
      </section>`;
  },

  iniciales(nombre) {
    const partes = String(nombre || '?').trim().split(/\s+/);
    if (!partes.length || !partes[0]) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  },

  // ── Render: Horas pico ─────────────────────────────────────────
  renderHorasPico() {
    const horas = (this.data.actual.horasPico || []).slice(0, 6);
    if (!horas.length) return '';
    const max = Math.max(...horas.map(h => h.cantidad), 1);
    return `
      <section class="bal-section">
        <h3 class="bal-section__title">⏰ Horas pico</h3>
        <div class="bal-horas">
          ${horas.map(h => {
            const pct = (h.cantidad / max * 100).toFixed(1);
            return `
              <div class="bal-hora-row">
                <div class="bal-hora-row__lbl">${this.horaAmPm(h.hora)}</div>
                <div class="bal-hora-row__bar">
                  <div class="bal-hora-row__bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="bal-hora-row__qty">${h.cantidad}</div>
              </div>`;
          }).join('')}
        </div>
        <div class="bal-chart__hint">
          🔥 Hora más fuerte: <b>${this.horaAmPm(horas[0].hora)}</b> con <b>${horas[0].cantidad} pagos</b>
        </div>
      </section>`;
  },

  horaAmPm(hh) {
    const h = parseInt(hh, 10);
    if (isNaN(h)) return hh;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return h12 + ':00 ' + ampm;
  },

  // ── Render: Métodos de pago (donut SVG) ────────────────────────
  renderMetodosPago() {
    const a = this.data.actual;
    const total = a.totalEfectivo + a.totalTransferencia;
    if (total <= 0) return '';
    const pctEf = a.totalEfectivo / total;
    const pctTr = 1 - pctEf;
    // Donut: circunferencia = 2πr (r=42) ≈ 263.89
    const r = 42, c = 2 * Math.PI * r;
    const offsetEf = c * pctEf;
    return `
      <section class="bal-section">
        <h3 class="bal-section__title">💳 Métodos de pago</h3>
        <div class="bal-donut-wrap">
          <svg viewBox="0 0 100 100" class="bal-donut">
            <circle cx="50" cy="50" r="${r}" class="bal-donut__bg" />
            <circle cx="50" cy="50" r="${r}" class="bal-donut__seg bal-donut__seg--ef"
                    stroke-dasharray="${offsetEf} ${c}"
                    transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r="${r}" class="bal-donut__seg bal-donut__seg--tr"
                    stroke-dasharray="${c - offsetEf} ${c}"
                    stroke-dashoffset="-${offsetEf}"
                    transform="rotate(-90 50 50)" />
            <text x="50" y="46" text-anchor="middle" class="bal-donut__total-lbl">Total</text>
            <text x="50" y="58" text-anchor="middle" class="bal-donut__total-val">${fmtPesos(total)}</text>
          </svg>
          <div class="bal-donut-legend">
            <div class="bal-donut-legend__row">
              <span class="bal-donut-legend__dot bal-donut-legend__dot--ef"></span>
              <span class="bal-donut-legend__lbl">💵 Efectivo</span>
              <span class="bal-donut-legend__val">${fmtPesos(a.totalEfectivo)} <b>(${Math.round(pctEf * 100)}%)</b></span>
            </div>
           <div class="bal-donut-legend__row">
              <span class="bal-donut-legend__dot bal-donut-legend__dot--tr"></span>
              <span class="bal-donut-legend__lbl">📱 Transferencia</span>
              <span class="bal-donut-legend__val">${fmtPesos(a.totalTransferencia)} <b>(${Math.round(pctTr * 100)}%)</b></span>
            </div>
            ${(a.totalPropinas || 0) > 0 ? `
            <div class="bal-donut-legend__row" style="border-top:1px dashed var(--border); padding-top:8px; margin-top:2px;">
              <span class="bal-donut-legend__dot" style="background:var(--accent);"></span>
              <span class="bal-donut-legend__lbl">🎁 Propinas <small>(no entran en ventas)</small></span>
              <span class="bal-donut-legend__val"><b>${fmtPesos(a.totalPropinas)}</b></span>
            </div>` : ''}
          </div>
        </div>
      </section>`;
  },

  // ── Render: Categorías ─────────────────────────────────────────
  renderCategorias() {
    const cats = this.data.actual.ventasCategoria || [];
    if (!cats.length) return '';
    const max = Math.max(...cats.map(c => c.monto), 1);
    return `
      <section class="bal-section">
        <h3 class="bal-section__title">📂 Ventas por categoría</h3>
        <div class="bal-rank-list">
          ${cats.map(c => `
            <div class="bal-rank-row bal-rank-row--cat">
              <div class="bal-rank-row__main">
                <div class="bal-rank-row__name">${escapeHtml(c.nombre)}</div>
                <div class="bal-rank-row__bar">
                  <div class="bal-rank-row__bar-fill bal-rank-row__bar-fill--cat"
                       style="width:${(c.monto / max * 100).toFixed(1)}%"></div>
                </div>
              </div>
              <div class="bal-rank-row__amt">${fmtPesos(c.monto)}</div>
            </div>`).join('')}
        </div>
      </section>`;
  },

  // ── Render: Clientes ───────────────────────────────────────────
  renderClientes() {
    const c = this.data.actual.clientes;
    if (!c || !c.total) return '';
    const pctConCli = c.total ? Math.round(c.conCliente / c.total * 100) : 0;
    return `
      <section class="bal-section">
        <h3 class="bal-section__title">👤 Clientes</h3>
        <div class="bal-clientes">
          <div class="bal-clientes__row">
            <span class="bal-clientes__icon">📊</span>
            <span class="bal-clientes__lbl">Pedidos totales</span>
            <span class="bal-clientes__val">${c.total}</span>
          </div>
          <div class="bal-clientes__row">
            <span class="bal-clientes__icon">👻</span>
            <span class="bal-clientes__lbl">Sin identificar</span>
            <span class="bal-clientes__val">${c.sinCliente} <b>(${100 - pctConCli}%)</b></span>
          </div>
          <div class="bal-clientes__row">
            <span class="bal-clientes__icon">✅</span>
            <span class="bal-clientes__lbl">Identificados</span>
            <span class="bal-clientes__val">${c.conCliente} <b>(${pctConCli}%)</b></span>
          </div>
          <div class="bal-clientes__row">
            <span class="bal-clientes__icon">🆕</span>
            <span class="bal-clientes__lbl">Clientes nuevos en el período</span>
            <span class="bal-clientes__val">${c.nuevos}</span>
          </div>
          <div class="bal-clientes__row">
            <span class="bal-clientes__icon">🔄</span>
            <span class="bal-clientes__lbl">Clientes que volvieron</span>
            <span class="bal-clientes__val">${c.recurrentes}</span>
          </div>
        </div>
      </section>`;
  },

  // ── Render: Insights ───────────────────────────────────────────
  renderInsights() {
    const insights = this.generarInsights();
    if (!insights.length) return '';
    return `
      <section class="bal-section bal-section--insights">
        <h3 class="bal-section__title">💡 Insights</h3>
        <ul class="bal-insights">
          ${insights.map(i => `<li class="bal-insight bal-insight--${i.tipo}">${i.html}</li>`).join('')}
        </ul>
      </section>`;
  },

  generarInsights() {
    const a = this.data.actual;
    const ant = this.data.anterior;
    const out = [];

    // 1. Crecimiento de ventas
    if (ant && ant.totalVentas > 0) {
      const pct = Math.round(((a.totalVentas - ant.totalVentas) / ant.totalVentas) * 100);
      if (pct >= 10) {
        out.push({ tipo: 'ok', html: `🎉 Las ventas crecieron <b>${pct}%</b> vs el período anterior.` });
      } else if (pct <= -10) {
        out.push({ tipo: 'warn', html: `⚠️ Las ventas cayeron <b>${Math.abs(pct)}%</b> vs el período anterior. Vale la pena revisar qué cambió.` });
      } else {
        out.push({ tipo: 'info', html: `📊 Las ventas se mantuvieron estables (${pct >= 0 ? '+' : ''}${pct}%) vs el período anterior.` });
      }
    }

    // 2. Mejor día vs promedio
    if (a.mejorDia && a.serieVentas.length > 1) {
      const promedio = a.totalVentas / a.serieVentas.length;
      if (promedio > 0) {
        const factor = a.mejorDia.ventas / promedio;
        if (factor >= 1.5) {
          out.push({
            tipo: 'info',
            html: `🏆 El ${this.diaLargoConFecha(a.mejorDia.fecha)} vendió <b>${factor.toFixed(1)}× más</b> que un día promedio. ¿Qué hizo diferente ese día?`
          });
        }
      }
    }

    // 3. Producto estrella
    if (a.topProductos.length >= 2) {
      const p1 = a.topProductos[0];
      const p2 = a.topProductos[1];
      if (p2.cantidad > 0) {
        const factor = p1.cantidad / p2.cantidad;
        if (factor >= 2) {
          out.push({
            tipo: 'info',
            html: `⭐ <b>${escapeHtml(p1.nombre)}</b> vendió <b>${factor.toFixed(1)}× más</b> que el segundo más vendido. Es tu producto estrella.`
          });
        }
      }
    }

    // 4. Proyección: si cada día fuera como el mejor
    if (a.mejorDia && a.serieVentas.length > 1) {
      const proyectado = a.mejorDia.ventas * a.serieVentas.length;
      if (proyectado > a.totalVentas) {
        out.push({
          tipo: 'idea',
          html: `🚀 Si todos los días fueran como tu mejor día, ganarías <b>${fmtPesos(proyectado)}</b> en este período.`
        });
      }
    }

    // 5. Identificación de clientes
    if (a.clientes && a.clientes.total > 0) {
      const pct = Math.round(a.clientes.conCliente / a.clientes.total * 100);
      if (pct < 20) {
        out.push({
          tipo: 'warn',
          html: `📞 Solo <b>${pct}%</b> de pedidos quedaron con cliente identificado. Más identificación = más WhatsApps y fidelización.`
        });
      } else if (pct >= 50) {
        out.push({
          tipo: 'ok',
          html: `📞 Identificaste al <b>${pct}%</b> de los clientes. Excelente para construir base de datos y fidelizar.`
        });
      }
    }

    // 6. Concentración top mesero
    if (a.topMeseros.length >= 2 && a.totalVentas > 0) {
      const topMesero = a.topMeseros[0];
      const pct = Math.round(topMesero.ventas / a.totalVentas * 100);
      if (pct >= 40) {
        out.push({
          tipo: 'info',
          html: `🌟 <b>${escapeHtml(topMesero.nombre.split(' ')[0])}</b> generó el <b>${pct}%</b> de las ventas. Mesero clave.`
        });
      }
    }

    return out;
  },

  // ── Modales de detalle ─────────────────────────────────────────
  abrirDetalleProductos() {
    const top = this.data.actual.topProductos || [];
    const maxQty = Math.max(...top.map(p => p.cantidad), 1);
    Swal.fire({
      title: '🍽️ Todos los productos',
      html: `
        <div class="bal-rank-list bal-rank-list--modal">
          ${top.map((p, i) => `
            <div class="bal-rank-row">
              <div class="bal-rank-row__medal">${i + 1}</div>
              <div class="bal-rank-row__main">
                <div class="bal-rank-row__name">${escapeHtml(p.nombre)}</div>
                <div class="bal-rank-row__bar">
                  <div class="bal-rank-row__bar-fill" style="width:${(p.cantidad / maxQty * 100).toFixed(1)}%"></div>
                </div>
              </div>
              <div class="bal-rank-row__qty">${p.cantidad}×</div>
              <div class="bal-rank-row__amt">${fmtPesos(p.monto)}</div>
            </div>`).join('')}
        </div>`,
      width: 560,
      confirmButtonText: 'Cerrar'
    });
  },

  abrirDetalleMeseros() {
    const top = this.data.actual.topMeseros || [];
    Swal.fire({
      title: '👥 Todos los meseros',
      html: `
        <div class="bal-meseros bal-meseros--modal">
          ${top.map((m, i) => {
            const ini = this.iniciales(m.nombre);
            const rolKey = String(m.rol || '').toLowerCase();
            const img = m.fotoUrl
              ? `<img class="bal-mesero__avatar-img" src="${escapeHtml(m.fotoUrl)}" alt="" onerror="this.remove()" />`
              : '';
            return `
              <div class="bal-mesero">
                <div class="bal-mesero__rank">${i + 1}</div>
                <div class="bal-mesero__avatar bal-mesero__avatar--${rolKey}">
                  <span class="bal-mesero__avatar-txt">${escapeHtml(ini)}</span>
                  ${img}
                </div>
                <div class="bal-mesero__body">
                  <div class="bal-mesero__name">${escapeHtml(m.nombre)}</div>
                  <div class="bal-mesero__meta">${m.pedidos} ped · ticket ${fmtPesos(m.ticketPromedio)}</div>
                </div>
                <div class="bal-mesero__ventas">${fmtPesos(m.ventas)}</div>
              </div>`;
          }).join('')}
        </div>`,
      width: 560,
      confirmButtonText: 'Cerrar'
    });
  },

 abrirDetalleMesero(m) {
    const totalVentas = this.data.actual.totalVentas || 0;
    const pct = totalVentas > 0 ? Math.round(m.ventas / totalVentas * 100) : 0;
    const ini = this.iniciales(m.nombre);
    const rolKey = String(m.rol || '').toLowerCase();
    const img = m.fotoUrl
      ? `<img class="bal-mesero__avatar-img" src="${escapeHtml(m.fotoUrl)}" alt="" onerror="this.remove()" />`
      : '';
    Swal.fire({
      title: m.nombre,
      html: `
        <div class="bal-mesero-detalle">
          <div class="bal-mesero-detalle__head">
            <div class="bal-mesero__avatar bal-mesero__avatar--${rolKey}" style="width:64px;height:64px;font-size:1.2rem;">
              <span class="bal-mesero__avatar-txt">${escapeHtml(ini)}</span>
              ${img}
            </div>
            <div class="bal-mesero-detalle__rol">${escapeHtml(m.rol || '')}</div>
          </div>
          <div class="bal-mesero-detalle__kpis">
            <div class="bal-kpi">
              <div class="bal-kpi__val">${fmtPesos(m.ventas)}</div>
              <div class="bal-kpi__lbl">Ventas totales</div>
              <div class="bal-kpi__sub">${pct}% del total</div>
            </div>
            <div class="bal-kpi">
              <div class="bal-kpi__val">${m.pedidos}</div>
              <div class="bal-kpi__lbl">Pedidos</div>
            </div>
            <div class="bal-kpi">
              <div class="bal-kpi__val">${fmtPesos(m.ticketPromedio)}</div>
              <div class="bal-kpi__lbl">Ticket prom.</div>
            </div>
            <div class="bal-kpi">
              <div class="bal-kpi__val">${fmtPesos(m.propinas || 0)}</div>
              <div class="bal-kpi__lbl">🎁 Propinas</div>
            </div>
          </div>
        </div>`,
      width: 480,
      confirmButtonText: 'Cerrar'
    });
  },

  // ── CSV ─────────────────────────────────────────────────────────
  exportarCSV() {
    if (!this.data) {
      Toast && Toast.fire({ icon: 'info', title: 'Nada para exportar' });
      return;
    }
    const a = this.data.actual;
    const ant = this.data.anterior;
    const escapar = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const filas = [];
    const sec = (titulo) => filas.push('', '"=== ' + titulo + ' ==="');

    filas.push(escapar('REPORTE DE BALANCE'));
    filas.push(escapar('Período') + ',' + escapar(this.desde + ' → ' + this.hasta));

    sec('KPIs PRINCIPALES');
    filas.push(['Métrica','Actual','Anterior','% Cambio'].map(escapar).join(','));
    const rowKpi = (lbl, vActual, vAnt) => {
      const pct = this.pctCambio(vActual, vAnt);
      filas.push([lbl, vActual, vAnt == null ? '' : vAnt,
                  pct == null ? '' : ((pct >= 0 ? '+' : '') + pct + '%')].map(escapar).join(','));
    };
    rowKpi('Ventas totales',  a.totalVentas,    ant?.totalVentas);
    rowKpi('Pedidos',         a.totalPedidos,   ant?.totalPedidos);
    rowKpi('Ticket promedio', a.ticketPromedio, ant?.ticketPromedio);
    rowKpi('Efectivo',        a.totalEfectivo,  ant?.totalEfectivo);
    rowKpi('Transferencia',   a.totalTransferencia, ant?.totalTransferencia);
    rowKpi('Propinas (informativo)', a.totalPropinas, ant?.totalPropinas);
    rowKpi('Descuentos',      a.totalDescuentos, null);

    sec('VENTAS POR DÍA');
    filas.push(['Fecha','Ventas','Pedidos'].map(escapar).join(','));
    a.serieVentas.forEach(d => filas.push([d.fecha, d.ventas, d.pedidos].map(escapar).join(',')));

    sec('TOP PRODUCTOS');
    filas.push(['Producto','Cantidad','Monto'].map(escapar).join(','));
    a.topProductos.forEach(p => filas.push([p.nombre, p.cantidad, p.monto].map(escapar).join(',')));

    sec('TOP MESEROS');
    filas.push(['Mesero','Pedidos','Ventas','Ticket Promedio'].map(escapar).join(','));
    a.topMeseros.forEach(m => filas.push([m.nombre, m.pedidos, m.ventas, m.ticketPromedio].map(escapar).join(',')));

    sec('VENTAS POR CATEGORÍA');
    filas.push(['Categoría','Cantidad','Monto'].map(escapar).join(','));
    a.ventasCategoria.forEach(c => filas.push([c.nombre, c.cantidad, c.monto].map(escapar).join(',')));

    sec('HORAS PICO');
    filas.push(['Hora','Cantidad'].map(escapar).join(','));
    a.horasPico.forEach(h => filas.push([h.hora + ':00', h.cantidad].map(escapar).join(',')));

    sec('CLIENTES');
    if (a.clientes) {
      filas.push(['Total pedidos', a.clientes.total].map(escapar).join(','));
      filas.push(['Identificados', a.clientes.conCliente].map(escapar).join(','));
      filas.push(['Sin identificar', a.clientes.sinCliente].map(escapar).join(','));
      filas.push(['Únicos', a.clientes.unicos].map(escapar).join(','));
      filas.push(['Nuevos', a.clientes.nuevos].map(escapar).join(','));
      filas.push(['Recurrentes', a.clientes.recurrentes].map(escapar).join(','));
    }

    const blob = new Blob(['\ufeff' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'balance_' + this.desde.replace(/-/g, '') + '_a_' + this.hasta.replace(/-/g, '') + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    Toast && Toast.fire({ icon: 'success', title: 'CSV descargado' });
  },

  desenganchar() { /* sin listeners persistentes */ },

  setupListeners() {
    // Chips de período
    $$('.aud-chip', $('#bal-chips-periodo')).forEach(c => {
      if (c._bound) return;
      c._bound = true;
      c.addEventListener('click', () => {
        const p = c.dataset.periodo;
        if (p === 'custom') return this.abrirPickerCustom();
        this.aplicarPeriodo(p, true);
      });
    });
    // Refresh
    const r = $('#bal-refresh');
    if (r && !r._bound) {
      r._bound = true;
      r.addEventListener('click', () => this.cargar());
    }
// CSV
    const csv = $('#bal-csv');
    if (csv && !csv._bound) {
      csv._bound = true;
      csv.addEventListener('click', () => this.exportarCSV());
    }
  }
};

/* ============================================================
   ============================================================
   FASE 7 / BLOQUE Q — VISTA RESERVAS
   ============================================================
   Gestión interna de solicitudes de reserva (SUPER + ADMIN).
   Lista + Calendario, banner pulsante de pendientes, hero del día,
   chips de período, pills de estado con conteo, cards con quick
   actions, modal de detalle, notificación RTDB en vivo + badge.
   ============================================================
   ============================================================ */
const Reservas = {
  // Datos
  reservas: [],
  mesas: [],
  cargando: false,

  // Filtros
  periodoActivo: 'hoy',
  desde: '',
  hasta: '',
  estadoActivo: 'TODOS',
  vistaActiva: 'lista',  // 'lista' | 'calendario'

  // Calendario
  calMes: null,
  calAnio: null,

  // RTDB
  _ref: null,
  _primeraVez: true,
  _pendientesPrev: 0,

  ESTADO_INFO: {
    PENDIENTE:         { lbl: 'Pendiente',  icon: '🟡', cls: 'pendiente'  },
    CONFIRMADA:        { lbl: 'Confirmada', icon: '🟢', cls: 'confirmada' },
    RECHAZADA:         { lbl: 'Rechazada',  icon: '🔴', cls: 'rechazada'  },
    CANCELADA_CLIENTE: { lbl: 'Cancelada',  icon: '🔵', cls: 'cancelada'  },
    CUMPLIDA:          { lbl: 'Cumplida',   icon: '⚪', cls: 'cumplida'   },
    NO_SHOW:           { lbl: 'No-show',    icon: '⚫', cls: 'noshow'     }
  },

  async abrir() {
    showView('reservas');
    // Default: filtro "hoy" + estado TODOS + vista lista
    if (!this.desde && !this.hasta) this.aplicarPeriodo('hoy', false);
    // Cache de mesas (para selector al confirmar/cambiar mesa)
    if (!this.mesas.length) {
      try { this.mesas = await apiGet('listMesas'); } catch (e) {}
    }
    // Por si la vista se abre antes que el listener global (caso raro)
    try { this.engancharRTDB(); } catch (_) {}
    await this.cargar();
  },

  async cargar() {
    if (this.cargando) return;
    this.cargando = true;
    this.pintarLoading();
    try {
      this.reservas = await apiPost('listReservas', withUser({
        estado: this.estadoActivo,
        desde:  this.desde,
        hasta:  this.hasta
      })) || [];
      this.render();
    } catch (e) {
      this.pintarError(e.message);
    } finally {
      this.cargando = false;
    }
  },

  pintarLoading() {
    const cont = $('#res-content');
    if (cont) cont.innerHTML = `
      <div class="aud-loading">
        <div class="spinner">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p class="muted">Cargando reservas…</p>
      </div>`;
  },

  pintarError(msg) {
    const cont = $('#res-content');
    if (cont) cont.innerHTML = `
      <div class="card text-center">
        <h3>Error al cargar</h3>
        <p class="muted">${escapeHtml(msg || '')}</p>
        <button class="btn btn-ghost mt-md" id="res-retry">Reintentar</button>
      </div>`;
    $('#res-retry')?.addEventListener('click', () => this.cargar());
  },

render() {
    this.renderStats();
    this.renderBannerPendientes();
    this.renderHeroHoy();
    this.actualizarChipsPeriodo();
    this.actualizarToggleVista();
    this.renderPillsEstado();
    if (this.vistaActiva === 'calendario') this.renderCalendario();
    else this.renderLista();
  },

  // ── Stats bar superior (count + período) ───────────────────
  renderStats() {
    const cnt = $('#res-stats-count');
    if (cnt) {
      const n = this.reservas.length;
      cnt.textContent = n + ' reserva' + (n === 1 ? '' : 's');
    }
    const per = $('#res-stats-period');
    if (per) per.textContent = this.etiquetaPeriodo();
  },

  etiquetaPeriodo() {
    if (this.periodoActivo === 'hoy')    return 'Hoy';
    if (this.periodoActivo === 'semana') return 'Esta semana';
    if (this.periodoActivo === 'mes')    return 'Este mes';
    if (this.periodoActivo === 'todo')   return 'Todas';
    if (this.periodoActivo === 'custom') {
      if (this.desde && this.hasta) {
        return this.desde === this.hasta
          ? this.desde
          : (this.desde + ' → ' + this.hasta);
      }
      return 'Personalizado';
    }
    return '';
  },

// ── Banner amarillo pulsante ───────────────────────────────
  renderBannerPendientes() {
    const banner = $('#res-banner-pendientes');
    if (!banner) return;
    // Conteo del dataset filtrado (período actual)
    const pendFiltro = this.reservas.filter(r => r.estado === 'PENDIENTE').length;
    // Conteo GLOBAL (todas las fechas) desde listener RTDB
    const pendGlobal = this._pendientesPrev || 0;
    // Usamos el máximo: si el listener aún no respondió, caemos al dataset
    const pend = Math.max(pendFiltro, pendGlobal);

    if (pend === 0 || this.estadoActivo === 'PENDIENTE') {
      banner.classList.add('hidden');
      banner.onclick = null;
      return;
    }
    banner.classList.remove('hidden');
    // Si el global supera al filtro, indicar que hay pendientes fuera del rango
    const fueraDeRango = pendGlobal > pendFiltro;
    banner.innerHTML = `
      <span class="res-banner__icon">🔔</span>
      <div class="res-banner__body">
        <strong>${pend} solicitud${pend === 1 ? '' : 'es'} pendiente${pend === 1 ? '' : 's'}</strong>
        <span class="res-banner__cta">${fueraDeRango ? 'Toca para ver todas →' : 'Toca para revisar →'}</span>
      </div>`;
    banner.onclick = () => {
      // Si hay pendientes fuera del filtro de período actual, ampliar a "Todo"
      // para que se vean todas. Si todas están en el filtro actual, mantener.
      if (pendGlobal > pendFiltro) {
        this.aplicarPeriodo('todo', false);
      }
      this.estadoActivo = 'PENDIENTE';
      this.cargar();
    };
  },

  // ── Hero del día ───────────────────────────────────────────
  renderHeroHoy() {
    const hero = $('#res-hero-hoy');
    if (!hero) return;
    const hoy = this.fechaYyyyMmDdLocal();
    // Solo mostrar el hero si el filtro de período incluye HOY
    const inRange =
      (!this.desde || this.desde <= hoy) &&
      (!this.hasta || this.hasta >= hoy);
    if (!inRange) { hero.classList.add('hidden'); return; }

    const reservasHoy = this.reservas.filter(r => r.fechaReserva === hoy);
    const confirmadas = reservasHoy.filter(r =>
      r.estado === 'CONFIRMADA' || r.estado === 'CUMPLIDA'
    );
    if (!confirmadas.length && !reservasHoy.length) {
      hero.classList.add('hidden');
      return;
    }
    hero.classList.remove('hidden');

    const totalPersonas = confirmadas.reduce((s, r) => s + (Number(r.personas) || 0), 0);
    const horasUnicas = Array.from(new Set(confirmadas.map(r => r.horaReserva))).sort();
    const ahoraHm = this.horaActualHm();
    const proxima = confirmadas
      .filter(r => r.horaReserva > ahoraHm)
      .sort((a, b) => a.horaReserva.localeCompare(b.horaReserva))[0];

    hero.innerHTML = `
      <div class="res-hero__head">
        <div class="res-hero__lbl">HOY</div>
        <h2 class="res-hero__fecha">${escapeHtml(this.fechaLargaHoy())}</h2>
      </div>
      <div class="res-hero__stats">
        <div class="res-hero__stat">
          <span class="res-hero__stat-num">${confirmadas.length}</span>
          <span class="res-hero__stat-lbl">confirmadas</span>
        </div>
        <div class="res-hero__stat">
          <span class="res-hero__stat-num">${totalPersonas}</span>
          <span class="res-hero__stat-lbl">personas</span>
        </div>
      </div>
      ${horasUnicas.length ? `
        <div class="res-hero__timeline">
          ${horasUnicas.slice(0, 6).map(h =>
            `<span class="res-hero__tl-time">${this.formatHora12(h)}</span>`
          ).join('')}
        </div>` : ''}
      ${proxima ? `
        <div class="res-hero__proxima">
          ⏰ Próxima: <b>${this.formatHora12(proxima.horaReserva)}</b>
          · ${escapeHtml(String(proxima.clienteNombre).split(' ')[0])}
          (${proxima.personas} pers.)
        </div>` : ''}
    `;
  },

  actualizarChipsPeriodo() {
    $$('[data-res-periodo]').forEach(c => {
      c.classList.toggle('is-active', c.dataset.resPeriodo === this.periodoActivo);
    });
  },

  actualizarToggleVista() {
    $$('[data-res-vista]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.resVista === this.vistaActiva);
    });
  },

  // ── Pills de estado con conteo ─────────────────────────────
  renderPillsEstado() {
    const cont = $('#res-pills-estado');
    if (!cont) return;
    // Conteos según el dataset cargado (NO el total absoluto: si el filtro
    // de período es "hoy", los conteos son de hoy)
    const conteos = { TODOS: this.reservas.length };
    Object.keys(this.ESTADO_INFO).forEach(e => conteos[e] = 0);
    this.reservas.forEach(r => { conteos[r.estado] = (conteos[r.estado] || 0) + 1; });

    const items = [
      { key: 'TODOS',             lbl: 'Todos' },
      { key: 'PENDIENTE',         lbl: 'Pendientes' },
      { key: 'CONFIRMADA',        lbl: 'Confirmadas' },
      { key: 'RECHAZADA',         lbl: 'Rechazadas' },
      { key: 'CUMPLIDA',          lbl: 'Cumplidas' },
      { key: 'NO_SHOW',           lbl: 'No-show' },
      { key: 'CANCELADA_CLIENTE', lbl: 'Canceladas' }
    ];

    cont.innerHTML = items.map(it => {
      const active = this.estadoActivo === it.key;
      const count = conteos[it.key] || 0;
      const info = this.ESTADO_INFO[it.key];
      const cls = active
        ? `is-active${info ? ' res-pill--' + info.cls : ''}`
        : '';
      return `
        <button class="res-pill ${cls}" data-res-pill="${it.key}">
          <span class="res-pill__lbl">${it.lbl}</span>
          ${count > 0 ? `<span class="res-pill__count">${count}</span>` : ''}
        </button>`;
    }).join('');

    $$('[data-res-pill]', cont).forEach(b => {
      b.addEventListener('click', () => {
        this.estadoActivo = b.dataset.resPill;
        this.cargar();
      });
    });
  },

  // ── Lista agrupada por día ─────────────────────────────────
  renderLista() {
    const cont = $('#res-content');
    if (!cont) return;
    if (!this.reservas.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:20px;">
          <div style="font-size:2.4rem; opacity:0.4;">📋</div>
          <h3>Sin reservas</h3>
          <p class="muted">No hay reservas con los filtros actuales.</p>
        </div>`;
      return;
    }
    const grupos = {};
    this.reservas.forEach(r => {
      const d = r.fechaReserva;
      if (!grupos[d]) grupos[d] = [];
      grupos[d].push(r);
    });
    const dias = Object.keys(grupos).sort();

    cont.innerHTML = dias.map(dia => {
      const items = grupos[dia].sort((a, b) => a.horaReserva.localeCompare(b.horaReserva));
      return `
        <section class="res-dia">
          <header class="res-dia__head">
            <span class="res-dia__icon">📌</span>
            <span class="res-dia__lbl">${escapeHtml(this.etiquetaDia(dia))}</span>
            <span class="res-dia__count">${items.length}</span>
          </header>
          <div class="res-dia__body">
            ${items.map(r => this.renderCard(r)).join('')}
          </div>
        </section>`;
    }).join('');

    // Tap en card → modal detalle
    $$('[data-res-card]', cont).forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-res-quick]')) return;
        const r = this.reservas.find(x => x.id === el.dataset.resCard);
        if (r) this.abrirModalDetalle(r);
      });
    });
    // Quick actions
    $$('[data-res-quick="confirmar"]', cont).forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = this.reservas.find(x => x.id === b.dataset.resId);
        if (r) this.abrirModalAprobar(r);
      });
    });
    $$('[data-res-quick="rechazar"]', cont).forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = this.reservas.find(x => x.id === b.dataset.resId);
        if (r) this.abrirModalRechazar(r);
      });
    });
  },

  renderCard(r) {
    const info = this.ESTADO_INFO[r.estado] || this.ESTADO_INFO.PENDIENTE;
    let mesaInfo = '';
    if (r.estado === 'CONFIRMADA' && r.mesaAsignada) {
      const m = this.mesas.find(x => x.id === r.mesaAsignada);
      if (m) mesaInfo = `🪑 Mesa ${m.numero}`;
    }
    const quick = (r.estado === 'PENDIENTE') ? `
      <div class="res-card__quick">
        <button class="res-card__quick-btn res-card__quick-btn--ok"
                data-res-quick="confirmar" data-res-id="${r.id}"
                title="Confirmar">✓</button>
        <button class="res-card__quick-btn res-card__quick-btn--cancel"
                data-res-quick="rechazar" data-res-id="${r.id}"
                title="Rechazar">✕</button>
      </div>` : '';
    return `
      <article class="res-card res-card--${info.cls}" data-res-card="${r.id}">
        <div class="res-card__hora">${escapeHtml(this.formatHora12(r.horaReserva))}</div>
        <div class="res-card__body">
          <div class="res-card__head">
            <h4 class="res-card__name">${escapeHtml(r.clienteNombre)}</h4>
            <span class="res-card__personas">${r.personas} pers.</span>
          </div>
          ${r.tipoEvento ? `<div class="res-card__tipo">🎉 ${escapeHtml(r.tipoEvento)}</div>` : ''}
          <div class="res-card__tel">📱 ${escapeHtml(this.fmtTel(r.clienteTelefono))}</div>
          ${mesaInfo ? `<div class="res-card__mesa">${escapeHtml(mesaInfo)}</div>` : ''}
        </div>
        ${quick}
      </article>`;
  },

  // ── Calendario mensual ─────────────────────────────────────
  renderCalendario() {
    const cont = $('#res-content');
    if (!cont) return;
    if (this.calAnio === null || this.calMes === null) {
      const d = new Date();
      this.calAnio = d.getFullYear();
      this.calMes  = d.getMonth();
    }
    const primer = new Date(this.calAnio, this.calMes, 1);
    const ult    = new Date(this.calAnio, this.calMes + 1, 0);
    const primerDow = primer.getDay();
    const diasMes   = ult.getDate();

    const yyyyMm = this.calAnio + '-' + String(this.calMes + 1).padStart(2, '0');
    const porDia = {};
    this.reservas.forEach(r => {
      if (String(r.fechaReserva).startsWith(yyyyMm)) {
        const d = parseInt(r.fechaReserva.substring(8, 10), 10);
        if (!porDia[d]) porDia[d] = [];
        porDia[d].push(r);
      }
    });

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const DOW = ['D','L','M','M','J','V','S'];
    const hoy = this.fechaYyyyMmDdLocal();

    let celdas = '';
    for (let i = 0; i < primerDow; i++) {
      celdas += `<div class="res-cal__cell res-cal__cell--empty"></div>`;
    }
    for (let d = 1; d <= diasMes; d++) {
      const fechaCelda = yyyyMm + '-' + String(d).padStart(2, '0');
      const items = porDia[d] || [];
      const dots = items.slice(0, 5).map(r => {
        const info = this.ESTADO_INFO[r.estado];
        return `<span class="res-cal__dot res-cal__dot--${info ? info.cls : ''}"></span>`;
      }).join('');
      const extra = items.length > 5
        ? `<span class="res-cal__dot-more">+${items.length - 5}</span>` : '';
      const isHoy = fechaCelda === hoy ? 'is-hoy' : '';
      const hasCls = items.length ? 'res-cal__cell--has' : '';
      celdas += `
        <button class="res-cal__cell ${isHoy} ${hasCls}" data-cal-dia="${fechaCelda}">
          <div class="res-cal__cell-num">${d}</div>
          <div class="res-cal__cell-dots">${dots}${extra}</div>
        </button>`;
    }

    cont.innerHTML = `
      <div class="res-cal">
        <header class="res-cal__head">
          <button class="res-cal__nav" data-cal-nav="-1" title="Mes anterior">‹</button>
          <h3 class="res-cal__title">${MESES[this.calMes]} ${this.calAnio}</h3>
          <button class="res-cal__nav" data-cal-nav="1" title="Mes siguiente">›</button>
        </header>
        <div class="res-cal__dow">
          ${DOW.map(d => `<div class="res-cal__dow-cell">${d}</div>`).join('')}
        </div>
        <div class="res-cal__grid">${celdas}</div>
      </div>`;

    $$('[data-cal-nav]', cont).forEach(b => {
      b.addEventListener('click', () => {
        this.calMes += parseInt(b.dataset.calNav, 10);
        if (this.calMes < 0)  { this.calMes = 11; this.calAnio--; }
        if (this.calMes > 11) { this.calMes = 0;  this.calAnio++; }
        const primer = new Date(this.calAnio, this.calMes, 1);
        const ult    = new Date(this.calAnio, this.calMes + 1, 0);
        this.desde = this.dateToYmd(primer);
        this.hasta = this.dateToYmd(ult);
        this.periodoActivo = 'custom';
        this.cargar();
      });
    });
    $$('[data-cal-dia]', cont).forEach(b => {
      b.addEventListener('click', () => this.abrirModalCalendarioDia(b.dataset.calDia));
    });
  },

  abrirModalCalendarioDia(fecha) {
    const items = this.reservas
      .filter(r => r.fechaReserva === fecha)
      .sort((a, b) => a.horaReserva.localeCompare(b.horaReserva));
    if (!items.length) return;
    const list = items.map(r => {
      const info = this.ESTADO_INFO[r.estado];
      return `
        <button class="res-cal-day-item" data-cal-item="${r.id}">
          <span class="res-cal-day-item__hora">${this.formatHora12(r.horaReserva)}</span>
          <span class="res-cal-day-item__name">${escapeHtml(r.clienteNombre)}</span>
          <span class="res-cal-day-item__pers">${r.personas}p</span>
          <span class="res-cal-day-item__estado res-cal-day-item__estado--${info ? info.cls : ''}">${info ? info.icon : ''}</span>
        </button>`;
    }).join('');
    const self = this;
    Swal.fire({
      title: this.etiquetaDia(fecha),
      html: `<div class="res-cal-day-list">${list}</div>`,
      width: 480,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      didOpen: () => {
        $$('[data-cal-item]').forEach(b => {
          b.addEventListener('click', () => {
            const r = self.reservas.find(x => x.id === b.dataset.calItem);
            Swal.close();
            setTimeout(() => { if (r) self.abrirModalDetalle(r); }, 120);
          });
        });
      }
    });
  },

  // ── Modal de detalle (lectura + acciones según estado) ─────
  abrirModalDetalle(r) {
    const info = this.ESTADO_INFO[r.estado] || this.ESTADO_INFO.PENDIENTE;
    let mesaTxt = '— Sin asignar —';
    if (r.mesaAsignada) {
      const m = this.mesas.find(x => x.id === r.mesaAsignada);
      if (m) mesaTxt = `Mesa ${m.numero}`;
    }
    const aproboTxt = r.usuarioAproboNombre
      ? `${escapeHtml(r.usuarioAproboNombre)} · ${escapeHtml(r.fechaAprobacion || '')}`
      : '—';

    let accionesHTML = '';
    if (r.estado === 'PENDIENTE') {
      accionesHTML = `
        <button class="btn btn-success btn-block" data-acc="confirmar">✓ Confirmar</button>
        <button class="btn btn-danger btn-block mt-sm" data-acc="rechazar">✕ Rechazar</button>`;
    } else if (r.estado === 'CONFIRMADA') {
      accionesHTML = `
        <button class="btn btn-success btn-block" data-acc="cumplida">✓ Marcar cumplida</button>
        <button class="btn btn-ghost btn-block mt-sm" data-acc="cambiarMesa">🪑 Cambiar mesa</button>
        <button class="btn btn-danger btn-block mt-sm" data-acc="noshow">⚠ Marcar no-show</button>`;
    }

    const telDigits = String(r.clienteTelefono).replace(/\D/g, '');
    const html = `
      <div class="res-detalle">
        <header class="res-detalle__head res-detalle__head--${info.cls}">
          <div class="res-detalle__avatar">${escapeHtml(this.iniciales(r.clienteNombre))}</div>
          <div class="res-detalle__head-body">
            <h3 class="res-detalle__name">${escapeHtml(r.clienteNombre)}</h3>
            <div class="res-detalle__estado">${info.icon} ${info.lbl}</div>
          </div>
        </header>

        <div class="res-detalle__block">
          <h4>📋 Información</h4>
          <div class="res-row"><span>Solicitada</span><b>${escapeHtml(r.fechaSolicitud || '—')}</b></div>
          <div class="res-row"><span>Fecha reserva</span><b>${escapeHtml(this.fmtFechaLargaCorta(r.fechaReserva, r.horaReserva))}</b></div>
          <div class="res-row"><span>Personas</span><b>${r.personas}</b></div>
          ${r.tipoEvento ? `<div class="res-row"><span>Ocasión</span><b>${escapeHtml(r.tipoEvento)}</b></div>` : ''}
          <div class="res-row"><span>Mesa</span><b>${escapeHtml(mesaTxt)}</b></div>
          ${r.observaciones ? `<div class="res-detalle__obs">📝 ${escapeHtml(r.observaciones)}</div>` : ''}
          ${r.motivoRechazo ? `<div class="res-detalle__motivo"><b>Motivo:</b> ${escapeHtml(r.motivoRechazo)}</div>` : ''}
        </div>

        <div class="res-detalle__block">
          <h4>👤 Cliente</h4>
          <div class="res-detalle__cliente-acc">
            <a href="tel:${escapeHtml(telDigits)}" class="btn btn-ghost btn-sm">📞 ${escapeHtml(this.fmtTel(r.clienteTelefono))}</a>
            <a href="https://wa.me/57${escapeHtml(telDigits)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">💬 WhatsApp</a>
          </div>
        </div>

        <div class="res-detalle__block">
          <h4>📨 WhatsApps enviados</h4>
          <div class="res-row"><span>Solicitud al cliente</span><b>${r.enviadoWaCliente ? '✓ Enviado' : '— No enviado'}</b></div>
          <div class="res-row"><span>Notificación al equipo</span><b>${r.enviadoWaGrupo ? '✓ Enviado' : '— No enviado'}</b></div>
          <div class="res-row"><span>Confirmación al cliente</span><b>${r.enviadoWaConfirmacion ? '✓ Enviado' : '— No enviado'}</b></div>
        </div>

        <div class="res-detalle__block">
          <h4>📜 Histórico</h4>
          <div class="res-row"><span>Aprobado por</span><b>${aproboTxt}</b></div>
          <div class="res-row"><span>ID</span><b>${escapeHtml(r.id)}</b></div>
          <div class="res-row"><span>Token</span><b>${escapeHtml(r.tokenPublico || '')}</b></div>
        </div>

        ${accionesHTML ? `<div class="res-detalle__acciones">${accionesHTML}</div>` : ''}
      </div>`;

    const self = this;
    Swal.fire({
      html,
      width: 560,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        $$('[data-acc]').forEach(b => {
          b.addEventListener('click', () => {
            const acc = b.dataset.acc;
            Swal.close();
            // Pequeño delay: SweetAlert v11 solo permite un popup; esperamos
            // que cierre limpio antes de abrir el siguiente modal.
            setTimeout(() => {
              if (acc === 'confirmar')        self.abrirModalAprobar(r);
              else if (acc === 'rechazar')    self.abrirModalRechazar(r);
              else if (acc === 'cumplida')    self.marcarCumplida(r.id);
              else if (acc === 'noshow')      self.marcarNoShow(r.id);
              else if (acc === 'cambiarMesa') self.abrirModalCambiarMesa(r);
            }, 120);
          });
        });
      }
    });
  },

  // ── Acciones (modales mini + APIs) ─────────────────────────
  async abrirModalAprobar(reserva) {
    const mesasOptions = this.mesas
      .slice().sort((a, b) => Number(a.numero) - Number(b.numero))
      .map(m => `<option value="${m.id}">Mesa ${m.numero} (cap. ${m.capacidad})</option>`)
      .join('');
    const result = await Swal.fire({
      title: 'Confirmar reserva',
      html: `
        <div class="res-modal-aprobar">
          <p style="margin:0 0 4px;"><b>${escapeHtml(reserva.clienteNombre)}</b> · ${reserva.personas} pers.</p>
          <p class="muted" style="margin:0 0 12px;">${escapeHtml(this.fmtFechaLargaCorta(reserva.fechaReserva, reserva.horaReserva))}</p>
          <label>Asignar mesa (opcional)</label>
          <select id="mp-mesa">
            <option value="">— Sin asignar —</option>
            ${mesasOptions}
          </select>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => ({ mesaId: $('#mp-mesa').value || '' })
    });
    if (!result.isConfirmed) return;
    startLoading();
    try {
      await apiPost('confirmarReserva', withUser({
        id: reserva.id,
        mesaId: result.value.mesaId
      }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Reserva confirmada' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error al confirmar', e.message);
    }
  },

  async abrirModalRechazar(reserva) {
    const result = await Swal.fire({
      title: 'Rechazar reserva',
      html: `
        <div>
          <p style="margin:0 0 4px;"><b>${escapeHtml(reserva.clienteNombre)}</b> · ${reserva.personas} pers.</p>
          <p class="muted" style="margin:0 0 12px;">${escapeHtml(this.fmtFechaLargaCorta(reserva.fechaReserva, reserva.horaReserva))}</p>
          <label>Motivo del rechazo (obligatorio)</label>
          <textarea id="mp-motivo" rows="3" placeholder="Ej: aforo completo, día cerrado, evento privado…"></textarea>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Volver',
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => {
        const m = $('#mp-motivo').value.trim();
        if (m.length < 3) { Swal.showValidationMessage('Motivo requerido (mínimo 3 caracteres)'); return false; }
        return { motivo: m };
      }
    });
    if (!result.isConfirmed) return;
    startLoading();
    try {
      await apiPost('rechazarReserva', withUser({
        id: reserva.id,
        motivo: result.value.motivo
      }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Reserva rechazada' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error al rechazar', e.message);
    }
  },

  async marcarCumplida(id) {
    const ok = await confirmar('¿Marcar como cumplida?',
      'Esto indica que el cliente sí asistió a la reserva.', 'Sí, marcar cumplida');
    if (!ok) return;
    startLoading();
    try {
      await apiPost('marcarCumplidaReserva', withUser({ id }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Marcada cumplida' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async marcarNoShow(id) {
    const ok = await confirmar('¿Marcar como no-show?',
      'Esto indica que el cliente <b>no asistió</b>. Acción irreversible.', 'Sí, marcar no-show');
    if (!ok) return;
    startLoading();
    try {
      await apiPost('marcarNoShowReserva', withUser({ id }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Marcada como no-show' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async abrirModalCambiarMesa(reserva) {
    const mesasOptions = this.mesas
      .slice().sort((a, b) => Number(a.numero) - Number(b.numero))
      .map(m => `<option value="${m.id}" ${m.id === reserva.mesaAsignada ? 'selected' : ''}>Mesa ${m.numero} (cap. ${m.capacidad})</option>`)
      .join('');
    const result = await Swal.fire({
      title: 'Cambiar mesa',
      html: `
        <label>Mesa asignada</label>
        <select id="mp-mesa2">
          <option value="">— Quitar asignación —</option>
          ${mesasOptions}
        </select>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => ({ mesaId: $('#mp-mesa2').value || '' })
    });
    if (!result.isConfirmed) return;
    startLoading();
    try {
      await apiPost('cambiarMesaReserva', withUser({
        id: reserva.id,
        mesaId: result.value.mesaId
      }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Mesa actualizada' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

// ── RTDB: badge global + notificación en vivo ──────────────
  async engancharRTDB() {
    if (this._ref) return;
    if (!rolEs('SUPERUSUARIO', 'ADMINISTRADOR')) return;
    try {
      // Esperar a que el SDK de Firebase termine de cargar (CDN async).
      // El listener se monta tras login pero Firebase puede tardar 100-2000ms
      // dependiendo de conexión. Reintentamos cada 200ms hasta 6s.
      let intentos = 0;
      while (typeof firebase === 'undefined' && intentos < 30) {
        await new Promise(r => setTimeout(r, 200));
        intentos++;
      }
      if (typeof firebase === 'undefined') {
        console.warn('Reservas: SDK Firebase no disponible, listener no montado');
        return;
      }
      const fb = await getFirebase();
      if (!fb) return;
      this._primeraVez = true;
      this._pendientesPrev = 0;
      this._ref = fb.database()
        .ref('/negocios/' + NEGOCIO_RESTAURANTE_ID + '/reservas/pendientes');
      this._ref.on('value', (snap) => {
        const data = snap.val() || {};
        const count = Object.keys(data).length;
        // Badge en tile siempre
        this.actualizarBadgeTile(count);
        // Sonido solo si AUMENTÓ el conteo y no es el snapshot inicial
        if (!this._primeraVez && count > this._pendientesPrev) {
          playSoundOnce(SOUNDS.pedido);
        }
        this._pendientesPrev = count;
        this._primeraVez = false;
        // Si la vista está abierta, recargar lista (también refresca banner)
        const v = $('#view-reservas');
        if (v && v.classList.contains('active')) {
          this.cargar();
        } else {
          // Si la vista NO está abierta pero hay un badge, ya quedó actualizado.
          // Si la vista SÍ está activa pero apenas se montó el listener (race),
          // refrescamos al menos el banner sin recargar la lista entera.
          this.renderBannerPendientes && this.renderBannerPendientes();
        }
      }, (err) => console.error('RTDB reservas listener:', err));
    } catch (e) {
      console.error('Reservas.engancharRTDB:', e);
    }
  },

  desengancharRTDB() {
    if (this._ref) { this._ref.off(); this._ref = null; }
    this._primeraVez = true;
    this._pendientesPrev = 0;
    this.actualizarBadgeTile(0);
  },

  actualizarBadgeTile(count) {
    const el = $('#res-tile-badge');
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 99 ? '99+' : count;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  },

  // ── Período ────────────────────────────────────────────────
  aplicarPeriodo(periodo, recargar) {
    this.periodoActivo = periodo;
    const hoy = this.fechaYyyyMmDdLocal();
    switch (periodo) {
      case 'hoy':
        this.desde = hoy; this.hasta = hoy; break;
      case 'semana': {
        const d = new Date();
        const dow = d.getDay() || 7;
        const lun = new Date(d); lun.setDate(d.getDate() - (dow - 1));
        const dom = new Date(lun); dom.setDate(lun.getDate() + 6);
        this.desde = this.dateToYmd(lun);
        this.hasta = this.dateToYmd(dom);
        break;
      }
      case 'mes': {
        const d = new Date();
        const primer = new Date(d.getFullYear(), d.getMonth(), 1);
        const ult    = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        this.desde = this.dateToYmd(primer);
        this.hasta = this.dateToYmd(ult);
        break;
      }
      case 'todo':
        this.desde = ''; this.hasta = ''; break;
    }
    if (recargar) this.cargar();
  },

  abrirPickerCustom() {
    Swal.fire({
      title: 'Período personalizado',
      html: `
        <label>Desde</label>
        <input id="res-desde" type="date" value="${this.desde || ''}" />
        <label>Hasta</label>
        <input id="res-hasta" type="date" value="${this.hasta || ''}" />`,
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const d = $('#res-desde').value;
        const h = $('#res-hasta').value;
        if (!d || !h) { Swal.showValidationMessage('Llena ambas fechas'); return false; }
        if (d > h) { Swal.showValidationMessage('Desde no puede ser mayor que hasta'); return false; }
        return { d, h };
      }
    }).then(r => {
      if (!r.isConfirmed) {
        // Re-marcar el chip activo previo
        this.actualizarChipsPeriodo();
        return;
      }
      this.periodoActivo = 'custom';
      this.desde = r.value.d;
      this.hasta = r.value.h;
      this.cargar();
    });
  },

  // ── Vista lista vs calendario ──────────────────────────────
  cambiarVista(vista) {
    this.vistaActiva = vista;
    if (vista === 'calendario') {
      const d = new Date();
      this.calAnio = d.getFullYear();
      this.calMes  = d.getMonth();
      const primer = new Date(this.calAnio, this.calMes, 1);
      const ult    = new Date(this.calAnio, this.calMes + 1, 0);
      this.desde = this.dateToYmd(primer);
      this.hasta = this.dateToYmd(ult);
      this.periodoActivo = 'custom';
      this.cargar();
    } else {
      this.render();
    }
  },

  // ── CSV ────────────────────────────────────────────────────
  exportarCSV() {
    if (!this.reservas.length) {
      Toast && Toast.fire({ icon: 'info', title: 'No hay reservas para exportar' });
      return;
    }
    const headers = ['ID','FECHA_SOLICITUD','FECHA_RESERVA','HORA_RESERVA',
                     'CLIENTE_NOMBRE','CLIENTE_TELEFONO','PERSONAS','TIPO_EVENTO',
                     'OBSERVACIONES','ESTADO','MOTIVO_RECHAZO','MESA_ASIGNADA',
                     'USUARIO_APROBO','FECHA_APROBACION','TOKEN_PUBLICO'];
    const escapar = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [headers.join(',')];
    this.reservas.forEach(r => {
      lines.push([
        r.id, r.fechaSolicitud, r.fechaReserva, r.horaReserva,
        r.clienteNombre, r.clienteTelefono, r.personas, r.tipoEvento,
        r.observaciones, r.estado, r.motivoRechazo,
        r.mesaAsignada, r.usuarioAproboNombre, r.fechaAprobacion, r.tokenPublico
      ].map(escapar).join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservas_' + this.fechaYyyyMmDdLocal().replace(/-/g, '') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Toast && Toast.fire({ icon: 'success', title: 'CSV descargado' });
  },

  // ── Helpers ────────────────────────────────────────────────
  fechaYyyyMmDdLocal(d) {
    d = d || new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  },
  dateToYmd(d) { return this.fechaYyyyMmDdLocal(d); },
  horaActualHm() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0');
  },
  fechaLargaHoy() {
    let s = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  etiquetaDia(ymd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const hoy = this.fechaYyyyMmDdLocal();
    const ayer = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return this.dateToYmd(d); })();
    const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return this.dateToYmd(d); })();
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    let s = dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (ymd === hoy)    return 'HOY · ' + s;
    if (ymd === ayer)   return 'AYER · ' + s;
    if (ymd === manana) return 'MAÑANA · ' + s;
    return s;
  },
  fmtFechaLargaCorta(ymd, hm) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return '—';
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    let s = DIAS[dt.getDay()] + ', ' + d + ' de ' + MESES[m - 1] + ' de ' + y;
    if (hm && /^\d{2}:\d{2}$/.test(hm)) s += ' ' + this.formatHora12(hm);
    return s;
  },
  formatHora12(hm) {
    if (!/^\d{2}:\d{2}$/.test(hm || '')) return hm || '';
    const [h, m] = hm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  },
  iniciales(nombre) {
    const p = String(nombre || '?').trim().split(/\s+/);
    if (!p.length || !p[0]) return '?';
    if (p.length === 1) return p[0].charAt(0).toUpperCase();
    return (p[0].charAt(0) + p[1].charAt(0)).toUpperCase();
  },
  fmtTel(t) {
    const s = String(t || '').replace(/\D/g, '');
    if (s.length !== 10) return s;
    return s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6);
  },

  // ── Lifecycle ──────────────────────────────────────────────
  // El listener RTDB NO se desengancha al cambiar de vista — vive
  // mientras el SUPER/ADMIN esté logueado para mantener el badge.
  // Solo se desengancha en logout (manejado en logout()).
  desenganchar() { /* no-op intencional */ },

  setupListeners() {
    const btnRefresh = $('#res-refresh');
    if (btnRefresh && !btnRefresh._bound) {
      btnRefresh._bound = true;
      btnRefresh.addEventListener('click', () => this.cargar());
    }
    const btnCSV = $('#res-csv');
    if (btnCSV && !btnCSV._bound) {
      btnCSV._bound = true;
      btnCSV.addEventListener('click', () => this.exportarCSV());
    }
    $$('[data-res-periodo]').forEach(c => {
      if (c._bound) return;
      c._bound = true;
      c.addEventListener('click', () => {
        const p = c.dataset.resPeriodo;
        if (p === 'custom') return this.abrirPickerCustom();
        this.aplicarPeriodo(p, true);
      });
    });
    $$('[data-res-vista]').forEach(b => {
      if (b._bound) return;
      b._bound = true;
      b.addEventListener('click', () => this.cambiarVista(b.dataset.resVista));
    });
  }
};

/* ============================================================
   ============================================================
   FASE 8 — VISTA CRÉDITOS (cartera / cuentas por cobrar)
   ============================================================
   Gestión de clientes a crédito: cartera con semáforo de colores,
   venta rápida (Desayuno/Almuerzo · valor × cantidad), detalle/
   historial por cliente, registrar abono, cuenta pagada, extender
   cupo y enviar cuenta por WhatsApp.

   Tipos: PARTICULAR (con cupo, semáforo) · CONTRATO (sin tope).
   El bloqueo de cupo del particular ofrece atajo "Extender crédito".
   ============================================================
   ============================================================ */
const Creditos = {
  // Datos
  cartera: [],
  resumen: null,
  clientes: [],          // lista completa (pestaña Clientes)
  clientesResumen: null,
  cargando: false,

  // Vista activa: 'cartera' (deudas) | 'clientes' (todos)
  vistaActiva: 'cartera',

  // Filtros
  tipoFiltro: 'TODOS',      // TODOS | PARTICULAR | CONTRATO
  soloConDeuda: true,
  busqueda: '',

  async abrir() {
    showView('creditos');
    await this.cargar();
  },

  // Conmuta entre Cartera y Clientes
  cambiarVista(v) {
    if (this.vistaActiva === v) return;
    this.vistaActiva = v;
    this.busqueda = '';
    const inp = $('#cred-search-input');
    if (inp) inp.value = '';
    const bar = $('#cred-search-bar');
    if (bar) bar.classList.add('hidden');
    this.cargar();
  },

  async cargar() {
    if (this.cargando) return;
    this.cargando = true;
    this.pintarLoading();
    try {
      if (this.vistaActiva === 'clientes') {
        const r = await apiPost('creditoListarClientes', withUser({
          tipo:     this.tipoFiltro,
          busqueda: this.busqueda
        }));
        this.clientes = r.clientes || [];
        this.clientesResumen = { total: r.total || 0, conDeuda: r.conDeuda || 0 };
      } else {
        const r = await apiPost('creditoListarCartera', withUser({
          soloConDeuda: this.soloConDeuda,
          tipo:         this.tipoFiltro,
          busqueda:     this.busqueda
        }));
        this.cartera = r.clientes || [];
        this.resumen = r.resumen || null;
      }
      this.render();
    } catch (e) {
      this.pintarError(e.message);
    } finally {
      this.cargando = false;
    }
  },

  pintarLoading() {
    const cont = $('#cred-content');
    if (cont) cont.innerHTML = `
      <div class="aud-loading">
        <div class="spinner">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p class="muted">Cargando…</p>
      </div>`;
  },

  pintarError(msg) {
    const cont = $('#cred-content');
    if (cont) cont.innerHTML = `
      <div class="card text-center">
        <h3>Error al cargar</h3>
        <p class="muted">${escapeHtml(msg || '')}</p>
        <button class="btn btn-ghost mt-md" id="cred-retry">Reintentar</button>
      </div>`;
    $('#cred-retry')?.addEventListener('click', () => this.cargar());
  },

  render() {
    this.actualizarToggleVista();
    this.actualizarChipsTipo();
    if (this.vistaActiva === 'clientes') {
      this.renderResumenClientes();
      this.renderListaClientes();
    } else {
      this.renderResumen();
      this.renderLista();
    }
  },

  actualizarToggleVista() {
    $$('[data-cred-vista]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.credVista === this.vistaActiva);
    });
    // El toggle "solo con deuda" solo tiene sentido en Cartera
    const td = $('#cred-toggle-deuda');
    if (td) td.style.display = (this.vistaActiva === 'cartera') ? '' : 'none';
    // El FAB cambia de acción según la pestaña (lo lee al hacer click)
  },

  // ── Resumen hero (cartera total) ───────────────────────────
  renderResumen() {
    const hero = $('#cred-hero');
    if (!hero || !this.resumen) return;
    const r = this.resumen;
    hero.innerHTML = `
      <div class="cred-hero__main">
        <div class="cred-hero__lbl">Cartera por cobrar</div>
        <div class="cred-hero__val">${fmtPesos(r.carteraTotal)}</div>
      </div>
      <div class="cred-hero__chips">
        <div class="cred-hero__chip">
          <span class="cred-hero__chip-num">${r.clientesConDeuda}</span>
          <span class="cred-hero__chip-lbl">con deuda</span>
        </div>
        <div class="cred-hero__chip ${r.enAlerta ? 'cred-hero__chip--alert' : ''}">
          <span class="cred-hero__chip-num">${r.enAlerta}</span>
          <span class="cred-hero__chip-lbl">en alerta</span>
        </div>
      </div>
      <div class="cred-hero__split">
        <div class="cred-hero__split-row">
          <span>👤 Particulares</span><b>${fmtPesos(r.totalParticular)}</b>
        </div>
        <div class="cred-hero__split-row">
          <span>📄 Contratos</span><b>${fmtPesos(r.totalContrato)}</b>
        </div>
      </div>
    `;
  },

  actualizarChipsTipo() {
    $$('[data-cred-tipo]').forEach(c => {
      c.classList.toggle('is-active', c.dataset.credTipo === this.tipoFiltro);
    });
    const t = $('#cred-toggle-deuda');
    if (t) t.classList.toggle('is-active', this.soloConDeuda);
  },

  // ── Lista de cartera ───────────────────────────────────────
  renderLista() {
    const cont = $('#cred-content');
    if (!cont) return;

    if (!this.cartera.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:20px;">
          <div style="font-size:2.4rem; opacity:0.4;">💳</div>
          <h3>${this.busqueda ? 'Sin resultados' : 'Sin clientes a crédito'}</h3>
          <p class="muted">${this.busqueda
            ? 'Nadie coincide con tu búsqueda.'
            : (this.soloConDeuda
                ? 'No hay deudas activas. Toca <b>+</b> para registrar una venta a crédito.'
                : 'Toca <b>+</b> para crear el primer cliente de crédito.')}</p>
        </div>`;
      return;
    }

    cont.innerHTML = `<div class="cred-list">${this.cartera.map(c => this.renderCard(c)).join('')}</div>`;

    $$('[data-cred-card]', cont).forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-cred-quick]')) return;
        const c = this.cartera.find(x => x.id === el.dataset.credCard);
        if (c) this.abrirDetalle(c);
      });
    });
    $$('[data-cred-quick="cuenta"]', cont).forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = this.cartera.find(x => x.id === b.dataset.credId);
        if (c) this.enviarCuenta(c);
      });
    });
    $$('[data-cred-quick="pago"]', cont).forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = this.cartera.find(x => x.id === b.dataset.credId);
        if (c) this.abrirModalPago(c);
      });
    });
  },

  renderCard(c) {
    const tipoChip = c.tipo === 'CONTRATO'
      ? `<span class="cred-chip cred-chip--contrato">📄 Contrato</span>`
      : `<span class="cred-chip cred-chip--particular">👤 Particular</span>`;

    // Barra de cupo (solo particular con cupo)
    let barra = '';
    if (c.tipo === 'PARTICULAR' && c.cupo > 0) {
      const pct = Math.min(100, Math.round((c.saldo / c.cupo) * 100));
      barra = `
        <div class="cred-card__cupo">
          <div class="cred-card__cupo-bar">
            <div class="cred-card__cupo-fill cred-card__cupo-fill--${c.semaforo}" style="width:${pct}%"></div>
          </div>
          <div class="cred-card__cupo-meta">
            <span>${pct}% del cupo</span>
            <span>Cupo ${fmtPesos(c.cupo)}</span>
          </div>
        </div>`;
    } else if (c.tipo === 'CONTRATO') {
      barra = `<div class="cred-card__cupo-meta cred-card__cupo-meta--contrato">Sin tope · deuda abierta</div>`;
    }

    return `
      <article class="cred-card cred-card--${c.semaforo}" data-cred-card="${c.id}">
        <div class="cred-card__head">
          <div class="cred-card__who">
            <h4 class="cred-card__name">${escapeHtml(c.nombre)}</h4>
            <div class="cred-card__sub">${tipoChip}<span class="cred-card__tel">📱 ${escapeHtml(this.fmtTel(c.telefono))}</span></div>
          </div>
          <div class="cred-card__saldo">
            <span class="cred-card__saldo-lbl">Debe</span>
            <span class="cred-card__saldo-val">${fmtPesos(c.saldo)}</span>
          </div>
        </div>
        ${barra}
        <div class="cred-card__actions">
          <button class="cred-act cred-act--wa" data-cred-quick="cuenta" data-cred-id="${c.id}" title="Enviar cuenta por WhatsApp">📨 Enviar cuenta</button>
          <button class="cred-act cred-act--pago" data-cred-quick="pago" data-cred-id="${c.id}" title="Registrar pago/abono">💵 Registrar pago</button>
        </div>
      </article>`;
  },

  /* ────────────────────────────────────────────
     PESTAÑA CLIENTES (todos, con o sin deuda)
     ──────────────────────────────────────────── */
  renderResumenClientes() {
    const hero = $('#cred-hero');
    if (!hero || !this.clientesResumen) return;
    const r = this.clientesResumen;
    hero.innerHTML = `
      <div class="cred-hero__main">
        <div class="cred-hero__lbl">Clientes de crédito</div>
        <div class="cred-hero__val">${r.total}</div>
      </div>
      <div class="cred-hero__chips">
        <div class="cred-hero__chip">
          <span class="cred-hero__chip-num">${r.conDeuda}</span>
          <span class="cred-hero__chip-lbl">con deuda</span>
        </div>
        <div class="cred-hero__chip">
          <span class="cred-hero__chip-num">${r.total - r.conDeuda}</span>
          <span class="cred-hero__chip-lbl">al día</span>
        </div>
      </div>
    `;
  },

  renderListaClientes() {
    const cont = $('#cred-content');
    if (!cont) return;
    if (!this.clientes.length) {
      cont.innerHTML = `
        <div class="card text-center" style="margin-top:20px;">
          <div style="font-size:2.4rem; opacity:0.4;">👥</div>
          <h3>${this.busqueda ? 'Sin resultados' : 'Sin clientes de crédito'}</h3>
          <p class="muted">${this.busqueda
            ? 'Nadie coincide con tu búsqueda.'
            : 'Toca <b>+</b> para crear el primer cliente de crédito.'}</p>
        </div>`;
      return;
    }
    cont.innerHTML = `<div class="cred-list">${this.clientes.map(c => this.renderClienteCard(c)).join('')}</div>`;

    $$('[data-cred-cli]', cont).forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-cli-quick]')) return;
        const c = this.clientes.find(x => x.id === el.dataset.credCli);
        if (c) this.abrirDetalle(c);
      });
    });
    $$('[data-cli-quick="editar"]', cont).forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = this.clientes.find(x => x.id === b.dataset.cliId);
        if (c) this.abrirAltaCliente(c);
      });
    });
  },

  renderClienteCard(c) {
    const tipoChip = c.tipo === 'CONTRATO'
      ? `<span class="cred-chip cred-chip--contrato">📄 Contrato</span>`
      : `<span class="cred-chip cred-chip--particular">👤 Particular</span>`;
    const cupoTxt = (c.tipo === 'PARTICULAR' && c.cupo > 0)
      ? `Cupo ${fmtPesos(c.cupo)}` : 'Sin tope';
    const saldoTxt = c.saldo > 0
      ? `<span class="cred-cli__saldo cred-cli__saldo--${c.semaforo}">Debe ${fmtPesos(c.saldo)}</span>`
      : `<span class="cred-cli__saldo cred-cli__saldo--ok">Al día</span>`;
    return `
      <article class="cred-card cred-card--${c.semaforo}" data-cred-cli="${c.id}">
        <div class="cred-card__head">
          <div class="cred-card__who">
            <h4 class="cred-card__name">${escapeHtml(c.nombre)}</h4>
            <div class="cred-card__sub">${tipoChip}<span class="cred-card__tel">📱 ${escapeHtml(this.fmtTel(c.telefono))}</span></div>
          </div>
          <button class="cred-cli__edit" data-cli-quick="editar" data-cli-id="${c.id}" title="Editar cliente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
        <div class="cred-cli__foot">
          <span class="cred-cli__cupo">${cupoTxt}</span>
          ${saldoTxt}
        </div>
      </article>`;
  },

  /* ────────────────────────────────────────────
     ALTA / EDICIÓN DE CLIENTE (independiente de la venta)
     ──────────────────────────────────────────── */
  abrirAltaCliente(cliente) {
    const self = this;
    const isNew = !cliente;
    const c = cliente || { id: '', nombre: '', telefono: '', tipo: 'PARTICULAR', cupo: 0 };
    const st = { tipo: String(c.tipo || 'PARTICULAR').toUpperCase() };

    const html = `
      <div class="cred-alta">
        <label>Nombre</label>
        <input type="text" id="ca-nombre" value="${escapeHtml(c.nombre)}" placeholder="Nombre del cliente" autocomplete="off" />

        <label>Teléfono (WhatsApp)</label>
        <input type="tel" id="ca-tel" maxlength="10" inputmode="numeric"
               value="${escapeHtml(String(c.telefono || ''))}" placeholder="3001234567"
               autocomplete="off" ${isNew ? '' : 'readonly'} />
        ${isNew ? '' : '<p class="muted" style="font-size:0.72rem;margin:2px 0 0;">El teléfono no se cambia (es la llave del cliente).</p>'}

        <label>Tipo de crédito</label>
        <div class="cred-venta__tipo">
          <button type="button" class="cred-venta__tipo-btn ${st.tipo==='PARTICULAR'?'is-active':''}" data-ca-tipo="PARTICULAR">👤 Particular</button>
          <button type="button" class="cred-venta__tipo-btn ${st.tipo==='CONTRATO'?'is-active':''}" data-ca-tipo="CONTRATO">📄 Contrato</button>
        </div>

        <div id="ca-cupo-wrap" style="${st.tipo==='PARTICULAR'?'':'display:none;'}">
          <label>Cupo de crédito (tope)</label>
          <input type="text" id="ca-cupo" inputmode="numeric"
                 value="${c.cupo ? Number(c.cupo).toLocaleString('es-CO') : ''}" placeholder="300.000" autocomplete="off" />
        </div>
      </div>`;

    Swal.fire({
      title: isNew ? 'Nuevo cliente de crédito' : 'Editar cliente',
      html, width: 520,
      showCancelButton: true,
      confirmButtonText: isNew ? 'Crear cliente' : 'Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => {
        const fmtMoney = (el) => {
          const n = Number(String(el.value).replace(/\D/g, '')) || 0;
          el.value = n ? n.toLocaleString('es-CO') : '';
        };
        $('#ca-cupo')?.addEventListener('input', () => fmtMoney($('#ca-cupo')));
        $('#ca-tel').addEventListener('input', () => {
          $('#ca-tel').value = $('#ca-tel').value.replace(/\D/g, '').substring(0, 10);
        });
        $$('[data-ca-tipo]').forEach(b => {
          b.addEventListener('click', () => {
            st.tipo = b.dataset.caTipo;
            $$('[data-ca-tipo]').forEach(x => x.classList.toggle('is-active', x === b));
            const w = $('#ca-cupo-wrap');
            if (w) w.style.display = (st.tipo === 'PARTICULAR') ? '' : 'none';
          });
        });
      },
      preConfirm: () => {
        const nombre = $('#ca-nombre').value.trim();
        if (nombre.length < 3) { Swal.showValidationMessage('Nombre requerido'); return false; }
        const tel = $('#ca-tel').value.replace(/\D/g, '');
        if (!/^3\d{9}$/.test(tel)) { Swal.showValidationMessage('Celular válido (10 dígitos, inicia en 3)'); return false; }
        let cupo = 0;
        if (st.tipo === 'PARTICULAR') {
          cupo = Number(($('#ca-cupo').value || '').replace(/\D/g, '')) || 0;
          if (!(cupo > 0)) { Swal.showValidationMessage('El particular requiere un cupo mayor a 0'); return false; }
        }
        return { nombre, telefono: tel, tipo: st.tipo, cupo };
      }
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      startLoading();
      try {
        if (isNew) {
          await apiPost('creditoAltaCliente', withUser({
            nombre: res.value.nombre, telefono: res.value.telefono,
            tipo: res.value.tipo, cupo: res.value.cupo
          }));
          Toast && Toast.fire({ icon: 'success', title: 'Cliente creado' });
        } else {
          await apiPost('creditoEditarCliente', withUser({
            creditoClienteId: c.id,
            nombre: res.value.nombre, tipo: res.value.tipo, cupo: res.value.cupo
          }));
          Toast && Toast.fire({ icon: 'success', title: 'Cliente actualizado' });
        }
        stopLoading();
        self.cargar();
      } catch (e) {
        stopLoading();
        // editar tipo/cupo requiere SUPER/ADMIN; CAJA solo crea
        alertErr('Error', e.message);
      }
    });
  },

  /* ────────────────────────────────────────────
     VENTA RÁPIDA A CRÉDITO
     ──────────────────────────────────────────── */
  abrirVenta() {
    const self = this;
    // Estado del modal
    const st = {
      creditoClienteId: null,
      clienteNombre:    '',
      clienteTel:       '',
      tipo:             '',
      saldoActual:      0,
      cupo:             0,
      momento:          'ALMUERZO',
      valorUnidad:      0,
      cantidad:         1,
      permitirSobreCupo: false
    };

    const html = `
      <div class="cred-venta">
        <!-- Buscar / crear cliente -->
        <label>Cliente (teléfono)</label>
        <div class="cred-venta__tel-row">
          <input type="tel" id="cv-tel" maxlength="10" inputmode="numeric"
                 placeholder="3001234567" autocomplete="off" />
          <span id="cv-tel-status" class="cobro__cli-status"></span>
        </div>
        <div id="cv-cliente-box" class="cred-venta__cliente-box hidden"></div>
        <div id="cv-nuevo-box" class="cred-venta__nuevo hidden">
          <p class="muted" style="font-size:0.8rem;margin:6px 0;">Cliente nuevo — complétalo:</p>
          <label>Nombre</label>
          <input type="text" id="cv-nombre" placeholder="Nombre del cliente" autocomplete="off" />
          <label>Tipo de crédito</label>
          <div class="cred-venta__tipo">
            <button type="button" class="cred-venta__tipo-btn is-active" data-cv-tipo="PARTICULAR">👤 Particular</button>
            <button type="button" class="cred-venta__tipo-btn" data-cv-tipo="CONTRATO">📄 Contrato</button>
          </div>
          <div id="cv-cupo-wrap">
            <label>Cupo de crédito (tope)</label>
            <input type="text" id="cv-cupo" inputmode="numeric" placeholder="300.000" autocomplete="off" />
          </div>
        </div>

        <hr class="cred-venta__hr" />

        <!-- Momento -->
        <label>Momento</label>
        <div class="cred-venta__momento">
          <button type="button" class="cred-venta__mom-btn" data-cv-mom="DESAYUNO">☕ Desayuno</button>
          <button type="button" class="cred-venta__mom-btn is-active" data-cv-mom="ALMUERZO">🍽️ Almuerzo</button>
        </div>

        <!-- Valor y cantidad -->
        <div class="grid-2">
          <div>
            <label>Valor unidad</label>
            <input type="text" id="cv-valor" inputmode="numeric" placeholder="13.000" autocomplete="off" />
          </div>
          <div>
            <label>Cantidad</label>
            <input type="number" id="cv-cant" min="1" max="200" value="1" />
          </div>
        </div>

        <!-- Total -->
        <div class="cred-venta__total-row">
          <span>Total</span>
          <span class="cred-venta__total" id="cv-total">$ 0</span>
        </div>

        <!-- Aviso de cupo en vivo -->
        <div id="cv-cupo-aviso" class="cred-venta__aviso hidden"></div>

        <!-- WhatsApp -->
        <label class="check-row">
          <input type="checkbox" id="cv-wa" />
          <span>📲 Enviar comprobante por WhatsApp</span>
        </label>
      </div>
    `;

    Swal.fire({
      title: 'Venta a crédito',
      html,
      width: 560,
      showCancelButton: true,
      confirmButtonText: 'Guardar venta',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => self._bindVenta(st),
      preConfirm: () => self._preConfirmVenta(st)
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      await self._guardarVenta(st, res.value);
    });
  },

  _bindVenta(st) {
    const self = this;
    const parseMoney = (s) => Number(String(s || '').replace(/\D/g, '')) || 0;
    const fmtInput = (el) => {
      const n = parseMoney(el.value);
      el.value = n ? n.toLocaleString('es-CO') : '';
    };

    const recalc = () => {
      st.valorUnidad = parseMoney($('#cv-valor').value);
      st.cantidad    = Math.max(1, Number($('#cv-cant').value) || 1);
      const total = st.valorUnidad * st.cantidad;
      $('#cv-total').textContent = fmtPesos(total);
      // Aviso de cupo en vivo (solo particular con cliente y cupo)
      const aviso = $('#cv-cupo-aviso');
      if (st.tipo === 'PARTICULAR' && st.cupo > 0 && st.creditoClienteId) {
        const saldoNuevo = st.saldoActual + total;
        const pct = Math.round((saldoNuevo / st.cupo) * 100);
        let cls = 'ok', txt = '';
        if (saldoNuevo > st.cupo) {
          cls = 'full';
          txt = `⛔ Supera el cupo. Quedaría en ${fmtPesos(saldoNuevo)} de ${fmtPesos(st.cupo)}. Deberás extender el crédito.`;
        } else if (pct >= 80) {
          cls = 'warn';
          txt = `⚠️ Quedaría en ${fmtPesos(saldoNuevo)} de ${fmtPesos(st.cupo)} (${pct}%).`;
        } else {
          cls = 'ok';
          txt = `Quedaría en ${fmtPesos(saldoNuevo)} de ${fmtPesos(st.cupo)} (${pct}%).`;
        }
        aviso.className = 'cred-venta__aviso cred-venta__aviso--' + cls;
        aviso.textContent = txt;
        aviso.classList.remove('hidden');
      } else {
        aviso.classList.add('hidden');
      }
    };

    // Teléfono → buscar cliente
    const inpTel    = $('#cv-tel');
    const status    = $('#cv-tel-status');
    const cliBox    = $('#cv-cliente-box');
    const nuevoBox  = $('#cv-nuevo-box');
    let lookupT = null;

    const resetCliente = () => {
      st.creditoClienteId = null; st.tipo = ''; st.saldoActual = 0; st.cupo = 0;
      cliBox.classList.add('hidden'); cliBox.innerHTML = '';
    };

    inpTel.addEventListener('input', () => {
      const v = inpTel.value.replace(/\D/g, '').substring(0, 10);
      if (v !== inpTel.value) inpTel.value = v;
      st.clienteTel = v;
      resetCliente();
      nuevoBox.classList.add('hidden');
      status.textContent = ''; status.className = 'cobro__cli-status';
      clearTimeout(lookupT);
      if (!/^3\d{9}$/.test(v)) return;
      status.textContent = '🔎'; status.className = 'cobro__cli-status is-loading';
      lookupT = setTimeout(async () => {
        try {
          const r = await apiGet('creditoBuscarCliente', { telefono: v, 'usuario.id': state.user.id });
          if (r.encontrado && r.esCredito && r.credito) {
            // Cliente de crédito existente
            const c = r.credito;
            st.creditoClienteId = c.id;
            st.clienteNombre = c.nombre;
            st.tipo = c.tipo;
            st.saldoActual = c.saldo;
            st.cupo = c.cupo;
            status.textContent = '✓'; status.className = 'cobro__cli-status is-ok';
            nuevoBox.classList.add('hidden');
            cliBox.classList.remove('hidden');
            cliBox.innerHTML = `
              <div class="cred-venta__cli">
                <div class="cred-venta__cli-name">${escapeHtml(c.nombre)}</div>
                <div class="cred-venta__cli-meta">
                  ${c.tipo === 'CONTRATO' ? '📄 Contrato · sin tope' :
                    '👤 Particular · debe ' + fmtPesos(c.saldo) + ' de ' + fmtPesos(c.cupo)}
                </div>
              </div>`;
            recalc();
          } else if (r.encontrado && !r.esCredito) {
            // Existe como cliente pero NO es de crédito → ofrecer alta
            st.clienteNombre = r.cliente.nombre || '';
            status.textContent = '+'; status.className = 'cobro__cli-status is-new';
            nuevoBox.classList.remove('hidden');
            $('#cv-nombre').value = st.clienteNombre;
            self._setTipoNuevo(st, 'PARTICULAR');
          } else {
            // No existe → cliente nuevo
            status.textContent = '+'; status.className = 'cobro__cli-status is-new';
            nuevoBox.classList.remove('hidden');
            $('#cv-nombre').value = '';
            self._setTipoNuevo(st, 'PARTICULAR');
          }
        } catch (e) {
          status.textContent = '⚠'; status.className = 'cobro__cli-status is-err';
        }
      }, 400);
    });

    // Tipo (cliente nuevo)
    $$('[data-cv-tipo]').forEach(b => {
      b.addEventListener('click', () => self._setTipoNuevo(st, b.dataset.cvTipo));
    });

    // Momento
    $$('[data-cv-mom]').forEach(b => {
      b.addEventListener('click', () => {
        $$('[data-cv-mom]').forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
        st.momento = b.dataset.cvMom;
      });
    });

    // Valor (formato pesos en vivo) + cantidad
    $('#cv-valor').addEventListener('input', () => { fmtInput($('#cv-valor')); recalc(); });
    $('#cv-cant').addEventListener('input', recalc);
    $('#cv-cupo')?.addEventListener('input', () => fmtInput($('#cv-cupo')));

    recalc();
  },

  _setTipoNuevo(st, tipo) {
    st.tipo = tipo;
    $$('[data-cv-tipo]').forEach(x => x.classList.toggle('is-active', x.dataset.cvTipo === tipo));
    const cupoWrap = $('#cv-cupo-wrap');
    if (cupoWrap) cupoWrap.style.display = (tipo === 'PARTICULAR') ? '' : 'none';
  },

  _preConfirmVenta(st) {
    const parseMoney = (s) => Number(String(s || '').replace(/\D/g, '')) || 0;
    // Si es cliente nuevo (no tiene creditoClienteId), validamos datos de alta
    const esNuevo = !st.creditoClienteId;
    if (!/^3\d{9}$/.test(st.clienteTel)) {
      Swal.showValidationMessage('Ingresa un celular válido (10 dígitos, inicia en 3)');
      return false;
    }
    if (esNuevo) {
      const nombre = $('#cv-nombre').value.trim();
      if (nombre.length < 3) { Swal.showValidationMessage('Nombre del cliente requerido'); return false; }
      if (!st.tipo) { Swal.showValidationMessage('Selecciona el tipo de crédito'); return false; }
      if (st.tipo === 'PARTICULAR') {
        const cupo = parseMoney($('#cv-cupo').value);
        if (!(cupo > 0)) { Swal.showValidationMessage('El particular requiere un cupo mayor a 0'); return false; }
        st.cupo = cupo;
      }
      st.clienteNombre = nombre;
    }
    const valor = parseMoney($('#cv-valor').value);
    const cant  = Math.max(1, Number($('#cv-cant').value) || 1);
    if (!(valor > 0)) { Swal.showValidationMessage('Ingresa el valor unidad'); return false; }
    if (!(cant > 0))  { Swal.showValidationMessage('Ingresa la cantidad'); return false; }
    return {
      esNuevo, valorUnidad: valor, cantidad: cant,
      enviarWa: $('#cv-wa').checked
    };
  },

  async _guardarVenta(st, datos) {
    startLoading();
    try {
      // 1. Si es cliente nuevo, darlo de alta primero
      if (datos.esNuevo) {
        const alta = await apiPost('creditoAltaCliente', withUser({
          nombre:   st.clienteNombre,
          telefono: st.clienteTel,
          tipo:     st.tipo,
          cupo:     st.cupo
        }));
        st.creditoClienteId = alta.creditoClienteId;
      }
      // 2. Vender
      await this._ejecutarVenta(st, datos, false);
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Venta a crédito registrada' });
      this.cargar();
    } catch (e) {
      stopLoading();
      // Bloqueo de cupo → ofrecer atajo "Extender crédito"
      if (this._esSobreCupo(e)) {
        this._dialogoSobreCupo(st, datos, this._parseSobreCupo(e));
      } else {
        alertErr('Error', e.message);
      }
    }
  },

  async _ejecutarVenta(st, datos, permitirSobreCupo) {
    return apiPost('creditoVender', withUser({
      creditoClienteId: st.creditoClienteId,
      momento:          st.momento,
      valorUnidad:      datos.valorUnidad,
      cantidad:         datos.cantidad,
      enviarWa:         datos.enviarWa,
      permitirSobreCupo: !!permitirSobreCupo
    }));
  },

  _esSobreCupo(e) {
    return String(e && e.message || '').indexOf('SOBRE_CUPO::') === 0;
  },
  _parseSobreCupo(e) {
    try { return JSON.parse(String(e.message).replace('SOBRE_CUPO::', '')); }
    catch (_) { return {}; }
  },

  async _dialogoSobreCupo(st, datos, info) {
    const sugerido = Math.max(info.saldoNuevo || 0, (info.cupo || 0));
    const r = await Swal.fire({
      icon: 'warning',
      title: 'Supera el cupo',
      html: `
        <p style="margin:0 0 10px;">Esta venta dejaría la deuda en
          <b>${fmtPesos(info.saldoNuevo)}</b>, por encima del cupo de
          <b>${fmtPesos(info.cupo)}</b>.</p>
        <p class="muted" style="font-size:0.85rem;margin:0 0 12px;">
          Para continuar debes extender el crédito de este cliente.</p>
        <label style="text-align:left;">Nuevo cupo</label>
        <input id="cred-nuevo-cupo" inputmode="numeric"
               value="${sugerido.toLocaleString('es-CO')}" style="text-align:center;font-weight:700;" />
      `,
      showCancelButton: true,
      confirmButtonText: 'Extender y guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      didOpen: () => {
        const el = document.getElementById('cred-nuevo-cupo');
        el.addEventListener('input', () => {
          const n = Number(el.value.replace(/\D/g, '')) || 0;
          el.value = n ? n.toLocaleString('es-CO') : '';
        });
      },
      preConfirm: () => {
        const n = Number(document.getElementById('cred-nuevo-cupo').value.replace(/\D/g, '')) || 0;
        if (n <= (info.saldoNuevo || 0) - 1) {
          Swal.showValidationMessage('El nuevo cupo debe alcanzar para esta venta (' + fmtPesos(info.saldoNuevo) + ')');
          return false;
        }
        return n;
      }
    });
    if (!r.isConfirmed) return;
    startLoading();
    try {
      await apiPost('creditoExtenderCupo', withUser({
        creditoClienteId: st.creditoClienteId,
        nuevoCupo: r.value
      }));
      // Reintentar la venta autorizando el sobrecupo (ya extendido)
      await this._ejecutarVenta(st, datos, true);
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Cupo extendido · venta registrada' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  /* ────────────────────────────────────────────
     DETALLE / HISTORIAL DEL CLIENTE
     ──────────────────────────────────────────── */
  async abrirDetalle(c) {
    startLoading();
    let data;
    try {
      data = await apiPost('creditoDetalleCliente', withUser({ creditoClienteId: c.id }));
      stopLoading();
    } catch (e) {
      stopLoading();
      return alertErr('Error', e.message);
    }
    const cli = data.cliente;
    const self = this;

    const cupoBloque = (cli.tipo === 'PARTICULAR' && cli.cupo > 0) ? `
      <div class="cred-det__cupo">
        <div class="cred-card__cupo-bar">
          <div class="cred-card__cupo-fill cred-card__cupo-fill--${cli.semaforo}"
               style="width:${Math.min(100, Math.round(cli.saldo / cli.cupo * 100))}%"></div>
        </div>
        <div class="cred-card__cupo-meta">
          <span>Debe ${fmtPesos(cli.saldo)}</span>
          <span>Cupo ${fmtPesos(cli.cupo)}</span>
        </div>
      </div>` : (cli.tipo === 'CONTRATO'
        ? `<div class="cred-card__cupo-meta cred-card__cupo-meta--contrato">📄 Contrato · sin tope</div>` : '');

    const filaCredito = (cr) => `
      <div class="cred-det__row ${cr.estado === 'PAGADO' ? 'is-pagado' : ''}">
        <div class="cred-det__row-main">
          <span class="cred-det__row-fecha">${escapeHtml(this._fechaDmy(cr.fecha))}</span>
          <span class="cred-det__row-desc">${cr.cantidad}× ${escapeHtml(cr.momento.charAt(0) + cr.momento.slice(1).toLowerCase())}</span>
        </div>
        <div class="cred-det__row-right">
          <span class="cred-det__row-val">${fmtPesos(cr.total)}</span>
          ${cr.estado === 'PAGADO'
            ? `<span class="cred-det__badge cred-det__badge--pagado">Pagado</span>`
            : (cr.abonado > 0
                ? `<span class="cred-det__badge cred-det__badge--parcial">Abonado ${fmtPesos(cr.abonado)}</span>`
                : `<span class="cred-det__badge cred-det__badge--pend">Pendiente</span>`)}
        </div>
      </div>`;

    const filaAbono = (a) => `
      <div class="cred-det__row cred-det__row--abono">
        <div class="cred-det__row-main">
          <span class="cred-det__row-fecha">${escapeHtml(this._fechaDmy(a.fecha, true))}</span>
          <span class="cred-det__row-desc">💵 ${escapeHtml(a.metodo.charAt(0) + a.metodo.slice(1).toLowerCase())}${a.usuarioNombre ? ' · ' + escapeHtml(a.usuarioNombre.split(' ')[0]) : ''}</span>
        </div>
        <div class="cred-det__row-right">
          <span class="cred-det__row-val cred-det__row-val--abono">+${fmtPesos(a.valor)}</span>
        </div>
      </div>`;

    const html = `
      <div class="cred-det">
        <header class="cred-det__head cred-det__head--${cli.semaforo}">
          <div class="cred-det__avatar">${escapeHtml(this.iniciales(cli.nombre))}</div>
          <div class="cred-det__head-body">
            <h3 class="cred-det__name">${escapeHtml(cli.nombre)}</h3>
            <div class="cred-det__head-meta">
              ${cli.tipo === 'CONTRATO' ? '📄 Contrato' : '👤 Particular'} · 📱 ${escapeHtml(this.fmtTel(cli.telefono))}
            </div>
          </div>
        </header>

        ${cupoBloque}

        <div class="cred-det__acciones">
          <button class="btn btn-accent btn-sm" data-det-acc="cuenta">📨 Enviar cuenta</button>
          <button class="btn btn-success btn-sm" data-det-acc="pago">💵 Registrar pago</button>
          ${cli.saldo > 0 ? `<button class="btn btn-primary btn-sm" data-det-acc="pagada">✓ Cuenta pagada</button>` : ''}
          ${cli.tipo === 'PARTICULAR' ? `<button class="btn btn-ghost btn-sm" data-det-acc="extender">🎯 Extender cupo</button>` : ''}
        </div>

        <div class="cred-det__block">
          <h4>📌 Pendientes (${data.pendientes.length})</h4>
          ${data.pendientes.length
            ? data.pendientes.map(filaCredito).join('')
            : '<p class="muted" style="font-size:0.85rem;">Sin consumos pendientes.</p>'}
        </div>

        ${data.abonos.length ? `
          <div class="cred-det__block">
            <h4>💵 Abonos (${data.abonos.length})</h4>
            ${data.abonos.map(filaAbono).join('')}
          </div>` : ''}

        ${data.historial.length ? `
          <div class="cred-det__block">
            <h4>📜 Historial pagado (${data.historial.length})</h4>
            ${data.historial.map(filaCredito).join('')}
          </div>` : ''}
      </div>`;

    Swal.fire({
      html, width: 580,
      showConfirmButton: false, showCloseButton: true,
      didOpen: () => {
        $$('[data-det-acc]').forEach(b => {
          b.addEventListener('click', () => {
            const acc = b.dataset.detAcc;
            Swal.close();
            setTimeout(() => {
              if (acc === 'cuenta')        self.enviarCuenta(cli);
              else if (acc === 'pago')     self.abrirModalPago(cli);
              else if (acc === 'pagada')   self.cuentaPagada(cli);
              else if (acc === 'extender') self.abrirExtenderCupo(cli);
            }, 150);
          });
        });
      }
    });
  },

  /* ────────────────────────────────────────────
     REGISTRAR PAGO / ABONO
     ──────────────────────────────────────────── */
  abrirModalPago(c) {
    const self = this;
    const st = { metodo: 'EFECTIVO' };
    Swal.fire({
      title: 'Registrar pago — ' + c.nombre.split(' ')[0],
      html: `
        <div class="cred-pago">
          <div class="cred-pago__saldo">
            <span>Deuda actual</span>
            <b>${fmtPesos(c.saldo)}</b>
          </div>
          <label>Valor del abono</label>
          <input type="text" id="cp-valor" inputmode="numeric"
                 value="${(c.saldo).toLocaleString('es-CO')}" style="text-align:center;font-weight:700;font-size:1.1rem;" />
          <p class="muted" style="font-size:0.74rem;margin:4px 0 0;">Puede ser parcial. Por defecto, el total.</p>

          <label>Método</label>
          <div class="cobro__metodos cred-pago__metodos">
            <button type="button" class="cobro__metodo is-active" data-cp-met="EFECTIVO">💵 Efectivo</button>
            <button type="button" class="cobro__metodo" data-cp-met="TRANSFERENCIA">📱 Transferencia</button>
          </div>

          <label class="check-row">
            <input type="checkbox" id="cp-wa" />
            <span>📲 Avisar al cliente por WhatsApp</span>
          </label>
        </div>`,
      width: 480,
      showCancelButton: true,
      confirmButtonText: 'Registrar pago',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => {
        const el = $('#cp-valor');
        el.addEventListener('input', () => {
          let n = Number(el.value.replace(/\D/g, '')) || 0;
          if (n > c.saldo) n = c.saldo;
          el.value = n ? n.toLocaleString('es-CO') : '';
        });
        $$('[data-cp-met]').forEach(b => {
          b.addEventListener('click', () => {
            $$('[data-cp-met]').forEach(x => x.classList.remove('is-active'));
            b.classList.add('is-active');
            st.metodo = b.dataset.cpMet;
          });
        });
      },
      preConfirm: () => {
        const v = Number($('#cp-valor').value.replace(/\D/g, '')) || 0;
        if (!(v > 0)) { Swal.showValidationMessage('Ingresa el valor del abono'); return false; }
        return { valor: v, metodo: st.metodo, enviarWa: $('#cp-wa').checked };
      }
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      startLoading();
      try {
        const r = await apiPost('creditoRegistrarPago', withUser({
          creditoClienteId: c.id,
          valor:  res.value.valor,
          metodo: res.value.metodo,
          enviarWa: res.value.enviarWa
        }));
        stopLoading();
        Toast && Toast.fire({ icon: 'success', title: 'Pago registrado · saldo ' + fmtPesos(r.saldoNuevo) });
        self.cargar();
      } catch (e) {
        stopLoading();
        alertErr('Error', e.message);
      }
    });
  },

  async cuentaPagada(c) {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Liquidar toda la cuenta?',
      html: `Se registrará el pago completo de <b>${fmtPesos(c.saldo)}</b> y pasará al historial.`,
      input: 'radio',
      inputOptions: { EFECTIVO: '💵 Efectivo', TRANSFERENCIA: '📱 Transferencia' },
      inputValue: 'EFECTIVO',
      showCancelButton: true,
      confirmButtonText: 'Sí, cuenta pagada',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      inputValidator: (v) => !v && 'Selecciona el método de pago'
    });
    if (!r.isConfirmed) return;
    startLoading();
    try {
      await apiPost('creditoCuentaPagada', withUser({ creditoClienteId: c.id, metodo: r.value }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Cuenta pagada · al historial' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async abrirExtenderCupo(c) {
    const r = await Swal.fire({
      title: 'Extender cupo',
      html: `
        <p class="muted" style="font-size:0.85rem;margin:0 0 10px;">
          Cupo actual: <b>${fmtPesos(c.cupo)}</b> · Debe: <b>${fmtPesos(c.saldo)}</b></p>
        <label style="text-align:left;">Nuevo cupo</label>
        <input id="ce-cupo" inputmode="numeric" value="${(c.cupo).toLocaleString('es-CO')}"
               style="text-align:center;font-weight:700;" />`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      didOpen: () => {
        const el = document.getElementById('ce-cupo');
        el.addEventListener('input', () => {
          const n = Number(el.value.replace(/\D/g, '')) || 0;
          el.value = n ? n.toLocaleString('es-CO') : '';
        });
      },
      preConfirm: () => {
        const n = Number(document.getElementById('ce-cupo').value.replace(/\D/g, '')) || 0;
        if (!(n > 0)) { Swal.showValidationMessage('El cupo debe ser mayor a 0'); return false; }
        return n;
      }
    });
    if (!r.isConfirmed) return;
    startLoading();
    try {
      await apiPost('creditoExtenderCupo', withUser({ creditoClienteId: c.id, nuevoCupo: r.value }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Cupo actualizado' });
      this.cargar();
    } catch (e) {
      stopLoading();
      alertErr('Error', e.message);
    }
  },

  async enviarCuenta(c) {
    startLoading();
    try {
      await apiPost('creditoEnviarCuenta', withUser({ creditoClienteId: c.id }));
      stopLoading();
      Toast && Toast.fire({ icon: 'success', title: 'Cuenta enviada por WhatsApp' });
    } catch (e) {
      stopLoading();
      alertErr('No se pudo enviar', e.message);
    }
  },

  /* ── Helpers ── */
  // dd/mm/yyyy desde "yyyy-MM-dd" o "yyyy-MM-dd HH:mm[:ss]". conHora conserva HH:mm.
  _fechaDmy(valor, conHora) {
    const s = String(valor || '');
    const iso = s.substring(0, 10);
    if (iso.length !== 10 || iso.charAt(4) !== '-') return s;
    const dmy = iso.substring(8, 10) + '/' + iso.substring(5, 7) + '/' + iso.substring(0, 4);
    if (conHora) {
      const hora = s.substring(11, 16);
      if (/^\d{2}:\d{2}$/.test(hora)) return dmy + ' ' + hora;
    }
    return dmy;
  },
  iniciales(nombre) {
    const p = String(nombre || '?').trim().split(/\s+/);
    if (!p.length || !p[0]) return '?';
    if (p.length === 1) return p[0].charAt(0).toUpperCase();
    return (p[0].charAt(0) + p[1].charAt(0)).toUpperCase();
  },
  fmtTel(t) {
    const s = String(t || '').replace(/\D/g, '');
    if (s.length !== 10) return s;
    return s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6);
  },

  desenganchar() { /* sin listeners persistentes */ },

  setupListeners() {
    const fab = $('#cred-fab');
    if (fab && !fab._bound) {
      // El FAB cambia de acción según la pestaña:
      //  - Cartera  → nueva venta a crédito
      //  - Clientes → nuevo cliente de crédito
      fab.addEventListener('click', () => {
        if (this.vistaActiva === 'clientes') this.abrirAltaCliente(null);
        else this.abrirVenta();
      });
      fab._bound = true;
    }
    // Toggle Cartera / Clientes
    $$('[data-cred-vista]').forEach(b => {
      if (b._bound) return;
      b._bound = true;
      b.addEventListener('click', () => this.cambiarVista(b.dataset.credVista));
    });
    const btn = $('#cred-search-btn');
    const bar = $('#cred-search-bar');
    const inp = $('#cred-search-input');
    if (btn && !btn._bound) {
      btn.addEventListener('click', () => {
        bar.classList.toggle('hidden');
        if (!bar.classList.contains('hidden')) inp.focus();
        else { inp.value = ''; this.busqueda = ''; this.cargar(); }
      });
      btn._bound = true;
    }
    if (inp && !inp._bound) {
      let t = null;
      inp.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { this.busqueda = inp.value.trim(); this.cargar(); }, 300);
      });
      inp._bound = true;
    }
    // Chips de tipo
    $$('[data-cred-tipo]').forEach(c => {
      if (c._bound) return;
      c._bound = true;
      c.addEventListener('click', () => { this.tipoFiltro = c.dataset.credTipo; this.cargar(); });
    });
    // Toggle solo-con-deuda
    const td = $('#cred-toggle-deuda');
    if (td && !td._bound) {
      td._bound = true;
      td.addEventListener('click', () => { this.soloConDeuda = !this.soloConDeuda; this.cargar(); });
    }
  }
};

/* ============================================================
   MI BOT (control WhatsApp)
   ============================================================ */
const Bot = {
  silenciado:false, qrPoll:null,
  // 👉 CAMBIA este link por el de TU proyecto en BuilderBot (link.bbot.site/<PROJECT_ID>)
  panelUrl:'https://link.bbot.site/ff37a123-12b0-4fdc-9866-f3e2daf389fb',

  async abrir(){ showView('bot'); this.render(); await this.refrescarEstado(); },
  render(){
    this.detenerPollingQR();
    $('#bot-content').innerHTML=`
      <div id="bot-status" class="bot-status bot-status--unknown">
        <div class="bot-status__icon">⏳</div>
        <div class="bot-status__txt">Consultando estado…</div>
        <div class="bot-status__sub">Un momento por favor</div>
      </div>
      <div class="bot-section">
        <h3 class="bot-section__title">📱 Conectar WhatsApp</h3>
        <p class="muted">Si tu bot está desconectado, genera el código QR y escanéalo desde WhatsApp en tu teléfono.</p>
        <button id="bot-qr-btn" class="btn btn-primary btn-block mt-sm">⚡ Inicializar conexión</button>
        <div id="bot-qr-box" style="text-align:center"></div>
      </div>
      <div class="bot-section">
        <h3 class="bot-section__title">🛠 Controles del bot</h3>
        <div class="bot-btn-grid">
          <button class="bot-action" id="bot-reboot"><span class="bot-action__icon">🔄</span>Reiniciar</button>
          <button class="bot-action" id="bot-mute"><span class="bot-action__icon">🔇</span><span id="bot-mute-lbl">Silenciar</span></button>
        </div>
        <button class="bot-action" id="bot-logout" style="width:100%;margin-top:10px;flex-direction:row;justify-content:center;align-items:center;gap:10px;border-color:rgba(220,38,38,.30);color:#b91c1c"><span class="bot-action__icon">🗑️</span>Eliminar sesión</button>
      </div>
      <div class="bot-section">
        <h3 class="bot-section__title">👤 Gestionar un contacto</h3>
        <p class="muted">Escribe el número (con 57) para bloquearlo, desbloquearlo o limpiar su conversación.</p>
        <div class="bot-contacto-row"><input id="bot-num" inputmode="numeric" placeholder="573001234567"/></div>
        <div class="bot-btn-grid mt-sm">
          <button class="bot-action" id="bot-block"><span class="bot-action__icon">🚫</span>Bloquear</button>
          <button class="bot-action" id="bot-unblock"><span class="bot-action__icon">✅</span>Desbloquear</button>
        </div>
        <button class="bot-action" id="bot-clear" style="width:100%;margin-top:10px;flex-direction:row;justify-content:center;align-items:center;gap:10px"><span class="bot-action__icon">🧹</span>Limpiar conversación</button>
      </div>`;
    $('#bot-qr-btn').addEventListener('click',()=>this.mostrarQR());
    $('#bot-reboot').addEventListener('click',()=>this.reiniciar());
    $('#bot-mute').addEventListener('click',()=>this.toggleMute());
    $('#bot-block').addEventListener('click',()=>this.contacto('botBloquear','Bloquear contacto'));
    $('#bot-unblock').addEventListener('click',()=>this.contacto('botDesbloquear','Desbloquear contacto'));
    $('#bot-clear').addEventListener('click',()=>this.contacto('botLimpiar','Limpiar conversación'));
    $('#bot-logout').addEventListener('click',()=>this.eliminarSesion());
  },
  async refrescarEstado(){
    const box=$('#bot-status'); if(!box) return;
    try{
      const r=await apiGet('botEstado');
      const st=String(r.status||'UNKNOWN').toUpperCase();
      if(st==='ONLINE'){ box.className='bot-status bot-status--online'; box.innerHTML='<div class="bot-status__icon">🟢</div><div class="bot-status__txt">Tu bot está conectado</div><div class="bot-status__sub">Funcionando correctamente</div>'; }
      else if(st==='READY_TO_SCAN'){ box.className='bot-status bot-status--scan'; box.innerHTML='<div class="bot-status__icon">🟡</div><div class="bot-status__txt">Esperando que escanees el QR</div><div class="bot-status__sub">Genera el QR abajo y escanéalo</div>'; }
      else if(st==='OFFLINE'||st==='FAILED'){ box.className='bot-status bot-status--offline'; box.innerHTML='<div class="bot-status__icon">🔴</div><div class="bot-status__txt">Tu bot está desconectado</div><div class="bot-status__sub">Genera el QR para reconectarlo</div>'; }
      else { box.className='bot-status bot-status--unknown'; box.innerHTML=`<div class="bot-status__icon">⚪</div><div class="bot-status__txt">Estado: ${escapeHtml(st)}</div><div class="bot-status__sub">Toca actualizar para reintentar</div>`; }
    }catch(e){ box.className='bot-status bot-status--unknown'; box.innerHTML=`<div class="bot-status__icon">⚪</div><div class="bot-status__txt">No se pudo consultar</div><div class="bot-status__sub">${escapeHtml(e.message)}</div>`; }
  },
  async mostrarQR(){
    const boxQR=$('#bot-qr-box');
    const btn=$('#bot-qr-btn');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Conectando…'; }
    boxQR.innerHTML='<p class="muted">Preparando la conexión… (si el bot estaba apagado puede tardar unos segundos)</p>';
    const panelUrl=this.panelUrl;
    try{
      const r=await apiGet('botQR');
      const qr=r && r.qr ? String(r.qr) : '';

      // Paso 1: BuilderBot acaba de crear el deploy y aún no entrega el QR.
      // No es un error: el botón pasa a "Generar QR" para el segundo toque.
      if(!qr){
        if(btn){ btn.disabled=false; btn.textContent='📲 Generar QR'; }
        boxQR.innerHTML=`<p class="muted">${escapeHtml((r&&r.error)||'Conexión inicializada. Toca <b>Generar QR</b> para ver el código.')}</p>`;
        return;
      }

      // Paso 2: ya tenemos QR.
      const src = qr.indexOf('data:')===0 ? qr : (/^https?:\/\//.test(qr) ? qr : 'data:image/png;base64,'+qr);
      boxQR.innerHTML=`
        <img class="bot-qr-img" src="${src}" alt="Código QR de WhatsApp"
             onerror="this.replaceWith(document.createTextNode('No se pudo mostrar el QR. Toca Regenerar.'))"/>
        <p class="muted">Escanéalo desde WhatsApp → <b>Dispositivos vinculados</b>. El código se renueva cada cierto tiempo.</p>
        <div class="bot-btn-grid">
          <button class="bot-action" id="bot-qr-regen"><span class="bot-action__icon">🔄</span>Regenerar QR</button>
          <a class="bot-action" href="${panelUrl}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="bot-action__icon">🔗</span>Abrir en pestaña</a>
        </div>`;
      if(btn){ btn.disabled=false; btn.textContent='📲 Generar QR'; }
      $('#bot-qr-regen')?.addEventListener('click',()=>this.mostrarQR());
      this.iniciarPollingQR();
    }catch(e){
      if(btn){ btn.disabled=false; btn.textContent='⚡ Inicializar conexión'; }
      boxQR.innerHTML=`<p class="muted">Error al generar QR: ${escapeHtml(e.message)}</p>`;
    }
  },
  iniciarPollingQR(){
    this.detenerPollingQR();
    this.qrPoll=setInterval(async()=>{
      const img=$('#bot-qr-box .bot-qr-img');
      if(!img){ this.detenerPollingQR(); return; }
      try{
        await this.refrescarEstado();
        if($('#bot-status')?.classList.contains('bot-status--online')){
          this.detenerPollingQR(); img.classList.add('bot-qr-img--connected');
          if(!$('#bot-qr-ok')){
            const ok=document.createElement('div');
            ok.id='bot-qr-ok'; ok.className='bot-qr-ok';
            ok.innerHTML='🟢 <b>WhatsApp conectado</b><br><span>Ya puedes cerrar esta vista.</span>';
            img.insertAdjacentElement('afterend', ok);
          }
        }
      }catch(e){}
    }, 60000);
  },
  detenerPollingQR(){ if(this.qrPoll){ clearInterval(this.qrPoll); this.qrPoll=null; } },
  async reiniciar(){
    const ok=await confirmar('Reiniciar bot','El bot se reiniciará. Puede tardar unos segundos en volver a conectarse. ¿Continuar?','Sí, reiniciar');
    if(!ok) return; startLoading();
    try{ const r=await apiPost('botReiniciar',withUser({})); stopLoading(); if(r.ok) alertOk('Bot reiniciado'); else alertWarn('Aviso','No se confirmó el reinicio.'); setTimeout(()=>this.refrescarEstado(),2000); }
    catch(e){ stopLoading(); alertErr('Error',e.message); }
  },
  async toggleMute(){
    const nuevo=!this.silenciado;
    const ok=await confirmar(nuevo?'Silenciar bot':'Activar bot', nuevo?'El bot dejará de responder mensajes. ¿Continuar?':'El bot volverá a responder mensajes. ¿Continuar?','Sí');
    if(!ok) return; startLoading();
    try{ const r=await apiPost('botMute',withUser({flag:nuevo})); stopLoading();
      if(r.ok){ this.silenciado=nuevo; $('#bot-mute-lbl').textContent=nuevo?'Activar':'Silenciar'; Toast&&Toast.fire({icon:'success',title:nuevo?'Bot silenciado':'Bot activado'}); }
      else alertWarn('Aviso','No se confirmó el cambio.');
    }catch(e){ stopLoading(); alertErr('Error',e.message); }
  },
  async contacto(action,titulo){
    const num=$('#bot-num').value.trim().replace(/\D/g,'');
    if(num.length<8) return alertWarn('Número inválido','Escribe un número válido con código de país (57).');
    const ok=await confirmar(titulo, `Acción sobre el número <b>${num}</b>. ¿Continuar?`,'Sí');
    if(!ok) return; startLoading();
    try{ const r=await apiPost(action,withUser({numero:num})); stopLoading(); if(r.ok) alertOk('Listo'); else alertWarn('Aviso','No se confirmó la acción.'); }
    catch(e){ stopLoading(); alertErr('Error',e.message); }
  },
  async eliminarSesion(){
    const ok=await confirmar('Eliminar sesión','Esto cerrará la sesión de WhatsApp del bot y eliminará el despliegue actual.<br>Tendrás que generar un nuevo <b>código QR</b> y escanearlo para reconectarlo.<br><br>¿Deseas continuar?','Sí, eliminar sesión');
    if(!ok) return; startLoading();
    try{ const r=await apiPost('botEliminarSesion',withUser({})); stopLoading();
      if(r.ok) alertOk('Sesión eliminada','El bot se desconectó. Genera un nuevo QR para volver a vincular WhatsApp.');
      else alertWarn('Aviso','No se pudo confirmar la eliminación. Verifica el estado del bot.');
      setTimeout(()=>this.refrescarEstado(),2000);
    }catch(e){ stopLoading(); alertErr('Error',e.message); }
  },
  setupListeners(){ const r=$('#bot-refresh'); if(r) r.addEventListener('click',()=>this.refrescarEstado()); }
};

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  setupLoginUI();
  setupNavegacion();
  setupInstall();
  setupPWA();
  checkVersion();
  setInterval(checkVersion, 5 * 60 * 1000); // cada 5 min

  // Listeners de las vistas Fase 2
  Catalogo.setupListeners();
  Mesas.setupListeners();
  Inventario.setupListeners();
// Fase 3
  Pedidos.setupListeners();
  Comanda.setupListeners();
  Caja.setupListeners();
// Fase 5
  Anclaje.setupListeners();
  Usuarios.setupListeners();
  Configuracion.setupListeners();
// Fase 6
  Auditoria.setupListeners();
  Balances.setupListeners();
// Fase 7
  Reservas.setupListeners();
   Bot.setupListeners();
    // Fase 8
  Creditos.setupListeners();
});
