

function registerServiceWorker() {
  // check whether Sevice Worker support exist in browser or not
  if ('serviceWorker' in navigator) {
    // to improve boilerplate, delay the service worker registration until after load event fires on window  
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {scope: '/'}).then((reg) => {  
        // registration worked      
        console.log('Service worker registration succeeded. Scope is ' + reg.scope);      

        // If there’s no controller that means this page didn’t load using service worker, 
        // but load the content from the network taking the latest version. In that case, exit early.
        if (!navigator.serviceWorker.controller) {
          console.log('This page is not currently controlled by a service worker.');
          return;
        }
        
        if (reg.waiting) {
          updateReady(reg.waiting);
          console.log('Service worker is waiting');
          return;
        }

        if (reg.installing) {
          trackInstalling(reg.installing);
          console.log('Service worker is installing');
          return;
        }
    
        reg.addEventListener('updatefound', function() {
          trackInstalling(reg.installing);
          console.log('New update is found');
          return;
        });
        
      }).catch((error) => {
        // registration failed    
        console.log('Registration failed with ' + error);   
        return;
      });

      // Ensure refresh is only called once.
      // This works around a bug in "force update on reload".
      var refreshing;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        //if (refreshing) return;
        console.log('Reload...');
        window.location.reload();
        //refreshing = true;
      });
    });
  } else {
    console.log('Service worker is not supported by your browser'); 
    return;
  }
}

function updateReady(worker) {
  /*var toast = this._toastsView.show("New version available", {
    buttons: ['refresh', 'dismiss']
  });

  toast.answer.then(function(answer) {
    if (answer != 'refresh') return;*/
    window.alert('New update found');
    worker.postMessage({action: 'skipWaiting'});
  //});
}

 function trackInstalling(worker) {  
  worker.addEventListener('statechange', () => {
    if (worker.state == 'installed') {
      updateReady(worker);
    }
  });
};

registerServiceWorker();
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
/*
Copyright 2016 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var request = (this._store || this._index)[funcName].apply(this._store, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
  }
  else {
    self.idb = exp;
  }
}());

const IDB_NAME = 'mwsrestaurants';
const IDB_VERSION = 1;
const MAPBOX_TOKEN = 'pk.eyJ1IjoicmVzYW50IiwiYSI6ImNqaW5oNXpwMjA5ZnQzd3BiMmtrNWFueHYifQ.SA7IDB7hI_d6bT5RtGeQfg';
const SERVER_URL = 'http://localhost:1337/restaurants';

class Restaurant {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.neighborhood = data.neighborhood;
    this.photograph = data.photograph;
    this.address = data.address;
    this.latlng = data.latlng;    
    this.cuisine_type = data.cuisine_type;
    this.operating_hours = data.operating_hours;
    this.reviews = data.reviews;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

/****************************************************************************************************************************
 * Common database helper functions.
 ***************************************************************************************************************************/
class IDBHelper {
  /**
   * @description Function getter to set Database URL property. Change this to restaurants.json file location on your server.
   * @return URL value as string.
   */
  static get DATABASE_URL() { 
    //const port = 8000 // Change this to your server port
    const domain = window.location.href;    

    if (!window.location.origin) {
      window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
    };
    //console.log(window.location.origin);
    //return `${window.location.origin}/data/restaurants.json`;    
    return SERVER_URL; 
  };

