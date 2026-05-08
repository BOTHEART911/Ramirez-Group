/* ============================================================
   RAMIREZ GROUP — APP.JS (Fase 1)
   Restaurante y Pescadería Ramírez
   Autor: Oscar Polania | Cel: 3103230712
   ============================================================
   Contiene la infraestructura compartida:
   - Login (PIN rápido y documento)
   - Inicio multi-negocio
   - Menú principal del restaurante por rol
   - PWA (instalación, service worker, auto-actualización)
   - API helpers (apiGet / apiPost)
   - Sonidos
   - Navegación entre vistas
   - Control de permisos por rol
   - Almacenamiento local de sesión
   ============================================================ */

/* ============================================================
   CONFIGURACIÓN — EDITAR ESTAS CONSTANTES
   ============================================================ */
const API_BASE = 'https://script.google.com/macros/s/AKfycbx25rbzh5YOXcX_w-Ex6TTw5s5bfeDOy_y1elfltx4VFfCtUxsyCmxUKPo3OPe57PEK/exec'; // <-- Pega aquí la URL /exec del Apps Script

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
const APP_VERSION = '2026.05.08.1';   // se sobreescribe al leer version.json
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

function showView(viewId) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const v = document.getElementById('view-' + viewId);
  if (v) {
    v.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
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
      view: 'pendiente', placeholder: 'Toma de pedido'
    },
    {
      key: 'comanda', titulo: 'Comanda', desc: 'Vista de cocina',
      icono: ICONOS.chef,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','COCINA'],
      view: 'pendiente', placeholder: 'Comanda de cocina'
    },
    {
      key: 'pagos', titulo: 'Caja', desc: 'Cobrar y comprobantes',
      icono: ICONOS.caja,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CAJA'],
      view: 'pendiente', placeholder: 'Caja y pagos'
    },
    {
      key: 'catalogo', titulo: 'Catálogo', desc: 'Productos y precios',
      icono: ICONOS.plato,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR','MESERO','COCINA','CAJA'],
      view: 'pendiente', placeholder: 'Catálogo de productos'
    },
    {
      key: 'inventario', titulo: 'Inventario', desc: 'Stock de bebidas',
      icono: ICONOS.botella,
      roles: ['SUPERUSUARIO','ADMINISTRADOR','CONTADOR'],
      view: 'pendiente', placeholder: 'Inventario'
    },
    {
      key: 'mesas', titulo: 'Mesas', desc: 'Configurar mesas',
      icono: ICONOS.mesa,
      roles: ['SUPERUSUARIO','ADMINISTRADOR'],
      view: 'pendiente', placeholder: 'Configuración de mesas'
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
  if (!FIREBASE_CONFIG.databaseURL) return null;
  // Carga dinámica desde CDN
  await Promise.all([
    cargarScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
    cargarScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js')
  ]);
  // eslint-disable-next-line no-undef
  if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
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
   INICIALIZACIÓN
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  setupLoginUI();
  setupNavegacion();
  setupInstall();
  setupPWA();
  checkVersion();
  setInterval(checkVersion, 5 * 60 * 1000); // cada 5 min
});
