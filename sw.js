
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
//   '/index.html',
//   '/restaurant.html',
//   '/dist/css/styles.css',
//   '/js/lib/idb.js', 
//   '/js/idbhelper.js',
//   '/js/main.js',
//   '/js/restaurant_info.js',
//   '/dist/js/bundle.min.js',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css' 
]

//importScripts("js/sync.js");
//importScripts("js/idbhelper.js");


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
  var requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith('/dist/img/restaurants/')) {      
      event.respondWith(serveRestaurantPhoto(event.request));
      return;
    }

    event.respondWith(
      caches.match(event.request).then( (response) => {
        return response || fetch(event.request);
      })
    );
  }
  
});

function serveRestaurantPhoto(request) {
  var storageUrl = request.url.replace(/_[a-zA-Z0-9]+\.(jpg|webp)$/, '');
  return caches.open(contentImgsCache).then(function(cache) {
    //console.log('begin');
    //console.log('url=' + storageUrl);    
    return cache.match(storageUrl).then( (response) => {   
      //console.log(`response for ${storageUrl}:`);
      //console.log(response);     
      var networkFetch = fetch(request).then( (networkResponse) => {
        //console.log(`network response for ${storageUrl}:`);
        //console.log(networkResponse);        
        cache.put(storageUrl, networkResponse.clone());
        //console.log('put in the cache');        
        return networkResponse;                
      });
      return response || networkFetch;      
    });
    //console.log('end');
  })
}

// this function will be called by statement worker.postMessage({action: 'skipWaiting'}); from the active page
self.addEventListener('message', (event) => {
  console.log('Perform skip waiting');
  if (event.data.action === 'skipWaiting') {
    console.log('skip waiting....');
    self.skipWaiting();
  }
});

importScripts("js/lib/idb.js");
importScripts("js/idbhelper.js");
importScripts("js/sync.js");  

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {        
    event.waitUntil(syncFavoritedRestaurants());       
  };  
})




             
