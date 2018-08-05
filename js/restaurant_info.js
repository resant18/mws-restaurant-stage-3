let restaurant, reviews;
var newMap;
let didFetchReviewsFromDatabase = false;
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {   
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
    IDBRestaurant.mapMarkerForRestaurant(self.restaurant, self.map);
  })
  .catch( (err) => {
    console.log(err);
  }); 
}

/**
 * Get current restaurant from page URL.
 */

fetchRestaurantFromURL = () => {
  //const id = parseFloat(getParameterByName('id'));
  const id = Number(getParameterByName('id'));

  if ('serviceWorker in navigator') {    
    console.log('service worker in control');
    return IDBHelper.getData('restaurants', 'by-id', id)
      .then( (restaurantFromDatabase) => {              
        if (restaurantFromDatabase.length == 0) return IDBRestaurant.fetchRestaurantById(true, id)        
        didFetchReviewsFromDatabase = true;                
        return Promise.resolve(restaurantFromDatabase);
      })
      .then( (restaurant) => {            
        self.restaurant = restaurant[0];
        fillRestaurantHTML();
        return Promise.resolve(self.restaurant);
      })
  } else {  
    console.log('service worker is not in control');  
    return IDBRestaurant.fetchRestaurantsById(false, id)    
      .then( (restaurant) => {                
        fillRestaurantsHTML(restaurant);
        return Promise.resolve(restaurant);
      })
  }  
}

/**
 * Get reviews for current restaurant.
 */

fetchReviewsByRestaurant = () => {
  const id = parseFloat(getParameterByName('id'));

  if ('serviceWorker in navigator') {    
    IDBHelper.getData('reviews', 'by-restaurantId', id)
      .then((reviewsFromDatabase) => {        
        if (reviewsFromDatabase.length == 0) return IDBReview.fetchReviewsByRestaurantId(true)
        didFetchReviewsFromDatabase = true;        
        return Promise.resolve(reviewsFromDatabase); 
      })
      .then( (reviews) => {        
        self.reviews = reviews;
        fillReviewsHTML();
        Promise.resolve();
      })
  } else {    
    IDBRestaurant.fetchReviewsByRestaurantId(false)
      .then( (reviews) => {        
        fillReviewsHTML(reviews);
        Promise.resolve(); 
      })
  }
}

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
  const imageName = IDBRestaurant.imageUrlForRestaurant(restaurant).replace(/\.[^/.]+$/, '');
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
  fetchReviewsByRestaurant();
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
fillReviewsHTML = (reviews = self.reviews) => {
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
  const utcDate = new Date(review.createdAt);
  const formattedReviewDate = `${monthNames[utcDate.getMonth()]} ${utcDate.getDay()}, ${utcDate.getFullYear()}`;
  date.innerHTML = formattedReviewDate;
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
