/* ============================================================
 *  RAMÍREZ GROUP · transitions.js
 *  Transición lateral entre pantallas (estilo iOS): la nueva
 *  entra desde la derecha; "atrás" entra desde la izquierda.
 *  ----------------------------------------------------------
 *  Instalar:  <script src="./transitions.js"></script>
 *             (al final, después de app.js)
 *  Pareja:    styles-transition.css  (NECESARIA)
 *  No modifica los archivos originales · Reversible (borra la línea)
 *  Respeta "reducir movimiento" del sistema
 * ============================================================ */

(function () {
  'use strict';
 
  // Si por alguna razón showView no existe, no hacemos nada.
  if (typeof window.showView !== 'function') return;
 
  const _showView = window.showView;   // guardamos la original
  let navBack = false;                 // ¿el próximo cambio es "volver"?
 
  // ── Detectar toques en controles de "volver / subir" ─────────
  // Las flechas de regreso y los data-go a inicio/restaurante
  // significan que el usuario va HACIA ATRÁS.
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.app-header__back') ||
        t.closest('[data-go="inicio"]') ||
        t.closest('[data-go="restaurante"]') ||
        t.closest('#pd-back') ||
        t.closest('#pc-back')) {
      navBack = true;
    }
  }, { passive: true, capture: true });
 
  // ── Envolvemos showView ──────────────────────────────────────
  window.showView = function (viewId) {
    const next = document.getElementById('view-' + viewId);
    const back = navBack;
    navBack = false;   // se consume en cada cambio
 
    // Si la vista ya estaba activa (re-render), no animamos.
    const yaActiva = next && next.classList.contains('active');
 
    _showView(viewId);   // hace el cambio real (igual que siempre)
 
    if (!next || yaActiva) return;
 
    next.classList.remove('is-enter-fwd', 'is-enter-back');
    void next.offsetWidth;            // reinicia la animación
    next.classList.add(back ? 'is-enter-back' : 'is-enter-fwd');
 
    next.addEventListener('animationend', function fin() {
      next.classList.remove('is-enter-fwd', 'is-enter-back');
      next.removeEventListener('animationend', fin);
    });
  };
})();
