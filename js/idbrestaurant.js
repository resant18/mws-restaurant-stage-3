/**************************************************************************************************************************
   * Functions for Restaurants 
 *************************************************************************************************************************/

class IDBRestaurant {
  
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
          const error = (`Addding restaurant data to database failed. Returned status of ${err}`);                      
          reject(error);
        });
    })
  }

  /**
   * Fetch Restaurant Data.
   * Check if the data was stored before, if not then add data to database. 
   * Parameter: saveToDatabase, to save to IDB Promise if service worker is supported.
   * Return restaurants data
   */
  
  static fetchRestaurants(saveToDatabase) {    
    let fetchedRestaurants;
    return fetch(`${SERVER_URL}/restaurants`)            //fetch from the network    
      .then( (response) => response.json())                
      .then( (restaurants) => {                      // save restaurants data to database                               
        fetchedRestaurants = restaurants;       
        console.log('Fetched restaurants='+fetchedRestaurants);
        let sequence = Promise.resolve();        
        if (saveToDatabase) restaurants.forEach((restaurant) => sequence = sequence.then(() => IDBRestaurant.addToDatabase(restaurant)) );
        //console.log('Sequence='+sequence);        
        return sequence;        
      })      
      .then(() => {        
        console.log('return fetchedRestaurants= '+fetchedRestaurants);
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
  
  static fetchRestaurantById(saveToDatabase, id) {
    // fetch all restaurants with proper error handling. 
    let fetchedRestaurant;
    return fetch(`${SERVER_URL}/restaurants/${id}`)            //fetch from the network    
      .then( (response) => response.json())                
      .then( (restaurant) => {                      // save restaurants data to database                               
        fetchedRestaurant = restaurant;                       
        if (saveToDatabase) IDBRestaurant.addToDatabase(restaurant);
        return Promise.resolve();        
      })      
      .then(() => {        
        console.log('return fetchedRestaurants= '+fetchedRestaurant);
        return fetchedRestaurant;
      })      
      .catch(err => {                    
        const error = (`Fetching restaurant data by id failed. Returned status of ${err}`);                    
        return Promise.reject(error);
      });     
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return IDBHelper.getData('restaurants')
      .then ( (restaurantsFromDatabase) => {
        if (restaurantsFromDatabase.length == 0) return IDBRestaurant.fetchRestaurants(false);
        didFetchRestaurantsFromDatabase = true;        
        return Promise.resolve(restaurantsFromDatabase); 
      })
      .then( (restaurants) => {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        if (!results) reject('No restaurant data with requested id is found');
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
    //console.log(IDBRestaurant.fetchRestaurants);
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
    return (`/dist/img/restaurants/${restaurant.photograph}`);
  }

  /**
   * Leaflet Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: IDBRestaurant.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
}