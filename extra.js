'use strict';
/* ============================================================
   extra.js — secondo modulo di estensione di Asilapp
   1) Presenze del giorno (Presente/Assente per bambino, conteggio
      live e risvolto nell'area famiglia)
   2) Allergie e dieta per bambino: nota salute modificabile dal
      drawer, segnale ⚠️ nelle presenze, avviso ai genitori
   3) Riepilogo del bollettino pasti: bambini, pasti del mese,
      incasso previsto, diete speciali
   Riutilizza i globali di script.js: state, save, toast, esc, iso,
   fmtEur, curYm, avCls, initials, secName, drawerKid, parentKid.
   ============================================================ */
(function () {
  if (typeof state === 'undefined') return; // script.js assente: niente da estendere

  /* ---------- modello: state.attendance[AAAA-MM-GG][kidId] = true|false ---------- */
  const today = () => iso(new Date());
  function attDay() {
    if (!state.attendance || typeof state.attendance !== 'object') state.attendance = {};
    return state.attendance;
  }
  function purgeAttendance() { // lo storico oltre 60 giorni non serve a nessuno
    const a = attDay();
    const cut = new Date(); cut.setDate(cut.getDate() - 60);
    const c = iso(cut);
    let ch = false;
    Object.keys(a).forEach(d => { if (d < c) { delete a[d]; ch = true; } });
    if (ch) save();
  }
  const kidAllergy = k => String((k && k.allergy) || '').trim();

  /* ---------- presenze: card in cima al tab Bambini ---------- */
  function renderAttendance() {
    const list = document.getElementById('attList');
    if (!list) return;
    const empty = document.getElementById('attEmpty');
    if (empty) empty.hidden = state.kids.length > 0;
    const rec = attDay()[today()] || {};
    list.innerHTML = state.kids.map(k => {
      const v = rec[k.id];
      const all = kidAllergy(k);
      return `<li>
        <span class="avatar sm ${avCls(k.id)}">${initials(k.name)}</span>
        <span class="att-name">${esc(k.name)}${all ? ` <span class="att-warn" title="${esc(all)}">⚠️</span>` : ''}<small>${esc(secName(k.sec))}</small></span>
        <span class="att-btns">
          <button type="button" class="att-btn ok${v === true ? ' on' : ''}" data-att="1" data-id="${k.id}" aria-pressed="${v === true}">Presente</button>
          <button type="button" class="att-btn no${v === false ? ' on' : ''}" data-att="0" data-id="${k.id}" aria-pressed="${v === false}">Assente</button>
        </span>
      </li>`;
    }).join('');
    const chip = document.getElementById('attCount');
    if (chip) {
      const pres = state.kids.filter(k => rec[k.id] === true).length;
      const abs = state.kids.filter(k => rec[k.id] === false).length;
      chip.textContent = state.kids.length
        ? pres + ' presenti · ' + abs + (abs === 1 ? ' assente' : ' assenti')
        : '—';
    }
  }
  function markAttendance(kidId, present) {
    const d = attDay();
    if (!d[today()]) d[today()] = {};
    d[today()][kidId] = present;
    save(); renderAttendance();
    toast(present ? 'Presenza segnata ✓' : 'Assenza segnata');
  }

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
      <p class="hint">La nota compare con un avviso ⚠️ nelle presenze e nell'area famiglia.</p>`;
  }
  function saveAllergy(form) {
    const k = (typeof drawerKid !== 'undefined' && drawerKid) ? drawerKid : null;
    const inp = form.querySelector('input');
    if (!k || !inp) return;
    const v = String(inp.value || '').trim().replace(/\s+/g, ' ');
    k.allergy = v;
    save(); renderAllergyDrawer(); renderAttendance();
    toast(v ? 'Nota salute salvata ✓' : 'Nota salute rimossa');
  }

  /* ---------- area famiglia: «Oggi al nido» ---------- */
  function renderParentToday() {
    const view = document.getElementById('viewParent');
    const card = document.getElementById('parentTodayCard');
    const box = document.getElementById('parentToday');
    if (!view || view.hidden || !card || !box) return;
    let k = null;
    try { k = parentKid(); } catch (e) { k = null; }
    if (!k) { card.hidden = true; return; }
    const p = (attDay()[today()] || {})[k.id];
    const all = kidAllergy(k);
    if (p === undefined && !all) { card.hidden = true; return; }
    card.hidden = false;
    box.innerHTML =
      (p === true ? `<p class="today-line ok">✅ ${esc(k.name.split(' ')[0])} oggi è al nido</p>` : '') +
      (p === false ? `<p class="today-line off">🏠 Oggi ${esc(k.name.split(' ')[0])} è a casa</p>` : '') +
      (all ? `<p class="today-line warn">⚠️ ${esc(all)}</p>` : '');
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
    const att = t.closest('[data-att]');
    if (att) markAttendance(att.getAttribute('data-id'), att.getAttribute('data-att') === '1');
    if (t.closest('#panePasti')) requestAnimationFrame(renderMealsStats);
    if (t.closest('[data-action="tab"]') || t.closest('[data-action^="kid-"]'))
      requestAnimationFrame(renderAttendance); // tab o gestione bambini: righe aggiornate
  });
  document.addEventListener('submit', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const f = t.closest('[data-allergy-form]');
    if (f) { e.preventDefault(); saveAllergy(f); return; }
    if (t.id === 'loginForm' || t.id === 'addKidForm')
      requestAnimationFrame(() => { renderAttendance(); renderParentToday(); renderMealsStats(); });
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#panePasti') || t.id === 'drawerSection')
      requestAnimationFrame(() => { renderMealsStats(); renderAttendance(); });
  });

  purgeAttendance();
  renderAttendance(); renderParentToday(); renderMealsStats();
})();
