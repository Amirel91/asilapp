/* ============================================================
   Asilapp — logica app v3
   Pivot: memo famiglie · menù mensile · bollettino pasti
   Stato unico in localStorage + render() dalle viste
   ============================================================ */
'use strict';

/* ---------- costanti ---------- */
const LS_KEY = 'asilapp_v3';
const ADMIN_USER = 'admin', ADMIN_PASS = 'nido2024';
const AVS = ['av-sage', 'av-sky', 'av-terra', 'av-lav', 'av-sand', 'av-mint'];
const DOWS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const QUICKS = [
  { icon: '🧷', label: 'Pannolini',   text: 'Portare pannolini' },
  { icon: '👕', label: 'Cambio',      text: 'Portare un cambio di vestiti completo' },
  { icon: '🧦', label: 'Calzine',     text: 'Portare calzine di ricambio' },
  { icon: '🧴', label: 'Crema',       text: 'Portare la crema protettiva' },
  { icon: '👟', label: 'Scarpine',    text: 'Portare le scarpine di ricambio' },
  { icon: '🛁', label: 'Asciugamano', text: 'Portare l’asciugamano pulito' },
];
const PRIMI = ['Pasta al pomodoro', 'Riso agli ortaggi', 'Passato di verdura', 'Pasta al pesto', 'Minestrina', 'Couscous di verdure'];
const SECONDI = ['Polpettine', 'Platessa al forno', 'Frittata', 'Tacchino alla piana', 'Parmigiana leggera', 'Uovo sodo e formaggio'];
const CONTORNI = ['Zucchine al vapore', 'Purè di patate', 'Insalatina', 'Carote lesse', 'Fagiolini', 'Pomodorini'];
const MERENDE = ['Yogurt e frutta', 'Pane e marmellata', 'Biscotti e spremuta', 'Frullato alla banana', 'Pera e biscotto', 'Craker e pompelmo'];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const H = 36e5, D = 24 * H;
const pad = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymNow = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtEur = n => (Math.round(n * 100) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); };
const initials = name => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
function fmtRel(ts) {
  const d = new Date(ts), n = new Date();
  const t = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === n.toDateString()) return 'oggi ' + t;
  if (d.toDateString() === new Date(n.getTime() - D).toDateString()) return 'ieri ' + t;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' · ' + t;
}

/* ---------- stato ---------- */
let state, menuY, menuM, drawerKid = null;

function seed() {
  const now = Date.now();
  const kids = [
    { id: uid(), name: 'Giulia Rossi',   code: 'B001' },
    { id: uid(), name: 'Leo Bianchi',    code: 'B002' },
    { id: uid(), name: 'Sofia Colombo',  code: 'B003' },
    { id: uid(), name: 'Tommaso Ferrari',code: 'B004' },
    { id: uid(), name: 'Anna Vitale',    code: 'B005' },
    { id: uid(), name: 'Ettore Gallo',   code: 'B006' },
  ].map((k, i) => ({ ...k, color: i % AVS.length }));

  const memos = [
    { id: uid(), kidId: kids[0].id, text: 'Portare pannolini', ts: now - 2 * H, done: false },
    { id: uid(), kidId: kids[1].id, text: 'Portare un cambio di vestiti completo', ts: now - 6 * H, done: false },
    { id: uid(), kidId: kids[2].id, text: 'Portare la crema protettiva', ts: now - 28 * H, done: true },
  ];

  const menu = {};
  const b = new Date();
  const dim = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const date = new Date(b.getFullYear(), b.getMonth(), d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const i = (d - 1) % 6;
    menu[dkey(date)] = { primo: PRIMI[i], secondo: SECONDI[(i + 2) % 6], contorno: CONTORNI[(i + 4) % 6], merenda: MERENDE[i] };
  }

  const meals = {}; const ym = ymNow(); meals[ym] = {};
  [22, 18, 21, 20, 19, 17].forEach((c, i) => { meals[ym][kids[i].id] = { count: c, rate: 6, paid: i === 2 }; });

  const msgs = [
    { id: uid(), text: 'Domani mattina gita al parco: portare k-way e stivali.', ts: now - 5 * H },
    { id: uid(), text: 'Le prove della recita di fine anno sono ogni venerdì alle 10:00.', ts: now - 30 * H },
  ];
  return { v: 3, role: null, parentKid: null, kids, memos, menu, meals, msgs };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && data.v === 3) return data;
  } catch (e) { /* dati corrotti → demo fresca */ }
  const s = seed(); persist(s); return s;
}
function persist(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s || state)); } catch (e) {} }
function save() { persist(); }
const kidById = id => state.kids.find(k => k.id === id);
const openMemosOf = id => state.memos.filter(m => m.kidId === id && !m.done);
const curYm = () => $('#mealsMonth').value || ymNow();

