var kDefaultLocation = "Cupertino, CA";
var kLocationKey = "location";

var kDefaultPosterUrl = "Images/poster.png";
var front;
var expandedView;
var expandedTop;
var browserContainer;
var bottomPane;
var movieInfoPane;
var theaterInfoPane;
var trailerPane;
var posterWrap;
var poster1;
var poster2;

var posterIndex = 0;
var sortByMovies = true;
var allTheatersTable;
var allMoviesTable;
var allTheatersList;
var allMoviesList

var currentMovieId;
var currentTheaterId;
var currentTimeId;
var posterMovieIds;

var posterFadeTimeoutId;
var posterFadeTimer;
var posterFadeMillis = 2000;
var posterHoldMillis = 2000;

var currentMovieInfoScrollbar;
var currentTheaterInfoScrollbar;

var kFrontCollapsedWidth  = 176;
var kFrontCollapsedHeight = 235;
var kFrontExpandedWidth   = 500;
var kFrontExpandedHeight  = 418;
var kExpandedTopHeight    = 177;

var kResizePhase1Duration = 300;
var kResizePhase2Duration = 300;
var kResizePhase3Duration = 300;
var kResizePhase4Duration = 300;
var kSlowMoFactor = 5;
var kAnimationFrameRate   = 13;

var browser;

function $(id) {
	return document.getElementById(id);
}

function createKey(key) {
	if (window.widget) {
        key = widget.identifier + "-" + key;
	}
	return key;
}

function setInstanceAndGlobalPreferenceForKey(value, key) {
	setInstancePreferenceForKey(value, key);
	setGlobalPreferenceForKey(value, key)
}

function setInstancePreferenceForKey(value, key) {
	setGlobalPreferenceForKey(value, createKey(key));
}

function setGlobalPreferenceForKey(value, key) {
	if (window.widget) {
		widget.setPreferenceForKey(value, key);
	}
}

function preferenceForKey(key) {
	var result;
	if (window.widget) {
		result = widget.preferenceForKey(createKey(key));
		if (!result) {
			result = widget.preferenceForKey(key);
		}
	}
	if (!result) {
		result = eval("kDefault" + key.substring(0,1).toUpperCase() + key.substring(1));
	}
	return result;
}

function loadPreferences() {
	var location = preferenceForKey(kLocationKey)
	$("locationTextField").value = location;
	setInstanceAndGlobalPreferenceForKey(location, kLocationKey);
}

function isValidLocation(n) {
	if (isFinite(n)) {
		return isValidPostalCode(n);
	}
	return locationValidated;
}

function isValidPostalCode(n) {
	return n && isFinite(n) && 5 == n.toString().length && n > 0;
}

function checkLocation() {	
	var textField = $("locationTextField");
	var location = textField.value;
	if (checkLocation.location != location) {
		checkLocation.locationChanged = true;
	} else {
		checkLocation.locationChanged = false;
	}
	
	if (isFinite(location) && !isValidPostalCode(location)) {
		showMenuItem(getLocalizedString("Invalid Zip Code."));
		return false;
	} else if (checkLocation.locationChanged && !isValidLocation(location)) {
		locationChanged();
	} else {
		setInstanceAndGlobalPreferenceForKey(location, kLocationKey);
		return true;
	}
}

function showMenuItem(text) {
	if (window.widget) {
		var menu = widget.createMenu();
		menu.addMenuItem(text);
		menu.setMenuItemEnabledAtIndex(0, false);
		menu.popup(249, 107);
	}
}

function isInCompactView() {
	var grid = $("grid");
	return grid.className && grid.className.indexOf("collapsed") > -1;
}

function load() {
	if (window.widget) {
		widget.onshow = onshow;
		widget.onhide = onhide;
		widget.onsync = onsync;
		widget.onremove = onremove;
	}
	preLoadImages();
	locateGlobalElements();
	loadPreferences();
	createButtons();
	setUpLocalizedStrings();
	setUpDateSelect();
	
	document.addEventListener("keydown", documentKeyDown, false);
	// onshow is called on launch, but not after cmd-r.
	// therefore, must call fetch method here
	fetchAllData();
}

function preLoadImages() {
	var img = new Image();
	img.src = "Images/Controls/pause.png";
	img.src = "Images/Controls/play.png";
	img.src = "Images/Controls/back.png";
	img.src = "Images/Controls/pause_on.png";
	img.src = "Images/Controls/play_on.png";
	img.src = "Images/Controls/back_on.png";
	img.src = "Images/Controls/track.png";
	img.src = "Images/Controls/__trackthumb.png";
	img.src = "Images/Controls/__scrubthumbInny.png";
	img.src = "Images/Controls/__duration.png";
	img.src = "Images/selectorshort.png";
	img.src = "Images/poster.png";
	img.src = "Images/TrailerExtension.png";
}

function onshow() {
	if (isInCompactView()) {
		if (getShouldFetchNewMovieData()) {
			fetchAllData();
			setUpDateSelect();
		} else {
			if (!Utils.isShowing($("errorMsgBox"))) {
				startPosterFadeAnimationLoop();
			}
		}
	} else {
		if (getShouldFetchNewMovieData()) {
			startProgressAnimation();
			clearFront(fetchAllData);
			setUpDateSelect();
		}
	}
}

function onhide() {
	stopPosterFadeAnimationLoop();
	if (movie && playing) {
		playPause();
	}
}

function onsync() {
	loadPreferences();
	markShouldFetchNewData();
	onshow();
}

function onremove() {
	setInstancePreferenceForKey(null, kLocationKey);
}

function locateGlobalElements() {
	front 			 = $("front");
	expandedView 	 = $("expandedView");
	expandedTop 	 = $("expandedTop");
	browserContainer = $("browserContainer");
	posterWrap 		 = $("posterWrap");
	poster1 		 = $("poster1");
	poster2 		 = $("poster2");
	bottomPane 		 = $("bottomPane");
	movieInfoPane 	 = $("movieInfoPane");
	theaterInfoPane  = $("theaterInfoPane");
	trailerPane 	 = $("trailerPane");
}

function createMovieButton(el, text, clickHandler) {
	return new AppleButton(el, text, 18,
						   null, null, 0,
						   null, null,
						   null, null, 0,
						   clickHandler);
}

function createButtons() {
	new AppleInfoButton($("infoButton"), front, "white", "white", showBack);
	new AppleGlassButton($("doneButton"), getLocalizedString("Done"), showFront);
	createMovieButton($("backButton"), "", backButtonClicked);
	createMovieButton($("playButton"), "", playPause);
}

function setUpLocalizedStrings() {
	setInnerText("moviesButton", "Movies");
	setInnerText("theatersButton", "Theaters");
	setInnerText("dateSelectText", "Today");
	setInnerText("trailerButton", "Trailer");
	setInnerText("ticketsButton", "Buy Tickets");
	setInnerText("releaseDateLabel", "Release date:");
	setInnerText("runtimeLabel", "Run time:");
	setInnerText("castLabel", "Cast:");
	setInnerText("directorsLabel", "Directors:");
	setInnerText("genresLabel", "Genre:");
	setInnerText("locationLabel", "City, State or Zip code:");
}

function setInnerText(id, text) {
	$(id).innerText = getLocalizedString(text);
}

function showBack() {
	if (browser) {
		browser.blur();
	}
	if (window.widget) {
        widget.prepareForTransition("ToBack");
	}
	Utils.hideElement(front);
	Utils.showElement($("back"));
	checkLocation.location = $("locationTextField").value;
	if (window.widget) {
		setTimeout("widget.performTransition();", 0);
	}
	setTimeout(selectAllInLocationTextField, 800);
}

