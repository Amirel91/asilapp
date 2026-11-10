'use strict';
/* ============================================================
   modern.js — micro-interazioni condivise (tutte le pagine)
   1) Reveal on scroll: dialetto UNICO con landing-extra.css
      (il markup scrive class="reveal", il CSS mostra con
      .reveal.in, qui si aggiunge esattamente quella classe)
   2) Rete di sicurezza: dopo 3.5s tutto è visibile comunque,
      registrata PRIMA di ogni return anticipato
   3) Nessuna dipendenza, nessun selettore [data-*]: la fonte
      di verità del reveal è la classe .reveal nel markup
   ============================================================ */
(function () {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  const showAll = () => els.forEach(el => el.classList.add('in'));

  // rispetto per chi riduce le motion: tutto visibile subito
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { showAll(); return; }

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // rete di sicurezza: se qualcosa resta fuori viewport (o l'observer
  // non scatta per layout insoliti), il contenuto compare comunque
  setTimeout(() => { showAll(); io.disconnect(); }, 3500);

  els.forEach(el => io.observe(el));
})();
