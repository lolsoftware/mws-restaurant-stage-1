/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database port.
   */
  static get PORT() {
    const port = 1337; // Change this to your server port
    return port;
  }

  static openIDB() {
    const dbPromise = idb.open('restaurant-db', 1, upgradeDB => {
      upgradeDB.createObjectStore('restaurant');
      upgradeDB.createObjectStore('review');
      upgradeDB.createObjectStore('postponedRestaurant');
      upgradeDB.createObjectStore('postponedReview');
    });

    return dbPromise;
  }

  static insertRestaurantToIDB(restaurantId, json) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('restaurant', 'readwrite');
      tx.objectStore('restaurant').put(json, restaurantId);
      return tx.complete;
    });
  }

  static selectRestaurantFromIDB(restaurantId) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      return db.transaction('restaurant')
        .objectStore('restaurant').get(restaurantId);
    });
  }

  static insertReviewsToIDB(restaurantId, json) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('review', 'readwrite');
      tx.objectStore('review').put(json, restaurantId);
      return tx.complete;
    });
  }

  static selectReviewsFromIDB(restaurantId) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      return db.transaction('review')
        .objectStore('review').get(restaurantId);
    });
  }

  static selectPostponedReviewsFromIDB() {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      return db.transaction('postponedReview')
        .objectStore('postponedReview').getAll();
    });
  }

  static selectFirstPostponedReviewFromIDB() {
    return DBHelper.selectPostponedReviewsFromIDB()
      .then(function (postponedReviewList) {
        if (postponedReviewList.length > 0) {
          return postponedReviewList[0];
        }

        return null;
      });
  }

  static selectPostponedRestaurantsFromIDB() {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      return db.transaction('postponedRestaurant')
        .objectStore('postponedRestaurant').getAll();
    });
  }

  static selectFirstPostponedRestaurantFromIDB() {
    return DBHelper.selectPostponedRestaurantsFromIDB()
      .then(function (postponedRestaurantList) {
        if (postponedRestaurantList.length > 0) {
          return postponedRestaurantList[0];
        }

        return null;
      });
  }

  static deletePostponedReviewFromIDB(key) {
    console.log('Deleting a postponed review as it has been posted');

    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('postponedReview', 'readwrite');
      tx.objectStore('postponedReview').delete(key);
      return tx.complete;
    });
  }

  static deletePostponedRestaurantFromIDB(restaurantId) {
    console.log('Deleting a postponed favorite change as it has been posted');

    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('postponedRestaurant', 'readwrite');
      tx.objectStore('postponedRestaurant').delete(restaurantId);
      return tx.complete;
    });
  }

  static fetchRestaurantFromServer(id) {
    const url = `http://localhost:${DBHelper.PORT}/restaurants/${id}`;
    return fetch(url)
      .then(function (response) {
        return response.json();
      });
  }

  static fetchRestaurantListFromServer() {
    const url = `http://localhost:${DBHelper.PORT}/restaurants`;
    return fetch(url)
      .then(function (response) {
        return response.json();
      });
  }

  static fetchReviewsFromServer(restaurantId) {
    const url = `http://localhost:${DBHelper.PORT}/reviews/?restaurant_id=${restaurantId}`;
    return fetch(url)
      .then(function (response) {
        return response.json();
      });
  }

  /*
  newReview = {
    "restaurant_id": <restaurant_id>,
    "name": <reviewer_name>,
    "rating": <rating>,
    "comments": <comment_text>
  }
  */
  static postReview(newReview) {
    const url = `http://localhost:${DBHelper.PORT}/reviews/`;
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(newReview),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }).then(function (response) {
      return response.json();
    }).then(function (reviewFromServer) {
      //Append the new review to the review list for this restaurant in the IDB.
      DBHelper.selectReviewsFromIDB(newReview.restaurant_id)
        .then(function (jsonReviews) {
          if (jsonReviews != null) {
            jsonReviews.push(reviewFromServer);
            DBHelper.insertReviewsToIDB(reviewFromServer.restaurant_id, jsonReviews);
          }
        });
    });
  }

  static postRestaurant(restaurant) {
    const isFavorite = (restaurant.is_favorite == "true");
    const trueFalse = (isFavorite)
      ? "true"
      : "false";

    const url = `http://localhost:${DBHelper.PORT}/restaurants/${restaurant.id}/?is_favorite=${trueFalse}`;
    return fetch(url, {
      method: 'PUT',
      body: restaurant.id
    }).then(function (response) {
      return response.json();
    });
  }

  /**
 * Fetch reviews of a given restaurants.
 */
  static fetchReviews(restaurantId) {
    //First fetch reviews from the server, and if that fails, only then fetch review from the IDB.
    //This way if some different user adds a review, I will see it too (and not only the old set of review from the IDB).
    const promiseReviews = DBHelper.fetchReviewsFromServer(restaurantId)
      .catch(function () {
        return DBHelper.selectReviewsFromIDB(restaurantId);
      })
      .then(function (jsonReviews) {
        if (jsonReviews != null) {
          DBHelper.insertReviewsToIDB(restaurantId, jsonReviews);

          //We need to make a copy of the array, as DBHelper.insertReviewsToIDB returns a promise.
          //So at this point the array is not yet stored in the IDB. And we are about to add the pending
          //reviews to this array (if there are any), so these must be two separate arrays, otherwise the pending
          //reviews would be stored in the IDB, which is not what we want.
          const jsonReviewsCopy = jsonReviews.slice();
          return jsonReviewsCopy;
        }

        return null;
      });

    const promisePostponed = DBHelper.selectPostponedReviewsFromIDB();

    return Promise.all([promiseReviews, promisePostponed])
      .then(function (results) {
        const jsonReviews = results[0];
        const postponedReviewList = results[1];

        if (jsonReviews != null && postponedReviewList != null) {
          for (const postponedReview of postponedReviewList) {
            if (postponedReview.restaurant_id == restaurantId) {
              jsonReviews.push(postponedReview);
            }
          }
        }

        return jsonReviews;
      });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.selectRestaurantFromIDB('all')
      .then(function (jsonRestaurants) {
        if (jsonRestaurants != null) {
          return jsonRestaurants;
        }

        return DBHelper.fetchRestaurantListFromServer();
      })
      .then(function (jsonRestaurants) {
        DBHelper.insertRestaurantToIDB('all', jsonRestaurants);
        callback(null, jsonRestaurants);
      })
      .catch(function (error) {
        const errorMsg = (`Request failed. Error message: ${error.message}`);
        callback(errorMsg, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.selectRestaurantFromIDB(id)
      .then(function (jsonRestaurant) {
        if (jsonRestaurant != null) {
          return jsonRestaurant;
        }

        return DBHelper.fetchRestaurantFromServer(id);
      })
      .then(function (jsonRestaurant) {
        DBHelper.insertRestaurantToIDB(id, jsonRestaurant);
        callback(null, jsonRestaurant);
      })
      .catch(function (error) {
        const errorMsg = (`Request failed. Error message: ${error.message}`);
        callback(errorMsg, null);
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
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
    return (`/img/${restaurant.photograph}.webp`);
  }

  /**
   * Restaurant medium image URL.
   */
  static mediumImageUrlForRestaurant(restaurant) {
    return (`/img/medium/${restaurant.photograph}.webp`);
  }

  /**
   * Restaurant small image URL.
   */
  static smallImageUrlForRestaurant(restaurant) {
    return (`/img/small/${restaurant.photograph}.webp`);
  }

  /**
   * Restaurant miniature image URL.
   */
  static miniatureImageUrlForRestaurant(restaurant) {
    return (`/img/miniature/${restaurant.photograph}.webp`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    if (map == null) {
      return;
    }

    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: null //google.maps.Animation.DROP
    }
    );
    return marker;
  }

  static postponeRestaurant(restaurant) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('postponedRestaurant', 'readwrite');
      tx.objectStore('postponedRestaurant').put(restaurant, restaurant.id);
      return tx.complete;
    });
  }

  static postponeReview(newReview) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('postponedReview', 'readwrite');
      tx.objectStore('postponedReview').put(newReview, newReview.key);
      return tx.complete;
    });
  }

  static sendPostponedRestaurants() {
    DBHelper.selectFirstPostponedRestaurantFromIDB()
      .then(function (postponedRestaurant) {
        if (postponedRestaurant != null) {
          console.log('Sending next postponed favorite change');

          return DBHelper.postRestaurant(postponedRestaurant)
            .then(() => DBHelper.deletePostponedRestaurantFromIDB(postponedRestaurant.id))
            .then(() => DBHelper.sendPostponedRestaurants());
        }
      });
  }

  static sendPostponedReviews() {
    DBHelper.selectFirstPostponedReviewFromIDB()
      .then(function (postponedReview) {
        if (postponedReview != null) {
          console.log('Sending next postponed review');

          return DBHelper.postReview(postponedReview)
            .then(() => DBHelper.deletePostponedReviewFromIDB(postponedReview.key))
            .then(() => DBHelper.sendPostponedReviews());
        }
      });
  }

  static sendPostponedRequests() {
    DBHelper.sendPostponedRestaurants();
    DBHelper.sendPostponedReviews();
  }
}
