'use strict';
/* demo-page.js — pagina demo autonoma (demo.html)
   Nessun login, nessun salvataggio: solo interfacce d'esempio.
   1) segmento maestre/famiglia
   2) tab del pannello maestre
   3) calendario menù del mese corrente (righe di esempio)
   4) pulsanti data-demo-lock → toast «sola lettura»
   5) toast locale (questa pagina non carica script.js) */
(function () {

  /* ---------- toast locale ---------- */
  function toast(msg) {
    const wrap = document.getElementById('toastWrap');
    const host = wrap || document.body;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    if (!wrap) t.style.cssText = 'position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:90';
    host.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* ---------- 1) vista maestre / famiglia ---------- */
  const segBtns = Array.prototype.slice.call(document.querySelectorAll('[data-demo-view]'));
  const adminView = document.getElementById('demoAdmin');
  const parentView = document.getElementById('demoParent');
  function setView(name) {
    segBtns.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-demo-view') === name)));
    if (adminView) adminView.hidden = name !== 'admin';
    if (parentView) parentView.hidden = name !== 'parent';
  }
  segBtns.forEach(b => b.addEventListener('click', () => setView(b.getAttribute('data-demo-view'))));
  setView('admin');

  /* ---------- 2) tab ---------- */
  const tabs = Array.prototype.slice.call(document.querySelectorAll('[data-demo-tab]'));
  const panes = Array.prototype.slice.call(document.querySelectorAll('[data-demo-pane]'));
  function setTab(name) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.getAttribute('data-demo-tab') === name)));
    panes.forEach(p => { p.hidden = p.getAttribute('data-demo-pane') !== name; });
  }
  tabs.forEach(t => t.addEventListener('click', () => setTab(t.getAttribute('data-demo-tab'))));
  setTab('kids');

  /* ---------- 3) menù d'esempio del mese corrente ---------- */
  const MENU = [
    'Pasta al pomodoro e polpettine',
    'Risotto alla zucca e formaggio',
    'Minestrina e parmigiana',
    'Pasta al pesto e pesce al forno',
    'Riso e cotoletta con verdure'
  ];
  const now = new Date();
  const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const ymLabel = mesi[now.getMonth()] + ' ' + now.getFullYear();

  function buildMenu(gridId, ymChipId, maxDays) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const days = now.getMonth() === 1 ? 28 : [3,5,8,10].indexOf(now.getMonth()) !== -1 ? 30 : 31;
    const limit = Math.min(days, maxDays || days);
    let html = '';
    for (let d = 1; d <= limit; d++) {
      const txt = MENU[(d - 1) % MENU.length];
      html += '<div class="menu-day has-menu"><span class="menu-date">' + d + '</span><span class="menu-txt">' + txt + '</span></div>';
    }
    grid.innerHTML = html;
    const chip = ymChipId && document.getElementById(ymChipId);
    if (chip) chip.textContent = '📅 ' + ymLabel;
  }
  buildMenu('demoMenuGrid', 'demoMenuYm');
  buildMenu('demoParentMenu', null, 10);

  /* ---------- 4) sola lettura ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-demo-lock]')) {
      e.preventDefault();
      toast('🔒 Demo in sola lettura: registrati per usare davvero Asilapp');
    }
  });

})();
