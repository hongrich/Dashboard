//
// AppleParser object
//
// var apple_parser = new AppleParser ("http://www.apple.com/widgets/something.js");
//
// before making a network call do:
//
// apple_parser.fetchAndExecute (mycallback);
//
// and int your callback:
// function mycallback (parser) { // make calls to your parsing code}
//

function AppleParser (netResource)
{
	this.netResource = netResource;
	this.lastFetch = null;
	this.timeoutTimer = null;
	this.evaluatedJS = false;
	this.xml_request = null;
}

AppleParser.prototype.fetchAndExecute = function (callback) {
	
	var now = (new Date).getTime();
	var immediate;
		
	// 43200000 = 12 hours
	if (this.lastFetch != null && (now - this.lastFetch) < 43200000)
	{
		// no need to refetch the parser
		if (callback)
			callback(this);
		immediate =  true;
	}
	else
	{
		if (this.xml_request != null)
		{
			this.xml_request.abort();
			if (this.xml_request.the_callback)
			{
				// if we are cancelling a callback to fetch another, make
				// sure we call the callback
				this.xml_request.the_callback (this);
			}
			this.xml_request = null;
		}
		
		if (this.timeoutTimer != null)
		{
			clearTimeout (this.timeoutTimer);
			this.timeoutTimer = null;
		}
		
		var xml_request = new XMLHttpRequest();
		var savedThis = this;
		xml_request.onload = function(e) {savedThis.xmlcallback(e, xml_request, callback);}
		xml_request.overrideMimeType("text/js");
		xml_request.open("GET", this.netResource);
		xml_request.send(null);
		xml_request.the_callback = callback;
		
		this.xml_request = xml_request;
		
		AppleParser.ActiveObject = this;
		this.timeoutTimer = setTimeout (savedThis.makeTimeoutFunc(savedThis, callback), 5000); // 5 seconds
				
		immediate = false;
	}

	return immediate;
}

AppleParser.prototype.evaluate = function (js) {
	
	var success = false;
	try {
		var funcs = eval (js);
		this.evaluatedJS = true;
		
		if (funcs)
		{
			for (var i in funcs)
			{
				this[i] = funcs[i];
			}
		}
		
		success = true;
	} catch (ex) {}
	
	return success;
}


AppleParser.prototype.handleFailure = function () {
	
	// xml request failed or timed out
	// try to back down to preferences if we do not evaluated anything
	var handled = false;
	var js = null;
	
	if (!this.evaluatedJS) // if we have executed js already dont do it again.
	{
		if (window.widget)
		{
			js = widget.preferenceForKey (this.netResource);
			
			if (js)
			{
				this.evaluate(js);
			}
		}
	}
}

AppleParser.prototype.xmlcallback = function (e, xml_request, callback)
{
	if (this.timeoutTimer != null)
	{
		clearTimeout (this.timeoutTimer);
		this.timeoutTimer = null;
	}
	
	this.xml_request = null;
		
	var status = xml_request.status;
	if (xml_request && xml_request.responseText && status > 199 && status < 300)
	{
		// we have some valid js, excute it.
		if (	this.evaluate (xml_request.responseText))
		{
			this.lastFetch = (new Date).getTime();
			
			if (window.widget)
			{
				widget.setPreferenceForKey (xml_request.responseText, this.netResource);
			}
		}
	}
	else
	{
		this.handleFailure ();
	}

	if (callback)
		callback (this);
}


AppleParser.prototype.xmltimeout = function (callback)
{
	if (this.xml_request != null)
	{
		this.xml_request.abort();
		this.xml_request = null;
	}
	
	this.handleFailure();
	
	if (callback)
		callback (this);
}

AppleParser.prototype.makeTimeoutFunc = function (obj, callback)
{
	return function () {obj.xmltimeout(callback)};
}
