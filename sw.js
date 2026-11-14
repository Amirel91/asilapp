'use strict';
/* ============================================================
   sw.js — service worker di Asilapp, strategia anti-stallo
   Il vecchio approccio cache-first teneva in vita CSS e HTML
   stantii anche dopo i deploy: i fix erano online ma il browser
   continuava a mostrare i file vecchi. Nuova strategia:
   - HTML, CSS, JS e manifest → rete prima, cache come ripiego:
     ogni deploy si vede dal primo reload, senza hard refresh
   - Immagini, icone e font → cache-first (asset stabili, i nomi
     dei file generati sono unici)
   - activate → pulizia di TUTTE le cache che non sono quella
     corrente + skipWaiting + clients.claim: anche chi era rimasto
     bloccato sulla versione vecchia si sblocca da solo al
     primo ritorno sul sito
   ============================================================ */

const CACHE = 'asilapp-net-1';

/* shell minima per l'offline: tutti i percorsi esistono nel progetto */
const SHELL = [
  './',
  './index.html',
  './style.css',
  './landing.css',
  './landing-extra.css',
  './icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // anche se un asset manca, il worker parte
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    } catch (e) { /* pulizia best-effort */ }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== location.origin) return; // font Google & co: gestiti dal browser

  /* asset stabili: cache-first */
  if (/\.(?:png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  /* HTML, CSS, JS, manifest: rete prima, cache come ripiego offline */
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() =>
      caches.match(req).then(hit =>
        hit ||
        caches.match('./index.html').then(shell => shell || new Response(
          'Sei offline: riapri Asilapp quando torna la connessione.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        ))
      )
    )
  );
});
