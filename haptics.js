/* ============================================================
 *  RAMÍREZ GROUP · haptics.js
 *  Vibración al tocar botones, tarjetas y teclado PIN, y según
 *  el resultado de las alertas (éxito / error / aviso).
 *  OJO: solo Android. El iPhone bloquea la vibración por web;
 *  se detecta y se ignora sin romper nada. Expone window.Haptic.
 *  ----------------------------------------------------------
 *  Instalar:  <script src="./haptics.js"></script>
 *             (al final, después de app.js)
 *  Pareja:    — (solo JS)
 *  No modifica los archivos originales · Reversible (borra la línea)
 * ============================================================ */

(function () {
  'use strict';
 
  // ── ¿El dispositivo soporta vibración? (Android sí, iOS no) ──
  const SOPORTA = typeof navigator !== 'undefined' &&
                  typeof navigator.vibrate === 'function';
 
  // ── Patrones de vibración (en milisegundos) ──────────────────
  // Un número = vibra ese tiempo. Un arreglo = vibra/pausa/vibra…
  const PATRONES = {
    tap:     8,                    // toque ligero (botones, tiles)
    medio:   18,                   // acción con peso (abrir mesa)
    exito:   [12, 45, 22],         // confirmación (pedido, cobro)
    aviso:   [22, 45, 22],         // advertencia
    error:   [30, 35, 30, 35, 30], // algo salió mal
    pin:     6                     // tecla del PIN (muy sutil)
  };
 
  // ── Respeto a "reducir movimiento" del sistema (accesibilidad) ─
  const reduceMovimiento = () => {
    try {
      return window.matchMedia &&
             window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) { return false; }
  };
 
  // ── Función central de vibración ─────────────────────────────
  function vibrar(patron) {
    if (!SOPORTA || reduceMovimiento()) return;
    try { navigator.vibrate(patron); } catch (_) {}
  }
 
  // ── API pública: puedes llamarla desde app.js si quieres ─────
  //   Ejemplo: Haptic.exito();  Haptic.error();
  window.Haptic = {
    tap:    () => vibrar(PATRONES.tap),
    medio:  () => vibrar(PATRONES.medio),
    exito:  () => vibrar(PATRONES.exito),
    aviso:  () => vibrar(PATRONES.aviso),
    error:  () => vibrar(PATRONES.error),
    pin:    () => vibrar(PATRONES.pin),
    soportado: SOPORTA
  };
 
  // ============================================================
  // VIBRACIÓN AUTOMÁTICA AL TOCAR
  // Un solo "escucha" global atrapa los toques en cualquier
  // botón o tarjeta y dispara la vibración. No hay que editar
  // ninguna función existente.
  // Usamos 'pointerdown' (no 'click') para que la vibración sea
  // instantánea, en el momento exacto en que el dedo toca.
  // ============================================================
 
  // Tiles del PIN: vibración aún más sutil
  const SEL_PIN = '.pin-key';
 
  // Todo lo demás que es "tocable" en la app
  const SEL_TAP = [
    'button',
    '.menu-tile',
    '.business-card',
    '.mesa-tile',
    '.mesa-cfg-card',
    '.prod-card',
    '.pc-prod',
    '.caja-card',
    '.cred-card',
    '.res-card',
    '.usr-card',
    '.aud-card',
    '.cmd-card',
    '.fab',
    '.login-tab',
    '.res-vista-toggle__btn',
    '.cobro__metodo',
    '.aud-chip',
    '.res-pill',
    '.cred-venta__tipo-btn',
    '.cred-venta__mom-btn',
    '[data-go]'
  ].join(',');
 
  // Evita doble disparo si un elemento encaja en varias reglas
  let ultimoTs = 0;
  function antiRebote() {
    const ahora = Date.now();
    if (ahora - ultimoTs < 40) return false; // 40ms entre vibraciones
    ultimoTs = ahora;
    return true;
  }
 
  document.addEventListener('pointerdown', (e) => {
    if (!SOPORTA) return;
    const t = e.target;
    if (!t || !t.closest) return;
 
    if (t.closest(SEL_PIN)) {
      if (antiRebote()) vibrar(PATRONES.pin);
      return;
    }
    if (t.closest(SEL_TAP)) {
      if (antiRebote()) vibrar(PATRONES.tap);
    }
  }, { passive: true });
 
  // ============================================================
  // VIBRACIÓN EN MOMENTOS CLAVE (automática)
  // Detectamos cuándo aparece un modal de éxito/error/aviso de
  // SweetAlert observando el ícono que pinta, y vibramos acorde.
  // Esto cubre tus alertOk / alertErr / alertWarn / Toast sin
  // tocar app.js.
  // ============================================================
  if (SOPORTA && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutaciones) => {
      for (const m of mutaciones) {
        for (const nodo of m.addedNodes) {
          if (nodo.nodeType !== 1) continue; // solo elementos
          // El popup de SweetAlert trae un ícono según el tipo
          const buscar = (sel) =>
            (nodo.matches && nodo.matches(sel)) ||
            (nodo.querySelector && nodo.querySelector(sel));
 
          if (buscar('.swal2-success')) { vibrar(PATRONES.exito); return; }
          if (buscar('.swal2-error'))   { vibrar(PATRONES.error); return; }
          if (buscar('.swal2-warning')) { vibrar(PATRONES.aviso); return; }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
