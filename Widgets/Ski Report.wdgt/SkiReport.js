/*
Copyright © 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

var resort = "Heavenly, CA, USA";
var resortName = "Heavenly";
var resortURL = null;
var uid = 916004;
var timer = null;
var timerInterval = 3600000; // updates every hour
var isCelcius = false;
var lastResults = null;
var isShowingFront = true;
var lastWeatherXMLRequest = null;
var dataSetWhenObjectWasFlipped = null;

var metricUnits = {cutoff: 99, toBase: 2.54, divider:100, smallunit: "cm", bigunit: "m"}
var usUnits = {cutoff: 96, toBase: 1, divider: 12, smallunit: "\"", bigunit: "'"}

//About snow conditions
//There are two lists of snow condition values. An updated list from the vendor, and 
//the original list kept here for robustness. These are mapped to a subset of those strings
//called 'aliases' here, often just to shorten the strings. This subset is then used for 
//localization and mapping to the proper image. 

var snowConditionAliases = new Array;

//unique to old list
//not mapped: GOOD, Groomed, Icy, Varying
snowConditionAliases["windblown snow"] = "wind blown";
snowConditionAliases["corn snow"] = "corn";
snowConditionAliases["wet packed snow"] = "wet packed";
snowConditionAliases["wet granular snow"] = "wet granular";
snowConditionAliases["wet snow"] = "wet";
snowConditionAliases["variable conditions"] = "variable";
snowConditionAliases["varying"] = "variable";
snowConditionAliases["fresh powder"] = "powder";

//in both lists
//not mapped: Powder, Packed Powder, Hard Packed
snowConditionAliases["loose granular"] = "granular";
snowConditionAliases["frozen granular"] = "granular";

//unique to new list
//not mapped: Machine Made, Spring, Corn, Granular, Obstacles, Skiers Packed, Variable, Thin Cover, Wind Blown, N/A, Wet
snowConditionAliases["machine groomed"] = "groomed";
snowConditionAliases["icy spots"] = "icy";
snowConditionAliases["bare spots"] = "patchy";
snowConditionAliases["na"] = "n/a";

var snowConditionIcon = new Array;
snowConditionIcon["corn"] = "Images/Loose.png";
snowConditionIcon["wet packed"] = "Images/Wet.png";
snowConditionIcon["wet granular"] = "Images/Wet.png";
snowConditionIcon["wet"] = "Images/Wet.png";
snowConditionIcon["variable"] = "Images/Powder.png";
snowConditionIcon["powder"] = "Images/Powder.png";
snowConditionIcon["granular"] = "Images/Loose.png";
snowConditionIcon["groomed"] = "Images/groomed.png";
snowConditionIcon["icy"] = "Images/Icy.png";
snowConditionIcon["patchy"] = "Images/Packed.png";
snowConditionIcon["good"] = "Images/Powder.png";
snowConditionIcon["packed powder"] = "Images/Packed.png";
snowConditionIcon["hard packed"] = "Images/Packed.png";
snowConditionIcon["machine made"] = "Images/groomed.png";
snowConditionIcon["spring"] = "Images/Powder.png";
snowConditionIcon["obstacles"] = "Images/Packed.png";
snowConditionIcon["skiers packed"] = "Images/Packed.png";
snowConditionIcon["thin cover"] = "Images/Icy.png";
snowConditionIcon["wind blown"] = "Images/Icy.png";
snowConditionIcon["n/a"] = "Images/Powder.png";

function getLocalizedString(key)
{
    try {
        var ret = localizedStrings[key];
        if (ret === undefined) {
            ret = key;
        }
        return ret;
    } catch (ex) {}
    return key;
}

function $(id) {
	return document.getElementById(id);
}

function load()
{
	new AppleInfoButton ($('info'), 
	                     $('front'), 
	                     'white', 'black', showBack);
	new AppleGlassButton($('done'), 
	 				     getLocalizedString('Done'), showFront);
	populateTempUnits ();

	$('ziplabel').innerText = getLocalizedString('ziplabel');
	$('unitlabel').innerText = getLocalizedString('unitlabel');
	$('newLabel').innerText = getLocalizedString('new');
	$('baseLabel').innerText = getLocalizedString('base');
	$('trailsLabel').innerText = getLocalizedString('trails');
	$('dot').setAttribute('alt', getLocalizedString('loading'));
	
	loadPreferences();

	doLoad();
}

function loadPreferences() {
	if (window.widget)
	{
		var pref = getPreferenceForKey("uid");
		if (pref != null)
		{
			$('zip').uid = pref;
			uid = pref;
		}
		
		pref = getPreferenceForKey("resort");
		if (pref != null)
		{
			$('zip').value = pref;
			resort = pref;
		}
		else
			$('zip').value = resort;
		
		pref = getPreferenceForKey("resortName");
		if (pref == null)
			pref = resortName;
		if (pref != null)
		{
			$('zip').name = pref;
			$('resortName').value = pref;
			resortName = pref;
		}
	
		pref = getPreferenceForKey("celcius");
		if (pref != null)
		{
			if(pref == true)
				isCelcius = true;
			
			if(window.window && widget.usesMetricUnits() == isCelcius) //clear pref in this case (5135405)
				setPreferenceForKey(null, "celcius");			
		}
		else if (window.widget && widget.usesMetricUnits())
			isCelcius = true;

		if(isCelcius)
		{
			$('newtext').className = $('basetext').className = "signValueWrapper_celcius";
			$('unit').options[1].selected = true;			
		}
		
	}
}

function doLoad()
{
	fetchData();
	timer = setInterval ('fetchData();', timerInterval);
}


function onshow()
{
	if (timer != null)
	{
		clearInterval(timer);
		timer = null;
	}
	
	doLoad ();
}

function onhide()
{
	if (timer != null) {
		// we were hidden clear the timer
		clearInterval(timer);
		timer = null;
	}	
}

function onremove()
{
	if (window.widget)
	{
		// only remove the widget specific keys.  Leave the global ones.
		widget.setPreferenceForKey (null, createKey('resort'));
		widget.setPreferenceForKey (null, createKey('resortName'));
		widget.setPreferenceForKey (null, createKey('uid'));
		widget.setPreferenceForKey (null, createKey('celcius'));
	}
}

function onsync() {
	loadPreferences();
}

function showBack(event)
{
	// your widget needs to show the back

	var front = $("front");
	var back = $("back");

	isShowingFront = false;
	
	if (window.widget)
		widget.prepareForTransition("ToBack");

	front.style.display="none";
	back.style.display="block";
	
	if (window.widget)
		setTimeout('widget.performTransition();', 0);
}

function showFront(event)
{
	// your widget needs to show the front

	var front = $("front");
	var back = $("back");

	isShowingFront = true;

	if (window.widget)
		widget.prepareForTransition("ToFront");

	front.style.display="block";
	back.style.display="none";
	
	if (window.widget)
		setTimeout('widget.performTransition();', 0);

	var newResort = $('zip').value;
	if (resort != newResort)
	{
		resort = newResort;
		resortName = $('zip').name;
		uid = $('zip').uid;
		if (!uid) // postal not set 
			uid = resort;
		doLoad();
		if (window.widget)
		{
			setPreferenceForKey(resort, "resort");
			setPreferenceForKey(resortName, "resortName");
			setPreferenceForKey(uid, "uid");
		}
	}
	else
	{
		if (timer == null)
			timer = setInterval ('fetchData();', timerInterval);
	}

	if (dataSetWhenObjectWasFlipped != null)
	{
		handleDataFetched (dataSetWhenObjectWasFlipped);
		dataSetWhenObjectWasFlipped = null;
	}
}


if (window.widget)
{
	widget.onremove = onremove;
	widget.onsync = onsync;
	widget.onhide = onhide;
	widget.onshow = onshow;
}




function populateTempUnits()
{
	var select = $('unit');
	var element;
	
	element = document.createElement ("option");
	element.innerText = getLocalizedString("˚F");
	select.appendChild(element);
	element = document.createElement ("option");
	element.innerText = getLocalizedString("˚C");
	select.appendChild(element);
}


var validateTimerData = null;
var zipValidated = false;
function zipChanged()
{
	var resort = $('zip').value
	//if (zip != resort)
	{
		// start the the validate timer
		var validate = $('validate');
		validate.innerText = getLocalizedString("Validating");
		
		validateTimerData = {timer:setInterval('validateTimer();', 500), pos:3, forward:true};		

		// validate this entry
		var location = isLocation(resort);
		
		if (location == null || location.length <= 1)
			validateSkiResort (resort, validationCallback);
		else
			validateSkiLocation (location, validationCallback);
	}
}

var stateProvAbbreviation = new Array;
stateProvAbbreviation["ALABAMA"] = "AL";
stateProvAbbreviation["ALASKA"] = "AK";
stateProvAbbreviation["ARIZONA"] = "AZ";
stateProvAbbreviation["ARKANSAS"] = "AR";
stateProvAbbreviation["CALIFORNIA"] = "CA";
stateProvAbbreviation["COLORADO"] = "CO";
stateProvAbbreviation["CONNECTICUT"] = "CT";
stateProvAbbreviation["DELAWARE"] = "DE";
stateProvAbbreviation["DISTRICT OF COLUMBIA"] = "DC";
stateProvAbbreviation["FLORIDA"] = "FL";
stateProvAbbreviation["GEORGIA"] = "GA";
stateProvAbbreviation["HAWAII"] = "HI";
stateProvAbbreviation["IDAHO"] = "ID";
stateProvAbbreviation["ILLINOIS"] = "IL";
stateProvAbbreviation["INDIANA"] = "IN";
stateProvAbbreviation["IOWA"] = "IA";
stateProvAbbreviation["KANSAS"] = "KA";
stateProvAbbreviation["KENTUCKY"] = "KY";
stateProvAbbreviation["LOUISIANA"] = "LA";
stateProvAbbreviation["MAINE"] = "ME";
stateProvAbbreviation["MARYLAND"] = "MD";
stateProvAbbreviation["MASSACHUSETTS"] = "MA";
stateProvAbbreviation["MICHIGAN"] = "MI";
stateProvAbbreviation["MINNESOTA"] = "MN";
stateProvAbbreviation["MISSISSIPPI"] = "MS";
stateProvAbbreviation["MISSOURI"] = "MO";
stateProvAbbreviation["MONTANA"] = "MT";
stateProvAbbreviation["NEBRASKA"] = "NE";
stateProvAbbreviation["NEVADA"] = "NV";
stateProvAbbreviation["NEW HAMPSHIRE"] = "NH";
stateProvAbbreviation["NEW JERSEY"] = "NJ";
stateProvAbbreviation["NEW MEXICO"] = "NM";
stateProvAbbreviation["NEW YORK"] = "NY";
stateProvAbbreviation["NORTH CAROLINA"] = "NC";
stateProvAbbreviation["NORTH DAKOTA"] = "ND";
stateProvAbbreviation["OHIO"] = "OH";
stateProvAbbreviation["OKLAHOMA"] = "OK";
stateProvAbbreviation["OREGON"] = "OR";
stateProvAbbreviation["PENNSYLVANIA"] = "PA";
stateProvAbbreviation["RHODE ISLAND"] = "RI";
stateProvAbbreviation["SOUTH CAROLINA"] = "SC";
stateProvAbbreviation["SOUTH DAKOTA"] = "SD";
stateProvAbbreviation["TENNESSEE"] = "TN";
stateProvAbbreviation["TEXAS"] = "TX";
stateProvAbbreviation["UTAH"] = "UT";
stateProvAbbreviation["VERMONT"] = "VT";
stateProvAbbreviation["VIRGINIA"] = "VA";
stateProvAbbreviation["WASHINGTON"] = "WA";
stateProvAbbreviation["WEST VIRGINIA"] = "WV";
stateProvAbbreviation["WISCONSIN"] = "WI";
stateProvAbbreviation["WYOMING"] = "WY";
stateProvAbbreviation["ALBERTA"] = "AB";
stateProvAbbreviation["BRITISH COLUMBIA"] = "BC";
stateProvAbbreviation["MANITOBA"] = "MB";
stateProvAbbreviation["NEW BRUNSWICK"] = "NB";
stateProvAbbreviation["NEWFOUNDLAND"] = "NL";
stateProvAbbreviation["NORTHWEST TERRITORIES"] = "NT";
stateProvAbbreviation["NOVA SCOTIA"] = "NS";
stateProvAbbreviation["NUNAVUT"] = "NU";
stateProvAbbreviation["ONTARIO"] = "ON";
stateProvAbbreviation["PRINCE EDWARD ISLAND"] = "PE";
stateProvAbbreviation["QUEBEC"] = "QC";
stateProvAbbreviation["SASKATCHEWAN"] = "SK";
stateProvAbbreviation["YUKON"] = "YK";
stateProvAbbreviation["CANADA"] = "CANADA";
stateProvAbbreviation["USA"] = "USA";
stateProvAbbreviation["UNITED STATES"] = "USA";
stateProvAbbreviation["US"] = "USA";
stateProvAbbreviation["ANDORRA"] = "ANDORRA";
stateProvAbbreviation["ARGENTINA"] = "ARGENTINA";
stateProvAbbreviation["AUSTRALIA"] = "AUSTRALIA";
stateProvAbbreviation["AUSTRIA"] = "AUSTRIA";
stateProvAbbreviation["CHILE"] = "CHILE";
stateProvAbbreviation["FRANCE"] = "FRANCE";
stateProvAbbreviation["GERMANY"] = "GERMANY";
stateProvAbbreviation["ITALY"] = "ITALY";
stateProvAbbreviation["JAPAN"] = "JAPAN";
stateProvAbbreviation["NEW ZEALAND"] = "NEW ZEALAND";
stateProvAbbreviation["NORWAY"] = "NORWAY";
stateProvAbbreviation["SCOTLAND"] = "SCOTLAND";
stateProvAbbreviation["SWEDEN"] = "SWEDEN";
stateProvAbbreviation["SWITZERLAND"] = "SWITZERLAND";

function isLocation(resort)
{
	var location = null;

	try
	{
		location = stateProvAbbreviation[resort];
		if (location === undefined)
		{
			for (state in stateProvAbbreviation)
			{
				if (stateProvAbbreviation[state] == resort.toUpperCase())
				{
					location = stateProvAbbreviation[state];
					break;
				}
			}
			
			if (location === undefined)
				location = null;
		}
	}
	catch (ex)
	{
	}
	
	return location;
}

function zipTyping (event)
{
	zipValidated = false;
}

function zipKeyPress (event)
{
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
		case 9:  // tab
			if (!zipValidated)
			{
				zipChanged();
			}
			break;
	}
}


function unitsChanged (select)
{
	var isC = select.selectedIndex == 1;

	if (isC != isCelcius)
	{
		isCelcius = isC; 

		if(window.widget)
			setPreferenceForKey(isCelcius != widget.usesMetricUnits() ? isCelcius : null, "celcius");

		$('newtext').className = $('basetext').className = isCelcius ? "signValueWrapper_celcius" : "signValueWrapper";

		//update values that depend on units
		if (lastResults != null && lastResults[0] != null)
		{		
			updateTemp(lastResults[0].temp);
			updateSnowHeight($('new'), lastResults[0].newPowder);		
			updateSnowHeight($('base'), lastResults[0].base);
		}
	}
}


function handleDataFetched (object)
{
	lastResults = new Array;

	lastResults[0] = object;

	updateResortName();

	resortURL = object.url;
	
	if (object.error == true)
	{
		alert ('Fetching data failed, ' + object.errorString);
		showOrHideClosedSign(true, "");
		showOrHideOpenSign(false);
		$('snow').style.display="none";
		$('closedText').innerText = getLocalizedString("unavailable");
		$('temp').innerText = "- -";
		return;
	}

	if (object.closed)
	{
		showOrHideClosedSign(true, getLocalizedString('closed'));
		showOrHideOpenSign(false);
		$('snow').style.display="none";
		if (object.openingDate)
			$('closedText').innerText = object.openingDate;
		if (object.temp)
			$('temp').innerText = convertToCelcius(object.temp);
		else
			$('temp').innerText = "- -";
	}
	else
	{
		showOrHideClosedSign(false, "");
		showOrHideOpenSign(true);

		updateTemp(object.temp);
		updateSnowHeight($('new'), object.newPowder);
		updateSnowHeight($('base'), object.base);
		updateTrails(object.openTrails);
		updateSnowCondition(object.snowCondition);

		var snow = $('snow');
		if (object.base == 0)
		{
			snow.style.display="none";
		}
		else
		{
			snow.style.display="block";
			if (object.base >= 30)
			{
				snow.src = "Images/Snow3.png";
			}
			else if (object.base >= 15)
			{
				snow.src = "Images/Snow2.png";
			}
			else if (object.base >= 3)
			{
				snow.src = "Images/Snow1.png";
			}
			else
			{
				snow.src = "Images/Snow0.png";
			}
		}
	}
}

function updateTemp (temp) {
	$('temp').innerText = (temp != undefined && !isNaN(temp)) ? convertToCelcius(temp) : "- -";
}

function updateSnowHeight(element, height)	
{
	if(height == null)
	{
		element.innerText = "";
		return;		
	}
		
	var units = isCelcius ? metricUnits : usUnits;

	height *= units.toBase;

	if (height <= units.cutoff)
		element.innerHTML = Math.round(height) + unitSpan(units.smallunit);
	else
	{
		var value = height / units.divider;
		value = Math.round(value) < 10 ? value.toFixed(1) : Math.round(value);
		element.innerHTML = value + unitSpan(units.bigunit);	
	}
}

function unitSpan (string) {
	return "<span class='unitpunct'>" + string + "</span>";
}

function updateSnowCondition(snowCondition)
{
	snowCondition = snowCondition.toLowerCase();	
	snowCondition = aliasSearch(snowCondition);

	if(snowCondition.length > 15)
		snowCondition = snowCondition.substring(0,15) + "...";

	if (snowCondition != "")
	{
		var displayString = getLocalizedString(snowCondition);
		var shrinkToWidth = 40;
		var divTop = 31;
			
		if(displayString.length > 9 && displayString.indexOf(" ") != -1)
		{
			displayString = displayString.replace(/\s/, "\n");
			shrinkToWidth = 37;
			divTop = 30;
		}
		
		var snowConditionDiv = $('snowLabel');
		snowConditionDiv.innerText = displayString;
		snowConditionDiv.style.fontSize = "14px"; // needs to be in sync with css.
		shrinkToFit(snowConditionDiv, shrinkToWidth);
	    var computedStyle = document.defaultView.getComputedStyle(snowConditionDiv,'');
	    var newWidth = parseInt(computedStyle.getPropertyValue("width"));
	    snowConditionDiv.style.left = (189 + ((40 - newWidth) / 2)) + "px";
	    var newHeight = parseInt(computedStyle.getPropertyValue("height"));
	    snowConditionDiv.style.top = (divTop + ((16 - newHeight) / 2)) + "px";
		
		var icon = snowConditionIcon[snowCondition];
		if(icon)
		{
			$('snowCondition').src = icon;
			$('snowCondition').style.display = "block";			
		}
		else
			$('snowCondition').style.display = "none";
		
		$('snowLabel').style.display = "block";
	}
	else
	{
		$('snowCondition').style.display="none";
		$('snowLabel').style.display = "none";
	}	
}

function aliasSearch (condition) {

	if(snowConditionAliases[condition])
		return snowConditionAliases[condition];

	//be a little more robust if we get an unexpected string. Search for individual matching words
	for(key in snowConditionAliases)
	{
		var words = key.split(" ");
		for(wordIndex in words)
		{
			var word = words[wordIndex];

			if(word != "snow" && condition.indexOf(word) != -1)
				return snowConditionAliases[key];	
		}
	}

	//return raw string as the last resort (get it? "resort"!)
	return condition;
}

function updateResortName()
{
	var resortNameDiv = $('resortName');
	resortNameDiv.innerText = resortName.toUpperCase();
	resortNameDiv.style.fontSize = "22px"; // needs to be in sync with css.
	resortNameDiv.style.top = "102px"; // needs to be in sync with css.
	shrinkToFit(resortNameDiv, 186);
    var computedStyle = document.defaultView.getComputedStyle(resortNameDiv,'');
    var newHeight = parseInt(computedStyle.getPropertyValue("height"));
    resortNameDiv.style.top = (59 + ((26 - newHeight) / 2)) + "px";
}



function updateTrails(openTrails)
{
	$('trails').innerText = openTrails;
}


function showOrHideClosedSign(show, string)
{
	if (show) {
		$("closedDiv").style.display = "block";
		$('closedTitle').innerText = string;
	} else {
		$("closedDiv").style.display = "none";
		$('closedTitle').innerText = "";
	}
}


function showOrHideOpenSign(show)
{
	var display = show ? "block" : "none";
	$('signs').style.display = display;
}

function dataFetched (object)
{
	lastWeatherXMLRequest = null;
	endFetchingAnimation ();

	// only set the data if we are showing front as it could cause the backside to be resized.
	// which would break the widget
	if (!isShowingFront)
	{
		dataSetWhenObjectWasFlipped = object;
	}
	else
	{
		handleDataFetched (object);
		dataSetWhenObjectWasFlipped = null; // just to be safe
	}
}

var fetchingAnimation = {timer: null, alphaNow:1.0, up:false, duration:1000, start:null};

function fetchAnimationTimer ()
{
	var time = (new Date).getTime();
	var fraction;
	
	if (fetchingAnimation.up)
		fraction = (time - fetchingAnimation.start) / fetchingAnimation.duration;
	else
		fraction = 1.0 - (time - fetchingAnimation.start) / fetchingAnimation.duration;
	
	fetchingAnimation.alphaNow = fraction;
	
	if (fetchingAnimation.alphaNow > 1.0)
	{
		fetchingAnimation.start = time;
		fetchingAnimation.alphaNow = 1.0;
		fetchingAnimation.up = false;
	}
	else if (fetchingAnimation.alphaNow < 0.0)
	{
		fetchingAnimation.start = time;
		fetchingAnimation.alphaNow = 0.0;
		fetchingAnimation.up = true;
	}
	
    var sine = Math.sin((Math.PI/2.0) * fetchingAnimation.alphaNow);

    fetchingAnimation.alphaNow = sine * sine;
    
    $('dot').style.opacity = fetchingAnimation.alphaNow;
}

function startFetchingAnimation ()
{
	if (fetchingAnimation.timer != null)
	{
		clearInterval (fetchingAnimation.timer);
		fetchingAnimation.timer = null;
	}
	
	fetchingAnimation.up = false;
	fetchingAnimation.alphaNow = 1.0;
	fetchingAnimation.start = (new Date).getTime() - 60;
	fetchingAnimation.timer = setInterval ('fetchAnimationTimer();', 60);
	var dot = $('dot');
	dot.style.opacity = '1.0';
	dot.style.display = 'inline';
}

function endFetchingAnimation ()
{
	if (fetchingAnimation.timer != null)
	{
		clearInterval (fetchingAnimation.timer);
		fetchingAnimation.timer = null;
	}
	
	$('dot').style.display = 'none';
}

function fetchData()
{
	if (lastWeatherXMLRequest != null)
		lastWeatherXMLRequest.abort();

	lastWeatherXMLRequest = fetchWeatherData (dataFetched, uid);
	startFetchingAnimation();
}


function validateTimer ()
{
	var validate = $('validate');
	
	validate.style.display = "block";

	// position goes 0 <-> 3
	validateTimerData.pos += validateTimerData.forward ? 1 : -1;
	
	if (validateTimerData.pos > 3)
	{
		validateTimerData.forward = false;
		validateTimerData.pos = 2;
	}
	else if (validateTimerData.pos < 0)
	{
		validateTimerData.forward = true;
		validateTimerData.pos = 1;
	}
	
	var text = getLocalizedString('Validating');
	for (var i = 0; i < validateTimerData.pos; ++i)
		text+= '.';
	
	validate.innerText = text;
}

var validationObject = null;
function validationCallbackDelayed ()
{
	var menu = null;
	
	if (window.widget)
		menu = widget.createMenu();
	
	if (validationObject.error || validationObject.resorts.length <= 0)
	{
		if (menu != null)
		{
			menu.addMenuItem (getLocalizedString("No resorts found"));
			menu.setMenuItemEnabledAtIndex (0, false);	
		}
	}
	else
	{
		var c =  validationObject.resorts.length;
		
		if (c == 1 || window.widget === undefined)
		{
			// just set the contents if there is only one resort.
			var resort = validationObject.resorts[0];
			var zipinput = $('zip');
			zipinput.value = resort.name + ", " + resort.location;
			zipinput.uid = resort.uid;
			zipinput.name = resort.name;

			menu = null;
		}
		else
		{
			for (var i = 0; i < c; ++i)
			{
				var resort = validationObject.resorts[i];
				menu.addMenuItem (resort.name + ", " + resort.location);
			}
			
			if (validationObject.refine)
			{
				menu.addMenuItem (getLocalizedString('Try a more specific search'));
				menu.setMenuItemEnabledAtIndex (c, false);
			}
		}
		
	}
	
	if (menu != null)
	{
		var selectedItem = menu.popup (23, 92);
		
		if (selectedItem >= 0)
		{
			var resort = validationObject.resorts[selectedItem];
			var zipinput = $('zip');
			zipinput.value = resort.name + ", " + resort.location;
			zipinput.uid = resort.uid;
			zipinput.name = resort.name;
			
			zipValidated = true;
		}
	}
	
	validationObject = null;
}

function validationCallback (object)
{
	if (validateTimerData != null)
	{
		clearInterval(validateTimerData.timer);
		validateTimerData = null;
		$('validate').style.display="none";
	}
	
	if (!isShowingFront)
	{	
		// force a redraw before we present a menu, otherwise the 
		// validating text will not disappear.
		validationObject = object;
		setTimeout("validationCallbackDelayed();", 0);
	}
	else
	{
		// do nothing if we are not in the Dashboard.
	}
}


function goToResortPage ()
{
	if (window.widget)
	{
		if(resortURL && resortURL.indexOf("accuweather.com") != -1)
			widget.openURL(resortURL)
		else
			vendorHomePage();
	}
}

function goToVendorHomePage () {
	widget.openURL(vendorHomePage())
}

function convertToCelcius(num)
{
	if (isCelcius)
		return Math.round ((num - 32) * 5 / 9);
	else
		return num;
}


function getPreferenceForKey (key)
{
	// first check to see if we have a per instance one
	var pref = widget.preferenceForKey(createKey(key));
	
	if (pref == null)
	{
		// now check the global one
		pref = widget.preferenceForKey(key);
	}
	
	return pref;
}


function setPreferenceForKey (pref, key)
{
	// set both the per widget pref and the global
	widget.setPreferenceForKey(pref, createKey(key));
	widget.setPreferenceForKey(pref, key);
}


function createKey(key)
{
	return widget.identifier + "-" + key;
}


function shrinkToFit(element, width)
{
    var elementWidth = 99999;
    var changed = false;
    var fontSize = 99;

    while (elementWidth > width && fontSize > 5) {

        var computedStyle = document.defaultView.getComputedStyle(element,'');
        fontSize = parseFloat(element.style.fontSize);
        
        elementWidth = parseInt(computedStyle.getPropertyValue("width"));
               
        if (elementWidth > width)
        {
			element.style.fontSize = (fontSize - 0.1).toString() + "px";
		
			computedStyle = document.defaultView.getComputedStyle(element,'');
			elementWidth = parseInt(computedStyle.getPropertyValue("width"));
			
			changed = true;
		}
		else
		{
			break;
		}
		
    }
    
    return changed;
}