function showFront() {
	dismissValidation();
	$("locationTextField").blur();

	if (!checkLocation()) {
		return;
	}
	if (window.widget) {
        widget.prepareForTransition("ToFront");
	}
	Utils.hideElement($("back"));
	Utils.showElement(front);
	if (checkLocation.locationChanged || !allMoviesList || !allMoviesList.length) {
		clearFront();
		startProgressAnimation();
		markShouldFetchNewData();
		setTimeout(fetchAllData, 200);
	}
	if (window.widget) {
		setTimeout("widget.performTransition();", 200);
	}
	// this should not be necessary, but...
	if (browser) {
		var path = browser.path();
		browser.setPath(path);
		browser.focus();
	}
}

function clearFront(callback, fade) {
	hideBottomPane(callback, fade);
	if (browser) {
		browser.clearAllColumns();
	}
}

function startProgressAnimation() {
	var daisyWheel = $("daisyWheel");
	Utils.showElement(daisyWheel);
	daisyWheel.style.opacity = 1;
}

function stopProgressAnimation() {
	var daisyWheel = $("daisyWheel");
	daisyWheel.style.opacity = 0;
	Utils.hideElement(daisyWheel);
}

function startPosterFadeAnimationLoop() {
	clearTimeout(posterFadeTimeoutId);
	posterFadeTimeoutId = null;
	Utils.showElement(posterWrap);
	if (isInCompactView()) {
		setTimeout(doCompactViewPosterAnimation, 0);
		posterFadeTimeoutId = setInterval(doCompactViewPosterAnimation,
										  posterHoldMillis + posterFadeMillis);
	}
}

function stopPosterFadeAnimationLoop() {
	clearTimeout(posterFadeTimeoutId);
	posterFadeTimeoutId = null;
}

var currentPosterId;
var currentPosterTimeoutId;
var isFadeOut;

function doCompactViewPosterAnimation() {
	if (!posterMovieIds || !allMoviesTable || !posterMovieIds || posterMovieIds.length < 2) {
		return;
	}
	isFadeOut = (posterIndex%2 == 0);
	var id;
	var i = posterIndex % posterMovieIds.length-1;
	if (isFadeOut) {
		id = posterMovieIds[i+1];
		poster2.src = allMoviesTable[id].posterUrl;
	} else {
		id = posterMovieIds[(i+1) % posterMovieIds.length];
		poster1.src = allMoviesTable[id].posterUrl;
	} 	

	if (!posterFadeTimer) {
		posterFadeTimer = new AppleAnimator(posterFadeMillis, kAnimationFrameRate);
		posterFadeTimer.oncomplete = posterFadeCompleteHandler;
		var func = function (an, curr, st, end) {fadeHandler(poster1, curr)};
		posterFadeAnimation = new AppleAnimation(0, 0, func);
		posterFadeTimer.addAnimation(posterFadeAnimation);
	}
	posterFadeAnimation.from = (isFadeOut) ? 1.0 : 0.0;
	posterFadeAnimation.to   = (isFadeOut) ? 0.0 : 1.0;
	posterFadeTimer.start();
	
	doCompactViewPosterAnimation.id = id;
	if (!currentPosterId) {
		updateCurrentPosterId();
	}
	currentPosterTimeoutId = setTimeout(updateCurrentPosterId, posterFadeMillis*.75);
}

function updateCurrentPosterId() {
	currentPosterId = doCompactViewPosterAnimation.id;
}

function posterFadeCompleteHandler() {
	isFadeOut = (posterIndex%2 == 0);
	if (isFadeOut) {
		poster1.src = null;
	} else {
		poster2.src = null;
	}
	++posterIndex;
}

function posterClicked(evt) {
	if (!posterMovieIds) {
		return;
	}
	removePosterClickedEventListener()
	clearTimeout(currentPosterTimeoutId);
	sortByMovies = true;
	Utils.removeClassName($("theatersButton"), "selected");
	Utils.addClassName($("moviesButton"), "selected");

	currentMovieId = currentPosterId;

	stopPosterFadeAnimationLoop();
	posterFadeTimer = null;
	posterFadeAnimation = null;
	var currIndex = posterIndex % posterMovieIds.length;
	var slowMo = (evt && evt.shiftKey);
	var isReverse = false;
	resizePhase1(slowMo, isReverse);
}

// this phase fades out the posters and gloss
function resizePhase1(slowMo, isReverse) {
	var duration = slowMo ? kResizePhase1Duration * kSlowMoFactor : kResizePhase1Duration;
	var animator = new AppleAnimator(duration, kAnimationFrameRate);
	var startVal = (isReverse) ? 0 : 1;
	var endVal = (isReverse) ? 1 : 0;
	var handler = function(an, curr, start, end) {fadeHandler(posterWrap, curr)};
	var anime = new AppleAnimation(startVal, endVal, handler);
	animator.addAnimation(anime);
	animator.oncomplete = function() {resizePhase1CompleteHandler(slowMo, isReverse)};
	animator.start();
}

function resizePhase1CompleteHandler(slowMo, isReverse) {
	posterWrap.style.opacity = (isReverse) ? 1 : 0;
	if (isReverse) {
		if (showingErrorMsgBox) {
			Utils.hideElement(posterWrap);
		} else {
			startPosterFadeAnimationLoop();
			addPosterClickedEventListener();
		}
	} else {
		resizePhase2(slowMo, false);
		resizePhase3(slowMo, false);
		if (window.widget) {
			widget.resizeAndMoveTo(window.screenX, window.screenY, kFrontExpandedWidth, kFrontExpandedHeight);
		}
	}
}

// this phase actually resizes the widget
function resizePhase2(slowMo, isReverse) {

	var smallRect = new AppleRect(0, 0, kFrontCollapsedWidth, kFrontCollapsedHeight);
	var largeRect = new AppleRect(0, 0, kFrontExpandedWidth, kFrontExpandedHeight);
	var startRect = (isReverse) ? largeRect : smallRect;
	var endRect   = (isReverse) ? smallRect : largeRect;
	var duration = slowMo ? kResizePhase2Duration * kSlowMoFactor : kResizePhase2Duration;
	var animator = new AppleAnimator(duration, kAnimationFrameRate);
	var anime = new AppleRectAnimation(startRect, endRect, resizePhase2Handler);
	animator.addAnimation(anime);
	animator.oncomplete = function() {resizePhase2CompleteHandler(slowMo, isReverse)};
	animator.start();
}

function resizePhase2Handler(anime, currRect, startRect, endRect) {
	front.style.width = parseInt(currRect.right) + "px";
	front.style.height = parseInt(currRect.bottom) + "px";
}

function resizePhase2CompleteHandler(slowMo, isReverse) {
	if (isReverse) {
		front.style.width = kFrontCollapsedWidth + "px";
		front.style.height = kFrontCollapsedHeight + "px";
		if (window.widget) {
			widget.resizeAndMoveTo(window.screenX, window.screenY, kFrontCollapsedWidth, kFrontCollapsedHeight);
		}		
		resizePhase1(slowMo, isReverse);
	} else {
		front.style.width = kFrontExpandedWidth + "px";
		front.style.height = kFrontExpandedHeight + "px";
		//resizePhase3(slowMo, isReverse);
	}
}

// this phse slides down the gray background
function resizePhase3(slowMo, isReverse) {
	var duration = slowMo ? kResizePhase3Duration * kSlowMoFactor : kResizePhase3Duration;
	var start = (isReverse) ? kExpandedTopHeight : 7;
	var end = (isReverse) ? 7 : kExpandedTopHeight;
	var animator = new AppleAnimator(duration, kAnimationFrameRate);
	var anime = new AppleAnimation(start, end, resizePhase3Handler);
	animator.addAnimation(anime);
	animator.oncomplete = function() {resizePhase3CompleteHandler(slowMo, isReverse)};
	animator.start();
	Utils.showElement(expandedView);
}

