/* ============================================================
   Asilapp — logica · stato unico in localStorage (asilapp_v3)
   ============================================================ */
'use strict';
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const on = (s, ev, fn) => $(s).addEventListener(ev, fn);
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DOWS = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const QUICK = [
  { ico:'🧷', t:'Ricambio vestiti' }, { ico:'🧻', t:'Pacco pannolini' },
  { ico:'🌧️', t:'Stivali e impermeabile' }, { ico:'🧴', t:'Crema protettiva' },
  { ico:'🧸', t:'Coperta per la nanna' }, { ico:'🍎', t:'Merenda per la classe' }
];

/* ---------- stato ---------- */
let state, drawerKid = null, menuY, menuM, menuSel = '', curTab = 'kids', loginRole = 'admin';
const KEY = 'asilapp_v3';

function seed() {
  const kids = [
    { id: uid(), name:'Giulia Rossi', code:'B001' }, { id: uid(), name:'Marco Bianchi', code:'B002' },
    { id: uid(), name:'Sofia Colombo', code:'B003' }, { id: uid(), name:'Luca Ferrari', code:'B004' },
    { id: uid(), name:'Anna Verdi', code:'B005' }, { id: uid(), name:'Pietro Gatti', code:'B006' }
  ];
  const t = Date.now(), D = 864e5;
  const memos = [
    { id: uid(), kidId: kids[0].id, text:'Ricambio vestiti', ts: t - 2*D, done:false },
    { id: uid(), kidId: kids[2].id, text:'Crema protettiva', ts: t - 1*D, done:true, doneTs: t - 6*36e5 },
    { id: uid(), kidId: kids[3].id, text:'Stivali e impermeabile', ts: t - 36e5, done:false }
  ];
  const menu = {}; const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if ([0,6].includes(d.getDay())) continue;
    menu[iso(d)] = { primo:'Pasta al pomodoro', secondo:'Polpettine', contorno:'Zucchine al vapore', merenda:'Frutta fresca' };
  }
  return { v:3, role:null, parentKid:null, kids, memos, menu, meals:{}, msgs:[
    { id: uid(), text:'Giovedì gita al parco: portare stivali e k-way.', ts: t - 3*D, reads:{} }
  ]};
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 3 && Array.isArray(s.kids)) return s; } catch (e) {}
  const fresh = seed(); localStorage.setItem(KEY, JSON.stringify(fresh)); return fresh;
}

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const ymNow = () => iso(new Date()).slice(0, 7);
const curYm = () => ($('#mealsMonth').value || ymNow());
const kidById = id => state.kids.find(k => k.id === id);
const initials = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const AV = ['av-sage','av-sky','av-terra','av-lav','av-sand','av-mint'];
const avClass = n => AV[[...n].reduce((a,c) => a + c.charCodeAt(0), 0) % AV.length];
const fmtEur = n => (n || 0).toLocaleString('it-IT', { style:'currency', currency:'EUR' });
function fmtWhen(ts) {
  const d = new Date(ts), t = new Date(), one = 864e5;
  const hm = d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
  if (iso(d) === iso(t)) return 'oggi ' + hm;
  if (iso(d) === iso(new Date(t - one))) return 'ieri ' + hm;
  return d.toLocaleDateString('it-IT', { day:'numeric', month:'short' }) + ' · ' + hm;
}
function toast(txt) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = txt;
  $('#toastWrap').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 2600);
}
function addMemo(kidId, text) { state.memos.unshift({ id: uid(), kidId, text, ts: Date.now(), done:false }); save(); }
const openMemos = kidId => state.memos.filter(m => m.kidId === kidId && !m.done);
const openTotal = () => state.memos.filter(m => !m.done).length;

