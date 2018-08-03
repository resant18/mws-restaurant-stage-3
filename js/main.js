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
        console.log('total restaurant=' + restaurantsFromDatabase.length);
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
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  // implement responsive image using picture element with breakpoint 789px
  const pictureContainer = document.createElement('div');  
  
  const favoriteToggle = document.createElement('div');
  favoriteToggle.innerHTML = restaurant.is_favorite ? '&#x2764;': '&#x2764;';
  pictureContainer.append(favoriteToggle);

  const picture = document.createElement('picture');
  const image = document.createElement('img');
  const source1 = document.createElement('source');
  const source2 = document.createElement('source');
  const imageName = IDBRestaurant.imageUrlForRestaurant(restaurant).replace(/\.[^/.]+$/, '');
  
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
