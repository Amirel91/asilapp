'use strict';
/* modern.js — reveal on scroll con rete di sicurezza
   Gli elementi [data-reveal] appaiono in scivolata quando entrano
   nel viewport; dopo 3 secondi tutto è visibile comunque. */
(function () {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  const showAll = () => els.forEach(el => el.classList.add('in'));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { showAll(); return; }

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

  els.forEach(el => io.observe(el));
  setTimeout(showAll, 3000); // sicurezza: nulla resta invisibile
})();
