let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = [];
let didFetchRestaurantsFromDatabase = false;


/**
 * Start ***
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  
  if ('serviceWorker in navigator') {
    console.log('service worker in control');
    IDBHelper.getData('restaurants')
      .then( (restaurantsFromDatabase) => {
        //console.log('total restaurant=' + restaurantsFromDatabase.length);
        if (restaurantsFromDatabase.length == 0) return IDBRestaurant.fetchRestaurants(true)
        didFetchRestaurantsFromDatabase = true;        
        return Promise.resolve(restaurantsFromDatabase); 
      })
      .then( (restaurants) => {        
        fetchNeighborhoods(restaurants);
        fetchCuisines(restaurants);
        fillRestaurantsHTML(restaurants);
        return Promise.resolve();
      })
  } else {
    console.log('service worker is not in control');
    IDBRestaurant.fetchRestaurants(false)
      .then( (restaurants) => {
        console.log('restaurants=' + restaurants); 
        fetchNeighborhoods(restaurants);
        fetchCuisines(restaurants);
        fillRestaurantsHTML(restaurants);
        return Promise.resolve();
      })
  }  
})

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = (restaurants) => {
  IDBRestaurant.fetchNeighborhoods(restaurants)
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
  IDBRestaurant.fetchCuisines(restaurants)
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
updateRestaurants = () => {
  return new Promise ( (resolve, reject) => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    return IDBRestaurant.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
      .then( (restaurants) => {        
        resetRestaurants();
        fillRestaurantsHTML(restaurants);      
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
resetRestaurants = () => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = []; 
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants) => {
  const ul = document.getElementById('restaurants-list');
  const span = document.getElementById('total-restaurant-list');
  
  span.innerHTML = `${restaurants.length} restaurant${(restaurants.length === 0) ? '' : 's'} found`;
  restaurants.forEach(restaurant => {        
    ul.append(createRestaurantHTML(restaurant));
  });    

  self.restaurants = restaurants;
  addMarkersToMap();
  addEventToFavoriteButton();
  
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  // implement responsive image using picture element with breakpoint 789px
  const pictureContainer = document.createElement('div');    
  const picture = document.createElement('picture');
  const image = document.createElement('img');
  const source1 = document.createElement('source');
  const source2 = document.createElement('source');
  const imageName = IDBRestaurant.imageUrlForRestaurant(restaurant).replace(/\.[^/.]+$/, '');
  
  pictureContainer.className = 'restaurant-img-container';
  image.className = 'restaurant-img';
  image.src = `${imageName}_medium.jpg`;
  image.alt = restaurant.name;
  source1.media = '(max-width: 789px)';
  source1.srcset = `${imageName}_small.webp`;
  source2.media = '(min-width: 790px)'
  source2.srcset = `${imageName}_medium.webp`;  
  li.append(pictureContainer);
  pictureContainer.append(picture);
  picture.append(source1);
  picture.append(source2);
  picture.append(image);
  
  const divFavorite = document.createElement('div');   
  const button = document.createElement('button');  
  const is_favorite = String(restaurant.is_favorite) === "true" ? true : false;  
  const buttonId = `btnFavorite-${restaurant.id}`;

  divFavorite.className = 'restaurant-item-favorite';
  button.className = 'favorite-button';  
  button.setAttribute('id', buttonId);
  button.setAttribute('data-id', restaurant.id);
  button.setAttribute('aria-label', 'Restaurant favorite toggle button');
  button.setAttribute('role', 'button');
  if (is_favorite) {
    button.setAttribute('aria-pressed', 'true');
  } else {
    button.setAttribute('aria-pressed', 'false');
  }
   
  pictureContainer.append(divFavorite);
  divFavorite.append(button);

  const namespace = 'http://www.w3.org/2000/svg';  
  const is_favorite_class = is_favorite ? 'icon-heart-favorited' : 'icon-heart';
  let svg = document.createElementNS(namespace, 'svg');
  
  svg.setAttribute('class', is_favorite_class);
  svg.setAttribute('id', 'icon-heart');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '72%');
  svg.setAttribute('height', '72%');
  //console.log(svg);
  let path = document.createElementNS(namespace, 'path');
  
  path.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
  

  pictureContainer.appendChild(button);
  button.appendChild(svg)  
  svg.appendChild(path);  

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
  more.href = IDBRestaurant.urlForRestaurant(restaurant);
  more.alt = 'View Details';
  li.append(more);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = IDBRestaurant.mapMarkerForRestaurant(restaurant, self.newMap);
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

/* **************************************************************************

    Restaurant Favorite Toggle

 ************************************************************************** */