/* ---------- toast ---------- */
function toast(msg) {
  const w = $('#toastWrap');
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  w.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 260); }, 2200);
}

/* ---------- viste ---------- */
function show(view) {
  ['viewLogin', 'viewAdmin', 'viewParent'].forEach(id => { $('#' + id).hidden = id !== view; });
}
function showAdmin() { renderAdmin(); show('viewAdmin'); }
function showParent() {
  const k = kidById(state.parentKid);
  if (!k) { state.role = null; save(); show('viewLogin'); return; }
  renderParent(); show('viewParent');
}

/* ---------- render admin ---------- */
function renderAdmin() {
  $('#adminToday').textContent = 'Oggi · ' + new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const open = state.memos.filter(m => !m.done).length;
  const badge = $('#memoTabCount');
  badge.textContent = open; badge.hidden = open === 0;
  renderKids(); renderMemos(); renderMenu(); renderPasti(); renderMsgs();
}

function renderKids() {
  const q = ($('#kidSearch').value || '').trim().toLowerCase();
  const list = state.kids.filter(k => !q || k.name.toLowerCase().includes(q) || k.code.toLowerCase().includes(q));
  $('#kidGrid').innerHTML = list.map(k => {
    const open = openMemosOf(k.id).length;
    return `<button type="button" class="kid-card" data-action="open-kid" data-id="${k.id}">
      <span style="display:flex;align-items:center;gap:.55rem">
        <span class="avatar ${AVS[k.color]}">${initials(k.name)}</span>
        <span><span class="kid-name">${esc(k.name)}</span><br><small class="kid-meta">Codice ${esc(k.code)}</small></span>
      </span>
      ${open ? `<span class="badge-low">${open} memo apert${open === 1 ? 'o' : 'i'}</span>` : ''}
    </button>`;
  }).join('');
  $('#kidsEmpty').hidden = list.length > 0;
}

function renderMemos() {
  const sel = $('#memoKid'), prevK = sel.value, prevS = $('#memoState').value;
  sel.innerHTML = '<option value="tutti">Tutti i bambini</option>' +
    state.kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  if ([...sel.options].some(o => o.value === prevK)) sel.value = prevK;

  let list = [...state.memos].sort((a, b) => b.ts - a.ts);
  if (sel.value !== 'tutti') list = list.filter(m => m.kidId === sel.value);
  if (prevS !== 'tutti') list = list.filter(m => prevS === 'open' ? !m.done : m.done);

  $('#memoList').innerHTML = list.map(m => {
    const k = kidById(m.kidId);
    return `<li class="memo-row ${m.done ? 'done' : ''}">
      <div class="memo-main">
        <div class="memo-meta"><span class="memo-chip">${esc(k ? k.name : '?')}</span>${fmtRel(m.ts)}</div>
        <div class="memo-txt">${esc(m.text)}</div>
      </div>
      <button type="button" class="memo-del" data-action="memo-toggle" data-id="${m.id}">${m.done ? '↺ Riapri' : '✓ Ricevuto'}</button>
      <button type="button" class="memo-del" data-action="memo-del" data-id="${m.id}">Elimina</button>
    </li>`;
  }).join('');
  $('#memoEmpty').hidden = list.length > 0;
}

