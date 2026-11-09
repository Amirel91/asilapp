'use strict';
/* ============================================================
   demo.js — demo in DOPPIA modalità
   A) Visitatore (ASILO.cur() === 'demo', niente flag superadmin):
      sola lettura totale — localStorage blindato, pulsanti di
      modifica nascosti, banner ambra «Modalità demo».
   B) Superadmin (sessionStorage asilapp_sa_entered === '1'):
      demo SBLOCCATA + toolkit dedicato per arricchirla:
      reset ai dati di fabbrica, seed memo/menù/diario d'esempio,
      statistiche contents. Tutti gli stili del toolkit sono
      definiti qui dentro (prefisso sa-demo-*): zero CSS esterni.
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined' || ASILO.cur() !== 'demo') return;

  const DEMO_KEY = ASILO.keyFor('demo'); // asilapp_v1
  const DEMO_MSG = '🔒 Demo in sola lettura: le modifiche non vengono salvate';

  const superOn = (() => {
    try { return sessionStorage.getItem('asilapp_sa_entered') === '1'; } catch (e) { return false; }
  })();

  /* ================= A) VISITATORE: SOLA LETTURA ================= */
  if (!superOn) {

    /* 1) blindatura localStorage: login/logout permessi, dati no */
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
            return; // scrittura bloccata
          }
        }
        return orig(k, v);
      };
    }

    /* 2) UI: nascondi i pulsanti di modifica */
    document.documentElement.classList.add('demo-ro');

    const roStyle = document.createElement('style');
    roStyle.textContent = [
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
      '.demo-banner{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;',
      'background:var(--amber-soft,#fdf6e3);color:var(--amber-ink,#8a6d1a);',
      'border:1px solid #e7d9b4;border-radius:var(--r,.9rem);padding:.55rem .85rem;',
      'font-size:.82rem;font-weight:600;box-shadow:var(--sh-sm);margin:.6rem 0;}'
    ].join('\n');
    document.head.appendChild(roStyle);

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
    return; // il visitatore non vede il toolkit
  }

  /* ================= B) SUPERADMIN: TOOLKIT DEMO ================= */
  const css = document.createElement('style');
  css.textContent = [
    '.sa-demo-tools{display:grid;gap:.6rem;background:var(--card,#fff);border:1px solid var(--line,#e7e5e4);',
    'border-radius:var(--r,.9rem);padding:.8rem .9rem;box-shadow:var(--sh-sm);margin:.6rem 0;}',
    '.sa-demo-title{font-size:.92rem;font-weight:700;letter-spacing:-.01em;margin:0;display:flex;align-items:center;gap:.4rem;}',
    '.sa-demo-sub{font-size:.76rem;color:var(--muted,#78716c);margin:0;line-height:1.45;}',
    '.sa-demo-btns{display:flex;gap:.45rem;flex-wrap:wrap;}',
    '.sa-demo-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;font-size:.78rem;color:var(--muted,#78716c);}',
    '.sa-demo-danger{color:var(--danger,#b3261e);background:var(--terra-soft,#f6e8e1);',
    'border:1px solid #eed6cc;border-radius:999px;}',
    '.sa-demo-danger:hover{background:#f3ddd4;border-color:var(--danger,#b3261e);}',
    '.sa-demo-chip{display:inline-flex;align-items:center;gap:.3rem;font-size:.74rem;font-weight:600;',
    'background:var(--sage-soft,#eef3ec);color:var(--sage-ink,#3f5138);border-radius:999px;padding:.25rem .65rem;}'
  ].join('\n');
  document.head.appendChild(css);

  const newId = () => (typeof uid === 'function') ? uid() : 'x' + Math.random().toString(36).slice(2, 8);
  const isoLocal = d => (typeof iso === 'function') ? iso(d)
    : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const curYmLocal = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const today = () => isoLocal(new Date());

  /* dati di fabbrica della demo: memo, menù e diario d'esempio */
  function seedDemo() {
    if (typeof state === 'undefined') return;
    const t = today();
    const kids = state.kids || [];
    state.memos = [
      { id: newId(), kid: kids[0] && kids[0].id, text: 'Domani gita al parco: portare la giacca antipioggia', done: false, ts: Date.now() },
      { id: newId(), kid: kids[1] && kids[1].id, text: 'Portare il cambio completo nello zainetto', done: true, ts: Date.now() - 864e5 }
    ];
    state.menu = state.menu || {};
    const days = ['Lunedì: pasta al pomodoro e polpettine', 'Martedì: risotto alla zucca e formaggio',
      'Mercoledì: minestrina e parmigiana', 'Giovedì: pasta al pesto e pesce al forno', 'Venerdì: riso e cotoletta con verdure'];
    const ym = curYmLocal();
    state.menu[ym] = {};
    for (let i = 1; i <= days.length; i++) state.menu[ym][String(i)] = days[i - 1];
    state.diary = state.diary || {};
    kids.forEach((k, i) => {
      state.diary[k.id] = state.diary[k.id] || {};
      state.diary[k.id][t] = { meal: true, sleep: i % 2 === 0, potty: i % 3 !== 0, note: 'Giornata serena: tanti giochi in giardino' };
    });
    if (typeof save === 'function') save();
    if (typeof renderAll === 'function') { try { renderAll(); } catch (e) {} }
    if (typeof toast === 'function') toast('Contenuti d\u2019esempio aggiunti alla demo ✓');
  }

  function resetDemo() {
    if (!confirm('Riporto la demo ai dati di fabbrica: memo, menù e diario tornano vuoti. Continuare?')) return;
    if (typeof state !== 'undefined') {
      state.memos = []; state.menu = {}; state.diary = {};
      if (typeof save === 'function') save();
      if (typeof renderAll === 'function') { try { renderAll(); } catch (e) {} }
    }
    if (typeof toast === 'function') toast('Demo svuotata ✓');
  }

  function mountToolkit() {
    if (typeof state === 'undefined' || !state || state.role !== 'admin') return;
    const v = document.getElementById('viewAdmin');
    if (!v || v.hidden || document.getElementById('saDemoTools')) return;
    const kids = (state.kids || []).length;
    const memos = (state.memos || []).length;
    const box = document.createElement('div');
    box.id = 'saDemoTools';
    box.className = 'sa-demo-tools';
    box.innerHTML =
      '<p class="sa-demo-title">🛠️ Toolkit superadmin — demo</p>' +
      '<p class="sa-demo-sub">Qui i contenuti della demo si possono modificare liberamente: i visitatori la vedranno in sola lettura.</p>' +
      '<span class="sa-demo-row">' +
        '<span class="sa-demo-chip">🧒 ' + kids + ' bambini</span>' +
        '<span class="sa-demo-chip">⏳ ' + memos + ' memo</span>' +
      '</span>' +
      '<span class="sa-demo-btns">' +
        '<button type="button" class="btn btn-outline btn-sm" data-sa-demo="seed">✨ Aggiungi contenuti di esempio</button>' +
        '<button type="button" class="btn btn-ghost btn-sm sa-demo-danger" data-sa-demo="reset">⟲ Svuota la demo</button>' +
      '</span>';
    const tabs = v.querySelector('.tabs');
    v.insertBefore(box, tabs || v.firstChild);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const b = t.closest('[data-sa-demo]');
    if (!b) return;
    const act = b.getAttribute('data-sa-demo');
    if (act === 'seed') seedDemo();
    if (act === 'reset') resetDemo();
    requestAnimationFrame(mountToolkit);
  });

  window.addEventListener('load', () => {
    mountToolkit();
    new MutationObserver(mountToolkit).observe(document.body, { childList: true, subtree: true });
  });
})();
