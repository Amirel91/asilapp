'use strict';
/* ---------- utility ---------- */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ymNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const curYm = () => $('#mealsMonth').value || ymNow();
const fmtEur = n => (n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = ts => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const fmtTime = ts => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const AVCLS = ['av-sage', 'av-sky', 'av-terra', 'av-lav', 'av-sand', 'av-mint'];
const avCls = id => AVCLS[[...(id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVCLS.length];
const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
function toast(msg) {
  const w = $('#toastWrap'), t = document.createElement('div');
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
    meals: {}, msgs: [{ id: uid(), text: 'Benvenute su Asilapp! Qui troverete memo, menù e avvisi del nido.', ts: Date.now() - 36e5, reads: {} }],
    role: null, parentKid: null
  };
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1 && Array.isArray(d.kids)) {
      if (!Array.isArray(d.quickTypes) || !d.quickTypes.length) d.quickTypes = DEFAULT_QUICK();
      return d;
    }
  } catch (e) {}
  return seed();
}
let state, menuY, menuM, menuSel = '', drawerKid = null, loginRole = 'admin', quickEdit = '';
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const parentKid = () => state.kids.find(k => k.id === state.parentKid);

/* ---------- viste ---------- */
function show(id) { $$('.view').forEach(v => v.hidden = v.id !== id); }
function switchTab(name) {
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  $$('.tabpane').forEach(p => p.hidden = p.id !== 'pane' + name[0].toUpperCase() + name.slice(1));
}
function showAdmin() {
  state.role = 'admin'; save();
  $('#adminToday').textContent = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  show('viewAdmin'); switchTab('kids');
  renderKids(); fillMemoKid(); renderMemos(); renderMenu(); renderPasti(); renderMsgs();
}
function showParent() {
  show('viewParent');
  const k = parentKid(); if (!k) { logout(); return; }
  $('#parentSub').textContent = k.name;
  $('#parentHero').innerHTML =
    `<span class="avatar lg ${avCls(k.id)}">${initials(k.name)}</span>
     <div class="hero-txt"><h2>Ciao, ${esc(k.name.split(' ')[0])}!</h2><span class="badge ok">Sezione Arcobaleno</span></div>
     <span class="hero-code">Codice famiglia: <strong>${esc(k.code)}</strong></span>`;
  renderTodos(); renderParentMenu(); renderParentMeals(); renderParentMsgs();
}
function logout() { state.role = null; state.parentKid = null; save(); drawerKid = null; closeDrawer(); show('viewLogin'); }

/* ---------- bambini ---------- */
function renderKids() {
  const q = ($('#kidSearch').value || '').toLowerCase();
  const list = state.kids.filter(k => k.name.toLowerCase().includes(q) || k.code.toLowerCase().includes(q));
  $('#kidsEmpty').hidden = list.length > 0;
  $('#kidGrid').innerHTML = list.map(k => {
    const open = state.memos.filter(m => m.kid === k.id && !m.done).length;
    return `<button type="button" class="kid-card" data-action="open-kid" data-id="${k.id}">
      <span class="avatar ${avCls(k.id)}">${initials(k.name)}</span>
      <span class="kid-name">${esc(k.name)}</span>
      <span class="kid-meta">Codice ${esc(k.code)}</span>
      ${open ? `<span class="badge-low">${open} memo in attesa</span>` : ''}
    </button>`;
  }).join('');
}

