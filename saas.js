'use strict';
/* ============================================================
   saas.js — multi-asilo (base SaaS lato client)
   Caricato PRIMA di script.js: espone window.ASILO, il registry
   degli asili e la landing page (scelta asilo + registrazione).
   Ogni asilo ha il suo stato in una chiave localStorage separata
   (asilapp_t_<id>); la demo usa la chiave storica asilapp_v1.
   L'asilo "corrente" vive in sessionStorage, così ogni tab del
   browser può anche restare su un asilo diverso.

   In coda: modulo «superadmin entra senza login» e modulo
   «demo area famiglie» (ingresso diretto genitore dalla landing).
   ============================================================ */
window.ASILO = (function () {
  const REG = 'asilapp_registry';
  const CUR = 'asilapp_cur';

  const slug = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asilo';

  function registry() {
    try {
      const r = JSON.parse(localStorage.getItem(REG));
      return Array.isArray(r) ? r.filter(a => a && a.id && a.name) : [];
    } catch (e) { return []; }
  }
  const saveReg = r => { try { localStorage.setItem(REG, JSON.stringify(r)); } catch (e) {} };

  return {
    cur: () => { try { return sessionStorage.getItem(CUR); } catch (e) { return null; } },
    enter: id => { try { sessionStorage.setItem(CUR, id); } catch (e) {} },
    exit: () => { try { sessionStorage.removeItem(CUR); } catch (e) {} },
    keyFor: id => (id === 'demo' || !id) ? 'asilapp_v1' : 'asilapp_t_' + id,
    registry,
    slug,
    resolve(name) {
      const q = slug(name);
      if (!q) return null;
      return registry().find(a => a.slug === q) || null;
    },
    /* registra un nuovo asilo: ritorna {id} o {err} */
    signup(name, pw) {
      const s = slug(name);
      if (registry().some(a => a.slug === s)) return { err: 'Esiste già un asilo con questo nome su questo dispositivo.' };
      const id = 'a' + Math.random().toString(36).slice(2, 9);
      const r = registry(); r.push({ id, name, slug: s }); saveReg(r);
      const st = (typeof seed === 'function') ? seed() : null;
      if (st) {
        st.school = name;
        st.pw = pw;
        st.sections = [{ id: (typeof uid === 'function' ? uid() : 's1'), name: 'Sezione unica' }];
        st.kids = []; st.memos = []; st.menu = {}; st.meals = {}; st.diary = {};
        st.msgs = [{ id: (typeof uid === 'function' ? uid() : 'm1'), text: 'Benvenute su Asilapp! Da qui invierete memo, menù e avvisi alle famiglie.', ts: Date.now(), reads: {} }];
        try { localStorage.setItem('asilapp_t_' + id, JSON.stringify(st)); }
        catch (e) { return { err: 'Salvataggio non riuscito: memoria del browser piena?' }; }
      }
      return { id };
    }
  };
})();

/* ---------- UI della landing ---------- */
(function () {
  if (typeof ASILO === 'undefined') return;

  function showLanding() {
    if (typeof show !== 'function') return;
    show('viewLanding');
    const n = document.getElementById('signupName');
    if (n) n.focus();
  }

  function onSignup(e) {
    e.preventDefault();
    const err = document.getElementById('signupErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    const name = ((document.getElementById('signupName') || {}).value || '').trim().replace(/\s+/g, ' ');
    const pw = (document.getElementById('signupPass') || {}).value || '';
    const pw2 = (document.getElementById('signupPass2') || {}).value || '';
    if (name.length < 3) return fail('Il nome dell\u2019asilo richiede almeno 3 lettere.');
    if (ASILO.resolve(name)) return fail('Esiste già un asilo con questo nome.');
    if (pw.length < 6) return fail('La password richiede almeno 6 caratteri.');
    if (pw !== pw2) return fail('Le due password non coincidono.');
    const r = ASILO.signup(name, pw);
    if (r.err) return fail(r.err);
    const btn = document.getElementById('signupBtn');
    if (btn) { btn.disabled = true; btn.textContent = '\u2713 Asilo creato: preparo lo spazio\u2026'; }
    ASILO.enter(r.id);
    if (typeof toast === 'function') toast('Asilo registrato! Benvenute \u2713');
    setTimeout(() => location.reload(), 500);
  }

  function enter(id) {
    ASILO.enter(id);
    location.reload();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const b = t.closest('[data-action="asilo-enter"]');
    if (b) { enter(b.getAttribute('data-id')); return; }
    if (t.closest('[data-action="goto-demo"]')) { enter('demo'); return; }
    /* demo area famiglie: entra nella demo con flag genitore,
       demo-parent.js al load farà il login automatico col codice B001 */
    if (t.closest('[data-action="goto-demo-parent"]')) {
      try { sessionStorage.setItem('asilapp_demo_parent', '1'); } catch (err) {}
      enter('demo');
      return;
    }
    if (t.closest('[data-action="goto-login"]')) {
      if (typeof show === 'function') show('viewLogin');
      const a = document.getElementById('loginAsilo');
      if (a) a.focus();
      return;
    }
    if (t.closest('[data-action="goto-signup"]')) {
      const f = document.getElementById('signupName');
      if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.focus({ preventScroll: true }); }
      return;
    }
    if (t.closest('[data-action="switch-asilo"]')) { ASILO.exit(); location.reload(); }
  });
  document.addEventListener('submit', e => {
    if (e.target instanceof Element && e.target.id === 'signupForm') onSignup(e);
  });

  window.addEventListener('load', () => {
    if (!ASILO.cur()) showLanding();
    else {
      const a = ASILO.registry().find(x => x.id === ASILO.cur());
      const inp = document.getElementById('loginAsilo');
      if (a && inp && !inp.value) inp.value = a.name;
    }
  });
})();

