let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []
var updateRestaurantsPromise = null;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
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
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
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
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };

  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });

  updateRestaurantsPromise.then(function () {
    addMarkersToMap();
  });
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = (resolve, reject) => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);

      reject(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();

      resolve();
    }
  })
}

onFilterChange = () => {
  var promise = new Promise(updateRestaurants);

  if (self.map != null) {
    promise.then(addMarkersToMap);
  }
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;

  const noRestaurants = document.getElementById('no-restaurants');
  noRestaurants.style.display = "none";
  ul.classList.remove('hidden');
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });

  if (restaurants.length == 0) {
    const noRestaurants = document.getElementById('no-restaurants');
    noRestaurants.style.display = "block";
    ul.classList.add('hidden');
  }
  else {
    observeImageScroll();
  }
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img lazyload';
  image.alt = `Picture of the "${restaurant.name}" restaurant`;
  //image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('data-srcset', DBHelper.miniatureImageUrlForRestaurant(restaurant) + " 270w, " +
    DBHelper.smallImageUrlForRestaurant(restaurant) + " 500w, " +
    DBHelper.mediumImageUrlForRestaurant(restaurant) + " 650w, " +
    DBHelper.imageUrlForRestaurant(restaurant) + " 800w");
  image.sizes = "(max-width: 800px) 100vw, 270px";
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.tabIndex = 0;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.className = "neighborhood";
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

onImgElemShown = (entries, observer) => {
  if (entries.length > 0 &&
    entries[0].isIntersecting) {

    var image = entries[0].target;
    observer.unobserve(image);

    image.setAttribute('srcset', image.getAttribute('data-srcset'));
  }
}

observeImageScroll = () => {
  const images = document.querySelectorAll('.lazyload').forEach(function (image) {
    const imgObserver = new IntersectionObserver(onImgElemShown, {});
    imgObserver.observe(image);
  });
}

onMapElemShown = (entries, observer) => {
  if (entries.length > 0 &&
    entries[0].isIntersecting) {

    const mapContainer = document.querySelector('#map-container');
    observer.unobserve(mapContainer);

    const mapScript = document.createElement('script');
    mapScript.setAttribute('src', 'https://maps.googleapis.com/maps/api/js?key=AIzaSyD3f9BNPXItMT8PZkfqlP7gNjzc4jBT4v8&libraries=places&callback=initMap');
    document.head.appendChild(mapScript);
  }
}

observeMapScroll = () => {
  const mapObserver = new IntersectionObserver(onMapElemShown, {});
  const mapContainer = document.querySelector('#map-container');
  mapObserver.observe(mapContainer);
}

registerOnlineEventHandler = () => {
  function handleConnectionChange(event) {
    if (event.type == "offline") {
      console.log("You are offline.");
    }
    else if (event.type == "online") {
      console.log("You are back online.");

      DBHelper.sendPostponedRequests();
    }
  }

  window.addEventListener('online', handleConnectionChange);
  window.addEventListener('offline', handleConnectionChange);
}

init = () => {
  updateRestaurantsPromise = new Promise(function (resolve, reject) {
    updateRestaurants(resolve, reject);
  })
    .then(() => observeMapScroll());

  registerOnlineEventHandler();
  DBHelper.sendPostponedRequests();
}

init();