  /**
   * Create IndexDB database in client browser. Return Promise
   */
  static get idb() {
    // If the browser doesn't support service worker or IndexedDB,
    // we don't care about having a database
    
    if ((!navigator.serviceWorker) || (!'indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return Promise.reject();
    };    
    
    return idb.open(IDB_NAME, IDB_VERSION, (upgradeDb) => {
      if (!upgradeDb.objectStoreNames.contains('restaurants')) {
        var dbRestaurants = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
        dbRestaurants.createIndex('by-id', 'id');      
      };
      /*
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        var dbReviews = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
      } */     
    });
  };
  
  /**
   * Fetch data from database
   */
  static getData(dbStore, dbIndex, check) {
    return IDBHelper.idb.then( (db) => {    
      const tx = db.transaction(dbStore);
      const store = tx.objectStore(dbStore);
      
      if ( !check ) { console.log('check=' + check); return store.getAll(); }

      const index = store.index(dbIndex);
      return index.getAll(check);
    });
  };
  
  /**
   * Add data to database
   */
  static addData(dbStore, data) {
    return IDBHelper.idb.then( (db) => {      
      const tx = db.transaction(dbStore, 'readwrite');
      const store = tx.objectStore(dbStore);   
      store.put(data);
      return tx.complete;
    })
  };

  /**
   * Search data in database
   */
  /*
  static searchData = (dbStore, dbIndex, searchKey, searchValue) => {
    let results = [];
    return IDBHelper.idb.then( (db) => {
      const tx = db.transaction(dbStore, 'readwrite');
      const store = tx.objectStore(dbStore);

      if ( !dbIndex ) { return store.openCursor(); }
      const index = store.index(dbIndex);
      return index.openCursor(); // return data sorted by index.
    })
    .then(findItem = (cursor) => {
      if (!cursor) return;
      if ( cursor.value[searchKey] == searchValue ) {
          results.push(cursor.value);
      }
      return cursor.continue().then(findItem);
    })
    .then(() => { return results; })
  };
  */


/**************************************************************************************************************************
   * Functions for Restaurants 
 *************************************************************************************************************************/


  
  /**
   * Add Restaurant data to database.
   * Check if the data was stored before, if not then add data to database. 
   */
  static addToDatabase(restaurant) {    
    return new Promise((resolve, reject) => {      
      IDBHelper.getData('restaurants', 'by-id', restaurant.id)
        .then((restaurants) => {                      
            if ( restaurants.length === 1 ) return resolve(restaurant);
            IDBHelper.addData('restaurants', restaurant).then(() => { resolve(restaurant) });
        })
        .catch(err => {                    
          const error = (`Addding data to database failed. Returned status of ${err}`);            
          //callback(error, null);
          reject(error);
        });
    })
  }

  /**
   * Fetch Restaurant Data.
   * Check if the data was stored before, if not then add data to database. 
   * Return restaurants data
   */
  
  static fetchRestaurants() {    
    let fetchedRestaurants;
    return fetch(IDBHelper.DATABASE_URL)            //fetch from the network    
      .then( (response) => response.json())       
      .then( (restaurants) => {                     // copy to Restaurant object class 
        //console.log('restaurants='+restaurants);                           
        return restaurants.map( (restaurant) => new Restaurant(restaurant));        
      })      
      .then( (restaurants) => {                      // save Restaurant objects class to database                       
        fetchedRestaurants = restaurants;       
        //console.log('Fetched restaurants='+fetchedRestaurants);
        let sequence = Promise.resolve();
        /*if (saveToDatabase)*/ 
        restaurants.forEach((restaurant) => sequence = sequence.then(() => IDBHelper.addToDatabase(restaurant)) );
        //console.log('Sequence='+sequence);        
        return sequence;        
      })      
      .then(() => {        
        //console.log('return fetchedRestaurants= '+fetchedRestaurants);
        return fetchedRestaurants;
      })      
      .catch(err => {                    
        const error = (`Fetching restaurant data failed. Returned status of ${err}`);            
        //callback(error, null);
        return Promise.reject(error);
      }); 
  }
  
  /**
   * Fetch a restaurant by its ID.
   */
  
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling. 
    console.log('fetching restaurant based on id');
    return IDBHelper.fetchRestaurants()
      .then( (restaurants) => {    
        //console.log(restaurants);
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          return Promise.resolve(restaurant);
        } else {
          return Promise.reject(error);
        }
      });    
  }

  /**
   * This function is not used
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    console.log('fetch restauranrt by cuisine');
    IDBHelper.fetchRestaurants( (error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * This function is not used
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    console.log('fetch restauranrt by neighborhood');
    IDBHelper.fetchRestaurants( (error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return IDBHelper.fetchRestaurants( (restaurants) => {   
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      return Promise.resolve(results);
    })
    .catch(err => {                    
      const error = (`Fetch restaurants data by cuisine and neighborhood failed. Returned status of ${err}`);                    
      return Promise.reject(error);
    }); 
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(restaurants) {
    //console.log(IDBHelper.fetchRestaurants);
    // Fetch all restaurants
    return new Promise( (resolve, reject) => {      
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
      return resolve(uniqueNeighborhoods);  
    })    
    .catch( (err) => {                    
      const error = (`Fetching neighborhoods data failed. Returned status of ${err}`);                    
      return reject(error);
    });   
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(restaurants) {
    // Fetch all restaurants
    return new Promise( (resolve, reject) => {       
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
      return resolve(uniqueCuisines);        
    })
    .catch(err => {                    
      const error = (`Fetching cuisine data failed. Returned status of ${err}`);                    
      return reject(error);
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/dist/img/${restaurant.photograph}`);
  }

  /**
   * Leaflet Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: IDBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 


}; // End of Database helper class
  


let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = [];



/**
 * Start ***
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  updateRestaurants().then(restaurants => {       
    fetchNeighborhoods(self.restaurants);
    fetchCuisines(self.restaurants);
  })  
})

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = (restaurants) => {
  IDBHelper.fetchNeighborhoods(restaurants)
    .then(neighborhoods => {    
        self.neighborhoods = neighborhoods;
        fillNeighborhoodsHTML();
    })
    .catch(err => {                    
      const error = (`Fill neighborhoods data filter failed. Returned status of ${err}`);            
      console.log(error);
    });   
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = (restaurants) => {
  IDBHelper.fetchCuisines(restaurants)
    .then(cuisines => {    
      self.cuisines = cuisines;
      fillCuisinesHTML();
  })
  .catch(err => {                    
    const error = (`Fill cuisine data filter failed. Returned status of ${err}`);            
    console.log(error);
  });    
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/** 
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: MAPBOX_TOKEN,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  //updateRestaurants();
}


/**
 * Update page and map for current restaurants.
 */
 /*
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;
 
  IDBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then( (restaurants) => {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();      
    })
    .catch(err => {                    
      console.log(error);
    }); 
}
*/

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  return new Promise ( (resolve, reject) => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    return IDBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
      .then( (restaurants) => {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();      
        resolve(restaurants);
      })
      .catch(err => {                    
        console.log(err);
        reject(err);
      }); 
  });
}


