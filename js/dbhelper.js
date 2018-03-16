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
    });

    return dbPromise;
  }

  static insertToIDB(restaurantId, json) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      const tx = db.transaction('restaurant', 'readwrite');
      tx.objectStore('restaurant').put(json, restaurantId);
      return tx.complete;
    });
  }

  static selectFromIDB(restaurantId) {
    const dbPromise = DBHelper.openIDB();
    return dbPromise.then(db => {
      return db.transaction('restaurant')
        .objectStore('restaurant').get(restaurantId);
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

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.selectFromIDB('all')
      .then(function (jsonRestaurants) {
        if (jsonRestaurants != null) {
          return jsonRestaurants;
        }

        return DBHelper.fetchRestaurantListFromServer();
      })
      .then(function (jsonRestaurants) {
        DBHelper.insertToIDB('all', jsonRestaurants);
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
    DBHelper.selectFromIDB(id)
      .then(function (jsonRestaurant) {
        if (jsonRestaurant != null) {
          return jsonRestaurant;
        }

        return DBHelper.fetchRestaurantFromServer(id);
      })
      .then(function (jsonRestaurant) {
        DBHelper.insertToIDB(id, jsonRestaurant);
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
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant medium image URL.
   */
  static mediumImageUrlForRestaurant(restaurant) {
    return (`/img/medium/${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant small image URL.
   */
  static smallImageUrlForRestaurant(restaurant) {
    return (`/img/small/${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant miniature image URL.
   */
  static miniatureImageUrlForRestaurant(restaurant) {
    return (`/img/miniature/${restaurant.photograph}.jpg`);
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

}