function renderMenu() {
  $('#menuTitle').textContent = 'Mese di ' + monthLabel(`${menuY}-${pad(menuM + 1)}`);
  const first = new Date(menuY, menuM, 1);
  const dim = new Date(menuY, menuM + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7;
  const todayK = dkey(new Date());
  let html = DOWS.map(d => `<div class="cal-dow">${d}</div>`).join('') + '<div class="cal-cell off" aria-hidden="true"></div>'.repeat(off);
  let opts = '';
  for (let d = 1; d <= dim; d++) {
    const date = new Date(menuY, menuM, d);
    const k = dkey(date);
    const m = state.menu[k];
    if (date.getDay() === 0 || date.getDay() === 6) {
      html += `<div class="cal-day off"><span class="cal-num">${d}</span></div>`;
    } else {
      const lbl = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
      opts += `<option value="${k}">${lbl}</option>`;
      html += `<button type="button" class="cal-day ${k === todayK ? 'today' : ''}" data-action="pick-day" data-key="${k}">
        <span class="cal-num">${d}</span>${m ? `<span class="cal-txt">${esc(m.primo)}</span>` : ''}
      </button>`;
    }
  }
  $('#menuGrid').innerHTML = html;
  const sel = $('#menuDay');
  sel.innerHTML = opts;
  if (![...sel.options].some(o => o.value === sel.value)) sel.value = opts ? $(`#menuDay option:nth-child(${Math.min(new Date().getDate(), opts.split('<option').length - 1) || 1})`)?.value : '';
  fillMenuForm();
}

function fillMenuForm() {
  const m = state.menu[$('#menuDay').value];
  $('#menuPrimo').value = m?.primo || '';
  $('#menuSecondo').value = m?.secondo || '';
  $('#menuContorno').value = m?.contorno || '';
  $('#menuMerenda').value = m?.merenda || '';
}

function renderPasti() {
  if (!$('#mealsMonth').value) $('#mealsMonth').value = ymNow();
  const ym = curYm();
  const month = state.meals[ym] || {};
  const rows = state.kids.map(k => ({ k, m: month[k.id] }));
  let ct = 0, tot = 0, paidN = 0, filled = 0;
  const body = rows.map(({ k, m }) => {
    if (!m) return `<tr><td>${esc(k.name)}</td><td class="num" colspan="4" style="color:var(--muted);font-size:.8rem">non ancora preparato</td></tr>`;
    filled++;
    const t = (m.count || 0) * (m.rate || 0);
    ct += m.count || 0; tot += t; if (m.paid) paidN++;
    return `<tr>
      <td>${esc(k.name)}</td>
      <td class="num"><input class="input" type="number" min="0" max="40" value="${m.count}" data-kid="${k.id}" data-field="count" style="width:74px;padding:.35rem .5rem;text-align:right" aria-label="Pasti di ${esc(k.name)}"></td>
      <td class="num"><input class="input" type="number" min="0" step="0.5" value="${m.rate}" data-kid="${k.id}" data-field="rate" style="width:84px;padding:.35rem .5rem;text-align:right" aria-label="Tariffa di ${esc(k.name)}"></td>
      <td class="num" data-cell="tot-${k.id}">${fmtEur(t)}</td>
      <td><button type="button" class="memo-del" data-action="paid-toggle" data-id="${k.id}" style="${m.paid ? 'color:var(--sage-ink);border-color:var(--sage)' : ''}">${m.paid ? '✓ Saldato' : 'Da saldare'}</button></td>
    </tr>`;
  }).join('');
  $('#mealsBody').innerHTML = body;
  $('#mealsFoot').innerHTML = filled
    ? `<tr><td>Totale sezione</td><td class="num">${ct}</td><td></td><td class="num">${fmtEur(tot)}</td><td style="font-size:.78rem;color:var(--muted)">${paidN}/${filled} saldati</td></tr>`
    : '';
}

function renderMsgs() {
  const list = [...state.msgs].sort((a, b) => b.ts - a.ts);
  $('#msgList').innerHTML = list.map(m => `<li class="msg-row">
    <div class="msg-body"><div class="msg-text">${esc(m.text)}</div><div class="msg-time">${fmtRel(m.ts)}</div></div>
    <button type="button" class="msg-del" data-action="msg-del" data-id="${m.id}">Elimina</button>
  </li>`).join('');
  $('#msgEmpty').hidden = list.length > 0;
}

/* ---------- render genitori ---------- */
function renderParent() {
  const k = kidById(state.parentKid);
  $('#parentSub').textContent = 'Sezione Arcobaleno';
  $('#parentHero').innerHTML = `
    <span class="avatar lg ${AVS[k.color]}">${initials(k.name)}</span>
    <div class="hero-txt"><h2>${esc(k.name)}</h2><span class="badge ok">Sezione Arcobaleno</span></div>
    <span class="hero-code">Codice famiglia ${esc(k.code)}</span>`;

  const todos = state.memos.filter(m => m.kidId === k.id && !m.done).sort((a, b) => b.ts - a.ts);
  $('#parentTodos').innerHTML = todos.map(m => `<li class="todo-item">
    <span class="todo-dot"></span>
    <div>${esc(m.text)}<small>richiesto ${fmtRel(m.ts)}</small></div>
  </li>`).join('');
  $('#parentTodoEmpty').hidden = todos.length > 0;
  $('#parentTodoCard').hidden = false;

  const tk = dkey(new Date());
  const today = state.menu[tk];
  const wd = new Date().getDay();
  $('#parentMenuToday').innerHTML = today
    ? `<div class="menu-today"><h3>Menù di oggi</h3>
        <p class="mt"><strong>Primo</strong>${esc(today.primo)}</p>
        <p class="mt"><strong>Secondo</strong>${esc(today.secondo)}</p>
        <p class="mt"><strong>Contorno</strong>${esc(today.contorno)}</p>
        <p class="mt"><strong>Merenda</strong>${esc(today.merenda)}</p></div>`
    : `<div class="menu-today"><h3>Menù di oggi</h3><p class="mt">${wd === 0 || wd === 6 ? 'Oggi il nido è chiuso: buon weekend!' : 'Il menù di oggi non è ancora stato pubblicato.'}</p></div>`;

  const next = [];
  for (let i = 1; i <= 10 && next.length < 4; i++) {
    const dt = new Date(Date.now() + i * D);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    const m = state.menu[dkey(dt)];
    if (m) next.push(`<li class="menu-row"><strong>${dt.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>${esc(m.primo)} · ${esc(m.secondo)}</span></li>`);
  }
  $('#parentMenuNext').innerHTML = next.join('') || '<li class="hint">Prossimi menù in arrivo.</li>';

  const yms = Object.keys(state.meals).filter(y => state.meals[y][k.id]).sort();
  if (!yms.length) {
    $('#parentMeals').innerHTML = '<p class="hint">Il bollettino pasti non è ancora pronto.</p>';
  } else {
    const ym = yms[yms.length - 1], m = state.meals[ym][k.id];
    $('#parentMeals').innerHTML = `<div class="bill-card">
      <div class="bill-total"><strong>${fmtEur((m.count || 0) * (m.rate || 0))}</strong>
        <span class="badge ${m.paid ? 'ok' : 'off'}">${m.paid ? '✓ Saldato' : 'Da saldare'}</span></div>
      <p class="bill-sub">${m.count} pasti × ${fmtEur(m.rate)} — ${monthLabel(ym)}</p>
    </div>`;
  }

  const msgs = [...state.msgs].sort((a, b) => b.ts - a.ts);
  $('#parentMsgs').innerHTML = msgs.map(m => `<li class="msg-row">
    <div class="msg-body"><div class="msg-text">${esc(m.text)}</div><div class="msg-time">${fmtRel(m.ts)}</div></div>
  </li>`).join('');
  $('#parentMsgEmpty').hidden = msgs.length > 0;
}

/* ---------- drawer ---------- */
function openDrawer(kidId) {
  drawerKid = kidId;
  const k = kidById(kidId);
  $('#drawerAvatar').className = 'avatar lg ' + AVS[k.color];
  $('#drawerAvatar').textContent = initials(k.name);
  $('#drawerName').textContent = k.name;
  renderDrawer();
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  const ov = $('#overlay'); ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('show'));
}
function closeDrawer() {
  drawerKid = null;
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  const ov = $('#overlay'); ov.classList.remove('show');
  setTimeout(() => { ov.hidden = true; }, 250);
}
function renderDrawer() {
  if (!drawerKid) return;
  const k = kidById(drawerKid);
  const open = openMemosOf(k.id).length;
  $('#drawerMeta').textContent = `Codice ${k.code} · ${open} memo apert${open === 1 ? 'o' : 'i'}`;
  $('#quickMemo').innerHTML = QUICKS.map(q => {
    const n = state.memos.filter(m => m.kidId === k.id && !m.done && m.text === q.text).length;
    return `<button type="button" class="quick-btn" data-action="quick-memo" data-text="${esc(q.text)}">
      <span aria-hidden="true">${q.icon}</span>${q.label}
      ${n ? `<small class="lv-low">${n} in attesa</small>` : '<small></small>'}
    </button>`;
  }).join('');
  const list = state.memos.filter(m => m.kidId === k.id).sort((a, b) => b.ts - a.ts);
  $('#drawerMemoList').innerHTML = list.map(m => `<li class="memo-row ${m.done ? 'done' : ''}">
    <div class="memo-main">
      <div class="memo-meta">${fmtRel(m.ts)}</div>
      <div class="memo-txt">${esc(m.text)}</div>
    </div>
    <button type="button" class="memo-del" data-action="memo-toggle" data-id="${m.id}">${m.done ? '↺' : '✓'}</button>
    <button type="button" class="memo-del" data-action="memo-del" data-id="${m.id}">✕</button>
  </li>`).join('') || '<p class="hint">Nessun memo per questo bambino.</p>';
}

