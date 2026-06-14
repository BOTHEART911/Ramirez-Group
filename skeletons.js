(function () {
  'use strict';
 
  // ── Piezas reutilizables ───────────────────────────────────
  const box     = (inner, dark) =>
    '<div class="sk-box' + (dark ? ' sk-box--dark' : '') + '">' + inner + '</div>';
  const line    = (cls) => '<div class="sk sk-line ' + (cls || '') + '"></div>';
  const repeat  = (n, fn) => { let s = ''; for (let i = 0; i < n; i++) s += fn(i); return s; };
 
  // Fila tipo "evento/reserva": avatar redondo + dos líneas + etiqueta
  const filaLista = () => box(
    '<div class="sk-row">' +
      '<div class="sk sk-circle"></div>' +
      '<div class="sk-grow">' + line('sk-line--60') + line('sk-line--40') + '</div>' +
      '<div class="sk sk-pill"></div>' +
    '</div>'
  );
 
  // Tarjeta tipo "cartera/caja": número, líneas y total + botón
  const tarjetaSaldo = () => box(
    '<div class="sk-row"><div class="sk sk-num"></div><div class="sk sk-pill"></div></div>' +
    line('sk-line--80') +
    '<div class="sk-foot"><div class="sk sk-total"></div><div class="sk sk-btn"></div></div>'
  );
 
  // ── Esqueletos por pantalla ─────────────────────────────────
  const SK = {
    // Anclaje: tarjeta de resumen (oscura) + tarjeta de pagos
    anclaje: () =>
      '<div class="sk-wrap">' +
        box('<div class="sk sk-title"></div>' +
            '<div class="sk-row">' + line('sk-line--40') + '<div class="sk sk-num"></div></div>' +
            '<div class="sk-row">' + line('sk-line--40') + '<div class="sk sk-num"></div></div>' +
            '<div class="sk-row">' + line('sk-line--40') + '<div class="sk sk-num"></div></div>', true) +
        box('<div class="sk sk-title"></div>' + line() + line('sk-line--80') + line('sk-line--60')) +
      '</div>',
 
    // Auditoría / Reservas: cabecera de día + varias filas
    lista: () =>
      '<div class="sk-wrap">' +
        box('<div class="sk-row"><div class="sk sk-pill"></div><div class="sk sk-pill" style="width:50px"></div></div>', true) +
        repeat(4, filaLista) +
      '</div>',
 
    // Balances: hero con KPIs + sección con barras
    balances: () =>
      '<div class="sk-wrap">' +
        box('<div class="sk-row"><div class="sk sk-circle"></div><div class="sk-grow">' +
              line('sk-line--40') + line('sk-line--80') + '</div></div>' +
            '<div class="sk-kpis" style="margin-top:6px">' +
              repeat(4, () => '<div class="sk" style="height:60px"></div>') +
            '</div>', true) +
        box('<div class="sk sk-title"></div>' +
            repeat(4, () => '<div class="sk-row" style="margin:4px 0">' +
              line('sk-line--40') + '<div class="sk sk-bar" style="flex:1;margin-left:10px"></div></div>')) +
      '</div>',
 
    // Créditos: hero (cartera) + tarjetas de saldo
    creditos: () =>
      '<div class="sk-wrap">' +
        box('<div class="sk sk-title"></div>' +
            '<div class="sk-row" style="margin-top:6px">' +
              '<div class="sk" style="height:48px;width:120px"></div>' +
              '<div class="sk" style="height:48px;width:120px"></div>' +
            '</div>', true) +
        repeat(3, tarjetaSaldo) +
      '</div>'
  };
 
  const set = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
 
  // ── Sustituir el spinner por el esqueleto en cada pantalla ──
  if (typeof Anclaje !== 'undefined') {
    Anclaje.pintarLoading = function () {
      set('anc-content', SK.anclaje());
      const foot = document.getElementById('anc-footer');
      if (foot) foot.classList.add('hidden');
    };
  }
 
  if (typeof Auditoria !== 'undefined') {
    Auditoria.pintarLoading = function () {
      set('aud-content', SK.lista());
      const foot = document.getElementById('aud-footer-load');
      if (foot) foot.innerHTML = '';
    };
  }
 
  if (typeof Balances !== 'undefined') {
    Balances.pintarLoading = function () {
      set('bal-content', SK.balances());
    };
  }
 
  if (typeof Reservas !== 'undefined') {
    Reservas.pintarLoading = function () {
      set('res-content', SK.lista());
    };
  }
 
  if (typeof Creditos !== 'undefined') {
    Creditos.pintarLoading = function () {
      set('cred-content', SK.creditos());
    };
  }
})();
