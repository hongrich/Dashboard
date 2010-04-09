/*
Copyright ＿ 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

var numRequests = 1;

// Request parameters
var gAppver = "1.1";
var gDevtype = "Apple Desktop Widget v" + gAppver;
var gDeployver = "Apple Desktop Widget v" + gAppver;
var gApp = "YGoAppleWeatherWidget";
var gAPIver = "1.0.0";
var gAPI = "weather";

//code -> weathername 	-> icon
//						-> miniIcon
var yahooWeatherTypes = 
[
    "lightening",             		// 0 Tornado
    "lightening",             		// 1 tropical storm
    "lightening",             		// 2 hurricane
    "lightening",             		// 3 severe thunderstorm
    "lightening",             		// 4 thunderstorm
    "rain&snow",               		// 5 mixed rain and snow
    "rain&snow",               		// 6 mixed rain and sleet
    "rain&snow",               		// 7 mixed snow and sleet
    "rain&clouds",              	// 8 freezing drizzle
    "rain&clouds",              	// 9 drizzle
    "hail",                   		// 10 freezing rain
    "rain",                   		// 11 showers
    "rain",                   		// 12 showers
    "flurries",               		// 13 snow flurries
    "flurries",               		// 14 light snow flurries
    "snow",                   		// 15 blowing snow
    "snow",                   		// 16 snow
    "hail",                   		// 17 hail
    "hail",                   		// 18 sleet
    "sun",                    		// 19 dust                      "haze"
    "fog",                    		// 20 foggy
    "sun",                    		// 21 haze                      "haze"
    "sun",                    		// 22 smoky                     "haze"
    "wind",                   		// 23 bustery
    "wind",                   		// 24 windy
    "ice",                    		// 25 cold
    "clouds",                 		// 26 clouds
    "clouds",                 		// 27 mostly cloudy (night)   
    "clouds",                 		// 28 mostly cloudy (day)
    ["moon", "partlycomboclouds"],	// 29 partly cloudy (night)     //was suncloud
    "partlycloudy",           		// 30 partly cloudy (day)
    "moon",                    		// 31 clear (night)	//was sun
    "sun",                     		// 32 sunny
    ["moon", "partlycomboclouds"],	// 33 fair (night)         //was suncloud  
    "partlycloudy",            		// 34 fair (day)
    "rain&snow",              		// 35 mixed rain and hail
    "sun",                     		// 36 hot
    "lightening",               		// 37 isolated thunderstorms    
    "lightening",               		// 38 scattered thunderstorms
    "rain&sun",                		// 39 scattered thunderstorm (yahoo icon is rain & sun)
    "rain",                    		// 40 scattered showers
    "snow",                    		// 41 heavy snow
    "snow",                    		// 42 scattered snow
    "snow",                    		// 43 heavy snow
    "partlycloudy",            		// 44 partly cloudy (yahoo icon is n/a)
    "rain&sun",                		// 45 thundershowers (yahoo icon is rain & sun)
    "snow",                    		// 46 snow showers
    "lightening",                   // 47 isolated thundershowers   "lightning"   //was sun
];

if (window.timerInterval != 300000)
	window.timerInterval = 300000; // 5 minutes

function findChild (element, nodeName)
{
	var child;
	
	for (child = element.firstChild; child != null; child = child.nextSibling)
	{
		if (child.nodeName == nodeName)
			return child;
	}
	
	return null;
}

function applyFunctionToChildrenWhoMatch (element, nodeName, func, data)
{
	var child;
	
	for (child = element.firstChild; child != null; child = child.nextSibling)
	{
		if (child.nodeName == nodeName)
		{
			func (child, data);
		}
	}
}

function trimWhiteSpace (string)
{
	return string.replace(/^\s*/, '').replace(/\s*$/, '');
}

// returns an anonymous object like so
// object
//		error: 	Boolean false for success
//		errorString: failure string
//		hi:		Fahrenheit
//		lo: 		Fahrenheit
//		temp: 	Fahrenheit
//		icon	:	icon code
//		icons:	our icons to display
//		description:	description
//		city:	City (first caps)
//		time:	time 24 hours(nn:nn)
//		sunset:	time 24 hours (nn:nn)
//		sunrise: time 24 hours (nn:nn)
//		phases: array[7] of integers; -1 means no phase data 1-24
//		forcast: array[6] of anonymous objects like so
//			object
//				hi:			Fahrenheit
//				lo: 		Fahrenheit
//				icon:		icon code
//				ouricon:	our icon code to display
//				description: description
//				daycode:	(MON/TUE/WED/THU/FRI/SAT/SUN)

