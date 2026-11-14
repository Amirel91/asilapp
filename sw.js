'use strict';
/* ============================================================
   sw.js — service worker di Asilapp (PWA)
   Strategia: PRIMA la rete, POI la cache.
   Perché: con la vecchia cache-first i deploy non si vedevano
   mai sui dispositivi che avevano già il worker installato.
   Ora ogni visita aggiorna HTML e CSS dal server; la cache
   serve solo da ripiego quando sei offline.
   ============================================================ */

const VERSION = 'asilapp-sw-v3';

const PRECACHE = [
  './',
  './index.html',
  './info.html',
  './registrazione.html',
  './contatti.html',
  './style.css',
  './landing.css',
  './landing-extra.css',
  './icon.svg',
  './manifest.webmanifest'
];

/* install: precache best-effort (una risorsa mancante non blocca le altre)
   e subentra subito, senza aspettare che le schede vecchie si chiudano */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(VERSION).then(cache =>
      Promise.all(PRECACHE.map(u => cache.add(u).catch(() => null)))
    )
  );
});

/* activate: BUTTA VIA tutte le cache che non sono di questa versione
   (qui muore la vecchia cache con i CSS obsoleti) e prende il controllo
   delle schede già aperte */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

/* fetch: network-first per tutto ciò che è di questo origine.
   Online → sempre la versione fresca (e la cache si aggiorna).
   Offline → l'ultima copia salvata; per le navigazioni, la home. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // font Google: rete diretta

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200) {
        try {
          const cache = await caches.open(VERSION);
          cache.put(req, fresh.clone());
        } catch (e) { /* cache piena o non scrivibile: si prosegue */ }
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const home = await caches.match('./index.html', { ignoreSearch: true });
        if (home) return home;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
