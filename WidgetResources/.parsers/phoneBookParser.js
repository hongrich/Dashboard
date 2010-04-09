/*
Copyright (c) 2005, Apple Computer, Inc.  All rights reserved.
NOTE: Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/
var gLastSearchRequest;
var gLastValidationRequest;

function sendAsyncGetRequest(url, loadHandler) {
	var req = new XMLHttpRequest();
	req.onload  = function(evt) {loadHandler(evt, req);};
	req.onerror = function(evt) {alert("Phone Book Widget: xml request failed.");};
	req.open("GET", url, true);
	req.overrideMimeType("application/xml");
	req.setRequestHeader("Cache-control", "no-cache");
	req.setRequestHeader("Pragma", "no-cache");
	req.send(null);
	return req;
}

function sendSearchRequest(searchCommand) {
	if (gLastSearchRequest) {
		gLastSearchRequest.abort();
		gLastSearchRequest = null;
	}
	
	var url = (searchCommand.isKeyword) ? 
		"http://wu.apple.com/apple/GetResults.aspx?SearchType=Business&sic=" :
		"http://wu.apple.com/apple/GetResults.aspx?SearchType=Business&BusName=";

	url += encodeURIComponent(searchCommand.searchString)
	+ "&RecordsFrom=" + searchCommand.startIndex + "&RecordsTo=" + (searchCommand.startIndex + searchCommand.itemsPerPage)
	+ "&miles=" + searchCommand.searchRadius;
	
	var location = searchCommand.location;
	
	if (isFinite(location)) {
		url += "&Zip=" + encodeURIComponent(location);
	} else {
		var i = location.lastIndexOf(",");
		var city = location.substring(0, i);
		var state = location.substring(i+1);
		url += "&City=" + encodeURIComponent(trim(city))
			+ "&State=" + encodeURIComponent(trim(state));
	}
	gLastSearchRequest = sendAsyncGetRequest(url, searchLoaded);
}

function searchLoaded(evt, req) {
	var doc = req.responseXML;
	if (doc) {
		try {
			gTotalResults = doc.evaluate("number(/AppleResults/total[1])", 
				doc, null, XPathResult.NUMBER_TYPE, null).numberValue;
		} catch (e) {
			gTotalResults = 0;
		}
	}
	handleSearchResults(doc);
}

function sendValidationRequest(str) {
	if (gLastValidationRequest) {
		gLastValidationRequest.abort();
		gLastValidationRequest = null;
	}

	var match = str.match(/(\W+)\w*\s*$/);
	var city, state;
	
	if (match) {
		var i = match.index;
		city  = str.substring(0, i);
		state = str.substring(i+1);
	} else {
		showLocationValidationResults(null);
		return;
	}

	var url = "http://www.daplus.us/apple/GetResults.aspx?SearchType=Business&validate=true&City="
	 + encodeURIComponent(trim(city));
	if (state) {
		url += "&State=" + encodeURIComponent(trim(state));
	}
	gLastValidationRequest = sendAsyncGetRequest(url, validationLoaded);
}

function validationLoaded(evt, req) {
	var doc = req.responseXML;
	var names;
	if (doc) {
		var cityEls  = doc.getElementsByTagName("City");
		var stateEls = doc.getElementsByTagName("State");
		if (cityEls && cityEls.length) {
			names = new Array(cityEls.length);
			for (var i=0; i < cityEls.length; i++) {
				var cityEl = cityEls[i];
				var stateEl = stateEls[i];
				var name = convertToInitialCaps(cityEl.textContent) + ", " 
					+ stateEl.textContent.toUpperCase();
				names[i] = name;
			}
		}
	} else {
		names = [];
	}
	showLocationValidationResults(names);
}

function getBizProfileUrl(bizId) {
	return "http://www.daplus.us/ViewBusinessProfile.aspx?recordid=" + bizId + "&Partner=400119";
}

function getVendorHomepageUrl() {
	return "http://www.daplus.us";
}

function getBizMapUrl(bizId) {
	gCurrentBizId = bizId;
	var addr = getCurrentAddressData();
	var bizName = $("name-" + bizId).textContent;
	return "http://www.daplus.us/showmap.aspx"
		+ "?businessname="	+ encodeURIComponent(bizName)
		+ "&address=" 		+ encodeURIComponent(addr.street)
		+ "&city=" 			+ encodeURIComponent(addr.city)
		+ "&state=" 		+ encodeURIComponent(addr.state)
		+ "&zip=" 			+ encodeURIComponent(addr.postalCode)
		+ "&Partner=appleyp";
}

function convertToInitialCaps(str) {
	var words = str.split(/\s+/);
	for (var i = 0; i < words.length; i++) {
		var len = words[i].length;
		if (0 == len) {
			continue;
		} else if (1 == len) {
			words[i] = words[i].toUpperCase();
		} else {
			words[i] = words[i].toLowerCase();
			words[i] = words[i].substring(0, 1).toUpperCase() + words[i].substring(1);
		}
	}
	return words.join(' ');
}

function trim(str) {
	return str.replace(/^\s*/, "").replace(/\s*$/, "");
}
