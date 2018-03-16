let restaurant;
var map;
var fetchRestaurantPromise = null;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantPromise.then(function(){
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: self.restaurant.latlng,
      scrollwheel: false
    });

    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = "restaurant-img lazyload";
  //image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('data-srcset', DBHelper.smallImageUrlForRestaurant(restaurant) + " 500w, " + 
    DBHelper.mediumImageUrlForRestaurant(restaurant) + " 650w, " +
    DBHelper.imageUrlForRestaurant(restaurant) + " 800w");
  image.alt = `Picture of the "${restaurant.name}" restaurant`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
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
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
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
  const divTitle = document.createElement('div');
  divTitle.className = "review-title";
  li.appendChild(divTitle);

  const name = document.createElement('p');
  name.className = "review-author";
  name.innerHTML = review.name;
  divTitle.appendChild(name);

  const date = document.createElement('p');
  date.className = "review-date";
  date.innerHTML = review.date;
  divTitle.appendChild(date);

  const divBody = document.createElement('div');
  divBody.className = "review-body";
  li.appendChild(divBody);

  const rating = document.createElement('p');
  rating.className = "review-rating";
  rating.innerHTML = `Rating: ${review.rating}`;
  divBody.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  divBody.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  breadcrumb.appendChild(li);

  const lnk = document.createElement('a');
  lnk.innerText = restaurant.name;
  lnk.href = window.location.href;
  lnk.setAttribute('aria-current', 'page');
  li.appendChild(lnk);
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

init = () => {
  fetchRestaurantPromise = new Promise(function (resolve, reject) {
    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
        reject(error);
      } else {
        fillBreadcrumb();
        resolve();
      }
    });
  }).then(function(){
    new IOlazy({
      image: '.lazyload'
    });
  });;
}

init();