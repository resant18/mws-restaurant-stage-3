const IDB_NAME = 'mwsrestaurants';
const IDB_VERSION = 2;
const MAPBOX_TOKEN = 'pk.eyJ1IjoicmVzYW50IiwiYSI6ImNqaW5oNXpwMjA5ZnQzd3BiMmtrNWFueHYifQ.SA7IDB7hI_d6bT5RtGeQfg';
const SERVER_URL = location.protocol + "//" + location.hostname + ":1337";
// const SERVER_URL = 'http://localhost:1337';
// const SERVER_URL = 'https://restaurant-review-pwa.herokuapp.com';



/****************************************************************************************************************************
 * Common database helper functions.
 ***************************************************************************************************************************/
class IDBHelper {
  /**
   * @description Function getter to set Database URL property. Change this to restaurants.json file location on your server.
   * @return URL value as string.
   */
  // static get DATABASE_URL() { 
  //   if (!window.location.origin) {
  //     window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  //   };            
  //   return window.location.origin; 
  // };

  /**
   * Create IndexDB database in client browser. Return Promise
   */
  static get idb() {    
    return idb.open(IDB_NAME, IDB_VERSION, (upgradeDb) => {
      // //console.log('open database');
      switch(upgradeDb.oldVersion) {
        case 0:        
          var dbRestaurants = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
          dbRestaurants.createIndex('by-id', 'id');              
        case 1:        
          var dbReviews = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});            
          dbReviews.createIndex('by-id', 'id');  
          dbReviews.createIndex('by-restaurantId', 'restaurant_id');  
          dbReviews.createIndex('by-status', 'status');                    
        case 2:        
          var dbFavorites = upgradeDb.createObjectStore('favorites', {keyPath: 'id'}); 
          dbFavorites.createIndex('by-id', 'id');               
      }
    })
    .catch(err => {                    
      const error = (`Open database failed. Returned status of ${err}`);                    
      return Promise.reject(error);
    }); 
  };
  
  /**
   * Fetch data from database
   */
  static getData(dbStore, dbIndex, check) {
    return IDBHelper.idb.then( (db) => {    
      const tx = db.transaction(dbStore);
      const store = tx.objectStore(dbStore);
      
      if ( !check ) return store.getAll();

      const index = store.index(dbIndex);
      return index.getAll(check);
    })
    .catch(err => {                    
      const error = (`Fetch data failed. Returned status of ${err}`);                    
      return Promise.reject(error);
    }); 
  };
  
  /**
   * Add/update data to database
   */
  static addData(dbStore, data) {
    return IDBHelper.idb.then( (db) => {      
      const tx = db.transaction(dbStore, 'readwrite');
      const store = tx.objectStore(dbStore);   
      store.put(data);
      return tx.complete;
    })
    .catch(err => {                    
      const error = (`Add data to database failed. Returned status of ${err}`);                    
      return Promise.reject(error);
    }); 
  };

  static removeData(dbStore, dbIndex, searchKey, searchValue) {
    return IDBHelper.idb.then( (db) => {
        const tx = db.transaction(dbStore, 'readwrite');
        const store = tx.objectStore(dbStore);

        if ( !dbIndex ) { return store.openCursor(); }
        const index = store.index(dbIndex);
        return index.openCursor();
    })
    .then(function deleteItem(cursor) {
        if (!cursor) return;
        if ( cursor.value[searchKey] == searchValue ) {
            cursor.delete();
        }
        return cursor.continue().then(deleteItem);
    })
    .then( () => { return true; })
    .catch(err => {                    
      const error = (`Remove data from database failed. Returned status of ${err}`);                    
      return false;
    }); 
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
  

