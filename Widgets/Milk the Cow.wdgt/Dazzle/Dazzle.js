/*

File: Dazzle.js
Version: 1.5

Description:
	Check for Updates class for Dashboard Widgets. See "http://sculptedcode.com/dazzle/" for more information.
	Inspired by the "Sparkle" framework ("http://sparkle.andymatuschak.org/").

Documentation:
	See main page ("http://sculptedcode.com/dazzle/") for information on how to include Dazzle in your widget.

	See Dazzle Guide ("http://sculptedcode.com/dazzle/guide/") for information on how Dazzle works and how you can use it in your widget.
	See Dazzle Reference ("http://sculptedcode.com/dazzle/reference/") for a complete reference of all Dazzle's options and methods.
	

Copyright (c) 2009 Steve Harrison.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

function Dazzle()
{
	var _this = this;
	
	var options = arguments[0] || {};
	
	
	/* #################################################################### */
	/* ######################### Private variables ######################## */
	/* #################################################################### */
	
	// Namespaces
	
	var dazzleNamespaceURL = "http://sculptedcode.com/dazzle/dazzle-xmlns/";
	var sparkleNamespaceURL = "http://www.andymatuschak.org/xml-namespaces/sparkle";
	var namespaceURL = dazzleNamespaceURL;
	
	// URL of appcast
	
	var appcastURL = null;
	
	// Settings
	
	var checkInterval = 1000 * 60 * 30; // Default: Every 30 minutes
	var shouldAutoCheck = true;
	var shouldDisplayAlertBox = true;
	
	// Information about the latest version of the widget available
	
	var latestVersion = {
		version: null,
		shortVersionString: null,
		minimumSystemVersion: null,
		url: null,
		releaseNotesURL: null
	};
	
	// Are we up to date?
	
	var isUpToDate = null;
	
	// Information about the current version of the widget
	
	var currentVersion = {
		version: null,
		shortVersionString: null
	};
	
	// Information about the widget
	
	var widgetName = null;
	var widgetDisplayName = null;
	
	// Version of the user's operating system
	
	var systemVersion = null;
	
	// References to HTML elements in the alert box that we need to access
	
	var alertBoxHTML = {
		container: null,
		alertText: null,
		releaseNotesText: null,
		releaseNotesLink: null,
		downloadButton: null,
		laterButton: null
	};
	
	// Height of the alert box without/with the release notes link
	
	var alertBoxHeight = "120px";
	var alertBoxHeightWithReleaseNotesLink = "145px";
	
	// Checker
	
	var checker = null;
	
	
	/* ################################################################# */
	/* ######################### Public methods ######################## */
	/* ################################################################# */
	
	
	if (typeof DebugMode === "boolean" && DebugMode === true)
	{
		// Debugging only
		this.eval = function(code) {
			return eval(code);
		};
	}
	
	
	this.getLatestVersion = function() {
		return latestVersion;
	};
	
	this.getCurrentVersion = function() {
		return currentVersion;
	};
	
	this.getWidgetName = function() {
		return widgetName;
	};
	
	this.getWidgetDisplayName = function() {
		return widgetDisplayName;
	};
	
	this.getSystemVersion = function() {
		return systemVersion;
	};
	
	// getIsUpToDate()
	//	Returns a boolean indicating whether the current version is the latest version available.
	
	this.getIsUpToDate = function() {
		return isUpToDate;
	};
	
	
	this.getAppcastURL = function() {
		return appcastURL;
	};
	
	this.setAppcastURL = function(url) {
		appcastURL = url;
	};
	
	this.getCheckInterval = function() {
		return checkInterval;
	};
	
	this.setCheckInterval = function(interval) {
		
		// Catch values equal to or below zero
		if (!interval > 0) {
			internalError("Dazzle.setCheckInterval(): Error: 'interval' [" + interval + "] must be greater than zero - if you want to disable automatic checking, use 'Dazzle.setShouldAutomaticallyCheckForUpdates()' instead.");
			return;
		}
		
		if (typeOf(interval) === "number") {
			checkInterval = interval;
		}
		else if (parseInt(interval, 10)) {
			checkInterval = parseInt(interval, 10);
		}
		else if (typeOf(interval) === "string") {
			interval = capitaliseFirstLetter(interval);
			switch(interval)
			{
				case "Half-hourly":
					checkInterval = 1000 * 60 * 30;
					break;
				case "Hourly":
					checkInterval = 1000 * 60 * 60;
					break;
				case "Daily":
					checkInterval = 1000 * 60 * 60 * 24;
					break;
				case "Weekly":
					checkInterval = 1000 * 60 * 60 * 24 * 7;
					break;
				default:
					internalError("Dazzle.setCheckInterval(): Couldn't undertand input [" + interval + "].");
					return;
			}
		}
		
		// Update the checker
		if (checker) {
			checker.setInterval(checkInterval);
		}
		
	};
	
	this.getShouldAutomaticallyCheckForUpdates = function() {
		return shouldAutoCheck;
	};
	
	this.setShouldAutomaticallyCheckForUpdates = function(shouldCheck) {
		
		if (shouldCheck === true) {
			shouldAutoCheck = true;
			checker.start();
		}
		else if (shouldCheck === false) {
			shouldAutoCheck = false;
			checker.pause();
		}
		
	};
	
	this.getShouldDisplayAlertBox = function() {
		return shouldDisplayAlertBox;
	};
	
	this.setShouldDisplayAlertBox = function(shouldDisplay) {
		
		if (shouldDisplay === true) {
			shouldDisplayAlertBox = true;
		}
		else if (shouldDisplay === false) {
			shouldDisplayAlertBox = false;
		}
		
	};
	
	
	// checkForUpdatesInBackground()
	//	Checks for updates, and displays an alert if a newer version is available.
	
	this.checkForUpdatesInBackground = function() {
		getAppcast();
	};
	
	// checkForUpdateInformation([options])
	//	Checks for updates, but doesn't display an alert to the user if a newer version is available.
	//	Options:
	//		- onComplete (function) (Called when check is complete.)
	
	this.checkForUpdateInformation = function() {
		var options = arguments[0] || {};
		getAppcast({
			shouldDisplayAlertBox: false,
			onComplete: function() {
				if (options.onComplete) { options.onComplete(); }
			}
		});
	};
	
	// For Sparkle users
	
	this.getFeedURL = this.getAppcastURL;
	this.setFeedURL = this.setAppcastURL;
	
	this.getUpdateCheckInterval = this.getCheckInterval;
	this.setUpdateCheckInterval = this.setCheckInterval;
	
	this.setAutomaticallyChecksForUpdates = this.setShouldAutomaticallyCheckForUpdates;
	this.getAutomaticallyChecksForUpdates = this.getShouldAutomaticallyCheckForUpdates;
	
	
	/* ################################################################# */
	/* ######################### Initialisation ######################## */
	/* ################################################################# */
	
	
	// Process options
	
	if (options.appcastURL) {
		this.setAppcastURL(options.appcastURL);
	}
	
	if (options.checkInterval) {
		this.setCheckInterval(options.checkInterval);
	}
	
	if (typeof options.shouldAutomaticallyCheckForUpdates === "boolean") {
		this.setShouldAutomaticallyCheckForUpdates(options.shouldAutomaticallyCheckForUpdates);
	}
	
	if (typeof options.shouldDisplayAlertBox === "boolean") {
		this.setShouldDisplayAlertBox(options.shouldDisplayAlertBox);
	}
	
	if (options.useSparkleNamespace === true) {
		namespaceURL = sparkleNamespaceURL;
	}
	
	// Get data from Info.plist
	
	var Info = new InfoLoader();
	
	Info.setOnLoad(function() {
		
		if (!appcastURL) {
			var url = Info.getValueForKey("DUAppcastURL");
			if (url) {
				_this.setAppcast(url);
			}
		}
		
		widgetName = Info.getValueForKey("CFBundleName");
		widgetDisplayName = Info.getValueForKey("CFBundleDisplayName") || widgetName;
		
		currentVersion.version = Info.getValueForKey("CFBundleVersion");
		currentVersion.shortVersionString = Info.getValueForKey("CFBundleShortVersionString");
		
	});
	
	// Determine OS version
	
	new Command("/usr/bin/sw_vers -productVersion", {
		onSuccess: function(output) {
			systemVersion = output;
		}
	});
	
	// Create the alert box HTML
	
	createAlertBox();
	
	// Start the checker
	
	checker = new Periodical(function() { _this.checkForUpdatesInBackground(); }, checkInterval);
	
	
	/* ##################################################################### */
	/* ######################### Automatic Checking ######################## */
	/* ##################################################################### */
	
	
	this.onHide = function() {
		checker.pause();
	};
	
	this.onShow = function() {
		checker.start();
	};
	
	
	/* ##################################################################### */
	/* ######################### Appcast Processing ######################## */
	/* ##################################################################### */
	
	
	function getAppcast()
	{
		var options = arguments[0] || {};
		
		if (options.onStart) {
			options.onStart();
		}
		
		// Stop the checker - we're checking now
		checker.stop();
		
		var url = appcastURL + "?" + Math.random();
		var request = new HttpRequest(url, {
			onSuccess: function(responseText) {
				var responseXML = request.responseXML;
				if (responseXML) {
					parseAppcast(responseXML, options);
				}
				else {
					log("getAppcast(): Couldn't get 'responseXML' of XMLHttpRequest.");
				}
			},
			onError: function() {
				log("getAppcast(): Couldn't retrieve appcast: " + appcastURL + ". Status code: " + request.status);
			}
		});
	}
	
	function parseAppcast(responseXML)
	{
		var options = arguments[1] || {};
		
		var enclosures = responseXML.getElementsByTagName("enclosure") || [];
		
		for (var i = 0, l = enclosures.length; i < l; i++)
		{
			var enclosure = enclosures[i];
			var url = enclosure.getAttribute("url");
			
			// If there is an attachment
			if (url)
			{
				// Check minimum system version
				
				var minimumSystemVersion = enclosure.getAttributeNS(namespaceURL, "minimumSystemVersion");
				
				if (minimumSystemVersion && !minimumSystemVersion > currentSystemVersion) {
					continue;
				}
				
				// Get version number
				
				var version = enclosure.getAttributeNS(namespaceURL, "version") || getVersionFromURL(url) || null;
				
				if (typeOf(version) === "string") {
					finishParsingAppcast(url, minimumSystemVersion, version, enclosure, options);
					return;
				}
				else {
					continue;
				}
			}
		}
		
		// If we get to here, we couldn't find anything
		
		log("parseAppcast(): Couldn't find any suitable items in appcast.");
	}
	
	function getVersionFromURL(url)
	{
		// Example of value of "url": "http://www.quintusquill.com/software/comics/Comics_1.2.wdgt.zip"
		
		// Example: "Comics_1.2.wdgt.zip"
		var archiveName = url.slice(url.lastIndexOf("/") + 1);
		
		// Check whether the archive is the format "WidgetName_VersionNumber"
		if (archiveName.match(/.*_\d*.*./))
		{
			// Check whether the archive extension is ".wdgt.zip" or just ".zip" (must be one of these)
			var extension = (archiveName.match(".wdgt.zip")) ? ".wdgt.zip" : ".zip";
			
			// Example: "1.2"
			var version = archiveName.slice(archiveName.lastIndexOf("_") + 1, archiveName.lastIndexOf(extension));
			return version;
		}
	}
	
	function finishParsingAppcast(url, minimumSystemVersion, version, enclosure)
	{
		var options = arguments[4] || {};
		
		var shortVersionString = enclosure.getAttributeNS(namespaceURL, "shortVersionString");
		var releaseNotesLink = (enclosure.parentNode.getElementsByTagNameNS(namespaceURL, "releaseNotesLink") || [])[0];
		
		// Update latestVersion
		
		latestVersion.version = version;
		latestVersion.shortVersionString = shortVersionString || null;
		
		latestVersion.releaseNotesURL = (releaseNotesLink) ? releaseNotesLink.firstChild.nodeValue : null;
		latestVersion.url = url;
		
		// Update lastCheck
		
		lastCheck = new Date();
		
		// Are we up to date?
		
		checkIsUpToDate(options);
	}
	
	function checkIsUpToDate()
	{
		var options = arguments[0] || {};
		
		if (latestVersion.version > currentVersion.version)
		{
			isUpToDate = false;
			
			if (shouldDisplayAlertBox && options.shouldDisplayAlertBox !== false) {
				displayAlertBox();
			}
			else {
				checker.start();
			}
		}
		else
		{
			isUpToDate = true;
			
			// Start the checker again
			checker.start();
		}
		
		if (options.onComplete) {
			options.onComplete();
		}
	}
	
	function downloadUpdate()
	{
		// Open the URL in Safari (because Safari unzips and installs downloaded widgets)
		new Command('open -b "com.apple.Safari" "' + latestVersion.url + '"', {
			onSuccess: function() {
				// If we succeeded, hide the Dashboard
				widget.openURL("");
			},
			onError: function() {
				// If we didn't succeed, open the URL in the user's default browser
				widget.openURL(thisClass.latestVersion.url);
			}
		});
	}
	
	
	/* ################################################################# */
	/* ######################### Alert Box Code ######################## */
	/* ################################################################# */
	
	
	function displayAlertBox()
	{
		if (!alertBoxHTML.container) {
			createAlertBox();
		}
		
		updateAlertBoxValues();
		
		fade(alertBoxHTML.container, "in");
	}
	
	function hideAlertBox()
	{
		fade(alertBoxHTML.container, "out", {
			onComplete: function() {
				clearAlertBoxValues();
				// Start the checker again
				checker.start();
			}
		});	
	}
	
	function createAlertBox()
	{
		/* Create the HTML */
			
			var alertBox = document.createElement("div");
			alertBox.id = "dazzle-alertBox";
				
				var alertBoxBG = document.createElement("div");
				alertBoxBG.id = "dazzle-alertBox-background";
				/*	alertBoxBG.innerHTML inserted further down	*/
				alertBox.appendChild(alertBoxBG);
				
				var alertText = document.createElement("p");
				alertText.id = "dazzle-alertBox-alertText";
				alertBox.appendChild(alertText);
				
				var releaseNotesText = document.createElement("p");
				releaseNotesText.id = "dazzle-alertBox-releaseNotesText";
				alertBox.appendChild(releaseNotesText);
					
					var releaseNotesLink = document.createElement("a");
					releaseNotesLink.innerHTML = "Open Release Notes in Browser";
					releaseNotesText.appendChild(releaseNotesLink);
					
				var buttons = document.createElement("div");
				buttons.id = "dazzle-alertBox-buttons";
				alertBox.appendChild(buttons);
					
					var laterButton = document.createElement("div");
					laterButton.id = "dazzle-alertBox-laterButton";
					buttons.appendChild(laterButton);
					
					var downloadButton = document.createElement("div");
					downloadButton.id = "dazzle-alertBox-downloadButton";
					buttons.appendChild(downloadButton);
					
			// Save the elements to be accessed later
			alertBoxHTML.container = alertBox;
			alertBoxHTML.alertText = alertText;
			alertBoxHTML.releaseNotesText = releaseNotesText;
			alertBoxHTML.releaseNotesLink = releaseNotesLink;
			
		/* Set up the buttons */
			
			// "Download" Button
			alertBoxHTML.downloadButton = new AppleGlassButton(downloadButton, "Download", function() {
				downloadUpdate();
				hideAlertBox();
			});
			
			// "Later" Button
			alertBoxHTML.laterButton = new AppleGlassButton(laterButton, "Later", function() {
				hideAlertBox();
			});
			
		/* Alert Box Background */
			
			alertBoxBG.innerHTML = '<div id="dazzle-alertBox-topLeft"></div><div id="dazzle-alertBox-topCentre"></div><div id="dazzle-alertBox-topRight"></div><div id="dazzle-alertBox-middleLeft"></div><div id="dazzle-alertBox-middleCentre"></div><div id="dazzle-alertBox-middleRight"></div><div id="dazzle-alertBox-bottomLeft"></div><div id="dazzle-alertBox-bottomCentre"></div><div id="dazzle-alertBox-bottomRight"></div>';
			
		/* Insert the HTML into the Document */		
			
			var front = document.getElementById("front");
			
			if (front) {
				front.appendChild(alertBox);
			}
			else {
				document.body.appendChild(alertBox);
			}
	}
	
	function updateAlertBoxValues()
	{
		var latestVersionString = latestVersion.shortVersionString || latestVersion.version;
		var currentVersionString = currentVersion.shortVersionString || currentVersion.version;
		
		// Update the Alert Text
		alertBoxHTML.alertText.innerHTML = widgetName + " " + latestVersionString + " is available (you have " + currentVersionString + "). Would you like to download the new version?";
		
		// If we have a release notes URL (and releaseNotesURL looks like a URL), show the release notes link
		if (latestVersion.releaseNotesURL && new RegExp("http://").test(latestVersion.releaseNotesURL))
		{
			// Display the release notes link and adjust the height of the alert box so that it fits in
			alertBoxHTML.releaseNotesText.style.display = "block";
			alertBoxHTML.container.style.height = alertBoxHeightWithReleaseNotesLink;
			
			// Update the link
			alertBoxHTML.releaseNotesLink.onclick = function() {
				widget.openURL(latestVersion.releaseNotesURL);
			};
		}
		else
		{
			// Hide the release notes link and reset the height of the alert box
			alertBoxHTML.releaseNotesText.style.display = "none";
			alertBoxHTML.container.style.height = alertBoxHeight;
		}
	}
	
	function clearAlertBoxValues()
	{
		alertBoxHTML.alertText.innerHTML = "";
		alertBoxHTML.releaseNotesLink.onclick = function() {};
	}
	
	
	/* ############################################################################# */
	/* ######################### Included Functions/Classes ######################## */
	/* #################### (separate from Dazzle but used by it) ################## */
	/* ############################################################################# */
	
	// Minified Functions/Classes from "Utilites.js" ("getStyle" and "fade" modified so as not to tap into "Element.prototype")
	
	// log
	
	function log(message){if(console){console.log(message)}else{alert(message)}}
	
	// internalError
	
	function internalError(message){if(typeof DebugMode==="boolean"&&DebugMode===true){throw new Error(message);}else{log(message)}}
	
	// capitaliseFirstLetter
	
	function capitaliseFirstLetter(string){return string.charAt(0).toUpperCase()+string.slice(1)}
	
	// getStyle
	
	function getStyle(element){var property=arguments[1];if(property&&property==="display"){var style=document.defaultView.getComputedStyle(element,"");if(style["display"]){return style["display"]}else{return element.style["display"]}}else if(property){var shouldBeHidden=(element.style.display==="none");element.style.display="block";var style=document.defaultView.getComputedStyle(element,"");if(style){var value=style[property]}if(shouldBeHidden){element.style.display="none"}if(value){return value}else{return element.style[property]}}else{var shouldBeHidden=(element.style.display==="none");element.style.display="block";var style=document.defaultView.getComputedStyle(element,"");if(shouldBeHidden){element.style.display="none"}return style}};
	
	// fade
	
	function fade(element){var options=arguments[2];if(!options){if(arguments[1]&&typeof arguments[1]==="object"){options=arguments[1]}else{options={}}}var steps=options.steps||15;var duration=options.duration||280;var from=1;var to=0;if(arguments[1]=="in"){from=0;to=1}var changeDisplay=(options.changeDisplay===false)?false:true;var elementStyle=element.style;var elementOpacity=getStyle(element, "opacity");if(elementOpacity>0&&elementOpacity<1){return}else if(to==1&&elementOpacity==1){return}else if(to==0&&elementOpacity==0){return}var animator=new AppleAnimator(duration,steps,from,to,function(a,c,s,f){elementStyle.opacity=c});if(changeDisplay&&from===0&&getStyle(element, "display")!=="block"){elementStyle.opacity=0;elementStyle.display="block"}animator.oncomplete=function(){if(changeDisplay&&from==1){elementStyle.display="none"}if(options.onComplete){options.onComplete()}};animator.start()};
	
	// Command
	
	function Command(commandString){if(!window.widget){return}var options=arguments[1]||{};if(options.largeOutput===true){var tmpFolder=TemporaryDirectory+BundleIdentifier+"/"+widget.identifier+"/";var tmpFile=tmpFolder+(new Date().getTime())+"-"+generateRandomNumber(100,999)+".txt";var command=new Command("/bin/mkdir -p "+tmpFolder+"; "+commandString+" > "+tmpFile,{onSuccess:function(c){readFile("file://"+tmpFile,{onSuccess:function(outputString){if(options.onSuccess){options.onSuccess(outputString)}},onError:function(){if(options.onError){options.onError()}}})},onError:function(){if(options.onError){options.onError()}}})}else{var command=widget.system(commandString,function(c){var outputString=c.outputString;if(outputString){outputString=outputString.replace(/\n$/,"")}if(c.status===0){if(options.onSuccess){options.onSuccess(outputString)}}else{if(options.onError){options.onError()}}});return command}this.toString=function(){return"[object Command]"}}
	
	// HttpRequest
	
	function HttpRequest(url){if(typeof url!=="string"||!url.match(new RegExp("http://|file://"))){internalError("HttpRequest(): Error: 'url' ["+url+"] is not a valid URL.");return}var options=arguments[1]||{};var onSuccess=options.onSuccess||function(){};var onError=options.onError||function(){};var method=options.method||"GET";var asynchronous=options.asynchronous||true;var request=new XMLHttpRequest();request.onreadystatechange=function(){if(new Date().getTime()>request.timeoutDate){request.abort();if(typeof DebugMode==="boolean"&&DebugMode===true){log("HttpRequest(): Error: Couldn't retrieve URL ["+url+"]. Timed out (request took longer than 60 seconds).")}onError();return}if(request.readyState===4){if(request.status===200||request.status===0){onSuccess(request.responseText)}else if(!request.status&&request.getAllResponseHeaders()){onSuccess(request.responseText)}else{if(typeof DebugMode==="boolean"&&DebugMode===true){log("HttpRequest(): Error: Couldn't retrieve URL ["+url+"]. Status code: "+request.status+"; responseText: "+request.responseText+"; response headers: "+request.getAllResponseHeaders())}onError();return}}};if(options.followRedirects===false&&window.widget){var command=new Command("/usr/bin/curl '"+url+"'",{onSuccess:function(outputString){clearTimeout(timeout);if(outputString&&outputString.length>0){onSuccess(outputString)}},onError:onError});var timeout=setTimeout(function(){command.cancel();if(typeof DebugMode==="boolean"&&DebugMode===true){log("HttpRequest(): Error: Couldn't retrieve URL ["+url+"]. Timed out (request took longer than 60 seconds).")}onError()},(1000*60))}else{request.timeoutDate=new Date().getTime()+(1000*60);request.open(method,url,asynchronous);request.overrideMimeType("text/xml");request.send("")}return request}
	
	// Periodical
	
	function Periodical(callback,interval){var timeout=null;var nextCheck=null;function update(){if(nextCheck&&nextCheck<=new Date().getTime()){clearTimeout(timeout);timeout=setTimeout(update,interval);nextCheck=new Date().getTime()+interval;callback()}else if(nextCheck){var timeUntilNextCheck=nextCheck-new Date().getTime();clearTimeout(timeout);timeout=setTimeout(update,timeUntilNextCheck)}else{clearTimeout(timeout);timeout=setTimeout(update,interval);nextCheck=new Date().getTime()+interval}}this.start=function(){update()};this.stop=function(){clearTimeout(timeout);nextCheck=null};this.pause=function(){clearTimeout(timeout)};this.setInterval=function(newInterval){interval=newInterval;this.stop();this.start()};this.start()}
	
	// typeOf
	
	function typeOf(data){if(data){if(typeof data==="object"){if(data.getTime){if(parseInt(data.getTime())){return"date"}else{return"null"}}else if(data.constructor.toString().match(/Array/)){return"array"}else{return"object"}}else if(typeof data==="function"){if(data.compile){return"RegExp"}else{return"function"}}else if(typeof data==="string"){if(data.length>0){return"string"}else{return"null"}}else if(typeof data==="number"){if(parseInt(data)){return"number"}else{return"null"}}else if(typeof data==="boolean"){return"boolean"}}else{if(typeof data==="undefined"){return"undefined"}else if(data===null){return"null"}}}
	
	// InfoLoader
	
	function InfoLoader(){var isLoaded=false;var onload=function(){};function loaded(){isLoaded=true;onload()}this.setOnLoad=function(functionReference){if(isLoaded){functionReference()}else{onload=functionReference}};var output=null;var keys={};new Command("/usr/bin/defaults read '"+window.location.pathname.replace(/[^/]*$/,"Info")+"'",{onSuccess:function(outputString){output=outputString;loaded()},onError:function(){loaded()}});this.getValueForKey=function(key){if(typeOf(keys[key])==="string"){return keys[key]}else if(output){var keyValuePairMatch=output.match(new RegExp(key+" = .*;"));if(keyValuePairMatch){var value=keyValuePairMatch[0];value=value.replace(/\"/g,"");value=value.replace(new RegExp(key+" = "),"");value=value.replace(/;/,"");keys[key]=value;return value}}}}
	
}
