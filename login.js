'use strict';
/* ============================================================
   login.js — rifinitura UX del login
   - campo «Nome dell'asilo» sempre primo e attivo, per maestre
     e genitori: ogni accesso parte dalla struttura giusta
   - autocompletamento dal nome già usato in questo browser
   - bottone «Prova demo» che riempie i campi giusti per ruolo
   Zero modifiche a script.js: usa i globali show, setRoleTab, ASILO.
   ============================================================ */
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
