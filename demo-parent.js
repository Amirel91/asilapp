'use strict';
/* ============================================================
   demo-parent.js — demo diretta dell'area famiglie
   1) «Area famiglie →» sulla landing e nel login: entra nella
      demo (Asilo Nido Arcobaleno) e rilancia la pagina
   2) dopo il reload: login automatico come genitore (codice
      B001) guidando il VERO form di login di script.js
   3) banner-guida salvia dentro l'area famiglie: elenca le
      funzioni dei genitori, chiudibile e ricordato
   La demo resta in sola lettura grazie a demo.js: qui non si
   tocca né lo stato né i salvataggi.
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined') return;

  const FLAG = 'asilapp_demo_parent';      // «entro come genitore» (sessionStorage)
  const TOUR_KEY = 'asilapp_demo_tour_off'; // guida già chiusa (localStorage)
  const DEMO = 'Asilo Nido Arcobaleno';
  const CODE = 'B001';

  const flagOff = () => { try { sessionStorage.removeItem(FLAG); } catch (e) {} };

  /* ---------- 1) ingresso: landing e schermata di login ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('[data-action="goto-demo-parent"]')) return;
    ASILO.enter('demo');
    try { sessionStorage.setItem(FLAG, '1'); } catch (err) {}
    location.reload();
  });

  /* ---------- 2) login automatico come genitore ---------- */
  function autologin() {
    let on = false;
    try { on = sessionStorage.getItem(FLAG) === '1'; } catch (e) { on = false; }
    if (!on || ASILO.cur() !== 'demo') return;
    flagOff();
    const form = document.getElementById('loginForm');
    if (!form) return;

    // se una sessione precedente aveva già aperto una vista, si torna al login
    const lv = document.getElementById('viewLogin');
    if (lv && lv.hidden && typeof show === 'function') show('viewLogin');

    const tab = document.querySelector('.seg-btn[data-role="parent"]');
    if (tab) tab.click(); // script.js scopre il campo codice bambino

    const a = document.getElementById('loginAsilo');
    const c = document.getElementById('loginCode');
    if (a) a.value = DEMO;
    if (c) c.value = CODE;
    const err = document.getElementById('loginError');
    if (err) err.hidden = true;

    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    if (typeof toast === 'function') toast('Area famiglie della demo: guarda pure, è tutto in sola lettura 🔒');
    mountTour();
    setTimeout(mountTour, 600); // rientro se il render della vista arriva tardi
  }

  /* ---------- 3) banner-guida nell'area famiglie ---------- */
  const style = document.createElement('style');
  style.textContent = [
    '.demo-tour{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;',
    'background:var(--sage-soft,#eef3ec);color:var(--sage-ink,#3f5138);',
    'border:1px solid #d6e1d8;border-radius:var(--r,.9rem);padding:.55rem .85rem;',
    'font-size:.82rem;font-weight:600;box-shadow:var(--sh-sm);margin:.6rem 0;}'
  ].join('\n');
  document.head.appendChild(style);

  function mountTour() {
    if (ASILO.cur() !== 'demo') return;
    if (typeof state === 'undefined' || !state || state.role !== 'parent') return;
    let off = false;
    try { off = localStorage.getItem(TOUR_KEY) === '1'; } catch (e) {}
    if (off) return;
    const v = document.getElementById('viewParent');
    if (!v || v.hidden || document.getElementById('demoParentTour')) return;
    const box = document.createElement('div');
    box.id = 'demoParentTour';
    box.className = 'demo-tour';
    box.innerHTML =
      '<span>\uD83D\uDCD6 <strong>Area famiglie</strong>: memo delle maestre da confermare, men\u00f9 del mese, diario della giornata, avvisi e nota salute del bambino.</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-tour-off="1" aria-label="Chiudi la guida">\u2715</button>';
    v.prepend(box);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('[data-tour-off]')) return;
    try { localStorage.setItem(TOUR_KEY, '1'); } catch (err) {}
    const box = document.getElementById('demoParentTour');
    if (box) box.remove();
  });

  window.addEventListener('load', () => {
    autologin();
    mountTour();
    new MutationObserver(mountTour).observe(document.body, { childList: true, subtree: true });
  });
})();
