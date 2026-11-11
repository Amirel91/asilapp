'use strict';
/* ============================================================
   contatti.js — pagina Contatti, completamente autonoma
   1) Reveal locale: .reveal → .in con IntersectionObserver e
      rete di sicurezza a tempo (registrata PRIMA di ogni
      return anticipato): la pagina non resta mai invisibile
   2) Form: validazione lato client + mailto precompilato
   Nessun backend, nessuna dipendenza da altri script.
   ============================================================ */
(function () {

  /* ---------- 1) reveal ---------- */
  (function () {
    const els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;

    const showAll = () => els.forEach(el => el.classList.add('in'));

    // rete di sicurezza: dopo 1.2s tutto visibile comunque
    const safety = setTimeout(showAll, 1200);

    if (!('IntersectionObserver' in window)) {
      clearTimeout(safety);
      showAll();
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
      const all = els.every(el => el.classList.contains('in'));
      if (all) { clearTimeout(safety); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => io.observe(el));
  })();

  /* ---------- 2) form → mailto ---------- */
  const $ = id => document.getElementById(id);
  const form = $('contactForm');
  if (!form) return;

  const BTN_TXT = 'Invia il messaggio';

  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('ccErr');
    const ok = $('ccOk');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    if (ok) ok.hidden = true;

    const name = (($('ccName') || {}).value || '').trim().replace(/\s+/g, ' ');
    const mail = (($('ccMail') || {}).value || '').trim();
    const msg = (($('ccMsg') || {}).value || '').trim();

    if (name.length < 2) return fail('Scrivi il tuo nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return fail('L\u2019email non sembra valida.');
    if (msg.length < 10) return fail('Il messaggio richiede almeno 10 caratteri.');

    const subject = encodeURIComponent('Asilapp — messaggio da ' + name);
    const body = encodeURIComponent(msg + '\n\n—\n' + name + ' <' + mail + '>');

    const btn = $('ccBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Apro la tua posta…'; }
    location.href = 'mailto:ciao@asilapp.it?subject=' + subject + '&body=' + body;

    if (ok) ok.hidden = false;
    setTimeout(() => {
      if (btn) { btn.disabled = false; btn.textContent = BTN_TXT; }
    }, 4000);
  });
})();
