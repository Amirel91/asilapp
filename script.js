/* Asilapp — diario digitale asilo nido.
   Stato unico in localStorage, render() ridisegna dallo stato,
   azioni via data-action gestite con una mappa (un'azione rotta non blocca le altre). */
'use strict';

/* ---------- costanti ---------- */
const STORE_KEY = 'asilapp-v2';
const SUPPLIES = [
  ['pannolini', 'Pannolini'],
  ['salviette', 'Salviette'],
  ['crema', 'Crema protettiva'],
  ['latte', 'Latte'],
  ['bavaglini', 'Bavaglini']
];
const QUICK_DIARIO = [
  ['presenza', 'Presenza'],
  ['merenda', 'Merenda'],
  ['riposino', 'Riposino'],
  ['cambio', 'Cambio']
];
const TYPE_LABEL = {
  presenza: 'Presenza', merenda: 'Merenda', riposino: 'Riposino', cambio: 'Cambio',
  nota: 'Nota', scorte: 'Scorte', pannolini: 'Pannolini', salviette: 'Salviette',
  crema: 'Crema', latte: 'Latte', bavaglini: 'Bavaglini'
};
const LEVEL_TXT = { ok: 'Disponibile', low: 'In esaurimento', out: 'Esaurita' };
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'nido2024';
const AVATAR_BG = ['sage', 'sky', 'terra', 'lilac', 'sand', 'mint'];

const $ = s => document.querySelector(s);

/* ---------- seme demo + persistenza ---------- */
function seed() {
  const t = Date.now(), m = 60000;
  const kids = [
    { id: 1, name: 'Sofia Bianchi', code: 'B001', present: true,  supplies: { pannolini: 55, salviette: 70, crema: 80, latte: 60, bavaglini: 65 } },
    { id: 2, name: 'Leonardo Conti', code: 'B002', present: true,  supplies: { pannolini: 30, salviette: 45, crema: 20, latte: 75, bavaglini: 50 } },
    { id: 3, name: 'Alice Ferrari', code: 'B003', present: false, supplies: { pannolini: 75, salviette: 60, crema: 90, latte: 40, bavaglini: 80 } },
    { id: 4, name: 'Tommaso Ricci', code: 'B004', present: true,  supplies: { pannolini: 12, salviette: 25, crema: 50, latte: 15, bavaglini: 8 } },
    { id: 5, name: 'Marta Gallo', code: 'B005', present: true,  supplies: { pannolini: 60, salviette: 80, crema: 65, latte: 70, bavaglini: 45 } },
    { id: 6, name: 'Andrea Fontana', code: 'B006', present: false, supplies: { pannolini: 40, salviette: 10, crema: 35, latte: 55, bavaglini: 30 } }
  ];
  const e = (kidId, type, text, min) => ({ id: t + min * 7 + kidId, kidId, type, text, ts: t - min * m });
  const diary = [
    e(1, 'presenza', 'Entrata registrata al nido', 240),
    e(1, 'merenda', 'Merenda consumata con gusto', 120),
    e(2, 'presenza', 'Entrata registrata al nido', 235),
    e(2, 'riposino', 'Riposino di un\'ora nella nanna room', 90),
    e(4, 'presenza', 'Entrata registrata al nido', 230),
    e(4, 'cambio', 'Cambio effettuato', 75),
    e(5, 'presenza', 'Entrata registrata al nido', 228),
    e(5, 'nota', 'Porta il ciuccio nuovo, per favore', 30),
    e(4, 'scorte', 'Richiesta alle famiglie: servono bavaglini', 20),
    e(6, 'presenza', 'Uscita: andata a casa con la famiglia', 400)
  ].sort((a, b) => b.ts - a.ts);
  const messages = [
    { id: t - 1500 * m, text: 'Benvenute famiglie: da oggi il diario della sezione Arcobaleno è digitale. Buona giornata a tutti!', ts: t - 1500 * m }
  ];
  return { version: 2, kids, diary, messages, session: null };
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && Array.isArray(d.kids) && Array.isArray(d.diary)) {
      if (!Array.isArray(d.messages)) d.messages = [];
      d.session = d.session || null;
      return d;
    }
  } catch (err) { /* dato corrotto: si riparte dal seme */ }
  const fresh = seed();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(fresh)); } catch (err) {}
  return fresh;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) {} }

