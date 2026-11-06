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
const MEMO_TTL = 24 * 60 * 60 * 1000; // i memo ricevuti spariscono da soli dopo 24h
const DEFAULT_SCHOOL = () => 'Asilo Nido Arcobaleno';
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
  const s1 = uid(), s2 = uid();
  const d = off => { const x = new Date(t); x.setDate(x.getDate() + off); return iso(x); };
  return {
    v: 1,
    school: DEFAULT_SCHOOL(),
    sections: [
      { id: s1, name: 'Sezione Farfalle' },
      { id: s2, name: 'Sezione Coccinelle' }
    ],
    kids: [
      { id: k1, name: 'Emma Bianchi', code: 'B001', sec: s1 },
      { id: k2, name: 'Luca Verdi', code: 'B002', sec: s1 },
      { id: k3, name: 'Sofia Ricci', code: 'B003', sec: s2 }
    ],
    quickTypes: DEFAULT_QUICK(),
    memos: [
      { id: uid(), kid: k1, text: 'Portare cambio completo', ico: '🍼', ts: Date.now() - 864e5, done: false },
      { id: uid(), kid: k2, text: 'Portare calzine antiscivolo', ico: '🧦', ts: Date.now() - 1728e5, done: true, doneTs: Date.now() - 36e5 }
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
      if (typeof d.school !== 'string' || !d.school.trim()) d.school = DEFAULT_SCHOOL();
      if (!Array.isArray(d.sections) || !d.sections.length) {
        const s = uid();
        d.sections = [{ id: s, name: 'Sezione unica' }];
        d.kids.forEach(k => { if (!k.sec) k.sec = s; });
      }
      // sezioni eliminate: i bambini orfani tornano nella prima disponibile
      const valid = new Set(d.sections.map(x => x.id));
      const first = d.sections[0].id;
      d.kids.forEach(k => { if (!k.sec || !valid.has(k.sec)) k.sec = first; });
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
let state, menuY, menuM, menuSel = '', drawerKid = null, loginRole = 'admin', quickEdit = '', secEdit = '';
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const parentKid = () => state.kids.find(k => k.id === state.parentKid);
const secName = id => { const s = state.sections.find(x => x.id === id); return s ? s.name : '—'; };

/* ---------- autopulizia: memo ricevuti eliminati dopo 24h ---------- */
function purgeDoneMemos() {
  const cutoff = Date.now() - MEMO_TTL;
  const before = state.memos.length;
  state.memos = state.memos.filter(m => !(m.done && (m.doneTs || m.ts) < cutoff));
  if (state.memos.length !== before) { save(); return true; }
  return false;
}
function autoPurge() {
  if (!purgeDoneMemos()) return;
  renderMemos(); renderKids(); updateMemoBadge();
  if (drawerKid) renderDrawerMemos();
  if (state.role === 'parent') renderTodos();
}

/* ---------- nome asilo: una sola fonte di verità ---------- */
const school = () => (typeof state.school === 'string' && state.school.trim()) ? state.school.trim() : DEFAULT_SCHOOL();
function applySchool() {
  const n = school();
  const ls = $('#loginSchool'); if (ls) ls.textContent = n;
  const as = $('#adminSchool'); if (as) as.textContent = n;
  const ps = $('#parentSchool'); if (ps) ps.textContent = n;
  const inp = $('#schoolName'); if (inp && document.activeElement !== inp) inp.value = n;
  document.title = n + ' · Asilapp';
}
function onSchoolSave(e) {
  e.preventDefault();
  const inp = $('#schoolName'), err = $('#schoolErr');
  const v = ((inp && inp.value) || '').trim().replace(/\s+/g, ' ');
  if (err) err.hidden = true;
  if (v.length < 3) { if (err) { err.textContent = 'Il nome dell\u2019asilo richiede almeno 3 lettere.'; err.hidden = false; } return; }
  state.school = v; save(); applySchool();
  toast('Nome dell\u2019asilo aggiornato ✓');
}

/* ---------- classi / sezioni / sedi ---------- */
function renderSections() {
  const list = $('#secList'); if (!list) return;
  const empty = $('#secEmpty'); if (empty) empty.hidden = state.sections.length > 0;
  list.innerHTML = state.sections.map(s => {
    const n = state.kids.filter(k => k.sec === s.id).length;
    return `<li>
      <span class="tpl-txt">${esc(s.name)} <small style="color:var(--muted);font-weight:500">· ${n} ${n === 1 ? 'bambino' : 'bambini'}</small></span>
      <button type="button" class="memo-del" data-action="sec-edit" data-id="${s.id}">Modifica</button>
      <button type="button" class="memo-del" data-action="sec-del" data-id="${s.id}">Elimina</button>
    </li>`;
  }).join('');
  if (secEdit && !state.sections.some(s => s.id === secEdit)) cancelSecEdit();
}
function openSecNew() {
  secEdit = '';
  const f = $('#secForm'); if (!f) return;
  const n = $('#secName'); if (n) n.value = '';
  const sb = $('#secSubmitBtn'), cb = $('#secCancelBtn'), err = $('#secErr');
  if (sb) sb.textContent = 'Aggiungi';
  if (cb) cb.hidden = true;
  if (err) err.hidden = true;
  f.hidden = false;
  if (n) n.focus();
}
function startSecEdit(id) {
  const s = state.sections.find(x => x.id === id); if (!s) return;
  secEdit = id;
  const f = $('#secForm'); if (!f) return;
  const n = $('#secName'); if (n) n.value = s.name;
  const sb = $('#secSubmitBtn'), cb = $('#secCancelBtn'), err = $('#secErr');
  if (sb) sb.textContent = 'Aggiorna';
  if (cb) cb.hidden = false;
  if (err) err.hidden = true;
  f.hidden = false;
  if (n) { n.focus(); n.select(); }
}
function cancelSecEdit() {
  secEdit = '';
  const f = $('#secForm'); if (f) f.hidden = true;
}
function onSecAdd() {
  const err = $('#secErr');
  const name = (($('#secName') || {}).value || '').trim().replace(/\s+/g, ' ');
  const fail = msg => { if (err) { err.textContent = msg; err.hidden = false; } };
  if (err) err.hidden = true;
  if (name.length < 3) return fail('Il nome richiede almeno 3 lettere.');
  if (state.sections.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== secEdit))
    return fail('Esiste già una classe con questo nome.');
  if (secEdit) {
    const s = state.sections.find(x => x.id === secEdit);
    if (s) s.name = name;
    secEdit = '';
    save(); renderSections(); fillSectionSelects(); renderKids(); renderPasti();
    cancelSecEdit();
    toast('Classe aggiornata ✓');
  } else {
    state.sections.push({ id: uid(), name });
    save(); renderSections(); fillSectionSelects();
    cancelSecEdit();
    toast('Classe aggiunta ✓');
  }
}
function onSecDel(id) {
  const s = state.sections.find(x => x.id === id); if (!s) return;
  const n = state.kids.filter(k => k.sec === id).length;
  if (state.sections.length === 1) { toast('Serve almeno una classe: non puoi eliminarla'); return; }
  if (!confirmDel('la classe \u00AB' + s.name + '\u00BB' + (n ? ' (i suoi ' + n + ' bambini passeranno alla prima classe disponibile)' : ''))) return;
  state.sections = state.sections.filter(x => x.id !== id);
  const first = state.sections[0].id;
  state.kids.forEach(k => { if (k.sec === id) k.sec = first; });
  save(); renderSections(); fillSectionSelects(); renderKids(); renderPasti();
  if (secEdit === id) cancelSecEdit();
  toast('Classe eliminata');
}
/* ripopola tutte le select che elencano le classi */
function fillSectionSelects() {
  const opts = state.sections.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const filt = $('#kidSection');
  if (filt) {
    const cur = filt.value;
    filt.innerHTML = '<option value="tutte">Tutte le classi</option>' + opts;
    filt.value = state.sections.some(s => s.id === cur) ? cur : 'tutte';
  }
  const add = $('#addKidSection');
  if (add) { const cur = add.value; add.innerHTML = opts; add.value = state.sections.some(s => s.id === cur) ? cur : (state.sections[0] || {}).id; }
  const dr = $('#drawerSection');
  if (dr && drawerKid) {
    const cur = drawerKid.sec;
    dr.innerHTML = opts;
    dr.value = state.sections.some(s => s.id === cur) ? cur : (state.sections[0] || {}).id;
  }
}

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
  applySchool();
  show('viewAdmin'); switchTab('kids');
  const sc = $('#settingsCard'); if (sc) sc.hidden = true;
  renderSections(); fillSectionSelects(); cancelSecEdit();
  renderKids(); fillMemoKid(); renderMemos(); renderMemoTemplates();
  renderMenu(); renderPasti(); renderMsgs(); updateMemoBadge();
}
function showParent() {
  const k = parentKid(); if (!k) { logout(); return; }
  markMsgsRead(); applySchool();
  show('viewParent');
  const hero = $('#parentHero');
  if (hero) hero.innerHTML =
    `<span class="avatar lg ${avCls(k.id)}">${initials(k.name)}</span>
     <div class="hero-txt"><h2>Ciao, ${esc(k.name.split(' ')[0])}!</h2>
       <span class="badge ok">${esc(school())}</span>
       <small style="color:var(--muted);font-size:.74rem">${esc(secName(k.sec))}</small></div>
     <span class="hero-code">Codice famiglia: <strong>${esc(k.code)}</strong></span>`;
  renderTodos(); renderParentMenu(); renderParentMeals(); renderParentMsgs();
}
function logout() {
  state.role = null; state.parentKid = null; save();
  drawerKid = null; closeDrawer(); setRoleTab('admin'); applySchool(); show('viewLogin');
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
  const sf = ($('#kidSection') || {}).value || 'tutte';
  const list = state.kids
    .filter(k => sf === 'tutte' || k.sec === sf)
    .filter(k => k.name.toLowerCase().includes(q) || k.code.toLowerCase().includes(q));
  const empty = $('#kidsEmpty'); if (empty) empty.hidden = list.length > 0;
  grid.innerHTML = list.map(k => {
    const open = state.memos.filter(m => m.kid === k.id && !m.done).length;
    return `<button type="button" class="kid-card" data-action="open-kid" data-id="${k.id}">
      <span class="avatar ${avCls(k.id)}">${initials(k.name)}</span>
      <span class="kid-name">${esc(k.name)}</span>
      <span class="kid-meta">${esc(secName(k.sec))} · Codice ${esc(k.code)}</span>
      ${open ? `<span class="badge-low">${open} memo in attesa</span>` : ''}
    </button>`;
  }).join('');
}
function onAddKid() {
  const err = $('#addKidErr');
  const nameEl = $('#addKidName'), codeEl = $('#addKidCode'), secEl = $('#addKidSection');
  const name = ((nameEl && nameEl.value) || '').trim().replace(/\s+/g, ' ');
  const code = ((codeEl && codeEl.value) || '').trim().toUpperCase();
  const sec = (secEl && secEl.value) || (state.sections[0] || {}).id;
  const fail = msg => { if (err) { err.textContent = msg; err.hidden = false; } };
  if (err) err.hidden = true;
  if (name.length < 3) return fail('Il nome richiede almeno 3 lettere.');
  if (!/^[A-Z0-9]{2,8}$/.test(code)) return fail('Il codice famiglia serve di 2\u20138 lettere o numeri, es. B007.');
  if (state.kids.some(k => k.code.toUpperCase() === code)) return fail('Esiste già un bambino con il codice ' + code + '.');
  state.kids.push({ id: uid(), name, code, sec });
  save();
  if (nameEl) nameEl.value = ''; if (codeEl) codeEl.value = '';
  const f = $('#addKidForm'); if (f) f.hidden = true;
  renderKids(); fillMemoKid(); renderMemos(); renderPasti(); renderSections();
  toast('Bambino aggiunto ✓');
}

