/*
Copyright 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

var gLastSearchRequest = null;
var gLastValidationRequest = null;

function performXMLRequest( requestKind, query, callback)
{   
	var xml_request = new XMLHttpRequest();
	// var query = buildSearchRequest(searchData, addressInfo);
	
	if( requestKind=="search" )
	{
		xml_request.onload = function(e) { searchResultsXMLLoaded(e, xml_request, callback); }
		if( gLastSearchRequest != null )
		{
			gLastSearchRequest.abort();
		}
		gLastSearchRequest = xml_request;
	}
	else if( requestKind=="locationValidation" )
	{
		xml_request.onload = function(e) { locationValidationXMLLoaded(e, xml_request, callback); }
		if( gLastValidationRequest != null )
		{
			gLastValidationRequest.abort();
		}
		gLastValidationRequest = xml_request;
	}
	else
		alert("People Widget: unknown query task: " + searchData.queryTask );
	
	xml_request.onerror = function() { alert("People Widget: xml request failed."); }
	
	xml_request.overrideMimeType("text/xml");
	
	query = query.replace("www.daplus.us", "wu.apple.com");
	
	xml_request.open("GET", query);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.send(null);
}



function searchResultsXMLLoaded (event, request, callback)
{   
    // we may have created a new request, and now an old one we tried to abort is coming back to haunt us
    if( gLastSearchRequest != null && request != gLastSearchRequest )
    	return;
    
    var topResultsID = "AppleResults";
    var itemListID = "items";
    var applyFunction = handleBusiness;
    var returnData = null;
    var returnMessage = "XMLHttpRequest failed";
    
	if (request.responseXML)
	{  
        var errorCode = processErrors(request.responseXML);
        
        if (errorCode > 0 )
        {
        	returnData = {error:errorCode};
        	returnMessage = "found error code " + errorCode;
        }
		
		var extractedData = extractData( request.responseXML, topResultsID, itemListID, applyFunction );
			
		if( extractedData.extractedDataArray != null )
		{
			returnData  = { error:errorCode, businesses:extractedData.extractedDataArray, totalPossibleResults:extractedData.totalPossibleResults };
			returnMessage = "";
		}
		else // basically our search failed
		{
			returnData = null;
			returnMessage = "Failed to extract search results data from : " + topResultsID;
		}
	}
	callback (returnData, returnMessage);
	
	gLastSearchRequest = null;
}

function locationValidationXMLLoaded(event, request, callback)
{		
    // we may have created a new request, and now an old one we tried to abort is coming back to haunt us
    if( gLastSearchRequest != null && request != gLastValidationRequest )
    	return;

    var topResultsID = "LocationVerification";
    var itemListID = "locations";
    var applyFunction = handleLocations;
    var returnData = null;
    var returnMessage = "XMLHttpRequest failed";
    
	if (request.responseXML)
	{
        var errorCode = processErrors( request.responseXML );
        
        if (errorCode > 0 )
        {
        	returnData = {error:errorCode};
        	returnMessage = "found error code " + errorCode;
        }
		else
		{
			var extractedData = extractData( request.responseXML, topResultsID, itemListID, applyFunction );
			
			if( extractedData.extractedDataArray != null )
			{
				returnData  = { error:errorCode, locationMatchData:extractedData.extractedDataArray, totalPossibleResults:extractedData.totalPossibleResults };
				returnMessage = "";
			}
			else
			{
				try
				{
					// if no location validation data was returned, the feed provider may have returned a normal AppleResults data stream
					var normalSearchResults = findChild( request.responseXML, "AppleResults" ); // is this AppleResults?
					if( normalSearchResults != null )
					{
						alert("People: Unexpected results format returned for validation query.");
						
						// check the message field for "Insufficient Location Data"
						// if that message is set, we want to pass a flag that will later cause
						// our popup menu to show "no cities found"
						
						var message = findChild( normalSearchResults, "message" );
						var insufficientRegExp = new RegExp("Insufficient","i");
					
						// using regexp should be more robust than exactly matching the full string
						var insufficient = message.firstChild.data.match( insufficientRegExp );
			
						// if there is no "Insufficient" message, it means the city was valid

						var error = ( insufficient != null ) ? "insufficient" : "validated";
					
						returnData  = { error:error, locationMatchData:null, totalPossibleResults:1 };
						returnMessage = "city was valid, or insufficient data to validate...";
					}
					else
					{
						returnData = null;
						returnMessage = "could not find 'LocationVerification' in XML data";
					}
				}
				catch(ex)
				{
					returnData = null;
					returnMessage = "There were no location validation results, and an exception occurred...";
				}
			}   

		}	
	}
	callback (returnData, returnMessage);
	
	gLastValidationRequest = null;
}

function extractData( responseXML, topResultsID, itemListID, applyFunction )
{	
	var extractedData = { totalPossibleResults:0, extractedDataArray:null };
	
	var topResults = findChild( responseXML, topResultsID );
	
	if( topResults )
	{
		var totalPossibleResults=-1;
		var total = findChild(topResults, "total");
		if( total )
			totalPossibleResults = total.firstChild.data;
		else
			totalPossibleResults = 0;
			
		var dataList = findChild( topResults,itemListID);
		if( dataList )
		{
			var extractedDataArray = new Array;
			
			applyFunctionToChildrenWhoMatch( dataList, "anyType", applyFunction, extractedDataArray );
			
			extractedData = { totalPossibleResults:totalPossibleResults, extractedDataArray:extractedDataArray };
		}
		else
			alert("People Widget: failed to extract data from XML response.  Can't get: " + itemListID + " from : " + topResultsID);
	}
	return extractedData;
}

function handleLocations( element, data )
{
	var childrenLen = element.childNodes.length;
    var city = "NOT FOUND";
    var state = "NOT FOUND";
    
    for ( var j = 0; j < childrenLen; j++ )
    {
        var childNode = element.childNodes[j];
        
        if ( childNode != null && childNode.nodeName != null && childNode.firstChild != null ) 
        {
			if ( childNode.nodeName == "City" ) //"CITY" )  
				city = convertToInitialCaps(childNode.firstChild.data);
			if ( childNode.nodeName == "State" ) //"STATE" )  
				state = (childNode.firstChild.data).toUpperCase();
    	}
    }
	var newLocation = { city:city, state:state };
	data.push( newLocation );
}

function convertToInitialCaps(aString)
{
    var words = aString.split(/\s/);
    for(var i = 0; i < words.length; i++)
    {
        var len = words[i].length;
        if(len == 0)
            continue;
        else if(len == 1)
            words[i] = words[i].toUpperCase();
        else
		{
			words[i] = words[i].toLowerCase();
            words[i] = words[i].substr(0, 1).toUpperCase() + words[i].substr(1, len - 1);
		}
    }
    return words.join(' ');
}

function handleBusiness (element, data)
{   
    var childrenLen = element.childNodes.length;
    var name = "";
    var firstname = "";
    var lastname = "";
    var address = "";
    var city = "";
    var state = "";
    var zip = "";
    var phone = "";
    var distance = "";
    var mapLink = "";
    
    for ( var j = 0; j < childrenLen; j++ )
    {
        var childNode = element.childNodes[j];
        
        if ( childNode != null && childNode.nodeName != null && childNode.firstChild != null ) 
        {
			//if ( childNode.nodeName == "businessname" ) //"NAME" )
			//	name = childNode.firstChild.data;
			if ( childNode.nodeName == "first" ) //"FIRSTNAME" )
				firstname = childNode.firstChild.data;
			if ( childNode.nodeName == "last" ) //"LASTNAME" )
				lastname = childNode.firstChild.data;
			if ( childNode.nodeName == "address" ) //"ADDRESS" )  
				address = childNode.firstChild.data;
			if ( childNode.nodeName == "city" ) //"CITY" )  
				city = childNode.firstChild.data;
			if ( childNode.nodeName == "state" ) //"STATE" )  
				state = childNode.firstChild.data;
			if ( childNode.nodeName == "zipcode" )// "ZIP" )  
				zip = childNode.firstChild.data;
			if ( childNode.nodeName == "phone" ) //"PHONE" )
				phone = childNode.firstChild.data;
			if( childNode.nodeName == "encrypted_id" )
				encrypted_id = childNode.firstChild.data;
        } 
    }
        
    // Clean up phone numbers, add space between last ")" of area code and number
    var rightParenIdx = phone.lastIndexOf(")"); 
    if ( rightParenIdx > -1 ) {
        phone = phone.substring(0,rightParenIdx+1) + " " + phone.substr(rightParenIdx+1,phone.length-rightParenIdx-1);
    }

    var newBusiness = {name:name, firstname:firstname, lastname:lastname, address:address, city:city, state:state, zip:zip, phone:phone, distance:distance, mapLink:mapLink, encrypted_id:encrypted_id};
    
    data.push(newBusiness);
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

function processErrors(responseXML)
{
    return 0;
}

function buildSearchRequest( searchData, addressInfo )
{
    //var searchTerm = searchData.searchTerm;
    var fn = searchData.firstName;
    var ln = searchData.lastName;
    
    var categorySIC = searchData.categorySIC;
    
    // seems unwise that we are using an array structure for the addressInfo when we could use named records...
    
    var queryAddressZip = (addressInfo != null && (addressInfo[3].length > 0)) ? addressInfo[3] : "";
    var queryAddressCity = "";
    var queryAddressState = "";
    
    // don't set a default address unless the queryType is a normal search.
    // For validation queries, we want to use whatever is in the address field,
    // or a blank string if nothing is there.
    if( searchData.queryTask=="search" && queryAddressZip.length <= 0 )
    {
    	queryAddressCity = ( addressInfo != null && (addressInfo[1].length > 0)) ? addressInfo[1] : (searchData.business? "Cupertino": "");
    	queryAddressState = ( addressInfo != null && (addressInfo[2].length > 0)) ? addressInfo[2] : "CA";
    }
    else
    {
    	queryAddressCity = ( addressInfo != null && (addressInfo[1].length > 0)) ? addressInfo[1] : "";
    	queryAddressState = ( addressInfo != null && (addressInfo[2].length > 0)) ? addressInfo[2] : "";
    }
		
	var queryURL = "http://www.daplus.us/apple/GetResults.aspx?SearchType=";
	if (searchData.business)
		queryURL += "Business";
	else
		queryURL += "Person";
	
	// is this a category search? or a business name search?
	/*if( categorySIC != null )
		queryURL = queryURL + "&sic=" + categorySIC;
	else if (searchData.business)
		queryURL = queryURL + "&BusName=" + searchTerm;
	else
	{
		var nameParts = searchTerm.split("%2C");
		queryURL = queryURL + "&LastName=" + nameParts[0];
		if (nameParts.length > 1)
		{
			// strip off any +
			queryURL = queryURL + "&FirstName=" + nameParts[1].replace("%20", "");
		}
	}*/
	
	if (ln != null && ln.length > 0)
		queryURL = queryURL + "&LastName=" + ln;
		
	if (fn != null && fn.length > 0)
		queryURL = queryURL + "&FirstName=" + fn;
	
	if( queryAddressCity.length > 0 )
		queryURL = queryURL + "&City=" + queryAddressCity;
	if( queryAddressState.length > 0 )
		queryURL = queryURL + "&State=" + queryAddressState;
	if( queryAddressZip.length > 0 )
		queryURL = queryURL + "&Zip=" + queryAddressZip;
		
	queryURL = queryURL + "&RecordsFrom=" + searchData.RecordsFrom;
	queryURL = queryURL + "&RecordsTo=" + searchData.RecordsTo;
	queryURL = queryURL + "&miles=" + searchData.rangeLimit;
	
	if( searchData.queryTask=="locationValidation" )
		queryURL = queryURL + "&validate=true";
    
	return queryURL;
}


function getProfilePageURL( encrypted_id )
{
	return "http://www.daplus.us/ViewPersonProfile.aspx?recordid=" + encrypted_id + "&Partner=400119";
}
