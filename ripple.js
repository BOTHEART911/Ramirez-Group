(function () {
  'use strict';
 
  // Elementos que reciben la onda
  const SEL = [
    '.btn',
    '.pin-key',
    '.fab',
    '.menu-tile',
    '.business-card',
    '.mesa-tile',
    '.app-header__back',
    '.app-header__icon',
    '.app-header__user',
    '.cobro__metodo',
    '.cred-venta__tipo-btn',
    '.cred-venta__mom-btn',
    '.cmd-btn',
    '.bot-action',
    '.aud-chip',
    '.res-pill',
    '[data-go]'
  ].join(',');
 
  document.addEventListener('pointerdown', (e) => {
    const host = e.target.closest && e.target.closest(SEL);
    if (!host) return;
    if (host.disabled) return;
 
    // Prepara el contenedor (recorta el círculo dentro del botón)
    host.classList.add('ripple-host');
 
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.width = ink.style.height = size + 'px';
    ink.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ink.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
 
    host.appendChild(ink);
    ink.addEventListener('animationend', () => ink.remove());
  }, { passive: true });
})();
