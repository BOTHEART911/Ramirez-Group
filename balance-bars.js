/* ============================================================
 *  RAMÍREZ GROUP · balance-bars.js
 *  Las barras del dashboard de Balances crecen desde cero, en
 *  cascada, cada vez que entras o recargas la vista.
 *  ----------------------------------------------------------
 *  Instalar:  <script src="./balance-bars.js"></script>
 *             (al final, después de app.js)
 *  Pareja:    — (solo JS)
 *  No modifica los archivos originales · Reversible (borra la línea)
 *  Respeta "reducir movimiento" del sistema
 * ============================================================ */

(function () {
  'use strict';
 
  // Respeta la preferencia de "reducir movimiento": no anima
  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
 
  if (typeof Balances === 'undefined' || typeof Balances.render !== 'function') return;
 
  const SEL = '.bal-rank-row__bar-fill, .bal-hora-row__bar-fill, .bal-bar2__fill';
 
  // 1) Justo después de pintar: dejar las barras en cero (sin que se vea el salto)
  function prepararEnCero() {
    const cont = document.getElementById('bal-content');
    if (!cont) return;
    cont.querySelectorAll(SEL).forEach((el) => {
      const esAlto = el.classList.contains('bal-bar2__fill'); // estas crecen en alto
      const prop = esAlto ? 'height' : 'width';
      const objetivo = el.style[prop];
      if (!objetivo) return;
      el.dataset.grow = prop + '|' + objetivo; // guardamos el valor final
      el.style.transition = 'none';
      el.style[prop] = '0';
    });
  }
 
  // 2) En el siguiente cuadro: animar hasta el valor final, una tras otra
  function crecer() {
    const cont = document.getElementById('bal-content');
    if (!cont) return;
    cont.querySelectorAll('[data-grow]').forEach((el, i) => {
      const partes = el.dataset.grow.split('|');
      const prop = partes[0];
      const objetivo = partes[1];
      el.style.transition = prop + ' 0.55s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transitionDelay = Math.min(i, 12) * 40 + 'ms'; // efecto en cascada
      el.style[prop] = objetivo;
      el.removeAttribute('data-grow');
    });
  }
 
  // Envolvemos el render original sin tocarlo
  const renderOriginal = Balances.render;
  Balances.render = function () {
    renderOriginal.apply(this, arguments); // pinta el contenido normal
    prepararEnCero();                      // las deja en cero antes de mostrarse
    requestAnimationFrame(function () {
      requestAnimationFrame(crecer);       // y las hace subir
    });
  };
})();