/* ---------- drawer bambino ---------- */
function openDrawer(id) {
  drawerKid = state.kids.find(k => k.id === id); if (!drawerKid) return;
  const av = $('#drawerAvatar');
  if (av) { av.className = 'avatar lg ' + avCls(drawerKid.id); av.textContent = initials(drawerKid.name); }
  const nm = $('#drawerName'), mt = $('#drawerMeta');
  if (nm) nm.textContent = drawerKid.name;
  if (mt) mt.textContent = secName(drawerKid.sec) + ' · Codice famiglia ' + drawerKid.code;
  fillSectionSelects();
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
function onDrawerSection(id) {
  if (!drawerKid) return;
  drawerKid.sec = id; save();
  const mt = $('#drawerMeta');
  if (mt) mt.textContent = secName(id) + ' · Codice famiglia ' + drawerKid.code;
  renderKids(); renderPasti(); renderSections();
  toast(drawerKid.name.split(' ')[0] + ' spostato in «' + secName(id) + '» ✓');
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
function onDrawerNote() {
  const inp = $('#drawerNote');
  const txt = ((inp && inp.value) || '').trim();
  if (!drawerKid) return;
  if (txt.length < 3) { toast('Scrivi almeno 3 lettere per il memo'); return; }
  addMemo(drawerKid.id, txt, '📝');
  if (inp) inp.value = '';
  renderDrawerMemos(); renderMemos(); renderKids();
  toast('Memo inviato a ' + drawerKid.name.split(' ')[0] + ' ✓');
}

/* ---------- modelli memo rapidi ---------- */
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
  toast(m.done ? 'Memo ricevuto — verrà rimosso in automatico tra 24 ore' : 'Memo rimesso in attesa');
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
  if (cnt) { cnt.hidden = list.length === 0; cnt.textContent = list.length + ' memo'; }
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
function menuShift(n) {
  menuM += n;
  if (menuM < 0) { menuM = 11; menuY--; }
  if (menuM > 11) { menuM = 0; menuY++; }
  menuSel = ''; renderMenu();
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
      <td>${esc(secName(k.sec))}</td>
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
  const month = state.meals[ymK] || {};
  const tot = state.kids.reduce((a, k) => a + ((month[k.id] || {}).count || 0) * ((month[k.id] || {}).rate || 0), 0);
  const n = state.kids.reduce((a, k) => a + ((month[k.id] || {}).count || 0), 0);
  foot.innerHTML = `<tr><td><strong>Totale mese</strong></td><td></td><td class="num"><strong>${n}</strong></td><td></td><td class="num"><strong>${fmtEur(tot)}</strong></td><td></td></tr>`;
}
function onMealField(inp) {
  const ymK = curYm(), month = state.meals[ymK] = state.meals[ymK] || {};
  const m = month[inp.dataset.kid] = month[inp.dataset.kid] || { count: 0, rate: 4, paid: false };
  m[inp.dataset.field] = parseFloat(inp.value) || 0;
  save();
  const cell = $(`[data-cell="tot-${inp.dataset.kid}"]`);
  if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
  renderPastiFoot(ymK);
}
function toggleMealPaid(kid) {
  const ymK = curYm(), month = state.meals[ymK] = state.meals[ymK] || {};
  const m = month[kid] = month[kid] || { count: 0, rate: 4, paid: false };
  m.paid = !m.paid; save(); renderPasti();
  toast(m.paid ? 'Bollettino segnato pagato ✓' : 'Bollettino rimesso da pagare');
}
function onGenMeals() {
  renderPasti();
  toast('Bollettino di ' + new Date(curYm() + '-01T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) + ' pronto ✓');
}
function onExportMeals() {
  const ymK = curYm(), month = state.meals[ymK] || {};
  const rows = [['Bambino', 'Classe', 'Pasti', 'Tariffa', 'Totale', 'Stato']];
  state.kids.forEach(k => {
    const m = month[k.id] || {};
    rows.push([k.name, secName(k.sec), m.count || 0, m.rate || 0, ((m.count || 0) * (m.rate || 0)).toFixed(2), m.paid ? 'Pagato' : 'Da pagare']);
  });
  const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'bollettino-pasti-' + ymK + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV del bollettino scaricato ✓');
}

/* ---------- avvisi ---------- */
function renderMsgs() {
  const box = $('#msgList'); if (!box) return;
  const list = state.msgs.slice().sort((a, b) => b.ts - a.ts);
  const empty = $('#msgEmpty'); if (empty) empty.hidden = list.length > 0;
  box.innerHTML = list.map(m => {
    const reads = Object.keys(m.reads || {}).length, tot = state.kids.length;
    return `<li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(m.text)}</p>
        <p class="msg-time">${new Date(m.ts).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · letto da ${reads}/${tot} famiglie</p>
        <progress class="read-bar" max="${Math.max(tot, 1)}" value="${reads}"></progress>
      </div>
      <button type="button" class="msg-del" data-action="msg-del" data-id="${m.id}">Elimina</button>
    </li>`;
  }).join('');
}
function onAvviso(e) {
  e.preventDefault();
  const t = $('#avvisoText');
  const txt = ((t && t.value) || '').trim();
  if (txt.length < 5) { toast('Scrivi almeno 5 lettere per l\u2019avviso'); return; }
  state.msgs.unshift({ id: uid(), text: txt, ts: Date.now(), reads: {} });
  save();
  if (t) t.value = '';
  renderMsgs();
  toast('Avviso inviato a tutte le famiglie ✓');
}
function delMsg(id) {
  if (!confirmDel('questo avviso')) return;
  state.msgs = state.msgs.filter(x => x.id !== id);
  save(); renderMsgs(); renderParentMsgs();
}
function markMsgsRead() {
  const k = parentKid(); if (!k) return;
  let ch = false;
  state.msgs.forEach(m => { if (!m.reads) m.reads = {}; if (!m.reads[k.id]) { m.reads[k.id] = Date.now(); ch = true; } });
  if (ch) save();
}

/* ---------- vista genitori ---------- */
function renderTodos() {
  const k = parentKid(); if (!k) return;
  const list = state.memos.filter(m => m.kid === k.id).sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  const box = $('#parentTodos'), empty = $('#parentTodoEmpty');
  if (!box) return;
  if (empty) empty.hidden = list.length > 0;
  box.innerHTML = list.map(m => `
    <li class="todo-item ${m.done ? 'done' : ''}">
      <span class="todo-dot"></span>
      <span style="flex:1;min-width:0">
        <span class="todo-txt">${m.ico ? esc(m.ico) + ' ' : ''}${esc(m.text)}</span>
        <small>${m.done ? 'Portato ✓ — sparirà tra 24 ore' : 'In attesa · ' + fmtDate(m.ts)}</small>
      </span>
      ${m.done ? '' : `<button type="button" class="link-btn" data-action="parent-done" data-id="${m.id}">Portato ✓</button>`}
    </li>`).join('');
}
function onParentDone(id) {
  const m = state.memos.find(x => x.id === id); if (!m) return;
  m.done = true; m.doneTs = Date.now();
  save(); renderTodos(); renderMemos(); updateMemoBadge();
  toast('Grazie! Segnato come portato ✓');
}
function renderParentMenu() {
  const k = parentKid(); if (!k) return;
  const today = iso(new Date());
  const m = state.menu[today];
  const box = $('#parentMenuToday'); if (!box) return;
  box.innerHTML = `<div class="menu-today">
    <h3>Menù di oggi</h3>
    ${m ? `
      <span class="mt"><strong>🍝 Primo</strong>${esc(m.primo || '—')}</span>
      <span class="mt"><strong>🍗 Secondo</strong>${esc(m.secondo || '—')}</span>
      <span class="mt"><strong>🥗 Contorno</strong>${esc(m.contorno || '—')}</span>
      <span class="mt"><strong>🍎 Merenda</strong>${esc(m.merenda || '—')}</span>`
    : '<p class="hint">Il menù di oggi non è ancora stato pubblicato.</p>'}
  </div>`;
  const next = $('#parentMenuNext');
  if (next) {
    const d = new Date(); const out = [];
    for (let i = 1; i <= 7 && out.length < 4; i++) {
      d.setDate(d.getDate() + 1);
      const key = iso(d), mm = state.menu[key];
      if (mm) out.push(`<li class="menu-row"><strong>${d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>${esc([mm.primo, mm.secondo].filter(Boolean).join(' · ') || '—')}</span></li>`);
    }
    next.innerHTML = out.join('') || '<li class="hint">Nessun menù nei prossimi giorni.</li>';
  }
}
function renderParentMeals() {
  const k = parentKid(); if (!k) return;
  const box = $('#parentMeals'); if (!box) return;
  const ymK = ymNow(), m = (state.meals[ymK] || {})[k.id] || { count: 0, rate: 4, paid: false };
  const tot = (m.count || 0) * (m.rate || 0);
  box.innerHTML = `<div class="bill-card">
    <div class="bill-total"><span>Bollettino di ${new Date(ymK + '-01T12:00').toLocaleDateString('it-IT', { month: 'long' })}</span><strong>${fmtEur(tot)}</strong></div>
    <p class="bill-sub">${m.count || 0} pasti × ${fmtEur(m.rate || 0)} · ${m.paid ? 'pagato ✓' : 'in attesa di pagamento'}</p>
  </div>`;
}
function renderParentMsgs() {
  const box = $('#parentMsgs'); if (!box) return;
  const list = state.msgs.slice().sort((a, b) => b.ts - a.ts);
  const empty = $('#parentMsgEmpty'); if (empty) empty.hidden = list.length > 0;
  box.innerHTML = list.map(m => `
    <li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(m.text)}</p>
        <p class="msg-time">${new Date(m.ts).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </li>`).join('');
}

/* ---------- delegazione eventi ---------- */
const ACTIONS = {
  'role-tab': btn => setRoleTab(btn.dataset.role),
  'logout': () => logout(),
  'tab': btn => switchTab(btn.dataset.tab),
  'toggle-settings': () => {
    const c = $('#settingsCard'); if (!c) return;
    c.hidden = !c.hidden;
    if (!c.hidden) { renderSections(); fillSectionSelects(); }
  },
  'sec-new': () => openSecNew(),
  'sec-cancel': () => cancelSecEdit(),
  'sec-edit': btn => startSecEdit(btn.dataset.id),
  'sec-del': btn => onSecDel(btn.dataset.id),
  'toggle-add-kid': () => {
    const f = $('#addKidForm'); if (f) { f.hidden = !f.hidden; if (!f.hidden) { fillSectionSelects(); const i = $('#addKidName'); if (i) i.focus(); } }
  },
  'open-kid': btn => openDrawer(btn.dataset.id),
  'close-drawer': () => closeDrawer(),
  'quick-memo': btn => sendQuickMemo(btn.dataset.id),
  'quick-new': () => openQuickNew(),
  'quick-cancel': () => cancelQuickEdit(),
  'quick-edit': btn => startQuickEdit(btn.dataset.id),
  'quick-del': btn => onQuickDel(btn.dataset.id),
  'memo-done': btn => toggleMemo(btn.dataset.id),
  'memo-del': btn => delMemo(btn.dataset.id),
  'menu-day': btn => { menuSel = btn.dataset.day; renderMenu(); },
  'menu-prev': () => menuShift(-1),
  'menu-next': () => menuShift(1),
  'menu-copy': () => onMenuCopy(),
  'gen-meals': () => onGenMeals(),
  'export-meals': () => onExportMeals(),
  'meal-paid': btn => toggleMealPaid(btn.dataset.kid),
  'msg-del': btn => delMsg(btn.dataset.id),
  'parent-done': btn => onParentDone(btn.dataset.id)
};
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const fn = ACTIONS[btn.dataset.action];
  if (fn) { e.preventDefault(); fn(btn); }
});
document.addEventListener('input', e => {
  if (e.target.matches('[data-field]')) onMealField(e.target);
  if (e.target.id === 'kidSearch' || e.target.id === 'kidSection') renderKids();
  if (e.target.id === 'memoKid' || e.target.id === 'memoState') renderMemos();
});
document.addEventListener('change', e => {
  if (e.target.id === 'drawerSection') onDrawerSection(e.target.value);
  if (e.target.id === 'mealsMonth') renderPasti();
  if (e.target.id === 'menuDay') { menuSel = e.target.value; menuFormFill(); const g = $('#menuGrid'); if (g) $$('.cal-day', ).forEach(c => {}); renderMenu(); }
});

/* ---------- avvio ---------- */
(function init() {
  state = load();
  const t = new Date();
  menuY = t.getFullYear(); menuM = t.getMonth();
  purgeDoneMemos();
  setInterval(autoPurge, 60 * 1000);

  const lf = $('#loginForm'); if (lf) lf.addEventListener('submit', onLogin);
  const sf = $('#schoolForm'); if (sf) sf.addEventListener('submit', onSchoolSave);
  const scf = $('#secForm'); if (scf) scf.addEventListener('submit', e => { e.preventDefault(); onSecAdd(); });
  const akf = $('#addKidForm'); if (akf) akf.addEventListener('submit', e => { e.preventDefault(); onAddKid(); });
  const qf = $('#quickForm'); if (qf) qf.addEventListener('submit', e => { e.preventDefault(); onQuickAdd(); });
  const dnf = $('#drawerNoteForm'); if (dnf) dnf.addEventListener('submit', e => { e.preventDefault(); onDrawerNote(); });
  const mf = $('#menuForm'); if (mf) mf.addEventListener('submit', e => { e.preventDefault(); onMenuSave(); });
  const av = $('#avvisoForm'); if (av) av.addEventListener('submit', onAvviso);

  applySchool(); setRoleTab('admin');
  if (state.role === 'admin') showAdmin();
  else if (state.role === 'parent' && parentKid()) showParent();
  else show('viewLogin');
})();
