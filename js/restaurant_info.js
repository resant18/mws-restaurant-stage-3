var restaurant, reviews;
var restaurant_id; 
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
  restaurant_id = Number(getParameterByName('id'));

  if ('serviceWorker in navigator') {    
    console.log('service worker in control');
    if (!'SyncManager' in window) syncRestaurantReview();
    return IDBHelper.getData('restaurants', 'by-id', restaurant_id)
      .then( (restaurantFromDatabase) => {              
        if (restaurantFromDatabase.length == 0) {
          return IDBRestaurant.fetchRestaurants(true)
            .then( (fetchedRestaurants) => {
              if (fetchedRestaurants.length != 0) { //return IDBHelper.getData('restaurants', 'by-id', restaurant_id);            
                for (let fetchedRestaurant of fetchedRestaurants) {                  
                  if (fetchedRestaurant.id == restaurant_id) return Promise.resolve(fetchedRestaurant);
                }
              }
            })        
        }
        return Promise.resolve(restaurantFromDatabase[0]);        
      })
      .then( (restaurant) => {            
        self.restaurant = restaurant;
        fillRestaurantHTML();
        return Promise.resolve(self.restaurant);
      })
  } else {  
    console.log('service worker is not in control');  
    return IDBRestaurant.fetchRestaurantsById(false, restaurant_id)    
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
  if ('serviceWorker in navigator') {    
    IDBHelper.getData('reviews', 'by-restaurantId', restaurant_id)    
      .then((reviewsFromDatabase) => {        
        if (reviewsFromDatabase.length == 0) return IDBReview.fetchReviewsByRestaurantId(true, restaurant_id)
        didFetchReviewsFromDatabase = true;        
        return Promise.resolve(reviewsFromDatabase); 
      })
      .then( (reviews) => {        
        self.reviews = reviews;
        fillReviewsHTML();
        Promise.resolve();
      })      
  } else {    
    IDBRestaurant.fetchReviewsByRestaurantId(false, restaurant_id)
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

  // add review form
  createAddReviewForm();
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
  const container_header = document.getElementById('reviews-header');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container_header.appendChild(title);

  // const add_review_link = document.createElement('a');
  // add_review_link.id = 'add-review';
  // add_review_link.innerHTML = 'Add New Review';
  // add_review_link.className = 'button';
  // add_review_link.href = '#add-review-dialog';
  // container_header.appendChild(add_review_link);

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
  const formattedReviewDate = `${monthNames[utcDate.getMonth()]} ${utcDate.getDate()}, ${utcDate.getFullYear()}`;
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
  let i;
  if (rating != 0) { 
    i = 1;
    while (i <= rating_max) {
      if ((i <= rating) && (i <= rating_max)) {
        rating_html += `<span class='fa fa-star checked'></span>`;
      } else {
        rating_html += `<span class='fa fa-star'></span>`;
      }
      i++;
    }
  }
  else {  
    i = 5;   
    rating_html = ``; 
    while (i >= 1) {
      rating_html += `<span class='fa fa-star' data-rating='${i}'></span>`;      
      i--;
    }
    //rating_html += `</div>`;
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

/**
 * Create add reviews HTML and add them to the webpage.
 */
createAddReviewForm = () => {
  const container = document.getElementById('add-review-dialog');
  
  const title = document.createElement('h2');
  title.innerHTML = 'Write a Review';
  container.appendChild(title);
  
  const info = document.createElement('p');
  info.id = 'dialog-review-info';
  info.innerHTML = 'Add and share your review of this restaurant';
  container.appendChild(info);

  const content = document.createElement('div');
  content.className = 'add-review-content';
  container.appendChild(content);

  const form = document.createElement('form');
  form.id = 'review-form';
  content.appendChild(form);

  const labelRating = document.createElement('label');      
  const rating = document.createElement('div'); 
  rating.id = 'rating';  
  rating.className = 'revrating';  
  rating.tabIndex = 0;
  rating.innerHTML = createRatingStar(0);  
  labelRating.setAttribute('for', 'rating');
  labelRating.innerHTML = 'Select your rating: ';
  form.appendChild(labelRating);
  form.appendChild(rating);

  const labelName = document.createElement('label');
  const inputName = document.createElement('input');   
  labelName.setAttribute('for', 'review_username');
  labelName.id = 'label_review_username';
  labelName.innerHTML = 'Name';  
  inputName.id = 'review_username';
  inputName.name = 'review_username';
  inputName.type = 'text';
  inputName.placeholder = 'Your name...';
  inputName.setAttribute('type', 'text');
  inputName.setAttribute('required', true);
  form.appendChild(labelName);
  form.appendChild(inputName);
  
  const labelReview = document.createElement('label');
  const inputReview = document.createElement('textarea');    
  labelReview.setAttribute('for', 'review_comment');
  labelReview.innerHTML = 'Your review';
  inputReview.id = 'review_comment';
  inputReview.name = 'review_comment';
  inputReview.placeholder = 'Write your review here...';
  inputReview.rows = '5';
  inputReview.setAttribute('required', true);
  form.appendChild(labelReview);
  form.appendChild(inputReview);
  
  const buttonSubmit = document.createElement('button');
  buttonSubmit.id = 'submit_review';
  buttonSubmit.type = 'submit';
  buttonSubmit.value = 'submit';
  buttonSubmit.className = 'button submit';
  buttonSubmit.innerHTML = 'Submit Review';
  form.appendChild(buttonSubmit);  

  let selectedRating = 0;  
  rating.addEventListener('click', (event) => {  
    let action = 'remove';   
    for(let span of rating.children) {      
      if (span === event.target) {
        action = 'add';
        selectedRating = span.getAttribute('data-rating');
      }
      span.classList[action]('checked');            
    }
  })

  /**
   * Post review of a restaurant.
   */  
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    if (selectedRating == 0) {
      window.alert('Please select the rating to submit your review.');
      return;
    }

    var rating = selectedRating; 
    var username = this['review_username'].value;
    var comment = this['review_comment'].value;    

    if ( !restaurant_id | !rating | !username | !comment ) {
          return;
    }
    
    saveReviewsLocally(restaurant_id, username, rating, comment)
      .then( () => {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {    
          navigator.serviceWorker.ready
            .then( (registration) => {
              registration.sync.register('sync-reviews').then(() => {
                console.log('sync reviews is registered');
              })
            })
        }
      })
      .then (() => {
        clearAddReviewForm(this);
      })      
      .catch(err => console.log("Error submitting review: ", err));
  })
}
  
clearAddReviewForm = (form) => {
  form['review_username'].value = "";
  form['review_comment'].value = "";
  selectedRating = 0;

  for(let span of rating.children) {      
    span.classList.remove('checked');
  }
}

saveReviewsLocally = (restaurant_id, username, rating, comment) => {
  let createdDate = Date.now();
  let newReviewData = { 
    id: Number(createdDate),   
    restaurant_id: restaurant_id,
    name: username,
    createdAt: createdDate,
    updatedAt: createdDate,
    rating: rating,
    comments: comment,
    status: 'pending'
  }
  
  const ul = document.getElementById('reviews-list');
  const newReviewHtml = createReviewHTML(newReviewData);  
  ul.appendChild(newReviewHtml);
  
  return IDBHelper.addData('reviews', newReviewData);
}