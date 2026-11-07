'use strict';
/* ============================================================
   extra.js — secondo modulo di estensione di Asilapp
   1) Allergie e dieta per bambino: nota salute modificabile dal
      drawer, segnale ⚠️ sulle schede della griglia Bambini,
      avviso nell'area famiglia
   2) Riepilogo del bollettino pasti: bambini, pasti del mese,
      incasso previsto, diete speciali
   Riutilizza i globali di script.js: state, save, toast, esc,
   fmtEur, curYm, drawerKid, parentKid.
   ============================================================ */
(function () {
  if (typeof state === 'undefined') return; // script.js assente: niente da estendere

  /* ritiro i dati delle vecchie presenze, se presenti */
  if (state.attendance !== undefined) { delete state.attendance; save(); }

  const kidAllergy = k => String((k && k.allergy) || '').trim();

  /* ---------- allergie e dieta: editor nel drawer bambino ---------- */
  function renderAllergyDrawer() {
    const box = document.getElementById('allergyBox');
    if (!box) return;
    const k = (typeof drawerKid !== 'undefined' && drawerKid) ? drawerKid : null;
    if (!k) { box.innerHTML = ''; return; }
    box.innerHTML =
      `<form class="drawer-note" data-allergy-form="1" novalidate>
        <input type="text" class="input" maxlength="80" placeholder="es. Allergia alle uova, dieta senza lattosio…" value="${esc(kidAllergy(k))}" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Salva</button>
      </form>
      <p class="hint">La nota compare con un avviso ⚠️ sulla scheda del bambino e nell'area famiglia.</p>`;
  }
  function saveAllergy(form) {
    const k = (typeof drawerKid !== 'undefined' && drawerKid) ? drawerKid : null;
    const inp = form.querySelector('input');
    if (!k || !inp) return;
    const v = String(inp.value || '').trim().replace(/\s+/g, ' ');
    k.allergy = v;
    save(); renderAllergyDrawer(); flagKidCards(); renderParentHealth();
    toast(v ? 'Nota salute salvata ✓' : 'Nota salute rimossa');
  }

  /* ---------- segnale ⚠️ sulle schede della griglia Bambini ---------- */
  /* idempotente: aggiorna in place quando può, così l'observer non impazzisce */
  function flagKidCards() {
    const grid = document.getElementById('kidGrid');
    if (!grid) return;
    grid.querySelectorAll('.kid-card').forEach(card => {
      const k = state.kids.find(x => x.id === card.getAttribute('data-id'));
      const all = k ? kidAllergy(k) : '';
      let f = card.querySelector('.kid-flag');
      if (!all) { if (f) f.remove(); return; }
      if (f) { f.title = all; return; } // solo attributo: niente mutazioni childList
      f = document.createElement('span');
      f.className = 'kid-flag';
      f.title = all;
      f.textContent = '⚠️ ' + all;
      card.appendChild(f);
    });
  }
  const grid = document.getElementById('kidGrid');
  if (grid) new MutationObserver(flagKidCards).observe(grid, { childList: true });

  /* ---------- area famiglia: card «Nota salute» ---------- */
  function renderParentHealth() {
    const view = document.getElementById('viewParent');
    const card = document.getElementById('parentHealthCard');
    const box = document.getElementById('parentHealth');
    if (!view || view.hidden || !card || !box) return;
    let k = null;
    try { k = parentKid(); } catch (e) { k = null; }
    const all = k ? kidAllergy(k) : '';
    if (!k || !all) { card.hidden = true; return; }
    card.hidden = false;
    box.innerHTML = `<p class="today-line warn">⚠️ ${esc(all)}</p>`;
  }

  /* ---------- riepilogo bollettino pasti ---------- */
  function renderMealsStats() {
    const box = document.getElementById('mealsStats');
    if (!box) return;
    const mm = (state.meals || {})[curYm()] || {};
    let n = 0, tot = 0;
    Object.keys(mm).forEach(id => {
      const m = mm[id] || {};
      const c = Number(m.n) || 0, r = Number(m.rate) || 0;
      n += c; tot += c * r;
    });
    const nAll = state.kids.filter(kidAllergy).length;
    box.innerHTML =
      `<span class="chip">🧒 Bambini: ${state.kids.length}</span>` +
      `<span class="chip">🍝 Pasti del mese: ${n}</span>` +
      `<span class="chip">💰 Previsto: ${fmtEur(tot)}</span>` +
      (nAll ? `<span class="chip warn">⚠️ Diete speciali: ${nAll}</span>` : '');
  }

  /* ---------- aggancio agli eventi (delegation propria) ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('.kid-card')) renderAllergyDrawer(); // script.js ha già aperto il drawer
    if (t.closest('#panePasti')) requestAnimationFrame(renderMealsStats);
  });
  document.addEventListener('submit', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const f = t.closest('[data-allergy-form]');
    if (f) { e.preventDefault(); saveAllergy(f); return; }
    if (t.id === 'loginForm' || t.id === 'addKidForm')
      requestAnimationFrame(() => { renderParentHealth(); renderMealsStats(); });
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#panePasti')) requestAnimationFrame(renderMealsStats);
  });

  flagKidCards(); renderParentHealth(); renderMealsStats();
})();