/* ---------- azioni memo ---------- */
function addMemo(kidId, text) {
  state.memos.unshift({ id: uid(), kidId, text: text.trim(), ts: Date.now(), done: false });
  save();
}

/* ---------- login ---------- */
let loginRole = 'admin';
function setRoleTab(role) {
  loginRole = role;
  $$('#loginForm [data-action="role-tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  $('#fCode').hidden = role !== 'parent';
  const admin = role === 'admin';
  $('#fUser').hidden = !admin; $('#fPass').hidden = !admin;
  $('#loginError').hidden = true;
}
function loginError(msg) {
  const el = $('#loginError');
  el.textContent = msg;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
}

/* ---------- export CSV ---------- */
function exportMeals() {
  const ym = curYm();
  const month = state.meals[ym] || {};
  const rows = [['Bambino', 'Pasti', 'Tariffa (€)', 'Totale (€)', 'Stato']];
  state.kids.forEach(k => {
    const m = month[k.id]; if (!m) return;
    rows.push([k.name, m.count, String(m.rate).replace('.', ','), String((m.count * m.rate).toFixed(2)).replace('.', ','), m.paid ? 'Saldato' : 'Da saldare']);
  });
  if (rows.length === 1) { toast('Nessun bollettino da esportare per questo mese.'); return; }
  const csv = '\ufeff' + rows.map(r => r.join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `bollettino-pasti-${ym}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Bollettino CSV scaricato.');
}

/* ---------- eventi ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const act = t.dataset.action;

  if (act === 'role-tab') { setRoleTab(t.dataset.role); return; }

  if (act === 'logout') {
    state.role = null; state.parentKid = null; save();
    $('#loginForm').reset(); setRoleTab('admin'); closeDrawer();
    show('viewLogin'); toast('Sessione chiusa.'); return;
  }

  if (act === 'tab') {
    $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b === t)));
    ['Kids', 'Memo', 'Menu', 'Pasti', 'Avvisi'].forEach(n => { $('#pane' + n).hidden = t.dataset.tab !== n.toLowerCase(); });
    return;
  }

  if (act === 'toggle-add-kid') {
    const f = $('#addKidForm');
    f.hidden = !f.hidden;
    if (!f.hidden) $('#addKidName').focus();
    return;
  }

  if (act === 'open-kid') { openDrawer(t.dataset.id); return; }
  if (act === 'close-drawer') { closeDrawer(); return; }

  if (act === 'quick-memo') {
    addMemo(drawerKid, t.dataset.text);
    toast('Memo inviato alla famiglia ✓'); renderDrawer(); renderAdmin(); return;
  }
  if (act === 'memo-toggle') {
    const m = state.memos.find(x => x.id === t.dataset.id);
    if (m) { m.done = !m.done; save(); toast(m.done ? 'Memo segnato come ricevuto' : 'Memo rimesso in attesa'); }
    if (drawerKid) renderDrawer();
    renderAdmin(); return;
  }
  if (act === 'memo-del') {
    if (!confirm('Eliminare questo memo?')) return;
    state.memos = state.memos.filter(x => x.id !== t.dataset.id);
    save(); if (drawerKid) renderDrawer(); renderAdmin(); return;
  }
  if (act === 'msg-del') {
    if (!confirm('Eliminare questo avviso?')) return;
    state.msgs = state.msgs.filter(x => x.id !== t.dataset.id);
    save(); renderMsgs(); renderParentIfVisible(); return;
  }

  if (act === 'pick-day') {
    $('#menuDay').value = t.dataset.key;
    fillMenuForm();
    $('#menuForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if (act === 'menu-prev') { menuM = menuM === 0 ? 11 : menuM - 1; if (menuM === 11) menuY--; renderMenu(); return; }
  if (act === 'menu-next') { menuM = menuM === 11 ? 0 : menuM + 1; if (menuM === 0) menuY++; renderMenu(); return; }
  if (act === 'menu-copy') {
    const target = new Date($('#menuDay').value + 'T12:00:00');
    for (let i = 1; i <= 7; i++) {
      const d = new Date(target.getTime() - i * D);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const m = state.menu[dkey(d)];
      if (m) {
        $('#menuPrimo').value = m.primo; $('#menuSecondo').value = m.secondo;
        $('#menuContorno').value = m.contorno; $('#menuMerenda').value = m.merenda;
        toast('Copiato dal ' + d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) + ' — ora salva.');
        return;
      }
    }
    toast('Nessun menù nei giorni precedenti.'); return;
  }

  if (act === 'gen-meals') {
    const ym = curYm();
    state.meals[ym] = state.meals[ym] || {};
    state.kids.forEach(k => { if (!state.meals[ym][k.id]) state.meals[ym][k.id] = { count: 0, rate: 6, paid: false }; });
    save(); renderPasti(); toast('Bollettino pronto: compila pasti e tariffe.'); return;
  }
  if (act === 'export-meals') { exportMeals(); return; }
  if (act === 'paid-toggle') {
    const m = state.meals[curYm()]?.[t.dataset.id];
    if (m) { m.paid = !m.paid; save(); renderPasti(); }
    return;
  }
});

function renderParentIfVisible() { if (!$('#viewParent').hidden) renderParent(); }

/* input numerici bollettino: aggiornamento mirato senza perdere il focus */
$('#mealsBody').addEventListener('input', e => {
  const inp = e.target.closest('input[data-kid]');
  if (!inp) return;
  const m = (state.meals[curYm()] || {})[inp.dataset.kid];
  if (!m) return;
  m[inp.dataset.field] = parseFloat(inp.value) || 0;
  save();
  const cell = inp.closest('tr').querySelector('[data-cell^="tot-"]');
  if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
  let ct = 0, tot = 0, paidN = 0, n = 0;
  Object.values(state.meals[curYm()] || {}).forEach(x => { n++; ct += x.count || 0; tot += (x.count || 0) * (x.rate || 0); if (x.paid) paidN++; });
  $('#mealsFoot').innerHTML = `<tr><td>Totale sezione</td><td class="num">${ct}</td><td></td><td class="num">${fmtEur(tot)}</td><td style="font-size:.78rem;color:var(--muted)">${paidN}/${n} saldati</td></tr>`;
});

/* form: login */
$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  if (loginRole === 'admin') {
    if ($('#loginUser').value.trim() === ADMIN_USER && $('#loginPass').value === ADMIN_PASS) {
      state.role = 'admin'; save(); showAdmin();
    } else loginError('Credenziali non valide. Riprova.');
  } else {
    const code = $('#loginCode').value.trim().toUpperCase();
    const k = state.kids.find(x => x.code.toUpperCase() === code);
    if (k) { state.role = 'parent'; state.parentKid = k.id; save(); showParent(); }
    else loginError('Codice bambino non riconosciuto.');
  }
});

/* form: aggiungi bambino */
$('#addKidForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#addKidName').value.trim();
  const code = $('#addKidCode').value.trim().toUpperCase();
  const err = $('#addKidErr');
  if (name.length < 3 || !name.includes(' ')) { err.textContent = 'Inserisci nome e cognome.'; err.hidden = false; return; }
  if (!/^[A-Z]\d{3}$/.test(code)) { err.textContent = 'Codice non valido: formato atteso es. B007.'; err.hidden = false; return; }
  if (state.kids.some(k => k.code === code)) { err.textContent = 'Questo codice famiglia esiste già.'; err.hidden = false; return; }
  err.hidden = true;
  state.kids.push({ id: uid(), name, code, color: state.kids.length % AVS.length });
  save(); e.target.reset(); e.target.hidden = true;
  renderKids(); renderMemos(); toast(name + ' aggiunto alla sezione ✓');
});

/* form: menù del giorno */
$('#menuForm').addEventListener('submit', e => {
  e.preventDefault();
  const k = $('#menuDay').value;
  if (!k) { toast('Prima scegli un giorno dal calendario.'); return; }
  const vals = ['Primo', 'Secondo', 'Contorno', 'Merenda'].map(f => $('#menu' + f).value.trim());
  if (vals.every(v => !v)) { delete state.menu[k]; save(); renderMenu(); toast('Menù del giorno rimosso.'); return; }
  state.menu[k] = { primo: vals[0], secondo: vals[1], contorno: vals[2], merenda: vals[3] };
  save(); renderMenu(); toast('Menù del giorno salvato ✓');
});

/* form: avviso a tutte le famiglie */
$('#avvisoForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('#avvisoText').value.trim();
  if (text.length < 5) { toast("L'avviso è troppo corto."); return; }
  state.msgs.unshift({ id: uid(), text, ts: Date.now() });
  save(); e.target.reset(); renderMsgs(); renderParentIfVisible();
  toast('Avviso inviato a tutte le famiglie ✓');
});

/* form: memo libero dal drawer */
$('#drawerNoteForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#drawerNote').value.trim();
  if (v.length < 3) { toast('Scrivi il memo prima di inviarlo.'); return; }
  addMemo(drawerKid, v);
  $('#drawerNote').value = '';
  toast('Memo inviato alla famiglia ✓'); renderDrawer(); renderAdmin();
});

/* filtri vivaci */
$('#kidSearch').addEventListener('input', renderKids);
$('#memoKid').addEventListener('change', renderMemos);
$('#memoState').addEventListener('change', renderMemos);
$('#mealsMonth').addEventListener('change', renderPasti);
$('#menuDay').addEventListener('change', fillMenuForm);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerKid) closeDrawer(); });

/* ---------- init ---------- */
state = load();
const today = new Date();
menuY = today.getFullYear(); menuM = today.getMonth();
$('#mealsMonth').value = ymNow();
setRoleTab('admin');
if (state.role === 'admin') showAdmin();
else if (state.role === 'parent' && kidById(state.parentKid)) showParent();
else show('viewLogin');
