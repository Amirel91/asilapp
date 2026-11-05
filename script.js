 corto: scrivi qualche parola in più.'); return; }
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
  renderDrawer(); renderAdmin();
});

/* filtri e ricerche live */
on('#kidSearch', 'input', renderKids);
on('#memoKid', 'change', renderMemos);
on('#memoState', 'change', renderMemos);

/* giorno scelto dal selettore → calendario e form riallineati */
on('#menuDay', 'change', renderMenu);

/* cambio mese del bollettino */
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
