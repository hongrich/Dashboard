var _gLastMovieDataFetchDate;

function markLastMovieDataFetchDate() {
	_gLastMovieDataFetchDate = new Date();
}

// return true if midnight (local time) has passed since data was last fetched
function getShouldFetchNewMovieData() {
	if (!_gLastMovieDataFetchDate) {
		return true;
	}
	// getDate() returns day of month as number
	var midnightHasPassedSinceLastFetch = (new Date().getDate() != _gLastMovieDataFetchDate.getDate());
	return midnightHasPassedSinceLastFetch;
}

function markShouldFetchNewData() {
	_gLastMovieDataFetchDate = null;
}

function prepareAsyncGetRequest(url, successCallback) {
	Utils.hideElement($("errorMsgBox"));

	var req = new XMLHttpRequest();
	req.onload = function(evt) {successCallback(evt, req)};
	req.onerror = onHttpError;
	url = encodeURI(url);
	req.open("GET", url, true);
	req.overrideMimeType("text/xml");
	req.setRequestHeader("Cache-control","No-cache");
	req.setRequestHeader("Pragma","No-cache");
	return req;
}

function onHttpError(evt) {
	alert("Error occured while loading data: " + evt.target.status);
	handleNetworkError();
}

function handleNetworkError() {
	alert("MOVIES NETWORK ERROR");
	Utils.hideElement($("posterWrap"));
	if (!isInCompactView()) {
		showingErrorMsgBox = true;
		setTimeout(showErrorMsgBox, 2000);
		shrinkWidget();
	} else if (!showingErrorMsgBox) {
		showingErrorMsgBox = true;
		showErrorMsgBox();
	}
}

function handleNoMovieDataAvailable() {
	alert("NO MOVIE DATA AVAILABLE");
	if (isInCompactView()) {
		resizePhase1();
	} else{
		setTimeout(showBack, 600);
		setTimeout(function () {
			showMenuItem(getLocalizedString("No movie data available"));
		}, 1300);
	}
}

var showingErrorMsgBox;

function showErrorMsgBox() {
	var errorMsgBox = $("errorMsgBox");
	errorMsgBox.innerHTML = getLocalizedString("No movie data available");
	Utils.hideElement($("posterWrap"));
	Utils.showElement(errorMsgBox);
	markShouldFetchNewData();
	showingErrorMsgBox = false;
}

// returns either "&op=performancesbycitystatesearch&city=sunnyvale&state=ca"
//  or "&op=performancesbypostalcodesearch&postalcode=94087"
function getMethodAndLocationQueryStringFragment() {
	var location = getLocation();
	if (isValidPostalCode(location)) {
		return "&op=performancesbypostalcodesearch&postalcode=" + location;
	} else {
		var index = location.indexOf(",");
		var city  = Utils.trimWhiteSpace(location.substring(0, index));
		var state = location.substring(index+1);
		if (state && state.length) {
			state = Utils.trimWhiteSpace(state);
		} else {
			state = "";
		}
		return "&op=performancesbycitystatesearch&city=" + city + "&state=" + state;
	}
}

var _gWaitingForMoviesDataToLoad;

function fetchAllData() {
	if (!getShouldFetchNewMovieData()) {
		// skip fetching data and go to end of callback
		afterAllDataFetched();
	} else {
		_gWaitingForMoviesDataToLoad = false;
		fetchMoviesData();
		fetchAppleResourceUrlData();
	}
}

function fetchMoviesData() {
	if (fetchMoviesData.req) {
		fetchMoviesData.req.abort();
		fetchMoviesData.req = null;
	}

	var url = "http://wu.apple.com/frdi?pid=A99D3D1A-774C-49149E&verbosity=1&date="
		+ getDate() + getMethodAndLocationQueryStringFragment();
	
	var req = prepareAsyncGetRequest(url, moviesDataFetched);
	fetchMoviesData.req = req;
	markLastMovieDataFetchDate();
	req.send(null);

	initAllMoviesTable();
	initAllTheatersTable();
}

function moviesDataFetched(evt, req) {
	var doc;
	try {
		doc = req.responseXML;
		if (!doc || !doc.documentElement) {
			handleNetworkError();
			return;
		}
		
		var err = parseMovies(doc);
		if (err) return;
		err = parseTheaters(doc);
		if (err) return;
		
		if (_gWaitingForMoviesDataToLoad) {
			parseAppleResourceUrlData();
		}
	} catch (e) {
		alert("Runtime Error: " + e);
		// handle missing network connection or no vendor data
		handleNoMovieDataAvailable();
	} finally {
		req = doc = null;
	}
}

function parseMovies(doc) {
	var movieEls = doc.getElementsByTagName("movie");
	var movie;
	if (!movieEls || !movieEls.length) {
		handleNoMovieDataAvailable();
		return -1;
	}
	for (var i = 0; i < movieEls.length; i++) {
		movie = movieObjectForMovieElement(movieEls[i]);
		allMoviesTable[movie.id] = movie;
	}
	allMoviesList = getSortedArrayForTable(allMoviesTable);
	return 0;
}