function fetchWeatherData (callback, zip)
{
	var uid = getUID();
	
	var url = 'http://iphone-wu.apple.com/dgw?imei=' + uid + '&apptype=weather&t=' + numRequests++;

	var body = '<?xml version="1.0" encoding="utf-8"?><request devtype="' + gDevtype + '" deployver="' + gDeployver + '" app="' + gApp + '" appver="' + gAppver + '" api="' + gAPI + '" apiver="' + gAPIver + '" acknotification="0000">' 
				+ '<query id="0" timestamp="'
				+ new Date().getTime() + '" type="getforecastbylocationid"><list>'
				+ '<id>' + zip + '</id></list><unit>f</unit></query></request>';		

	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {xml_loaded(e, xml_request, callback);}
	xml_request.overrideMimeType("text/xml");
	xml_request.open("POST", url);
	xml_request.setRequestHeader("Content-type", "text/xml");
	xml_request.setRequestHeader("X-Client-ID", "IMSI=" + uid);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.send(body);
	
	return xml_request;
}

function getUID() {
	if (window.widget) {
		return widget.identifier;
	} else {
		return (Math.random() * new Date().getTime()).toString();
	}
}

function constructError (string)
{
	return {error:true, errorString:string};
}

var days = ["SUN", "MON", "TUES", "WED", "THU", "FRI", "SAT"];

function parseDayCode (dayCode)
{
	daycode = trimWhiteSpace(dayCode).substr (0, 3).toUpperCase();
	return days[dayCode-1];
}

function xml_loaded (event, request, callback)
{
	var obj = {	error:false,
				errorString: null, 
				time: null, 
				city: null, 
				temp: null, 
				description: null, 
				icon: null, 
				icons: null, 
				sunset: null, 
				sunrise: null, 
				phases: null,
				hi: null, 
				lo: null, 
				forecast: null, 
				link: null
				}
	
	if (request.responseXML)
	{
		var obj = {error:false, errorString:null};

		var responseElement = findChild (request.responseXML, "response");
		if (responseElement == null) {callback(constructError("no <response>")); return;}

		var resultElement = findChild (responseElement, "result");
		if (resultElement == null) {callback(constructError("no <result>")); return;}

		var listElement = findChild (resultElement, "list");
		if (listElement == null) {callback(constructError("no <list>")); return;}

		var itemElement = findChild (listElement, "item"); //could be a list, but this gets the first one
		if (itemElement == null) {callback(constructError("no <item>")); return;}

		var location = findChild (itemElement, "location");

			obj.city = location.getAttribute("city");
			obj.country = location.getAttribute("countryname");

		var condition = findChild(itemElement, "condition");

			obj.time = condition.getAttribute("time"); //TODO need to parse differently
			obj.temp = condition.getAttribute("temp");
			obj.description = condition.getAttribute("text");

		var astronomy = findChild(itemElement, "astronomy");

			obj.sunrise = astronomy.getAttribute("sunrise");
			obj.sunset = astronomy.getAttribute("sunset");
			obj.phase = astronomy.getAttribute("moonphase");

		var link = findChild(itemElement, "link");

			obj.link = link.firstChild.data;


			obj.icon = condition.getAttribute("code");
			if (obj.icon < 0 || obj.icon > 47) {callback(constructError("icon code invalid, out of range (0-47) " + obj.icon)); return;}
			obj.icons = yahooWeatherTypes[obj.icon];


		obj.forecast = new Array;
		var Forecasts = itemElement.getElementsByTagName("forecast");
		if (Forecasts == null || Forecasts.length == 0) {callback(constructError("no Forecasts")); return;}


		for(j=0; j < Forecasts.length; j++)
		{
			var foreElement = Forecasts.item(j);

			var foreobj = {description:null, hi:0, lo:0, icon:-1};

			foreobj.description = foreElement.getAttribute("text");
			foreobj.hi = foreElement.getAttribute("high");
			foreobj.lo = foreElement.getAttribute("low");
			foreobj.daycode = parseDayCode(foreElement.getAttribute("dayofweek"));
			foreobj.icon = foreElement.getAttribute("code");
			foreobj.ouricon = yahooWeatherTypes[foreobj.icon];

			obj.forecast.push(foreobj);

			if(j == 0) //the first day is today
			{
				obj.hi = foreobj.hi;
				obj.lo = foreobj.lo;
			}
		}
		
		callback (obj);
		
	}
	else
	{
		callback ({error:true, errorString:"XML request failed. no responseXML"});
	}
}

