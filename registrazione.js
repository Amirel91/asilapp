'use strict';
/* ============================================================
   registrazione.js — iscrizione asilo dalla pagina dedicata
   Replica la logica di saas.js (registry + stato iniziale)
   senza caricare tutta l'app, poi rimanda alla home loggata.
   ============================================================ */
(function () {
  const REG = 'asilapp_registry';
  const CUR = 'asilapp_cur';

  const $ = id => document.getElementById(id);
  const form = $('signupForm');
  if (!form) return;

  const slug = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asilo';

  function registry() {
    try {
      const r = JSON.parse(localStorage.getItem(REG));
      return Array.isArray(r) ? r.filter(a => a && a.id && a.name) : [];
    } catch (e) { return []; }
  }
  const saveReg = r => { try { localStorage.setItem(REG, JSON.stringify(r)); } catch (e) {} };

  /* mostra/nascondi password */
  document.addEventListener('click', e => {
    const b = e.target instanceof Element && e.target.closest('[data-pw-toggle]');
    if (!b) return;
    const inp = $(b.getAttribute('data-pw-toggle'));
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.textContent = show ? '🙈' : '👁';
    b.setAttribute('aria-pressed', String(show));
  });

  /* checklist live */
  function refresh() {
    const ul = $('pwCheck');
    if (!ul) return;
    const name = (($('signupName') || {}).value || '').trim().replace(/\s+/g, ' ');
    const p1 = ($('signupPass') || {}).value || '';
    const p2 = ($('signupPass2') || {}).value || '';
    const set = (need, ok) => {
      const li = ul.querySelector('[data-need="' + need + '"]');
      if (li) li.classList.toggle('ok', !!ok);
    };
    set('name', name.length >= 3);
    set('len', p1.length >= 6);
    set('match', p1.length > 0 && p1 === p2);
  }
  form.addEventListener('input', refresh);
  window.addEventListener('load', refresh);
  refresh();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('signupErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;

    const name = (($('signupName') || {}).value || '').trim().replace(/\s+/g, ' ');
    const pw = ($('signupPass') || {}).value || '';
    const pw2 = ($('signupPass2') || {}).value || '';
    if (name.length < 3) return fail('Il nome dell\u2019asilo richiede almeno 3 lettere.');
    if (pw.length < 6) return fail('La password richiede almeno 6 caratteri.');
    if (pw !== pw2) return fail('Le due password non coincidono.');
    if (registry().some(a => a.slug === slug(name))) return fail('Esiste già un asilo con questo nome su questo dispositivo.');

    const id = 'a' + Math.random().toString(36).slice(2, 9);
    const st = {
      v: 1, school: name, pw,
      sections: [{ id: 's' + Math.random().toString(36).slice(2, 8), name: 'Sezione unica' }],
      kids: [], memos: [], menu: {}, meals: {}, diary: {}, msgs: [],
      role: null, parentKid: null
    };
    try {
      localStorage.setItem('asilapp_t_' + id, JSON.stringify(st));
    } catch (e2) { return fail('Salvataggio non riuscito: memoria del browser piena?'); }

    const r = registry();
    r.push({ id, name, slug: slug(name) });
    saveReg(r);
    try { sessionStorage.setItem(CUR, id); } catch (e3) {}

    const btn = $('signupBtn');
    if (btn) { btn.disabled = true; btn.textContent = '\u2713 Asilo creato: ti porto dentro\u2026'; }
    setTimeout(() => { location.href = 'index.html'; }, 500);
  });
})();