function resizePhase3Handler(anime, curr, start, end) {
	expandedTop.style.height = curr + "px";
}

function resizePhase3CompleteHandler(slowMo, isReverse) {
	if (isReverse) {
		Utils.hideElement(expandedView);
		//resizePhase2(slowMo, isReverse);
	} else {
		expandedTop.style.height = kExpandedTopHeight + "px";
		Utils.hideElement(posterWrap);
		resizePhase4(slowMo, isReverse);
	}
}

// browser fades in
function resizePhase4(slowMo, isReverse) {
	if (isReverse) {
		$("grid").className = "collapsed";
		Utils.hideElement($("infoButton"));
	} else {
		browserContainer.style.opacity = 0;
		expandedTop.style.opacity = 0;
		Utils.showElement(browserContainer);
		Utils.showElement(expandedTop);
	}

	var duration = slowMo ? kResizePhase4Duration * kSlowMoFactor : kResizePhase4Duration;
	var animator = new AppleAnimator(duration, kAnimationFrameRate);
	var handler = function(an, curr, start, end) {
		fadeHandler(browserContainer, curr);
		fadeHandler(expandedTop, curr);
	};
	var start = (isReverse) ? 1 : 0;
	var end = (isReverse) ? 0 : 1;
	var anime = new AppleAnimation(start, end, handler);
	animator.addAnimation(anime);
	animator.oncomplete = function() {resizePhase4CompleteHandler(slowMo, isReverse)};
	animator.start();

	if (isReverse) {
		removeTopbarEventListener();
	}
}

function resizePhase4CompleteHandler(slowMo, isReverse) {
	if (isReverse) {
		browserContainer.style.opacity = 0;
		expandedTop.style.opacity = 0;
		Utils.hideElement(browserContainer);
		Utils.hideElement(expandedTop);
		resizePhase2(slowMo, isReverse);
		resizePhase3(slowMo, isReverse);
	} else {
		Utils.showElement($("infoButton"));
		browserContainer.style.opacity = 1;
		expandedTop.style.opacity = 1;
		$("grid").className = "expanded";
		startProgressAnimation();
		displayAllMovieInfo();
	}
}

function displayAllMovieInfo() {
	try {
		populateBrowserInfo();
	} catch (e) {
		handleNoMovieDataAvailable();
		return;
	}
	makeBrowserSelections();
	stopProgressAnimation();
}

function fadeHandler(el, current) {
	el.style.opacity = current;
}

function setUpDateSelect() {
	var date = new Date();
	
	// today
	var html = "<option value='" + serializedStringForDate(date) +"'>" + getLocalizedString("Today") + "</option>";
	// tomorrow
	date.setTime( date.getTime() +  86400000 ); // add a day
	html += "<option value='" + serializedStringForDate(date) +"'>" + getLocalizedString("Tomorrow") + "</option>";
	// next 5 days
	for (var i = 0; i < 5; i++) {
		date.setTime( date.getTime() +  86400000 ); // add a day
		html += "<option value='" + serializedStringForDate(date) +"'>" + displayStringForDate(date) + "</option>";
	}

	var dateSelectEl = $("dateSelect");
	dateSelectEl.innerHTML = html;
	updateDateSelectText();
}

/**
 *	Returns date in string format: "yyyy-mm-dd" eg "2006-10-16" for October 16, 2006
 */
function serializedStringForDate(date) {
	var month = date.getMonth() + 1; // 0-based month, eg 0 == Jan, 11 == Dec so add 1
	var day   = date.getDate(); 	 // 1-based day of month eg 1 thru 31

	month = (month < 10) ? "0" + month : "" + month;	// pad single digits
	day   = (day   < 10) ? "0" + day   : "" + day;		// pad single digits

	var year = date.getFullYear();
	return year + "-" + month + "-" + day;
}

function displayStringForDate(date) {
	var result = date.toDateString();
	return result.substring(0, result.lastIndexOf(" "));
}

function getLocalizedString(string) {
	try { string = localizedStrings[string] || string; } catch (e) {}
	return string;
}

function dateSelectChanged(evt) {
	startProgressAnimation();
	updateDateSelectText();
	markShouldFetchNewData();
	var callback = function () {
		clearFront(fetchAllData, true);
	};
	if (Utils.isShowing(trailerPane)) {
		stopMovie(callback);
	} else {
		callback();
	}
	Utils.consumeEvent(evt);
}

function updateDateSelectText() {
	var selectEl = $("dateSelect");
	var displayStr = selectEl.options[selectEl.selectedIndex].innerHTML;
	$("dateSelectText").innerHTML = displayStr;
}

function hideBottomPane(callback, fade) {
	var callbackFunc = function () {
		Utils.hideElement(theaterInfoPane);
		Utils.hideElement(trailerPane);
		if (!fade) {
			bottomPaneFadeOutCompleteHandler(callback);
		} else {
			var func = function(anime, curr, st, fin) {fadeHandler(bottomPane, curr)};
			var timer = new AppleAnimator(kResizePhase4Duration, kAnimationFrameRate, 1, 0, func);
			timer.oncomplete = function() {bottomPaneFadeOutCompleteHandler(callback)};
			timer.start();
		}
	}
	if (Utils.isShowing(trailerPane)) {
		stopMovie(callbackFunc);
	} else {
		callbackFunc();
	}
}

function showBottomPane(fade) {
	var duration = (fade) ? 200 : 0;
	Utils.showElement(bottomPane);
	var func = function(anime, curr, st, fin) {fadeHandler(bottomPane, curr)};
	var timer = new AppleAnimator(duration,	kAnimationFrameRate, 0.0, 1.0, func);
	timer.oncomplete = bottomPaneFadeInCompleteHandler;
	timer.start();
}

function bottomPaneFadeOutCompleteHandler(callback) {
	bottomPane.style.opacity = 0;
	if (callback) {
		callback();
	}
	browser.focus();
}

function bottomPaneFadeInCompleteHandler() {
	bottomPane.style.opacity = 1;
}

function setUpCurrentInfoScrollbars() {
	var currentMovieInfoEl = $("currentMovieInfo");
	var currentTheaterInfoEl = $("currentTheaterInfo");
	if(Utils.isShowing(currentMovieInfoEl)) {
		if (currentMovieInfoScrollbar) {
			currentMovieInfoScrollbar.remove();
			currentMovieInfoScrollbar = null;
		}
		currentMovieInfoScrollbar = new AppleVerticalScrollbar($("currentMovieInfoScroll"));
		configureScrollbarWithCustomArt(currentMovieInfoScrollbar);
		new AppleScrollArea(currentMovieInfoEl, currentMovieInfoScrollbar).singleScrollPixels = 5;
	} else if (Utils.isShowing(currentTheaterInfoEl)) {
		if (currentTheaterInfoScrollbar) {
			currentTheaterInfoScrollbar.remove();
			currentTheaterInfoScrollbar = null;
		}
		currentTheaterInfoScrollbar = new AppleVerticalScrollbar($("currentTheaterInfoScroll"));
		configureScrollbarWithCustomArt(currentTheaterInfoScrollbar);
		new AppleScrollArea(currentTheaterInfoEl, currentTheaterInfoScrollbar).singleScrollPixels = 5;
	}
}

