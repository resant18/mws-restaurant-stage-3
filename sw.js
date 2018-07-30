let staticCacheName = 'mws-static-v1';
let contentImgsCache = 'mws-content-imgs';
let allCaches = [
  staticCacheName,
  contentImgsCache
];

let staticFilesName = [
  '/dist/img/favicon.png',
  '/dist/img/favicon-196.png',  
  '/dist/img/favicon-512.png',  
  '/index.html',
  '/restaurant.html',
  '/dist/css/styles.css',
  '/js/lib/idb.js', 
  '/js/idbhelper.js',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/dist/js/bundle.min.js',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css' 
]

self.addEventListener('install', (event) => {  
  console.log('Install service worker and cache static assets');
  event.waitUntil(
    caches.open(staticCacheName)
    .then( (cache) => {
      console.log('Caching sucess'); //test
      return cache.addAll(staticFilesName);
    })    
  );
});

self.addEventListener('activate', (event) => {
  console.log('Activating new service worker...');
  //TODO: create database in this event based on article: https://developers.google.com/web/ilt/pwa/live-data-in-the-service-worker#storing_data_with_indexeddb
  event.waitUntil(
    caches.keys().then( (cacheNames) => {
      return Promise.all(
        // only get the caches that start with mws and delete other caches.
        cacheNames.filter( (cacheName) => {
          return cacheName.startsWith('mws-') &&
                 !allCaches.includes(cacheName);
        }).map( (cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  //console.log(`Fetching ${event.request.url}`);
  event.respondWith(
    caches.open(allCaches).then( (cache) => {
      return cache.match(event.request).then( (response) => {
        return response || fetch(event.request).then( (response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});

// this function will be called by statement worker.postMessage({action: 'skipWaiting'}); from the active page
self.addEventListener('message', (event) => {
  console.log('Perform skip waiting');
  if (event.data.action === 'skipWaiting') {
    console.log('skip waiting....');
    self.skipWaiting();
  }
});