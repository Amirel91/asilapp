'use strict';
/* ============================================================
   superadmin.js — pannello di gestione globale (solo per te)
   Accesso: nel login, come asilo scrivi «superadmin»,
   username «root» + password del gestore. Da qui puoi creare,
   rinominare o eliminare gli asili e gestire le loro classi.
   ============================================================ */
(function () {
  if (typeof ASILO === 'undefined') return;

  const ROOT_USER = 'root';
  const ROOT_PW = 'Asilapp#2024';
  const MAGIC = 'superadmin';

  const $id = i => document.getElementById(i);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let secOpenId = null; // tenant con l'editor classi aperto

  /* ---------- accesso ai dati dei tenant, sempre in guardia ---------- */
  function tenantState(id) {
    try {
      const d = JSON.parse(localStorage.getItem(ASILO.keyFor(id)));
      return (d && d.v === 1 && Array.isArray(d.kids)) ? d : null;
    } catch (e) { return null; }
  }
  function writeTenant(id, st) {
    try { localStorage.setItem(ASILO.keyFor(id), JSON.stringify(st)); return true; }
    catch (e) { return false; }
  }
  function saveReg(r) {
    try { localStorage.setItem('asilapp_registry', JSON.stringify(r)); } catch (e) {}
  }
  function registry() { return ASILO.registry(); }
  /* se il tenant toccato è quello corrente, ricarica lo stato vivo dell'app */
  function syncCurrent(id) {
    if (ASILO.cur() !== id || typeof state === 'undefined' || typeof load !== 'function') return;
    state = load();
    if (typeof renderSections === 'function') renderSections();
    if (typeof renderKids === 'function') renderKids();
  }

  /* ---------- UI: pagina costruita via JS, CSS in landing.css ---------- */
  function buildPage() {
    if ($id('viewSuperadmin')) return;
    const v = document.createElement('section');
    v.className = 'view app-view sa-view';
    v.id = 'viewSuperadmin';
    v.hidden = true;
    v.innerHTML =
      `<header class="topbar">
        <div class="brand">
          <span class="logo logo-sm" aria-hidden="true">⚙</span>
          <div class="brand-txt"><strong>Superadmin</strong><small>gestione di tutti gli asili</small></div>
        </div>
        <div class="topbar-right">
          <span class="chip" id="saCount"></span>
          <button type="button" class="btn btn-ghost btn-sm" data-sa="exit">Esci</button>
        </div>
      </header>
      <main class="sa-main">
        <section class="card" style="display:grid;gap:.6rem" aria-label="Nuovo asilo">
          <p class="drawer-sec">Crea un nuovo asilo</p>
          <form id="saNewForm" class="add-form" novalidate>
            <label class="field"><span>Nome dell'asilo</span>
              <input type="text" class="input" id="saNewName" maxlength="40" placeholder="es. Asilo Nido Il Girotondo" autocomplete="off">
            </label>
            <label class="field"><span>Password maestre</span>
              <input type="text" class="input" id="saNewPass" maxlength="40" placeholder="almeno 6 caratteri" autocomplete="off">
            </label>
            <span class="form-actions">
              <button type="submit" class="btn btn-primary btn-sm">Crea asilo</button>
            </span>
          </form>
          <p class="sa-err" id="saNewErr" hidden></p>
          <p class="sa-hint">L'asilo parte vuoto: sezione unica, nessun bambino. Le maestre completano l'iscrizione dall'app.</p>
        </section>
        <div class="sa-grid" id="saGrid" aria-label="Asili iscritti"></div>
      </main>`;
    document.body.appendChild(v);
  }

  /* ---------- render della griglia asili ---------- */
  function render() {
    const grid = $id('saGrid'); if (!grid) return;
    const chip = $id('saCount');
    const reg = registry();
    if (chip) chip.textContent = reg.length + (reg.length === 1 ? ' asilo' : ' asili');
    grid.innerHTML = reg.map(a => {
      const st = tenantState(a.id);
      const kids = st ? st.kids.length : 0;
      const secs = st ? (st.sections || []).length : 0;
      const cur = ASILO.cur() === a.id;
      return `<article class="sa-item">
        <div class="sa-item-head">
          <strong>${esc(a.name)}</strong>
          <div class="sa-actions">
            <button type="button" class="link-btn" data-sa="rename" data-id="${a.id}">Rinomina</button>
            <button type="button" class="link-btn" data-sa="secs" data-id="${a.id}">${secOpenId === a.id ? '✕ Chiudi classi' : 'Classi'}</button>
            <button type="button" class="sa-del" data-sa="del" data-id="${a.id}">Elimina</button>
          </div>
        </div>
        <div class="sa-stats">
          <span class="sa-stat">🧒 ${kids} bambini</span>
          <span class="sa-stat">🏫 ${secs} classi</span>
          ${cur ? '<span class="sa-stat">📍 asilo corrente</span>' : ''}
          ${!st ? '<span class="sa-stat warn">⚠️ dati mancanti</span>' : ''}
        </div>
        ${secOpenId === a.id ? renderSecs(a.id, st) : ''}
      </article>`;
    }).join('') || '<p class="empty">Nessun asilo iscritto: crea il primo qui sopra.</p>';
  }

  /* ---------- editor classi di un tenant ---------- */
  function renderSecs(id, st) {
    if (!st) return '<p class="sa-hint">Dati non leggibili: impossibile gestire le classi.</p>';
    const secs = st.sections || [];
    return `<div class="sa-sec-box">
      <p class="drawer-sec">Classi di questo asilo</p>
      <ul class="sa-sec-list">
        ${secs.map(s => {
          const n = st.kids.filter(k => k.sec === s.id).length;
          return `<li>
            <span class="tpl-txt">${esc(s.name)} <small style="color:var(--muted);font-weight:500">· ${n} bambini</small></span>
            <button type="button" class="link-btn" data-sa="sec-rename" data-id="${id}" data-sec="${s.id}">Rinomina</button>
            <button type="button" class="sa-del" data-sa="sec-del" data-id="${id}" data-sec="${s.id}">Elimina</button>
          </li>`;
        }).join('') || '<li class="sa-hint">Nessuna classe.</li>'}
      </ul>
      <form class="add-form" data-sa="sec-add-form" data-id="${id}" novalidate>
        <label class="field"><span>Nuova classe</span>
          <input type="text" class="input" maxlength="30" placeholder="es. Sezione Lupetti" autocomplete="off">
        </label>
        <span class="form-actions">
          <button type="submit" class="btn btn-primary btn-sm">Aggiungi</button>
        </span>
      </form>
      <p class="sa-err" data-sa-err="${id}" hidden></p>
    </div>`;
  }

  /* ---------- azioni asili ---------- */
  function fail(id, msg) {
    const e = document.querySelector(`[data-sa-err="${id}"]`) || $id('saNewErr');
    if (e) { e.textContent = msg; e.hidden = false; }
  }
  function hideErrs(scope) {
    (scope || document).querySelectorAll('.sa-err').forEach(e => { e.hidden = true; });
  }

  function onCreate(e) {
    e.preventDefault(); hideErrs();
    const name = (($id('saNewName') || {}).value || '').trim().replace(/\s+/g, ' ');
    const pw = ($id('saNewPass') || {}).value || '';
    if (name.length < 3) return fail(null, 'Il nome richiede almeno 3 lettere.');
    if (ASILO.resolve(name)) return fail(null, 'Esiste già un asilo con questo nome.');
    if (pw.length < 6) return fail(null, 'La password richiede almeno 6 caratteri.');
    const r = ASILO.signup(name, pw);
    if (r.err) return fail(null, r.err);
    const inp1 = $id('saNewName'), inp2 = $id('saNewPass');
    if (inp1) inp1.value = ''; if (inp2) inp2.value = '';
    render();
    if (typeof toast === 'function') toast('Asilo «' + name + '» creato ✓');
  }

  function onRename(id) {
    const a = registry().find(x => x.id === id); if (!a) return;
    const v = prompt('Nuovo nome dell\u2019asilo:', a.name);
    if (v === null) return;
    const name = String(v).trim().replace(/\s+/g, ' ');
    if (name.length < 3) { if (typeof toast === 'function') toast('Il nome richiede almeno 3 lettere'); return; }
    if (registry().some(x => x.slug === ASILO.slug(name) && x.id !== id)) {
      if (typeof toast === 'function') toast('Esiste già un asilo con questo nome'); return;
    }
    const reg = registry();
    const row = reg.find(x => x.id === id);
    row.name = name; row.slug = ASILO.slug(name);
    saveReg(reg);
    const st = tenantState(id);
    if (st) { st.school = name; writeTenant(id, st); }
    syncCurrent(id);
    render();
    if (typeof toast === 'function') toast('Asilo rinominato ✓');
  }

  function onDel(id) {
    const a = registry().find(x => x.id === id); if (!a) return;
    const st = tenantState(id);
    const n = st ? st.kids.length : 0;
    if (!confirm('Eliminare «' + a.name + '»' + (n ? ' e i dati dei suoi ' + n + ' bambini' : '') + '? Azione definitiva.')) return;
    try { localStorage.removeItem(ASILO.keyFor(id)); } catch (e) {}
    saveReg(registry().filter(x => x.id !== id));
    if (secOpenId === id) secOpenId = null;
    if (ASILO.cur() === id) ASILO.exit();
    render();
    if (typeof toast === 'function') toast('Asilo eliminato');
  }

  /* ---------- azioni classi ---------- */
  function onSecRename(id, secId) {
    const st = tenantState(id); if (!st) return;
    const s = (st.sections || []).find(x => x.id === secId); if (!s) return;
    const v = prompt('Nuovo nome della classe:', s.name);
    if (v === null) return;
    const name = String(v).trim().replace(/\s+/g, ' ');
    if (name.length < 3) { if (typeof toast === 'function') toast('Il nome richiede almeno 3 lettere'); return; }
    s.name = name;
    if (writeTenant(id, st)) { syncCurrent(id); render(); if (typeof toast === 'function') toast('Classe rinominata ✓'); }
  }
  function onSecDel(id, secId) {
    const st = tenantState(id); if (!st) return;
    const secs = st.sections || [];
    if (secs.length <= 1) { if (typeof toast === 'function') toast('Serve almeno una classe'); return; }
    const s = secs.find(x => x.id === secId); if (!s) return;
    const n = st.kids.filter(k => k.sec === secId).length;
    if (!confirm('Eliminare la classe «' + s.name + '»' + (n ? ' (i suoi ' + n + ' bambini passeranno alla prima classe)' : '') + '?')) return;
    st.sections = secs.filter(x => x.id !== secId);
    const first = st.sections[0].id;
    st.kids.forEach(k => { if (k.sec === secId) k.sec = first; });
    if (writeTenant(id, st)) { syncCurrent(id); render(); if (typeof toast === 'function') toast('Classe eliminata'); }
  }
  function onSecAdd(form) {
    const id = form.getAttribute('data-id');
    const st = tenantState(id); if (!st) return;
    hideErrs(form.closest('.sa-item') || document);
    const inp = form.querySelector('input');
    const name = ((inp && inp.value) || '').trim().replace(/\s+/g, ' ');
    if (name.length < 3) return fail(id, 'Il nome richiede almeno 3 lettere.');
    if (!Array.isArray(st.sections)) st.sections = [];
    if (st.sections.some(x => x.name.toLowerCase() === name.toLowerCase())) return fail(id, 'Classe già esistente.');
    st.sections.push({ id: Math.random().toString(36).slice(2, 9), name });
    if (writeTenant(id, st)) {
      if (inp) inp.value = '';
      syncCurrent(id); render();
      if (typeof toast === 'function') toast('Classe aggiunta ✓');
    } else fail(id, 'Salvataggio non riuscito.');
  }

  /* ---------- ingresso / uscita ---------- */
  function openPanel() {
    buildPage();
    if (typeof show === 'function') show('viewSuperadmin');
    const v = $id('viewSuperadmin'); if (v) v.hidden = false;
    secOpenId = null;
    render();
  }
  function exitPanel() {
    const v = $id('viewSuperadmin'); if (v) v.hidden = true;
    ASILO.exit();
    if (typeof show === 'function') show('viewLogin');
    const lv = $id('viewLogin'); if (lv) lv.hidden = false;
  }

  /* ---------- aggancio: login magico dal form esistente ---------- */
  document.addEventListener('submit', e => {
    const t = e.target;
    if (!(t instanceof Element) || t.id !== 'loginForm') return;
    const asilo = (($id('loginAsilo') || {}).value || '').trim();
    if (ASILO.slug(asilo) !== MAGIC) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const err = $id('loginError');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    const u = (($id('loginUser') || {}).value || '').trim();
    const p = ($id('loginPass') || {}).value || '';
    if (u !== ROOT_USER || p !== ROOT_PW) return fail('Credenziali superadmin non valide.');
    openPanel();
    if (typeof toast === 'function') toast('Pannello superadmin aperto');
  }, true); // capture: prima del login normale

  /* ---------- aggancio: azioni del pannello ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const b = t.closest('[data-sa]');
    if (!b) return;
    const act = b.getAttribute('data-sa');
    const id = b.getAttribute('data-id');
    if (act === 'exit') return exitPanel();
    if (act === 'rename') return onRename(id);
    if (act === 'del') return onDel(id);
    if (act === 'secs') { secOpenId = secOpenId === id ? null : id; return render(); }
    if (act === 'sec-rename') return onSecRename(id, b.getAttribute('data-sec'));
    if (act === 'sec-del') return onSecDel(id, b.getAttribute('data-sec'));
  });
  document.addEventListener('submit', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.id === 'saNewForm') { e.preventDefault(); onCreate(e); return; }
    const f = t.closest('[data-sa="sec-add-form"]');
    if (f) { e.preventDefault(); onSecAdd(f); }
  });
})();