function configureScrollbarWithCustomArt(scrollbar) {
	scrollbar.setTrackStart("Images/infochannelTop.png", 8);
	scrollbar.setThumbStart("Images/infothumbTop.png", 7);
	scrollbar.setTrackMiddle("Images/infochannelCenter.png", 1);
	scrollbar.setThumbMiddle("Images/infothumbCenter.png", 1);
	scrollbar.setTrackEnd("Images/infochannelBottom.png", 8);
	scrollbar.setThumbEnd("Images/infothumbBottom.png", 8);
}

var kPosterGraphicHeight = 143;

function populateInfoPaneWithMovieInfo(movie) {
	$("currentTitle").innerHTML 	= spanWithText(movie.title);
	
	populateSingleMovieInfoItem(movie, "rating");	
	populateSingleMovieInfoItem(movie, "releaseDate");
	populateSingleMovieInfoItem(movie, "runtime");
	populateSingleMovieInfoItem(movie, "genres");
	populateSingleMovieInfoItem(movie, "cast");
	populateSingleMovieInfoItem(movie, "directors");
	populateSingleMovieInfoItem(movie, "synopsis");
	$("currentPoster").src 			= movie.posterUrl;
	var currentPosterTitleEl = $("currentPosterTitle");
	if (movie.trailer && movie.trailer.url != "#") {
		$("trailerButton").className = "enabledActionButton";
		Utils.hideElement(currentPosterTitleEl);
	} else {
		Utils.showElement(currentPosterTitleEl);
		currentPosterTitleEl.innerHTML = movie.title;
		// center the movie name vertically
		var style = document.defaultView.getComputedStyle(currentPosterTitleEl, "");
		var movieTitleHeight = parseInt(style.getPropertyValue("height"), 10);
		movieTitleHeight = (isNaN(movieTitleHeight) ? 0 : movieTitleHeight);
		var posY = (kPosterGraphicHeight - movieTitleHeight) / 2;
		currentPosterTitleEl.style.top = posY + "px";
		$("trailerButton").className = "disabledActionButton";
	}
}

function populateSingleMovieInfoItem(movie, name) {
	var value = movie[name];
	value = (value instanceof Array) ? value.join(", ") : value;
	var id = "current" + name.substring(0,1).toUpperCase() + name.substring(1);
	var valueEl = $(id);
	var labelEl = $(name + "Label");
	if (value) {
		valueEl.innerHTML = spanWithText(value);
		Utils.showElement(valueEl);
		if (labelEl) Utils.showElement(labelEl);
	} else {
		Utils.hideElement(valueEl);
		if (labelEl) Utils.hideElement(labelEl);
	}
}

function spanWithText(text) {
	return "<span>" + text + "</span>";
}

var kTicketGraphicHeight = 82;

function populateInfoPaneWithTheaterInfo(theater) {
	$("currentTheaterName").innerHTML 	= theater.name;
	if (theater.address) {
		$("currentTheaterStreet").innerHTML = theater.address.street;
		$("currentTheaterCity").innerHTML 	= theater.address.city;
		$("currentTheaterState").innerHTML 	= theater.address.state;
		$("currentTheaterZip").innerHTML 	= theater.address.zip;
		$("currentTheaterPhone").innerHTML 	= theater.address.phone;
	}
	$("currentTheaterAddress").onclick 		= function () { widget.openURL(theater.mapUrl); };	
	
	// center the theater name vertically
	var currentTicketTitle = $("currentTicketTitle");
	currentTicketTitle.innerHTML = theater.name;
	var style = document.defaultView.getComputedStyle(currentTicketTitle, "");
	var theaterNameHeight = parseInt(style.getPropertyValue("height"), 10);
	var posY = (kTicketGraphicHeight - theaterNameHeight) / 2;
	currentTicketTitle.style.top = posY + "px";

	var html = "";
	if (theater.features && theater.features.length) {
		for (var i = 0; i < theater.features.length; i++) {
			html += "<li>" + theater.features[i] + "</li>";
		}
	}
	$("currentTheaterFeatures").innerHTML = html;
}

function setBuyTicketsButtonEnabled(yn) {
	$("ticketsButton").className = (yn) ? "enabledActionButton" : "disabledActionButton";
}

function theaterInfoButtonClicked(evt) {
	var li = Utils.getFirstAncestorOrSelfByTagName(evt.target, "li");
	currentTheaterId = li.id;
	Utils.consumeEvent(evt);
	if (Utils.isShowing(trailerPane)) {
		stopMovie(showTheaterInfo);
	} else if (Utils.isShowing(theaterInfoPane)) {
		if (sortByMovies) {
			hideBottomPane(showMovieInfo);
		} else {
			if (browser.path().length == 1) {
				hideBottomPane(showMovieInfo);
			} else {
				hideBottomPane();
				Utils.hideElement(theaterInfoPane);
			}
		}
	} else {
		hideBottomPane(showTheaterInfo);
	}
}

function showTheaterInfo(fade) {	
	Utils.showElement(bottomPane);
	Utils.showElement(theaterInfoPane);
	Utils.hideElement(movieInfoPane);
	Utils.hideElement(trailerPane);
	var theater = allTheatersTable[currentTheaterId];
	populateInfoPaneWithTheaterInfo(theater);
	showBottomPane(fade);
}

function showMovieInfo(fade) {
	Utils.hideElement(theaterInfoPane);
	Utils.hideElement(trailerPane);
	var movie = allMoviesTable[currentMovieId];
	Utils.showElement(bottomPane);
	Utils.showElement(movieInfoPane);
	populateInfoPaneWithMovieInfo(movie);
	setUpCurrentInfoScrollbars();
	showBottomPane(fade);
}

function showTrailer() {
	Utils.showElement(bottomPane);
	Utils.hideElement(movieInfoPane);
	Utils.hideElement(theaterInfoPane);
	Utils.showElement(trailerPane);
	showBottomPane();
	var trailerHeight = allMoviesTable[currentMovieId].trailer.height;
	resizeWidgetForTrailerHeightAndCallback(trailerHeight, loadMovie);
}

function trailerButtonClicked(evt) {
	if ($("trailerButton").className.indexOf("disabled") != -1) {
		return;
	}
	hideBottomPane(showTrailer, true);
}

function backButtonClicked(evt) {
	stopMovie(function(){showMovieInfo(true)});
	browser.focus();
}

function ticketsButtonClicked(evt) {
	if ($("ticketsButton").className == "disabledActionButton" || !window.widget) {
		return;
	}
	var rowIndex = browser.path()[2];
	var theater  = allTheatersTable[currentTheaterId];
	var tmsid 	 = theater.tmsid;
	var movie 	 = allMoviesTable[currentMovieId];
	var time  	 = movie.times[currentTheaterId][rowIndex];
	var url      = getTicketPurchasePageUrl(currentMovieId, tmsid, time);
	widget.openURL(url);
}

function moviesButtonClicked(evt) {
	Utils.consumeEvent(evt);
	if (sortByMovies) {
		return;
	}
	Utils.removeClassName($("theatersButton"), "selected");
	Utils.addClassName($("moviesButton"), "selected");
	switchSortByMethod();
}

function theatersButtonClicked(evt) {
	Utils.consumeEvent(evt);
	if (!sortByMovies) {
		return;
	}
	Utils.removeClassName($("moviesButton"), "selected");
	Utils.addClassName($("theatersButton"), "selected");
	switchSortByMethod();
}

function switchSortByMethod() {
	if (Utils.isShowing(trailerPane)) {
		stopMovie(doSwitchSortbyMethod);
	} else {
		doSwitchSortbyMethod();
	}
}

function doSwitchSortbyMethod() {
	sortByMovies = !sortByMovies;
	var path = browser.path();
	populateBrowserInfo();
	makeBrowserSelections(path);
}

