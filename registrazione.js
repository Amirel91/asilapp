'use strict';
/* registrazione.js — crea lo spazio asilo (localStorage, nessun backend)
   Riusa i globali di script.js quando presenti (ASILO); altrimenti
   salva direttamente nella chiave dello spazio scelto. */
(function () {
  const $ = id => document.getElementById(id);
  const form = $('regForm');
  if (!form) return;

  const PREFIX = 'asilapp_v1_';
  const norm = s => String(s || '').trim().replace(/\s+/g, ' ');
  const slug = s => norm(s).toLowerCase();

  /* ---------- indicatore robustezza password ---------- */
  const pass = $('rgPass'), bar = $('rgBar'), meter = $('rgMeter'), txt = $('rgMeterTxt');
  function score(v) {
    let s = 0;
    if (v.length >= 8) s++;
    if (v.length >= 12) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^a-zA-Z0-9]/.test(v)) s++;
    return Math.min(s, 4); // 0-4
  }
  pass && pass.addEventListener('input', () => {
    const v = pass.value;
    if (!bar || !meter || !txt) return;
    meter.hidden = false;
    const lv = score(v);
    bar.dataset.lv = String(lv);
    txt.textContent = ['Scegli una password che ricorderai: non è recuperabile.',
      'Debole: allunga la password.',
      'Ci siamo: aggiungi numeri o maiuscole.',
      'Buona: ancora un simbolo e siamo a posto.',
      'Ottima: difficile da indovinare.'][lv];
  });

  /* ---------- submit ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('rgErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;

    const school = norm($('rgSchool').value);
    const user = norm($('rgUser').value);
    const pw = $('rgPass').value;

    if (school.length < 3) return fail('Scrivi il nome dell\u2019asilo (almeno 3 lettere).');
    if (user.length < 3) return fail('Lo username richiede almeno 3 caratteri.');
    if (pw.length < 8) return fail('La password richiede almeno 8 caratteri.');

    const key = PREFIX + slug(school);
    let existing = null;
    try { existing = JSON.parse(localStorage.getItem(key)); } catch (e) { existing = null; }
    if (existing && existing.school) return fail('Esiste già uno spazio con questo nome su questo dispositivo: scegli un nome diverso o accedi.');

    const state = {
      v: 1,
      school,
      user,
      pass: btoa(unescape(encodeURIComponent(pw))),
      sections: [{ id: 'sec_' + Date.now().toString(36), name: 'Sezione Unica' }],
      kids: [], memos: [], menu: {}, meals: {}, diary: {}, notices: [],
      role: null, parentKid: null
    };
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e2) {
      return fail('Salvataggio non riuscito: memoria del browser piena?');
    }

    /* seleziona lo spazio appena creato e vai al login */
    try {
      localStorage.setItem('asilapp_current', slug(school));
    } catch (e3) {}
    const btn = $('rgBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Spazio creato ✓ Ti porto al login…'; }
    setTimeout(() => { location.href = 'index.html'; }, 900);
  });

  /* «Accedi col nome del tuo asilo» */
  const loginLink = $('rgLogin');
  loginLink && loginLink.addEventListener('click', () => {
    try { localStorage.removeItem('asilapp_current'); } catch (e) {}
    location.href = 'index.html';
  });
})();
