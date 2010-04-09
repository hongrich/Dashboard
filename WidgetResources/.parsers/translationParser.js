/*
Copyright (c) 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/


function performXMLRequest (encodedText, encodingType, translationType, callback)
{

    var xml_request = new XMLHttpRequest();
		
    var postData = "id=sherlock&amp;charset=";
    postData = postData + encodingType + "&amp;api=1&amp;lp=";
    postData = postData + translationType;
    postData = postData + "&amp;text=" + encodedText;

    xml_request.onload = function(e) {xml_loaded(e, xml_request, requestID++, callback);}
    xml_request.onerror = function() {callback(null,"");}

    //http://w4.systranlinks.com/trans
    xml_request.open("POST", "http://wu.apple.com/trans");
    xml_request.overrideMimeType("text/xml");
    xml_request.setRequestHeader("Cache-Control", "no-cache");
    xml_request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    
    xml_request.send(postData);
    
    return xml_request;

}

function xml_loaded (e, xml_request, id, callback)
{
	if (!isXMLRequestLastOneSent(xml_request))
		return;
    
    if ( xml_request.responseText ) {
        var response = xml_request.responseText;
        var termIdx = response.indexOf("!");
        
        if ( id < receiveID ) {
            debug("old request: " + id);
            return;
        }
        
        receiveID = id;
        response = response.substr(termIdx+9,response.length-9-termIdx);
        termIdx = response.indexOf("]");
        response = response.substr(0,termIdx);
        
        callback(response, null);
    }
    else
        callback(null, "");
        
    clearLastXMLRequest();
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
