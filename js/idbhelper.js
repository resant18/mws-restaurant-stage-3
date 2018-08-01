const IDB_NAME = 'mwsrestaurants';
const IDB_VERSION = 1;
const MAPBOX_TOKEN = 'pk.eyJ1IjoicmVzYW50IiwiYSI6ImNqaW5oNXpwMjA5ZnQzd3BiMmtrNWFueHYifQ.SA7IDB7hI_d6bT5RtGeQfg';
const SERVER_URL = 'http://localhost:1337';



/****************************************************************************************************************************
 * Common database helper functions.
 ***************************************************************************************************************************/
class IDBHelper {
  /**
   * @description Function getter to set Database URL property. Change this to restaurants.json file location on your server.
   * @return URL value as string.
   */
  static get DATABASE_URL() { 
    if (!window.location.origin) {
      window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    };    
    return window.location.origin; 
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
      
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        var dbReviews = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
        dbReviews.createIndex('by-id', 'id');              
      }      
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





}; // End of Database helper class
  

