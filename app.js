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
const APP_VERSION = '2026.05.23.6'; // se sobreescribe al leer version.json
const NEGOCIO_RESTAURANTE_ID = 'NEG-001';
const SESSION_KEY = 'rgSession';

const SOUNDS = {
  login:    'https://res.cloudinary.com/dqqeavica/video/upload/v1759184556/login_w0qtf6.mp3',
  click:    'https://res.cloudinary.com/dqqeavica/video/upload/v1759166344/click_qgs94f.mp3',
  ok:       'https://res.cloudinary.com/dqqeavica/video/upload/v1759166346/correcto_kz0kme.mp3',
  err:      'https://res.cloudinary.com/dqqeavica/video/upload/v1759166344/error_jfaiip.mp3',
  warn:     'https://res.cloudinary.com/dqqeavica/video/upload/v1759166347/advertencia_b1hrok.mp3',
  pedido:   'https://res.cloudinary.com/dqqeavica/video/upload/v1759166344/notificacion_bkpdoo.mp3',
  caja:     'https://res.cloudinary.com/dqqeavica/video/upload/v1759166344/notificacion_bkpdoo.mp3'
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
  mesero:     'https://res.cloudinary.com/dqqeavica/image/upload/v1778186305/mesero_fs2r5u.webp'
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
  return roles.map(x => String(x).toUpperCase()).indexOf(r) >= 0;
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
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

async function setupPWA() {
  // Service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('SW no registrado:', e);
    }
  }

  // Decidir vista inicial
  if (!isStandalone()) {
    // Mostrar instalación
    showView('instalar');
    if (isIOS()) {
      $('#install-ios').classList.remove('hidden');
    } else if (deferredPrompt || 'BeforeInstallPromptEvent' in window) {
      $('#install-android').classList.remove('hidden');
    } else {
      // Esperar un momento por si llega beforeinstallprompt
      setTimeout(() => {
        if (deferredPrompt) {
          $('#install-android').classList.remove('hidden');
        } else {
          $('#install-other').classList.remove('hidden');
        }
      }, 700);
    }
  } else {
    iniciarSesion();
  }
}

function iniciarSesion() {
  // Si ya hay sesión guardada, ir directo a inicio
  const saved = localStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      state.user = JSON.parse(saved);
      irAInicio();
      return;
    } catch (_) {}
  }
  showView('login');
}

/* Auto-update: revisa version.json cada 5 min */
async function checkVersion() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j.version && j.version !== APP_VERSION) {
      console.log('Nueva versión disponible:', j.version);
      // Recargar limpiando cache
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      window.location.reload();
    }
    const numEl1 = $('#app-version-number');
    const numEl2 = $('#app-version-number-2');
    if (numEl1) numEl1.textContent = APP_VERSION;
    if (numEl2) numEl2.textContent = APP_VERSION;
  } catch (e) { /* silencioso */ }
}

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
  irAInicio();
}

