'use strict';
/* ============================================================
   superadmin.js — pannello di gestione di tutti gli asili
   Accesso riservato all'owner di Asilapp: si apre andando su
   index.html#superadmin e inserendo la password superadmin.
   Permette di creare, rinominare, eliminare asili e gestire
   le classi di ciascuno, senza toccare i dati delle famiglie.
   ============================================================ */
(function () {
  const HASH_KEY = 'asilapp_sa_hash';
  const SESS_KEY = 'asilapp_sa_sess';
  const DEF_PASS = 'super2024';

  /* hash djb2: non memorizza la password in chiaro */
  function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function saHash() {
    try { return localStorage.getItem(HASH_KEY); } catch (e) { return null; }
  }
  function isAuthed() {
    try { return sessionStorage.getItem(SESS_KEY) === '1'; } catch (e) { return false; }
  }
  function setAuthed(on) {
    try { on ? sessionStorage.setItem(SESS_KEY, '1') : sessionStorage.removeItem(SESS_KEY); } catch (e) {}
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- dati di un tenant ---------- */
  function tenantState(id) {
    const key = (typeof ASILO !== 'undefined') ? ASILO.keyFor(id) : 'asilapp_v1';
    try {
      const d = JSON.parse(localStorage.getItem(key));
      return d && d.v === 1 ? d : null;
    } catch (e) { return null; }
  }
  function writeTenant(id, st) {
    const key = ASILO.keyFor(id);
    try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) {}
  }
  function tenants() {
    if (typeof ASILO === 'undefined') return [];
    return ASILO.registry().map(a => {
      const st = tenantState(a.id);
      return {
        ...a,
        kids: st ? (st.kids || []).length : 0,
        sections: st ? (st.sections || []) : []
      };
    });
  }

  /* ---------- UI ---------- */
  let view = null;

  function buildView() {
    if (view) return view;
    view = document.createElement('section');
    view.className = 'view sa-view';
    view.id = 'viewSuperadmin';
    view.hidden = true;
    document.body.appendChild(view);
    return view;
  }

  function renderLogin() {
    const v = buildView();
    v.innerHTML =
      '<div class="card" style="max-width:400px;margin:8vh auto 0;display:grid;gap:.7rem">' +
      '<p class="drawer-sec">Area superadmin</p>' +
      '<p class="sa-hint">Accesso riservato alla gestione di Asilapp e degli asili iscritti.</p>' +
      '<form id="saLoginForm" novalidate style="display:grid;gap:.6rem">' +
      '<label class="field"><span>Password superadmin</span>' +
      '<input type="password" class="input" id="saPass" autocomplete="current-password" placeholder="••••••••"></label>' +
      '<p class="sa-err" id="saErr" hidden></p>' +
      '<button type="submit" class="btn btn-primary btn-block">Entra</button>' +
      '</form>' +
      '<button type="button" class="link-btn" id="saExit" style="margin:.2rem auto 0">Torna alla home di Asilapp</button>' +
      '</div>';
    const f = v.querySelector('#saLoginForm');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault();
      const err = v.querySelector('#saErr');
      const p = (v.querySelector('#saPass') || {}).value || '';
      if (saHash() === null) { try { localStorage.setItem(HASH_KEY, djb2(DEF_PASS)); } catch (ex) {} }
      if (djb2(p) === saHash()) { setAuthed(true); renderPanel(); }
      else if (err) { err.textContent = 'Password errata.'; err.hidden = false; }
    });
    const ex = v.querySelector('#saExit');
    if (ex) ex.addEventListener('click', closePanel);
  }

  function renderPanel() {
    const v = buildView();
    const list = tenants();
    const card = a => {
      const secs = (a.sections || []).map(s =>
        '<li><span class="tpl-txt">' + esc(s.name) +
        '<small> · ' + (a.kids || 0) + ' bambini</small></span></li>').join('');
      return '<article class="sa-item" data-id="' + a.id + '">' +
        '<strong>' + esc(a.name) + '</strong>' +
        '<span class="sa-stat">🧒 ' + a.kids + ' bambini · 🏫 ' + (a.sections || []).length + ' classi</span>' +
        (secs ? '<ul class="sa-sec-list">' + secs + '</ul>' : '<p class="sa-hint">Nessuna classe registrata.</p>') +
        '<div class="sa-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-sa="enter" data-id="' + a.id + '">Entra →</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-sa="rename" data-id="' + a.id + '">Rinomina</button>' +
        '<button type="button" class="sa-del" data-sa="del" data-id="' + a.id + '">Elimina asilo</button>' +
        '</div></article>';
    };
    v.innerHTML =
      '<header class="landing-top"><div class="brand"><div class="brand-txt"><strong>Superadmin</strong><small>gestione degli asili iscritti</small></div></div>' +
      '<div class="sa-actions"><span class="chip">' + list.length + ' asili</span>' +
      '<button type="button" class="btn btn-primary btn-sm" id="saNew">+ Nuovo asilo</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="saClose">Esci</button></div></header>' +
      '<form class="add-form" id="saNewForm" hidden novalidate>' +
      '<label class="field"><span>Nome del nuovo asilo</span><input type="text" class="input" id="saNewName" maxlength="40" placeholder="es. Asilo Nido Gioconda"></label>' +
      '<span class="form-actions"><button type="submit" class="btn btn-primary btn-sm">Crea</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="saNewCancel">Annulla</button></span></form>' +
      '<p class="sa-err" id="saNewErr" hidden></p>' +
      (list.length
        ? '<div class="sa-grid">' + list.map(card).join('') + '</div>'
        : '<p class="sa-hint">Nessun asilo iscritto oltre alla demo: creane uno con «+ Nuovo asilo».</p>');

    const nf = v.querySelector('#saNewForm'), ne = v.querySelector('#saNewErr');
    v.querySelector('#saNew').addEventListener('click', () => {
      nf.hidden = !nf.hidden;
      if (!nf.hidden) v.querySelector('#saNewName').focus();
    });
    v.querySelector('#saNewCancel').addEventListener('click', () => { nf.hidden = true; ne.hidden = true; });
    nf.addEventListener('submit', e => {
      e.preventDefault();
      ne.hidden = true;
      const name = (v.querySelector('#saNewName').value || '').trim().replace(/\s+/g, ' ');
      if (name.length < 3) { ne.textContent = 'Il nome richiede almeno 3 lettere.'; ne.hidden = false; return; }
      if (ASILO.resolve(name)) { ne.textContent = 'Esiste già un asilo con questo nome.'; ne.hidden = false; return; }
      const pw = 'nido' + Math.random().toString(36).slice(2, 6);
      const r = ASILO.signup(name, pw);
      if (r.err) { ne.textContent = r.err; ne.hidden = false; return; }
      toast && toast('Asilo creato · password maestre: ' + pw);
      renderPanel();
    });
    v.querySelector('#saClose').addEventListener('click', () => { setAuthed(false); closePanel(); });

    v.querySelectorAll('[data-sa]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const a = ASILO.registry().find(x => x.id === id);
      if (!a) return;
      const act = b.getAttribute('data-sa');
      if (act === 'enter') { ASILO.enter(id); location.hash = ''; location.reload(); return; }
      if (act === 'rename') {
        const name = prompt('Nuovo nome dell\u2019asilo:', a.name);
        const v2 = (name || '').trim().replace(/\s+/g, ' ');
        if (!v2 || v2 === a.name) return;
        if (ASILO.resolve(v2)) { toast && toast('Nome già in uso'); return; }
        const reg = ASILO.registry();
        const t = reg.find(x => x.id === id);
        if (t) {
          t.name = v2; t.slug = ASILO.slug(v2);
          try { localStorage.setItem('asilapp_registry', JSON.stringify(reg)); } catch (ex) {}
        }
        const st = tenantState(id);
        if (st) { st.school = v2; writeTenant(id, st); }
        toast && toast('Asilo rinominato ✓');
        renderPanel();
        return;
      }
      if (act === 'del') {
        if (!confirm('Eliminare «' + a.name + '» con TUTTI i suoi dati (bambini, memo, menù)?')) return;
        if (!confirm('Conferma definitiva: l\u2019azione non si può annullare. Eliminare?')) return;
        try {
          localStorage.removeItem(ASILO.keyFor(id));
          localStorage.setItem('asilapp_registry', JSON.stringify(ASILO.registry().filter(x => x.id !== id)));
        } catch (ex) {}
        toast && toast('Asilo eliminato');
        renderPanel();
      }
    }));
  }

  function closePanel() {
    if (!view) return;
    view.hidden = true;
    if (typeof show === 'function') show('viewLanding');
    else view.remove(), view = null;
    location.hash = '';
  }

  function openPanel() {
    if (typeof ASILO === 'undefined') return;
    isAuthed() ? renderPanel() : renderLogin();
    view.hidden = false;
    $$('.view').forEach(x => { if (x !== view) x.hidden = true; });
    history.replaceState(null, '', location.pathname);
  }

  /* apertura: hash #superadmin */
  window.addEventListener('load', () => {
    if (location.hash === '#superadmin') openPanel();
  });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#superadmin') openPanel();
  });
})();