function makeBrowserSelections(path) {
	var movie = allMoviesTable[currentMovieId];
	var theater = allTheatersTable[currentTheaterId];
	var obj = (sortByMovies) ? movie : theater;
	var row0Index = 0;
	var row1Index = -1;
	var row2Index = -1;
	if (obj) {
		row0Index = obj.index;
		var oldPathLen = (path) ? path.length : 0;
		if (oldPathLen > 1) {
			if (sortByMovies) {
				for (var i = 0; i < movie.theaters.length; i++) {
					if (movie.theaters[i].id == currentTheaterId) {
						row1Index = i;
						break;
					}
				}
			} else {
				for (var i = 0; i < theater.movies.length; i++) {
					if (theater.movies[i].id == currentMovieId) {
						row1Index = i;
						break;
					}
				}
			}
		}
	}
	browser.selectRowInColumn(row0Index, 0);
	if (row1Index > -1) {
		browser.selectRowInColumn(row1Index, 1);
	}
	if (oldPathLen > 2) {
		var times = movie.times[currentTheaterId];
		for (var i = 0; i < times.length; i++) {
			if (times[i].id == currentTimeId) {
				row2Index = i;
				break;
			}
		}
		if (row2Index > -1) {
			browser.selectRowInColumn(row2Index, 2);
		}
	}
}

function topbarClicked(evt) {
	Utils.consumeEvent(evt);
	if ("topbarClickRegion" != evt.target.id) {
		return;
	}
	var slowMo = evt.shiftKey;
	shrinkWidget(slowMo);
}

function shrinkWidget(slowMo) {
	removeTopbarEventListener();
	var isReverse = true;
	resizePhase4(slowMo, isReverse);
	clearFront(null, true);
}

function initAllMoviesTable() {
	allMoviesList = null;
	if (allMoviesTable) {
		for (var id in allMoviesTable) {
			allMoviesTable[id] = null;
			delete allMoviesTable[id];
		}
	}
	allMoviesTable = {};
}

function initAllTheatersTable() {
	allTheatersList = null;
	if (allTheatersTable) {
		for (var id in allTheatersTable) {
			allTheatersTable[id] = null;
			delete allTheatersTable[id];
		}
	}
	allTheatersTable = {};
}

function logoClicked(evt) {
	if (window.widget) {
		widget.openURL(getLocalizedString("http://fandango.com"));
	}
}

function getDate() {
	var date = $("dateSelect").value;
	if (!date) {	
		date = serializedStringForDate(new Date());
	}
	return date;
}

function getLocation() {
	return preferenceForKey(kLocationKey);
}

function randomIntegerZeroToNInclusive(n) {
	return Math.floor((Math.random()*new Date().getTime()) % n);
}

function appleHasResourcesForMovie(movieInfoEl) {
	var posterEls = movieInfoEl.getElementsByTagName("poster");
	return posterEls && posterEls.length;
}

function consumeResourceUrlDataForMovie(movieInfoEl, movie) {
	var posterUrl = getTextContentOfFirstDescendantByTagName(movieInfoEl, "poster");
	if (posterUrl && posterUrl.length) {
		movie.posterUrl = posterUrl;
		new Image().src = movie.posterUrl;
	}
	var previewEls = movieInfoEl.getElementsByTagName("preview");
	if (previewEls && previewEls.length) {
		var previewEl = previewEls.item(0);
		movie.trailer = {
			url: previewEl.textContent,
			height: previewEl.getAttribute("height")
		};
	}
	if (!movie.runtime) {
		movie.runtime = getTextContentOfFirstDescendantByTagName(movieInfoEl, "runtime");
	}
}

function populateBrowserInfo() {
	if (!browser) {
		browser = new AppleBrowser($("browser"), new MyBrowserDelegate());
	}
	browser.clearAllColumns();
	browser.renderColumn(0);
	addTopbarEventListener();
	browser.focus();
}

function getSortedArrayForTable(table) {
	var result = [];
	for (var key in table)
		result.push(table[key]);
	result.sort(comparatorFunction);
	for (var i = 0; i < result.length; i++) {
		result[i].index = i;
	}
	return result;
}

function addTopbarEventListener() {
	$("topbarClickRegion").addEventListener("click", topbarClicked, false);
	$("moviesButton").addEventListener("click", moviesButtonClicked, false);
	$("theatersButton").addEventListener("click", theatersButtonClicked, false);
}

function removeTopbarEventListener() {
	$("topbarClickRegion").removeEventListener("click", topbarClicked, false);
	$("moviesButton").removeEventListener("click", moviesButtonClicked, false);
	$("theatersButton").removeEventListener("click", theatersButtonClicked, false);
}

function documentKeyDown(evt) {
	if (!Utils.isShowing($("front"))) return;
	
	if (isInCompactView()) { 
		if (13 == evt.keyCode || 32 == evt.keyCode) { // return or spacebar
			posterClicked(evt);
			Utils.consumeEvent(evt);
		}
	} else if (Utils.isShowing($("trailerPane"))) {
		if (32 == evt.keyCode) { // spacebar
			playPause(evt);
			Utils.consumeEvent(evt);
		} else if (27 == evt.keyCode) { // esc
			backButtonClicked(evt);
			Utils.consumeEvent(evt);
		}
	} else if (evt.metaKey && 49 == evt.keyCode) { // cmd-1
		moviesButtonClicked(evt);
		Utils.consumeEvent(evt);
	} else if (evt.metaKey && 50 == evt.keyCode) {  // cmd-2
		theatersButtonClicked(evt);
		Utils.consumeEvent(evt);
	} else if (13 == evt.keyCode || 32 == evt.keyCode) { // return or spacebar
		if (currentMovieId && !playing) {
			trailerButtonClicked(evt);
			Utils.consumeEvent(evt);
		}
	}
}

function addPosterClickedEventListener() {
	posterWrap.addEventListener("click", posterClicked, false);
}

function removePosterClickedEventListener() {
	posterWrap.removeEventListener("click", posterClicked, false);
}

function comparatorFunction(a, b) {
	return a.compareTo(b);
}

function theaterObjectForTheaterElement(theaterEl) {
	var id = theaterEl.getAttribute("id");
	var tmsid = theaterEl.getAttribute("tmsid");
	var isWiredAttr = theaterEl.getAttribute("iswired");
	var canBuyTickets = (isWiredAttr && "true" == isWiredAttr.toLowerCase());
	var nameEls = theaterEl.getElementsByTagName("name");
	var name = "";
	if (nameEls && nameEls.length) {
		name = stringByRemovingDashes(nameEls.item(0).textContent);
	}
	var theater = new Theater(id, name, canBuyTickets);
	theater.tmsid 	 = tmsid;
	theater.address  = addressObjectForTheaterElement(theaterEl);
//	theater.features = featuresArrayForTheaterElement(theaterEl);
	theater.mapUrl   = mapUrlStringForAddressObject(theater.address);
		
	return theater;
}

function addressObjectForTheaterElement(theaterEl) {
	var address = {};
	address.street 	= getTextContentOfFirstDescendantByTagName(theaterEl, "address1");
	address.city 	= getTextContentOfFirstDescendantByTagName(theaterEl, "city");
	address.state	= getTextContentOfFirstDescendantByTagName(theaterEl, "state");
	address.zip 	= getTextContentOfFirstDescendantByTagName(theaterEl, "postalcode");
	address.country = getTextContentOfFirstDescendantByTagName(theaterEl, "country");
	address.phone = getTextContentOfFirstDescendantByTagName(theaterEl, "phonenumber");
	return address;
}