addEventToFavoriteButton = () => {
  var buttons = document.querySelectorAll('button.favorite-button');
  // for (var i = 0; i < buttons.length; i++) {      
  //     buttons[i].addEventListener('click', () => {                         
  //       toggleFavorite(event.currentTarget);
  //     }, false);
  // }

  for (var i = 0; i < buttons.length; i++) { 
    buttons[i].addEventListener('click', () => {
      toggleFavorite(event.currentTarget);            
    });
  }
}

/*
handleFetchError = (response) => {
  if (!response.ok) throw Error(response.statusText);
  return response;
}

postFavoritedRestaurants = (restaurant_id, is_favorite) => {    
  let url = `${SERVER_URL}/restaurants/${restaurant_id}/?is_favorite=${is_favorite}`;
    fetch(url, {
      method: 'PUT'        
    })
    .then(handleFetchError)
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
*/

toggleFavorite = (buttonElement) => {    
  const restaurant_id = Number(buttonElement.getAttribute('data-id'));  
  const button_state = buttonElement.firstChild.classList.toggle('icon-heart-favorited'); //switch the button state

  buttonElement.setAttribute('aria-pressed', !(buttonElement.getAttribute('aria-pressed')));          

  IDBHelper.getData('restaurants', 'by-id', restaurant_id)
  .then((selectedRestaurant) => {
    if (selectedRestaurant.length === 0) return;
    IDBHelper.getData('favorites', 'by-id', restaurant_id)
    .then((favoritedRestaurant) => {
      let updatedRestaurant = selectedRestaurant[0];
      let localUpdateTasks = [];
      updatedRestaurant.is_favorite = button_state;
      if ( favoritedRestaurant.length === 0 ) {            
        //TODO: change to promise.all    
        localUpdate = [
          IDBHelper.addData('favorites', updatedRestaurant),
          IDBHelper.addData('restaurants', updatedRestaurant)
        ];        
      } else {     
        localUpdate = [       
          IDBHelper.removeData('favorites', false, 'id', restaurant_id),     
          IDBHelper.addData('restaurants', updatedRestaurant)
        ];
      }
      Promise.all(localUpdateTasks)
      .then( (x) => {
        if ('serviceWorker' in navigator) {    
          navigator.serviceWorker.ready
          .then( (registration) => {
            //return registration.sync.register('sync-favorites');
              registration.sync.register('sync-favorites').then(() => {
                console.log('Register sync');
            });
          })
        }
      }) 
    });
  });      
    
  /*  
  addRestaurantToFavorite = () => {
    console.log('add to favorite and update is_favorite');
    IDBHelper.getData('restaurants', 'by-id', restaurant_id)    
      .then((restaurant) => {
          let updatedRestaurant = restaurant[0];
          // reverse the value
          updatedRestaurant.is_favorite = String(updatedRestaurant.is_favorite) === 'true' ? 'false' : 'true';
          //console.log('Is_favorite in main.js: '+ updatedRestaurant.is_favorite);
          //update the data after the restaurant.is_favorite is updated
          IDBHelper.addData('restaurants', updatedRestaurant);
          IDBHelper.addData('favorites', updatedRestaurant)            
          console.log("save is complete");
          
          if ('serviceWorker' in navigator) {    
            navigator.serviceWorker.ready
              .then( (registration) => {
                //return registration.sync.register('sync-favorites');
                  registration.sync.register('sync-favorites').then(() => {
                    console.log('Register sync');
                });

              })
          }
          
      })
  }

  removeRestaurantFromFavorite = () => {
    console.log('remove from favorite');    
    IDBHelper.removeData('favorites', false, 'id', restaurant_id)      
  }  

  updateFavoriteIcon();
  return IDBHelper.getData('restaurants', 'by-id', restaurant_id)
    .then((selectedRestaurant) => {
      if (selectedRestaurant.length === 0) return;
      return IDBHelper.getData('favorites', 'by-id', restaurant_id)
        .then((favoritedRestaurant) => {
          if ( favoritedRestaurant.length === 0 ) {            
            //TODO: change to promise.all
            const updatedRestaurant.is_favorite = !()
            IDBHelper.addData('favorites', selectedRestaurant)   
            IDBHelper.addData('restaurants', selectedRestaurant);
          } else {
            removeRestaurantFromFavorite();
          }
        

      //console.log( favoritedRestaurants );          
      if ( favoritedRestaurants.length === 0 ) {
        addRestaurantToFavorite();  
      } else {
        removeRestaurantFromFavorite();
      } 
    })
  })
    .then(() => { return Promise.resolve(toggleFavoriteIconClass())})
    .then( (updated_is_favorite) => {  
      postFavoritedRestaurants(restaurant_id, updated_is_favorite);          
    });
    */
}

