'use strict';
/* ============================================================
   registrazione.js — crea lo spazio di un asilo e rientra
   Usa l'API ASILO di login.js quando c'è (enter + keyFor);
   in assenza ripiega sulla convenzione delle chiavi asilapp_vN.
   Stato salvato nel formato v1 condiviso con script.js:
   kids, sections, memos, menu, diary, meals, notices.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const form = $('regForm');
  if (!form) return;

  const clean = v => String(v || '').trim().replace(/\s+/g, ' ');
  const newId = () => 's' + Math.random().toString(36).slice(2, 8);
  const say = (m) => { if (typeof toast === 'function') toast(m); };

  /* ---------- robustezza password: barra + consiglio ---------- */
  const pass = $('regPass');
  const bar = $('regBar');
  const msg = $('pwMsg');
  const LEVELS = ['Almeno 6 caratteri, meglio con un numero.', 'Ok, ma un numero la rende più robusta.', 'Buona: ancora un po\u2019 pi\u00f9 lunga è perfetta.', 'Password robusta ✓'];

  function level(v) {
    let s = 0;
    if (v.length >= 6) s++;
    if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++;
    if (v.length >= 10 || /[^A-Za-z0-9]/.test(v)) s++;
    return s;
  }
  if (pass && bar) pass.addEventListener('input', () => {
    const s = level(pass.value);
    bar.className = s > 0 ? 'lv' + s : '';
    if (msg) msg.textContent = pass.value ? LEVELS[s] : LEVELS[0];
  });

  /* ---------- slot di salvataggio ---------- */
  function readSlot(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  /* con ASILO: enter assegna lo spazio, keyFor ne dà la chiave */
  function saveWithAsilo(name, state, fail) {
    if (!window.ASILO || typeof ASILO.keyFor !== 'function') return false;
    let key = '';
    try { key = ASILO.keyFor(name); } catch (e) { key = ''; }
    if (key) {
      const old = readSlot(key);
      if (old && old.name && old.name !== name)
        return fail('Esiste gi\u00e0 uno spazio con un nome simile: cambia nome o accedi dalla home.');
      if (old && old.name === name)
        return fail('Questo asilo \u00e8 gi\u00e0 registrato in questo browser: accedi dalla home.');
    }
    if (typeof ASILO.enter === 'function') {
      try { ASILO.enter(name); } catch (e) {}
      try { key = ASILO.keyFor(name) || key; } catch (e) {}
    }
    if (!key) key = 'asilapp_v1';
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {
      fail('Salvataggio non riuscito: memoria del browser piena?');
      return true;
    }
    say('Spazio creato ✓ Ora entra con il tuo nome');
    location.href = 'index.html';
    return true;
  }

  /* fallback senza ASILO: prima chiave libera tra asilapp_v1..v12 */
  function saveFallback(name, state, fail) {
    let key = '';
    for (let i = 1; i <= 12; i++) {
      const k = 'asilapp_v' + i;
      const cur = readSlot(k);
      if (!cur) { if (!key) key = k; continue; }
      if (cur.name === name)
        return fail('Questo asilo \u00e8 gi\u00e0 registrato in questo browser: accedi dalla home.');
    }
    if (!key) return fail('Memoria piena: esporta un backup o libera spazio.');
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {
      return fail('Salvataggio non riuscito: memoria del browser piena?');
    }
    say('Spazio creato ✓ Ora entra con il tuo nome');
    location.href = 'index.html';
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('regErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;

    const name = clean(($('regAsilo') || {}).value);
    const user = clean(($('regUser') || {}).value);
    const pw = String((pass || {}).value || '');

    if (name.length < 3) return fail('Il nome dell\u2019asilo richiede almeno 3 caratteri.');
    if (user.length < 3) return fail('Lo username richiede almeno 3 caratteri.');
    if (pw.length < 6) return fail('La password richiede almeno 6 caratteri.');

    const state = {
      v: 1,
      name: name,
      user: user,
      pass: pw,
      sections: [{ id: newId(), name: 'Sezione Unica' }],
      kids: [], memos: [], notices: [],
      menu: {}, diary: {}, meals: {},
      role: null, parentKid: null
    };

    if (!saveWithAsilo(name, state, fail)) saveFallback(name, state, fail);
  });
})();