function parseTheaters(doc) {
	var theaterEls = doc.getElementsByTagName("theater");
	if (!theaterEls || !theaterEls.length) {
		handleNoPerformanceDataAvailable();
		return -1;
	}

	var theater, theaterEl;
	for (var i = 0; i < theaterEls.length; i++) {
		theaterEl = theaterEls[i];
		theater = theaterObjectForTheaterElement(theaterEl);
		consumePerformanceDataForTheater(theater, theaterEl);
		theater.movies.sort(comparatorFunction);
		allTheatersTable[theater.id] = theater;
	}
	allTheatersList = getSortedArrayForTable(allTheatersTable);
	for (var id in allMoviesTable) {
		allMoviesTable[id].theaters.sort(comparatorFunction);
	}

	if (!currentTheaterId) {
		currentTheaterId = allTheatersList[0].id;
	}
	return 0;
}

var _gAppleResourceUrlDoc;

function fetchAppleResourceUrlData() {
	_gAppleResourceUrlDoc = null;
	if (fetchAppleResourceUrlData.req) {
		fetchAppleResourceUrlData.req.abort();
		fetchAppleResourceUrlData.req = null;
	}
	var url = "http://www.apple.com/trailers/home/xml/widgets/indexall.xml" ;
	var req = prepareAsyncGetRequest(url, appleResourceUrlDataFetched);
	fetchAppleResourceUrlData.req = req;
	req.send(null);
}

function appleResourceUrlDataFetched(evt, req) {
	_gAppleResourceUrlDoc = req.responseXML;
	if (!allMoviesList) {
		_gWaitingForMoviesDataToLoad = true;
	} else {
		parseAppleResourceUrlData();
	}
}

function parseAppleResourceUrlData() {
	posterMovieIds = [];
	var doc;
	var id, movie;
	try {
		doc = _gAppleResourceUrlDoc;
		var movieInfoEl;
		var posterEls;
		var previewEls;
		var movieInfoEls = doc.getElementsByTagName("movieinfo");
		
		for (var i = 0; i < movieInfoEls.length; i++) {
			movieInfoEl = movieInfoEls[i];
			id = movieInfoEl.getAttribute("fandangoid");
			movie = allMoviesTable[id];
			if (movie) {
				consumeResourceUrlDataForMovie(movieInfoEl, movie);
				movie.complete = true;
				posterMovieIds.push(id);
			}
		}	
	} catch (e) {
		// ignore. if there's no poster or trailer resources, no biggie.
	} finally {
		req = null;
		doc = null;
		_gAppleResourceUrlDoc = null;
		afterAllDataFetched();
	}
}

function afterAllDataFetched() {
	if (isInCompactView()) {
		var posterUrl = kDefaultPosterUrl;
		if (posterMovieIds && posterMovieIds.length) {
			posterIndex = randomIntegerZeroToNInclusive(posterMovieIds.length);
			posterUrl = allMoviesTable[posterMovieIds[posterIndex]].posterUrl;
		}
		poster1.src = posterUrl;
		poster2.src = posterUrl;
		startPosterFadeAnimationLoop();
		addPosterClickedEventListener();
	} else {
		displayAllMovieInfo();
	}
}

function getTicketPurchasePageUrl(movieId, theaterId, time) {
	//"07-18-2007+22:25"
	// must create this format string. create lazily here, rather than during initial response parsing.
	var len = time.time.length-2;
	var isPM = ("pm" == time.time.substring(len));
	var timeStr = time.time.substring(0, len);
	var indexOfColon = timeStr.indexOf(":");
	var hours = parseInt(timeStr.substring(0, indexOfColon), 10);
	var mins = timeStr.substring(indexOfColon);
	if (isPM) {
		if (hours < 12) {
			hours += 12;
			timeStr = hours + mins;
		}
	} else if (hours == 12) {
		timeStr = "00" + mins;
	}
	var dateStr = time.date.replace(/\//g, "-");
	var url = "http://wu.apple.com/redirect.aspx?&mid=" + movieId
	 	+ "&a=11617&tid=" + theaterId
	 	+ "&dte=0&date=" + dateStr
	 	+ "+"  + timeStr;
	return url;
}

function validateLocation(location) {
	if (validateLocation.req) {
		validateLocation.req.abort();
		validateLocation.req = null;
	}
	
	var locStr = $("locationTextField").value;
	var city = "";
	var state = "";
	
	var index = locStr.indexOf(",");
	if (-1 == index) {
		index = locStr.lastIndexOf(" ");
	}
	if (index > -1) {
		city = locStr.substring(0, index);
		state = locStr.substring(index+1);
	} else {
		city = locStr;
	}
	
	var url = "http://wu.apple.com/frdi?pid=A99D3D1A-774C-49149E&op=citysearch&city="
		+ city + "&state=" + state;
	
	var req = prepareAsyncGetRequest(url, locationValidationFetched);
	validateLocation.req = req;
	req.send(null);
}

function locationValidationFetched(evt, req) {
	var doc = req.responseXML;
	
	var result;
	if (!doc || !doc.documentElement) {
		result = {error:true};
	} else {
		var locationEls = doc.getElementsByTagName("location");
		result = {error:false, cities:new Array()};

		for (var i = 0; i < locationEls.length; i++) {
			var locationEl = locationEls[i];
			var city 	   = locationEl.getElementsByTagName("city").item(0).textContent;
			var state 	   = locationEl.getElementsByTagName("state").item(0).textContent;
			result.cities.push({city:city, state:state});
		}
	}
	validationCallback(result);
	req = doc = null;
}