/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  const span = document.getElementById('total-restaurant-list');

  span.innerHTML = `${restaurants.length} restaurant${(restaurants.length === 0) ? '' : 's'} found`;
  restaurants.forEach(restaurant => {        
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  // implement responsive image using picture element with breakpoint 789px
  const picture = document.createElement('picture');
  const image = document.createElement('img');
  const source1 = document.createElement('source');
  const source2 = document.createElement('source');
  const imageName = IDBHelper.imageUrlForRestaurant(restaurant).replace(/\.[^/.]+$/, '');
  
  image.className = 'restaurant-img';
  image.src = `${imageName}_medium.jpg`;
  image.alt = restaurant.name;
  source1.media = '(max-width: 789px)';
  source1.srcset = `${imageName}_small.webp`;
  source2.media = '(min-width: 790px)'
  source2.srcset = `${imageName}_medium.webp`;  
  li.append(picture);
  picture.append(source1);
  picture.append(source2);
  picture.append(image);
  
  const name = document.createElement('h3');  
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);  

  const more = document.createElement('a');  
  more.setAttribute('aria-label', `View restaurant details of ${restaurant.name}`);
  more.innerHTML = 'View Details';  
  more.href = IDBHelper.urlForRestaurant(restaurant);
  more.alt = 'View Details';
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = IDBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 

/**
 * Reset Neighborhood and Cuisine filter
 */
resetFilter = () => {
  const neighborhoods = document.getElementById('neighborhoods-select');
  const cuisines = document.getElementById('cuisines-select');

  neighborhoods.options.selectedIndex = 0;
  cuisines.options.selectedIndex = 0;
  updateRestaurants();
}

let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => { 
  console.log('Page is loaded'); 
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL()
  .then( (restaurant) => {    
    self.newMap = L.map('map', {
      center: [restaurant.latlng.lat, restaurant.latlng.lng],
      zoom: 16,
      scrollWheelZoom: false
    });
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
      mapboxToken: MAPBOX_TOKEN,
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'    
    }).addTo(newMap);
    fillBreadcrumb();
    IDBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  })
  .catch( (err) => {
    console.log(err);
  }); 
}

