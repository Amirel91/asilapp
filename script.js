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
  { id: uid(), ico: '🧸', txt: 'Ciuccio / coperta' },
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
  state.role = 'admin'; save();
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
  if (!/^[A-Z0-9]{2,8}$/.test(code)) return fail('Il codice famiglia serve di 2–8 lettere o numeri, es. B007.');
  if (state.kids.some(k => k.code.toUpperCase() === code)) return fail('Esiste già un bambino con il codice ' + code + '.');
  state.kids.push({ id: uid(), name, code });
  save();
  if (nameEl) nameEl.value = ''; if (codeEl) codeEl.value = '';
  const f = $('#addKidForm'); if (f) f.hidden = true;
  renderKids(); fillMemoKid(); renderMemos(); renderPasti(); renderMsgs();
  toast('Bambino aggiunto ✓');
}

/* ---------- drawer bambino (solo invio memo, niente gestione modelli) ---------- */
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

/* ---------- modelli memo rapidi: gestione nella sezione Memo ---------- */
function ensureTplBox() {
  let box = $('#quickMgr') || $('#tplBox');
  if (!box) {
    const pane = $('#paneMemo'); if (!pane) return null;
    box = document.createElement('section');
    box.className = 'card'; box.id = 'tplBox';
    const list = $('#memoList');
    pane.insertBefore(box, list || pane.firstChild);
  }
  return box;
}
function renderMemoTemplates() {
  const box = ensureTplBox(); if (!box) return;
  const ed = state.quickTypes.find(q => q.id === quickEdit);
  box.innerHTML = `
    <h3>Modelli dei memo rapidi</h3>
    <p class="hint" style="margin-bottom:.7rem">Questi pulsanti compaiono nel pannello di ogni bambino: creali, correggili o eliminali qui, una volta per tutte.</p>
    <form data-form="quick-add" class="add-form" style="box-shadow:none;padding:.6rem .65rem">
      <label class="field" style="margin:0;flex:0 0 76px"><span>Emoji</span>
        <input type="text" class="input" data-el="qIco" maxlength="4" placeholder="🍼" value="${ed ? esc(ed.ico) : ''}" style="text-align:center;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui,sans-serif" autocomplete="off">
      </label>
      <label class="field" style="margin:0;flex:1 1 170px"><span>Testo del modello</span>
        <input type="text" class="input" data-el="qTxt" maxlength="40" placeholder="es. Salviette umidificate" value="${ed ? esc(ed.txt) : ''}" autocomplete="off">
      </label>
      <span style="display:flex;gap:.4rem;padding-top:1.15rem">
        <button type="submit" class="btn btn-primary btn-sm">${ed ? 'Aggiorna' : 'Aggiungi modello'}</button>
        ${ed ? '<button type="button" class="btn btn-ghost btn-sm" data-action="quick-cancel">Annulla</button>' : ''}
      </span>
    </form>
    <ul style="display:grid;gap:.4rem;margin-top:.7rem">
      ${state.quickTypes.length ? state.quickTypes.map(q => `
        <li style="display:flex;align-items:center;gap:.55rem;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:.45rem .65rem;font-size:.88rem">
          <strong aria-hidden="true" style="font-size:1.05rem">${esc(q.ico)}</strong>
          <span style="flex:1;min-width:0">${esc(q.txt)}</span>
          <button type="button" class="memo-del" data-action="quick-edit" data-id="${q.id}">Modifica</button>
          <button type="button" class="memo-del" data-action="quick-del" data-id="${q.id}">Elimina</button>
        </li>`).join('') : '<li class="hint" style="margin:0">Nessun modello: aggiungi il primo qui sopra.</li>'}
    </ul>`;
  const i = box.querySelector('[data-el="qTxt"]'); if (i && quickEdit) i.focus();
}
function onQuickAdd(form) {
  const icoEl = form.querySelector('[data-el="qIco"]') || form.querySelector('#quickIco');
  const txtEl = form.querySelector('[data-el="qTxt"]') || form.querySelector('#quickTxt');
  const ico = ((icoEl && icoEl.value) || '').trim() || '📌';
  const txt = ((txtEl && txtEl.value) || '').trim().replace(/\s+/g, ' ');
  if (txt.length < 3) return toast('Il testo del modello richiede almeno 3 lettere ✏️');
  if (state.quickTypes.some(q => q.txt.toLowerCase() === txt.toLowerCase() && q.id !== quickEdit))
    return toast('Esiste già un modello con questo testo');
  if (quickEdit) {
    const q = state.quickTypes.find(x => x.id === quickEdit);
    if (q) { q.ico = ico; q.txt = txt; }
    quickEdit = '';
    save(); renderMemoTemplates(); renderQuick();
    toast('Modello aggiornato ✓');
  } else {
    state.quickTypes.push({ id: uid(), ico, txt });
    save(); renderMemoTemplates(); renderQuick();
    toast('Modello aggiunto ✓');
  }
}