function getTextContentOfFirstDescendantByTagName(parent, tagName) {
	var nodeList = parent.getElementsByTagName(tagName);
	if (nodeList && nodeList.length) {
		return nodeList.item(0).textContent;
	} else {
		return "";
	}
}

function mapUrlStringForAddressObject(address) {
	return encodeURI("http://maps.google.com/maps?&q=" 
		+ address.street + ",+"
		+ address.city 	 + ",+"
		+ address.state  + ",+" 
		+ address.zip);
}

function consumePerformanceDataForTheater(theater, theaterEl) {
	var theaterId = theater.id;
	var movieEls = theaterEl.getElementsByTagName("movie");
	var movieEl;
	var movieId;
	var movie;
	for (var i = 0; i < movieEls.length; i++) {
		movieEl = movieEls[i];
		movieId = movieEl.getAttribute("id");
		movie = allMoviesTable[movieId];
		theater.movies.push(movie);
		var performanceEls = movieEl.getElementsByTagName("performance");
		var prformanceEl;
		var showdate;
		var showtime;
		var times = [];
		for (var j = 0; j < performanceEls.length; j++) {
			performanceEl = performanceEls[j];
			showdate = performanceEl.getAttribute("showdate");
			showtime = performanceEl.getAttribute("showtime").replace(" PM", "pm").replace(" AM", "am");
			times.push(new Time(showdate, showtime));
		}
		if (movie) {
			if (!containsObject(movie.theaters, theater)) {
				movie.theaters.push(theater);
				movie.times[theaterId] = times;
			}
		}
	}
}

stringByRemovingDashes.dashRegex = /-/g;
function stringByRemovingDashes(str) {
	return str.replace(stringByRemovingDashes.dashRegex, "");
}

function containsObject(a, n) {
	for (var i = 0; i < a.length; i++) {
		if (a[i] == n) 
			return true;
	}
	return false;
}

movieObjectForMovieElement.anTheRegex = /^(the|an)\s+(.+)/im;
movieObjectForMovieElement.underscoreRegex = /_/g;
function movieObjectForMovieElement(movieEl) {
	var id = movieEl.getAttribute("id");
	var title 		  = getTextContentOfFirstDescendantByTagName(movieEl, "title");
	title = title.replace(movieObjectForMovieElement.anTheRegex, "$2, $1");
	movie = new Movie(id, title);
	movie.rating 	  = getTextContentOfFirstDescendantByTagName(movieEl, "rating");
	movie.releaseDate = getTextContentOfFirstDescendantByTagName(movieEl, "releasedate");
	movie.synopsis 	  = getTextContentOfFirstDescendantByTagName(movieEl, "synopsis");
	var genreText 	  = getTextContentOfFirstDescendantByTagName(movieEl, "genre");
	var genreArray = [];
	if (genreText) {
		genreText = genreText.replace(movieObjectForMovieElement.underscoreRegex, " ");
		if (genreText.indexOf(",") > -1) {
			genreArray = genreText.split(",");
		} else {
			genreArray = [genreText];
		}
	}
	movie.genres = genreArray;
	movie.cast = [];
	var actorEls = movieEl.getElementsByTagName("member");
	if (actorEls) {
		for (var i = 0; i < actorEls.length; i++) {
			movie.cast.push(actorEls[i].textContent);
		}
	}
	movie.complete = false;	
	return movie;
}

/** Theater class */
function Theater(id, name, canBuyTickets, movies) {
	this.id = id;
	this.name = name;
	this.canBuyTickets = canBuyTickets;
	this.movies = [];
}

Theater.prototype.compareTo = function (that) {
	if (this.name < that.name)
		return -1;
	else if (that.name < this.name)
		return 1;
	else 
		return 0;
};

/** Time class */
function Time(dateStr, timeStr) {
	this.date = dateStr;
	this.time = timeStr;
}

/** Movie class */
function Movie(id, title) {
	this.id = id;
	this.title = title;
	this.sortTitle = title.toLowerCase();
	this.times = {};
	this.theaters = [];
	this.trailer = {};
	this.posterUrl = kDefaultPosterUrl;
	this.trailer = { url:"#", height:-1 };
}

Movie.prototype.compareTo = function (that) {
	if (this.sortTitle < that.sortTitle)
		return -1;
	else if (that.sortTitle < this.sortTitle)
		return 1;
	else 
		return 0;
};

/** Movie trailer stuff */

var playing;
var slider;
var sliderUpdateIntervalId;
var movieDownloadingIntervalId;
var progressIndicatorWidth;
var kSliderWidth = 353;
var kSliderLeft  = 136;

function getMovie() {
	if (!getMovie._movie) {
		getMovie._movie = $("movie");
	}
	return getMovie._movie;
}

function loadMovie() {
	browser.blur();
	Utils.showElement(trailerPane);
	updateMovieElement();
	movieDownloadingIntervalId = setInterval("movieDownloadingUpdate();",20);
}

function updateMovieElement() {
	var	trailerInfo = allMoviesTable[currentMovieId].trailer;
	var movie = getMovie();
	movie.setAttribute(   "src", trailerInfo.url);
	movie.setAttribute("height", trailerInfo.height);
}

function stopMovie(callback) {
	playing = false;
	clearInterval(sliderUpdateIntervalId);
	if (slider) {
		slider.setValue(0);
		slider.refresh();
	}
	var movie = getMovie();
	if (movie && movie.Stop) {
		movie.Stop();
	}
	Utils.hideElement(movie);
	Utils.hideElement(trailerPane);
	movieFinishedDownloadingHandler();
	$("trailerProgressIndicator").style.width = "0";
	resizeWidgetForTrailerHeightAndCallback(-1, function() {hideBottomPane(callback)});
}

movieDownloadingUpdate.isSliderSetUp = false;

function movieDownloadingUpdate() {
	var movie = getMovie();
	if (!movie || !movie.GetMaxBytesLoaded) {
		movieFailedToDownload();
		return;
	}
	
	if ("#" == movie.src) {
		movieFailedToDownload();
		return;
	}
	
	var status = movie.GetPluginStatus().toLowerCase();
	if (0 == status.indexOf("error")) {
		movieFailedToDownload();
		return;
	}

	var bytesLoaded = movie.GetMaxBytesLoaded();
	if (!bytesLoaded) {
		return;
	}

	if (!movieDownloadingUpdate.isSliderSetUp) {
		movieStartedDownloadingHandler();
	}

	var movieSizeInBytes = movie.GetMovieSize();
	if (bytesLoaded < movieSizeInBytes) {
		movieStillDownloadingHandler(bytesLoaded, movieSizeInBytes);
	} else {
		movieFinishedDownloadingHandler();
	}
}

function movieFailedToDownload() {
	clearInterval(movieDownloadingIntervalId);
	stopMovie(showMovieInfo);
}

function movieStartedDownloadingHandler() {
	playing = getMovie().GetAutoPlay();
	updatePlayPauseButton();
	setUpSlider();
	setUpSliderUpdateInterval();
	var trailerSlider = $("trailerSlider");
	trailerSlider.addEventListener("mousedown", trailerSliderMouseDownCapturePhase, true);
	document.addEventListener("mouseup", documentMouseUpCapturePhase, true);
	document.addEventListener("mousedown", documentMouseDownBubblePhase, false);
	movieDownloadingUpdate.isSliderSetUp = true;
}

function movieStillDownloadingHandler(bytesLoaded, movieSizeInBytes) {
	var ratio = bytesLoaded/movieSizeInBytes; 
	var progressIndicator = $("trailerProgressIndicator");
	progressIndicatorWidth = kSliderWidth*ratio;
	progressIndicator.style.width = progressIndicatorWidth + "px";
}

