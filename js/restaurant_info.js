let restaurant;
let reviews;
var map;
var fetchRestaurantPromise = null;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantPromise.then(function () {
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
    DBHelper.fetchRestaurantById(parseInt(id), (error, restaurant) => {
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
  const name = document.getElementById('restaurant-name-text');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = "restaurant-img lazyload";
  image.setAttribute('data-srcset', DBHelper.imageSrcsetForRestaurant(restaurant));
  image.alt = `Picture of the "${restaurant.name}" restaurant`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  fillIsFavoriteHTML();
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

fillIsFavoriteHTML = (isFavorite = (self.restaurant.is_favorite == "true")) => {
  const favorite = document.getElementById('favorite');
  if (isFavorite) {
    favorite.classList.add("is-favorite");
    favorite.setAttribute('title', "Remove from favorites");
  }
  else {
    favorite.classList.remove("is-favorite");
    favorite.setAttribute('title', "Add to favorites");
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

  const ul = document.getElementById('reviews-list');
  container.appendChild(ul);

  if (!reviews) {
    return;
  }

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
}

appendNewReview = (review) => {
  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML(review));
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
  name.innerHTML = (review.name == "")
    ? "anonymous"
    : review.name;
  divTitle.appendChild(name);

  const date = document.createElement('p');
  date.className = "review-date";
  date.innerHTML = (new Date(review.updatedAt)).toLocaleDateString("en-GB");
  divTitle.appendChild(date);

  const divBody = document.createElement('div');
  divBody.className = "review-body";
  li.appendChild(divBody);

  const rating = document.createElement('p');
  rating.className = "review-rating";
  rating.innerHTML = `Rating: ${review.rating}`;
  divBody.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = (review.comments == "")
    ? "(no comment)"
    : review.comments;
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

onReviewsElemShown = (entries, observer) => {
  if (entries.length > 0 &&
    entries[0].isIntersecting) {

    const reviewsContainer = document.querySelector('#reviews-container');
    observer.unobserve(reviewsContainer);

    DBHelper.fetchReviews(self.restaurant.id)
      .then(function (reviews) {
        self.reviews = reviews;
        fillReviewsHTML();
      });
  }
}

observeReviewScroll = () => {
  const reviewsObserver = new IntersectionObserver(onReviewsElemShown, {});
  const reviewsContainer = document.querySelector('#reviews-container');
  reviewsObserver.observe(reviewsContainer);
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

formOnSubmit = (evt) => {
  evt.preventDefault();

  const formAddReview = document.querySelector('#form-add-review');
  const rating = formAddReview.querySelector('select[name=rating]').value;
  const comment_text = formAddReview.querySelector('textarea[name=comments]').value;
  const name = formAddReview.querySelector('input[name=name]').value;

  const date = new Date();

  const newReview = {
    "restaurant_id": self.restaurant.id,
    "name": name,
    "rating": rating,
    "comments": comment_text,
    "updatedAt": date.toISOString(),
    //"key" is needed in order to delete a postponed review when it gets posted when we are back online
    "key": date.toISOString()
  };

  requestIdleCallback(() => appendNewReview(newReview));

  DBHelper.postReview(newReview).catch(function () {
    DBHelper.postponeReview(newReview);
  });
}

btnFavoriteClick = (evt) => {
  evt.preventDefault();

  self.restaurant.is_favorite = (self.restaurant.is_favorite == "true")
    ? "false"
    : "true";

  DBHelper.insertRestaurantToIDB(self.restaurant.id, self.restaurant);

  requestIdleCallback(() => fillIsFavoriteHTML());

  DBHelper.postRestaurant(self.restaurant).catch(function () {
    DBHelper.postponeRestaurant(self.restaurant);
  });
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
  }).then(function () {
    observeImageScroll();
    observeReviewScroll();
    observeMapScroll();
  });

  var formAddReview = document.querySelector('#form-add-review');
  formAddReview.addEventListener("submit", formOnSubmit);

  var btnFavorite = document.querySelector('#favorite');
  btnFavorite.addEventListener("click", btnFavoriteClick);

  registerOnlineEventHandler();
  DBHelper.sendPostponedRequests();
}

init();