/* ============================================================
   SUPERADMIN — accesso diretto agli asili (bypass del login)
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined') return;
  const FLAG = 'asilapp_sa_entered';

  const saToast = m => { if (typeof toast === 'function') toast(m); };
  const inSuper = () => { try { return sessionStorage.getItem(FLAG) === '1'; } catch (e) { return false; } };
  const known = id => id === 'demo' || ASILO.registry().some(x => x.id === id);

  function backToSuper() {
    try { sessionStorage.removeItem(FLAG); } catch (e) {}
    ASILO.exit();
    location.hash = 'superadmin';
    location.reload();
  }

  function enterAsilo(id) {
    if (typeof load !== 'function' || typeof showAdmin !== 'function') return;
    if (!known(id)) { saToast('Asilo non trovato'); return; }
    const a = id === 'demo' ? { name: 'Asilo Nido Arcobaleno (demo)' } : ASILO.registry().find(x => x.id === id);
    ASILO.enter(id);
    try {
      KEY = ASILO.keyFor(id);
      state = load();
    } catch (e) { saToast('Impossibile aprire l\u2019asilo'); return; }
    try { sessionStorage.setItem(FLAG, '1'); } catch (e) {}
    showAdmin();
    mountBanner();
    saToast('Entrata in «' + a.name + '» senza login \u2713');
  }

  function mountBanner() {
    if (!inSuper()) return;
    const view = document.getElementById('viewAdmin');
    if (!view || view.hidden || document.getElementById('saEnterBar')) return;
    const bar = document.createElement('div');
    bar.id = 'saEnterBar';
    bar.className = 'sa-enter-bar';
    bar.innerHTML =
      '<span>\uD83D\uDD11 Sei dentro come <strong>superadmin</strong>: puoi modificare tutto senza login.</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-sa-back="1">\u2190 Pannello superadmin</button>';
    const tabs = view.querySelector('.tabs');
    view.insertBefore(bar, tabs || view.firstChild);
  }

  function decorate() {
    document.querySelectorAll('.sa-item').forEach(card => {
      if (card.querySelector('[data-sa-enter]')) return;
      let id = card.getAttribute('data-id');
      if (!id) { const b = card.querySelector('[data-id]'); id = b && b.getAttribute('data-id'); }
      if (!id || !known(id)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm';
      btn.setAttribute('data-sa-enter', id);
      btn.textContent = '\uD83D\uDD11 Entra senza login';
      (card.querySelector('.sa-actions') || card).appendChild(btn);
    });
    mountBanner();
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const b = t.closest('[data-sa-enter]');
    if (b) { e.stopImmediatePropagation(); enterAsilo(b.getAttribute('data-sa-enter')); return; }
    if (t.closest('[data-sa-back]')) { e.stopImmediatePropagation(); backToSuper(); return; }
    if (inSuper() && t.closest('[data-action="logout"]')) {
      e.stopImmediatePropagation();
      backToSuper();
    }
  });

  window.addEventListener('load', () => {
    decorate();
    new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
  });
})();

/* ============================================================
   SUPERADMIN EXTRA — dashboard, ricerca, backup globali
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined') return;

  const REGKEY = 'asilapp_registry';
  const saToast = m => { if (typeof toast === 'function') toast(m); };
  const fail = m => { const e = document.getElementById('saErr'); if (e) { e.textContent = m; e.hidden = false; } };

  function readState(id) {
    try {
      const d = JSON.parse(localStorage.getItem(ASILO.keyFor(id)));
      return (d && d.v === 1 && Array.isArray(d.kids)) ? d : null;
    } catch (e) { return null; }
  }
  function writeState(id, st) {
    try { localStorage.setItem(ASILO.keyFor(id), JSON.stringify(st)); return true; }
    catch (e) { return false; }
  }
  function saveReg(reg) {
    try { localStorage.setItem(REGKEY, JSON.stringify(reg)); return true; }
    catch (e) { return false; }
  }
  const tenants = () => [{ id: 'demo', name: 'Asilo Nido Arcobaleno (demo)' }].concat(ASILO.registry());
  const nameOf = id => { const t = tenants().find(x => x.id === id); return t ? t.name : 'asilo'; };
  const curYm = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mealsOfMonth = st => {
    const mm = (st.meals || {})[curYm()] || {};
    let n = 0;
    Object.keys(mm).forEach(k => { n += Number(mm[k] && mm[k].n) || 0; });
    return n;
  };

  function statsHtml() {
    let kids = 0, secs = 0, memo = 0, meals = 0, diets = 0;
    const list = tenants();
    list.forEach(t => {
      const st = readState(t.id); if (!st) return;
      kids += (st.kids || []).length;
      secs += (st.sections || []).length;
      memo += (st.memos || []).filter(m => !m.done).length;
      meals += mealsOfMonth(st);
      diets += (st.kids || []).filter(k => String(k.allergy || '').trim()).length;
    });
    return '<span class="sa-stat">🏫 Asili: ' + list.length + '</span>' +
      '<span class="sa-stat">🧒 Bambini: ' + kids + '</span>' +
      '<span class="sa-stat">🏷️ Classi: ' + secs + '</span>' +
      '<span class="sa-stat">⏳ Memo in attesa: ' + memo + '</span>' +
      '<span class="sa-stat">🍝 Pasti del mese: ' + meals + '</span>' +
      (diets ? '<span class="sa-stat warn">⚠️ Diete speciali: ' + diets + '</span>' : '');
  }
  let statsCache = '';
  function renderStats() {
    const box = document.getElementById('saStats'); if (!box) return;
    const h = statsHtml();
    if (h === statsCache) return;
    statsCache = h; box.innerHTML = h;
  }

  const panel = () => document.querySelector('.sa-view') || document.getElementById('viewSuperadmin');
  function mountBar() {
    const p = panel();
    if (!p || document.getElementById('saTools')) return;
    const bar = document.createElement('div');
    bar.id = 'saTools';
    bar.className = 'sa-tools';
    bar.innerHTML =
      '<div class="sa-stats" id="saStats"></div>' +
      '<div class="sa-tools-row">' +
        '<input type="search" class="input" id="saSearch" placeholder="Cerca asilo per nome…" autocomplete="off" aria-label="Cerca asilo">' +
        '<select class="input" id="saSort" aria-label="Ordina asili">' +
          '<option value="name">Ordina: nome</option>' +
          '<option value="kids">Ordina: bambini</option>' +
        '</select>' +
      '</div>' +
      '<div class="sa-tools-row">' +
        '<button type="button" class="btn btn-outline btn-sm" data-sax="backup-all">⬇ Backup di tutti gli asili</button>' +
        '<label class="btn btn-ghost btn-sm" style="cursor:pointer">⬆ Ripristina backup globale' +
          '<input type="file" id="saRestoreAll" accept="application/json,.json" hidden>' +
        '</label>' +
        '<label class="btn btn-ghost btn-sm" style="cursor:pointer">⬆ Importa asilo da file' +
          '<input type="file" id="saImportOne" accept="application/json,.json" hidden>' +
        '</label>' +
      '</div>' +
      '<p class="sa-err" id="saErr" hidden></p>';
    const grid = p.querySelector('.sa-grid');
    if (grid) p.insertBefore(bar, grid); else p.prepend(bar);
  }

  const cardId = card => {
    let id = card.getAttribute('data-id');
    if (!id) { const b = card.querySelector('[data-id]'); id = b && b.getAttribute('data-id'); }
    return id;
  };
  const cardName = card => (card.querySelector('strong') || {}).textContent || '';
  function applyFilter() {
    const p = panel(); const grid = p && p.querySelector('.sa-grid'); if (!grid) return;
    const q = ((document.getElementById('saSearch') || {}).value || '').trim().toLowerCase();
    grid.querySelectorAll('.sa-item').forEach(card => {
      card.hidden = !!q && !cardName(card).toLowerCase().includes(q);
    });
  }
  function applySort() {
    const p = panel(); const grid = p && p.querySelector('.sa-grid'); if (!grid) return;
    const mode = (document.getElementById('saSort') || {}).value || 'name';
    const kidsOf = card => { const st = readState(cardId(card)); return st ? (st.kids || []).length : 0; };
    [...grid.querySelectorAll('.sa-item')]
      .sort((a, b) => mode === 'kids' ? kidsOf(b) - kidsOf(a) : cardName(a).localeCompare(cardName(b), 'it'))
      .forEach(c => grid.appendChild(c));
  }

  function decorateCards() {
    const p = panel(); const grid = p && p.querySelector('.sa-grid'); if (!grid) return;
    grid.querySelectorAll('.sa-item').forEach(card => {
      const id = cardId(card); if (!id) return;
      const act = card.querySelector('.sa-actions') || card;
      if (!act.querySelector('[data-sax]')) {
        [['export', '⬇ Esporta'], ['dup', '⧉ Duplica'], ['reset', '⟲ Svuota']].forEach(pair => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn-ghost btn-sm';
          b.setAttribute('data-sax', pair[0]);
          b.setAttribute('data-id', id);
          b.textContent = pair[1];
          act.appendChild(b);
        });
      }
      const st = readState(id);
      if (!st) return;
      let chips = card.querySelector('.sa-chips');
      if (!chips) { chips = document.createElement('div'); chips.className = 'sa-chips'; card.appendChild(chips); }
      const memo = (st.memos || []).filter(m => !m.done).length;
      const meals = mealsOfMonth(st);
      const diets = (st.kids || []).filter(k => String(k.allergy || '').trim()).length;
      const want =
        (memo ? '<span class="sa-stat">⏳ ' + memo + ' memo in attesa</span>' : '') +
        (meals ? '<span class="sa-stat">🍝 ' + meals + ' pasti nel mese</span>' : '') +
        (diets ? '<span class="sa-stat warn">⚠️ ' + diets + ' diete speciali</span>' : '');
      if (chips.dataset.k !== want) { chips.dataset.k = want; chips.innerHTML = want; }
    });
  }

  function download(obj, filename) {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      return true;
    } catch (e) { return false; }
  }
  const reloadPanel = () => {
    if (location.hash !== '#superadmin') location.hash = 'superadmin';
    location.reload();
  };

  function backupAll() {
    const out = { asilapp_global: 1, exported: today(), registry: ASILO.registry(), tenants: {} };
    tenants().forEach(t => { const st = readState(t.id); if (st) out.tenants[t.id] = st; });
    if (!Object.keys(out.tenants).length) return fail('Nessun asilo da salvare.');
    if (!download(out, 'asilapp-tutti-gli-asili-' + today() + '.json')) return fail('Download non riuscito.');
    const e = document.getElementById('saErr'); if (e) e.hidden = true;
    saToast('Backup completo scaricato ✓');
  }
  function restoreAll(file) {
    const e = document.getElementById('saErr'); if (e) e.hidden = true;
    file.text().then(txt => {
      let d = null;
      try { d = JSON.parse(txt); } catch (err) { d = null; }
      if (!d || d.asilapp_global !== 1 || !d.tenants) return fail('Il file non è un backup globale Asilapp.');
      const reg = Array.isArray(d.registry) ? d.registry.filter(a => a && a.id && a.name) : [];
      const ids = Object.keys(d.tenants);
      if (!ids.length) return fail('Il backup non contiene asili.');
      if (!reg.length) return fail('Backup senza registro asili: file incompleto.');
      if (!confirm('Il ripristino sostituirà TUTTI gli asili di questo browser con i ' + ids.length + ' del backup. Continuare?')) return;
      try {
        localStorage.setItem(REGKEY, JSON.stringify(reg));
        ids.forEach(id => localStorage.setItem(ASILO.keyFor(id), JSON.stringify(d.tenants[id])));
      } catch (err) { return fail('Salvataggio non riuscito: memoria del browser piena?'); }
      saToast('Backup ripristinato ✓');
      setTimeout(reloadPanel, 400);
    }).catch(() => fail('Impossibile leggere il file.'));
  }
  function exportOne(id) {
    const st = readState(id);
    if (!st) return fail('Dati dell\u2019asilo non leggibili.');
    const slug = (id === 'demo') ? 'demo' : ASILO.slug(nameOf(id));
    if (!download({ asilapp_tenant: 1, id: id, name: nameOf(id), exported: today(), state: st },
      'asilapp-' + slug + '-' + today() + '.json')) return fail('Download non riuscito.');
    saToast('Export di «' + nameOf(id) + '» scaricato ✓');
  }
  function importOne(file) {
    const e = document.getElementById('saErr'); if (e) e.hidden = true;
    file.text().then(txt => {
      let d = null;
      try { d = JSON.parse(txt); } catch (err) { d = null; }
      if (!d || d.asilapp_tenant !== 1 || !d.state) return fail('Il file non è un export di asilo Asilapp.');
      const st = d.state;
      if (st.v !== 1 || !Array.isArray(st.kids)) return fail('I dati dell\u2019asilo nel file non sono validi.');
      let name = String(d.name || st.school || 'Asilo importato').trim().replace(/\s+/g, ' ');
      if (name.length < 3) name = 'Asilo importato';
      const reg = ASILO.registry();
      if (reg.some(a => a.slug === ASILO.slug(name))) name += ' (import)';
      st.school = name; st.role = null; st.parentKid = null;
      const nid = 'a' + Math.random().toString(36).slice(2, 9);
      if (!writeState(nid, st)) return fail('Memoria del browser piena: import non riuscito.');
      reg.push({ id: nid, name: name, slug: ASILO.slug(name) });
      if (!saveReg(reg)) return fail('Salvataggio del registro non riuscito.');
      saToast('Asilo «' + name + '» importato ✓');
      setTimeout(reloadPanel, 400);
    }).catch(() => fail('Impossibile leggere il file.'));
  }

  function dupAsilo(id) {
    const st = readState(id); if (!st) return fail('Dati dell\u2019asilo non leggibili.');
    const reg = ASILO.registry();
    let name = 'Copia di ' + nameOf(id);
    while (reg.some(a => a.slug === ASILO.slug(name))) name += ' bis';
    let clone = null;
    try { clone = JSON.parse(JSON.stringify(st)); } catch (e) { clone = null; }
    if (!clone) return fail('Copia non riuscita.');
    clone.school = name; clone.role = null; clone.parentKid = null;
    const nid = 'a' + Math.random().toString(36).slice(2, 9);
    if (!writeState(nid, clone)) return fail('Memoria del browser piena: copia non riuscita.');
    reg.push({ id: nid, name: name, slug: ASILO.slug(name) });
    if (!saveReg(reg)) return fail('Salvataggio del registro non riuscito.');
    saToast('«' + name + '» creato ✓');
    setTimeout(reloadPanel, 400);
  }
  function resetAsilo(id) {
    const st = readState(id); if (!st) return fail('Dati dell\u2019asilo non leggibili.');
    if (!confirm('Svuotare «' + nameOf(id) + '»? Bambini, memo, menù, pasti e avvisi verranno eliminati. Nome, password e classi restano al loro posto.')) return;
    st.kids = []; st.memos = []; st.menu = {}; st.meals = {}; st.msgs = []; st.diary = {};
    if (typeof DEFAULT_QUICK === 'function') st.quickTypes = DEFAULT_QUICK();
    st.role = null; st.parentKid = null;
    if (!writeState(id, st)) return fail('Salvataggio non riuscito.');
    saToast('«' + nameOf(id) + '» svuotato ✓');
    setTimeout(reloadPanel, 400);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-sax="backup-all"]')) { backupAll(); return; }
    const b = t.closest('[data-sax]');
    if (!b) return;
    const id = b.getAttribute('data-id') || (b.closest('.sa-item') && cardId(b.closest('.sa-item')));
    if (!id) return;
    const ax = b.getAttribute('data-sax');
    if (ax === 'export') exportOne(id);
    else if (ax === 'dup') dupAsilo(id);
    else if (ax === 'reset') resetAsilo(id);
  });
  document.addEventListener('input', e => {
    if (e.target instanceof Element && e.target.id === 'saSearch') applyFilter();
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.id === 'saSort') applySort();
    if (t.id === 'saRestoreAll') {
      const f = t.files && t.files[0];
      t.value = '';
      if (f) restoreAll(f);
    }
    if (t.id === 'saImportOne') {
      const f = t.files && t.files[0];
      t.value = '';
      if (f) importOne(f);
    }
  });

  window.addEventListener('load', () => {
    const p = panel();
    if (!p || p.hidden) return;
    mountBar(); renderStats(); decorateCards();
    new MutationObserver(() => { mountBar(); renderStats(); decorateCards(); })
      .observe(document.body, { childList: true, subtree: true });
  });
})();