function movieFinishedDownloadingHandler() {
	clearInterval(movieDownloadingIntervalId);
	movieDownloadingUpdate.isSliderSetUp = false;
	var progressIndicator = $("trailerProgressIndicator");
	progressIndicatorWidth = kSliderWidth;
	progressIndicator.style.width = progressIndicatorWidth + "px";
}

function widgetHeightForTrailerHeight(trailerHeight) {
	trailerHeight = parseInt(trailerHeight);
	if (trailerHeight <= 204) { // -1, 200, 204
		return kFrontExpandedHeight;
	} else { // 224, 228, 260, 272, 360
		return trailerHeight + 214;
	}
}

function resizeWidgetForTrailerHeightAndCallback(trailerHeight, callback) {	
	Utils.hideElement(trailerPane);
	var widgetHeight = widgetHeightForTrailerHeight(trailerHeight);
	
	var timer = new AppleAnimator(300, kAnimationFrameRate);
	var startHeight = parseInt(front.style.height);
	var startRect = new AppleRect(0, 0, 0, startHeight);
	var finishRect = new AppleRect(0, 0, 0, widgetHeight);
	var frontAnime = new AppleRectAnimation(startRect, finishRect, resizeWidgetForTrailerHandler);
	timer.addAnimation(frontAnime);

	var isGrowing = startHeight < widgetHeight;
	timer.oncomplete = function() { resizeWidgetForTrailerCompleteHandler(widgetHeight, callback, isGrowing); };

	if (isGrowing) {
		if (window.widget) {
			widget.resizeAndMoveTo(screenX, screenY, window.innerWidth, widgetHeight);
		}
	}
	timer.start();
}

function resizeWidgetForTrailerHandler(rectAnime, currentRect, startRect, finishRect) {
	front.style.height = parseInt(currentRect.bottom) + "px";
}

function resizeWidgetForTrailerCompleteHandler(widgetHeight, callback, isGrowing) {
	front.style.height = widgetHeight + "px";
	if (!isGrowing) {
		if (window.widget) {
			widget.resizeAndMoveTo(screenX, screenY, window.innerWidth, widgetHeight);
		}
	}
	if (callback) {
		callback();
	}
}

function setUpSliderUpdateInterval() {
	sliderUpdateIntervalId = setInterval(updateSlider, 100);
}

function trailerSliderMouseDownCapturePhase(evt) {
	if (eventTargetIsPlayPauseButton(evt) || eventTargetIsMovie(evt)) {
		return;
	}
	slider.setThumb("Images/Controls/__scrubthumbInny.png", 18);
	slider.refresh();
	getMovie().Stop();
	slider.onchanged = sliderChanged;
}

function documentMouseUpCapturePhase(evt) {
	if (eventTargetIsPlayPauseButton(evt)) {
		return;
	}
	if (playing) {
		getMovie().Play();
	}
	slider.onchanged = null;
	slider.setThumb("Images/Controls/__trackthumb.png", 17);
}

function documentMouseDownBubblePhase(evt) {
	if (eventTargetIsMovie(evt)) {
		playPause();
		Utils.consumeEvent(evt);
	}
}

function eventTargetIsPlayPauseButton(evt) {
	return evt.target.id == "playButton";
}

function eventTargetIsMovie(evt) {
	return evt.target.id == "movie";
}

function setUpSlider() {
	if (slider) {
		slider.setValue(0);
		slider.refresh();
		return;
	}
	slider = new AppleHorizontalSlider($("trailerSlider"), null);
	slider.continuous = true;
	slider.setTrackStart(null, kSliderWidth);
	slider.setTrackMiddle(null, 0);
	slider.setTrackEnd(null, 0);
	slider.setThumb("Images/Controls/__trackthumb.png", 17);
	slider._thumb.style.zIndex = 10;
	$("trailerProgressIndicator").addEventListener("mousedown", sliderTrackMouseDownCapturePhase, true);
}

function playPause(evt) {
	Utils.consumeEvent(evt);
	if (playing) {
		getMovie().Stop();
		clearInterval(sliderUpdateIntervalId);
	} else {
		browser.blur();
		getMovie().Play();
		setUpSliderUpdateInterval();
	}
	playing = !playing;
	updatePlayPauseButton();
}

function sliderChanged(currentValue) {
	var movie = getMovie();
	movie.SetTime(movie.GetEndTime()*currentValue);
}

// override AppleHorizontalSlider instance method so that you can't drag the slider beyond 
// the current max movie loaded progress point.
AppleHorizontalSlider.prototype._getMousePosition = function(event) {
	if (event != undefined) {
		var maxX = progressIndicatorWidth + kSliderLeft;
		return (event.x > maxX ? maxX : event.x);
	} else {
		return 0;
	}
}

function sliderTrackMouseDownCapturePhase(evt) {
	slider._mousedownTrackHandler(evt);
}

function updateSlider() {
	var movie = getMovie();
	var currentTime = movie.GetTime();
	var endTime = movie.GetEndTime();
	if (currentTime >= endTime) { // check to see if the movie has ended.
		movieFinishedPlayingHandler();
		return;
	}
	slider.setValue(currentTime/endTime);
}

function movieFinishedPlayingHandler() {
	clearInterval(sliderUpdateIntervalId);
	playing = false;
	updatePlayPauseButton();
	slider.setValue(0);
	slider.refresh();
	getMovie().SetTime(0);
}

function updatePlayPauseButton() {
	trailerPane.className = (playing) ? "playing" : "paused";
}

function addMovieToCell(movie, cell, rowIndex) {
	cell.id = movie.id;
	cell.innerHTML = "<span class='title'>"
		+ stringByRemovingDashes(movie.title)
		+ "</span><span class='rating'>" + (movie.rating ? movie.rating : "") + "</span>";
}

function addTheaterToCell(theater, cell, rowIndex) {
	cell.id = theater.id;
	var html = "<span class='theater'>" 
		+ stringByRemovingDashes(theater.name)
		+ "</span>";
	if (sortByMovies) {
		html += "<button class='theaterInfo' onmousedown='theaterInfoButtonClicked(event);'></button>";
	}
	cell.innerHTML = html;
}

function addTimeToCell(time, cell, rowIndex) {
	cell.id = time.id;
	cell.innerHTML = "<span class='time'>" + time.time + "</span>";
}

function movieWasSelectedInBrowser() {
	if (Utils.isShowing(trailerPane)) {
		stopMovie(function(){showMovieInfo(true)});
	} else {
		showMovieInfo();
	}	
	setBuyTicketsButtonEnabled(false);
}

function theaterWasSelectedInBrowser() {
	var callback = (sortByMovies) ? showMovieInfo : showTheaterInfo;
	if (Utils.isShowing(trailerPane)) {
		callback = sortByMovies ? function(){showMovieInfo(true)} : 
								  function(){showTheaterInfo(true)}
		stopMovie(callback);
	} else if (Utils.isShowing(movieInfoPane)) {
		if (!sortByMovies) {
			hideBottomPane(callback);
		}
	} else if (Utils.isShowing(theaterInfoPane)) {
		var theater = allTheatersTable[currentTheaterId];
		populateInfoPaneWithTheaterInfo(theater);
	} else {
		callback();
	}	
	setBuyTicketsButtonEnabled(false);
}

function timeWasSelectedInBrowser() {
	var theater = allTheatersTable[currentTheaterId];
	setBuyTicketsButtonEnabled(theater.canBuyTickets);
}

function MyBrowserDelegate() {}

