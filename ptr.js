(function () {
  'use strict';
 
  // Solo en dispositivos táctiles
  if (!('ontouchstart' in window)) return;
 
  // ── Qué recargar según la vista activa ──────────────────────
  // La clave es el id de la vista sin el prefijo "view-".
  // Cada función llama a la recarga propia de esa pantalla.
  const REFRESCAR = {
    'catalogo':      () => Catalogo.cargar(),
    'mesas':         () => Mesas.cargar(),
    'inventario':    () => Inventario.cargar(),
    'usuarios':      () => Usuarios.cargar(),
    'configuracion': () => Configuracion.cargar(),
    'auditoria':     () => Auditoria.cargar(true),
    'balances':      () => Balances.cargar(),
    'reservas':      () => Reservas.cargar(),
    'creditos':      () => Creditos.cargar(),
    'anclaje':       () => Anclaje.refrescar(false),
 
    // Vistas en vivo (RTDB): forzamos un re-sincronizado real
    'tomar-pedido':  () => {
      try { localStorage.removeItem('rg.sync.pedidos'); } catch (_) {}
      Pedidos.refrescarMesasConfigBg();
      Pedidos.sincronizarVistaBg();
    },
    'comanda': () => {
      try { localStorage.removeItem('rg.sync.cocina'); } catch (_) {}
      Comanda.sincronizarVistaBg();
      Comanda.render();
    },
    'caja': () => {
      try { localStorage.removeItem('rg.sync.caja'); } catch (_) {}
      Caja.sincronizarVistaBg();
      Caja.render();
    }
  };
 
  // ── Crear el indicador una sola vez ─────────────────────────
  const ptr = document.createElement('div');
  ptr.id = 'ptr';
  ptr.innerHTML = '<div class="ptr__ring"></div>';
  document.body.appendChild(ptr);
 
  const UMBRAL   = 64;   // px de arrastre (ya con resistencia) para activar
  const MAX      = 90;   // px máximo que baja el indicador
  const RESIST   = 0.5;  // resistencia: el dedo recorre el doble que el indicador
  const MIN_LOAD = 700;  // ms mínimos que se ve girando (para que no parpadee)
 
  let activo = false;    // ¿estamos en un gesto válido de PTR?
  let startY = 0;
  let pull   = 0;
  let fnActual = null;
 
  // ¿Hay un modal de SweetAlert abierto?
  const modalAbierto = () =>
    !!document.querySelector('.swal2-container') ||
    !!document.getElementById('comp-lightbox');
 
  // Vista activa → función de recarga (o null)
  function refrescarDeVistaActiva() {
    const v = document.querySelector('.view.active');
    if (!v || !v.id) return null;
    const id = v.id.replace('view-', '');
    return REFRESCAR[id] || null;
  }
 
  function setIndicador(y, progreso) {
    ptr.classList.remove('ptr--anim');
    ptr.style.transform = 'translateX(-50%) translateY(' + y + 'px)';
    ptr.style.opacity = String(progreso);
    const ring = ptr.firstChild;
    if (ring) ring.style.transform = 'rotate(' + (progreso * 300) + 'deg)';
  }
 
  function resetIndicador() {
    ptr.classList.add('ptr--anim');
    ptr.classList.remove('ptr--ready', 'ptr--loading');
    ptr.style.transform = 'translateX(-50%) translateY(-64px)';
    ptr.style.opacity = '0';
    const ring = ptr.firstChild;
    if (ring) ring.style.transform = '';
  }
 
  function dispararRecarga() {
    ptr.classList.add('ptr--anim', 'ptr--loading');
    ptr.classList.remove('ptr--ready');
    ptr.style.transform = 'translateX(-50%) translateY(20px)';
    ptr.style.opacity = '1';
 
    const inicio = Date.now();
    let resultado;
    try { resultado = fnActual ? fnActual() : null; }
    catch (_) { resultado = null; }
 
    Promise.resolve(resultado).catch(() => {}).then(() => {
      const espera = Math.max(0, MIN_LOAD - (Date.now() - inicio));
      setTimeout(resetIndicador, espera);
    });
  }
 
  // ── Eventos táctiles ────────────────────────────────────────
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (window.scrollY > 0) return;          // solo arriba del todo
    if (modalAbierto()) return;
    if (ptr.classList.contains('ptr--loading')) return;
 
    // Evitar zonas con su propio scroll (kanban en escritorio, etc.)
    const t = e.target;
    if (t && t.closest && t.closest('.kanban-col__body, .swal2-container, .comp-lightbox')) return;
 
    fnActual = refrescarDeVistaActiva();
    if (!fnActual) return;
 
    startY = e.touches[0].clientY;
    pull = 0;
    activo = true;
  }, { passive: true });
 
  document.addEventListener('touchmove', (e) => {
    if (!activo) return;
    const dy = e.touches[0].clientY - startY;
 
    // Si el usuario arrastra hacia arriba, cancelamos (es scroll normal)
    if (dy <= 0) { activo = false; resetIndicador(); return; }
 
    // Reclamamos el gesto: evitamos que la página haga scroll
    if (e.cancelable) e.preventDefault();
 
    pull = dy * RESIST;
    const visible = Math.min(pull, MAX);
    const y = -64 + visible + 64 * (visible / MAX); // baja suave
    const progreso = Math.min(pull / UMBRAL, 1);
 
    setIndicador(Math.min(visible, MAX), progreso);
    ptr.classList.toggle('ptr--ready', pull >= UMBRAL);
  }, { passive: false });
 
  function finGesto() {
    if (!activo) return;
    activo = false;
    if (pull >= UMBRAL) dispararRecarga();
    else resetIndicador();
  }
 
  document.addEventListener('touchend', finGesto, { passive: true });
  document.addEventListener('touchcancel', () => {
    if (!activo) return;
    activo = false;
    resetIndicador();
  }, { passive: true });
})();
