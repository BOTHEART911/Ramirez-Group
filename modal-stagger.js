/* ============================================================
 *  RAMÍREZ GROUP · modal-stagger.js
 *  El contenido de las ventanas (alertas) entra escalonado:
 *  primero el título, luego los elementos, luego los botones.
 *  ----------------------------------------------------------
 *  Instalar:  <script src="./modal-stagger.js"></script>
 *             (al final, después de app.js)
 *  Pareja:    — (solo JS, usa Web Animations API)
 *  No modifica los archivos originales · Reversible (borra la línea)
 *  Respeta "reducir movimiento" del sistema
 * ============================================================ */

(function () {
  'use strict';
 
  // Respeto a "reducir movimiento": si está activo, no animamos.
  let reduce = false;
  try {
    reduce = window.matchMedia &&
             window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}
  if (reduce) return;
 
  const PASO = 48;     // ms de retardo entre un elemento y el siguiente
  const DUR  = 380;    // ms que dura la entrada de cada elemento
  const TOPE = 10;     // máximo de elementos a escalonar (para no demorar)
 
  // Elige qué elementos del modal animar, en orden.
  function objetivos(popup) {
    const lista = [];
 
    const titulo = popup.querySelector('.swal2-title');
    if (titulo && titulo.offsetParent !== null) lista.push(titulo);
 
    const html = popup.querySelector('.swal2-html-container');
    if (html) {
      let hijos = Array.from(html.children)
        .filter((el) => getComputedStyle(el).display !== 'none');
      // Si todo viene envuelto en un solo contenedor, escalonamos lo de adentro
      if (hijos.length <= 1 && hijos[0] && hijos[0].children.length > 1) {
        hijos = Array.from(hijos[0].children)
          .filter((el) => getComputedStyle(el).display !== 'none');
      }
      hijos.forEach((el) => lista.push(el));
    }
 
    const acciones = popup.querySelector('.swal2-actions');
    if (acciones && acciones.offsetParent !== null) lista.push(acciones);
 
    return lista;
  }
 
  function escalonar(popup) {
    if (!popup || popup._staggered) return;
    if (popup.classList.contains('swal2-toast')) return;   // los avisos no
    popup._staggered = true;
 
    const items = objetivos(popup);
    items.forEach((el, i) => {
      const retardo = Math.min(i, TOPE) * PASO;
      try {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          {
            duration: DUR,
            delay: retardo,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'backwards'   // se mantiene oculto durante su retardo
          }
        );
      } catch (_) {}
    });
  }
 
  // ── Detecta cuándo se abre un modal y lo escalona ───────────
  const obs = new MutationObserver((mutaciones) => {
    for (const m of mutaciones) {
      for (const nodo of m.addedNodes) {
        if (nodo.nodeType !== 1) continue;
        let popup = null;
        if (nodo.matches && nodo.matches('.swal2-popup')) popup = nodo;
        else if (nodo.querySelector) popup = nodo.querySelector('.swal2-popup');
        if (popup) requestAnimationFrame(() => escalonar(popup));
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