function printObj (object) {
	var string = "{";

	for(att in object)
		string += att + ": " + object[att] + ", ";
		
	string += "}";
	
	alert(string)
}

// returns an anonymous object like so
// object
//		error: 	Boolean false for success
//		errorString: failure string
//		cities:	array (alphabetical by name)
//			object
//				name: city name
//				zip: postal code
//				state: city state
//		refine: boolean - true if the search is too generic
function validateWeatherLocation (location, callback)
{
	var uid = getUID();
	var url = 'http://iphone-wu.apple.com/dgw?imei=' + uid + '&apptype=weather&t=' + numRequests++;
	var body = '<?xml version="1.0" encoding="utf-8"?><request devtype="' + gDevtype + '" deployver="' + gDeployver + '" app="' + gApp + '" appver="' + gAppver + '" api="' + gAPI + '" apiver="' + gAPIver + '" acknotification="0000">' 
				+ '<query id="3" timestamp="'
				+ new Date().getTime() + '" type="getlocationid">'
				+ '<phrase>' + location+ '</phrase></query></request>';


	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {xml_validateloaded(e, xml_request, callback);}
	xml_request.overrideMimeType("text/xml");
	// xml_request.open("GET", url+location);
	xml_request.open("POST", url);
	xml_request.setRequestHeader("Content-type", "text/xml");
	xml_request.setRequestHeader("X-Client-ID", "IMSI=" + uid);
	xml_request.setRequestHeader("Cache-Control", "no-cache");		
	xml_request.send(body);

	return xml_request;
}

function xml_validateloaded (event, request, callback)
{
	if (request.responseXML)
	{
		var obj = {error:false, errorString:null, cities:new Array, refine:false};
		
		var responseElement = findChild (request.responseXML, "response");
		if (responseElement == null) {callback(constructError("no <response>")); return;}

		var resultElement = findChild (responseElement, "result");
		if (resultElement == null) {callback(constructError("no <result>")); return;}

		var listElement = findChild (resultElement, "list");
		if (listElement == null) {callback(constructError("no <list>")); return;}



		obj.refine = 0;


		var items = listElement.getElementsByTagName("item");

		for(var i=0; i < items.length; i++)
		{
			var itemElement = items.item(i);

			var fields = ["city", "region", "regionname", "country", "countryname", "id"];
			var currentElement = null;
			var city = {};

			var city = findChild(itemElement, "city");
			city = (city && city.firstChild) ? city.firstChild.data : null; //check for <city />

			var region = findChild(itemElement, "region");
			region = (region && region.firstChild) ? region.firstChild.data : null;

			var regionName = findChild(itemElement, "regionname");
			regionName = (regionName && regionName.firstChild) ? regionName.firstChild.data : null;

			var country = findChild(itemElement, "country");
			country = (country && country.firstChild) ? country.firstChild.data : null;

			var countryName = findChild(itemElement, "countryname");
			countryName = (countryName && countryName.firstChild) ? countryName.firstChild.data : null;

			var zip = findChild(itemElement, "id");
			zip = (zip && zip.firstChild) ? zip.firstChild.data : null;

			var state = region;
            if (country != "US") 
			{
                if (regionName && regionName != "")
                    state = regionName + " (" + countryName + ")";
                else if (countryName && countryName != "")
                    state = countryName;
                else 
                    state = nil;
            }

			obj.cities.push({name: city, state: state, zip: zip});
		}
		
		callback (obj);
	}
	else
	{
		callback ({error:true, errorString:"XML request failed. no responseXML"});
	}
}
