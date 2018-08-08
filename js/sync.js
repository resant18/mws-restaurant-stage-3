var store = {
  db: null,
 
  init: function() {
    if (store.db) { return Promise.resolve(store.db); }
    return idb.open('mwsrestaurants', 2, function(upgradeDb) {
      var dbFavorites = upgradeDb.createObjectStore('favorites', {keyPath: 'id'}); 
      dbFavorites.createIndex('by-id', 'id');   
    }).then(function(db) {
      return store.db = db;
    });
  },
 
  favorites: function(mode) {
    return store.init().then(function(db) {
      return db.transaction('favorites', mode).objectStore('favorites');
    })
  }
}

syncFavoritedRestaurants = () => { 
  console.log('syncFavoritedRestaurants');
  store.favorites('readonly') 
    .then( (favoritedRestaurants) => { 
      return favoritedRestaurants.getAll();
    })
    .then( (restaurants) => {
      return Promise.all(restaurants.map( (restaurant) => {
        console.log('restaurant id in sync:' + restaurant.is_favorite);
        let url = `${SERVER_URL}/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`;
        return fetch(url, {
          method: 'PUT'        
        })        
        .then( (response) => {
          if (!response.ok) throw Error(response.statusText);
          if (response.ok) {
            console.log('fetch ok');
            return store.favorites('readwrite').then( (favorites) => {
              console.log('delete the favorited restaurant');
              return favorites.delete(restaurant.id);              
            });
          }
        })
      }))
    })
    .catch( (err) => {
        console.log('There has been a problem with fetch operation: ', err.message);
    })
  }