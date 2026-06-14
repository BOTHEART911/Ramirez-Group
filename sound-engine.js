(function () {
  'use strict';
 
  // Lista de sonidos a precargar (tomada de la app si existe)
  const urls = (typeof SOUNDS === 'object' && SOUNDS) ? Object.values(SOUNDS) : [];
 
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  const buffers = {};   // url -> audio decodificado (camino rápido)
  const elems   = {};   // url -> elemento de audio (camino de respaldo)
  const GAP_DEF = 200;  // ms mínimos entre sonidos (igual que tu app)
  let lastTs = 0;
 
  function asegurarCtx() {
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (_) { return null; } }
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
    return ctx;
  }
 
  // Precarga: deja listo un elemento de respaldo y decodifica el audio
  function precargar(url) {
    try { const a = new Audio(url); a.preload = 'auto'; a.volume = 0.7; elems[url] = a; } catch (_) {}
    if (!AC) return;
    fetch(url, { mode: 'cors' })
      .then((r) => r.arrayBuffer())
      .then((arr) => {
        const c = asegurarCtx();
        if (!c) return;
        c.decodeAudioData(arr, (buf) => { buffers[url] = buf; }, () => {});
      })
      .catch(() => { /* si falla, usaremos el respaldo */ });
  }
  urls.forEach(precargar);
 
  // Reproducir por el camino rápido (latencia casi cero)
  function tocarBuffer(url) {
    const c = asegurarCtx();
    if (!c || !buffers[url]) return false;
    try {
      const src = c.createBufferSource();
      src.buffer = buffers[url];
      const g = c.createGain();
      g.gain.value = 0.7;
      src.connect(g); g.connect(c.destination);
      src.start(0);
      return true;
    } catch (_) { return false; }
  }
 
  // Camino de respaldo (clona el elemento ya cargado)
  function tocarElem(url) {
    try {
      const base = elems[url];
      const n = base ? base.cloneNode() : new Audio(url);
      n.volume = 0.7;
      n.play().catch(() => {});
    } catch (_) {}
  }
 
  // ── Reemplazamos playSoundOnce por la versión rápida ────────
  window.playSoundOnce = function (url, gap) {
    const g = (typeof gap === 'number') ? gap : GAP_DEF;
    const now = Date.now();
    if (now - lastTs < g) return;
    lastTs = now;
    if (!url) return;
    if (!tocarBuffer(url)) tocarElem(url);
  };
 
  // Desbloquear el audio en el primer toque (requisito de los móviles)
  function desbloquear() {
    asegurarCtx();
    document.removeEventListener('pointerdown', desbloquear);
    document.removeEventListener('touchstart', desbloquear);
  }
  document.addEventListener('pointerdown', desbloquear, { passive: true });
  document.addEventListener('touchstart', desbloquear, { passive: true });
})();
