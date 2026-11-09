'use strict';
/* ============================================================
   demo.js — modalità demo in SOLA LETTURA
   Attiva la protezione solo quando l'asilo corrente è la demo
   (ASILO.cur() === 'demo', chiave asilapp_v1):
   - nessuna modifica ai dati viene salvata (localStorage blindato):
     login/logout e ruoli restano permessi, tutto il resto no
   - i pulsanti che creano/modificano contenuti vengono nascosti
   - banner ambra «Modalità demo — sola lettura» sulle viste app
   Zero modifiche agli altri script.
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined' || ASILO.cur() !== 'demo') return;

  const DEMO_KEY = ASILO.keyFor('demo'); // asilapp_v1
  const DEMO_MSG = '🔒 Demo in sola lettura: le modifiche non vengono salvate';

  /* ---------- 1) blindatura localStorage ---------- */
  const snapshot = st => {
    if (!st) return '';
    const c = Object.assign({}, st, { role: null, parentKid: null });
    try { return JSON.stringify(c); } catch (e) { return ''; }
  };
  let frozen;
  try { frozen = snapshot(JSON.parse(localStorage.getItem(DEMO_KEY))); } catch (e) { frozen = null; }

  if (frozen !== null && typeof frozen === 'string') {
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      if (k === DEMO_KEY && typeof v === 'string') {
        let same = false;
        try { same = snapshot(JSON.parse(v)) === frozen; } catch (e) { same = false; }
        if (!same) {
          if (typeof toast === 'function') toast(DEMO_MSG);
          return; // scrittura bloccata: la demo resta intonsa
        }
      }
      return orig(k, v);
    };
  }

  /* ---------- 2) UI: nascondi i pulsanti di modifica ---------- */
  document.documentElement.classList.add('demo-ro');

  const style = document.createElement('style');
  style.textContent = [
    /* pulsanti che creano o modificano contenuti: via dalla demo */
    '.demo-ro [data-action="toggle-add-kid"],',
    '.demo-ro [data-action="sec-new"],',
    '.demo-ro [data-action="quick-new"],',
    '.demo-ro [data-action="backup-export"],',
    '.demo-ro #backupFile,',
    '.demo-ro #schoolForm button[type="submit"],',
    '.demo-ro #addKidForm,',
    '.demo-ro #quickForm,',
    '.demo-ro #secForm',
    '{ display: none !important; }',

    /* banner demo */
    '.demo-banner{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;',
    'background:var(--amber-soft,#fdf6e3);color:var(--amber-ink,#8a6d1a);',
    'border:1px solid #e7d9b4;border-radius:var(--r,.9rem);padding:.55rem .85rem;',
    'font-size:.82rem;font-weight:600;box-shadow:var(--sh-sm);margin:.6rem 0;}'
  ].join('\n');
  document.head.appendChild(style);

  /* ---------- 3) banner sulle viste maestre e famiglia ---------- */
  function mountBanners() {
    ['viewAdmin', 'viewParent'].forEach(vid => {
      const v = document.getElementById(vid);
      if (!v || v.hidden || v.querySelector('.demo-banner')) return;
      const bar = document.createElement('div');
      bar.className = 'demo-banner';
      bar.innerHTML = '<span>🔒 <strong>Modalità demo</strong> — stai guardando Asiloapp: tutto è visibile ma non modificabile.</span>';
      v.prepend(bar);
    });
  }

  window.addEventListener('load', () => {
    mountBanners();
    new MutationObserver(mountBanners).observe(document.body, { childList: true, subtree: true });
  });
})();