let state = load();
const ui = { roleTab: 'admin', kidId: null, query: '', filter: 'tutti', tab: 'kids' };

/* ---------- helper ---------- */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const byId = id => state.kids.find(k => k.id === Number(id));
const firstName = n => String(n || '').split(' ')[0];
const initials = n => String(n || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
const hhmm = ts => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
function dayLabel(ts) {
  const d = new Date(ts), now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (same(d, now)) return 'Oggi · ' + hhmm(ts);
  if (same(d, y)) return 'Ieri · ' + hhmm(ts);
  return d.toLocaleDateString('it-IT') + ' · ' + hhmm(ts);
}
const level = v => (v > 40 ? 'ok' : v > 15 ? 'low' : 'out');
const clampV = v => Math.max(0, Math.min(100, Number(v) || 0));
const avatarCls = id => 'av-' + AVATAR_BG[Math.abs(Number(id) || 0) % AVATAR_BG.length];
function addEntry(kidId, type, text) {
  state.diary.unshift({ id: Date.now() + Math.floor(Math.random() * 999), kidId, type, text, ts: Date.now() });
  if (state.diary.length > 500) state.diary.length = 500;
}
function addMsg(text) {
  state.messages.unshift({ id: Date.now(), text, ts: Date.now() });
  if (state.messages.length > 100) state.messages.length = 100;
}

/* ---------- toast ---------- */
function toast(msg) {
  const wrap = $('#toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 3000);
}

/* ---------- viste ---------- */
function showView(name) {
  [['login', '#viewLogin'], ['admin', '#viewAdmin'], ['parent', '#viewParent']].forEach(([n, sel]) => {
    const el = $(sel);
    if (el) el.hidden = n !== name;
  });
}

/* ---------- render: login ---------- */
function renderLogin() {
  const fCode = $('#fCode');
  if (fCode) fCode.hidden = ui.roleTab !== 'parent';
  document.querySelectorAll('.seg-btn[data-action="role-tab"]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.role === ui.roleTab));
  });
  const err = $('#loginError');
  if (err) err.hidden = true;
}

/* ---------- render: card bambino + righe ---------- */
function kidCard(k) {
  const lows = SUPPLIES.filter(([key]) => level(clampV(k.supplies[key])) !== 'ok').length;
  return '<button type="button" class="kid-card' + (k.present ? '' : ' absent') + '" data-action="open-kid" data-id="' + k.id + '">' +
    '<span class="avatar ' + avatarCls(k.id) + '" aria-hidden="true">' + esc(initials(k.name)) + '</span>' +
    '<span class="kid-name">' + esc(k.name) + '</span>' +
    '<span class="kid-meta">' + (k.present ? 'Presente' : 'Assente') +
    (lows ? ' · <span class="badge-low">' + lows + ' scorta' + (lows > 1 ? 'e' : '') + ' da rifare</span>' : '') +
    '</span></button>';
}

function entryRow(e, showKid) {
  const k = byId(e.kidId);
  return '<li class="entry"><span class="entry-dot t-' + esc(e.type) + '" aria-hidden="true"></span>' +
    '<div class="entry-body"><div class="entry-meta">' +
    (showKid && k ? '<strong>' + esc(firstName(k.name)) + '</strong> · ' : '') +
    esc(TYPE_LABEL[e.type] || e.type) + ' · ' + esc(dayLabel(e.ts)) + '</div>' +
    '<div class="entry-text">' + esc(e.text) + '</div></div></li>';
}

function barsHtml(k) {
  return SUPPLIES.map(([key, label]) => {
    const v = clampV(k.supplies[key]);
    const l = level(v);
    return '<div class="bar"><div class="bar-label"><span>' + label + '</span><span class="lv-' + l + '">' + LEVEL_TXT[l] + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill ' + l + '" style="width:' + Math.max(v, 4) + '%"></div></div></div>';
  }).join('');
}

function msgRow(m, admin) {
  return '<li class="msg-row"><div class="msg-body"><p class="msg-text">' + esc(m.text) + '</p>' +
    '<small class="msg-time">' + esc(dayLabel(m.ts)) + ' · alle famiglie della sezione</small></div>' +
    (admin ? '<button type="button" class="msg-del" data-action="del-msg" data-id="' + m.id + '">Elimina</button>' : '') +
    '</li>';
}

/* ---------- render: admin ---------- */
const PANES = { kids: '#paneKids', diario: '#paneDiario', scorte: '#paneScorte', avvisi: '#paneAvvisi' };

function renderAdmin() {
  const chip = $('#adminToday');
  if (chip) chip.textContent = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  /* tab */
  document.querySelectorAll('.tabs .tab').forEach(b => {
    const on = b.dataset.tab === ui.tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  Object.entries(PANES).forEach(([n, sel]) => { const el = $(sel); if (el) el.hidden = n !== ui.tab; });

  /* bambini */
  const q = ui.query.trim().toLowerCase();
  const list = state.kids.filter(k => !q || k.name.toLowerCase().includes(q) || (k.code || '').toLowerCase().includes(q));
  const grid = $('#kidGrid');
  if (grid) grid.innerHTML = list.map(kidCard).join('');
  const ke = $('#kidsEmpty');
  if (ke) { ke.hidden = list.length > 0; ke.textContent = q ? 'Nessun bambino per «' + ui.query.trim() + '».' : 'Nessun bambino in sezione.'; }

  /* diario */
  const sel = $('#diarioFilter');
  if (sel) {
    const cur = String(ui.filter);
    if (sel.value !== cur) {
      sel.innerHTML = '<option value="tutti">Tutti i bambini</option>' +
        state.kids.map(k => '<option value="' + k.id + '">' + esc(k.name) + '</option>').join('');
      sel.value = state.kids.some(k => String(k.id) === cur) || cur === 'tutti' ? cur : 'tutti';
    }
  }
  const dl = $('#diarioList');
  if (dl) {
    const rows = state.diary.filter(e => ui.filter === 'tutti' || e.kidId === Number(ui.filter)).slice(0, 60);
    dl.innerHTML = rows.map(e => entryRow(e, true)).join('');
    const de = $('#diarioEmpty');
    if (de) { de.hidden = rows.length > 0; de.textContent = ui.filter === 'tutti' ? 'Nessuna voce nel diario: aprine una dal pannello Bambini.' : 'Nessuna voce nel diario di questo bambino.'; }
  }

  /* scorte */
  const tb = $('#scorteBody');
  if (tb) {
    tb.innerHTML = state.kids.map(k => {
      const cells = SUPPLIES.map(([key]) => {
        const v = clampV(k.supplies[key]);
        return '<td class="lv-' + level(v) + '">' + v + '%</td>';
      }).join('');
      return '<tr data-action="open-kid" data-id="' + k.id + '" tabindex="0"><td><strong>' + esc(k.name) + '</strong><br><small class="kid-meta">' + esc(k.code) + '</small></td>' + cells + '</tr>';
    }).join('');
  }

  /* avvisi */
  const ml = $('#msgList');
  if (ml) {
    ml.innerHTML = state.messages.map(m => msgRow(m, true)).join('');
    const me = $('#msgEmpty');
    if (me) me.hidden = state.messages.length > 0;
  }
}

/* ---------- render: genitori ---------- */
function renderParent() {
  const k = state.session ? byId(state.session.kidId) : null;
  if (!k) { state.session = null; save(); showView('login'); renderLogin(); return; }
  const sub = $('#parentSub');
  if (sub) sub.textContent = 'Diario di ' + k.name;
  const hero = $('#parentHero');
  if (hero) {
    hero.innerHTML = '<span class="avatar lg ' + avatarCls(k.id) + '" aria-hidden="true">' + esc(initials(k.name)) + '</span>' +
      '<div class="hero-txt"><h2>' + esc(k.name) + '</h2>' +
      '<span class="badge ' + (k.present ? 'ok' : 'off') + '">' + (k.present ? 'Presente oggi' : 'Assente oggi') + '</span></div>' +
      '<small class="hero-code">Codice famiglia ' + esc(k.code) + '</small>';
  }
  const pd = $('#parentDiary');
  if (pd) {
    const rows = state.diary.filter(e => e.kidId === k.id).slice(0, 20);
    pd.innerHTML = rows.map(e => entryRow(e, false)).join('');
    const pe = $('#parentDiarioEmpty');
    if (pe) pe.hidden = rows.length > 0;
  }
  const ps = $('#parentScorte');
  if (ps) ps.innerHTML = barsHtml(k);
  const pm = $('#parentMsgs');
  if (pm) pm.innerHTML = state.messages.map(m => msgRow(m, false)).join('') || '<li class="empty">Nessun avviso dal nido.</li>';
}

function render() {
  if (!state.session) { showView('login'); renderLogin(); return; }
  if (state.session.role === 'admin') { showView('admin'); renderAdmin(); return; }
  showView('parent'); renderParent();
}

/* ---------- drawer ---------- */
function openDrawer(id) {
  const k = byId(id);
  if (!k) return;
  ui.kidId = k.id;
  renderDrawer();
  const dr = $('#drawer'), ov = $('#overlay');
  if (dr) { dr.classList.add('open'); dr.setAttribute('aria-hidden', 'false'); }
  if (ov) { ov.hidden = false; requestAnimationFrame(() => ov.classList.add('show')); }
}
function closeDrawer() {
  const dr = $('#drawer'), ov = $('#overlay');
  if (dr) { dr.classList.remove('open'); dr.setAttribute('aria-hidden', 'true'); }
  if (ov) {
    ov.classList.remove('show');
    setTimeout(() => { if (ov && !ov.classList.contains('show')) ov.hidden = true; }, 250);
  }
  ui.kidId = null;
}
function renderDrawer() {
  const k = ui.kidId ? byId(ui.kidId) : null;
  if (!k) { closeDrawer(); return; }
  const av = $('#drawerAvatar');
  if (av) { av.className = 'avatar ' + avatarCls(k.id); av.textContent = initials(k.name); }
  const nm = $('#drawerName');
  if (nm) nm.textContent = k.name;
  const mt = $('#drawerMeta');
  if (mt) mt.innerHTML = 'Codice ' + esc(k.code) + ' · ' + (k.present ? 'Presente' : 'Assente');

  const qs = $('#quickSupply');
  if (qs) qs.innerHTML = SUPPLIES.map(([key, label]) => {
    const v = clampV(k.supplies[key]);
    const miss = v <= 15;
    return '<button type="button" class="quick-btn' + (miss ? ' pressed' : '') + '" data-action="quick-supply" data-key="' + key + '">' +
      label + '<small class="lv-' + level(v) + '">' + (miss ? 'richiesto' : v + '%') + '</small></button>';
  }).join('');

  const qd = $('#quickDiario');
  if (qd) qd.innerHTML = QUICK_DIARIO.map(([type, label]) => {
    const lab = type === 'presenza' ? (k.present ? 'Registra uscita' : 'Registra entrata') : label;
    return '<button type="button" class="quick-btn" data-action="quick-diario" data-type="' + type + '">' + lab + '</button>';
  }).join('');

  const hi = $('#drawerHistory');
  if (hi) hi.innerHTML = state.diary.filter(e => e.kidId === k.id).slice(0, 10).map(e => entryRow(e, false)).join('');
}

/* ---------- export CSV scorte ---------- */
function exportCsv() {
  const head = ['Bambino', 'Codice'].concat(SUPPLIES.map(s => s[1])).concat(['Stato']);
  const lines = state.kids.map(k => {
    const lows = SUPPLIES.filter(([key]) => level(clampV(k.supplies[key])) !== 'ok').map(s => s[1]);
    return [k.name, k.code].concat(SUPPLIES.map(([key]) => clampV(k.supplies[key]) + '%')).concat([lows.length ? 'Servono: ' + lows.join(', ') : 'Tutto ok']);
  });
  const csv = [head, ...lines]
    .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'asilapp-scorte.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Scorte esportate in CSV.');
}

/* ---------- login ---------- */
function loginError(msg) {
  const err = $('#loginError');
  if (err) { err.textContent = msg; err.hidden = false; }
}
function doLogin() {
  if (ui.roleTab === 'admin') {
    const u = $('#loginUser'), p = $('#loginPass');
    if (!u || !p) return;
    if (u.value.trim().toLowerCase() !== ADMIN_USER || p.value !== ADMIN_PASS) {
      loginError('Credenziali non valide: riprova.'); return;
    }
    state.session = { role: 'admin' };
    save(); render(); toast('Bentornata al nido! 👋');
  } else {
    const c = $('#loginCode');
    if (!c) return;
    const kid = state.kids.find(k => (k.code || '').toLowerCase() === c.value.trim().toLowerCase());
    if (!kid) { loginError('Codice non riconosciuto: controlla e riprova.'); return; }
    state.session = { role: 'parent', kidId: kid.id };
    save(); render(); toast('Ciao famiglia di ' + firstName(kid.name) + '!');
  }
}

/* ---------- azioni: mappa, un'azione rotta non blocca le altre ---------- */
const ACTIONS = {
  'role-tab'(el) {
    ui.roleTab = el.dataset.role === 'parent' ? 'parent' : 'admin';
    renderLogin();
  },
  'logout'() {
    state.session = null; save(); closeDrawer(); render();
    toast('Sessione chiusa. A presto!');
  },
  'open-kid'(el) { openDrawer(el.dataset.id); },
  'close-drawer'() { closeDrawer(); },
  'quick-supply'(el) {
    const k = ui.kidId ? byId(ui.kidId) : null;
    if (!k) return;
    const label = (SUPPLIES.find(s => s[0] === el.dataset.key) || ['', el.dataset.key])[1];
    addEntry(k.id, 'scorte', 'Richiesta alle famiglie: portare ' + label.toLowerCase());
    save(); renderDrawer(); renderAdmin();
    toast(label + ': famiglia di ' + firstName(k.name) + ' avvisata.');
  },
  'quick-diario'(el) {
    const k = ui.kidId ? byId(ui.kidId) : null;
    if (!k) return;
    const type = el.dataset.type;
    if (type === 'presenza') {
      k.present = !k.present;
      addEntry(k.id, 'presenza', k.present ? 'Entrata registrata al nido' : 'Uscita: andata a casa con la famiglia');
      toast((k.present ? 'Entrata' : 'Uscita') + ' di ' + firstName(k.name) + ' registrata.');
    } else {
      const txt = {
        merenda: 'Merenda consumata con gusto',
        riposino: 'Riposino fatto nella nanna room',
        cambio: 'Cambio effettuato'
      }[type] || (TYPE_LABEL[type] || type);
      addEntry(k.id, type, txt);
      toast(TYPE_LABEL[type] + ' segnata nel diario di ' + firstName(k.name) + '.');
    }
    save(); renderDrawer(); renderAdmin();
  },
  'del-msg'(el) {
    const id = Number(el.dataset.id);
    if (!Number.isFinite(id)) return;
    if (!window.confirm('Eliminare questo avviso? Le famiglie non lo vedranno più.')) return;
    state.messages = state.messages.filter(m => m.id !== id);
    save(); renderAdmin(); toast('Avviso eliminato.');
  },
  'export-csv'() { exportCsv(); }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el) {
    const fn = ACTIONS[el.dataset.action];
    if (typeof fn === 'function') fn(el);
    return;
  }
  const tab = e.target.closest('.tabs .tab');
  if (tab && tab.dataset.tab) { ui.tab = tab.dataset.tab; renderAdmin(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDrawer();
  if (e.key === 'Enter' && e.target.matches('#scorteBody tr[data-action="open-kid"]')) openDrawer(e.target.dataset.id);
});

/* ---------- form ---------- */
function bind(id, evt, fn) {
  const el = $(id);
  if (el) el.addEventListener(evt, fn);
}

bind('#loginForm', 'submit', ev => { ev.preventDefault(); doLogin(); });
bind('#kidSearch', 'input', function () { ui.query = this.value; renderAdmin(); });
bind('#diarioFilter', 'change', function () { ui.filter = this.value; renderAdmin(); });
bind('#avvisoForm', 'submit', ev => {
  ev.preventDefault();
  const ta = $('#avvisoText');
  if (!ta) return;
  const txt = ta.value.trim();
  if (!txt) { ta.focus(); toast('Scrivi prima il testo dell\'avviso.'); return; }
  addMsg(txt);
  ta.value = '';
  save(); renderAdmin();
  toast('Avviso inviato a tutte le famiglie. 📣');
});
bind('#drawerNoteForm', 'submit', ev => {
  ev.preventDefault();
  const inp = $('#drawerNote');
  if (!inp || !ui.kidId) return;
  const txt = inp.value.trim();
  if (!txt) { inp.focus(); toast('Scrivi prima il testo della nota.'); return; }
  const k = byId(ui.kidId);
  if (!k) return;
  addEntry(k.id, 'nota', txt);
  inp.value = '';
  save(); renderDrawer(); renderAdmin();
  toast('Nota inviata alla famiglia di ' + firstName(k.name) + '.');
});

/* ---------- avvio ---------- */
try {
  render();
} catch (err) {
  console.error('Asilapp: errore iniziale', err);
  try { showView('login'); renderLogin(); } catch (e2) { /* ultima spiaggia */ }
}
