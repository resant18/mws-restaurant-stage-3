syncFavoritedRestaurants = () => {
  //console.log('sync process begins');
  IDBHelper.getData('favorites', 'by-id')    
  .then((favoritedRestaurant) => {     
    //console.log("favorites restaurant is " + favoritedRestaurant.length) 
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

syncRestaurantReview = () => {
  console.log('sync review process begin');
  return IDBHelper.getData('reviews','by-status','pending')
  .then ( (pendingReviews) => {    
    return Promise.all(pendingReviews.map( (pendingReview) => {
      let url = `${SERVER_URL}/reviews/`;
      var data = {
        restaurant_id: pendingReview.restaurant_id,
        name: pendingReview.name,        
        createdAt: pendingReview.createdAt,
        updatedAt: pendingReview.updatedAt,
        rating: pendingReview.rating,
        comments: pendingReview.comments
      };
      return fetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      .then( (response) => {
        if (!response.ok) throw Error(response.statusText);
        if (response.ok) {          
          data.id = data.createdAt;
          IDBHelper.addData('reviews', data);                
        };
      })
      .catch( (err) => {
        console.log('Upload review to server is failed');
      })      
    }));
  })
  .catch( (err) => {
    console.log('Review sync is failed: ' + err);
  })  
}







/*
fetchApi = (url, method, body) => {  
  let initParams;
  if (body) {
    initParams = `method: ${method}, body: JSON.stringify(${body})`;
  } else {
    initParams = `method: ${method}`;
  }
  return fetch(url, {initParams})
  .then( (response) => {
    if (!response.ok) throw Error(response.statusText);
    return response;
  })
  
}

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


*/