function logout() {
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
  const inicial = String(state.user.nombre || '?').trim().charAt(0).toUpperCase();
  $('#welcome-avatar').textContent = inicial;
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
      roles: ['SUPERUSUARIO','CONTADOR'],
      view: 'pendiente', placeholder: 'Anclaje del día'
    },
    {
      key: 'balances', titulo: 'Balances', desc: 'Reportes mensuales',
      icono: ICONOS.excel,
      roles: ['SUPERUSUARIO','CONTADOR'],
      view: 'pendiente', placeholder: 'Balances mensuales'
    },
    {
      key: 'usuarios', titulo: 'Usuarios', desc: 'Gestionar equipo',
      icono: ICONOS.mesero,
      roles: ['SUPERUSUARIO','ADMINISTRADOR'],
      view: 'pendiente', placeholder: 'Gestión de usuarios'
    },
    {
      key: 'auditoria', titulo: 'Auditoría', desc: 'Registro de acciones',
      icono: ICONOS.ticket,
      roles: ['SUPERUSUARIO','CONTADOR'],
      view: 'pendiente', placeholder: 'Auditoría'
    },
    {
      key: 'config', titulo: 'Configuración', desc: 'Ajustes del sistema',
      icono: ICONOS.impresora,
      roles: ['SUPERUSUARIO'],
      view: 'pendiente', placeholder: 'Configuración'
    }
  ];

  const visibles = TILES.filter(t => t.roles.indexOf(rol) >= 0);

  const grid = $('#restaurante-menu-grid');
  grid.innerHTML = '';
  visibles.forEach(t => {
    const tile = document.createElement('button');
    tile.className = 'menu-tile';
    tile.innerHTML = `
      <img src="${t.icono}" alt="${t.titulo}" loading="lazy" />
      <div class="menu-tile__title">${t.titulo}</div>
      <div class="menu-tile__desc">${t.desc}</div>
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
      if (!deferredPrompt) {
        return alertInfo('Aún no disponible',
          'El instalador no está listo. Espera unos segundos e intenta de nuevo.');
      }
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }
  ['btn-cont-web', 'btn-cont-web-ios', 'btn-cont-other'].forEach(id => {
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
      manejaStock: false, disponible: true, orden: 0
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
        disponible: datos.disponible
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
    await this.cargarInicial();
    await this.engancharRTDB();
  },

  async cargarInicial() {
    startLoading();
    try {
      this.mesasConfig = await apiGet('listMesas');
      await apiPost('sincronizarVistaPedidos', withUser({}));
      this.render();
    } catch (e) {
      alertErr('Error al cargar mesas', e.message);
    } finally {
      stopLoading();
    }
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
      // Permisos: SUPER/ADMIN abren cualquier pedido, MESERO sólo el suyo
      const esMio = String(st.meseroId) === String(state.user.id);
      const esSuperAdmin = rolEs('SUPERUSUARIO', 'ADMINISTRADOR');
      if (!esSuperAdmin && !esMio) {
        return alertWarn('Mesa ocupada',
          `Esta mesa la abrió <b>${escapeHtml(st.meseroNombre || '?')}</b>. Sólo el mesero asignado puede modificar el pedido.`);
      }
      await this.abrirPedidoExistente(st.pedidoId);
    } else {
      const numero = (this.mesasConfig.find(m => m.id === mesaId) || {}).numero || '?';
      const ok = await confirmar(`Abrir mesa ${numero}`,
        `¿Crear un nuevo pedido en la mesa <b>#${numero}</b>?`, 'Sí, abrir');
      if (!ok) return;
      await this.crearYAbrirPedido(mesaId);
    }
  },

  async crearYAbrirPedido(mesaId) {
    startLoading();
    try {
      const r = await apiPost('crearPedido', withUser({ mesaId }));
      stopLoading();
      await this.abrirPedidoExistente(r.id);
    } catch (e) {
      stopLoading();
      alertErr('Error al abrir mesa', e.message);
    }
  },

  async abrirPedidoExistente(pedidoId) {
    startLoading();
    try {
      await apiPost('sincronizarPedido', withUser({ id: pedidoId }));
      this.engancharRTDBPedido(pedidoId);
      showView('pedido-detalle');
      stopLoading();
    } catch (e) {
      stopLoading();
      alertErr('Error al cargar pedido', e.message);
    }
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
    }

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
    // Botón "Pedir cuenta": visible cuando el pedido está SERVIDO o PARCIAL,
    // oculto si ya está PIDIENDO_CUENTA o aún hay ítems en cocina.
    const btnCuenta = $('#pd-btn-cuenta');
    if (btnCuenta) {
      const est = String(meta.estado || '').toUpperCase();
      const puedePedir = ['SERVIDO','PARCIAL_SERVIDO'].indexOf(est) >= 0;
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

    return `
      <article class="pd-item ${cancelado ? 'is-cancelado' : ''} ${it._tmp ? 'is-tmp' : ''}">
        <div class="pd-item__qty">${it.cantidad}×</div>
        <div class="pd-item__body">
          <div class="pd-item__head">
            <h4 class="pd-item__name">${escapeHtml(it.nombre)}</h4>
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
     CATÁLOGO EMBEBIDO
     ──────────────────────────────────────────── */
  async abrirCatalogo() {
    if (!this.pedidoActual) return;
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
  abrirModalProducto(producto) {
    const grupos = (this.catalogo.modificadores[producto.id] || []);
    const self = this;

    const gruposHTML = grupos.map((g, gi) => {
      const isUnica = String(g.tipoSeleccion || 'UNICA').toUpperCase() === 'UNICA';
      const opsHTML = g.opciones.map((o, oi) => {
        const type = isUnica ? 'radio' : 'checkbox';
        const name = isUnica ? `mp-g-${gi}` : `mp-g-${gi}-${oi}`;
        const checked = (isUnica && g.obligatorio && oi === 0) ? 'checked' : '';
        const delta = Number(o.precioDelta) || 0;
        const deltaStr = delta === 0 ? '' :
          (delta > 0 ? `+${fmtPesos(delta)}` : `${fmtPesos(delta)}`);
        return `
          <label class="mp-opt">
            <input type="${type}" name="${name}" value="${oi}"
                   data-mp-grupo="${gi}" data-mp-opcion="${oi}"
                   data-mp-delta="${delta}" ${checked} />
            <span class="mp-opt__name">${escapeHtml(o.opcion)}</span>
            ${deltaStr ? `<span class="mp-opt__delta">${deltaStr}</span>` : ''}
          </label>
        `;
      }).join('');
      return `
        <div class="mp-grupo">
          <div class="mp-grupo__head">
            <strong>${escapeHtml(g.nombreGrupo || g.grupo)}</strong>
            ${g.obligatorio ? `<span class="mp-tag mp-tag--oblig">Obligatorio</span>` : ''}
            <span class="mp-tag">${isUnica ? 'Única' : 'Múltiple'}</span>
          </div>
          <div class="mp-opts">${opsHTML}</div>
        </div>
      `;
    }).join('');

    Swal.fire({
      title: producto.nombre,
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
              <input type="number" id="mp-cantidad" value="1" min="1" max="50" />
              <button type="button" class="mp__qty-btn" data-mp-qty="+">+</button>
            </div>
          </div>

          ${gruposHTML}

          <label>Nota especial (opcional)</label>
          <textarea id="mp-nota" placeholder="Ej: sin cebolla, punto medio…"></textarea>

          <div class="mp__total-row">
            <span>Total</span>
            <span class="mp__total" id="mp-total">${fmtPesos(producto.precioBase)}</span>
          </div>
        </div>
      `,
      width: 560,
      showCancelButton: true,
      confirmButtonText: 'Agregar al pedido',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => {
        const recalc = () => {
          const cant = Math.max(1, Number($('#mp-cantidad').value) || 1);
          let delta = 0;
          $$('input[data-mp-delta]:checked').forEach(el => {
            delta += Number(el.dataset.mpDelta) || 0;
          });
          const total = (Number(producto.precioBase) + delta) * cant;
          $('#mp-total').textContent = fmtPesos(total);
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
        recalc();
      },
      preConfirm: () => {
        const seleccion = [];
        for (let gi = 0; gi < grupos.length; gi++) {
          const g = grupos[gi];
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
        return {
          cantidad: Math.max(1, Number($('#mp-cantidad').value) || 1),
          modificadores: seleccion,
          descripcion: $('#mp-nota').value.trim()
        };
      }
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      await self.agregarItem(producto, res.value);
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

    Toast && Toast.fire({ icon: 'success', title: `${datos.cantidad}× ${producto.nombre}` });

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
    } else {
      const ok = await confirmar('Quitar ítem',
        `¿Quitar <b>${escapeHtml(it.nombre)}</b> del pedido?`, 'Sí, quitar');
      if (!ok) return;
    }

    // Optimista: marcar cancelado localmente → render → POST en background
    this.optimistas[itemId] = { cancelado: true };
    this.renderDetalle();
    Toast && Toast.fire({ icon: 'success', title: 'Ítem cancelado' });

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
  },

  async pedirCuenta() {
    if (!this.pedidoActual) return;
    const meta = this.pedidoActual.meta || {};
    if (String(meta.estado).toUpperCase() === 'PIDIENDO_CUENTA') return;

    const ok = await confirmar('Pedir cuenta',
      `¿Notificar a caja que la mesa <b>#${meta.mesaNumero}</b> pide la cuenta por <b>${fmtPesos(meta.total)}</b>?`,
      'Sí, pedir');
    if (!ok) return;

    // Optimista: actualizar UI antes de la respuesta
    const estadoPrev = meta.estado;
    meta.estado = 'PIDIENDO_CUENTA';
    this.renderDetalle();
    playSoundOnce(SOUNDS.pedido);

    try {
      await apiPost('pedirCuenta', withUser({ pedidoId: this.pedidoActual.id }));
      Toast && Toast.fire({ icon: 'success', title: 'Caja notificada' });
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

  async abrir() {
    showView('comanda');
    await this.cargarInicial();
    await this.engancharRTDB();
    this.startTicker();
  },

  async cargarInicial() {
    startLoading();
    try {
      await apiPost('sincronizarVistaCocina', withUser({}));
    } catch (e) {
      alertErr('Error al cargar comanda', e.message);
    } finally {
      stopLoading();
    }
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
      ? `<div class="cmd-card__desc">📝 ${escapeHtml(it.descripcion)}</div>`
      : '';
    const tmp = this.optimistas[it.id] ? 'is-tmp' : '';

    let acciones = '';
    if (estado === 'PENDIENTE') {
      acciones = `<button class="cmd-btn cmd-btn--start" data-cmd-start="${it.id}">Empezar</button>`;
    } else if (estado === 'PREPARANDO') {
      acciones = `
        <button class="cmd-btn cmd-btn--back"  data-cmd-back="${it.id}" title="Devolver a pendientes">↶</button>
        <button class="cmd-btn cmd-btn--ready" data-cmd-ready="${it.id}">Marcar listo</button>
      `;
    } else {
      acciones = `<button class="cmd-btn cmd-btn--back" data-cmd-back="${it.id}" title="Volver a cocina">↶ Volver</button>`;
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
    $$('[data-crono-from]', view).forEach(el => {
      const iso = el.dataset.cronoFrom;
      if (!iso) { el.textContent = '—'; return; }
      // El backend manda "yyyy-MM-dd HH:mm:ss" en zona Bogotá, sin TZ. Lo
      // parseamos como local porque coincide con la zona del navegador
      // (los meseros y la cocina están en el mismo lugar físico).
      const ts = Date.parse(iso.replace(' ', 'T'));
      if (isNaN(ts)) { el.textContent = '—'; return; }
      const secs = Math.max(0, Math.floor((now - ts) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      // Clases de alerta según minutos
      el.classList.toggle('is-warn',  m >= 15 && m < 25);
      el.classList.toggle('is-late',  m >= 25);
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
  config: null,       // CAJA_DESCUENTO_MAX_PCT, etc.
  _ref: null,
  _tickInterval: null,

  async abrir() {
    showView('caja');
    await this.cargarInicial();
    await this.engancharRTDB();
    this.startTicker();
  },

async cargarInicial() {
    startLoading();
    try {
      // Fase 4: leer descuento máximo desde CONFIGURACION
      let descMax = 10;
      try {
        const cfg = await apiGet('getConfig', {});
        descMax = Number(cfg.CAJA_DESCUENTO_MAX_PCT) || 10;
      } catch (_) { /* fallback al default */ }
      this.config = { descuentoMaxPct: descMax };
      await apiPost('sincronizarVistaCaja', withUser({}));
    } catch (e) {
      alertErr('Error al cargar caja', e.message);
    } finally {
      stopLoading();
    }
  },

  async engancharRTDB() {
    if (this._ref) return;
    const fb = await getFirebase();
    if (!fb) return;
    this._ref = fb.database()
      .ref('/negocios/' + NEGOCIO_RESTAURANTE_ID + '/caja/porCobrar');
    this._ref.on('value', (snap) => {
      this.pedidos = snap.val() || {};
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
  },

  render() {
    const cont = $('#caja-content');
    if (!cont) return;

    const list = Object.entries(this.pedidos)
      .map(([id, p]) => ({ id, ...p }))
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
    $$('[data-espera-from]', view).forEach(el => {
      const iso = el.dataset.esperaFrom;
      const ts = Date.parse(iso.replace(' ', 'T'));
      if (isNaN(ts)) { el.textContent = '—'; return; }
      const secs = Math.max(0, Math.floor((now - ts) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = '⏱ ' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      el.classList.toggle('is-warn', m >= 3 && m < 7);
      el.classList.toggle('is-late', m >= 7);
    });
  },

  /* ────────────────────────────────────────────
     MODAL DE COBRO
     ──────────────────────────────────────────── */
  async abrirModalCobro(pedidoId) {
    const p = this.pedidos[pedidoId];
    if (!p) return;
 // Estado interno del modal
    const st = {
      pedidoId,
      subtotal:       Number(p.subtotal) || 0,
      descuentoPct:   0,
      descuentoValor: 0,
      total:          Number(p.total)    || 0,
      metodo:         'EFECTIVO',
      montoEfectivo:  0,
      montoTransfer:  0,
      comprobanteB64: null,
      comprobanteFn:  null,
      // Fase 4 — cliente
      esGenerico:        true,
      clienteNombre:     '',
      clienteTelefono:   '',
      clienteIdExistente: null   // se llena si el lookup encuentra match
    };
    st.descuentoMaxPct = this.config.descuentoMaxPct;

    const self = this;
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
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      await self.ejecutarCobro(p, st, res.value);
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
              📱 Se enviará el ticket por WhatsApp al cerrar la cuenta.
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
        statusCli.textContent = '';
        statusCli.className = 'cobro__cli-status';
        inpNombre.value = '';
        inpTel.value = '';
      }
    });

    inpNombre.addEventListener('input', () => {
      st.clienteNombre = inpNombre.value.trim();
    });

    // Lookup por teléfono con debounce
    let lookupT = null;
    inpTel.addEventListener('input', () => {
      // Solo permitir dígitos
      const v = inpTel.value.replace(/\D/g, '').substring(0, 10);
      if (v !== inpTel.value) inpTel.value = v;
      st.clienteTelefono = v;
      st.clienteIdExistente = null;

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
      clienteTelefono:  st.clienteTelefono
    };
  },

  async ejecutarCobro(p, st, datos) {
    startLoading();
    try {
      // Fase 4 — Asignar cliente al pedido antes de cobrar
      await apiPost('asignarClientePedido', withUser({
        pedidoId:   st.pedidoId,
        esGenerico: !!datos.esGenerico,
        cliente: datos.esGenerico ? null : {
          nombre:   datos.clienteNombre,
          telefono: datos.clienteTelefono
        }
      }));

      let comprobanteUrl = null;
      if (datos.comprobanteB64) {
        const up = await apiPost('subirComprobante', withUser({
          pedidoId:  p.id || st.pedidoId,
          filename:  datos.comprobanteFn,
          base64:    datos.comprobanteB64
        }));
        comprobanteUrl = up.url || up.URL || null;
        // Asignar la URL al pago de transferencia
        datos.pagos.forEach(pg => {
          if (pg.metodo === 'TRANSFERENCIA') pg.comprobanteUrl = comprobanteUrl;
        });
      }
      await apiPost('cobrarPedido', withUser({
        pedidoId:       st.pedidoId,
        descuentoPct:   datos.descuentoPct,
        descuentoValor: datos.descuentoValor,
        total:          datos.total,
        pagos:          datos.pagos
      }));
      stopLoading();
      playSoundOnce(SOUNDS.caja);
      const tituloOk = datos.esGenerico
        ? 'Pedido cobrado'
        : 'Pedido cobrado · 📱 Ticket enviado por WhatsApp';
      Toast && Toast.fire({ icon: 'success', title: tituloOk });
      // El listener RTDB borrará la tarjeta automáticamente
    } catch (e) {
      stopLoading();
      alertErr('Error al cobrar', e.message);
    }
  },

  setupListeners() { /* nada por ahora */ }
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
});
