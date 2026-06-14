
(function () {
  'use strict';
 
  // Respeto a "reducir movimiento": si está activo, no animamos.
  try {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (_) {}
 
  // ── Totales que queremos animar (elementos únicos en pantalla) ─
  const SELECTORES = [
    '#pd-total',          // total del pedido
    '#pd-subtotal',       // subtotal del pedido
    '.cred-hero__val',    // cartera total (Créditos)
    '.bal-kpi-hero__val'  // ventas totales (Balances)
  ];
 
  const DURACION = 520;   // milisegundos que dura el conteo
 
  // Da formato de pesos igual que la app (usa fmtPesos si existe)
  function money(v) {
    if (typeof fmtPesos === 'function') return fmtPesos(v);
    return '$ ' + Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }
 
  // Extrae el número de un texto tipo "$ 85.000"
  function parse(s) {
    if (s == null) return null;
    const n = Number(String(s).replace(/[^\d-]/g, ''));
    return isNaN(n) ? null : n;
  }
 
  // Desaceleración suave
  const ease = (x) => 1 - Math.pow(1 - x, 3);
 
  function animar(el, desde, hasta) {
    if (el._raf) cancelAnimationFrame(el._raf);
    const t0 = performance.now();
    function frame(ahora) {
      const p = Math.min(1, (ahora - t0) / DURACION);
      const v = Math.round(desde + (hasta - desde) * ease(p));
      el._lastShown = v;
      const s = money(v);
      el._mine = s;             // marcamos que este texto lo escribimos nosotros
      el.textContent = s;
      if (p < 1) {
        el._raf = requestAnimationFrame(frame);
      } else {
        el._raf = null;
        el._lastShown = hasta;
        el._mine = money(hasta);
      }
    }
    el._raf = requestAnimationFrame(frame);
  }
 
  // Revisa cada total y anima si cambió
  function revisar() {
    for (const sel of SELECTORES) {
      const el = document.querySelector(sel);
      if (!el) continue;
 
      const txt = el.textContent;
      // Si este texto lo pusimos nosotros (un cuadro de la animación), ignorar
      if (el._mine != null && txt === el._mine) continue;
 
      const cur = parse(txt);
      if (cur == null) continue;
 
      // Primera vez que vemos este elemento: tomamos su valor sin animar
      if (el._val == null) {
        el._val = cur; el._lastShown = cur; el._mine = txt;
        continue;
      }
      if (cur === el._val) continue;   // no cambió
 
      const desde = (el._lastShown != null) ? el._lastShown : el._val;
      el._val = cur;
      animar(el, desde, cur);
    }
  }
 
  // ── Vigilamos cambios en la pantalla y revisamos (con freno) ──
  let agendado = false;
  const obs = new MutationObserver(() => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; revisar(); });
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
 
  revisar();   // primera pasada
})();
