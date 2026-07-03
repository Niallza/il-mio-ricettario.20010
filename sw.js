// Service Worker reale per Ricettario Pro
// Strategia: "stale-while-revalidate" — mostra subito la versione salvata (se c'è)
// e in parallelo scarica quella aggiornata dalla rete per la prossima volta.
// Così l'app si apre anche offline, e resta comunque aggiornata quando c'è connessione.

const CACHE_NAME = 'ricettario-cache-v1';

// Risorse dell'app da salvare per l'avvio offline.
// Se cambi il nome del file HTML principale, aggiornalo anche qui.
const APP_SHELL = [
    './',
    './index.html',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .catch((err) => console.warn('Impossibile pre-caricare tutte le risorse:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((nomiCache) =>
            Promise.all(nomiCache.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Non toccare le chiamate al database Firebase: devono sempre passare dalla rete.
    if (event.request.method !== 'GET' || event.request.url.includes('firebasedatabase.app') || event.request.url.includes('firebaseio.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((rispostaSalvata) => {
            const richiestaRete = fetch(event.request)
                .then((rispostaRete) => {
                    if (rispostaRete && rispostaRete.status === 200) {
                        const copia = rispostaRete.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
                    }
                    return rispostaRete;
                })
                .catch(() => rispostaSalvata); // offline: usa la cache se la rete fallisce

            return rispostaSalvata || richiestaRete;
        })
    );
});
