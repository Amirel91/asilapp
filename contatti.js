'use strict';
/* contatti.js — validazione e compilazione mailto (nessun backend) */
(function () {
  const $ = id => document.getElementById(id);
  const form = $('contactForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('ccErr');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    $('ccOk') && ($('ccOk').hidden = true);

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
    const ok = $('ccOk');
    if (ok) ok.hidden = false;
    setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = 'Invia il messaggio'; } }, 4000);
  });
})();
