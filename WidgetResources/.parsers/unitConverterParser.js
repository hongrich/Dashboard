/*
Copyright ＿ 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

function performXMLRequest(callback) {
	var uid = getUID();
	var url = "http://wu-converter.apple.com/dgw?imei=" + uid + "&apptype=finance";
	var body = "<?xml version='1.0' encoding='utf−8'?><request devtype='Apple_OSX' deployver='APPLE_DASHBOARD_1_0' app='YGoAppleCurrencyWidget' appver='1.0' api='finance' apiver='1.0.0' acknotification='0000'><query id='0' timestamp='"
		+ new Date().getTime() + "' type='convertcurrency'><from/><to/><amount/></query></request>";
	
	var req = new XMLHttpRequest();
	req.onload = function(evt) {currencyDataLoaded(evt, req, callback);}
    req.onerror = function() {alert("xml request failed");}
	req.overrideMimeType("text/xml");
	req.open("POST", url);
	req.setRequestHeader("Content-type", "text/xml");
	req.setRequestHeader("X-Client-ID", "IMSI=" + uid);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(body);
	return req;
}


function constructError(string) {
	return {error:true, errorString:string};
}

function getTextContentOfFirstChildByTagName(el, tagName) {
	for (var child = el.firstChild; child != null; child = child.nextSibling) {
		if (child.nodeName == tagName) {
			var result = child.textContent;
			if (!result) {
				result = child.firstChild.data;
			}
			return result;
		}
	}
	return null;
}

function currencyDataLoaded(evt, req, callback) {
	var doc;
	try {
		doc = req.responseXML;
		var obj = {error:false, errorString:null, nextUpdate:null, data:[]};
		
		var d = new Date();
		// should refetch if exchange rates are more than 3 hours old
		d.setUTCHours(d.getUTCHours() + 3);
		obj.nextUpdate = d.valueOf();
		
		var lastUpdatedDate;
		var resultEl = doc.getElementsByTagName("result").item(0);
		
		if (resultEl.hasAttribute("timestamp")) {
			var timestamp = resultEl.getAttribute("timestamp");
			lastUpdatedDate = new Date(parseInt(timestamp, 10)*1000);
		} else {
			lastUpdatedDate = new Date();
		}
		
		var conversionEls = resultEl.getElementsByTagName("conversion");
		for (var i = 0; i  < conversionEls.length; i ++) {
			var conversionEl = conversionEls[i];
			var isoCode = getTextContentOfFirstChildByTagName(conversionEl, "to");
			
			var currencyName;
			if (window.ConverterPlugin) {
			 	currencyName = ConverterPlugin.currencyNameForCode(isoCode);
			}
			
			var rateFromUSDollar = parseFloat(getTextContentOfFirstChildByTagName(conversionEl, "convertedamount"), 10);
			var rateToUSDollar = 1.0 / rateFromUSDollar;
			var symPrecision = computeSymmetricPrecision(rateToUSDollar, rateFromUSDollar);
			
			var newData = {	name: currencyName, 
							iso: isoCode, 
							lastUpdated: lastUpdatedDate, 
							toBase: rateToUSDollar, 
							fromBase: rateFromUSDollar, 
							precision: symPrecision
						};
			obj.data[obj.data.length] = newData;
		}		
		callback(obj);
	} catch (e) {
		callback(constructError("error parsing currency xml response: " + e));
	} finally {
		doc = req = null;
	}
}

function sortLocalizedMenuDataArray(a, b) {
	return a.name.localeCompare(b.name);
}

function createDateFromDateTime(dateString, timeString) {
	var array = dateString.split("-");

	var hour = parseFloat(timeString.substr(0,2));
	var min= parseFloat(timeString.substr(3,2));
	var sec = parseFloat(timeString.substr(6,2))
	var meridiam = timeString.substr(9, 2);

	var year = parseFloat(array[0]);
	var month = parseFloat(array[1]);
	var day = parseFloat(array[2]);
	if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(min)  || isNaN(sec))
		return new Date(Infinity);
	var date =  new Date();
	date.setUTCFullYear(year);
	date.setUTCMonth(month-1);
	date.setUTCDate(day);
	date.setUTCHours(hour);
	date.setUTCMinutes(min);
	date.setUTCSeconds(sec);
	return date;
}


function createNextUpdateDateFromDateTime(dateString, timeString) {	
	var array = dateString.split("/");
	
	var hour = parseInt (timeString.substr(0, 2), 10);
	var minute = parseInt (timeString.substr(3, 2), 10);
	var meridiam = timeString.substr(9, 2);
	
	var date =  new Date(array[2], array[0]-1, array[1], hour, minute); 	
	return date.valueOf();
}

function getUID() {
	if (window.widget) {
		return widget.identifier;
	} else {
		return (Math.random() * new Date().getTime()).toString();
	}
}
