'use strict';
/* ============================================================
   diario.js — estensione di Asilapp, zero modifiche a script.js
   1) Diario della giornata: pastiglie + nota nel drawer bambino,
      card «Come è andata oggi» nell'area famiglia
   2) Backup / ripristino JSON nelle Impostazioni
   Riutilizza i globali di script.js: state, save, toast, esc, iso,
   drawerKid, parentKid, KEY.
   ============================================================ */
(function () {
  if (typeof state === 'undefined') return; // script.js assente: niente da estendere

  /* ---------- modello: state.diary[kidId][AAAA-MM-GG] ---------- */
  const today = () => iso(new Date());
  function readRec(kidId) {
    try { return (state.diary || {})[kidId] || {}; } catch (e) { return {}; }
  }
  function dayRec(kidId) {
    if (!state.diary || typeof state.diary !== 'object') state.diary = {};
    if (!state.diary[kidId]) state.diary[kidId] = {};
    if (!state.diary[kidId][today()]) state.diary[kidId][today()] = {};
    return state.diary[kidId][today()];
  }
  const drawerKidRef = () => (typeof drawerKid !== 'undefined' && drawerKid) ? drawerKid : null;

  /* ---------- render: drawer maestre ---------- */
  function renderDiaryDrawer() {
    const box = document.getElementById('diaryBox');
    if (!box) return;
    const k = drawerKidRef();
    if (!k) { box.innerHTML = ''; return; }
    const rec = readRec(k.id)[today()] || {};
    const pill = (key, ico, lbl) =>
      `<button type="button" class="diary-pill${rec[key] ? ' on' : ''}" data-diary="${key}" aria-pressed="${rec[key] ? 'true' : 'false'}"><span aria-hidden="true">${ico}</span><small>${lbl}</small></button>`;
    box.innerHTML =
      `<div class="diary-grid">
        ${pill('meal', '🍝', 'Ha pranzato')}
        ${pill('sleep', '😴', 'Ha riposato')}
        ${pill('potty', '🚼', 'Cambio ok')}
      </div>
      <form class="drawer-note" data-diary-note="1" novalidate>
        <input type="text" class="input" maxlength="120" placeholder="Nota per i genitori: umore, attività…" value="${esc(rec.note || '')}" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Salva</button>
      </form>
      <p class="hint">Il diario di oggi compare nell'area famiglia di ${esc(k.name.split(' ')[0])}.</p>`;
  }

  /* ---------- render: area famiglia ---------- */
  function renderDiaryParent() {
    const view = document.getElementById('viewParent');
    const card = document.getElementById('parentDiaryCard');
    const box = document.getElementById('parentDiary');
    if (!view || view.hidden || !card || !box) return;
    card.hidden = true;
    let k = null;
    try { k = parentKid(); } catch (e) { k = null; }
    if (!k) return;
    const rec = readRec(k.id)[today()] || {};
    const tags = [];
    if (rec.meal) tags.push('🍝 Ha pranzato');
    if (rec.sleep) tags.push('😴 Ha riposato');
    if (rec.potty) tags.push('🚼 Cambio fatto');
    const note = String(rec.note || '').trim();
    if (!tags.length && !note) return; // giornata ancora vuota: niente card
    card.hidden = false;
    box.innerHTML =
      (tags.length ? `<div class="diary-out">${tags.map(t => `<span class="diary-tag">${t}</span>`).join('')}</div>` : '') +
      (note ? `<p class="diary-note">📝 ${esc(note)}</p>` : '');
  }

  /* ---------- azioni ---------- */
  function toggleDiary(key) {
    const k = drawerKidRef();
    if (!k) return;
    const rec = dayRec(k.id);
    rec[key] = !rec[key];
    save();
    renderDiaryDrawer();
    toast(rec[key] ? 'Segnato nel diario ✓' : 'Segno tolto dal diario');
  }
  function saveNote(form) {
    const k = drawerKidRef();
    const inp = form.querySelector('input');
    if (!k || !inp) return;
    const v = String(inp.value || '').trim().replace(/\s+/g, ' ');
    if (v.length < 3) { toast('Scrivi almeno 3 lettere per la nota'); return; }
    dayRec(k.id).note = v;
    save(); renderDiaryDrawer();
    toast('Nota del diario salvata ✓');
  }

  /* ---------- backup / ripristino ---------- */
  function exportBackup() {
    try {
      const clean = Object.assign({}, state, { role: null, parentKid: null });
      const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'asilapp-backup-' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast('Backup scaricato ✓');
    } catch (e) { toast('Backup non riuscito'); }
  }
  function importBackup(file) {
    const err = document.getElementById('backupErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    file.text()
      .then(txt => {
        let d = null;
        try { d = JSON.parse(txt); } catch (e) { d = null; }
        if (!d || d.v !== 1 || !Array.isArray(d.kids) || !Array.isArray(d.sections) || !d.sections.length)
          return fail('Il file non è un backup Asilapp valido.');
        if (!confirm('Il ripristino sostituirà tutti i dati di questo browser. Continuare?')) return;
        d.role = null; d.parentKid = null;
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { return fail('Salvataggio non riuscito: memoria del browser piena?'); }
        location.reload();
      })
      .catch(() => fail('Impossibile leggere il file.'));
  }

  /* ---------- aggancio agli eventi (delegation propria) ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('.kid-card')) renderDiaryDrawer(); // script.js ha già aperto il drawer
    const pill = t.closest('[data-diary]');
    if (pill) toggleDiary(pill.getAttribute('data-diary'));
    if (t.closest('[data-action="backup-export"]')) exportBackup();
  });
  document.addEventListener('submit', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const noteForm = t.closest('[data-diary-note]');
    if (noteForm) { e.preventDefault(); saveNote(noteForm); return; }
    if (t.id === 'loginForm') requestAnimationFrame(renderDiaryParent);
  });
  const bf = document.getElementById('backupFile');
  if (bf) bf.addEventListener('change', () => {
    const f = bf.files && bf.files[0];
    bf.value = '';
    if (f) importBackup(f);
  });

  renderDiaryParent(); // copre il rientro di una sessione genitore già aperta
})();
