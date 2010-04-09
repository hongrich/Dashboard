/*
Copyright (c) 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

var firstRequest = true;

function performXMLRequest (airlineCode, flightNumber, departAirport, arriveAirport, detail, callback, departureDate)
{
	var xml_request = new XMLHttpRequest();
	
	var postData = "Entity=Flight&ContractID=490&Enroute=N&FlightCategory=COM";

	if(departureDate)
		postData += "&DepartureDate=" + departureDate;
	
	if ( detail == true )
	    postData = postData + "&DataView=detail";
    else
        postData = postData + "&DataView=summary";

    if (departAirport && departAirport.length)
        postData = postData + "&DepartureAirportCode=" + departAirport;

    if (arriveAirport && arriveAirport.length)
        postData = postData + "&ArrivalAirportCode=" + arriveAirport;
	
	if (airlineCode && airlineCode.length)
		postData = postData + "&AirlineCode=" + airlineCode;
		
    if ( flightNumber != null && flightNumber.length > 0 && flightNumber != "- - -" && flightNumber != "0")
        postData = postData + "&FlightNumber=" + flightNumber;
	
	xml_request.onload = function(e) {xml_loaded(e, xml_request, callback);}
	xml_request.onerror = function() {alert("xml request failed");}
	xml_request.overrideMimeType("text/xml");

	xml_request.open("POST", "http://wu.apple.com/FlyteSourceGeneratorWebApp/Application");
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	if (gDebug > 0) alert("sending request...");
	xml_request.send(postData);
	if (gDebug > 0) alert("sent search request");
	return xml_request;
}

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

function processErrors(responseXML)
{
//	alert("responseXML = "+dumpToString(responseXML,2));
    var flyteSource = findChild(responseXML,"FlyteSource");
    if ( flyteSource != null ) {
        var header = findChild(flyteSource, "HEADER");
        
        if ( header != null ) {
            var error = findChild(header,"ERROR");
            
            if ( error != null ) {
                return parseInt(error.getAttribute("code"),10);
            }
        }
        else {
        	alert("No HEADER tag!");
        	return -1;
       	}
    }
    else {
    	alert("No FlyteSource tag!");
    	return -1;
    }

    return 0;
}

function xml_loaded (event, request, callback)
{
    if ( request != lastXMLRequest ) {
        return;
    }
    
    if (gDebug > 1) alert(request.responseText);

    var startDate = new Date();
	if (request.responseXML)
	{
        var errorCode = processErrors(request.responseXML);
        if (errorCode != 0 ) {callback ({error:errorCode},"found error code "+errorCode);return;}
		var flyteSource = findChild(request.responseXML, "FlyteSource");
		
		// Get flight list
		var flightList = findChild(flyteSource, "FlightList");
		if (flightList == null) {callback (null, "could not find FlightList element"); return;}
		
		// Get airport and airline lists
		var airportList = findChild(flyteSource, "AirportList");
		var airlineList = findChild(flyteSource, "AirlineList");
		var data = {flights:new Array, airports:(airportList==null?null:new Array), airlines:(airlineList==null?null:new Array), error:0};
		
		// Add flights
		if ( flightList != null )
            applyFunctionToChildrenWhoMatch (flightList, "Flight", handleFlight, data.flights);
		
		// Add airports
		if ( airportList != null ) 
            applyFunctionToChildrenWhoMatch (airportList, "Airport", handleAirport, data.airports);

		// Add airlines
		if ( airlineList != null ) 
            applyFunctionToChildrenWhoMatch (airlineList, "Airline", handleAirline, data.airlines);
            
		var deltaSeconds = (new Date).getTime() - startDate.getTime();
		if (gDebug > 0) alert("parse took " + deltaSeconds);
		callback (data, null);
	}
	else
		callback (null, "XMLHttpRequest failed");
}

function handleAirline (element, data)
{
	var airlineName = findChild(element, "Name");
	var phone = null;
	var website = null;
	
	if(airlineName)
	{
		airlineName = airlineName.firstChild.data;

		if(phone = findChild(element, "Phone"))
			phone = phone.firstChild.data;

		if(website = findChild(element, "InternetAddress"))
			website = website.firstChild.data;
		
		data[element.getAttribute("faaairlinecode")] = { 	name: airlineName, 
															iata: element.getAttribute("iataairlinecode"),
															phone: phone,
															website: website
														}
	}
}

function handleAirport (element, data)
{
    var airportName = findChild(element, "Name");
    if ( airportName != null )
        airportName = airportName.firstChild.data;

    data[element.getAttribute("iataairportcode")] = {name:airportName,
                                                     latitude:element.getAttribute("latitude"),
                                                     longitude:element.getAttribute("longitude")
                                                     };
}

function handleFlight (element, data)
{
    var legs = new Array();

	applyFunctionToChildrenWhoMatch(element, "Leg", handleLeg, legs);
	if (legs.length == 0) return; // should return some error (in data object?)

    var airlineName = element.getAttribute("airlineshortname");
    if ( airlineName == null || airlineName.search("N/A") > -1 )
        airlineName = element.getAttribute("faaairlinecode");

    // now create the new flight object
	var newFlight = {legs:legs,
	                 number:element.getAttribute("flightnumber"),
	                 airlineCode:element.getAttribute("faaairlinecode"),
	                 airlineName:airlineName};
	
	data.push(newFlight);
}

function handleLeg(element, data)
{
    var trackingInfo = null;
    var legTimeData  = processLegData(element);
    var arriveInfo   = legTimeData.arrive;
    var departInfo   = legTimeData.depart;
                  
    var trackingData = findChild(element,"Tracking");
    if (trackingData != null)
    {
        var vectorData = findChild(trackingData,"Vector");
        var heading = null;
        var speed = null;
        var altitude = null;
        var longitude = null;
        var latitude = null;
        var timeLeft = null;
                
        if ( vectorData ) {
            var speedTags = findChild(vectorData,"Speed");
            var altitudeTags = findChild(vectorData,"Altitude");
            var headingTags = findChild(vectorData,"Heading");
            var longitudeTags = findChild(vectorData,"Longitude");
            var latitudeTags = findChild(vectorData,"Latitude");
            
            timeLeft = vectorData.getAttribute("time_remaining");
        
            if ( speedTags != null ) {
                speed = speedTags.firstChild.data;
            }
            if ( altitudeTags != null ) {
                altitude = altitudeTags.firstChild.data;
                if ( altitude != "-" && parseInt(altitude) > 0 ) {
                    altitude = parseInt(altitude);
                }
            }
            if ( headingTags != null )
                heading = parseInt(headingTags.firstChild.data);
            if ( longitudeTags != null )
                longitude = longitudeTags.firstChild.data;
            if ( latitudeTags != null )
                latitude = latitudeTags.firstChild.data;
        }
        
        trackingInfo = {heading:heading, speed:speed, altitude:altitude, longitude:longitude, latitude:latitude, timeLeft:timeLeft};
    }
    
    var newLeg = {status:element.getAttribute("status"),
                  duration:element.getAttribute("duration"),
                  depart:departInfo,
                  arrive:arriveInfo,
                  tracking:trackingInfo};
                            
    data.push(newLeg);
}
	
function processLegData(leg) 
{
    var arriveT = {scheduled:"", estimated:"", actual:"", best:null, airportCode:"", gate:null, terminal:null};
    var departT = {scheduled:"", estimated:"", actual:"", best:null, airportCode:"", gate:null, terminal:null};

    // Get all arrive times
    var arriveData = findChild(leg,"Arrive");
    var arriveTimesData = findChild(arriveData,"Time");
    arriveT.scheduled = findChild(arriveTimesData,"Scheduled").getAttribute("gatetime");
    arriveT.estimated = findChild(arriveTimesData,"Estimated");
    arriveT.actual = findChild(arriveTimesData,"Actual");
    arriveT.airportCode = arriveData.getAttribute("airportcode");
    arriveT.gate = arriveData.getAttribute("gate");
    arriveT.terminal = arriveData.getAttribute("terminal");
    
    // Find the best arrive time, ranking: 1.Actual, 2.Estimated, 3.Scheduled
    if ( arriveT.actual != null && arriveT.actual.getAttribute("landingtime") != "N/A")
        arriveT.best = arriveT.actual.getAttribute("landingtime");
    else if ( arriveT.estimated != null && arriveT.estimated.getAttribute("landingtime") != "N/A")
        arriveT.best = arriveT.estimated.getAttribute("landingtime");
    else if ( arriveT.scheduled != null && arriveT.scheduled != "N/A" )
        arriveT.best = arriveT.scheduled;
    
    // Get all depart times
    var departData = findChild(leg,"Depart");
    var departTimesData = findChild(departData,"Time");
    departT.scheduled = findChild(departTimesData,"Scheduled").getAttribute("gatetime");
    departT.estimated = findChild(departTimesData,"Estimated");
    departT.actual = findChild(departTimesData,"Actual");
    departT.airportCode = departData.getAttribute("airportcode");
    departT.gate = departData.getAttribute("gate");
    departT.terminal = departData.getAttribute("terminal");
    
    // Find the best depart time, ranking: 1.Actual, 2.Estimated, 3.Scheduled
    if ( departT.actual != null && departT.actual.getAttribute("takeofftime") != "N/A")
        departT.best = departT.actual.getAttribute("takeofftime");
    else if ( departT.estimated != null && departT.estimated.getAttribute("takeofftime") != "N/A")
        departT.best = departT.estimated.getAttribute("takeofftime");
    else if ( departT.scheduled != null && departT.scheduled != "N/A")
        departT.best = departT.scheduled;
    
    return {depart:departT, arrive:arriveT};
}
