/**************************************************************************************************************************
   * Functions for Restaurants Review
 *************************************************************************************************************************/

class IDBReview {
  /**
   * Add Restaurant Review data to database.
   * Check if the data was stored before, if not then add data to database. 
   */
  static addToDatabase(review) {    
    return new Promise((resolve, reject) => {      
      IDBHelper.getData('reviews', 'by-id', review.id)
        .then((reviews) => {                      
            if ( reviews.length === 1 ) return resolve(review);
            IDBHelper.addData('reviews', review).then(() => { resolve(review) });
        })
        .catch(err => {                    
          const error = (`Addding review data to database failed. Returned status of ${err}`);                      
          reject(error);
        });
    })
  }

  /**
   * Fetch Restaurant Review Data by Review ID.
   * Check if the data was stored before, if not then add data to database. 
   * Parameter: saveToDatabase, to save to IDB Promise if service worker is supported.
   * Return a reviews based on Review ID
   */
  
  static fetchReviewById(saveToDatabase, review_id) {    
    let fetchReviewById;    
    return fetch(`${SERVER_URL}/reviews/${review_id}`)            //fetch from the network    
      .then( (response) => response.json())                
      .then( (reviews) => {                      // save restaurants data to database                               
        fetchReviewById = reviews;               
        let sequence = Promise.resolve();        
        if (saveToDatabase) reviews.forEach((review) => sequence = sequence.then(() => IDBReview.addToDatabase(review)) );        
        return sequence;        
      })      
      .then(() => {                
        return fetchReviewById;
      })      
      .catch(err => {                    
        const error = (`Fetching review by restaurant id failed. Returned status of ${err}`);                    
        return Promise.reject(error);
      }); 
  }

  /**
   * Fetch Restaurant Review Data by Restaurant ID.
   * Check if the data was stored before, if not then add data to database. 
   * Parameter: saveToDatabase, to save to IDB Promise if service worker is supported.
   * Return reviews for all restaurants data
   */
  
  static fetchReviewsByRestaurantId(saveToDatabase, restaurant_id) {    
    let fetchReviewByRestaurant;    
    return fetch(`${SERVER_URL}/reviews?restaurant_id=${restaurant_id}`)            //fetch from the network    
      .then( (response) => response.json())                
      .then( (reviews) => {                      // save restaurants data to database                               
        fetchReviewByRestaurant = reviews;               
        let sequence = Promise.resolve();        
        if (saveToDatabase) reviews.forEach((review) => sequence = sequence.then(() => IDBReview.addToDatabase(review)) );        
        return sequence;        
      })      
      .then(() => {                
        return fetchReviewByRestaurant;
      })      
      .catch(err => {                    
        const error = (`Fetching review by restaurant id failed. Returned status of ${err}`);                    
        return Promise.reject(error);
      }); 
  }
  
  
}