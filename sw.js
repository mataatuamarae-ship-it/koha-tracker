const CACHE_NAME = 'koha-tracker-v8';
const APP_SHELL = [
  './',
  './index.html',
  './koha-tracker-offline.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './marae-logo.png',
  './shared.css',
  './shared.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    // Save each file on its own — cache.addAll() is all-or-nothing, so one
    // failed download (e.g. the CDN on a weak connection) used to mean
    // nothing at all got saved for offline use.
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(APP_SHELL.map(url => cache.add(url))))
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Supabase API / realtime traffic — always go live.
  if (url.hostname.endsWith('supabase.co')) return;
  if (event.request.method !== 'GET') return;

  // Network-first, with a time limit. On good signal this behaves exactly
  // like plain network-first (latest code, cache refreshed). On WEAK signal
  // — where a request can hang 30s+ before failing — we give the network 3
  // seconds, then show the saved copy instead of a blank screen; the network
  // request carries on in the background and refreshes the saved copy for
  // next time. With nothing saved yet, we just keep waiting for the network.
  const req = event.request;
  let putDone = null;
  const network = fetch(req).then(res => {
    if (res && res.status === 200) {
      const copy = res.clone();
      putDone = caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    }
    return res;
  });
  // Keep the service worker alive until the background refresh is saved.
  event.waitUntil(network.then(() => putDone).catch(() => {}));

  event.respondWith((async () => {
    const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS, TIMED_OUT));
    try {
      const first = await Promise.race([network, timeout]);
      if (first !== TIMED_OUT) return first;
      const saved = await savedCopy(req);
      return saved || await network;
    } catch (e) {
      const saved = await savedCopy(req);
      return saved || Response.error();
    }
  })());
});

const NETWORK_TIMEOUT_MS = 3000;
const TIMED_OUT = Symbol('timed-out');
// Exact match first; then the same page ignoring ?query (e.g. view.html?hui=…).
function savedCopy(req) {
  return caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true }));
}
