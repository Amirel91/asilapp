  if (act === 'menu-prev') { menuM--; if (menuM < 0) { menuM = 11; menuY--; } menuSel = ''; renderMenu(); return; }
  if (act === 'menu-next') { menuM++; if (menuM > 11) { menuM = 0; menuY++; } menuSel = ''; renderMenu(); return; }
  if (act === 'menu-copy') {
    const prev = new Date(menuSel + 'T12:00'); prev.setDate(prev.getDate() - 1);
    const p = state.menu[iso(prev)];
    if (p) {
      ['primo','secondo','contorno','merenda'].forEach(f => $('#menu' + f[0].toUpperCase() + f.slice(1)).value = p[f] || '');
      toast('Copiato dal ' + prev.toLocaleDateString('it-IT', { day:'numeric', month:'short' }));
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
  renderKids(); fillMemoKid(); renderPasti();
  toast(name.split(' ')[0] + ' aggiunto alla sezione ✓');
});

on('#drawerNoteForm', 'submit', e => {
  e.preventDefault();
  if (!drawerKid) return;
  const txt = $('#drawerNote').value.trim();
  if (!txt) return;
  addMemo(drawerKid, txt);
  $('#drawerNote').value = '';
  renderQuick(); renderDrawerMemos(); renderMemos(); renderKids();
  toast('Memo inviato alla famiglia ✓');
});

on('#avvisoForm', 'submit', e => {
  e.preventDefault();
  const txt = $('#avvisoText').value.trim();
  if (!txt) return;
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
  const has = Object.values(row).some(v => v);
  if (has) state.menu[menuSel] = row; else delete state.menu[menuSel];
  save(); renderMenu();
  const d = new Date(menuSel + 'T12:00');
  toast(has
    ? 'Menù del ' + d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) + ' salvato ✓'
    : 'Menù del giorno rimosso');
});

/* ---------- filtri e campi live ---------- */
on('#kidSearch', 'input', renderKids);
on('#memoKid', 'change', renderMemos);
on('#memoState', 'change', renderMemos);
on('#menuDay', 'change', e => { menuSel = e.target.value; renderMenu(); });
on('#mealsMonth', 'change', renderPasti);

/* pasti e tariffa: totale riga + totale sezione ricalcolati mentre si digita */
document.addEventListener('input', e => {
  const f = e.target.closest('[data-field]');
  if (!f) return;
  const month = state.meals[curYm()];
  const m = month && month[f.dataset.kid];
  if (!m) return;
  let v = parseFloat(f.value);
  if (isNaN(v) || v < 0) v = 0;
  m[f.dataset.field] = v; save();
  const cell = $('[data-cell="tot-' + f.dataset.kid + '"]');
  if (cell) cell.textContent = fmtEur((m.count || 0) * (m.rate || 0));
  const rows = Object.values(month).filter(Boolean);
  const tot = rows.reduce((a, r) => a + (r.count || 0) * (r.rate || 0), 0);
  const nPasti = rows.reduce((a, r) => a + (r.count || 0), 0);
  const foot = $('#mealsFoot');
  if (foot) foot.innerHTML =
    `<tr><th scope="row">Totale sezione</th><td class="num">${nPasti}</td><td></td>` +
    `<td class="num"><strong>${fmtEur(tot)}</strong></td><td></td></tr>`;
});

/* ---------- FIX LOGIN: tab "Genitori" → solo il campo codice famiglia ----------
   Ridefinisce setRoleTab: con "Genitori" attivo username e password restano nascosti,
   con "Maestre" tornano visibili (e il codice bambino scompare). */
function setRoleTab(role) {
  loginRole = role;
  const parent = role === 'parent';
  $$('[data-action="role-tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  $('#fUser').hidden = parent;
  $('#fPass').hidden = parent;
  $('#fCode').hidden = !parent;
  const err = $('#loginError');
  if (err) err.hidden = true;
  if (!$('#viewLogin').hidden) (parent ? $('#loginCode') : $('#loginUser')).focus();
}

/* ---------- init ---------- */
state = load();
const __now = new Date();
menuY = __now.getFullYear(); menuM = __now.getMonth();
$('#mealsMonth').value = ymNow();
show('viewLogin');
setRoleTab('admin');
