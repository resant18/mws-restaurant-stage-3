/*var store = {
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


*/

syncFavoritedRestaurants = () => {
  console.log('sync process begins');
  IDBHelper.getData('favorites', 'by-id')    
    .then((favoritedRestaurant) => {     
      console.log("favorites restaurant is " + favoritedRestaurant.length) 
      favoritedRestaurant.forEach( (restaurant) => {
        postFavoritedRestaurants(restaurant.id, restaurant.is_favorite);
      })
    })
}

postFavoritedRestaurants = (restaurant_id, is_favorite) => {    
  let url = `${SERVER_URL}/restaurants/${restaurant_id}/?is_favorite=${is_favorite}`;
    fetch(url, {
      method: 'PUT'        
    })    
    .then( (response) => {
      if(response.ok) {
        console.log('update data in server succeed');
        IDBHelper.removeData('favorites', false, 'id', restaurant_id);  
      }
    })
    .catch( (error) => {
      console.log('There has been a problem with your fetch operation: ', error.message);
    });
}









/*
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
  */