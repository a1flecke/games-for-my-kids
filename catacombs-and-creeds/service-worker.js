/**
 * Service Worker - Catacombs & Creeds
 * Caches all game assets for offline play.
 * Strategy: cache-first with network update on load.
 */

const CACHE_NAME = 'catacombs-creeds-v1';

const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    // Core JS
    './js/config.js',
    './js/utils.js',
    './js/input.js',
    './js/camera.js',
    './js/tilemap.js',
    './js/npc.js',
    './js/player.js',
    './js/render.js',
    './js/screens.js',
    './js/dialogue.js',
    './js/questions.js',
    './js/combat.js',
    './js/inventory.js',
    './js/save.js',
    './js/hud.js',
    './js/puzzle.js',
    './js/abilities.js',
    './js/audio.js',
    './js/game.js',
    // Content
    './content/level1_dialogue.js',
    './content/level2_dialogue.js',
    './content/level3_dialogue.js',
    './content/level4_dialogue.js',
    './content/level5_dialogue.js',
    // Data
    './data/enemies.json',
    './data/items.json',
    './data/questions.json',
    './data/levels/level1.json',
    './data/levels/level2.json',
    './data/levels/level3.json',
    './data/levels/level4.json',
    './data/levels/level5.json'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: serve from cache, update cache in background
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            // Return cached version immediately
            const fetchPromise = fetch(event.request).then(response => {
                // Update cache with fresh version for next visit
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // Network failed, return cached or offline fallback
                return cached;
            });

            return cached || fetchPromise;
        })
    );
});