/* ---------- memo ---------- */
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
  const val = id => (( $(id) || {}).value || '').trim();
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

/* ---------- vista genitori ---------- */
function renderTodos() {
  const box = $('#parentTodos'); if (!box) return;
  const k = parentKid(); if (!k) return;
  const list = state.memos.filter(m => m.kid === k.id).sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  const empty = $('#parentTodoEmpty'); if (empty) empty.hidden = list.length > 0;
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
  const ymK = ymNow(), m = state.meals[ymK] && state.meals[ymK][k.id];
  box.innerHTML = m
    ? `<div class="bill-card">
        <div class="bill-total"><strong>${fmtEur((m.count || 0) * (m.rate || 0))}</strong><span class="badge ${m.paid ? 'ok' : 'off'}">${m.paid ? 'Pagato ✓' : 'Da pagare'}</span></div>
        <p class="bill-sub">${m.count || 0} pasti × ${fmtEur(m.rate || 0)} · ${new Date(ymK + '-01T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p>
      </div>`
    : '<p class="hint">Il bollettino di questo mese non è ancora pronto.</p>';
}
function renderParentMsgs() {
  const box = $('#parentMsgs'); if (!box) return;
  const k = parentKid(); if (!k) return;
  const empty = $('#parentMsgEmpty'); if (empty) empty.hidden = state.msgs.length > 0;
  box.innerHTML = state.msgs.map(g => {
    const read = g.reads && g.reads[k.id];
    return `<li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(g.text)}</p>
        <p class="msg-time">${fmtTime(g.ts)}${read ? ' · letto ✓' : ''}</p>
      </div>
      <button type="button" class="badge ${read ? 'ok' : 'off'}" data-action="msg-read" data-id="${g.id}">${read ? 'Letto ✓' : 'Segna come letto'}</button>
    </li>`;
  }).join('');
}