/* ---------- navigazione viste ---------- */
function show(id) { ['viewLogin','viewAdmin','viewParent'].forEach(v => $('#' + v).hidden = v !== id); }
function setRoleTab(role) {
  loginRole = role;
  $$('[data-action="role-tab"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.role === role));
  $('#fCode').hidden = role !== 'parent';
  $('#loginError').hidden = true;
}
function showAdmin() { state.role = 'admin'; save(); show('viewAdmin'); renderAdmin(); }
function showParent() { show('viewParent'); renderParent(); }
function logout() { state.role = null; state.parentKid = null; save(); drawerKid = null; closeDrawer(); setRoleTab('admin'); $('#loginPass').value = ''; $('#loginCode').value = ''; show('viewLogin'); }

/* ---------- render admin ---------- */
function renderAdmin() {
  $('#adminToday').textContent = new Date().toLocaleDateString('it-IT', { weekday:'short', day:'numeric', month:'long' });
  renderKids(); fillMemoKid(); renderMemos(); renderMenu(); renderPasti(); renderMsgs();
}

function renderKids() {
  const q = ($('#kidSearch').value || '').toLowerCase();
  const list = state.kids.filter(k => k.name.toLowerCase().includes(q) || k.code.toLowerCase().includes(q));
  $('#kidGrid').innerHTML = list.map(k => {
    const open = openMemos(k.id).length;
    return `<button type="button" class="kid-card" data-action="open-kid" data-id="${k.id}">
      <span class="avatar ${avClass(k.name)}">${initials(k.name)}</span>
      <span class="kid-name">${esc(k.name)}</span>
      <span class="kid-meta">Codice ${esc(k.code)} · ${open ? open + ' memo aperti' : 'tutto in regola'}</span>
      ${open ? '<span class="badge-low">Memo in attesa</span>' : ''}
    </button>`;
  }).join('');
  $('#kidsEmpty').hidden = list.length > 0;
  const n = openTotal(), c = $('#memoTabCount');
  c.hidden = !n; c.textContent = n;
}
function fillMemoKid() {
  const sel = $('#memoKid'), cur = sel.value;
  sel.innerHTML = '<option value="tutti">Tutti i bambini</option>' + state.kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function renderMemos() {
  const kidF = $('#memoKid').value, stF = $('#memoState').value;
  const list = state.memos.filter(m => (kidF === 'tutti' || m.kidId === kidF) && (stF === 'tutti' || (stF === 'open') === !m.done));
  $('#memoList').innerHTML = list.map(m => {
    const k = kidById(m.kidId);
    return `<li class="memo-row ${m.done ? 'done' : ''}">
      <div class="memo-main">
        <p class="memo-meta"><span class="memo-chip">${k ? esc(k.name.split(' ')[0]) : '—'}</span>${fmtWhen(m.ts)}${m.done ? ' · ricevuto ✓' : ' · in attesa'}</p>
        <p class="memo-txt">${esc(m.text)}</p>
      </div>
      ${m.done
        ? `<button type="button" class="memo-del" data-action="memo-reopen" data-id="${m.id}">Riapri</button>`
        : `<button type="button" class="memo-del" data-action="memo-done" data-id="${m.id}">Chiudi ✓</button>`}
      <button type="button" class="memo-del" data-action="memo-del" data-id="${m.id}">Elimina</button>
    </li>`;
  }).join('');
  $('#memoEmpty').hidden = list.length > 0;
}

/* ---------- menù mensile ---------- */
function renderMenu() {
  $('#menuTitle').textContent = 'Menù di ' + MONTHS[menuM] + ' ' + menuY;
  const first = new Date(menuY, menuM, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(menuY, menuM + 1, 0).getDate();
  const todayIso = iso(new Date());
  if (!menuSel || menuSel.slice(0, 7) !== `${menuY}-${pad(menuM + 1)}`) menuSel = todayIso.slice(0, 8) + '01';
  let h = DOWS.map(d => `<div class="cal-dow">${d}</div>`).join('');
  h += '<div class="cal-cell off"></div>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const dt = new Date(menuY, menuM, d), key = iso(dt);
    const mm = state.menu[key];
    const we = [0, 6].includes(dt.getDay());
    h += `<button type="button" class="cal-day${we ? ' we' : ''}${mm ? ' has' : ''}${key === todayIso ? ' today' : ''}${key === menuSel ? ' sel' : ''}" data-action="menu-day" data-date="${key}" aria-label="${key}">
      <span class="cal-num">${d}${mm ? '<span class="cal-dot"></span>' : ''}</span>
      <span class="cal-txt">${mm ? esc(mm.primo || '—') : we ? 'weekend' : 'da compilare'}</span>
    </button>`;
  }
  const rest = (7 - ((lead + days) % 7)) % 7;
  h += '<div class="cal-cell off"></div>'.repeat(rest);
  $('#menuGrid').innerHTML = h;

  const sel = $('#menuDay');
  sel.innerHTML = Array.from({ length: days }, (_, i) => i + 1).map(d => {
    const dt = new Date(menuY, menuM, d);
    return `<option value="${iso(dt)}">${DOWS[(dt.getDay() + 6) % 7]} ${d} ${MONTHS[menuM].slice(0, 3)}</option>`;
  }).join('');
  if (!sel.querySelector(`option[value="${menuSel}"]`)) menuSel = iso(new Date(menuY, menuM, 1));
  sel.value = menuSel;
  const mm = state.menu[menuSel] || {};
  $('#menuPrimo').value = mm.primo || '';
  $('#menuSecondo').value = mm.secondo || '';
  $('#menuContorno').value = mm.contorno || '';
  $('#menuMerenda').value = mm.merenda || '';
}

/* ---------- bollettino pasti ---------- */
function renderPasti() {
  const ym = curYm(), month = state.meals[ym] || {};
  $('#mealsBody').innerHTML = state.kids.map(k => {
    const m = month[k.id] || null;
    return `<tr>
      <td>${esc(k.name)}</td>
      <td class="num">${m ? `<input type="number" min="0" max="31" step="1" value="${m.count ?? 0}" data-field="count" data-kid="${k.id}" aria-label="Pasti di ${esc(k.name)}" style="width:72px;text-align:right">` : '—'}</td>
      <td class="num">${m ? `<input type="number" min="0" step="0.5" value="${m.rate ?? 0}" data-field="rate" data-kid="${k.id}" aria-label="Tariffa ${esc(k.name)}" style="width:78px;text-align:right">` : '—'}</td>
      <td class="num" data-cell="tot-${k.id}">${m ? fmtEur((m.count || 0) * (m.rate || 0)) : '—'}</td>
      <td>${m ? (m.paid
        ? `<button type="button" class="memo-del" data-action="meal-paid" data-kid="${k.id}" data-val="0" style="color:var(--sage-ink);border-color:#d6e1d8;background:var(--sage-soft)">Pagato ✓</button>`
        : `<button type="button" class="memo-del" data-action="meal-paid" data-kid="${k.id}" data-val="1">Segna pagato</button>`) : '<span class="hint">non preparato</span>'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="empty">Nessun bambino in sezione.</td></tr>`;
  const rows = Object.values(month).filter(Boolean);
  const tot = rows.reduce((a, m) => a + (m.count || 0) * (m.rate || 0), 0);
  const nPasti = rows.reduce((a, m) => a + (m.count || 0), 0);
  $('#mealsFoot').innerHTML = `<tr><th scope="row">Totale sezione</th><td class="num">${nPasti}</td><td></td><td class="num"><strong>${fmtEur(tot)}</strong></td><td></td></tr>`;
}
function genMeals() {
  const ym = curYm();
  if (state.meals[ym] && Object.keys(state.meals[ym]).length) { toast('Bollettino già preparato per questo mese'); return; }
  state.meals[ym] = {};
  state.kids.forEach(k => { state.meals[ym][k.id] = { count: 0, rate: 4.5, paid: false }; });
  save(); renderPasti(); toast('Bollettino pronto: compila i pasti ✓');
}
function exportMeals() {
  const ym = curYm(), month = state.meals[ym];
  if (!month) { toast('Prepara prima il bollettino del mese'); return; }
  const [y, m] = ym.split('-');
  const rows = [['Bambino','Pasti','Tariffa (EUR)','Totale (EUR)','Stato']];
  state.kids.forEach(k => {
    const r = month[k.id]; if (!r) return;
    rows.push([k.name, r.count || 0, (r.rate || 0).toFixed(2), ((r.count || 0) * (r.rate || 0)).toFixed(2), r.paid ? 'Pagato' : 'Da pagare']);
  });
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
  a.download = `bollettino-pasti-${MONTHS[+m - 1].toLowerCase()}-${y}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV esportato ✓');
}

/* ---------- avvisi (admin) ---------- */
function renderMsgs() {
  $('#msgList').innerHTML = state.msgs.map(g => {
    const reads = state.kids.filter(k => g.reads && g.reads[k.id]).length;
    const tot = state.kids.length || 1, pct = Math.round(reads / tot * 100);
    return `<li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(g.text)}</p>
        <p class="msg-time">${fmtWhen(g.ts)} · letto da ${reads}/${state.kids.length} famiglie (${pct}%)</p>
        <progress class="read-bar" max="100" value="${pct}"></progress>
      </div>
      <button type="button" class="msg-del" data-action="msg-del" data-id="${g.id}">Elimina</button>
    </li>`;
  }).join('');
  $('#msgEmpty').hidden = state.msgs.length > 0;
}

/* ---------- drawer bambino ---------- */
function openDrawer(id) {
  drawerKid = id;
  const kid = kidById(id); if (!kid) return;
  $('#drawerAvatar').className = 'avatar lg ' + avClass(kid.name);
  $('#drawerAvatar').textContent = initials(kid.name);
  $('#drawerName').textContent = kid.name;
  const open = openMemos(id).length;
  $('#drawerMeta').textContent = `Codice ${kid.code} · ${open ? open + ' memo aperti' : 'nessun memo aperto'}`;
  renderQuick();
  renderDrawerMemos();
  $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false');
  $('#overlay').hidden = false; requestAnimationFrame(() => $('#overlay').classList.add('show'));
}
function closeDrawer() {
  drawerKid = null;
  $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true');
  $('#overlay').classList.remove('show');
  setTimeout(() => { $('#overlay').hidden = true; }, 200);
}
function renderQuick() {
  $('#quickMemo').innerHTML = QUICK.map(q => {
    const active = drawerKid && state.memos.some(m => m.kidId === drawerKid && !m.done && m.text === q.t);
    return `<button type="button" class="quick-btn${active ? ' pressed' : ''}" data-action="quick-memo" data-text="${esc(q.t)}">
      <span aria-hidden="true">${q.ico}</span><small>${esc(q.t)}</small></button>`;
  }).join('');
}
function renderDrawerMemos() {
  const list = state.memos.filter(m => m.kidId === drawerKid);
  $('#drawerMemoList').innerHTML = list.map(m => `<li class="memo-row ${m.done ? 'done' : ''}">
      <div class="memo-main">
        <p class="memo-meta">${fmtWhen(m.ts)}${m.done ? ' · ricevuto ✓' : ' · in attesa'}</p>
        <p class="memo-txt">${esc(m.text)}</p>
      </div>
      ${m.done ? `<button type="button" class="memo-del" data-action="memo-reopen" data-id="${m.id}">Riapri</button>` : ''}
      <button type="button" class="memo-del" data-action="memo-del" data-id="${m.id}">Elimina</button>
    </li>`).join('') || `<li class="empty" style="padding:.4rem 0">Nessun memo: usa i tasti rapidi qui sopra.</li>`;
}
function quickMemo(text) {
  const dup = state.memos.find(m => m.kidId === drawerKid && !m.done && m.text === text);
  if (dup) { state.memos = state.memos.filter(m => m.id !== dup.id); save(); renderQuick(); renderDrawerMemos(); renderMemos(); renderKids(); toast('Memo rimosso'); return; }
  addMemo(drawerKid, text); renderQuick(); renderDrawerMemos(); renderMemos(); renderKids(); toast('Memo inviato alla famiglia ✓');
}
function refreshAfterMemo() { if (drawerKid) { renderQuick(); renderDrawerMemos(); } renderMemos(); renderKids(); }

/* ---------- vista genitori ---------- */
const mealLine = (lbl, v) => v ? `<span class="mt"><strong>${lbl}</strong>${esc(v)}</span>` : '';
function renderParent() {
  const kid = kidById(state.parentKid);
  if (!kid) { logout(); return; }
  $('#parentSub').textContent = 'Sezione Arcobaleno · ' + kid.name.split(' ')[0];
  const open = openMemos(kid.id).length;
  $('#parentHero').innerHTML = `
    <span class="avatar lg ${avClass(kid.name)}">${initials(kid.name)}</span>
    <div class="hero-txt">
      <h2>Ciao, famiglia ${esc(kid.name.split(' ').slice(1).join(' ') || kid.name)}</h2>
      <span class="badge ${open ? 'ok' : 'off'}">${open ? open + (open === 1 ? ' cosa da portare' : ' cose da portare') : 'Tutto consegnato ✓'}</span>
    </div>
    <span class="hero-code">Codice famiglia ${esc(kid.code)}</span>`;

  /* memo da portare: il genitore conferma con il flag */
  const list = state.memos.filter(m => m.kidId === kid.id && !m.done);
  $('#parentTodos').innerHTML = list.map(m => `<li class="todo-item">
      <span class="todo-dot" aria-hidden="true"></span>
      <span style="flex:1">${esc(m.text)}<small>richiesto ${fmtWhen(m.ts)}</small></span>
      <button type="button" class="memo-del" data-action="memo-done" data-id="${m.id}" style="color:var(--sage-ink);border-color:#d6e1d8">Portato ✓</button>
    </li>`).join('');
  $('#parentTodoEmpty').hidden = list.length > 0;
  $('#parentTodoTitle').textContent = list.length ? 'Da portare in nido' : 'Tutto in regola';

  /* menù: oggi + prossimi giorni compilati */
  const today = iso(new Date());
  const mt = state.menu[today];
  $('#parentMenuToday').innerHTML = mt
    ? `<div class="menu-today"><h3>Menù di oggi · ${new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}</h3>
       ${mealLine('Primo', mt.primo)}${mealLine('Secondo', mt.secondo)}${mealLine('Contorno', mt.contorno)}${mealLine('Merenda', mt.merenda)}</div>`
    : `<div class="menu-today"><h3>Menù di oggi</h3><p class="hint">Il menù di oggi non è ancora stato pubblicato.</p></div>`;
  const next = [];
  for (let i = 1; i <= 10 && next.length < 4; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const mm = state.menu[iso(d)];
    if (mm) next.push(`<li class="menu-row"><strong>${d.toLocaleDateString('it-IT', { weekday:'short', day:'numeric', month:'short' })}</strong><span>${esc([mm.primo, mm.secondo].filter(Boolean).join(' · ') || '—')}</span></li>`);
  }
  $('#parentMenuNext').innerHTML = next.join('') || '<li class="hint">Nessun menù nei prossimi giorni.</li>';

  /* bollettino del mese corrente */
  const ym = ymNow(), r = (state.meals[ym] || {})[kid.id];
  $('#parentMeals').innerHTML = r
    ? `<div class="bill-card"><div class="bill-total"><strong>${fmtEur((r.count || 0) * (r.rate || 0))}</strong>
        <span class="badge ${r.paid ? 'ok' : 'off'}">${r.paid ? 'Pagato ✓' : 'Da pagare'}</span></div>
        <p class="bill-sub">${r.count || 0} pasti × ${fmtEur(r.rate || 0)} · ${MONTHS[+ym.split('-')[1] - 1]}</p></div>`
    : '<p class="hint">Il bollettino di questo mese non è ancora disponibile.</p>';

  /* avvisi: flag di lettura */
  $('#parentMsgs').innerHTML = state.msgs.map(g => {
    const read = g.reads && g.reads[kid.id];
    return `<li class="msg-row">
      <div class="msg-body">
        <p class="msg-text">${esc(g.text)}</p>
        <p class="msg-time">${fmtWhen(g.ts)}${read ? ' · letto ✓' : ''}</p>
      </div>
      ${read ? '' : `<button type="button" class="memo-del" data-action="msg-read" data-id="${g.id}" style="color:var(--sage-ink);border-color:#d6e1d8">Letto ✓</button>`}
    </li>`;
  }).join('');
  $('#parentMsgEmpty').hidden = state.msgs.length > 0;
}

/* ---------- eventi: azioni centralizzate ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const act = el.dataset.action;

  if (act === 'role-tab') { setRoleTab(el.dataset.role); return; }
  if (act === 'logout') { logout(); return; }

  if (act === 'tab') {
    curTab = el.dataset.tab;
    $$('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === curTab));
    $$('.tabpane').forEach(p => p.hidden = p.id !== 'pane' + curTab[0].toUpperCase() + curTab.slice(1));
    return;
  }
  if (act === 'toggle-add-kid') { const f = $('#addKidForm'); f.hidden = !f.hidden; if (!f.hidden) $('#addKidName').focus(); return; }
  if (act === 'open-kid') { openDrawer(el.dataset.id); return; }
  if (act === 'close-drawer') { closeDrawer(); return; }

  if (act === 'quick-memo') { quickMemo(el.dataset.text); return; }
  if (act === 'memo-del') {
    if (!confirm('Eliminare questo memo?')) return;
    state.memos = state.memos.filter(m => m.id !== el.dataset.id);
    save(); refreshAfterMemo(); toast('Memo eliminato');
    return;
  }
  if (act === 'memo-done') {
    const m = state.memos.find(x => x.id === el.dataset.id);
    if (!m) return;
    m.done = true; m.doneTs = Date.now(); save();
    if (state.role === 'parent') { renderParent(); toast('Grazie! Conferma inviata alle maestre ✓'); }
    else { refreshAfterMemo(); toast('Memo chiuso ✓'); }
    return;
  }
  if (act === 'memo-reopen') {
    const m = state.memos.find(x => x.id === el.dataset.id);
    if (m) { m.done = false; delete m.doneTs; save(); refreshAfterMemo(); toast('Memo riaperto'); }
    return;
  }
  if (act === 'msg-del') {
    if (!confirm('Eliminare questo avviso?')) return;
    state.msgs = state.msgs.filter(g => g.id !== el.dataset.id);
    save(); renderMsgs(); if (state.role === 'parent') renderParent(); toast('Avviso eliminato');
    return;
  }
  if (act === 'msg-read') {
    const g = state.msgs.find(x => x.id === el.dataset.id);
    if (g) { g.reads = g.reads || {}; g.reads[state.parentKid] = true; save(); renderParent(); }
    return;
  }
  if (act === 'menu-day') { menuSel = el.dataset.date; renderMenu(); return; }
  if (act === 'menu-prev') { menuM--; if (menuM < 0) { menuM = 11; menuY--; } menuSel = ''; renderMenu(); return; }
  if (act === 'menu-next') { menuM++; if (menuM > 11) { menuM = 0; menuY++; } menuSel = ''; renderMenu(); return; }
  if (act === 'menu-copy') {
    const prev = new Date(menuSel + 'T12:00'); prev.setDate(prev.getDate() - 1);
    const p = state.menu[iso(prev)];
    if (p) { ['primo','secondo','contorno','merenda'].forEach(f => $('#menu' + f[0].toUpperCase() + f.slice(1)).value = p[f] || ''); toast('Copiato dal ' + prev.toLocaleDateString('it-IT', { day:'numeric', month:'short' })); }
    else toast('Nessun menù il giorno prima');
    return;
  }
  if (act === 'gen-meals') { genMeals(); return; }
  if (act === 'export-meals') { exportMeals(); return; }
  if (act === 'meal-paid') {
    const m = state.meals[curYm()] && state.meals[curYm()][el.dataset.kid];
    if (m) { m.paid = el.dataset.val === '1'; save(); renderPasti(); }
    return;
  }
});

/* ---------- form ---------- */
on('#loginForm', 'submit', e => {
  e.preventDefault();
  const err = $('#loginError');
  if (loginRole === 'admin') {
    if ($('#loginUser').value.trim() !== 'admin' || $('#loginPass').value !== 'nido2024') {
      err.textContent = 'Credenziali maestre errate: riprova.'; err.hidden = false; return;
    }
    showAdmin(); toast('Bentornata, maestra 👋');
  } else {
    const code = $('#loginCode').value.trim().toUpperCase();
    const kid = state.kids.find(k => k.code.toUpperCase() === code);
    if (!kid) { err.textContent = 'Codice famiglia non trovato: controlla e riprova.'; err.hidden = false; return; }
    state.role = 'parent'; state.parentKid = kid.id; save();
    showParent(); toast('Bentornati, famiglia ' + kid.name.split(' ')[0] + ' 👋');
  }
});

on('#addKidForm', 'submit', e => {
  e.preventDefault();
  const name = $('#addKidName').value.trim(), code = $('#addKidCode').value.trim().toUpperCase();
  const err = $('#addKidErr');
  const bad = msg => { err.textContent = msg; err.hidden = false; };
  if (name.length < 3) return bad('Serve nome e cognome (min. 3 lettere).');
  if (!/^[A-Z]\d{3}$/.test(code)) return bad('Codice famiglia nel formato B007.');
  if (state.kids.some(k => k.code === code)) return bad('Codice già usato da un altro bambino.');
  err.hidden = true;
  state.kids.push({ id: uid(), name, code });
  save(); e.target.reset(); $('#addKidForm').hidden = true;
  renderKids(); fillMemoKid(); renderPasti(); toast(name.split(' ')[0] + ' aggiunto alla sezione ✓');
});

on('#menuForm', 'submit', e => {
  e.preventDefault();
  const v = {
    primo: $('#menuPrimo').value.trim(), secondo: $('#menuSecondo').value.trim(),
    contorno: $('#menuContorno').value.trim(), merenda: $('#menuMerenda').value.trim()
  };
  if (!Object.values(v).some(Boolean)) { toast('Compila almeno una portata'); return; }
  if (Object.values(v).every(Boolean)) state.menu[menuSel] = v;
  else state.menu[menuSel] = Object.assign({}, state.menu[menuSel], v);
  save(); renderMenu(); toast('Menù del ' + menuSel.split('-').reverse().join('/') + ' pubblicato ✓');
});

on('#avvisoForm', 'submit', e => {
  e.preventDefault();
  const txt = $('#avvisoText').value.trim();
  if (txt.length < 8) { toast('Avviso troppo corto: scrivi qualche parola in più.'); return; }
  state.msgs.unshift({ id: uid(), text: txt, ts: Date.now(), reads: {} });
  save(); e.target.reset(); renderMsgs();
  toast('Avviso inviato a tutte le famiglie ✓');
});

/* memo libero dal drawer */
on('#drawerNoteForm', 'submit', e => {
  e.preventDefault();
  const v = $('#drawerNote').value.trim();
  if (!drawerKid || !v) return;
  addMemo(drawerKid, v);
  $('#drawerNote').value = '';
  toast('Memo inviato alla famiglia ✓');
  refreshAfterMemo();
});

/* filtri e ricerche live */
on('#kidSearch', 'input', renderKids);
on('#memoKid', 'change', renderMemos);
on('#memoState', 'change', renderMemos);
on('#menuDay', 'change', renderMenu);
on('#mealsMonth', 'change', renderPasti);

/* pasti e tariffa: totale di riga ricalcolato live */
on('#mealsBody', 'input', e => {
  const inp = e.target;
  if (inp.dataset.field !== 'count' && inp.dataset.field !== 'rate') return;
  const month = state.meals[curYm()];
  const m = month ? month[inp.dataset.kid] : null;
  if (!m) return;
  const v = parseFloat(inp.value);
  m[inp.dataset.field] = Number.isFinite(v) && v >= 0 ? v : 0;
  save();
  const cell = $(`[data-cell="tot-${inp.dataset.kid}"]`);
  if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
});

/* Esc chiude il pannello bambino */
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerKid) closeDrawer(); });

/* ---------- boot ---------- */
state = load();
const today = new Date();
menuY = today.getFullYear(); menuM = today.getMonth();
$('#mealsMonth').value = ymNow();
setRoleTab('admin');
if (state.role === 'admin') showAdmin();
else if (state.role === 'parent' && state.parentKid) showParent();
else show('viewLogin');