/* ---------- drawer bambino ---------- */
function openDrawer(id) {
  drawerKid = state.kids.find(k => k.id === id); if (!drawerKid) return;
  quickEdit = '';
  const mg = $('#quickMgr'); if (mg) mg.hidden = true;
  $('#drawerAvatar').className = 'avatar lg ' + avCls(drawerKid.id);
  $('#drawerAvatar').textContent = initials(drawerKid.name);
  $('#drawerName').textContent = drawerKid.name;
  $('#drawerMeta').textContent = 'Codice famiglia ' + drawerKid.code;
  renderQuick(); renderDrawerMemos();
  $('#overlay').hidden = false; requestAnimationFrame(() => {
    $('#overlay').classList.add('show'); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false');
  });
}
function closeDrawer() {
  const o = $('#overlay'), d = $('#drawer');
  o.classList.remove('show'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
  setTimeout(() => { o.hidden = true; }, 200);
}

/* ---------- memo rapidi personalizzabili ---------- */
function renderQuick() {
  const box = $('#quickMemo'); if (!box) return;
  box.innerHTML = state.quickTypes.map(q =>
    `<button type="button" class="quick-btn" data-action="quick-memo" data-id="${q.id}"><span aria-hidden="true">${esc(q.ico)}</span><small>${esc(q.txt)}</small></button>`
  ).join('') +
  `<button type="button" class="quick-btn" data-action="quick-mgr" style="border-style:dashed;background:var(--bg)"><span aria-hidden="true">⚙️</span><small>Personalizza</small></button>`;
}
function ensureQuickMgr() {
  let m = $('#quickMgr');
  if (!m) {
    m = document.createElement('div');
    m.id = 'quickMgr'; m.hidden = true;
    m.style.cssText = 'display:grid;gap:.55rem;background:var(--bg);border:1px dashed var(--line);border-radius:14px;padding:.7rem';
    const after = $('#quickMemo');
    (after ? after.parentNode : $('#drawer') || document.body).insertBefore(m, after ? after.nextSibling : null);
  }
  return m;
}
function toggleQuickMgr() {
  const m = ensureQuickMgr();
  m.hidden = !m.hidden;
  if (!m.hidden) renderQuickMgr();
}
function renderQuickMgr() {
  const m = $('#quickMgr'); if (!m) return;
  const ed = state.quickTypes.find(q => q.id === quickEdit);
  m.innerHTML = `
    <p class="drawer-sec" style="margin:0">${ed ? 'Modifica memo rapido' : 'Nuovo memo rapido'}</p>
    <form data-form="quick-add" class="add-form" style="box-shadow:none;padding:.5rem .5rem .2rem">
      <label class="field" style="margin:0;flex:0 0 76px"><span>Emoji</span>
        <input type="text" class="input" data-el="qIco" maxlength="4" placeholder="🍼" value="${ed ? esc(ed.ico) : ''}" style="text-align:center" autocomplete="off">
      </label>
      <label class="field" style="margin:0;flex:1 1 140px"><span>Testo del memo</span>
        <input type="text" class="input" data-el="qTxt" maxlength="40" placeholder="es. Salviette" value="${ed ? esc(ed.txt) : ''}" autocomplete="off">
      </label>
      <span style="display:flex;gap:.4rem;padding-top:1.15rem">
        <button type="submit" class="btn btn-primary btn-sm">${ed ? 'Aggiorna' : 'Aggiungi'}</button>
        ${ed ? '<button type="button" class="btn btn-ghost btn-sm" data-action="quick-cancel">Annulla</button>' : ''}
      </span>
    </form>
    <div style="display:grid;gap:.35rem">
      ${state.quickTypes.map(q => `
        <span style="display:flex;align-items:center;gap:.5rem;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.4rem .6rem;font-size:.85rem">
          <strong aria-hidden="true">${esc(q.ico)}</strong>
          <span style="flex:1;min-width:0">${esc(q.txt)}</span>
          <button type="button" class="memo-del" data-action="quick-edit" data-id="${q.id}">Modifica</button>
          <button type="button" class="memo-del" data-action="quick-del" data-id="${q.id}">Elimina</button>
        </span>`).join('')}
    </div>
    <p class="hint" style="margin:0">Qui crei i tuoi memo rapidi con emoji: compariranno come pulsanti qui sopra, pronti per ogni bambino.</p>`;
  const i = m.querySelector('[data-el="qTxt"]'); if (i) i.focus();
}
function onQuickAdd(form) {
  const ico = (form.querySelector('[data-el="qIco"]') || {}).value || '';
  const raw = (form.querySelector('[data-el="qTxt"]') || {}).value || '';
  const txt = raw.trim().replace(/\s+/g, ' ');
  if (txt.length < 3) return toast('Il testo del memo richiede almeno 3 lettere ✏️');
  const icoF = ico.trim() || '📌';
  if (state.quickTypes.some(q => q.txt.toLowerCase() === txt.toLowerCase() && q.id !== quickEdit))
    return toast('Esiste già un memo rapido con questo testo');
  if (quickEdit) {
    const q = state.quickTypes.find(x => x.id === quickEdit);
    if (q) { q.ico = icoF; q.txt = txt; }
    toast('Memo rapido aggiornato ✓'); quickEdit = '';
  } else {
    state.quickTypes.push({ id: uid(), ico: icoF, txt });
    toast('Memo rapido aggiunto ✓');
  }
  save(); renderQuick(); renderQuickMgr();
}

/* ---------- memo ---------- */
function renderDrawerMemos() {
  if (!drawerKid) return;
  const list = state.memos.filter(m => m.kid === drawerKid.id).sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  $('#drawerMemoList').innerHTML = list.map(memoRow).join('');
}
function memoRow(m) {
  const k = state.kids.find(x => x.id === m.kid);
  return `<li class="memo-row ${m.done ? 'done' : ''}">
    <div class="memo-main">
      <p class="memo-meta"><span class="memo-chip">${k ? esc(k.name.split(' ')[0]) : '—'}</span>${fmtDate(m.ts)}${m.done && m.doneTs ? ' · consegnato ' + fmtDate(m.doneTs) : ''}</p>
      <p class="memo-txt">${m.ico ? esc(m.ico) + ' ' : ''}${esc(m.text)}</p>
    </div>
    <div style="display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;justify-content:flex-end">
      <button type="button" class="badge ${m.done ? 'ok' : 'off'}" data-action="memo-done" data-id="${m.id}">${m.done ? 'Ricevuto ✓' : 'Segna ricevuto'}</button>
      <button type="button" class="memo-del" data-action="memo-del" data-id="${m.id}">Elimina</button>
    </div>
  </li>`;
}
function addMemo(kid, text, ico) {
  state.memos.unshift({ id: uid(), kid, text, ts: Date.now(), done: false, ico: ico || '' });
  save(); updateMemoBadge();
}
function updateMemoBadge() {
  const n = state.memos.filter(m => !m.done).length, el = $('#memoTabCount');
  if (el) { el.hidden = n === 0; el.textContent = n; }
}

/* ---------- memo (tab maestre) ---------- */
function fillMemoKid() {
  const sel = $('#memoKid'), cur = sel.value;
  sel.innerHTML = '<option value="tutti">Tutti i bambini</option>' + state.kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  if (cur) sel.value = cur;
}
function renderMemos() {
  const kf = $('#memoKid').value || 'tutti', sf = $('#memoState').value || 'tutti';
  let list = state.memos.slice();
  if (kf !== 'tutti') list = list.filter(m => m.kid === kf);
  if (sf !== 'tutti') list = list.filter(m => sf === 'done' ? m.done : !m.done);
  list.sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  $('#memoEmpty').hidden = list.length > 0;
  $('#memoList').innerHTML = list.map(memoRow).join('');
  updateMemoBadge();
}

/* ---------- menù ---------- */
function menuFormFill() {
  const m = state.menu[menuSel] || {};
  $('#menuDay').value = menuSel;
  $('#menuPrimo').value = m.primo || ''; $('#menuSecondo').value = m.secondo || '';
  $('#menuContorno').value = m.contorno || ''; $('#menuMerenda').value = m.merenda || '';
}
function renderMenu() {
  $('#menuTitle').textContent = 'Menù di ' + MONTHS[menuM] + ' ' + menuY;
  const first = new Date(menuY, menuM, 1), lead = (first.getDay() + 6) % 7, days = new Date(menuY, menuM + 1, 0).getDate();
  const ymS = `${menuY}-${String(menuM + 1).padStart(2, '0')}`;
  if (!menuSel || menuSel.slice(0, 7) !== ymS) {
    const t = iso(new Date());
    menuSel = (t.slice(0, 7) === ymS) ? t : ymS + '-01';
  }
  const sel = $('#menuDay'); sel.innerHTML = '';
  for (let d = 1; d <= days; d++) {
    const dt = new Date(menuY, menuM, d), key = iso(dt), wd = (dt.getDay() + 6) % 7;
    const o = document.createElement('option'); o.value = key;
    o.textContent = DOW[wd] + ' ' + d + (state.menu[key] ? ' · ✓' : '');
    sel.appendChild(o);
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
  $('#menuGrid').innerHTML = html;
  menuFormFill();
}

/* ---------- pasti ---------- */
function renderPasti() {
  const ymK = curYm(), month = state.meals[ymK] = state.meals[ymK] || {};
  state.kids.forEach(k => { if (!month[k.id]) month[k.id] = { count: 0, rate: 4, paid: false }; });
  $('#mealsBody').innerHTML = state.kids.map(k => {
    const m = month[k.id];
    return `<tr>
      <td><strong>${esc(k.name)}</strong></td>
      <td class="num"><input type="number" min="0" max="60" class="input" value="${m.count || 0}" data-field="count" data-kid="${k.id}" aria-label="Pasti di ${esc(k.name)}" style="width:84px;padding:.45rem .55rem;text-align:right"></td>
      <td class="num"><input type="number" min="0" step="0.5" class="input" value="${m.rate || 0}" data-field="rate" data-kid="${k.id}" aria-label="Tariffa di ${esc(k.name)}" style="width:92px;padding:.45rem .55rem;text-align:right"></td>
      <td class="num" data-cell="tot-${k.id}">${fmtEur((m.count || 0) * (m.rate || 0))}</td>
      <td><button type="button" class="badge ${m.paid ? 'ok' : 'off'}" data-action="meal-paid" data-kid="${k.id}" data-val="${m.paid ? 0 : 1}">${m.paid ? 'Pagato ✓' : 'Da pagare'}</button></td>
    </tr>`;
  }).join('');
  renderPastiFoot(ymK);
}
function renderPastiFoot(ymK) {
  const rows = Object.values(state.meals[ymK] || {}).filter(Boolean);
  const tot = rows.reduce((a, r) => a + (r.count || 0) * (r.rate || 0), 0);
  const np = rows.reduce((a, r) => a + (r.count || 0), 0);
  $('#mealsFoot').innerHTML =
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
  $('#msgEmpty').hidden = state.msgs.length > 0;
  $('#msgList').innerHTML = state.msgs.map(g => {
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

/* ---------- vista genitori ---------- */
function renderTodos() {
  const k = parentKid(); if (!k) return;
  const list = state.memos.filter(m => m.kid === k.id).sort((a, b) => (a.done - b.done) || (b.ts - a.ts));
  $('#parentTodoEmpty').hidden = list.length > 0;
  $('#parentTodos').innerHTML = list.map(m =>
    `<li class="todo-item"><span class="todo-dot" style="${m.done ? 'background:var(--sage)' : ''}"></span>
      <span style="flex:1;${m.done ? 'text-decoration:line-through;opacity:.6' : ''}">${m.ico ? esc(m.ico) + ' ' : ''}${esc(m.text)}<small>${fmtDate(m.ts)}</small></span>
      <button type="button" class="badge ${m.done ? 'ok' : 'off'}" data-action="todo-done" data-id="${m.id}">${m.done ? 'Portato ✓' : 'Segna portato'}</button>
    </li>`).join('');
}
function renderParentMenu() {
  const t = new Date(), key = iso(t), m = state.menu[key], wd = (t.getDay() + 6) % 7;
  $('#parentMenuToday').innerHTML = m
    ? `<div class="menu-today"><h3>Menù di oggi · ${DOW[wd]} ${t.getDate()}</h3>
        <span class="mt"><strong>Primo</strong>${esc(m.primo || '—')}</span>
        <span class="mt"><strong>Secondo</strong>${esc(m.secondo || '—')}</span>
        <span class="mt"><strong>Contorno</strong>${esc(m.contorno || '—')}</span>
        <span class="mt"><strong>Merenda</strong>${esc(m.merenda || '—')}</span></div>`
    : `<div class="menu-today"><h3>Menù di oggi</h3><p class="hint">Il menù di oggi non è ancora stato pubblicato.</p></div>`;
  const next = []; const d = new Date(t);
  for (let i = 0; i < 30 && next.length < 4; i++) {
    d.setDate(d.getDate() + 1);
    const mm = state.menu[iso(d)];
    if (mm) next.push({ d: new Date(d), m: mm });
  }
  $('#parentMenuNext').innerHTML = next.map(x => {
    const prev = [x.m.primo, x.m.secondo, x.m.contorno, x.m.merenda].filter(Boolean).slice(0, 3).join(' · ');
    return `<li class="menu-row"><strong>${DOW[(x.d.getDay() + 6) % 7]} ${x.d.getDate()}</strong><span>${esc(prev)}</span></li>`;
  }).join('') || '<p class="hint">Nessun menù nei prossimi giorni.</p>';
}
function renderParentMeals() {
  const k = parentKid(); if (!k) return;
  const ymK = ymNow(), m = state.meals[ymK] && state.meals[ymK][k.id];
  $('#parentMeals').innerHTML = m
    ? `<div class="bill-card">
        <div class="bill-total"><strong>${fmtEur((m.count || 0) * (m.rate || 0))}</strong><span class="badge ${m.paid ? 'ok' : 'off'}">${m.paid ? 'Pagato ✓' : 'Da pagare'}</span></div>
        <p class="bill-sub">${m.count || 0} pasti × ${fmtEur(m.rate || 0)} · ${new Date(ymK + '-01T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p>
      </div>`
    : '<p class="hint">Il bollettino di questo mese non è ancora pronto.</p>';
}
function renderParentMsgs() {
  const k = parentKid(); if (!k) return;
  $('#parentMsgEmpty').hidden = state.msgs.length > 0;
  $('#parentMsgs').innerHTML = state.msgs.map(g => {
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
  $('#fUser').hidden = parent; $('#fPass').hidden = parent; $('#fCode').hidden = !parent;
  if (parent) { $('#loginUser').value = ''; $('#loginPass').value = ''; }
  else $('#loginCode').value = '';
  const err = $('#loginError'); if (err) err.hidden = true;
  if (!$('#viewLogin').hidden) (parent ? $('#loginCode') : $('#loginUser')).focus();
}

/* ---------- click delegation ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const act = el.dataset.action;
  if (act === 'role-tab') { setRoleTab(el.dataset.role); return; }
  if (act === 'logout') { logout(); toast('A presto! 👋'); return; }
  if (act === 'tab') { switchTab(el.dataset.tab); return; }
  if (act === 'toggle-add-kid') { const f = $('#addKidForm'); f.hidden = !f.hidden; if (!f.hidden) $('#addKidName').focus(); return; }
  if (act === 'open-kid') { openDrawer(el.dataset.id); return; }
  if (act === 'close-drawer') { closeDrawer(); return; }
  if (act === 'quick-memo') {
    if (!drawerKid) return;
    const q = state.quickTypes.find(x => x.id === el.dataset.id); if (!q) return;
    addMemo(drawerKid.id, q.txt, q.ico);
    el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 900);
    renderDrawerMemos(); renderMemos(); renderKids();
    toast('Memo inviato alla famiglia ✓'); return;
  }
  if (act === 'quick-mgr') { toggleQuickMgr(); return; }
  if (act === 'quick-edit') { quickEdit = el.dataset.id; renderQuickMgr(); return; }
  if (act === 'quick-cancel') { quickEdit = ''; renderQuickMgr(); return; }
  if (act === 'quick-del') {
    const q = state.quickTypes.find(x => x.id === el.dataset.id);
    if (q && confirmDel('il memo rapido "' + q.txt + '"')) {
      state.quickTypes = state.quickTypes.filter(x => x.id !== q.id);
      if (quickEdit === q.id) quickEdit = '';
      save(); renderQuick(); renderQuickMgr();
      toast('Memo rapido eliminato');
    }
    return;
  }
  if (act === 'memo-done') {
    const m = state.memos.find(x => x.id === el.dataset.id);
    if (m) { m.done = !m.done; m.doneTs = m.done ? Date.now() : null; save(); renderMemos(); renderDrawerMemos(); renderKids(); if (state.role === 'parent') renderTodos(); toast(m.done ? 'Segnato come ricevuto ✓' : 'Memo riaperto'); }
    return;
  }
  if (act === 'memo-del') {
    const m = state.memos.find(x => x.id === el.dataset.id);
    if (m && confirmDel('questo memo')) {
      state.memos = state.memos.filter(x => x.id !== m.id); save();
      renderMemos(); renderDrawerMemos(); renderKids(); if (state.role === 'parent') renderTodos();
      toast('Memo eliminato');
    }
    return;
  }
  if (act === 'todo-done') {
    const m = state.memos.find(x => x.id === el.dataset.id);
    if (m) { m.done = !m.done; m.doneTs = m.done ? Date.now() : null; save(); renderTodos(); toast(m.done ? 'Confermato alle maestre ✓' : 'Segnalazione annullata'); }
    return;
  }
  if (act === 'msg-del') {
    if (!confirmDel('questo avviso')) return;
    state.msgs = state.msgs.filter(x => x.id !== el.dataset.id); save(); renderMsgs(); toast('Avviso eliminato'); return;
  }
  if (act === 'msg-read') {
    const g = state.msgs.find(x => x.id === el.dataset.id), k = parentKid();
    if (g && k) { g.reads = g.reads || {}; g.reads[k.id] = g.reads[k.id] ? null : Date.now(); if (!g.reads[k.id]) delete g.reads[k.id]; save(); renderParentMsgs(); toast('Grazie, confermato alle maestre ✓'); }
    return;
  }
  if (act === 'menu-day') { menuSel = el.dataset.day; renderMenu(); return; }
  if (act === 'menu-prev') { menuM--; if (menuM < 0) { menuM = 11; menuY--; } menuSel = ''; renderMenu(); return; }
  if (act === 'menu-next') { menuM++; if (menuM > 11) { menuM = 0; menuY++; } menuSel = ''; renderMenu(); return; }
  if (act === 'menu-copy') {
    const prev = new Date(menuSel + 'T12:00'); prev.setDate(prev.getDate() - 1);
    const p = state.menu[iso(prev)];
    if (p) {
      $('#menuPrimo').value = p.primo || ''; $('#menuSecondo').value = p.secondo || '';
      $('#menuContorno').value = p.contorno || ''; $('#menuMerenda').value = p.merenda || '';
      toast('Copiato dal ' + prev.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }));
    } else toast('Nessun menù il giorno prima');
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

/* ---------- submit delegation (form dinamici) ---------- */
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  if (f.dataset.form === 'quick-add') onQuickAdd(f);
});

/* ---------- form statici ---------- */
on('#loginForm', 'submit', e => {
  e.preventDefault();
  const err = $('#loginError');
  const bad = msg => { err.textContent = msg; err.hidden = false; };
  if (loginRole === 'admin') {
    if ($('#loginUser').value.trim() !== 'admin' || $('#loginPass').value !== 'nido2024') return bad('Credenziali maestre errate: riprova.');
    showAdmin(); toast('Bentornata, maestra 👋');
  } else {
    const code = $('#loginCode').value.trim().toUpperCase();
    const kid = state.kids.find(k => k.code.toUpperCase() === code);
    if (!kid) return bad('Codice famiglia non trovato: controlla e riprova.');
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
  renderKids(); fillMemoKid(); renderPasti();
  toast(name.split(' ')[0] + ' aggiunto alla sezione ✓');
});
on('#drawerNoteForm', 'submit', e => {
  e.preventDefault();
  if (!drawerKid) return;
  const txt = $('#drawerNote').value.trim(); if (!txt) return;
  addMemo(drawerKid.id, txt, '📝'); $('#drawerNote').value = '';
  renderDrawerMemos(); renderMemos(); renderKids();
  toast('Memo inviato alla famiglia ✓');
});
on('#avvisoForm', 'submit', e => {
  e.preventDefault();
  const txt = $('#avvisoText').value.trim(); if (!txt) return;
  state.msgs.unshift({ id: uid(), text: txt, ts: Date.now(), reads: {} });
  save(); e.target.reset(); renderMsgs();
  toast('Avviso inviato a tutte le famiglie ✓');
});
on('#menuForm', 'submit', e => {
  e.preventDefault();
  const row = {
    primo: $('#menuPrimo').value.trim(),
    secondo: $('#menuSecondo').value.trim(),
    contorno: $('#menuContorno').value.trim(),
    merenda: $('#menuMerenda').value.trim()
  };
  const day = $('#menuDay').value || menuSel;
  if (!row.primo && !row.secondo && !row.contorno && !row.merenda) { delete state.menu[day]; toast('Menù del giorno rimosso'); }
  else state.menu[day] = row;
  save(); menuSel = day; renderMenu();
  toast('Menù del ' + new Date(day + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' salvato ✓');
});
on('#menuDay', 'change', () => { menuSel = $('#menuDay').value; renderMenu(); });
on('#kidSearch', 'input', renderKids);
on('#memoKid', 'change', renderMemos);
on('#memoState', 'change', renderMemos);
on('#mealsMonth', 'change', renderPasti);

/* ---------- pasti: totali live ---------- */
document.addEventListener('input', e => {
  const el = e.target.closest('input[data-field]'); if (!el) return;
  const month = state.meals[curYm()] || {}; const m = month[el.dataset.kid]; if (!m) return;
  const v = parseFloat(el.value);
  m[el.dataset.field] = isNaN(v) ? 0 : v;
  save();
  const cell = $(`[data-cell="tot-${el.dataset.kid}"]`);
  if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
  renderPastiFoot(curYm());
});

/* ---------- boot ---------- */
(function boot() {
  state = load();
  const t = new Date(); menuY = t.getFullYear(); menuM = t.getMonth();
  $('#mealsMonth').value = ymNow();
  setRoleTab('admin');
  show('viewLogin');
  const sf = $('#quickAddForm'); if (sf) sf.hidden = true; /* eventuale markup legacy: lo gestisce il pannello dinamico */
  if (state.role === 'admin') showAdmin();
  else if (state.role === 'parent' && parentKid()) showParent();
  else { state.role = null; state.parentKid = null; save(); }
})();