/*
Old Google Map
window.initMap = () => {  
  fetchRestaurantFromURL()
  .then( (restaurant) => {
    
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: restaurant.latlng,
      scrollwheel: false
    });
    fillBreadcrumb();
    console.log(self.restaurant);
    console.log(self.map);
    IDBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  })
  .catch( (err) => {
    console.log(err);
  })  
}
*/

/**
 * Get current restaurant from page URL.
 */

fetchRestaurantFromURL = () => {
  return new Promise( (resolve, reject) => {    
    if (self.restaurant) { // restaurant already fetched!
      resolve(self.restaurant);
    }
    const id = getParameterByName('id');    
    if (!id) { // no id found in URL
      error = 'No restaurant id in URL'
      reject(error);
    } else {
      IDBHelper.fetchRestaurantById(id)
        .then( (restaurant) => {
          //console.log(restaurant);
          self.restaurant = restaurant;
          if (!restaurant) {
            console.error(error);
            reject(error);
          }
          fillRestaurantHTML();
          resolve(restaurant);
        });
    }
  })
  
}


/*
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    IDBHelper.fetchRestaurantById(id, (error, restaurant) => {      
      self.restaurant = restaurant;
      console.log('restaurant =' + self.restaurant);
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}
*/

/**
 * Generate randomly Bacon ipsum (in place of Lorem ipsum) for restaurant description
 */

randomIpsumeGenerator = () => {
  // These lines are taken from Bacon Ipsum: https://baconipsum.com/?paras=5&type=all-meat&start-with-lorem=1
  const lines = [
    'Bacon ipsum dolor amet jowl chuck pork loin. ',
    'Ball tip burgdoggen alcatra cow tri-tip beef, swine buffalo brisket spare ribs pork. ',
    'Landjaeger turkey filet mignon cow kielbasa sausage picanha sirloin. ',
    'Kevin sirloin ham pancetta tenderloin, drumstick sausage short ribs cow leberkas chuck cupim shankle. '
  ];

  const random_quote = lines[Math.floor(Math.random() * lines.length)];  
  
  let
    num = Math.floor(Math.random() * (3 - 2 + 1) + 2),    
    generatedLines = ''
  ;  
  for (var i = 0; i < num; i++) { generatedLines += (random_quote + ' '); }
  return generatedLines;
}
 

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const restaurantDescription = randomIpsumeGenerator();
  const description = document.getElementById('restaurant-description');
  description.innerHTML = restaurantDescription;

  const image = document.getElementById('restaurant-img');
  const picture = document.getElementById('restaurant-img-responsive');
  const imageName = IDBHelper.imageUrlForRestaurant(restaurant).replace(/\.[^/.]+$/, '');
  const source1 = document.createElement('source');
  const source2 = document.createElement('source');    
  image.className = 'restaurant-img'
  image.src = `${imageName}_medium.jpg`;
  image.alt = restaurant.name;
  source1.media = '(max-width: 789px)';
  source1.srcset = `${imageName}_medium.webp`;
  source2.media = '(min-width: 790px)'
  source2.srcset = `${imageName}_large.webp`;  
  picture.prepend(source2);
  picture.prepend(source1);  

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.classList.add('revname');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');  
  date.innerHTML = review.date;
  date.classList.add('revdate');
  li.appendChild(date);

  const rating = document.createElement('p');
  
  rating.innerHTML = `Rating: ${createRatingStar(review.rating)}`;
  rating.classList.add('revrating');
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.classList.add('revcomments');
  li.appendChild(comments);

  return li;
}

createRatingStar = (rating) => {
  const rating_max = 5;
  let rating_html = '';
  let i = 1;
  while (i <= rating_max) {
    if ((i <= rating) && (i <= rating_max)) {
      rating_html += `<span class='fa fa-star checked'></span>`;
    } else {
      rating_html += `<span class='fa fa-star'></span>`;
    }
    i++;
  }  
  return rating_html;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);    
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