/* ---------- login ---------- */
function setRoleTab(role) {
  loginRole = role;
  const parent = role === 'parent';
  $$('[data-action="role-tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  const fu = $('#fUser'), fp = $('#fPass'), fc = $('#fCode');
  if (fu) fu.hidden = parent;
  if (fp) fp.hidden = parent;
  if (fc) fc.hidden = !parent;
  if (parent) {
    const u = $('#loginUser'), p = $('#loginPass');
    if (u) u.value = ''; if (p) p.value = '';
  } else {
    const c = $('#loginCode'); if (c) c.value = '';
  }
  const err = $('#loginError'); if (err) err.hidden = true;
  const vl = $('#viewLogin');
  if (vl && !vl.hidden) { const el = parent ? $('#loginCode') : $('#loginUser'); if (el) el.focus(); }
}
function loginError(msg) { const e = $('#loginError'); if (e) { e.textContent = msg; e.hidden = false; } }
function doLogin() {
  const err = $('#loginError'); if (err) err.hidden = true;
  if (loginRole === 'parent') {
    const code = ((($('#loginCode') || {}).value) || '').trim().toUpperCase();
    if (!code) return loginError('Inserisci il codice famiglia che ti ha dato il nido.');
    const k = state.kids.find(x => x.code.toUpperCase() === code);
    if (!k) return loginError('Codice famiglia non trovato: controlla e riprova.');
    state.role = 'parent'; state.parentKid = k.id; save();
    const c = $('#loginCode'); if (c) c.value = '';
    showParent();
    toast('Bentornata, famiglia ' + k.name.split(' ')[0] + '!');
    return;
  }
  const u = ((($('#loginUser') || {}).value) || '').trim();
  const p = ($('#loginPass') || {}).value || '';
  if (u.toLowerCase() !== 'admin' || p !== 'nido2024')
    return loginError('Credenziali sbagliate: riprova (demo: admin · nido2024).');
  const un = $('#loginUser'), pw = $('#loginPass');
  if (un) un.value = ''; if (pw) pw.value = '';
  showAdmin();
  toast('Bentornata, maestra! 🌱');
}

/* ---------- click delegation ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const act = el.dataset.action;
  if (act === 'role-tab') { setRoleTab(el.dataset.role); return; }
  if (act === 'logout') { logout(); toast('A presto! 👋'); return; }
  if (act === 'tab') { switchTab(el.dataset.tab); return; }
  if (act === 'toggle-add-kid') {
    const f = $('#addKidForm'); if (!f) return;
    f.hidden = !f.hidden;
    const err = $('#addKidErr'); if (err) err.hidden = true;
    if (!f.hidden) { const n = $('#addKidName'); if (n) n.focus(); }
    return;
  }
  if (act === 'open-kid') { openDrawer(el.dataset.id); return; }
  if (act === 'close-drawer') { closeDrawer(); return; }
  if (act === 'quick-memo') {
    if (!drawerKid) return;
    const q = state.quickTypes.find(x => x.id === el.dataset.id); if (!q) return;
    addMemo(drawerKid.id, q.txt, q.ico);
    el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 900);
    renderDrawerMemos(); renderMemos(); renderKids();
    toast('Memo inviato alla famiglia ✓');
    return;
  }
  if (act === 'quick-mgr') { closeDrawer(); switchTab('memo'); return; }
  if (act === 'quick-edit') { quickEdit = el.dataset.id; renderMemoTemplates(); return; }
  if (act === 'quick-cancel') { quickEdit = ''; renderMemoTemplates(); return; }
  if (act === 'quick-del') {
    const q = state.quickTypes.find(x => x.id === el.dataset.id);
    if (q && confirmDel('il modello "' + q.txt + '"')) {
      state.quickTypes = state.quickTypes.filter(x => x.id !== q.id);
      if (quickEdit === q.id) quickEdit = '';
      save(); renderMemoTemplates(); renderQuick();
      toast('Modello eliminato');
    }
    return;
  }
  if (act === 'memo-done' || act === 'todo-done') {
    const m = state.memos.find(x => x.id === el.dataset.id); if (!m) return;
    m.done = !m.done;
    m.doneTs = m.done ? Date.now() : null;
    save(); renderTodos(); updateMemoBadge();
    if (drawerKid) renderDrawerMemos();
    renderMemos(); renderKids();
    return;
  }
  if (act === 'memo-del') {
    const m = state.memos.find(x => x.id === el.dataset.id);
    if (m && confirmDel('il memo')) {
      state.memos = state.memos.filter(x => x.id !== m.id);
      save();
      if (drawerKid) renderDrawerMemos();
      renderMemos(); renderKids(); renderTodos(); updateMemoBadge();
    }
    return;
  }
  if (act === 'menu-prev') { menuM--; if (menuM < 0) { menuM = 11; menuY--; } renderMenu(); return; }
  if (act === 'menu-next') { menuM++; if (menuM > 11) { menuM = 0; menuY++; } renderMenu(); return; }
  if (act === 'menu-day') { menuSel = el.dataset.day; renderMenu(); return; }
  if (act === 'menu-copy') {
    const prev = new Date(menuSel + 'T12:00'); prev.setDate(prev.getDate() - 1);
    const src = state.menu[iso(prev)];
    if (src) {
      state.menu[menuSel] = { ...src }; save(); renderMenu();
      toast('Menù copiato da ' + prev.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' ✓');
    } else toast('Il giorno prima non ha un menù da copiare');
    return;
  }
  if (act === 'meal-paid') {
    const ymK = curYm(), kid = el.dataset.kid;
    const m = state.meals[ymK] && state.meals[ymK][kid]; if (!m) return;
    m.paid = !m.paid; save(); renderPasti(); renderParentMeals();
    return;
  }
  if (act === 'gen-meals') { genMeals(); return; }
  if (act === 'export-meals') { exportMeals(); return; }
  if (act === 'msg-del') {
    const g = state.msgs.find(x => x.id === el.dataset.id);
    if (g && confirmDel("l'avviso")) {
      state.msgs = state.msgs.filter(x => x.id !== g.id);
      save(); renderMsgs(); renderParentMsgs();
      toast('Avviso eliminato');
    }
    return;
  }
  if (act === 'msg-read') {
    const g = state.msgs.find(x => x.id === el.dataset.id);
    if (g) { g.reads = g.reads || {}; g.reads[state.parentKid] = true; save(); renderParentMsgs(); }
    return;
  }
});

/* ---------- input & change delegation ---------- */
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'kidSearch') { renderKids(); return; }
  if (t.matches && t.matches('[data-field][data-kid]')) {
    const ymK = curYm(), m = state.meals[ymK] && state.meals[ymK][t.dataset.kid];
    if (!m) return;
    const n = parseFloat(t.value);
    m[t.dataset.field] = isNaN(n) || n < 0 ? 0 : n;
    save();
    const cell = $(`[data-cell="tot-${t.dataset.kid}"]`);
    if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
    renderPastiFoot(ymK);
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'memoKid' || t.id === 'memoState') { renderMemos(); return; }
  if (t.id === 'menuDay') { menuSel = t.value; renderMenu(); return; }
  if (t.id === 'mealsMonth') { renderPasti(); return; }
});