MyBrowserDelegate.prototype.willDisplayCellAtRowColumn = function(browser, cell, rowIndex, colIndex) {
	if (0 == colIndex) {
		if (sortByMovies) {
			var movie = allMoviesList[rowIndex];
			addMovieToCell(movie, cell, rowIndex);
		} else {
			var theater = allTheatersList[rowIndex];
			addTheaterToCell(theater, cell, rowIndex);
		}
	} else if (1 == colIndex) {
		if (sortByMovies) {
			var movie = allMoviesTable[currentMovieId];
			var theaterId = movie.theaters[rowIndex].id;
			var theater = allTheatersTable[theaterId];
			addTheaterToCell(theater, cell, rowIndex);
		} else {
			var theater = allTheatersTable[currentTheaterId];
			var movie = theater.movies[rowIndex];
			addMovieToCell(movie, cell, rowIndex);
		}
	} else if (2 == colIndex) {
		var movie = allMoviesTable[currentMovieId];
		var time = movie.times[currentTheaterId][rowIndex];
		addTimeToCell(time, cell, rowIndex);
	} else {
		return 0;
	}
};

MyBrowserDelegate.prototype.numberOfRowsInColumn = function(browser, colIndex) {
	if (!allMoviesList || !allTheatersList) {
		return 0;
	} else if (0 == colIndex) {
		return (sortByMovies) ? allMoviesList.length : allTheatersList.length;
	} else {
		var movie = allMoviesTable[currentMovieId];
		var theater = allTheatersTable[currentTheaterId];		
		if (1 == colIndex) {
			return (sortByMovies) ? movie.theaters.length : theater.movies.length;
		} else if (2 == colIndex) {
			var times = movie.times[currentTheaterId];
			return (times) ? times.length : 0;
		} else {
			return 0;
		}
	}
};

MyBrowserDelegate.prototype.selectRowInColumn = function(browser, rowIndex, colIndex) {
	if (0 == colIndex) {
		if (sortByMovies) {
			currentTheaterId = null;
			currentMovieId = allMoviesList[rowIndex].id;
			movieWasSelectedInBrowser();
		} else {
			currentMovieId = null;
			currentTheaterId = allTheatersList[rowIndex].id;
			theaterWasSelectedInBrowser();
		}
	} else if (1 == colIndex) {
		var cell = browser.selectedCellInColumn(colIndex);
		var id = cell.id;
		if (sortByMovies) {
			currentTheaterId = id;
			theaterWasSelectedInBrowser();
		} else {
			currentMovieId = id;
			movieWasSelectedInBrowser();
		}
	} else if (2 == colIndex) {
		var movie = allMoviesTable[currentMovieId];
		currentTimeId = movie.times[currentTheaterId][rowIndex].id;
		timeWasSelectedInBrowser();
	}
};

MyBrowserDelegate.prototype.scrollbarForDiv = function(scrollbarDiv) {
	var scrollbar = new AppleVerticalScrollbar(scrollbarDiv);
	scrollbar.setTrackStart("Images/__scroll_track_vtop.png", 7);
	scrollbar.setTrackMiddle("Images/__scroll_track_vmid.png", 1);
	scrollbar.setTrackEnd("Images/__scroll_track_vbottom.png", 7);
	return scrollbar;
};

/******* City/State Validation *************/

var validateTypingTimer;
var validateTimerData = null;
var locationValidated = false;

function locationChanged() {
	var newLocation = escape($("locationTextField").value);

	// validate this entry if it's not a zip, which don't get results anyways because they are exact
	if(!isValidPostalCode(newLocation))
	{
		validateLocation(newLocation);
		// start the the validate timer
		var validate = $("validateLabel");
		validate.innerHTML = getLocalizedString("Validating");
		clearValidationTimer();
		validateTimerData = {timer:setInterval(validateTimer, 500), pos:-1};		
	}
}

// We capture Delete in the keypress handler, but it might cause the text to change,
// which results in an input event as well.
var shouldIgnoreInputEvent = false;

function locationTextFieldKeyPressed(evt) {
    shouldIgnoreInputEvent = false;
    dismissValidation();
        
    var location = $("locationTextField").value;
	switch (evt.keyCode) {
		case 13: // return
		case 3:  // enter
			if (locationValidated || isValidPostalCode(location)) {
				showFront();
				break;
			}
			if (isFinite(location) && !isValidPostalCode(location)) {
				showMenuItem(getLocalizedString("Invalid Zip Code."));
				return;
			}
			// intentional fall-thru
		case 9:  // tab
			if (!locationValidated) {
				// immediate validation
				if (location.length > 0) {
					locationChanged();
				}
			} 
			break;
		case 8: // delete
			shouldIgnoreInputEvent = true;  // don't trigger delayed validation
			locationValidated = false;                
			break;
		default:
			locationValidated = false;                
	}
}

function locationTextFieldTyping(evt) {
	if (!shouldIgnoreInputEvent) {
		// delayed validation
		var location = $("locationTextField").value;
		if (location.length > 0) {
			validateTypingTimer = setTimeout(locationChanged, 950);
		}
	}
	shouldIgnoreInputEvent = false;
}

function dismissValidation() {
	if (validateTypingTimer) {
		clearTimeout(validateTypingTimer);
		validateTypingTimer = null;
	}
	clearValidationTimer();
	validationObject = null;
	Utils.hideElement($("validateLabel"));
}

function clearValidationTimer() {
	if (validateTimerData) {
		clearInterval(validateTimerData.timer);
		validateTimerData = null;
	}
}

function selectAllInLocationTextField() {
	var textField = $("locationTextField");
	textField.focus();
	textField.select();
}

function validateTimer() {
	try {
		var validate = $("validateLabel");
		Utils.showElement(validate);
		if (++validateTimerData.pos > 4) {
			validateTimerData.pos = 0;
		}
		var text = getLocalizedString("Validating");
		for (var i = 0; i < validateTimerData.pos; ++i) {
			text += '.';
		}
		validate.innerHTML = text;
	} catch (e) {
		clearValidationTimer();
	}
}

var validationObject = null;

function validationCallbackDelayed() {
	var menu = (window.widget ? widget.createMenu() : null);
	
	if (validationObject.error || validationObject.cities.length <= 0) {
		if (menu) {
			menu.addMenuItem(getLocalizedString("No cities found"));
			menu.setMenuItemEnabledAtIndex(0, false);
		}
	} else {
		var c =  validationObject.cities.length;
		
		if (c == 1 || !window.widget) {
			// just set the contents if their is only one city.
			var city = validationObject.cities[0];
			var textField = $("locationTextField");
			textField.value = city.city + ", " + city.state;
			locationValidated = true;
			menu = null;
		} else {
			for (var i = 0; i < c; ++i) {
				var city = validationObject.cities[i];
				menu.addMenuItem(city.city + ", " + city.state);
			}
		}
	}
	
	if (menu) {
		var selectedItem = menu.popup(252, 107);
		if (selectedItem >= 0) {
			var city = validationObject.cities[selectedItem];
			var textField = $("locationTextField");
			textField.value = city.city + ", " + city.state;
			locationValidated = true;
			textField.select();
		}
	}
	validationObject = null;
}

function validationCallback(object) {
    dismissValidation();
	
	if (Utils.isShowing($("back"))) {	
		// force a redraw before we present a menu, otherwise the 
		// validating text will not disappear.
		validationObject = object;
		setTimeout(validationCallbackDelayed, 0);
	}
}

function validationCallbackFromURL(object) {
	if (!object.error) {
		if (object.cities.length > 0) {
			// pick the first one
			var city = object.cities[0];
			var textField = $("locationTextField");
			var cityState = city.name + ", " + city.state;
			textField.value = cityState;
			setInstanceAndGlobalPreferenceForKey(cityState, kLocationKey);
		}
	}
}
