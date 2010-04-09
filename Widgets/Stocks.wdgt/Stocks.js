/*
Copyright ＿ 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

var allTheData = [{symbol:'^DJI', exchange:"", name:"DOW JONES INDUSTRIAL AVERAGE", lasttrade:0, change:0, pctchange:0},
				 {symbol:'^IXIC', exchange:"", name:"NASDAQ COMPOSITE", lasttrade:0, change:0, pctchange:0},
				 {symbol:'AAPL', exchange:"", name:"Apple Computer", lasttrade:0, change:0, pctchange:0},
				 {symbol:'EBAY', exchange:"", name:"eBay", lasttrade:0, change:0, pctchange:0},
				 {symbol:'GOOG', exchange:"", name:"Google Inc.", lasttrade:0, change:0, pctchange:0},
				 {symbol:'AMZN', exchange:"", name:"Amazon.com, Inc.", lasttrade:0, change:0, pctchange:0}
				];
var symbolData = new Array();
var editRolloverImg = null;
var showingCharts = true;
				  				  
var currentSelection = null;
var anythingChangedOnBackside = false;
var currentChartMode = '6m';
var isShowingFront = true;
var allMarketsOpen = true;
var timer = null;
var crossfadeTimer = null;
var removeButton = null;
var lastDownloadDate = null;
var XMLErrorOnLastDataRequest = false;

var kChartCanvasWidth = 144;
var kChartCanvasHeight = 48;
var kOffsetBtCanvasAndXAxes = 7;

var deleteKeyLock = false;
var gLastRemovedSymbol = {};
var selectedRow = null; //on the backside list
var lastSelectedRow = null;

var gChartObj = null;
var DAY_CHART_MAX_LABEL_ADJUST = .75;
var MIN_CHART_STEP_STANDARD = 2;
var MAX_PRICE_DELTA_FOR_FORCED_CENTS_DISPLAY = 2;
var MAX_GUARANTEED_CENTS_DISPLAY_PRICE = 100;
var WEEK_CHART_UNFINISHED_MINUTES = 20;
var gFinalPointEndPosition = 1.0;


function getLocalizedString (key)
{
	try {
		var ret = localizedStrings[key];
		if (ret === undefined)
			ret = key;
		return ret;
	} catch (ex) {}

	return key;
}

function getPrettySymbol (symbol)
{
    // Explicit overrides
    if (symbol == "^DJI")  return "DOW J";
    if (symbol == "^IXIC") return "NASDAQ";
    if (symbol == "^GSPC") return "S&P 500";

    return symbol;
}

function updateStatusText()
{
	var dateDiff = null;
	var startFade = false;
	stopDelayedTextCrossFade();
	
	if (lastDownloadDate != null)
	{
		// Update our "last updated" timer
		var curDate = new Date();
		dateDiff = curDate.getTime() - lastDownloadDate.getTime();
		dateDiff = Math.round(dateDiff / 1000); // to seconds
				
		if (allMarketsOpen)
		{
			document.getElementById('quoteUpdateDiv').innerText = getLocalizedString("Quotes delayed by 20 minutes");
		}
		else // markets closed
		{
			startFade = true;
			document.getElementById('quoteUpdateDiv').innerText = getLocalizedString("Quotes last updated at %@").replace("%@", lastDownloadDate.toLocaleTimeString("short"));
			document.getElementById('messageDiv').innerText = getLocalizedString("Markets closed");
		}
	}

	if(XMLErrorOnLastDataRequest && lastDownloadDate && dateDiff > 300) //dont show error if quotes < 5 min old
	{
		startFade = true;
		document.getElementById('quoteUpdateDiv').innerText = getLocalizedString("Quotes last updated at %@").replace("%@", lastDownloadDate.toLocaleTimeString("short"));
		document.getElementById('messageDiv').innerText = getLocalizedString("No response from server");
	}	

	if(startFade)
		startCrossFade(3000);
}

var gCrossFadingTextOK = false; 
function startCrossFade (delay) {
	if(!delay) delay = 0;
	
	gCrossFadingTextOK = true;
	crossfadeTimer = setTimeout(performCrossFade, delay);
}

function performCrossFade () {	

	var delayedDivOpacity = document.getElementById('quoteUpdateDiv').style.opacity; 
	var delayed1Showing = (!delayedDivOpacity || delayedDivOpacity == 1);

	if(gCrossFadingTextOK)
	{	
		document.getElementById('quoteUpdateDiv').style.opacity = delayed1Showing ? 0 : 1;
		document.getElementById('messageDiv').style.opacity = delayed1Showing ? 1 : 0;
		crossfadeTimer = setTimeout(crossfadeFinished, 2000);
	}
}

function crossfadeFinished () {
	if(gCrossFadingTextOK)
		crossfadeTimer = setTimeout(performCrossFade, 10000);
}

function stopDelayedTextCrossFade () {
	gCrossFadingTextOK = false;
	clearTimeout(crossfadeTimer);
	crossfadeTimer = null;
	document.getElementById('quoteUpdateDiv').style.opacity = 1;
	document.getElementById('messageDiv').style.opacity = 0;
}

function xml_callback(object)
{
	if (!object.error)
	{
		var c = object.quotes.length;
  		for (var i = 0; i < c; ++i)
  		{
  			try 
  			{
				var quote = object.quotes[i];				
				var showpercent = getShowPercent();
				symbolData[i] = quote;

				var change = formatAmount(quote.change);
				var pctchange = formatAmount(quote.pctchange);
				var lasttrade = formatAmount(quote.lasttrade);

				var change_div = document.getElementById(quote.symbol+"_change");
				var last_trade_span = document.getElementById(quote.symbol+"_lastTrade");
				var percent_div = document.getElementById(quote.symbol+"_percent");
				var background_icon = document.getElementById (quote.symbol+"_icon");
				
				if (change < 0 || pctchange < 0)
				{
					background_icon.style.backgroundImage = "url(Images/down.png)";
					change = change.substr(1);
					pctchange = pctchange.substr(1);
				}
				else
				{
					// percentages can comeback -0.00.  strip the negative in this case.
					if (pctchange[0] == "-")
						pctchange = pctchange.substr(1);
					background_icon.style.backgroundImage = "url(Images/up.png)";
				}
				
				//
				// [ouch] position dependent code (firstChild).  Not the best.
				//
				last_trade_span.innerText = lasttrade;
				change_div.innerText = change;
				percent_div.innerText = pctchange+"%";
				
				if (!showpercent)
				{
					change_div.style.fontSize = "13px";
					changeFontOfElement(change_div, 41);
				}
				else
				{
					percent_div.style.fontSize = "12px";
					changeFontOfElement(percent_div, 41);
				}
				
				// Store last downloaded time
				lastDownloadDate = new Date();
			
			} catch (ex)
			{
				// dont let one exception lose all the data
				alert(ex.name + ". " + ex.message);
				XMLErrorOnLastDataRequest = true;
			}
		}
		
		if (object.open != allMarketsOpen)
		{
			allMarketsOpen = object.open;
		}
	}
	else
	{
		XMLErrorOnLastDataRequest = true;
		alert ("Stocks Widget: XMLHttpRequest Failed (" + object.errorString + ")");
	}
	
	// Regardless of what happened above
	updateStatusText(); // "Quotes just updated" or "Last updated xx minutes ago"
}

var notDigitPeriodOrMinus_regex = /[^\d\.\-]/g;
function formatAmount (string) {
	
	//strip out extra characters (6076938)
	var formattedString = string.replace(notDigitPeriodOrMinus_regex, "");
	var periodIndex = formattedString.indexOf(".");

	// Some currencies don't show precision (6076945), but round the occasional errata with > 2 decimal places
	if(periodIndex != -1 && (formattedString.length - periodIndex > 3))
	{
		var roundedNum = (new Number(formattedString)).toFixed(2);
		if(roundedNum)
			formattedString = roundedNum.toString();
		else
			formattedString = formattedString.substring(0, periodIndex + 2);
	}

	return formattedString;
}

function createRow (object)
{
	var theSymbol = object.symbol;
	var showPercent = getShowPercent();
	var prettySymbol = getPrettySymbol(theSymbol);
				
	var row = document.createElement('tr');
	
	row.setAttribute ("class", "stockRow");
	row.setAttribute ("onclick", "clickonrow(event, this);");
	row.setAttribute ("ondblclick", "clickedOnSymbol(this.getAttribute('tag'), this.getAttribute('stock_exchange'));");
	row.setAttribute ("tag", theSymbol);
	row.setAttribute ("stock_exchange", object.exchange);
	
	var td = document.createElement ('td');
	td.setAttribute ("class", "symbol");
	var tdDiv = document.createElement('div');
	tdDiv.appendChild (document.createTextNode(prettySymbol));
	td.appendChild(tdDiv);
	row.appendChild (td);
	
	td = document.createElement('td');
	td.setAttribute ("class", "value");
	td.setAttribute ("id", theSymbol + "_lastTrade");
	row.appendChild (td);
	
	td = document.createElement('td');
	var div = document.createElement('div');
	div.setAttribute ("class", "updown");
	div.setAttribute ("id", theSymbol + "_icon");
	div.setAttribute ("onclick", "showAsPercentChanged(event);");
	
	var table = document.createElement('table');
	table.setAttribute ('class', 'inner-table');
	table.setAttribute ('cellspacing', '0');
	table.setAttribute ('cellpadding', '0');
	
	var tbody = document.createElement ('tbody');
	var tr = document.createElement ('tr');
	var innertd = document.createElement ('td');
	var innerdiv = document.createElement ('div');
	
	innerdiv.setAttribute ('class', showPercent ? 'change hidden' : 'change');
	innerdiv.setAttribute ('id', theSymbol + "_change");
	innertd.appendChild(innerdiv);
	
	innerdiv = document.createElement ('div');
	innerdiv.setAttribute ('class', showPercent ? 'change' : 'change hidden');
	innerdiv.setAttribute ('id', theSymbol + "_percent");
	innertd.appendChild(innerdiv);

	tr.appendChild (innertd);
	tbody.appendChild(tr);
	table.appendChild(tbody);
	div.appendChild (table);
	td.appendChild (div);
	row.appendChild (td);
		
	return row;
}

var showPercent = true;
var showPercentFetched = false;
function getShowPercent(forceFetch)
{
	if (forceFetch || !showPercentFetched)
	{
		if (window.widget)
		{
			var pref = null;
			// this is crashing TOT WebKit.  It should not but it is. turning off for now.
			var pref = widget.preferenceForKey("show-percent");
			
			if (pref != null && pref.length > 0)
				showPercent = true;
			else
				showPercent = false;
		}
		showPercentFetched = true;	
	}
	
	return showPercent;
}

function setShowPercent(show_percent)
{
	showPercent = show_percent;
	if (window.widget)
	{
		var pref = show_percent ? "true" : "";
		widget.setPreferenceForKey(pref, "show-percent");
	}
}

function showBackside(event) {
	var front = document.getElementById("front");
	var back = document.getElementById("back");

	resizedWhenFlippedOver = false;
	if (window.widget)
	{
		if (calculateWidgetHeight() < 277)
		{
			window.resizeTo (213, 277);
			resizedWhenFlippedOver = true;
		}
		widget.prepareForTransition("ToBack");
	}
	
	front.style.display="none";
	back.style.display="block";
	isShowingFront = false;
	
	if (window.widget)
		setTimeout ('widget.performTransition();', 0);
	
	anythingChangedOnBackside = false;
	
	if (timer != null)
	{
		clearInterval (timer);
		timer = null;
	}


	document.removeEventListener("keypress", keyPressed, true);
	selectAllInSymbolTextField();

	event.stopPropagation();
	event.preventDefault();
}


var resizedWhenFlippedOver = false;
function showFrontside ()
{
	var front = document.getElementById("front");
	var back = document.getElementById("back");
	
	if (window.widget)
		widget.prepareForTransition("ToFront");
	
	front.style.display="block";
	back.style.display="none";
	
	isShowingFront = true;
	
	if (window.widget)
		setTimeout ('widget.performTransition();', 0);
		
	if (anythingChangedOnBackside)
	{
		// fix up widget
		var lastSelected = null;
		
		if (currentSelection != null)
			lastSelected = currentSelection.getAttribute("tag");
			
		setupMainTable (false);
		
		if (lastSelected != null)
		{
			var c = allTheData.length;
			var found = false;
			for (var i = 0; i < c; ++i)
			{
				if (allTheData[i].symbol == lastSelected)
				{
					found = true;
					break;
				}
			}
			
			if (!found)
			{
				// the item we have selected is gone. select the first one
				clickonrowimp (document.getElementById('stocksHeader').firstChild.firstChild);
			}
			else
			{
				moveSelectionToTag (lastSelected);
			}
		}
		
		if (window.widget)
		{
			resizedWhenFlippedOver = true; // good chance it will need to be resized
			
			// save of the new prefs
			
			var pref = createAllDataJSString();
			setPreferenceForKey (pref, "symbols");
		}
	}
	
	onshow();

	if (resizedWhenFlippedOver)
	{
		window.resizeTo(213, calculateWidgetHeight());
		resizedWhenFlippedOver = false;
	}

	//dont remember last deleted stock, do remember last selected row
	gLastRemovedSymbol = {};
	lastSelectedRow = selectedRow;

	document.removeEventListener("keypress", backsideKeyPressed, true);
	document.removeEventListener("keyup", backsideKeyUp, true);	
	document.addEventListener("keypress", keyPressed, true);
}

function generateSymbolString (object)
{
		return object.symbol;
}

function generateSymbolStringFromStrings (symbol, exchange)
{
		return symbol;
}

function getStockData()
{
	var c = allTheData.length;

	if (c > 0)
	{
		var symbols = [];

		for (var i = 0; i < c; ++i)
		{
			symbols.push(generateSymbolString(allTheData[i]));
		}
	
		XMLErrorOnLastDataRequest = false;
		fetchStockData (xml_callback, symbols);
		
		//get chart if stock is selected, chart mode is day or week view, and markets are open
		if (currentSelection != null && (currentChartMode == '1d' || currentChartMode == '1w') && marketsAreKnownToBeOpen())
		{
			if (lastChartRequest != null)
				lastChartRequest.abort();
			var tag = currentSelection.getAttribute("tag");
			var exchange = currentSelection.getAttribute("stock_exchange");
			lastChartRequest = fetchChartData (generateSymbolStringFromStrings(tag, exchange), currentChartMode, chart_callback);
		}
	}
}

function marketsAreKnownToBeOpen() 
{
	//confirm allMarketsOpen was set today (there is a last download and the date is today's)
	var currentDate = new Date();
	return (lastDownloadDate == null) || (allMarketsOpen && lastDownloadDate.getDate() == currentDate.getDate());
}

function changeFontOfElement(element, width)
{
    var elementWidth = 99999;

    while (elementWidth > width) {

        var style = document.defaultView.getComputedStyle(element,'');
        		
		if (!style)
		{
			break;
		}
		
        var fontSize = parseInt(style.getPropertyValue("font-size"));

        elementWidth = parseInt(style.getPropertyValue("width"));
        if (elementWidth > width)
        {
    
			element.style.fontSize = (fontSize - 1) + "px";
		
			style = document.defaultView.getComputedStyle(element,'');
			elementWidth = parseInt(style.getPropertyValue("width"));
		}
		else
		{
			break;
		}
    }
}

var img = new Image();
img.src = "Images/selection-middle.png";
img.src = "Images/yahoo_hover.png";
img.src = "Images/yahoo_down.png";

function moveSelectionToTag (tag)
{
	var index;
	var offset=1;
	var c = allTheData.length;
	for (index=0; index < c; ++index)
	{
		if (allTheData[index].symbol == tag)
			break;
	}
	if (index == c) index = 0;
	
	switch (index)
	{
		case 0:
			selection.src = "Images/selection-first.png";
			offset = 0;
			break;
		case c - 1:
			selection.src = "Images/selection-last.png";
			break;
			
		default:
			selection.src = "Images/selection-middle.png";
			break;
	}
	
	// top is 7px;
	// had to add an offset. The top is at 7px, but the others needed
	// to go down by one pixel
	selection.style.top = (25*index+7+offset).toString() + "px";
	selection.style.display = "block";
}

function clickonrowimp (row)
{
	var selection = document.getElementById('selection');
			
	currentSelection = row;
	
	moveSelectionToTag (row.getAttribute("tag"));
		
	getChartForCurrentMode ();
}

function setupChartAnimation (hiding)
{
	var chartDiv = document.getElementById('chart');
	var timeNow = (new Date).getTime();
	var multiplier = (event.shiftKey ? 10 : 1); // enable slo-mo
	var startingSize = parseInt(chartDiv.clientHeight,10);

	resizeAnimation.element = chartDiv;
	if (resizeAnimation.timer != null) // it is moving... change to new size
	{
		clearInterval(resizeAnimation.timer);
		resizeAnimation.timer = null;
		resizeAnimation.duration -= (timeNow - resizeAnimation.startTime);
		resizeAnimation.positionFrom = resizeAnimation.positionNow;
	}
	else
	{
		resizeAnimation.duration = 250 * multiplier;
		resizeAnimation.positionFrom = startingSize;
	}
	
	if (window.widget && !hiding)
	{
		window.resizeTo (213, calculateWidgetHeight());
	}
	resizeAnimation.positionTo = hiding ? 0 : 80;
	resizeAnimation.startTime = timeNow - 13; // set it back one frame.
	resizeAnimation.onfinished = hiding ? animFinished : null;
	
	resizeAnimation.element.style.height = startingSize;
	resizeAnimation.timer = setInterval ("animate();", 13);
	animate();
}

function clickonrow (event, row)
{
	var oldSelection = currentSelection;
	
	if (currentSelection != null && row == currentSelection)
	{
		document.getElementById('selection').style.display = "none";
		currentSelection = null;
		if (window.widget)
			widget.setPreferenceForKey ("!!NONE!!", createKey("selection"));
	
		setupChartAnimation (true);
		showingCharts = false;
		if (lastChartRequest != null)
		{
			lastChartRequest.abort();
			lastChartRequest = null;
		}
	}
	else
	{
		clickonrowimp(row);
		
		if (window.widget && oldSelection != currentSelection)
		{
			//write out the selection
			widget.setPreferenceForKey (row.getAttribute("tag"), createKey("selection"));
		}
		
		if (oldSelection == null)
		{
			showingCharts = true;
			setupChartAnimation (false);
		}
	}
}

function updateChangeSpans ()
{
	var c = symbolData.length;
	var change_span;
	var size;
	var type;
	
	if (getShowPercent())
	{
		size = "12px";
		type = "_percent";
	}
	else
	{
		size = "13px";
		type = "_change";
	}
	
	for (var i = 0; i < c; ++i)
	{
		change_span = document.getElementById(symbolData[i].symbol+type);
		change_span.style.fontSize = size;
		changeFontOfElement(change_span, 41);
	}
}

function showAsPercentChanged (event)
{
	clickonchange(event);
	event.stopPropagation();
	event.preventDefault();
}

function updatePercentCheckbox (showPercent)
{
	var checkbox = document.getElementById('percentcheck');	
	checkbox.checked = showPercent;
}

function clickonchange (event)
{
	var showPercent = getShowPercent();

	var newVal = !showPercent;
	// set the preference
	setShowPercent (newVal);
	updateShowPercentUI(newVal);

	// stop proagation otherwise the clickonrow handler would be called
	event.stopPropagation();
}

function updateShowPercentUI (showPercent) {
	var c = symbolData.length;
	var i;
	var change;
	var percent;
	
	if (!showPercent) // show change
	{
		for (i = 0; i < c; ++i)
		{
			change = document.getElementById(symbolData[i].symbol+"_change");
			percent = document.getElementById(symbolData[i].symbol+"_percent");
			
			percent.setAttribute ('class', 'change hidden');
			change.setAttribute ('class', 'change');
			
		}
	}
	else // show percent
	{
		for (i = 0; i < c; ++i)
		{

			change = document.getElementById(symbolData[i].symbol+"_change");
			percent = document.getElementById(symbolData[i].symbol+"_percent");

			percent.setAttribute ('class', 'change');
			change.setAttribute ('class', 'change hidden');
		}
	}
	
	updateChangeSpans();
	updatePercentCheckbox(showPercent);
}

function clickedOnSymbol (symbol, exchange)
{
	if (window.widget)
	{
		var url = 'http://api.apple.go.yahoo.com/appledwf/q?s=' + symbol;

		for(index in symbolData)
			if(symbolData[index].symbol == symbol && symbolData[index].link != null)
				url = symbolData[index].link;

		widget.openURL(url);
	}
}

function setupFetchTimer ()
{
	timer = setInterval('getStockData();', 120000);

}

function onshow ()
{
	if (timer == null)
	{
		// reload we were just shown
		document.getElementById('quoteUpdateDiv').innerText = getLocalizedString('Retrieving Data…');
 		
		getStockData();
		timer = setInterval('getStockData();', 120000);
	}
	else
	{
		updateStatusText(); // at least update them on our status
	}
}

function onhide ()
{
	stopDelayedTextCrossFade();
	if (timer != null)
	{
		// we were hidden clear the timer.
		clearInterval(timer);
		timer = null;
	}
}

document.addEventListener("keypress", keyPressed, true);


function keyPressed(e) {
	
	var handled = true;
	var selection = currentSelection;
	
	if (selection != null)
	{
		switch (e.charCode)
		{
			case 63232: // up
				selection = selection.previousSibling;
				if (selection == null)
				{
					selection = document.getElementById('stocksHeader').firstChild.lastChild;
				}
				break;
				
			case 63233: // down
				selection = selection.nextSibling;
				if (selection == null)
				{
					selection = document.getElementById('stocksHeader').firstChild.firstChild;
				}
				break;
				
			default:
				handled = false;
				break;
		}
		
		if (handled)
		{
			clickonrow (e, selection);
			
			e.stopPropagation();
			e.preventDefault();
		}
	}
}

function setupMainTable(addSymbolsToBackside)
{
	var c = allTheData.length;
	var container = document.getElementById('tbody');
	removeAllChildren(container);		

	if (addSymbolsToBackside) {
		var innerList = document.getElementById('inner-list');
		innerList.innerHTML = "";
	}

	for (var i=0; i<c; ++i)
	{
		var data = allTheData[i];
		var row = createRow (data);
		container.appendChild (row);
		if (addSymbolsToBackside)
			addsymbol (getPrettySymbol(data.symbol), data.name);
	}
	
	//set the bottom of table to correct class
	if (c < 2) c = 2;
	document.getElementById('tableBottom').setAttribute ("class", (c%2) != 0 ? "tableBottomDark" : "tableBottomLight");
	
	// fill in the backgorund
	container = document.getElementById('tableContainer');
	removeAllChildren(container);		

	c = c - 2;
	var light = true;
	for (var i = 0; i < c; ++i)
	{
		var div = document.createElement ('div');
		div.setAttribute  ("class", light ? "tableRowLight" : "tableRowDark");
		container.appendChild (div);
		light = !light;
	}
}

function loadPreferences() {
	if (window.widget)
	{
		try {
			selectedSymbol = getPreferenceForKey("selection", false);
			var symbols = getPreferenceForKey ("symbols", true);
			var newAllData = new Array;

			currentChartMode = getPreferenceForKey("chartmode", false);
			if (currentChartMode == null) currentChartMode='6m';

			symbols = eval(symbols);
			if (!symbols || !symbols.length)
				return;

			if (symbols.length == 0)
			{
				allTheData = new Array; // nothing to see move along
			}
			else
			{
				for (var i = 0; i < symbols.length; ++i)
				{
					var data = symbols[i];
					
					//We no longer use default values of INDU/COMPX for US indices. Replace them.
					var stockSymbol = (data.symbol == "INDU") ? "^DJI" : data.symbol;
						stockSymbol = (data.symbol == "COMPX") ? "^IXIC" : stockSymbol;
					
					var exchange = data.exchange === undefined ? '' : data.exchange;
					newAllData[newAllData.length] = {symbol:stockSymbol, exchange:exchange, name:data.name, lasttrade:0, change:0, pctchange:0};
				}
				
				allTheData = newAllData;
			}
		
		} catch(ex)
		{
			alert(ex.name + ". " + ex.message);
		}
	}
}

function setupUI() {
	// add all of our stocks to the widget
	setupMainTable (true);
	setupChartController (currentChartMode);

	var header = document.getElementById('tbody');
	currentSelection = header.firstChild;
	if (selectedSymbol != null)
	{
		if (selectedSymbol == '!!NONE!!')
		{
			document.getElementById('selection').style.display = "none";
			currentSelection = null;
			showingCharts = false;
			document.getElementById('chart').style.height = "0";
		}
		else
		{
			for (var child = header.firstChild; child != null; child = child.nextSibling)
			{
				if (child.getAttribute("tag") == selectedSymbol)
				{
					// no need to do anything if the first item is the one selected.
					if (currentSelection != child)
					{
						clickonrowimp (child);
					}
					break;
				}
			}
		}
	}
	else
	{
		// try to select apple.
		for (var child = header.firstChild; child != null; child = child.nextSibling)
		{
			if (child.getAttribute("tag") == 'AAPL')
			{
				// no need to do anything if the first item is the one selected.
				if (currentSelection != child)
				{
					clickonrowimp (child);
				}
				break;
			}
		}
	}

	if (showingCharts)
	{
	 	getChartForCurrentMode();
	}
	
	if (getShowPercent())
	{
		var element = document.getElementById('percentcheck');	
		element.checked = true;
	}
	
	if (window.widget && (allTheData.length != 6 || !showingCharts))
	{
		window.resizeTo (213, calculateWidgetHeight());
	}
}

function setupWidget()
{
	var selectedSymbol = null;

	loadPreferences();
	setupUI();
		
	// backside strings
	document.getElementById('quoteslabel').innerText = getLocalizedString('Quotes:');
	document.getElementById('percenttext').innerHTML = getLocalizedString('Show change as a percentage');
	document.getElementById('tosLink').innerText = getLocalizedString('Terms of Service');
	
	// Info button
	new AppleInfoButton(document.getElementById('flip'), document.getElementById('front'),
						"white", "white", showBackside);
	
	
	// Remove button
	removeButton = new AppleGlassButton(document.getElementById('remove'), 
										getLocalizedString('Remove'), removeButtonClicked);
	removeButton.setEnabled(false);
	
	// Done button
	var doneButton = new AppleGlassButton(document.getElementById('done'),
										  getLocalizedString('Done'), showFrontside);
	doneButton.textElement.style.textAlign = "center";
	doneButton.textElement.style.width = "47px";
	
	onshow();
}

function onsync() {
	loadPreferences();
	setupUI();
	updateShowPercentUI(getShowPercent(true));
	onshow();
}

// add the onhide and onshow callbacks
if (window.widget)
{
	widget.onhide = onhide;
	widget.onshow = onshow;
	widget.onremove = onremove;
	widget.onsync = onsync;
}

//You can pass (null, null) to deselect any row
function clickonbackrow(event, row)
{
	if (allTheData.length > 1)
		removeButton.setEnabled(true);

	if (selectedRow != row)
	{
		if (selectedRow != null)
			selectedRow.setAttribute("class", "row");
		selectedRow = row;
		
		if(row) 
			row.setAttribute ("class", "row select");
	}	
	
	if (event)
	{
		event.stopPropagation();
		event.preventDefault();
	}
}

function backsideKeyPressed(event)
{
	var newSelection = null;
	switch (event.keyCode)
	{
		case 63232: // up
			if (selectedRow != null)
				newSelection = selectedRow.previousSibling;
			if (newSelection == null)
				newSelection = document.getElementById('inner-list').lastChild;
			clickonbackrow(null, newSelection);
			break;
			
		case 63233: // down
			if (selectedRow != null)
				newSelection = selectedRow.nextSibling;
			if (newSelection == null)
				newSelection = document.getElementById('inner-list').firstChild;
			clickonbackrow(null, newSelection);
			break;
		case 9: // tab
			lastSelectedRow = selectedRow; //remember selected row and focus on textfield
			selectAllInSymbolTextField();
			break;
		case 8: // delete
			if(!deleteKeyLock && allTheData.length > 1) //delete only once if delete is held down, dont delete last symbol
			{
				deleteKeyLock = true;
				removeButtonClicked();
			}
			break;
		case 122: //z key, check for undo
			if(event.metaKey)
				undoLastRemoval();
			break;
	}

	if (event)
	{
		event.stopPropagation();
		event.preventDefault();
	}
}

function backsideKeyUp(event)
{
	deleteKeyLock = false;
}

function symbolFocus(event)
{
	document.removeEventListener("keypress", backsideKeyPressed, true);
	document.removeEventListener("keyup", backsideKeyUp, true);
	clickonbackrow(null, null)
}

function symbolBlur(event)
{
	document.addEventListener("keypress", backsideKeyPressed, true);
	document.addEventListener("keyup", backsideKeyUp, true);
	//if you click where there is no symbol, deselect the current row
	document.getElementById('inner-list').addEventListener("click", function(){clickonbackrow(null, null)}, true);
}

var validateTimerData = null;
var lastValidEntry = null;
var addButtonClicked = false;

function symbolChanged (event)
{	
	var symbol = document.getElementById('symbolinput').value;
		
	if (symbol != null && symbol.length > 0 && addButtonClicked)
	{
		var request = validateSymbol (validateSymbolCallback, symbol);
		
		cancelValidateTimer();
		lastValidEntry = null;

		var validate = document.getElementById('validate');
		validate.innerText = getLocalizedString('Validating symbol');
		validate.style.display = "block";
		
		validateTimerData = {timer:setInterval('validateTimer();', 500), pos:0, request:request};
	}
}

function symbolTyping (event)
{
	// if we are typing in the input then we cannnot have just clicked the add button
	addButtonClicked = false;
	lastValidEntry = null;
}

function symbolKeyPress (event)
{
	switch (event.keyCode)
	{
		case 13: // return
		case 3:  // enter
			addButtonClicked = true;
			break;
		case 9: // tab
			//give "focus" to the list. highlight the last selected row
			var row = lastSelectedRow ? lastSelectedRow : document.getElementById('inner-list').firstChild;
			clickonbackrow(null, row);
			break;
	}
	
	if (addButtonClicked)
	{
		if (lastValidEntry != null)
			addOrSelectItem ();
		else
			symbolChanged();
	}
}

function cancelValidateTimer ()
{
	if (validateTimerData != null)
	{
		validateTimerData.request.abort();
		clearInterval(validateTimerData.timer);
		validateTimerData = null;
		document.getElementById('validate').style.display="none";
	}
}

function validateTimer ()
{
	var validate = document.getElementById('validate');
	
	// position goes 0 -> 3 and then resets
	validateTimerData.pos++;
	
	if (validateTimerData.pos > 3)
	{
		validateTimerData.pos = 0;
	}
	
	var text = getLocalizedString('Validating symbol');
	for (var i = 0; i < validateTimerData.pos; ++i)
		text+= '.';
	
	validate.innerText = text;
}

function validateSymbolCallback (object)
{
	var menu = null;
	var inputChanged = false;
	
	cancelValidateTimer();
	
	if (isShowingFront) return;
	
	if (window.widget)
		menu = widget.createMenu();

	if (object.error)
	{
		if (menu != null)
		{
			menu.addMenuItem (getLocalizedString("Failed to validate symbol"));
			menu.setMenuItemEnabledAtIndex (0, false);	
		}
		alert ('Validating symbol failed, error=' + object.errorString);
	}
	else if (object.symbols.length < 1)
	{
		if (menu != null)
		{
			menu.addMenuItem (getLocalizedString("No results found"));
			menu.setMenuItemEnabledAtIndex (0, false);	
		}
	}
	else
	{
		if (menu == null || object.symbols.length == 1) // there is only one, just put it in
		{
			menu = null;

			lastValidEntry = object.symbols[0];
			document.getElementById('symbolinput').value = lastValidEntry.symbol;
			inputChanged = true;
		}
		else
		{
			if (menu != null)
			{
				var c = object.symbols.length;
				var a = object.symbols;
				var maxLength = 0;
							
				var lastExchange = a[0].exchange;
				var lastIndex = 0;
				for (var i = 0; i < c; ++i)
				{
					var str = a[i].symbol;
					var name = a[i].name;
					var exchange = a[i].exchange;
					
					if (name != null || exchange != null)
					{
						str += " - "	;			
					
						if (name != null)
							str += name;
						
						if (exchange != null)
						{
							if (name != null)
								str += " (";
							str += exchange;
							if (name != null)
								str += ")";
						}
					}
					
					if (exchange != null && exchange != lastExchange)
					{
						menu.addSeparatorMenuItem();
						lastIndex++;
						lastExchange = exchange;
					}
					menu.addMenuItem (str);
					menu.setMenuItemTagAtIndex (lastIndex, i+1); // switch to one based
					lastIndex++;
				}
			}
		}
	}
	
	if (menu != null)
	{
		var selectedItem = menu.popup (15, 43);
		
		if (selectedItem >= 0)
		{
			var i = menu.getMenuItemTagAtIndex(selectedItem) - 1;
			lastValidEntry = object.symbols[i];
			document.getElementById('symbolinput').value = lastValidEntry.symbol;
			inputChanged = true;
		}	
	}
	
	if (addButtonClicked && inputChanged)
	{
		addOrSelectItem ();	
	}
	
	addButtonClicked = false;
}

function symbolAlreadyInSet(symbol)
{
	for (var i = 0; i < allTheData.length; ++i)
		if(allTheData[i].symbol == symbol)
			return i;

	return -1;
}

function addOrSelectItem ()
{
	var index = symbolAlreadyInSet(lastValidEntry.symbol)
	if (index < 0)
	{
		// make sure we have the correct number of items
		if (allTheData.length < 20)
		{
			var row = addsymbol (lastValidEntry.symbol, lastValidEntry.name);
		
			allTheData[allTheData.length] = {symbol: lastValidEntry.symbol, exchange:lastValidEntry.exchange, name:lastValidEntry.name, lasttrade:0, change:0, pctchange:0};
			anythingChangedOnBackside = true;
		}
	}
	else
	{
		// select the item that is already there.
		var row = document.getElementById('inner-list').firstChild;
		for (var i = 0; i < index; ++i)
			row = row.nextSibling;
			
		if (row != null) // just to be safe, should never happen
		{
			document.getElementById("symbolinput").blur();
			clickonbackrow (null, row);
		}
	}

	addButtonClicked = false;
}

function addbuttonclicked (event)
{
	addButtonClicked = true;
	if (lastValidEntry == null)
		symbolChanged();
	else
		addOrSelectItem();
}
var mouseDownInButton = false;
function addButtonMouseDown (event)
{
	var button = document.getElementById('addbutton');
	
	button.src = 'Images/addbuttondown.png';

	document.addEventListener("mousemove", addButtonMouseMove, true);
	document.addEventListener("mouseup", addButtonMouseUp, true);
	button.addEventListener("mouseover", addButtonMouseOver, true);
	button.addEventListener("mouseout", addButtonMouseOut, true);	
	
	mouseDownInButton = true;
	
	event.stopPropagation();
	event.preventDefault();
}

function addButtonMouseMove (event)
{
	event.stopPropagation();
	event.preventDefault();
}

function addButtonMouseOver (event)
{
	mouseDownInButton = true;
	document.getElementById('addbutton').src = 'Images/addbuttondown.png';
	event.stopPropagation();
	event.preventDefault();
}

function addButtonMouseOut (event)
{
	document.getElementById('addbutton').src = 'Images/addbutton.png';

	mouseDownInButton = false;

	event.stopPropagation();
	event.preventDefault();

}

function addButtonMouseUp (event)
{
	var button = document.getElementById('addbutton');

	document.removeEventListener("mousemove", addButtonMouseMove, true);
	document.removeEventListener("mouseup", addButtonMouseUp, true);	
	button.removeEventListener("mouseover", addButtonMouseOver, true);
	button.removeEventListener("mouseout", addButtonMouseOut, true);

	button.src = 'Images/addbutton.png';
	if (mouseDownInButton)
		addbuttonclicked(event);

	event.stopPropagation();
	event.preventDefault();
}

function findIndexOfChild (child)
{
	var node = child.parentNode;
	
	var i = 0;
	
	for (node = node.firstChild; node != null; node = node.nextSibling, ++i)
	{
		if (node == child)
			return i;
	}
	
	return -1;
}

function removeAllChildren (parent)
{
	while (parent.hasChildNodes())
		parent.removeChild(parent.firstChild);
}

function removeButtonClicked ()
{
	if (selectedRow != null)
	{
		var index = findIndexOfChild (selectedRow);
		var parentNode = selectedRow.parentNode;

		if(symbolData[index])
			gLastRemovedSymbol["symbolData"] = symbolData[index];

		gLastRemovedSymbol["allTheData"] = allTheData[index];
		gLastRemovedSymbol["index"] = index;
		gLastRemovedSymbol["rowElement"] = selectedRow;
		
		symbolData.splice (index, 1);
		allTheData.splice (index, 1);
		parentNode.removeChild(selectedRow);

		//selectedRow = null; --we dont do this anymore because it deallocates the DOM node, we want gLastRemovedSymbol to hold the node
		if (allTheData.length > 1)
		{
			if (index >= allTheData.length)
				index = allTheData.length-1;
			
			var nextSelection = parentNode.firstChild;
			for (var i=0; i<index;++i)
				nextSelection = nextSelection.nextSibling;
			
			if (nextSelection != null)
				clickonbackrow (null, nextSelection);
		}
		else
		{
			removeButton.setEnabled(false);
			selectAllInSymbolTextField();
		}
		anythingChangedOnBackside = true;
	}
}

function undoLastRemoval()
{
	if(gLastRemovedSymbol["index"] != null) //if the object isnt empty
	{
		allTheData.splice(gLastRemovedSymbol["index"], 0, gLastRemovedSymbol["allTheData"])
		
		if(gLastRemovedSymbol["symbolData"])
			symbolData.splice(gLastRemovedSymbol["index"], 0, gLastRemovedSymbol["symbolData"])

		var list = document.getElementById('inner-list');
		var insertedRow = list.insertBefore(gLastRemovedSymbol["rowElement"], list.childNodes[gLastRemovedSymbol["index"]])
		
		clickonbackrow (null, insertedRow);
		gLastRemovedSymbol = {};	
	}
}

function addsymbol (symbol, name)
{
	var innerList = document.getElementById('inner-list');
	
	var row = document.createElement('div');
	row.setAttribute("class", "row");
	row.setAttribute("onclick", "clickonbackrow(event, this);");
	
	var span = document.createElement('span');
	span.setAttribute ("class", "col1");
	span.innerText = symbol;
	row.appendChild(span);
	
	span = document.createElement('span');
	span.setAttribute ("class", "col2");
	span.innerText = name;
	row.appendChild(span);
	
	innerList.appendChild(row);
	
	selectAllInSymbolTextField();

	return row;
}

function selectAllInSymbolTextField() 
{
	var input = document.getElementById("symbolinput");
	input.blur();
	input.focus();
	input.select();
}

function calculateWidgetHeight() {
	var height = 34 + // table top
	             29 + // table bottom
	             35;  // footer
	
	if (showingCharts)
		height += 80;
		
	var c = allTheData.length - 2;
	
	if (c > 0)
		height += (c * 25); // 25 row height
	
	return height;
}

function onremove ()
{
	// remove all the pref pref keys here
	widget.setPreferenceForKey (null, createKey("symbols"));
	widget.setPreferenceForKey (null, createKey("selection"));
	widget.setPreferenceForKey (null, createKey("chartmode"));
}

function createKey (key)
{
	return widget.identifier + "-" + key
}

function setPreferenceForKey (pref, key)
{
	// set both the per widget pref and the global
	widget.setPreferenceForKey(pref, createKey(key));
	widget.setPreferenceForKey(pref, key);
}

function getPreferenceForKey (key, global)
{
	// first check to see if we have a per instance one
	var pref = widget.preferenceForKey(createKey(key));
	
	if (pref == null && global)
	{
		// now check the global one
		pref = widget.preferenceForKey(key);
	}
	
	return pref;
}

function createAllDataJSString ()
{
	var str = "["
	
	for (var i = 0; i < allTheData.length; ++i)
	{
		var data = allTheData[i];
		if (i != 0)
			str += ",";
		// make sure the name does not have any single quotes in it
		var name = data.name.replace(/\'/g, "\\'");
		str += "{symbol:'" + data.symbol + "',exchange:'" + data.exchange + "',name:'" + name + "'}";
	}
	
	str += "];";
	
	return str;
}


var resizeAnimation = {startTime:0, duration:250, positionFrom:0, positionTo:0, positionNow:0, timer:null, element:null, onfinished:null};


function limit_3 (a, b, c) {
    return a < b ? b : (a > c ? c : a);
}

function computeNextFloat (from, to, ease) {
    return from + (to - from) * ease;
}

function animate () {
	var T;
	var ease;
	var time  = (new Date).getTime();
	var yLoc;
	var frame;
		
	T = limit_3(time-resizeAnimation.startTime, 0, resizeAnimation.duration);
	ease = 0.5 - (0.5 * Math.cos(Math.PI * T / resizeAnimation.duration));

	if (T >= resizeAnimation.duration)
	{
		yLoc = resizeAnimation.positionTo;
		clearInterval (resizeAnimation.timer);
		resizeAnimation.timer = null;
		
		if (resizeAnimation.onfinished)
			setTimeout ("resizeAnimation.onfinished();", 0); // call after the last frame is drawn
	}
	else
		yLoc = computeNextFloat(resizeAnimation.positionFrom, resizeAnimation.positionTo, ease);
		
	// convert to a integer, not sure if this is the best way
	resizeAnimation.positionNow = parseInt(yLoc);
	resizeAnimation.element.style.height = resizeAnimation.positionNow + "px";
}

function animFinished()
{
	if (window.widget)
	{
		window.resizeTo (213, calculateWidgetHeight());	
	}
}

var currentChartSelect = null;
var lastChartRequest = null;
function dayclick(event, td, tag)
{
	if (td == currentChartSelect && td != null) return;
	
	if (currentChartSelect != null)
		currentChartSelect.setAttribute ("class", "");
	
	if (currentChartSelect != td)
	{
		td.setAttribute ("class", "selected");
		currentChartSelect = td;
	
		currentChartMode = tag;
		getChartForCurrentMode();
		
		if (window.widget)
			widget.setPreferenceForKey(tag, createKey("chartmode"));
	}
}

function getChartForCurrentMode ()
{
	if (lastChartRequest != null)
		lastChartRequest.abort();
	
	var tag = currentSelection.getAttribute("tag");
	var exchange = currentSelection.getAttribute("stock_exchange");
	lastChartRequest = fetchChartData (generateSymbolStringFromStrings(tag, exchange), currentChartMode, chart_callback);
	enableChart(false);
}

var horizonalLines = new Image();
horizonalLines.src = 'Images/stocks_chartgradient.png';

function addElementToVerticalAxes (vaxes, showPrecision, value)
{
	var div = document.createElement('div');
	if (showPrecision)
		div.innerText = value.toFixed(showPrecision).toString();
	else
		div.innerText = Math.round(value);

	//make new div first child
	if(vaxes.childNodes.length)
		vaxes.insertBefore(div, vaxes.firstChild)
	else
		vaxes.appendChild (div);
}

function addVerticalAxes (min, max)
{
    var numberOfLabels = 4;
    var axisDelta = (max - min) / numberOfLabels;
    var fractionDigits = (axisDelta < 0.02) ? 3 : 2; // Show extra detail for slow-changing symbols like exchange rates (<rdar://problem/5825413>)
    var showPrecision = (axisDelta < MAX_PRICE_DELTA_FOR_FORCED_CENTS_DISPLAY) ? fractionDigits : false; // || (max < MAX_GUARANTEED_CENTS_DISPLAY_PRICE)

	//clear old labels
	var vaxes = document.getElementById('vertical-axes');
	removeAllChildren (vaxes);

    var priceRange = (max - min);
    var prevLabelValue = 0, labelValue;
    var labelIndex;
    for (labelIndex = 0; labelIndex < numberOfLabels; labelIndex++) {
        // Calculate stock value for this axis label
        labelValue = min + (priceRange * (labelIndex / (numberOfLabels - 1)));
		addElementToVerticalAxes(vaxes, showPrecision, labelValue)
    }
}

function drawLineWithPoints(points, min, max)
{	
	var pointCount = points.length;

	// setup the axes and grid
	addVerticalAxes (min, max);
	setupHorizontalAxes (currentChartMode);	
	
	//get the context
	var context = document.getElementById('chart-canvas').getContext('2d');
	// context.clearRect(0, 0, kChartCanvasWidth, kChartCanvasHeight);

	if (pointCount < 2) // just draw the background
		context.drawImage (horizonalLines, 0, 0);
	else
	{
		//draw line for clipping
		context.beginPath();
		context.save();

		context.moveTo(points[0].x, kChartCanvasHeight);
		context.lineTo(points[0].x, kChartCanvasHeight-points[0].y*kChartCanvasHeight);
		var val;
		for (var i = 0; i < pointCount; ++i)
		{
			val = points[i];
			//y is unit coordinate off bottom, but canvas coords start in top left. 
			//so we multiply by the chart height and subtract from full height
			context.lineTo (val.x,kChartCanvasHeight-val.y*kChartCanvasHeight);
		}
		//finish line and clip image
		context.lineTo (val.x, kChartCanvasHeight);
		context.clip();
		context.drawImage (horizonalLines, 0, 0);
		context.restore();

		// then render line
		context.beginPath();
		context.lineWidth = 2.0;
		context.strokeStyle = "rgb(255, 255, 255)";

		context.moveTo(points[0].x, kChartCanvasHeight-points[0].y*kChartCanvasHeight);
		for (var i = 0; i < pointCount; ++i)
		{
			val = points[i];
			context.lineTo (val.x,kChartCanvasHeight-val.y*kChartCanvasHeight);
		}
		context.stroke();
	}
}

function chart_callback (obj)
{
	var points = [];
	var values = [];

	if (!obj.error)
	{
		try	
		{
			enableChart(false); //clear the canvas
			
			var data = obj.data;
			gChartObj = obj;
			var c = data.length;

			if (obj.data.length > 0)
			{
				enableChart(true);			
				var dataCount = 0
			
				//set up variables for determining x, y
				var min = obj.min;
				var max = obj.max;
				var marketopen = obj.meta.marketopen;
				var marketclose = obj.meta.marketclose;
				var firstTime = data[0].timestep;
				var lastTime = data[data.length-1].timestep;
				var minutesFromLastPointToClose = ((marketclose.getTime()/1000 % (3600 * 24)) - (lastTime % (3600 * 24))) / 60;
			    var isCurrencyChart = (minutesFromLastPointToClose < 0); // 24-hour symbols like currency exchange rates.
			    var isDayChart = (currentChartMode == "1d" && !isCurrencyChart);
				var graphWidth = document.getElementById('chart-canvas').clientWidth;
			
				var startX = 0;
				var minuteWidth = 1;

			    if (isDayChart) {
			        var closeHourFrac = marketclose.getMinutes() / 60.0;
					var openHourFrac = marketopen.getMinutes() / 60.0;
			        var closeHour = marketclose.getHours() + (closeHourFrac > 0 ? Math.max(closeHourFrac, (1 - DAY_CHART_MAX_LABEL_ADJUST)) : 0);
			        var openHour = marketopen.getHours() + Math.min(openHourFrac, DAY_CHART_MAX_LABEL_ADJUST);
			        minuteWidth = graphWidth / ((closeHour - openHour) * 60.0);
			        var minutesFromMarketOpenToFirstValue = Math.max(0.0, (firstTime - (marketopen.getTime() / 1000)) / 60.0);
			        var minutesFromStartHourToFirstValue = (openHourFrac - Math.min(openHourFrac, DAY_CHART_MAX_LABEL_ADJUST)) * 60.0 + minutesFromMarketOpenToFirstValue;
			        startX = minutesFromStartHourToFirstValue * minuteWidth;
			    }

				//if 1w chart and trading day isn't over, find where graph should stop
			    gFinalPointEndPosition = 1.0;				
			    if (currentChartMode == "1w") {
			        if (minutesFromLastPointToClose > WEEK_CHART_UNFINISHED_MINUTES) {
			            var closeMinute = obj.meta.marketclose.getHours() * 60.0 + obj.meta.marketclose.getMinutes();
			            var openMinute = obj.meta.marketopen.getHours() * 60.0 + obj.meta.marketopen.getMinutes();
			            gFinalPointEndPosition -= (minutesFromLastPointToClose / (closeMinute - openMinute)) / 5; //5 = number of days
			        }
					// gFinalPointEndPosition used here for stopping the line. Used in setup1mHorizontalAxes to align axes
			        obj.gaps.push(gFinalPointEndPosition);
			    }

			    // Normalize the step to the number of datapoints available.  If there are plenty, step by the minimum step and interpolate at each.
			    var naturalChartStep = (graphWidth - startX - (isCurrencyChart ? 0.0 : minutesFromLastPointToClose * minuteWidth)) / (data.length - 1);
			
			    // Slightly incorrect graphs can occur if the interpolation functions are used when we intend to draw each datapoint.
			    var useEveryPoint = (naturalChartStep >= MIN_CHART_STEP_STANDARD);

			    // Hints about the position of day boundaries for week charts.  This is necessary to ensure perfect alignment even if each day has varying amounts of data.
			    var hintCount = obj.gaps.length; 
			    var sectionIndex = -1;
			    var sectionStart, sectionEnd, nominalSectionSize = 1.0 / hintCount;
			    var currentSectionSize = nominalSectionSize;
			    var stopPosition = 1.0, stopTime = lastTime + 1.0;
			    var weekAlignmentHints = (hintCount > 0 && currentChartMode == "1w");
			    if (weekAlignmentHints)
			        stopPosition = obj.gaps[obj.gaps.length-1];    // The last hint gives the end position for the graph, to handle week data ending with an unfinished day.

			    var stepX = useEveryPoint ? naturalChartStep : MIN_CHART_STEP_STANDARD;

			    var x = startX, lastX, price;
			    var dataPosition = 0.0, graphPosition = startX / graphWidth;

			    var valueIndex = 0;
				var valueCount = data.length;
			    var time = 0.0, prevTime = 0.0, timeOfMin = parseInt(min.timestep), timeOfMax = parseInt(max.timestep);

	    		while (valueIndex < valueCount && graphPosition <= stopPosition && (!isDayChart || prevTime < lastTime)) 
				{
				    if (isDayChart) {
			            if (time == stopTime) { //end of a line
			                drawLineWithPoints(points, min.close, max.close);
							points = [];
			                var index = obj.gaps[sectionIndex]; //gaps is an array of indices in the data
			                var valueAfterGap = data[index];
			                time = parseInt(valueAfterGap.timestep);
			                x = (time - firstTime) / 60.0 * minuteWidth + startX;
			                firstTime = time;
			                startX = x;
			                price = valueAfterGap.close;
			                stopTime = -1.0;
			                dataPosition += 1.0 / (valueCount - 1);
			            } else if (useEveryPoint) {
			                var currentValue = data[valueIndex];
			                price = currentValue.close;
			                time = parseInt(currentValue.timestep);
			                x = (time - firstTime) / 60.0 * minuteWidth + startX;
			                valueIndex++;
			            } else { //dont use every point, extrapolate between points
			                time = Math.min(((x - startX) / minuteWidth) * 60.0 + firstTime, Math.min(lastTime, stopTime));
			                var priceAndPosition = priceAndPositionAtTime(time, dataPosition, valueIndex, valueCount, data);
							price = priceAndPosition["price"];
							dataPosition = priceAndPosition["position"];
			            }

			            if (sectionIndex == -1 || stopTime == -1.0) {
			                sectionIndex++;
			                var index = sectionIndex < hintCount ? obj.gaps[sectionIndex] : valueCount;
			                stopTime = parseInt(data[index - 1].timestep);
			                if (stopTime == lastTime)
			                    stopTime++;
			            }
			        } //end isDayChart
			        else if (useEveryPoint) {
			            var currentValue = data[valueIndex];
			            price = currentValue.close;
			            time = parseInt(currentValue.timestep);
			            valueIndex++;
			        } else {
			            time = timeAtPosition(dataPosition, valueCount, data);
			            var priceAndPosition = priceAndPositionAtTime(time, dataPosition, valueIndex, valueCount, data);
						price = priceAndPosition["price"];
			        }

			        // Ensure the step size doesn't cause us to miss the minimum or maximum of the graph.  Save the lastX first.
					var minPrice = min.close;
					var maxPrice = max.close;
			        lastX = x;
			        if (!useEveryPoint || isDayChart) {
			            if (timeOfMin > prevTime && timeOfMin < time) {
			                time = timeOfMin;
			                price = minPrice;
			                x = isDayChart ? ((timeOfMin - firstTime) / 60.0 * minuteWidth + startX) : (x - stepX * ((-(timeOfMin - prevTime) / (time - prevTime)) + 1));
			                lastX -= stepX;
			                timeOfMin = lastTime + 1.0;
			            } else if (timeOfMax > prevTime && timeOfMax < time) {
			                time = timeOfMax;
			                price = maxPrice;
			                x = isDayChart ? ((timeOfMax - firstTime) / 60.0 * minuteWidth + startX) : (x - stepX * ((-(timeOfMax - prevTime) / (time - prevTime)) + 1));
			                lastX -= stepX;
			                timeOfMax = lastTime + 1.0;
			            }
			        }
			
					dataCount++;

			        points.push({x:x, y:((price - minPrice) / (maxPrice - minPrice))}); // y is in unit coordinates so the line can be redrawn at varying view heights.
			        values.push({time:time, price: price});
		
			        // Increment X, and recalculate the progress in the graph.
			        x = lastX + stepX;
			        prevTime = time;
			        // If the next step is off the graph, but we still didn't reach the end with the last step, finish it up.
			        if (x > graphWidth && lastX < graphWidth)
			            x = graphWidth;

			        graphPosition = x / graphWidth;
			        if (graphPosition > stopPosition && lastX / graphWidth < stopPosition)
			            graphPosition = stopPosition;

			        if (weekAlignmentHints) {
			            var currentSectionIndex = Math.min(Math.floor(graphPosition / nominalSectionSize), hintCount - 1);
			            if (currentSectionIndex != sectionIndex) {
			                sectionIndex = currentSectionIndex;
			                sectionStart = (sectionIndex == 0 ? 0.0 : obj.gaps[sectionIndex-1]);
			                sectionEnd = (sectionIndex == hintCount - 1 ? 1.0 : obj.gaps[sectionIndex]);
			                if (sectionIndex == hintCount - 1)
			                    currentSectionSize = stopPosition - graphPosition;
			            }
			            dataPosition = Math.min(sectionStart + ((graphPosition - sectionIndex * nominalSectionSize) * (sectionEnd - sectionStart) / currentSectionSize), 1.0);
			        } else if (!isDayChart)
			            dataPosition = graphPosition;
				} //end while

				drawLineWithPoints(points, min.close, max.close);
				points = [];
			}
			else
			{
				document.getElementById('retrieving').innerText = getLocalizedString('No chart data');
			}
		}
		catch(e) {
			alert(e);
		}
	}
	else
	{
		var chartMessage;
		if(obj.error == kNoIntradayChartError)
			chartMessage = getLocalizedString('No Intraday Chart Available');
		else
		{
			chartMessage = getLocalizedString('Error retrieving chart');
			alert ('fetching chart failed: ' + obj.errorString);			
		}
		
		enableChart(false);
		document.getElementById('retrieving').innerText = chartMessage;
	}
}


// Returns an interpolated price at an absolute time in the data from [0, 1].  This method is stateless.
function timeAtPosition(percentPosition, valueCount, data)
{
    // ASSERT(percentPosition <= 1.0);
    var floatingIndex = percentPosition * (valueCount - 1);
    var roundedIndex = Math.floor(floatingIndex);
    if (roundedIndex >= valueCount - 1)
        return parseInt(data[valueCount - 1].timestep);
    var earlierTime = parseInt(data[roundedIndex].timestep);
    if (roundedIndex + 1 >= valueCount - 1)
        return earlierTime;
    var laterTime = data[roundedIndex+1].timestep;
    var midpointFactor = (floatingIndex - roundedIndex);
    if (laterTime - earlierTime > 3600 * 12) // If there is more than 12 hours between these datapoints, don't interpolate.  Could be on the gap between trading days.
        midpointFactor = Math.round(midpointFactor);
    return earlierTime * (1 - midpointFactor) + laterTime * midpointFactor;
}

// Returns an interpolated price at an absolute time in the data.
// This method is stateful, as the search start is based on the current _valueIndex.
function priceAndPositionAtTime (time, dataPosition, valueIndex, valueCount, data)
{
    if (valueIndex > valueCount - 1)
         return {price: data[_valueCount - 1].close, position: dataPosition};
    else if (valueIndex < 1)
        valueIndex = 1;

    var earlierValue = data[valueIndex-1];
    var laterValue = data[valueIndex];
    while (time > laterValue.timestep) {   // Advance through the data in pairs until the pair straddles the time we want.
        earlierValue = laterValue;
        valueIndex++;
        if (valueIndex == valueCount) {
            if (dataPosition)
                dataPosition = 1.0;
            return {price: data[valueCount - 1].close, position: dataPosition};
        }
        laterValue = data[valueIndex];
    }

    var midpointFactor = (time - earlierValue.timestep) / (laterValue.timestep - earlierValue.timestep);
    if (dataPosition)
        dataPosition = (valueIndex + midpointFactor) / (valueCount - 1);
	var price = earlierValue.close * (1 - midpointFactor) + laterValue.close * midpointFactor
    return {price: price, position: dataPosition};
}


// workaround for canvas not rendering after display change.
function enableChart (enable)
{
	var verticalaxes = document.getElementById('vertical-axes');
	var haxes = document.getElementById('horizontal-axes');
	var retrieving = document.getElementById('retrieving');
	
	if (enable)
	{
		verticalaxes.style.display = 'block';
		haxes.style.display = 'block';
		
		retrieving.style.display='none';
	}
	else
	{
		retrieving.innerText = getLocalizedString('Retrieving Chart…');
		retrieving.style.display='block';

		verticalaxes.style.display = 'none';
		haxes.style.display = 'none';
		
		// ick ick ick, clear the canvas
		document.getElementById('chart-canvas').getContext('2d').clearRect (0, 0, kChartCanvasWidth, kChartCanvasHeight);
	}
}

function setupChartController (mode)
{
	var array = ['1d', '1w', '1m', '3m', '6m', '1y', '2y'];
	var c = array.length;
	
	for (var i = 0; i < c; ++i)
	{
		var m = array[i];
		var div = document.getElementById(m+'text');
		div.innerHTML = getLocalizedString(m);
		
		if (m == mode)
		{
			if (currentChartSelect != null)
				currentChartSelect.setAttribute ("class", "");
			
			currentChartSelect = div.parentNode;
			currentChartSelect.setAttribute ("class", "selected");
		}
	}
}

function getMonthArray() {
	return getLocalizedString("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec").split(" ");
}

function oneDayHorizontalLabels ()
{
	if(!gChartObj || !gChartObj.meta)
		return [];
	
	var labelArray = [];
	var gmtoffset = gChartObj.meta.gmtoffset;
    var openHour = gChartObj.meta.marketopen.getUTCHours() + gmtoffset;
    var closeHour = Math.ceil(gChartObj.meta.marketclose.getUTCHours() + gmtoffset + gChartObj.meta.marketclose.getMinutes() / 60.0);
    var hourRange = closeHour - openHour;

    var hourLabels = [];
    for (; closeHour > openHour; closeHour--) {     // Labels and positions in reverse order, right to left.
        hourLabels.push(closeHour > 12 ? closeHour % 12 : closeHour);
    }
	
    // Now calculate the hour positions to maximize space on the left and right if the market opens and/or closes off even hours.
    var hourPositions = [];
    var labelIndex = hourRange;    // Use a float to force float results in calculations.
    var positionAtRight = 1.0;
    var gapForEachLabel = 1.0 / labelIndex;
	
    // Calculate the amount to append to the second to last hour to show enough of the partial last hour.
    var hourFractionToAppend = Math.min(gChartObj.meta.marketclose.getMinutes() / 60.0, DAY_CHART_MAX_LABEL_ADJUST);
    if (hourFractionToAppend > 0.0) {
        // Draw a blank vertical line to mark the true end of the graph before the y-scale.
        hourLabels.unshift("");
        hourPositions.unshift(1);
        gapForEachLabel += ((1 - hourFractionToAppend) / labelIndex) / labelIndex;
        labelIndex--;
    }
	
    // Calculate the amount to prepend to the second hour to show enough of the partial first hour.
    var hourFractionToPrepend = Math.min(gChartObj.meta.marketopen.getMinutes() / 60.0, DAY_CHART_MAX_LABEL_ADJUST);
    gapForEachLabel += (hourFractionToPrepend / labelIndex) / labelIndex;

    // Now that gapForEachLabel is finalized, calculate where the first drawn label (at the right) should be, if time was appended.
    positionAtRight -= gapForEachLabel * hourFractionToAppend;

    // And loop to calculate the position of each hour thereafter.
    for(; labelIndex > 0; labelIndex--) {
        hourPositions.push(positionAtRight);
        positionAtRight -= gapForEachLabel;
	}
	
	for(index in hourLabels)
	{
		if(!hourPositions[index]) hourPositions[index] = 0;
		labelArray.push([hourLabels[index], hourPositions[index]]);
	}
	
	return labelArray;
}

function dayLabelsForHorizontalAxes (daysPerLabel, realTimePositions) {

    // Build labels: start at the latest day and work backwards until dayLabelCount days have been encountered
	var labelArray = [];
	var labels = [];
	var dayBoundaryIndexes = [];
    var currentDay = -1;
    var skipDays = daysPerLabel == 1 ? daysPerLabel : 0; // Use first day we find
    var valueIndex = gChartObj.data.length;
    var currentMonth = 0;  // Months are 1-indexed.
	var secondsFromGMT = gChartObj.meta.gmtoffset;

	//label in week view is start of that days data, but in month view shows just that point's data
	var labelReflectsBeginningOfPeriod = (daysPerLabel == 1); 

    var valueTime;
    var valueDate;
    var data = gChartObj.data;
	var lastDate = null;

    while (valueIndex--) {
        valueTime = data[valueIndex].timestep; // - 978307200.0; //NSTimeIntervalSince1970;
        valueDate = new Date(valueTime *1000); //CFAbsoluteTimeGetGregorianDate(valueTime, (CFTimeZoneRef)chartDataTimeZone);

		var absoluteDay = Math.floor((valueTime + secondsFromGMT) / 86400.0);

        if (absoluteDay != currentDay) {

            // Calculate the number of days between this date and the previously processed date (i.e. the date immediately after this date, chronologically)
            var daysSinceCurrentDay = (currentDay == -1) ? 0 : currentDay - absoluteDay;

            if (daysSinceCurrentDay >= 1)
                dayBoundaryIndexes.push(valueIndex);

            // Skip days until daysPerLabel days have been skipped.
            // Note that daysPerLabel is expressed in terms of the true calendar and not the dates represented in _stockValues.
            // For example, there are 7 days between these 5 days: { 1, 2, 3, 4, 7 }
            skipDays -= daysSinceCurrentDay;

            if (skipDays <= 0) 
			{
                skipDays = daysPerLabel; //reset skipDays
				if(!lastDate) lastDate = valueDate; //first time in month view

                // Add label for this day
                var labelString = labelReflectsBeginningOfPeriod ? lastDate.getUTCDate() : valueDate.getUTCDate();

				//-1 signals use equal spacing
				var position = realTimePositions ? valueIndex / (data.length-1) : -1;

				labelArray.push([labelString, position]);
            }
				
            // Remember this absolute day
			lastDate = valueDate;
            currentDay = absoluteDay;
        }
    }

	//we had calculated position based on index's position in data
	//if last trading day in week isn't over, need to recalculate accounting for time bt last data point and end of day
		//use the ratio is currentPosition/dataLength = newPosition/totalLength
		//if totalLength = 1, dataLength is gFinalPointEndPosition
	//gFinalPointEndPosition is calculated in chart_callback
    if (currentChartMode == "1w") 
	{
		labelArray.push([lastDate.getUTCDate(), 0]); //add one more for week view

		if(gFinalPointEndPosition < 1)
			 for(var i = 0; i < labelArray.length-1; i++) //all but the index 0, which has latest date
				labelArray[i][1] = labelArray[i][1] * gFinalPointEndPosition; //(data.length-1) / ((data.length-1)/gFinalPointEndPosition);
    }

	return labelArray;
}

function monthLabelsWithInterval (interval) {
	var labelArray = [];
	var data = gChartObj.data;
	var valueIndex = data.length;
	var lastTime = data[data.length-1].timestep;
	var lastMonth = new Date(lastTime*1000).getMonth();
	var labels = getMonthArray ();
	var skipMonths = interval;
	var firstMonthLabeled = -1;
	var showYearLabels = interval >= 4;

	while (valueIndex--) {
		var currentDate = new Date(data[valueIndex].timestep * 1000);
		var currentMonth = currentDate.getMonth();
		
		if(currentMonth != lastMonth)
		{
			skipMonths--;
			if(skipMonths == 0)
			{
				if(firstMonthLabeled == -1)
					firstMonthLabeled = lastMonth;

				var label;
				if(showYearLabels && lastMonth == firstMonthLabeled)
					label = labels[lastMonth].substring(0, 1) + "'" + currentDate.getFullYear().toString().substring(2);
				else
					label = labels[lastMonth]; //print the month we're leaving
				
				labelArray.push([label, valueIndex/(data.length-1)]);

				skipMonths = interval;
			}
				lastMonth = currentMonth;			
		}
	}
	return labelArray;
}

function setupHorizontalAxes (mode)
{
	var xaxes = document.getElementById('horizontal-axes');
	removeAllChildren (xaxes);
	var labelArray = [];
	switch (mode)
	{
		case "1d": labelArray = oneDayHorizontalLabels(); break;			
		case "1w": labelArray = dayLabelsForHorizontalAxes(1, true); break;
		case "1m": labelArray = dayLabelsForHorizontalAxes(7, true); break;
		case "3m": labelArray = monthLabelsWithInterval(1); break;
		case "6m": labelArray = monthLabelsWithInterval(1); break;
		case "1y": labelArray = monthLabelsWithInterval(2); break;
		case "2y": labelArray = monthLabelsWithInterval(4); break;
	}

	var context = document.getElementById('chart-canvas').getContext('2d');
	context.beginPath();
	context.save();
	context.lineWidth = .25;
	context.strokeStyle = "rgb(255, 255, 255)";
	
	var hasDrawnLineAtRightEdge = false;
			
	for(index in labelArray)
	{
		var labelPositionPair = labelArray[index];

		var label = labelPositionPair[0];
		var position = labelPositionPair[1];

		if(position < 0) //negative means evenly space the labels
			position = (labelArray.length-1-index)/(labelArray.length-1);

		var div = document.createElement('div');
		div.innerText = label;
		div.setAttribute ("class", "xaxes");
		xaxes.appendChild (div);

		div.style.left = position*kChartCanvasWidth - (div.clientWidth/2) + kOffsetBtCanvasAndXAxes + "px";
		
		//draw a vertical line at that point
		context.moveTo(position*kChartCanvasWidth, kChartCanvasHeight);
		context.lineTo(position*kChartCanvasWidth, 0);
		context.stroke();
		
		if(position == 1)
			hasDrawnLineAtRightEdge = true;
	}	

		if(!hasDrawnLineAtRightEdge)
		{
			//draw the bottom line
			context.moveTo(kChartCanvasWidth, 0);
			context.lineTo(kChartCanvasWidth, kChartCanvasHeight);
			context.stroke();			
		}

		//draw the bottom line
		context.moveTo(0, kChartCanvasHeight);
		context.lineTo(kChartCanvasWidth, kChartCanvasHeight);
		context.stroke();
}

function tosClick(evt) {
	if (window.widget) {
		widget.openURL("http://info.yahoo.com/legal/us/yahoo/utos/utos-173.html");
	}
}

function financeLogoClick(evt) {
	if (window.widget) {
		widget.openURL("http://api.apple.go.yahoo.com/appledwf/");
	}
}

function yLogoClick(evt) {
	if (window.widget) {
		var url = "http://api.apple.go.yahoo.com/appledwf/q/cq?d=v1";
		for (var i = 0; i < allTheData.length; i++) {
			var symbol = allTheData[i].symbol;
			symbol = ("COMPX" == symbol) ? "^IXIC" : symbol;
			url += "&s=" + symbol;
		}
		widget.openURL(url);
	}
}
