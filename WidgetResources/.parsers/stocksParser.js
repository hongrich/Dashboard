/*
Copyright ＿ 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

// Request parameters
var gAppver = "1.1";
var gDevtype = "Apple_OSX";
var gDeployver = "APPLE_DASHBOARD_1_0";
var gApp = "YGoAppleStocksWidget";
var gAppVer = "unknown";
var gAPIver = "1.0.1";
var gAPI = "finance";

var MIN_DAY_CHART_GAP_SECONDS = 3600; //Required number of seconds missing in chart data to start new line

var kNoIntradayChartError = "FeedError_NoIntraDayChart";
var kMissingTagError = "FeedError_MissingTag"

function constructError(string, error) {
	error = error ? error : true;
	return {error: error, errorString:string};
}

// returns an anonymous object like so
// object
//		error: 	Boolean false for success
//		errorString: failure string
//		quotes: array[n] of anonymous objects like so
//			object
//				symbol:		stock symbol
//				lasttrade:	last trade for symbol
//				change:		delta change for symbol
//				pctchange:	percent change for symbol
//				open:		true if market is open, closed if not

function fetchStockData(callback, symbols) {
	var uid = getUID();
	var symbolList = "";
	for (var i = 0; i  < symbols.length; i ++) {
		var symbol = symbols[i];
		symbolList += "<symbol>" + symbol + "</symbol>";
	}
	
	var url = "http://wu-quotes.apple.com/dgw?imei=" + uid + "&apptype=finance";
	var body = "<?xml version='1.0' encoding='utf−8'?><request devtype='" + gDevtype + "' deployver='" + gDeployver + "' app='" + gApp + "' appver='" + gAppVer + "' api='" + gAPI + "' apiver='" + gAPIver + "' acknotification='0000'><query id='0' timestamp='"
		+ new Date().getTime() + "' type='getquotes'><list>"
		+ symbolList + "</list></query></request>";
	
	var req = new XMLHttpRequest();
	req.onload = function(evt) {stockDataFetched(evt, req, callback);}
	req.overrideMimeType("text/xml");
	req.open("POST", url);
	req.setRequestHeader("Content-type", "text/xml");
	req.setRequestHeader("X-Client-ID", "IMSI=" + uid);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(body);
}

function stockDataFetched(evt, req, callback) {
	var doc;
	try {
		doc = req.responseXML;
		var obj = {error:false, errorString:null, quotes:[], open:true};
		var quoteEls = doc.getElementsByTagName("quote");
		
		for (var i = 0; i < quoteEls.length; i++) {
			var quoteEl = quoteEls[i];
			
			var symbol = getTextContentOfFirstChildByTagName(quoteEl, "symbol");
			if (!symbol) throw "missing <symbol>";
			
			var lastTrade = getTextContentOfFirstChildByTagName(quoteEl, "price");
			if (!lastTrade) throw "missing <price>";

			var change = getTextContentOfFirstChildByTagName(quoteEl, "change");
			if (!change) throw "missing <change>";

			var pctChange = getTextContentOfFirstChildByTagName(quoteEl, "changepercent");
			if (!pctChange) throw "missing <changepercent>";

			var link = getTextContentOfFirstChildByTagName(quoteEl, "link");

			var marketStatus = getTextContentOfFirstChildByTagName(quoteEl, "status");
			marketStatus = (marketStatus == "0") ? false : true;
			if (!marketStatus) {
				obj.open = false;
			}
			
			obj.quotes[obj.quotes.length] = {symbol:symbol, lasttrade:lastTrade,
				change:change, pctchange:pctChange, link:link, open:marketStatus};
		}
		callback(obj);
	} catch (e) {
		callback(constructError("error parsing location validation xml response: " + e));
	} finally {
		doc = req = null;
	}	
}

// returns an anonymous object like so
// object
//		error: 	Boolean false for success
//		errorString: failure string
//		symbols: array[n] of anonymous objects like so
//			object
//				symbol:		stock symbol
//				name:		company name for symbol
// 				exchange:	the exchange for symbol

function validateSymbol(callback, symbol) {
	var uid = getUID();
	var url = "http://wu-stocks.apple.com/dgw?imei=" + uid + "&apptype=finance";
	
	var body = "<?xml version='1.0' encoding='utf−8'?><request devtype='" + gDevtype + "' deployver='" + gDeployver+ "' app='" + gApp + "' appver='" + gAppVer + "' api='" + gAPI + "' apiver='" + gAPIver + "' acknotification='0000'><query id='0' timestamp='"
		+ new Date().getTime() + "0' type='getsymbol'><phrase>"
		+ symbol + "</phrase><count>20</count><offset>0</offset></query></request>";
	
	var req = new XMLHttpRequest();
	req.onload = function(evt) {symbolValidationFetched(evt, req, callback);}
	req.overrideMimeType("text/xml");
	req.open("POST", url);
	req.setRequestHeader("Content-type", "text/xml");
	req.setRequestHeader("X-Client-ID", "IMSI=" + uid);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(body);
	
	return req;
}

function symbolValidationFetched(evt, req, callback) {
	
	var doc;
	try {
		doc = req.responseXML;
		var obj = {error:false, errorString:null, symbols:[], open:true};
		var quoteEls = doc.getElementsByTagName("quote");
		//if (CityList.getAttribute('extra_cities') == '1') obj.refine = true;

		for (var i = 0; i < quoteEls.length; i++) {
			var quoteEl  = quoteEls[i];
			var name 	 = getTextContentOfFirstChildByTagName(quoteEl, "name");
			var symbol 	 = getTextContentOfFirstChildByTagName(quoteEl, "symbol");
			if (!symbol) throw "missing <symbol>";
			var exchange = getTextContentOfFirstChildByTagName(quoteEl, "exchange");
			var link 	 = getTextContentOfFirstChildByTagName(quoteEl, "link");

			obj.symbols.push({name:name, symbol:symbol, exchange:exchange, link:link});
		}
		callback(obj);
	} catch (e) {
		callback(constructError("error parsing location validation xml response : " + e));
	} finally {
		doc = req = null;
	}
}

function getTextContentOfFirstChildByTagName(el, tagName) {
	for (var child = el.firstChild; child != null; child = child.nextSibling) {
		if (child.nodeName == tagName) {
			var result = null;
			
			if(child.textContent)
				result = child.textContent;
			
			if (!result && child.firstChild) {
				result = child.firstChild.data;
			}
			return result;
		}
	}
	return null;
}

// returns an anonymous object like so
// object
//		error: 	Boolean false for success
//		errorString: failure string
//		data: array[n] of anonymous objects like so
//			object
//				date:		Date js object
//				close:		close price of stock
function fetchChartData(symbol, range, callback) {
	var uid = getUID();
	range  = ("1w" == range) ? "5d" : range;

	var url = "http://wu-charts.apple.com/dgw?imei=" + uid + "&apptype=finance";	
	var body = "<?xml version='1.0' encoding='utf−8'?><request devtype='" + gDevtype + "' deployver='" + gDeployver+ "' app='" + gApp + "' appver='" + gAppVer + "' api='" + gAPI + "' apiver='" + gAPIver + "' acknotification='0000'><query id='0' timestamp='"
		+ new Date().getTime() + "' type='getchart'><symbol>"
		+ symbol + "</symbol><range>" + range + "</range></query></request>";
	
	var req = new XMLHttpRequest();
	req.onload = function(evt) {chartDataFetched(evt, req, range, callback);}
	req.overrideMimeType("text/xml");
	req.open("POST", url);
	req.setRequestHeader("Content-type", "text/xml");
	req.setRequestHeader("X-Client-ID", "IMSI=" + uid);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(body);
	
	return req;
}

function chartDataFetched(evt, req, range, callback) {
	var doc;
	try {
		doc = req.responseXML;

		var obj = {error:false, errorString:null, data:[], meta: null, min: null, max: null, gaps: []};

		//Get info out of <meta> tag
		var metaEl = doc.getElementsByTagName("meta")[0];
		if (!metaEl) throw "missing <meta>";

		var symbol = getTextContentOfFirstChildByTagName(metaEl, "symbol");
		if (!symbol) throw "missing <symbol>";

		var marketopen = getTextContentOfFirstChildByTagName(metaEl, "marketopen");
		if (!marketopen) throw "missing <marketopen>";
		else if (marketopen == -1 && range =="1d") throw kNoIntradayChartError;
		else marketopen = new Date(marketopen * 1000);

		var marketclose = getTextContentOfFirstChildByTagName(metaEl, "marketclose");
		if (!marketclose) throw "missing <marketclose>";
		else if(marketclose == -1 && range =="1d") throw kNoIntradayChartError;
		else marketclose = new Date(marketclose * 1000);

		var gmtoffset = getTextContentOfFirstChildByTagName(metaEl, "gmtoffset");
		if (!gmtoffset) gmtoffset = null; //we dont get it for US markets
		else gmtoffset = gmtoffset/3600; //convert to hours
		
		obj.meta = {symbol: symbol, marketopen: marketopen, marketclose:marketclose, gmtoffset:gmtoffset};

		//pull out the data <point>'s
		var pointEls = doc.getElementsByTagName("point");
		if (!pointEls || !pointEls.length) throw "empty list from server";

		var	offset = pointEls[0].getAttribute("timestamp"); //offset times so they start at		
		var rangeIsOneWeekOrLess = ("5d" == range || "1d" == range);
		var lastTime;
		var temp = null

		for (var i = 0; i < pointEls.length; i++) {
			// 1w & 1d responses are waaaay to thorough. trim it down just a tish.
			//if (rangeIsOneWeekOrLess && i % 6 && i != pointEls.length-1) continue;

			var pointEl = pointEls[i];

			var timestamp = pointEl.getAttribute("timestamp");
			if (!timestamp) throw "missing timestamp attr";
			var date = new Date(parseInt(timestamp, 10)*1000);
			var timestep = timestamp; // - offset;
			
			var close = pointEl.getAttribute("close");
			if (!close) throw "missing close attr";
			
			var newDataPoint = {date:date, close:parseFloat(close, 10), timestep: parseInt(timestep)};
			obj.data.push(newDataPoint);

			//save time by determining min, max, and gaps in data now
			if(!obj.min || close < obj.min.close)
				obj.min = newDataPoint;
			if(!obj.max || close > obj.max.close)
				obj.max = newDataPoint;
			if(range == "1d") //check for gaps in 1 day chart
				if (timestep - lastTime > MIN_DAY_CHART_GAP_SECONDS && lastTime != 0)
				{
					obj.gaps.push(i);
				}
			
			temp = lastTime;
			lastTime = timestep;

		}
		callback(obj);
	} catch (e) {
		if(e != kNoIntradayChartError)
			e = kMissingTagError;
		callback(constructError("error parsing chart xml response: " + e, e));
	} finally {
		doc = req = null;
	}	
}

function getUID() {
	if (window.widget) {
		return widget.identifier;
	} else {
		return (Math.random() * new Date().getTime()).toString();
	}
}
