/*
Copyright © 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/


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

function trimWhiteSpace (string)
{
	return string.replace(/^\s*/, '').replace(/\s*$/, '');
}


// returns an anonymous object like so
// object
//		error:			Boolean false for success
//		errorString:	failure string
//		temp:			current temperature in Fahrenheit
//		newPowder: 		inches
//		base:			feet
//		snowCondition:	current weather condtion, used for icon
//		openTrails:		number of open trails
//		closed:			Boolean
//		openingDate:	decription when closed

function fetchWeatherData (callback, uid)
{
	var url = 'http://wu.apple.com/adcbin/apple/apple_ski.asp?permcode=';

	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {xml_loaded(e, xml_request, callback);}
	xml_request.overrideMimeType("text/xml");
	xml_request.open("GET", url+uid);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.setRequestHeader("wx", "385");
	xml_request.send(null);
	
	return xml_request;
}


function constructError (string)
{
	alert(string);
	return {error:true, errorString:string};
}


function betterParseInt(number)
{
	var result = 0;
	if (number != null)
	{
		result = parseInt(number);
		if (isNaN(result))
			result = 0;
	}
		
	return result;
}


function xml_loaded (event, request, callback)
{
	try
	{
		if (request.responseXML)
		{
			var obj = {error:false, errorString:null};
			var adc_Database = findChild (request.responseXML, "adc_database");
			if (adc_Database == null) {callback(constructError("no <adc_database>")); return;}
			
			var CurrentConditions = findChild (adc_Database, "skiData");
			if (CurrentConditions == null) {callback(constructError("no <skiData>")); return;}
			
			var tag = findChild (CurrentConditions, "opStatus");
			if (tag != null)
			{
				if (tag.firstChild != null && tag.firstChild.data != null)
				{
					var status = trimWhiteSpace(tag.firstChild.data);
					if (status)
					{
						if ((0 == status.indexOf("Plan to Open")) ||
							(0 == status.indexOf("Open")) ||
							(0 == status.indexOf("Reopen")) ||
							(0 == status.indexOf("Closed")))
						{
							obj.closed = true;
							obj.openingDate = status;
						}
					}
				}
			}
			
			if (obj.closed == null || obj.closed == false)
			{
				tag = findChild (CurrentConditions, "temperature");
				if (tag != null && tag.firstChild != null && tag.firstChild.data != null)
					obj.temp = betterParseInt (tag.firstChild.data);
		
				tag = findChild (CurrentConditions, "newSnow");
				if (tag == null) {callback(constructError("no <newSnow>")); return;}
				var attribute = tag.getAttribute("min");
				if (attribute == null) {callback(constructError("no <min>")); return;}
				obj.newPowder = betterParseInt (attribute);
		
				tag = findChild (CurrentConditions, "base");
				if (tag == null) {callback(constructError("no <base>")); return;}
				var attribute = tag.getAttribute("min");
				if (attribute == null) {callback(constructError("no <min>")); return;}
				obj.base = betterParseInt (attribute);
		
				tag = findChild (CurrentConditions, "surface");
				if (tag == null) {callback(constructError("no <surface>")); return;}
				if (tag.firstChild)
					obj.snowCondition = trimWhiteSpace(tag.firstChild.data);
				else
					obj.snowCondition = "";

				resortStatus = findChild(CurrentConditions, "resortStatus");
				if (resortStatus == null) {callback(constructError("no <resortStatus>")); return;}
				
				var data;
				tag = findChild (resortStatus, "trails");
				if (tag == null) {callback(constructError("no <trails>")); return;}
				if (tag.firstChild)
				{
					data = tag.firstChild.data;
					if (data == null) {callback(constructError("no data")); return;}
					if (data.length == 0)
						obj.openTrails = "";
					else
						obj.openTrails = betterParseInt (data);
				}
				else
					obj.openTrails = "";
			}
			
			callback (obj);
			
		}
		else
		{
			callback ({error:true, errorString:"XML request failed. no responseXML"});
		}
	}
	catch (ex)
	{
		alert(ex);
		callback ({error:true, errorString:"XML parse failed"});
	}
}


// returns an anonymous object like so
// object
//		error: 	Boolean false for success
//		errorString: failure string
//		resorts:	array (alphabetical by name)
//			object
//				name: city name
//				location: state, country
//				uid: permCode
//		refine: boolean - true if the search is too generic
function validateSkiResort (resort, callback)
{
	var url = 'http://wu.apple.com/adcbin/apple/apple_find_ski.asp?resort=';

	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {xml_validateloaded(e, xml_request, callback);}
	xml_request.overrideMimeType("text/xml");
	xml_request.open("GET", url+resort);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.send(null);
}



function  validateSkiLocation (location, validationCallback)
{
	var url = 'http://wu.apple.com/adcbin/apple/apple_find_ski.asp?location=';

	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {xml_validateloaded(e, xml_request, validationCallback);}
	xml_request.overrideMimeType("text/xml");
	xml_request.open("GET", url+location);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.send(null);
}


function xml_validateloaded (event, request, callback)
{
	try
	{
		if (request.responseXML)
		{
			var obj = {error:false, errorString:null, resorts:new Array, refine:false};
			var adc_Database = findChild (request.responseXML, "adc_Database");
			if (adc_Database == null)
			{
				alert (request.responseXML.firstChild.nodeName);
				alert ("no <adc_Database>");
				callback(constructError("no <adc_Database>"));
				return;
			}
			
			var ResortList = findChild (adc_Database, "SkiResort");
			if (ResortList == null)
			{
				alert ("no <SkiResort>");
				callback(constructError("no <SkiResort>"));
				return;
			}
			
			if (ResortList.getAttribute('extra_resorts') == '1')
				obj.refine = true;
	
			for (child = ResortList.firstChild; child != null; child = child.nextSibling)
			{
				if (child.nodeName == "resort")
				{
					var location = child.getAttribute("state") + ", " + child.getAttribute("country");
					var name = child.getAttribute("name");
					var uid = child.getAttribute("permCode");
					
					if (location && uid)
					{
						obj.resorts[obj.resorts.length] = {name:name, location:location, uid:uid};
					}
				}
			}
			
			callback (obj);
		}
		else
		{
			alert ("XML request failed. no responseXML");
			callback ({error:true, errorString:"XML request failed. no responseXML"});
		}
	}
	catch (ex)
	{
		alert(ex);
		callback ({error:true, errorString:"XML parse failed"});
	}
}

function createGoToURL (location)
{
	return 'http://wwwa.accuweather.com/ski/index-ski.asp';
}


return {fetchWeatherData:fetchWeatherData, validateSkiResort:validateSkiResort, validateSkiLocation:validateSkiLocation, createGoToURL:createGoToURL};