'use strict';
/* ---------- utility ---------- */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ymNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const curYm = () => { const el = $('#mealsMonth'); return (el && el.value) || ymNow(); };
const fmtEur = n => (n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = ts => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const fmtTime = ts => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const AVCLS = ['av-sage', 'av-sky', 'av-terra', 'av-lav', 'av-sand', 'av-mint'];
const avCls = id => AVCLS[[...(id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVCLS.length];
const initials = n => String(n || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
function toast(msg) {
  const w = $('#toastWrap'); if (!w) return;
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; w.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2400);
}
const confirmDel = what => confirm('Eliminare ' + what + '? L\u2019azione non si può annullare.');

/* ---------- stato ---------- */
const KEY = 'asilapp_v1';
const DEFAULT_QUICK = () => ([
  { id: uid(), ico: '🍼', txt: 'Cambio completo' },
  { id: uid(), ico: '🧦', txt: 'Calzine antiscivolo' },
  { id: uid(), ico: '👟', txt: 'Scarpe di ricambio' },
  { id: uid(), ico: '🧸', txt: 'Ciuccio / copreta' },
  { id: uid(), ico: '🎨', txt: 'Camiciolo' },
  { id: uid(), ico: '📸', txt: 'Foto per il progetto' }
]);
function seed() {
  const t = new Date(), k1 = uid(), k2 = uid(), k3 = uid();
  const d = off => { const x = new Date(t); x.setDate(x.getDate() + off); return iso(x); };
  return {
    v: 1,
    kids: [
      { id: k1, name: 'Emma Bianchi', code: 'B001' },
      { id: k2, name: 'Luca Verdi', code: 'B002' },
      { id: k3, name: 'Sofia Ricci', code: 'B003' }
    ],
    quickTypes: DEFAULT_QUICK(),
    memos: [
      { id: uid(), kid: k1, text: 'Portare cambio completo', ico: '🍼', ts: Date.now() - 864e5, done: false },
      { id: uid(), kid: k2, text: 'Portare calzine antiscivolo', ico: '🧦', ts: Date.now() - 1728e5, done: true, doneTs: Date.now() - 864e5 }
    ],
    menu: {
      [d(0)]: { primo: 'Pasta al pomodoro', secondo: 'Polpettine', contorno: 'Zucchine al vapore', merenda: 'Frutta fresca' },
      [d(1)]: { primo: 'Riso alla zucca', secondo: 'Piatto freddo di tacchino', contorno: 'Purè di patate', merenda: 'Yogurt' }
    },
    meals: {},
    msgs: [{ id: uid(), text: 'Benvenute su Asilapp! Qui troverete memo, menù e avvisi del nido.', ts: Date.now() - 36e5, reads: {} }],
    role: null, parentKid: null
  };
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1 && Array.isArray(d.kids)) {
      if (!Array.isArray(d.quickTypes) || !d.quickTypes.length) d.quickTypes = DEFAULT_QUICK();
      if (!Array.isArray(d.memos)) d.memos = [];
      if (!Array.isArray(d.msgs)) d.msgs = [];
      if (!d.menu || typeof d.menu !== 'object') d.menu = {};
      if (!d.meals || typeof d.meals !== 'object') d.meals = {};
      return d;
    }
  } catch (e) {}
  return seed();
}
let state, menuY, menuM, menuSel = '', drawerKid = null, loginRole = 'admin', quickEdit = '';
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const parentKid = () => state.kids.find(k => k.id === state.parentKid);

/* ---------- viste ---------- */
function show(id) { $$('.view').forEach(v => { v.hidden = v.id !== id; }); }
function switchTab(name) {
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  $$('.tabpane').forEach(p => { p.hidden = p.id !== 'pane' + name[0].toUpperCase() + name.slice(1); });
}
function showAdmin() {
  state.role = 'admin'; state.parentKid = null; save();
  drawerKid = null; closeDrawer();
  const chip = $('#adminToday');
  if (chip) chip.textContent = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const md = $('#mealsMonth'); if (md && !md.value) md.value = ymNow();
  show('viewAdmin'); switchTab('kids');
  renderKids(); fillMemoKid(); renderMemos(); renderMemoTemplates();
  renderMenu(); renderPasti(); renderMsgs(); updateMemoBadge();
}
function showParent() {
  const k = parentKid(); if (!k) { logout(); return; }
  show('viewParent');
  const sub = $('#parentSub'); if (sub) sub.textContent = k.name;
  const hero = $('#parentHero');
  if (hero) hero.innerHTML =
    `<span class="avatar lg ${avCls(k.id)}">${initials(k.name)}</span>
     <div class="hero-txt"><h2>Ciao, ${esc(k.name.split(' ')[0])}!</h2><span class="badge ok">Sezione Arcobaleno</span></div>
     <span class="hero-code">Codice famiglia: <strong>${esc(k.code)}</strong></span>`;
  renderTodos(); renderParentMenu(); renderParentMeals(); renderParentMsgs();
}
function logout() {
  state.role = null; state.parentKid = null; save();
  drawerKid = null; closeDrawer(); setRoleTab('admin'); show('viewLogin');
}

/* ---------- login ---------- */
function setRoleTab(role) {
  loginRole = role;
  $$('.seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  const admin = role === 'admin';
  const fU = $('#fUser'), fP = $('#fPass'), fC = $('#fCode');
  if (fU) fU.hidden = !admin;
  if (fP) fP.hidden = !admin;
  if (fC) fC.hidden = admin;
  // campi non pertinenti svuotati: nessun residuo "admin" nel login genitori
  if (admin) { const c = $('#loginCode'); if (c) c.value = ''; }
  else { const u = $('#loginUser'), p = $('#loginPass'); if (u) u.value = ''; if (p) p.value = ''; }
  const err = $('#loginError'); if (err) err.hidden = true;
}
function onLogin(e) {
  e.preventDefault();
  const err = $('#loginError');
  const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
  if (err) err.hidden = true;
  if (loginRole === 'admin') {
    const u = (($('#loginUser') || {}).value || '').trim();
    const p = ($('#loginPass') || {}).value || '';
    if (u !== 'admin' || p !== 'nido2024') return fail('Credenziali sbagliate: prova admin · nido2024.');
    showAdmin();
  } else {
    const code = (($('#loginCode') || {}).value || '').trim().toUpperCase();
    const k = state.kids.find(x => x.code.toUpperCase() === code);
    if (!k) return fail('Codice non riconosciuto: controlla con le maestre (demo: B001).');
    state.parentKid = k.id; save();
    const c = $('#loginCode'); if (c) c.value = '';
    showParent();
  }
}

/* ---------- bambini ---------- */
function renderKids() {
  const grid = $('#kidGrid'); if (!grid) return;
  const s = $('#kidSearch');
  const q = ((s && s.value) || '').toLowerCase();
  const list = state.kids.filter(k => k.name.toLowerCase().includes(q) || k.code.toLowerCase().includes(q));
  const empty = $('#kidsEmpty'); if (empty) empty.hidden = list.length > 0;
  grid.innerHTML = list.map(k => {
    const open = state.memos.filter(m => m.kid === k.id && !m.done).length;
    return `<button type="button" class="kid-card" data-action="open-kid" data-id="${k.id}">
      <span class="avatar ${avCls(k.id)}">${initials(k.name)}</span>
      <span class="kid-name">${esc(k.name)}</span>
      <span class="kid-meta">Codice ${esc(k.code)}</span>
      ${open ? `<span class="badge-low">${open} memo in attesa</span>` : ''}
    </button>`;
  }).join('');
}
function onAddKid() {
  const err = $('#addKidErr');
  const nameEl = $('#addKidName'), codeEl = $('#addKidCode');
  const name = ((nameEl && nameEl.value) || '').trim().replace(/\s+/g, ' ');
  const code = ((codeEl && codeEl.value) || '').trim().toUpperCase();
  const fail = msg => { if (err) { err.textContent = msg; err.hidden = false; } };
  if (err) err.hidden = true;
  if (name.length < 3) return fail('Il nome richiede almeno 3 lettere.');
  if (!/^[A-Z0-9]{2,8}$/.test(code)) return fail('Il codice famiglia serve di 2\u20138 lettere o numeri, es. B007.');
  if (state.kids.some(k => k.code.toUpperCase() === code)) return fail('Esiste già un bambino con il codice ' + code + '.');
  state.kids.push({ id: uid(), name, code });
  save();
  if (nameEl) nameEl.value = ''; if (codeEl) codeEl.value = '';
  const f = $('#addKidForm'); if (f) f.hidden = true;
  renderKids(); fillMemoKid(); renderMemos(); renderPasti(); renderMsgs();
  toast('Bambino aggiunto ✓');
}

/* ---------- drawer bambino: solo invio memo ---------- */
function openDrawer(id) {
  drawerKid = state.kids.find(k => k.id === id); if (!drawerKid) return;
  const av = $('#drawerAvatar');
  if (av) { av.className = 'avatar lg ' + avCls(drawerKid.id); av.textContent = initials(drawerKid.name); }
  const nm = $('#drawerName'), mt = $('#drawerMeta');
  if (nm) nm.textContent = drawerKid.name;
  if (mt) mt.textContent = 'Codice famiglia ' + drawerKid.code;
  renderQuick(); renderDrawerMemos();
  const o = $('#overlay'), d = $('#drawer');
  if (o && d) {
    o.hidden = false;
    requestAnimationFrame(() => {
      o.classList.add('show'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    });
  }
}
function closeDrawer() {
  const o = $('#overlay'), d = $('#drawer');
  if (!o || !d) return;
  o.classList.remove('show'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
  setTimeout(() => { o.hidden = true; }, 200);
}
function renderQuick() {
  const box = $('#quickMemo'); if (!box) return;
  box.innerHTML = state.quickTypes.map(q =>
    `<button type="button" class="quick-btn" data-action="quick-memo" data-id="${q.id}"><span aria-hidden="true">${esc(q.ico)}</span><small>${esc(q.txt)}</small></button>`
  ).join('');
}
function sendQuickMemo(qid) {
  const q = state.quickTypes.find(x => x.id === qid);
  if (!q || !drawerKid) return;
  addMemo(drawerKid.id, q.txt, q.ico);
  renderDrawerMemos(); renderMemos(); renderKids();
  const btn = $(`.quick-btn[data-id="${qid}"]`);
  if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 500); }
  toast('Memo inviato a ' + drawerKid.name.split(' ')[0] + ' ✓');
}

/* ---------- modelli memo rapidi: gestione unica nel tab Memo ---------- */
function renderMemoTemplates() {
  const list = $('#quickList'); if (!list) return;
  const empty = $('#quickEmpty'); if (empty) empty.hidden = state.quickTypes.length > 0;
  list.innerHTML = state.quickTypes.map(q => `
    <li>
      <strong aria-hidden="true" style="font-size:1.05rem">${esc(q.ico)}</strong>
      <span class="tpl-txt">${esc(q.txt)}</span>
      <button type="button" class="memo-del" data-action="quick-edit" data-id="${q.id}">Modifica</button>
      <button type="button" class="memo-del" data-action="quick-del" data-id="${q.id}">Elimina</button>
    </li>`).join('');
  if (!state.quickTypes.length && !quickEdit && $('#quickForm') && $('#quickForm').hidden) return;
  if (quickEdit && !state.quickTypes.some(q => q.id === quickEdit)) cancelQuickEdit();
}
function openQuickNew() {
  quickEdit = '';
  const f = $('#quickForm'); if (!f) return;
  const i = $('#quickIco'), t = $('#quickTxt');
  if (i) i.value = ''; if (t) t.value = '';
  const sb = $('#quickSubmitBtn'), cb = $('#quickCancelBtn'), err = $('#quickErr');
  if (sb) sb.textContent = 'Aggiungi modello';
  if (cb) cb.hidden = true;
  if (err) err.hidden = true;
  f.hidden = false;
  if (t) t.focus();
}
function startQuickEdit(id) {
  const q = state.quickTypes.find(x => x.id === id); if (!q) return;
  quickEdit = id;
  const f = $('#quickForm'); if (!f) return;
  const i = $('#quickIco'), t = $('#quickTxt');
  if (i) i.value = q.ico; if (t) t.value = q.txt;
  const sb = $('#quickSubmitBtn'), cb = $('#quickCancelBtn'), err = $('#quickErr');
  if (sb) sb.textContent = 'Aggiorna';
  if (cb) cb.hidden = false;
  if (err) err.hidden = true;
  f.hidden = false;
  if (t) { t.focus(); t.select(); }
}
function cancelQuickEdit() {
  quickEdit = '';
  const f = $('#quickForm'); if (f) f.hidden = true;
}
function onQuickAdd() {
  const err = $('#quickErr');
  const ico = (($('#quickIco') || {}).value || '').trim() || '📌';
  const txt = (($('#quickTxt') || {}).value || '').trim().replace(/\s+/g, ' ');
  const fail = msg => { if (err) { err.textContent = msg; err.hidden = false; } };
  if (err) err.hidden = true;
  if (txt.length < 3) return fail('Il testo del modello richiede almeno 3 lettere.');
  if (state.quickTypes.some(q => q.txt.toLowerCase() === txt.toLowerCase() && q.id !== quickEdit))
    return fail('Esiste già un modello con questo testo.');
  if (quickEdit) {
    const q = state.quickTypes.find(x => x.id === quickEdit);
    if (q) { q.ico = ico; q.txt = txt; }
    quickEdit = '';
    save(); renderMemoTemplates(); renderQuick(); cancelQuickEdit();
    toast('Modello aggiornato ✓');
  } else {
    state.quickTypes.push({ id: uid(), ico, txt });
    save(); renderMemoTemplates(); renderQuick(); cancelQuickEdit();
    toast('Modello aggiunto ✓');
  }
}
function onQuickDel(id) {
  const q = state.quickTypes.find(x => x.id === id); if (!q) return;
  if (!confirmDel('il modello \u00AB' + q.txt + '\u00BB')) return;
  state.quickTypes = state.quickTypes.filter(x => x.id !== id);
  if (quickEdit === id) cancelQuickEdit();
  save(); renderMemoTemplates(); renderQuick();
  toast('Modello eliminato');
}

/* ---------- memo: feed notifiche ---------- */
function memoRow(m) {
  const k = state.kids.find(x => x.id === m.kid);
  return `<li class="memo-row ${m.done ? 'done' : ''}">
    <div class="memo-main">
      <p class="memo-meta"><span class="memo-chip">${k ? esc(k.name.split(' ')[0]) : '—'}</span>${fmtDate(m.ts)}${m.done && m.doneTs ? ' · portato ' + fmtDate(m.doneTs) : ''}</p>
      <p class="memo-txt">${m.ico ? esc(m.ico) + ' ' : ''}${esc(m.text)}</p>
    </div>
    <div style="display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;justify-content:flex-end">
      <button type="button" class="badge ${m.done ? 'ok' : 'off'}" data-action="memo-done" data-id="${m.id}">${m.done ? 'Ricevuto ✓' : 'Segna ricevuto'}</button>
      <button type="button" class="memo-del" data-action="memo-del" data-id="${m.id}">Elimina</button>
    </div>
  </li>`;
}
function renderDrawerMemos() {
  const box = $('#drawerMemoList'); if (!box || !drawerKid) return;
  const list = state.memos.filter(m => m.kid === drawerKid.id).sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  box.innerHTML = list.map(memoRow).join('') || '<p class="hint">Nessun memo per questo bambino.</p>';
}
function addMemo(kid, text, ico) {
  state.memos.unshift({ id: uid(), kid, text, ts: Date.now(), done: false, ico: ico || '' });
  save(); updateMemoBadge();
}
function toggleMemo(id) {
  const m = state.memos.find(x => x.id === id); if (!m) return;
  m.done = !m.done;
  m.doneTs = m.done ? Date.now() : null;
  save();
  renderMemos();
  if (drawerKid) renderDrawerMemos();
  renderKids(); renderTodos(); updateMemoBadge();
}
function delMemo(id) {
  const m = state.memos.find(x => x.id === id); if (!m) return;
  if (!confirmDel('il memo \u00AB' + m.text + '\u00BB')) return;
  state.memos = state.memos.filter(x => x.id !== id);
  save();
  renderMemos();
  if (drawerKid) renderDrawerMemos();
  renderKids(); renderTodos(); updateMemoBadge();
}
function updateMemoBadge() {
  const n = state.memos.filter(m => !m.done).length, el = $('#memoTabCount');
  if (el) { el.hidden = n === 0; el.textContent = n; }
}
function fillMemoKid() {
  const sel = $('#memoKid'); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="tutti">Tutti i bambini</option>' + state.kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  sel.value = cur || 'tutti';
}
function renderMemos() {
  const box = $('#memoList'); if (!box) return;
  const kf = ($('#memoKid') || {}).value || 'tutti';
  const sf = ($('#memoState') || {}).value || 'tutti';
  let list = state.memos.slice();
  if (kf !== 'tutti') list = list.filter(m => m.kid === kf);
  if (sf !== 'tutti') list = list.filter(m => sf === 'done' ? m.done : !m.done);
  list.sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  const empty = $('#memoEmpty'); if (empty) empty.hidden = list.length > 0;
  box.innerHTML = list.map(memoRow).join('');
  const cnt = $('#memoFeedCount');
  if (cnt) { cnt.hidden = list.length === 0; cnt.textContent = list.length + (list.length === 1 ? ' memo' : ' memo'); }
  updateMemoBadge();
}

/* ---------- menù ---------- */
function menuFormFill() {
  const m = state.menu[menuSel] || {};
  const set = (id, v) => { const el = $(id); if (el) el.value = v || ''; };
  const day = $('#menuDay'); if (day) day.value = menuSel;
  set('#menuPrimo', m.primo); set('#menuSecondo', m.secondo);
  set('#menuContorno', m.contorno); set('#menuMerenda', m.merenda);
}
function renderMenu() {
  const grid = $('#menuGrid'); if (!grid) return;
  const title = $('#menuTitle');
  if (title) title.textContent = 'Menù di ' + MONTHS[menuM] + ' ' + menuY;
  const first = new Date(menuY, menuM, 1), lead = (first.getDay() + 6) % 7, days = new Date(menuY, menuM + 1, 0).getDate();
  const ymS = `${menuY}-${String(menuM + 1).padStart(2, '0')}`;
  if (!menuSel || menuSel.slice(0, 7) !== ymS) {
    const t = iso(new Date());
    menuSel = (t.slice(0, 7) === ymS) ? t : ymS + '-01';
  }
  const sel = $('#menuDay');
  if (sel) {
    sel.innerHTML = '';
    for (let d = 1; d <= days; d++) {
      const dt = new Date(menuY, menuM, d), key = iso(dt), wd = (dt.getDay() + 6) % 7;
      const o = document.createElement('option'); o.value = key;
      o.textContent = DOW[wd] + ' ' + d + (state.menu[key] ? ' · ✓' : '');
      sel.appendChild(o);
    }
  }
  let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('') + '<div class="cal-cell off"></div>'.repeat(lead);
  const tk = iso(new Date());
  for (let d = 1; d <= days; d++) {
    const dt = new Date(menuY, menuM, d), key = iso(dt), m = state.menu[key], wd = (dt.getDay() + 6) % 7;
    const cls = ['cal-day', wd > 4 ? 'we' : '', m ? 'has' : '', key === tk ? 'today' : '', key === menuSel ? 'sel' : ''].filter(Boolean).join(' ');
    const txt = m ? [m.primo, m.secondo, m.contorno].filter(Boolean).join(' · ') : '';
    html += `<button type="button" class="${cls}" data-action="menu-day" data-day="${key}">
      <span class="cal-num">${d}${m ? '<span class="cal-dot"></span>' : ''}</span>
      ${txt ? `<span class="cal-txt">${esc(txt)}</span>` : ''}</button>`;
  }
  grid.innerHTML = html;
  menuFormFill();
}
function onMenuSave() {
  const val = id => (($('#' + id.replace('#', '')) || {}).value || '').trim();
  const day = { primo: val('#menuPrimo'), secondo: val('#menuSecondo'), contorno: val('#menuContorno'), merenda: val('#menuMerenda') };
  const filled = Object.values(day).filter(Boolean).length;
  if (!filled) {
    if (state.menu[menuSel]) {
      delete state.menu[menuSel]; save(); renderMenu();
      toast('Menù del giorno rimosso');
    } else toast('Compila almeno un piatto prima di salvare');
    return;
  }
  state.menu[menuSel] = day; save(); renderMenu();
  toast('Menù del ' + new Date(menuSel + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' salvato ✓');
}
function onMenuCopy() {
  const d = new Date(menuSel + 'T12:00');
  for (let i = 0; i < 60; i++) {
    d.setDate(d.getDate() - 1);
    const m = state.menu[iso(d)];
    if (m) {
      const set = (id, v) => { const el = $(id); if (el) el.value = v || ''; };
      set('#menuPrimo', m.primo); set('#menuSecondo', m.secondo);
      set('#menuContorno', m.contorno); set('#menuMerenda', m.merenda);
      toast('Copiato dal ' + d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' — ricordati di salvare');
      return;
    }
  }
  toast('Nessun menù precedente da copiare');
}

/* ---------- pasti ---------- */
function renderPasti() {
  const body = $('#mealsBody'); if (!body) return;
  const ymK = curYm(), month = state.meals[ymK] = state.meals[ymK] || {};
  state.kids.forEach(k => { if (!month[k.id]) month[k.id] = { count: 0, rate: 4, paid: false }; });
  body.innerHTML = state.kids.map(k => {
    const m = month[k.id];
    return `<tr>
      <td><strong>${esc(k.name)}</strong></td>
      <td class="num"><input type="number" min="0" max="60" class="input" value="${m.count || 0}" data-field="count" data-kid="${k.id}" aria-label="Pasti di ${esc(k.name)}" style="width:84px;padding:.45rem .55rem;text-align:right"></td>
      <td class="num"><input type="number" min="0" step="0.5" class="input" value="${m.rate || 0}" data-field="rate" data-kid="${k.id}" aria-label="Tariffa di ${esc(k.name)}" style="width:92px;padding:.45rem .55rem;text-align:right"></td>
      <td class="num" data-cell="tot-${k.id}">${fmtEur((m.count || 0) * (m.rate || 0))}</td>
      <td><button type="button" class="badge ${m.paid ? 'ok' : 'off'}" data-action="meal-paid" data-kid="${k.id}">${m.paid ? 'Pagato ✓' : 'Da pagare'}</button></td>
    </tr>`;
  }).join('');
  renderPastiFoot(ymK);
}
function renderPastiFoot(ymK) {
  const foot = $('#mealsFoot'); if (!foot) return;
  const rows = Object.values(state.meals[ymK] || {}).filter(Boolean);
  const tot = rows.reduce((a, r) => a + (r.count || 0) * (r.rate || 0), 0);
  const np = rows.reduce((a, r) => a + (r.count || 0), 0);
  foot.innerHTML =
    `<tr><th scope="row">Totale sezione</th><td class="num">${np}</td><td></td><td class="num"><strong>${fmtEur(tot)}</strong></td><td></td></tr>`;
}
function onMealInput(el) {
  const ymK = curYm(); const month = state.meals[ymK]; if (!month) return;
  const m = month[el.dataset.kid]; if (!m) return;
  let v = parseFloat(el.value);
  if (isNaN(v) || v < 0) v = 0;
  m[el.dataset.field] = v;
  const cell = $(`[data-cell="tot-${el.dataset.kid}"]`);
  if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
  renderPastiFoot(ymK); save();
}
function onMealPaid(kid) {
  const ymK = curYm(); const month = state.meals[ymK] = state.meals[ymK] || {};
  const m = month[kid] = month[kid] || { count: 0, rate: 4, paid: false };
  m.paid = !m.paid;
  save(); renderPasti(); renderParentMeals();
  toast(m.paid ? 'Bollettino segnato come pagato ✓' : 'Bollettino rimesso in «Da pagare»');
}
function genMeals() {
  const ymK = curYm(); state.meals[ymK] = state.meals[ymK] || {};
  state.kids.forEach(k => { if (!state.meals[ymK][k.id]) state.meals[ymK][k.id] = { count: 0, rate: 4, paid: false }; });
  save(); renderPasti();
  toast('Bollettino ' + new Date(ymK + '-01T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) + ' pronto');
}
function exportMeals() {
  const ymK = curYm(), month = state.meals[ymK] || {};
  const rows = [['Bambino', 'Codice', 'Pasti', 'Tariffa', 'Totale', 'Stato']];
  state.kids.forEach(k => {
    const m = month[k.id]; if (!m) return;
    rows.push([k.name, k.code, m.count || 0, String(m.rate || 0).replace('.', ','), String(((m.count || 0) * (m.rate || 0)).toFixed(2)).replace('.', ','), m.paid ? 'Pagato' : 'Da pagare']);
  });
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
  a.download = 'bollettino-pasti-' + ymK + '.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Bollettino esportato in CSV ✓');
}

/* ---------- avvisi (maestre) ---------- */
function renderMsgs() {
  const box = $('#msgList'); if (!box) return;
  const empty = $('#msgEmpty'); if (empty) empty.hidden = state.msgs.length > 0;
  box.innerHTML = state.msgs.map(g => {
    const n = state.kids.filter(k => g.reads && g.reads[k.id]).length, tot = Math.max(state.kids.length, 1);
    return `<li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(g.text)}</p>
        <p class="msg-time">${fmtTime(g.ts)} · letto da ${n} di ${state.kids.length} famiglie</p>
        <progress class="read-bar" max="${tot}" value="${n}"></progress>
      </div>
      <button type="button" class="msg-del" data-action="msg-del" data-id="${g.id}">Elimina</button>
    </li>`;
  }).join('');
}
function onAvviso() {
  const ta = $('#avvisoText');
  const txt = ((ta && ta.value) || '').trim();
  if (txt.length < 5) return toast("L'avviso richiede almeno 5 lettere ✏️");
  state.msgs.unshift({ id: uid(), text: txt, ts: Date.now(), reads: {} });
  if (ta) ta.value = '';
  save(); renderMsgs();
  toast('Avviso inviato a tutte le famiglie ✓');
}
function delMsg(id) {
  const g = state.msgs.find(x => x.id === id); if (!g) return;
  if (!confirmDel("l'avviso")) return;
  state.msgs = state.msgs.filter(x => x.id !== id);
  save(); renderMsgs();
  toast('Avviso eliminato');
}

/* ---------- vista genitori ---------- */
function renderTodos() {
  const box = $('#parentTodos'); if (!box) return;
  const k = parentKid(); if (!k) return;
  const list = state.memos.filter(m => m.kid === k.id).sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  const empty = $('#parentTodoEmpty'); if (empty) empty.hidden = list.length > 0;
  const card = $('#parentTodoCard');
  if (card) card.style.display = '';
  box.innerHTML = list.map(m =>
    `<li class="todo-item"><span class="todo-dot" style="${m.done ? 'background:var(--sage)' : ''}"></span>
      <span style="flex:1;${m.done ? 'text-decoration:line-through;opacity:.6' : ''}">${m.ico ? esc(m.ico) + ' ' : ''}${esc(m.text)}<small>${fmtDate(m.ts)}</small></span>
      <button type="button" class="badge ${m.done ? 'ok' : 'off'}" data-action="todo-done" data-id="${m.id}">${m.done ? 'Portato ✓' : 'Segna portato'}</button>
    </li>`).join('');
}
function renderParentMenu() {
  const today = $('#parentMenuToday'), next = $('#parentMenuNext');
  if (!today) return;
  const t = new Date(), key = iso(t), m = state.menu[key], wd = (t.getDay() + 6) % 7;
  today.innerHTML = m
    ? `<div class="menu-today"><h3>Menù di oggi · ${DOW[wd]} ${t.getDate()}</h3>
        <span class="mt"><strong>Primo</strong>${esc(m.primo || '—')}</span>
        <span class="mt"><strong>Secondo</strong>${esc(m.secondo || '—')}</span>
        <span class="mt"><strong>Contorno</strong>${esc(m.contorno || '—')}</span>
        <span class="mt"><strong>Merenda</strong>${esc(m.merenda || '—')}</span></div>`
    : `<div class="menu-today"><h3>Menù di oggi</h3><p class="hint">Il menù di oggi non è ancora stato pubblicato.</p></div>`;
  if (!next) return;
  const upcoming = []; const d = new Date(t);
  for (let i = 0; i < 30 && upcoming.length < 4; i++) {
    d.setDate(d.getDate() + 1);
    const mm = state.menu[iso(d)];
    if (mm) upcoming.push({ d: new Date(d), m: mm });
  }
  next.innerHTML = upcoming.map(x => {
    const prev = [x.m.primo, x.m.secondo, x.m.contorno, x.m.merenda].filter(Boolean).slice(0, 3).join(' · ');
    return `<li class="menu-row"><strong>${DOW[(x.d.getDay() + 6) % 7]} ${x.d.getDate()}</strong><span>${esc(prev)}</span></li>`;
  }).join('') || '<li class="hint">Nessun menù nei prossimi giorni.</li>';
}
function renderParentMeals() {
  const box = $('#parentMeals'); if (!box) return;
  const k = parentKid(); if (!k) return;
  const ymK = ymNow(), m = (state.meals[ymK] || {})[k.id];
  const label = new Date(ymK + '-01T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  box.innerHTML = m
    ? `<div class="bill-card">
        <div class="bill-total"><strong>${fmtEur((m.count || 0) * (m.rate || 0))}</strong><span class="badge ${m.paid ? 'ok' : 'off'}">${m.paid ? 'Pagato ✓' : 'Da pagare'}</span></div>
        <p class="bill-sub">${m.count || 0} pasti a ${fmtEur(m.rate || 0)} · bollettino di ${label}</p>
      </div>`
    : `<p class="hint">Il bollettino di ${label} non è ancora stato predisposto dalle maestre.</p>`;
}
function renderParentMsgs() {
  const box = $('#parentMsgs'); if (!box) return;
  const k = parentKid(); if (!k) return;
  const list = state.msgs.slice(0, 6);
  const empty = $('#parentMsgEmpty'); if (empty) empty.hidden = list.length > 0;
  box.innerHTML = list.map(g => {
    const read = !!(g.reads && g.reads[k.id]);
    return `<li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(g.text)}</p>
        <p class="msg-time">${fmtTime(g.ts)}</p>
        ${read ? '' : `<button type="button" class="badge off" data-action="msg-read" data-id="${g.id}" style="margin-top:.4rem">Segna come letto</button>`}
      </div>
      ${read ? '<span class="badge ok">Letto ✓</span>' : ''}
    </li>`;
  }).join('');
}
function markMsgRead(id) {
  const g = state.msgs.find(x => x.id === id), k = parentKid();
  if (!g || !k) return;
  g.reads = g.reads || {};
  if (g.reads[k.id]) return;
  g.reads[k.id] = true;
  save(); renderParentMsgs(); renderMsgs();
}

/* ---------- eventi ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const act = el.dataset.action;
  if (act === 'role-tab') setRoleTab(el.dataset.role);
  else if (act === 'logout') logout();
  else if (act === 'tab') switchTab(el.dataset.tab);
  else if (act === 'toggle-add-kid') {
    const f = $('#addKidForm');
    if (f) { f.hidden = !f.hidden; if (!f.hidden) { const i = $('#addKidName'); if (i) i.focus(); } }
  }
  else if (act === 'open-kid') openDrawer(el.dataset.id);
  else if (act === 'close-drawer') closeDrawer();
  else if (act === 'quick-memo') sendQuickMemo(el.dataset.id);
  else if (act === 'quick-new') openQuickNew();
  else if (act === 'quick-edit') startQuickEdit(el.dataset.id);
  else if (act === 'quick-cancel') cancelQuickEdit();
  else if (act === 'quick-del') onQuickDel(el.dataset.id);
  else if (act === 'memo-done') toggleMemo(el.dataset.id);
  else if (act === 'memo-del') delMemo(el.dataset.id);
  else if (act === 'menu-day') { menuSel = el.dataset.day; renderMenu(); }
  else if (act === 'menu-prev') { menuM--; if (menuM < 0) { menuM = 11; menuY--; } renderMenu(); }
  else if (act === 'menu-next') { menuM++; if (menuM > 11) { menuM = 0; menuY++; } renderMenu(); }
  else if (act === 'menu-copy') onMenuCopy();
  else if (act === 'gen-meals') genMeals();
  else if (act === 'export-meals') exportMeals();
  else if (act === 'meal-paid') onMealPaid(el.dataset.kid);
  else if (act === 'msg-del') delMsg(el.dataset.id);
  else if (act === 'msg-read') markMsgRead(el.dataset.id);
  else if (act === 'todo-done') toggleMemo(el.dataset.id);
});
document.addEventListener('input', e => {
  const el = e.target.closest('input[data-field][data-kid]');
  if (el) onMealInput(el);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drawerKid) closeDrawer();
});
const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
on('#loginForm', 'submit', onLogin);
on('#addKidForm', 'submit', e => { e.preventDefault(); onAddKid(); });
on('#quickForm', 'submit', e => { e.preventDefault(); onQuickAdd(); });
on('#avvisoForm', 'submit', e => { e.preventDefault(); onAvviso(); });
on('#menuForm', 'submit', e => { e.preventDefault(); onMenuSave(); });
on('#drawerNoteForm', 'submit', e => {
  e.preventDefault();
  const inp = $('#drawerNote'), txt = ((inp && inp.value) || '').trim();
  if (!drawerKid) return;
  if (txt.length < 3) return toast('Scrivi almeno 3 lettere ✏️');
  addMemo(drawerKid.id, txt, '');
  if (inp) inp.value = '';
  renderDrawerMemos(); renderMemos(); renderKids();
  toast('Memo inviato alla famiglia ✓');
});
on('#menuDay', 'change', e => { menuSel = e.target.value; renderMenu(); });
on('#kidSearch', 'input', renderKids);
on('#memoKid', 'change', renderMemos);
on('#memoState', 'change', renderMemos);
on('#mealsMonth', 'change', renderPasti);

/* ---------- avvio ---------- */
state = load();
const now = new Date();
menuY = now.getFullYear(); menuM = now.getMonth();
setRoleTab('admin');
if (state.role === 'admin') showAdmin();
else if (state.parentKid && parentKid()) showParent();
else show('viewLogin');