/* ---------- submit delegation ---------- */
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.id === 'loginForm') { e.preventDefault(); doLogin(); return; }
  if (f.id === 'addKidForm') { e.preventDefault(); onAddKid(); return; }
  if (f.id === 'menuForm') { e.preventDefault(); onMenuSave(); return; }
  if (f.id === 'avvisoForm') { e.preventDefault(); onAvviso(); return; }
  if (f.id === 'drawerNoteForm') {
    e.preventDefault();
    if (!drawerKid) return;
    const inp = $('#drawerNote');
    const txt = ((inp && inp.value) || '').trim().replace(/\s+/g, ' ');
    if (txt.length < 2) return toast('Scrivi il memo prima di inviarlo ✏️');
    addMemo(drawerKid.id, txt, '');
    if (inp) inp.value = '';
    renderDrawerMemos(); renderMemos(); renderKids();
    toast('Memo inviato alla famiglia ✓');
    return;
  }
  if (f.id === 'quickAddForm' || (f.matches && f.matches('[data-form="quick-add"]'))) {
    e.preventDefault(); onQuickAdd(f); return;
  }
});

/* ---------- avvio ---------- */
(function init() {
  state = load();
  const now = new Date();
  menuY = now.getFullYear(); menuM = now.getMonth();
  const md = $('#mealsMonth'); if (md && !md.value) md.value = ymNow();
  setRoleTab('admin');
  if (state.role === 'admin') showAdmin();
  else if (state.role === 'parent' && parentKid()) showParent();
  else show('viewLogin');
})();
