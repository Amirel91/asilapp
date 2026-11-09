'use strict';
/* ============================================================
   login.js — UX di accesso e registrazione
   Modulo 1 (esistente): campo «Nome dell'asilo» primo e attivo,
     autocompletamento dall'ultimo asilo usato, riempimento demo.
   Modulo 2 (nuovo): form di registrazione user-friendly —
     password visibile/nascosta e checklist live dei requisiti.
   Zero modifiche a script.js e saas.js: solo DOM ed eventi propri.
   ============================================================ */

/* ---------- modulo 1: login ---------- */
(function () {
  if (typeof ASILO === 'undefined') return;

  const LAST = 'asilapp_last_asilo';
  const DEMO = 'Asilo Nido Arcobaleno';

  const asiloInput = () => document.getElementById('loginAsilo');
  const codeInput = () => document.getElementById('loginCode');

  /* ricorda l'ultimo asilo con cui si è fatto login su questo browser */
  function rememberAsilo(name) {
    try { localStorage.setItem(LAST, name); } catch (e) {}
  }
  function recallAsilo() {
    try { return localStorage.getItem(LAST); } catch (e) { return null; }
  }

  /* mette a fuoco il primo campo utile in base al ruolo attivo */
  function focusFirst() {
    const seg = document.querySelector('.seg-btn[aria-pressed="true"]');
    const role = seg ? seg.dataset.role : 'admin';
    const a = asiloInput(), c = codeInput();
    if (role === 'parent' && a && a.value.trim()) { if (c) c.focus(); return; }
    if (a) { a.focus(); a.select && a.select(); }
  }

  /* compila i campi demo secondo il tab attivo */
  function fillDemo() {
    const seg = document.querySelector('.seg-btn[aria-pressed="true"]');
    const role = seg ? seg.dataset.role : 'admin';
    const a = asiloInput(); if (a) a.value = DEMO;
    rememberAsilo(DEMO);
    if (role === 'admin') {
      const u = document.getElementById('loginUser'), p = document.getElementById('loginPass');
      if (u) u.value = 'admin';
      if (p) p.value = 'nido2024';
      const e = document.getElementById('loginError'); if (e) e.hidden = true;
      if (typeof toast === 'function') toast('Credenziali demo inserite: premi Accedi');
      if (a) a.focus();
    } else {
      const c = codeInput(); if (c) c.value = 'B001';
      const e = document.getElementById('loginError'); if (e) e.hidden = true;
      if (typeof toast === 'function') toast('Codice demo inserito: premi Accedi');
      if (c) c.focus();
    }
  }

  /* pulsantini demo sotto il form */
  function mountDemoBtn() {
    const box = document.querySelector('.login-demo');
    if (!box || box.querySelector('[data-action="fill-demo"]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.style.margin = '.2rem auto 0';
    b.setAttribute('data-action', 'fill-demo');
    b.textContent = '✨ Riempi i campi demo';
    box.appendChild(b);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-action="fill-demo"]')) { fillDemo(); return; }
    /* cambio tab maestre/genitori: rifocalizza il primo campo sensato */
    if (t.closest('[data-action="role-tab"]')) requestAnimationFrame(focusFirst);
    if (t.closest('[data-action="goto-login"]')) {
      requestAnimationFrame(() => { mountDemoBtn(); focusFirst(); });
    }
  });

  /* al login riuscito memorizza l'asilo: intercendo il submit e
     rileggo il campo prima che script.js possa pulirlo */
  document.addEventListener('submit', e => {
    if (e.target instanceof Element && e.target.id === 'loginForm') {
      const a = asiloInput();
      const v = a && a.value.trim();
      if (v && ASILO.resolve(v)) rememberAsilo(ASILO.resolve(v).name);
    }
  }, true); // capture: prima del handler di script.js

  window.addEventListener('load', () => {
    mountDemoBtn();
    const a = asiloInput();
    if (a && !a.value.trim()) {
      const last = recallAsilo();
      if (last && ASILO.resolve(last)) a.value = last;
    }
    /* precompila solo se siamo sulla vista login */
    const v = document.getElementById('viewLogin');
    if (v && !v.hidden) requestAnimationFrame(focusFirst);
  });
})();

/* ---------- modulo 2: registrazione user-friendly ---------- */
(function () {
  const form = document.getElementById('signupForm');
  if (!form) return;

  /* mostra/nascondi password */
  function togglePw(btn) {
    const inp = document.getElementById(btn.getAttribute('data-pw-toggle'));
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'Nascondi la password' : 'Mostra la password');
  }

  /* checklist live: riflette le regole vere di validazione */
  function refreshChecks() {
    const ul = document.getElementById('pwCheck');
    if (!ul) return;
    const name = (((document.getElementById('signupName') || {}).value) || '').trim().replace(/\s+/g, ' ');
    const p1 = ((document.getElementById('signupPass') || {}).value) || '';
    const p2 = ((document.getElementById('signupPass2') || {}).value) || '';
    const set = (need, ok) => {
      const li = ul.querySelector('[data-need="' + need + '"]');
      if (li) li.classList.toggle('ok', !!ok);
    };
    set('name', name.length >= 3);
    set('len', p1.length >= 6);
    set('match', p1.length > 0 && p1 === p2);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (t instanceof Element) {
      const btn = t.closest('[data-pw-toggle]');
      if (btn) togglePw(btn);
    }
  });

  form.addEventListener('input', refreshChecks);
  window.addEventListener('load', refreshChecks); // copia incollata di credenziali, autocomplit del browser
  refreshChecks();
})();
