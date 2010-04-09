/*
Copyright (C) 2006, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/



//
// The "API" for the rest of this widget code must be kept in sync with our parser.js, which is posted
// to the net and can be updated independent of the rest of the widget.  We present a single integer
// version number of parser-API compatibility with parser.js; this is of the form X.* (* denotes revs
// that are parsser-API-compatible):
//
// This ESPN Widget Requires ESPN Parser Version 1.*
//



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



var gCurrentLeague								= "nhl";
var gCurrentMode								= "news";

var kFeedFailureWaitBeforeNextRefreshMs			= 30000;
var kFeedOKMinimumWaitBeforeNextRefreshMs		= 30000;
var kFeedResumeWaitBeforeNextRefreshMs			= 5000;

var kDelayBeforeWhyIsListEmptyMessageMs			= 1000;

var gCurrentBackground							= null;
var gFunctionToRunWhenPictureLoaded				= null;
var gMouseIsInButton							= false;

var gDataGetterRefreshTimer_News				= null;
var gDataGetterRefreshTimer_Scores				= null;
var gDataGetterPendingRequest_News				= null;
var gDataGetterPendingRequest_Scores			= null;
var gDataGetterClientCallback_News				= null;
var gDataGetterClientCallback_Scores			= null;

var gScoresModeFocusOnGameId					= null;
var gScoresModeFocusOnGameUrl					= null;
var gScoresModeCachedScoresObject				= null;
var gScoresModeCachedNewsObject					= null;

var kFlipToFrontCrawlStartDelayMs				= 700;

var kScoresHeaderOn_MiddleContainerAreaY1Px		= 60;
var kScoresHeaderOn_MiddleContainerAreaYBPx		= 41;
var kScoresHeaderOn_ScrollBarY1Px				= 65;
var kScoresHeaderOff_MiddleContainerAreaY1Px	= 59;
var kScoresHeaderOff_MiddleContainerAreaYBPx	= 44;
var kScoresHeaderOff_ScrollBarY1Px				= 53;

var kShowingNews_ContentBottomClipPx			= 109;
var kShowingScores_ContentBottomClipPx			= 113;
var kLastItemClipItsBottomThresholdY2Px			= 105;

var kShowingNews_ScrollSnapPx					= 1;
var kShowingScores1Row_ScrollSnapPx				= 1;
var kShowingScores2Row_ScrollSnapPx				= 1;

var gScrollAreaSnapPx;
var gScrollAreaNowViewingFromThisContentTop;

var kNewsListMaxNumItems						= 20;
var kNewsListItemHeightPx						= 14;

var gNewsListAddSequence						= 0;
var gNewsListItemsArray							= new Array (kNewsListMaxNumItems);
var gNewsListMessageStr							= null;
var gNewsListMessageDelayTimer					= null;

var kScoresListMaxNumItems						= 20;
var kScoresList_1row_HeightPx					= 19;
var kScoresList_2row_HeightPx					= 38;

var gScoresListAddSequence						= 0;
var gScoresListItemsArray						= new Array (kScoresListMaxNumItems);
var gScoresListSelectedGameId					= null;
var gScoresListOnClickedItemClientCallback		= null;
var gScoresListMessageStr						= null;
var gScoresListMessageDelayTimer				= null;

var kCrawlMaxNumEnqueuedItems					= 100;
var kCrawlCullNumEnqueuedItems					= 40;
var kCrawlMaxNumOnscreenItems					= 20;
var kCrawlIntervalMs							= 35;
var kCrawlMovePerIntervalPx						= 1;
var kCrawlRightLimitOfAreaPx					= 316;
var kCrawlFadeDurationMs						= 3000;
var kCrawlFadeIntervalMs						= 35;
var kCrawlFadeLopsidedPct						= 10;

var gCrawlContainerElement						= null;
var gCrawlTimer									= null;
var gCrawlItemsArray							= new Array (kCrawlMaxNumOnscreenItems);
var gCrawlQueue									= new Array (0);
var gCrawlTransitionQueue						= new Array (0);
var gCrawlFadeAnimator							= null;
var gCrawlFadeAnimation							= null;
var gCrawlFadeState								= null;
var gCrawlClickableUrl							= null;
var gCrawlDataAreOnRequest						= false;

var gInfoButton									= null;
var gDoneButton									= null;
var gScrollBar									= null;
var gScrollArea									= null;



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function getLocalizedString (inKey)
{
	try
	{
		var outString = localizedStrings [inKey];
		if (outString == undefined) return inKey;
		return outString;
	}
	catch (ex)
	{}
	
	return inKey;
}



function getWidgetInstanceSpecificKey (inKey)
{
	return widget.identifier + "-" + inKey;
}



function getPreferenceForKey (inKey)
{
	// first check to see if we have a per instance one
	var outPref = widget.preferenceForKey (getWidgetInstanceSpecificKey (inKey));
	
	if (outPref == null)
	{
		// now check the global one
		outPref = widget.preferenceForKey (inKey);
	}
	
	return outPref;
}



function setPreferenceForKey (inPref, inKey)
{
	// set both the per widget pref and the global
	widget.setPreferenceForKey (inPref, getWidgetInstanceSpecificKey (inKey));
	widget.setPreferenceForKey (inPref, inKey);
}



function getKindNameFromLeagueName (inLeague)
{
	return gLeagueArray[inLeague].kind;
}



function getTagFromTeamPair (inTeamOrPlayerOrNullA, inTeamOrPlayerOrNullB)
//
// Returns a tag (ie, to be used to refer back to something added to the crawl for replacement, ie, if a game status
// is updated) cookie made up out of the the two given team strings.  The tag has these special properies: If NULL is given
// for either team (which could be an individual too, ie, in golf) then this is handled also so that even here a valid tag
// is created; The case is flattened to all-lower; The two strings are sorted in alphabetical order; The tag is then made
// up of both strings.
//
// This guarantees a unique tag output for a team matchup pair and further guarantees exactly one tag for a team matchup
// pair even if the order changes.  That is, "Oakland vs. San Francicso" and "San Francisco vs. Oakland" will generate
// the same tag (this is probably a rare case, yet if we didn't deal with it, there is a chance of both items being in
// the crawl if the crawl were left undisturbed for many months and there was such a reverse matchup during a season,
// or even going into a new season).  The case-flattening is gratuitous paranoia.
//
{
	var tA, tB, tL, tR;
	
	tA = (null == inTeamOrPlayerOrNullA) ? "*" : inTeamOrPlayerOrNullA.toLowerCase();
	tB = (null == inTeamOrPlayerOrNullB) ? "*" : inTeamOrPlayerOrNullB.toLowerCase();
	
	if (tA < tB)		// note that this is a string sort order comparison
	{
		tL = tA;
		tR = tB;
	}
	else
	{
		tL = tB;
		tR = tA;
	}
	
	return "T-" + tL + "-" + tR;
}



function getOldestUnseenActiveItemInItemsArray (inItemsArray, inViewLimitY1, inViewLimitY2)
//
// Returns the oldest item that is also active and is also not-visible-on-screen, or NULL if none found.  The input
// is taken to be an array of objects, where each such object has at least "isActive", "sequence", "y1", and "y2"
// member variables.  Alternative methodology: Use document.defaultView.getComputedStyle().getPropertyValue() of the
// actual element but this does not always work.
//
{
	var i;
	var oldestSequence = Number.MAX_VALUE;
	var outOldestActiveItem = null;
	var isItemInVisibleRange;
	var anItem;
	// to test: var iii;
	// to test: alert ("getOldestUnseenActiveItemInItemsArray: ENTER. limitY1="+inViewLimitY1+" limitY2="+inViewLimitY2);
	
	for (i = 0;   i < inItemsArray.length;   i++)
	{
		anItem = inItemsArray[i];
		if (true == anItem.isActive)
		{
			isItemInVisibleRange = (((anItem.y1 >= inViewLimitY1) && (anItem.y1 <= inViewLimitY2)) ||
									((anItem.y2 >= inViewLimitY1) && (anItem.y2 <= inViewLimitY2)));
			// to verify: alert ("i="+i+"  y1="+anItem.y1+" y2="+anItem.y2+"   isItemInVisibleRange="+isItemInVisibleRange + "   bornOn="+anItem.sequence);
			if (false == isItemInVisibleRange)
			{
				if (anItem.sequence <= oldestSequence)			// it helps to think of the "sequence" as a
				{												// "born on" "date"; lesser values are older;
					oldestSequence = anItem.sequence;			// greater values are younger = newer; thus
					outOldestActiveItem = anItem;				// here we find the least value = oldest
					// to test: iii = i;
				}
			}
		}
	}
	
	// to test: alert ("getOldestUnseenActiveItemInItemsArray returning idx="+iii+"--->"+outOldestActiveItem);
	return outOldestActiveItem;
}



function getRenderValue (inElementObj, inElementIdStr, inStyleAttributeStr)
//
// Returns the integer value of the given HTML element's given CSS attribute tag, with the special
// feature that it is the actual, as-currently-rendered/clipped/etc, value, not simply what is given
// in CSS text or JS code.  The element can be given either as an object or an HTML ID tag string
// (specify NULL for the unwanted parameter).  Getting computed styles like this might not always work.
//
{
	if (null != inElementObj)
		return parseInt (document.defaultView.getComputedStyle (inElementObj,
			null).getPropertyValue (inStyleAttributeStr), 10);
	
	if (null != inElementIdStr)
		return parseInt (document.defaultView.getComputedStyle (document.getElementById (inElementIdStr),
			null).getPropertyValue (inStyleAttributeStr), 10);
	
	return null;
}



function addNewElement (inElementToAppendNewElementToOrNull,
						inNewElementTagType,
						inNewElementStyleClassOrNull,
						inNewElementDivOrSpanInnerTextOrNull,
						inNewElementImgSrcOrNull)
//
// Helper to more easily create a new text or image HTML element with a CSS style while building hierarchies and avoiding
// certain pitfalls.
//
// A new HTML element is created of the given tag type (ie, "img" or "div" or "span").  It is set to be controlled by the
// given style-class (ie, from the CSS file).  Its contents are set to the given text data or image file.
//
// Then, if an existing element to add to is given as non-null, it is added to that element.  In any case, the newly-added
// element is returned; this can be used to when building a hierarchy.
//
// Whenever an input parameter is not desired to be acted upon, or doesn't make sense (indeed would cause a DOM error in
// the example of specifying innerText for an image), null can be passed for that parameter.
//
// If text input is given (ie, non-null) but it is the empty string, then space is taken up anyway; this behavior can
// be used to ensure that when using this routine to make columns, they will still line up correctly, with blank entries
// for the missing data.
//
{
	var outNewElement = document.createElement (inNewElementTagType);
	
	if (null != inNewElementStyleClassOrNull)
		outNewElement.setAttribute ("class", inNewElementStyleClassOrNull);
	
	if (null != inNewElementDivOrSpanInnerTextOrNull)
	{
		if ("" != inNewElementDivOrSpanInnerTextOrNull)
		{
			outNewElement.innerText = inNewElementDivOrSpanInnerTextOrNull;
		}
		else
		{
			outNewElement.innerText = "x";					// there must be a better way
			outNewElement.style.visibility = "hidden";		// than doing it like this
		}
	}
	
	if (null != inNewElementImgSrcOrNull)
		outNewElement.src = inNewElementImgSrcOrNull;
	
	if (null != inElementToAppendNewElementToOrNull)
		inElementToAppendNewElementToOrNull.appendChild (outNewElement);
	
	return outNewElement;
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function getPhaseFromESPNStatusId (inESPNStatusId)
//
// Converts an ESPN "Status ID" from the feed to our internal Phase code, which is always one of
// ("final", "inprogress", "upcoming", "unknown").  It is what stage the game is in.  The Phase
// code is programmatically used.
//
{	
	if  (1 == inESPNStatusId)								return "upcoming";
	if ((2 == inESPNStatusId) || (inESPNStatusId >= 20))	return "inprogress";
	if  (3 == inESPNStatusId)								return "final";
	
	return "unknown";
}



function getWhenFromESPNStatusStr (inESPNStatusStr)
//
// Converts an ESPN "Status" string from the feed to our "When" string, prior to display.  The string is simplified
// (shortened) as we desire, parts of it are shifted in upper/lower case, and substring pieces are localized.
//
{
	var outStr = inESPNStatusStr;
	
	// For the golf thru-score "F", make sure it is capitalized just in case it was given as lowercase:
	//
	if ("f" == outStr) outStr = "F";
	
	// If a date is given before the time, that is, if the given string is "SAT JUL 1 8:00PM", in any casing style, we want
	// to strip off the date part but not the time.  Identify it by being at the beginning of the string (^) and match any
	// dayname plus space plus any monthname plus space plus digit(s) plus space, case-insensitive (i), and replace with nothing:
	//
	outStr = outStr.replace (/^(SUN|MON|TUE|WED|THU|FRI|SAT)(,)* (JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) \d+ /i, "");
	
	// Find "IN" as a standalone word to identify the form of ("2:22 IN 2ND") and make "IN" lowercase, and also localize;
	// do this no matter what kind of casing it had (i) and for multiple occurrences (g); do the same thing for other
	// articles:
	//
	outStr = outStr.replace (/(\b)in(\b)/ig, getLocalizedString ("in"));
	outStr = outStr.replace (/(\b)at(\b)/ig, getLocalizedString ("at"));
	outStr = outStr.replace (/(\b)of(\b)/ig, getLocalizedString ("of"));
	
	// Take ordinal number forms (11th, 1st, 2nd, 123rd, 7th, 3rd, 13th, 12th, etc) and make them lowercase, and localize
	// no matter what kind of casing it had (i) and multiple occurrences (g); (\d) matches the digit before "st":
	//
	outStr = outStr.replace (/(\d)st/ig, "$1" + getLocalizedString ("st"));
	outStr = outStr.replace (/(\d)nd/ig, "$1" + getLocalizedString ("nd"));
	outStr = outStr.replace (/(\d)rd/ig, "$1" + getLocalizedString ("rd"));
	outStr = outStr.replace (/(\d)th/ig, "$1" + getLocalizedString ("th"));
	
	// Take certain terms and make them our style of casing, no matter what capitalization style they had before (i),
	// and localize, and do this however many times they may appear (g); this applies only to words on word boundaries (\b):
	//
	outStr = outStr.replace (/(\b)end(\b)/ig,		getLocalizedString ("End"));
	outStr = outStr.replace (/(\b)final(\b)/ig,		getLocalizedString ("Final"));
	outStr = outStr.replace (/(\b)halftime(\b)/ig,	getLocalizedString ("Halftime"));
	outStr = outStr.replace (/(\b)overtime(\b)/ig,	getLocalizedString ("Overtime"));
	outStr = outStr.replace (/(\b)ot(\b)/ig,		getLocalizedString ("OT"));
	outStr = outStr.replace (/(\b)top(\b)/ig,		getLocalizedString ("Top"));
	outStr = outStr.replace (/(\b)bottom(\b)/ig,	getLocalizedString ("Bottom"));
	outStr = outStr.replace (/(\b)bot(\b)/ig,		getLocalizedString ("Bottom"));	
	outStr = outStr.replace (/(\b)inning(\b)/ig,	getLocalizedString ("Inning"));
	outStr = outStr.replace (/(\b)quarter(\b)/ig,	getLocalizedString ("Quarter"));
	outStr = outStr.replace (/(\b)period(\b)/ig,	getLocalizedString ("Period"));
	
	return outStr;
}



function getHeadlineFromESPNHeadlineStr (inESPNHeadlineStr)
//
// The incoming ESPN news sometimes has angle bracket embedded HTML directives for boldface, links, etc,
// so we return a stripped version here; ie, "One <x xyz>Two<x> Three" becomes "One Two Three"; also detect
// unclosed angle brackets; ie, "One <x>Two<img ..." becomes "One Two".
// We have also had instances of getting "null" (5849915), so look for that too
{	
	return (inESPNHeadlineStr.toLowerCase() == "null") ? null : inESPNHeadlineStr.replace (/<[^<]*(>)/g, "");
}



function getTeamFromESPNTeamStr (inESPNLeague, inESPNTeamStr)
//
// Best-effort routine to add a team nickname to a city.  The incoming ESPN team name is usally, but not always,
// that of a city only.  Try to convert "San Francisco" to "San Francisco 49ers".  We are cautious to do only a
// whole-string city comparison, and note that it is league-specific (a city might have multiple teams).
// If unable or simply not something we know about, the returned string is the same as the input.
//
{
	if ('mlb' == inESPNLeague)
	{
		// Los Angeles Angels is ambiguous so rely on ESPN string to tell the difference
		// Los Angeles Dodgers is ambiguous so rely on ESPN string to tell the difference
		if ("Oakland"			== inESPNTeamStr)	return inESPNTeamStr + " Athletics";
		if ("Toronto"			== inESPNTeamStr)	return inESPNTeamStr + " Blue Jays";
		if ("Tampa Bay"			== inESPNTeamStr)	return inESPNTeamStr + " Devil Rays";
		if ("Cleveland"			== inESPNTeamStr)	return inESPNTeamStr + " Indians";
		if ("Seattle"			== inESPNTeamStr)	return inESPNTeamStr + " Mariners";
		if ("Baltimore"			== inESPNTeamStr)	return inESPNTeamStr + " Orioles";
		if ("Texas"				== inESPNTeamStr)	return inESPNTeamStr + " Rangers";
		if ("Boston"			== inESPNTeamStr)	return inESPNTeamStr + " Red Sox";
		if ("Kansas City"		== inESPNTeamStr)	return inESPNTeamStr + " Royals";
		if ("Detroit"			== inESPNTeamStr)	return inESPNTeamStr + " Tigers";
		if ("Minnesota"			== inESPNTeamStr)	return inESPNTeamStr + " Twins";
		// Chicago Cubs is ambiguous so rely on ESPN string to tell the difference
		// Chicago White Sox is ambiguous so rely on ESPN string to tell the difference
		// New York Mets is ambiguous so rely on ESPN string to tell the difference
		// New York Yankees is ambiguous so rely on ESPN string to tell the difference
		if ("Houston"			== inESPNTeamStr)	return inESPNTeamStr + " Astros";
		if ("Atlanta"			== inESPNTeamStr)	return inESPNTeamStr + " Braves";
		if ("Milwaukee"			== inESPNTeamStr)	return inESPNTeamStr + " Brewers";
		if ("St. Louis"			== inESPNTeamStr)	return inESPNTeamStr + " Cardinals";
		if ("Arizona"			== inESPNTeamStr)	return inESPNTeamStr + " Diamondbacks";
		if ("San Francisco"		== inESPNTeamStr)	return inESPNTeamStr + " Giants";
		if ("Florida"			== inESPNTeamStr)	return inESPNTeamStr + " Marlins";
		if ("Washington"		== inESPNTeamStr)	return inESPNTeamStr + " Nationals";
		if ("San Diego"			== inESPNTeamStr)	return inESPNTeamStr + " Padres";
		if ("Philadelphia"		== inESPNTeamStr)	return inESPNTeamStr + " Phillies";
		if ("Pittsburgh"		== inESPNTeamStr)	return inESPNTeamStr + " Pirates";
		if ("Cincinnati"		== inESPNTeamStr)	return inESPNTeamStr + " Reds";
		if ("Colorado"			== inESPNTeamStr)	return inESPNTeamStr + " Rockies";
	}
	
	if ('nfl' == inESPNLeague)
	{
		if ("Baltimore"			== inESPNTeamStr)	return inESPNTeamStr + " Ravens";
		if ("Buffalo"			== inESPNTeamStr)	return inESPNTeamStr + " Bills";
		if ("Cincinnati"		== inESPNTeamStr)	return inESPNTeamStr + " Bengals";
		if ("Cleveland"			== inESPNTeamStr)	return inESPNTeamStr + " Browns";
		if ("Denver"			== inESPNTeamStr)	return inESPNTeamStr + " Broncos";
		if ("Houston"			== inESPNTeamStr)	return inESPNTeamStr + " Texans";
		if ("Indianapolis"		== inESPNTeamStr)	return inESPNTeamStr + " Colts";
		if ("Jacksonville"		== inESPNTeamStr)	return inESPNTeamStr + " Jaguars";
		if ("Kansas City"		== inESPNTeamStr)	return inESPNTeamStr + " Chiefs";
		if ("Miami"				== inESPNTeamStr)	return inESPNTeamStr + " Dolphins";
		if ("New England"		== inESPNTeamStr)	return inESPNTeamStr + " Patriots";
		// New York Giants is ambiguous so rely on ESPN string to tell the difference
		// New York Jets is ambiguous so rely on ESPN string to tell the difference
		if ("Oakland"			== inESPNTeamStr)	return inESPNTeamStr + " Raiders";
		if ("Pittsburgh"		== inESPNTeamStr)	return inESPNTeamStr + " Steelers";
		if ("San Diego"			== inESPNTeamStr)	return inESPNTeamStr + " Chargers";
		if ("Tennessee"			== inESPNTeamStr)	return inESPNTeamStr + " Titans";
		if ("Arizona"			== inESPNTeamStr)	return inESPNTeamStr + " Cardinals";
		if ("Atlanta"			== inESPNTeamStr)	return inESPNTeamStr + " Falcons";
		if ("Carolina"			== inESPNTeamStr)	return inESPNTeamStr + " Panthers";
		if ("Chicago"			== inESPNTeamStr)	return inESPNTeamStr + " Bears";
		if ("Dallas"			== inESPNTeamStr)	return inESPNTeamStr + " Cowboys";
		if ("Detroit"			== inESPNTeamStr)	return inESPNTeamStr + " Lions";
		if ("Green Bay"			== inESPNTeamStr)	return inESPNTeamStr + " Packers";
		if ("Minnesota"			== inESPNTeamStr)	return inESPNTeamStr + " Vikings";
		if ("New Orleans"		== inESPNTeamStr)	return inESPNTeamStr + " Saints";
		if ("New York"			== inESPNTeamStr)	return inESPNTeamStr + " Giants";
		if ("Philadelphia"		== inESPNTeamStr)	return inESPNTeamStr + " Eagles";
		if ("San Francisco"		== inESPNTeamStr)	return inESPNTeamStr + " 49ers";
		if ("Seattle"			== inESPNTeamStr)	return inESPNTeamStr + " Seahawks";
		if ("St. Louis"			== inESPNTeamStr)	return inESPNTeamStr + " Rams";
		if ("Tampa Bay"			== inESPNTeamStr)	return inESPNTeamStr + " Buccaneers";
		if ("Washington"		== inESPNTeamStr)	return inESPNTeamStr + " Redskins";
	}
	
	if ('nba' == inESPNLeague)
	{
		if ("New Jersey"		== inESPNTeamStr)	return inESPNTeamStr + " Nets";
		if ("New York"			== inESPNTeamStr)	return inESPNTeamStr + " Knicks";
		if ("Philadelphia"		== inESPNTeamStr)	return inESPNTeamStr + " 76ers";
		if ("Toronto"			== inESPNTeamStr)	return inESPNTeamStr + " Raptors";
		if ("Chicago"			== inESPNTeamStr)	return inESPNTeamStr + " Bulls";
		if ("Cleveland"			== inESPNTeamStr)	return inESPNTeamStr + " Cavaliers";
		if ("Detroit"			== inESPNTeamStr)	return inESPNTeamStr + " Pistons";
		if ("Indiana"			== inESPNTeamStr)	return inESPNTeamStr + " Pacers";
		if ("Milwaukee"			== inESPNTeamStr)	return inESPNTeamStr + " Bucks";
		if ("Atlanta"			== inESPNTeamStr)	return inESPNTeamStr + " Hawks";
		if ("Charlotte"			== inESPNTeamStr)	return inESPNTeamStr + " Bobcats";
		if ("Miami"				== inESPNTeamStr)	return inESPNTeamStr + " Heat";
		if ("Orlando"			== inESPNTeamStr)	return inESPNTeamStr + " Magic";
		if ("Washington"		== inESPNTeamStr)	return inESPNTeamStr + " Wizards";
		if ("Dallas"			== inESPNTeamStr)	return inESPNTeamStr + " Mavericks";
		if ("Houston"			== inESPNTeamStr)	return inESPNTeamStr + " Rockets";
		if ("Memphis"			== inESPNTeamStr)	return inESPNTeamStr + " Grizzlies";
		if ("New Orleans"		== inESPNTeamStr)	return inESPNTeamStr + " Hornets";		// same as OC
		if ("Oklahoma City"		== inESPNTeamStr)	return inESPNTeamStr + " Hornets";		// same as NO
		if ("San Antonio"		== inESPNTeamStr)	return inESPNTeamStr + " Spurs";
		if ("Denver"			== inESPNTeamStr)	return inESPNTeamStr + " Nuggets";
		if ("Minnesota"			== inESPNTeamStr)	return inESPNTeamStr + " Timberwolves";
		if ("Portland"			== inESPNTeamStr)	return inESPNTeamStr + " Trail Blazers";
		if ("Seattle"			== inESPNTeamStr)	return inESPNTeamStr + " SuperSonics";
		if ("Utah"				== inESPNTeamStr)	return inESPNTeamStr + " Jazz";
		if ("Golden State"		== inESPNTeamStr)	return inESPNTeamStr + " Warriors";
		// Los Angeles Clippers is ambiguous so rely on ESPN string to tell the difference
		// Los Angeles Lakers is ambiguous so rely on ESPN string to tell the difference
		if ("Phoenix"			== inESPNTeamStr)	return inESPNTeamStr + " Suns";
		if ("Sacramento"		== inESPNTeamStr)	return inESPNTeamStr + " Kings";
		if ("Boston"			== inESPNTeamStr)	return inESPNTeamStr + " Celtics";
	}
	
	if ('nhl' == inESPNLeague)
	{
		if ("Anaheim"			== inESPNTeamStr)	return inESPNTeamStr + " Ducks";
		if ("Atlanta"			== inESPNTeamStr)	return inESPNTeamStr + " Thrashers";
		if ("Boston"			== inESPNTeamStr)	return inESPNTeamStr + " Bruins";
		if ("Buffalo"			== inESPNTeamStr)	return inESPNTeamStr + " Sabres";
		if ("Calgary"			== inESPNTeamStr)	return inESPNTeamStr + " Flames";
		if ("Carolina"			== inESPNTeamStr)	return inESPNTeamStr + " Hurricanes";
		if ("Chicago"			== inESPNTeamStr)	return inESPNTeamStr + " Blackhawks";
		if ("Colorado"			== inESPNTeamStr)	return inESPNTeamStr + " Avalanche";
		if ("Columbus"			== inESPNTeamStr)	return inESPNTeamStr + " Blue Jackets";
		if ("Dallas"			== inESPNTeamStr)	return inESPNTeamStr + " Stars";
		if ("Detroit"			== inESPNTeamStr)	return inESPNTeamStr + " Red Wings";
		if ("Edmonton"			== inESPNTeamStr)	return inESPNTeamStr + " Oilers";
		if ("Florida"			== inESPNTeamStr)	return inESPNTeamStr + " Panthers";
		if ("Los Angeles"		== inESPNTeamStr)	return inESPNTeamStr + " Kings";
		if ("Minnesota"			== inESPNTeamStr)	return inESPNTeamStr + " Wild";
		if ("Montreal"			== inESPNTeamStr)	return inESPNTeamStr + " Canadiens";
		if ("Nashville"			== inESPNTeamStr)	return inESPNTeamStr + " Predators";
		if ("New Jersey"		== inESPNTeamStr)	return inESPNTeamStr + " Devils";
		// New York Islanders is ambiguous so rely on ESPN string to tell the difference
		// New York Rangers is ambiguous so rely on ESPN string to tell the difference
		if ("Ottawa"			== inESPNTeamStr)	return inESPNTeamStr + " Senators";
		if ("Philadelphia"		== inESPNTeamStr)	return inESPNTeamStr + " Flyers";
		if ("Phoenix"			== inESPNTeamStr)	return inESPNTeamStr + " Coyotes";
		if ("Pittsburgh"		== inESPNTeamStr)	return inESPNTeamStr + " Penguins";
		if ("San Jose"			== inESPNTeamStr)	return inESPNTeamStr + " Sharks";
		if ("St. Louis"			== inESPNTeamStr)	return inESPNTeamStr + " Blues";
		if ("Tampa Bay"			== inESPNTeamStr)	return inESPNTeamStr + " Lightning";
		if ("Toronto"			== inESPNTeamStr)	return inESPNTeamStr + " Maple Leafs";
		if ("Vancouver"			== inESPNTeamStr)	return inESPNTeamStr + " Canucks";
		if ("Washington"		== inESPNTeamStr)	return inESPNTeamStr + " Capitals";
	}
	
	if ('WNBA' == inESPNLeague)
	{
		if ("Charlotte"			== inESPNTeamStr)	return inESPNTeamStr + " Sting";
		if ("Chicago"			== inESPNTeamStr)	return inESPNTeamStr + " Sky";
		if ("Connecticut"		== inESPNTeamStr)	return inESPNTeamStr + " Sun";
		if ("Detroit"			== inESPNTeamStr)	return inESPNTeamStr + " Shock";
		if ("Houston"			== inESPNTeamStr)	return inESPNTeamStr + " Comets";
		if ("Indiana"			== inESPNTeamStr)	return inESPNTeamStr + " Fever";
		if ("Los Angeles"		== inESPNTeamStr)	return inESPNTeamStr + " Sparks";
		if ("Minnesota"			== inESPNTeamStr)	return inESPNTeamStr + " Lynx";
		if ("New York"			== inESPNTeamStr)	return inESPNTeamStr + " Liberty";
		if ("Phoenix"			== inESPNTeamStr)	return inESPNTeamStr + " Mercury";
		if ("Sacramento"		== inESPNTeamStr)	return inESPNTeamStr + " Monarchs";
		if ("San Antonio"		== inESPNTeamStr)	return inESPNTeamStr + " Silver Stars";
		if ("Seattle"			== inESPNTeamStr)	return inESPNTeamStr + " Storm";
		if ("Washington"		== inESPNTeamStr)	return inESPNTeamStr + " Mystics";
	}
		
	return inESPNTeamStr;
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function scrollAreaInit ()
//
// Scroll-Area API: "Class" that manages the scrollable content area and its associated scroll bar.
//
// One-time routine to be called to initialize.
//
{
	// Create one for us:
	//
	gScrollBar = new AppleVerticalScrollbar (document.getElementById ("iScrollBar"));
	
	// Set some params: use custom images so we can have transparent scroll bar tracks:
	//
	gScrollBar.setTrackStart ("Images/scrollLt_track_vtop.png", 18);
	gScrollBar.setTrackMiddle ("Images/scrollLt_track_vmid.png");
	gScrollBar.setTrackEnd ("Images/scrollLt_track_vbottom.png", 18);
	gScrollBar.setThumbStart ("Images/scrolltrans_thumb_vtop.png", 9);
	gScrollBar.setThumbMiddle ("Images/scrolltrans_thumb_vmid.png");
	gScrollBar.setThumbEnd ("Images/scrolltrans_thumb_vbottom.png", 9);
	
	// Create one for us:
	//
	gScrollArea = new AppleScrollArea (document.getElementById ("iScrollableArea"), gScrollBar);
	
	// Set some params: allow keypress events to operate the scroll bar:
	//
	gScrollArea.scrollsVertically = true;
	gScrollArea.scrollsHorizontally = false;
	gScrollArea.singlepressScrollPixels = 1;
	gScrollArea.focus ();
	
	// Override to provide snapping behavior:
	//
	gScrollArea.verticalScrollTo = scrollAreaOverrideVerticalScrollTo;
	
	// Init some state for ourselves:
	//
	gScrollAreaSnapPx = 1;
	gScrollAreaNowViewingFromThisContentTop = 0;
}



function scrollAreaSetContentMode (inMode, inLeague)
//
// Scroll-Area API: "Class" that manages the scrollable content area and its associated scroll bar.
//
// We adjust the Y1 coordinate of the scroll bar (and thus also its height) to look good in either news or
// scores view; we adjust the Y1 coordinate of the middle-widget-scrollable-data-content-area (and thus also
// its height) so that it is of the correct height for thew view; we set the correct amount of scroll-snap
// for the news-or-scores view and sport type, if applicable; we then refresh our instances of the scroll area
// and scroll bar classes.
//
{
	var contClipBottom;
	
	if ("scores" == inMode)
	{
		document.getElementById ("iScrollBar").style.top = kScoresHeaderOn_ScrollBarY1Px.toString() + "px";
		document.getElementById ("iMiddleOfVaryingHeightContainer").style.top = kScoresHeaderOn_MiddleContainerAreaY1Px.toString() + "px";
		document.getElementById ("iMiddleOfVaryingHeightContainer").style.bottom = kScoresHeaderOn_MiddleContainerAreaYBPx.toString() + "px";
		contClipBottom = kShowingScores_ContentBottomClipPx;
		
		if (gKindsArray [getKindNameFromLeagueName (inLeague)].layoutRowType == "2row")
		{
			gScrollAreaSnapPx = kShowingScores2Row_ScrollSnapPx;
			gScrollArea.singlepressScrollPixels = kScoresList_2row_HeightPx;
		}
		else
		{
			gScrollAreaSnapPx = kShowingScores1Row_ScrollSnapPx;
			gScrollArea.singlepressScrollPixels = kScoresList_1row_HeightPx;
		}
		
		gScrollBar.setTrackStart ("Images/scrollLt_track_vtop.png", 18);
		gScrollBar.setTrackMiddle ("Images/scrollLt_track_vmid.png");
		gScrollBar.setTrackEnd ("Images/scrollLt_track_vbottom.png", 18);
	}
	else
	{
		document.getElementById ("iScrollBar").style.top = kScoresHeaderOff_ScrollBarY1Px.toString() + "px";
		document.getElementById ("iMiddleOfVaryingHeightContainer").style.top = kScoresHeaderOff_MiddleContainerAreaY1Px.toString() + "px";
		document.getElementById ("iMiddleOfVaryingHeightContainer").style.bottom = kScoresHeaderOff_MiddleContainerAreaYBPx.toString() + "px";
		contClipBottom = kShowingNews_ContentBottomClipPx;
		gScrollAreaSnapPx = kShowingNews_ScrollSnapPx;
		gScrollArea.singlepressScrollPixels = kNewsListItemHeightPx;
		
		gScrollBar.setTrackStart ("Images/scrollDk_track_vtop.png", 18);
		gScrollBar.setTrackMiddle ("Images/scrollDk_track_vmid.png");
		gScrollBar.setTrackEnd ("Images/scrollDk_track_vbottom.png", 18);
	}
	
	document.getElementById ("iMiddleOfVaryingHeightContainer").style.clip = "rect(0px,999px," + contClipBottom.toString() + "px,0px)";
	
	gScrollBar.scrollTo (0);			// ensure that a switch never leaves us with the thumb in an illegal area
	gScrollBar.setAutohide (true);		// for some reason I cannot do this at init time
	gScrollBar.refresh ();
	gScrollArea.refresh ();
	
	if ("scores" == inMode) scoresListRefresh ();
	if ("news" == inMode) newsListRefresh ();
}



function scrollAreaIsScrollBarVisible ()
//
// Scroll-Area API: "Class" that manages the scrollable content area and its associated scroll bar.
//
// Returns TRUE if the vertical size of the area's total content is big enough that the scroll bar class
// decided to show the scroll bar; FALSE otherwise.
//
{
	return !(gScrollBar.hidden);
}



function scrollAreaRefresh ()
//
// Scroll-Area API: "Class" that manages the scrollable content area and its associated scroll bar.
//
// This routine should be called after adding/deleting "lines".
//
{
	gScrollArea.refresh ();
	gScrollBar.refresh ();
}



function scrollAreaOverrideVerticalScrollTo (inNewContentTop)
//
// Scroll-Area API: "Class" that manages the scrollable content area and its associated scroll bar.
//
// Internal routine to override of AppleScrollArea.prototype.verticalScrollTo in AppleScrollArea class to support
// scroll-"stepping" by our "line height" instead of by 1 pixel and snooping the current position:
//
{
	if (!this.scrollsVertically)
		return;
	
	gScrollAreaNowViewingFromThisContentTop = inNewContentTop;		// snoop raw content (not view!) top
	
	var snappedNewContentTop = inNewContentTop - (inNewContentTop % gScrollAreaSnapPx);
	
	var bottom = this.content.scrollHeight - this.viewHeight;
	
	if (snappedNewContentTop < 0)
	{
		snappedNewContentTop = 0;
	}
	else if (snappedNewContentTop > bottom)
	{
		snappedNewContentTop = bottom;
	}
	
	this.content.scrollTop = snappedNewContentTop;
	
	var scrollbars = this._scrollbars;
	for (i in scrollbars)
	{
		scrollbars[i].verticalHasScrolled();
	}
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function backgroundDimmerScoresOverlayShow (inShowing)
//
// Background-Dimmer API: "Class" that manages the dimmable background.
//
// Passing TRUE turns on the overlay to be used for scores-view; FALSE turns it off.
//
{
	if (inShowing)
		document.getElementById ("iBackgroundOverlayIfScores").style.display = "block";
	else
		document.getElementById ("iBackgroundOverlayIfScores").style.display = "none";
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function newsListInit ()
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Must be called at this widget's init time.
//
{
	// We use a global next-sequence-number to know which item is the oldest:
	//
	gNewsListAddSequence = 0;
	
	// We have an array of data records per-item (we could store them as user-defined attributes
	// of the item DIVs as well but beware multiple DIVs that are related to a single item); note
	// the fixed y1/y2 coordinates per item index:
	//
	for (var i = 0;   i < gNewsListItemsArray.length;   i++)
	{
		var aNewArrayItem =
		{
			isActive:		false,									// whether this array slot is in use (only list-clear-all clears it)
			sequence:		0,										// the "born on" "date" of this item (lower values = older)
			htmlElement:	null,									// for accessing the graphical representation
			y1:				(i     * kNewsListItemHeightPx),		// the upper/lower coordinates of the graphical representation
			y2:				((i+1) * kNewsListItemHeightPx)			// within the coord system of the entire div that is scrolled
		};
		gNewsListItemsArray[i] = aNewArrayItem;
	}
	
	// We have a global that carries whether or not we are showing a message or content, but never both:
	//
	gNewsListMessageStr = null;
	gNewsListMessageDelayTimer = null;
}



function newsListAdd (inNewDatumHeadline, inNewDatumURL)
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Use this to add a single headline item.  If the hardcoded maximum number of headline items has
// been reached, a victim is chosen for replacement with the given one.  If at all possible, the
// victim will never be one that is currently visible in the display (thus this depends on the current
// scroller position) and, all other things being equal, attempts to be least-recently-added.
//
// Note that there is no replacement mechanism for news headlines: it is all additive since the last
// newsListClear (unlike the scores list, which has the concept of a Game ID that can be used to replace,
// not just add, a list item).
//
{
	var dataDiv = document.getElementById ("iNewsData");
	var messageDiv = document.getElementById ("iNewsMessage");
	var aNewDataChildDiv;
	var aVictimArrayItem;
	var theArrayItemToFillIn;
	var theDataChildDivToReplaceIfAny;
	var theDataChildDivToFillIn;
	var i;
	
	// Reset from any message showing mode:
	//
	gNewsListMessageStr = null;
	messageDiv.style.display = "none";
	if (null != gNewsListMessageDelayTimer) clearTimeout (gNewsListMessageDelayTimer);
	gNewsListMessageDelayTimer = null;
	
	// Find a slot in our array to put the new datum in.  This can either be the first available one if the
	// array is not full, or a replacement victim if it is full.  After this, "theDataChildDivToReplaceIfAny"
	// will be set to the DIV to replace, or it will be NULL if it is not in the parent data DIV yet and
	// thus we have to create one; also, "theArrayItemToFillIn" will be set to the correct slot in our
	// accounting array in either case: 
	//
	theArrayItemToFillIn = null;
	theDataChildDivToReplaceIfAny = null;
	for (i = 0;   i < kNewsListMaxNumItems;   i++)
	{
		if (false == gNewsListItemsArray[i].isActive)			// empty slot in array, so we will be adding-new
		{
			theArrayItemToFillIn = gNewsListItemsArray[i];
			theDataChildDivToReplaceIfAny = null;
			break;
		}
	}
	if (null == theArrayItemToFillIn)							// still null, so array full, so find victim
	{
		aVictimArrayItem = getOldestUnseenActiveItemInItemsArray (gNewsListItemsArray,
			gScrollAreaNowViewingFromThisContentTop,
			gScrollAreaNowViewingFromThisContentTop + 
				getRenderValue (null, "iMiddleOfVaryingHeightContainer", "height"));
		if (null != aVictimArrayItem)
		{
			theArrayItemToFillIn = aVictimArrayItem;
			theDataChildDivToReplaceIfAny = aVictimArrayItem.htmlElement;
		}
	}
	if (null == theArrayItemToFillIn)							// still null, should never happen but provide fallback
	{
		theArrayItemToFillIn = gNewsListItemsArray[0];
		theDataChildDivToReplaceIfAny = gNewsListItemsArray[0].htmlElement;
	}
	
	// Create it in the visible world, if needed (case when first adding them, since clear, up to the maximum
	// number of items) or not (case for the list being full and we are into replacing victims now); in any case
	// set up "theDataChildDivToFillIn" with the one created-or-replaced:
	//
	if (null == theDataChildDivToReplaceIfAny)
	{
		aNewDataChildDiv = document.createElement ('div');
		dataDiv.appendChild (aNewDataChildDiv);
		theDataChildDivToFillIn = aNewDataChildDiv;
	}
	else
	{
		theDataChildDivToFillIn = theDataChildDivToReplaceIfAny;
	}
	
	// Set the visible HTML element for our new data item up:  Fill in the text and set the class to the full width
	// as if no scrollbar were in the way initially for initial assumption and for scroll area/bar metrics.  We could
	// be adjusting a parent DIV instead of the items but this gives us more control:
	//
	theDataChildDivToFillIn.setAttribute ('class', 'sNewsHeadline');
	theDataChildDivToFillIn.innerText = inNewDatumHeadline.replace(/\n|\r/g, "");
	
	// Arrange to be called when the user clicks on the "line":
	//
	theDataChildDivToFillIn.setAttribute ('onclick', 'newsListOnClickedItem (event, "' + inNewDatumURL + '");');
	
	// Set our accounting for our new data item up:  Remember the element, set the age, and finally mark as active:
	//
	theArrayItemToFillIn.htmlElement = theDataChildDivToFillIn;
	theArrayItemToFillIn.sequence = gNewsListAddSequence;
	gNewsListAddSequence++;
	theArrayItemToFillIn.isActive = true;
	
	// Call scroll area refresh to be sure the area and scroll bar show/hide/size are updated as per content:
	//
	scrollAreaRefresh ();
		
	// Call our refresh routine to be sure our content is fixed up depending on scroll bar visibility, etc:
	//
	newsListRefresh ();
}



function newsListRefresh ()
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Ensure the news list is in good shape for display based on what's been actually happening with the shared scroll area.
// For example, depending on how big vertically the containing DIV is right now (possibly after a recent add of an item, or
// a switch from another use of the scroll area), there may or may not be a scroll bar visible.  Set the style so that
// we have the item "lines" terminated correctly on the right side to make room (or not) for the scroll bar.
//
{
	document.getElementById ("iNewsData").style.width = scrollAreaIsScrollBarVisible () ? "287px" : "306px";
}



function newsListClear (inAutomaticDelayedMessageStrOrNullToClear)
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Use this to clear the entire list to empty, both visually and data-wise.
//
// Since the user will be left with an empty list, the given message string will be shown.  If it is null, any previously-showing string
// is cleared from the display.  If non-null, the string will be scheduled to be shown after a second or so of delay, unless, before that
// delay is up, one or more list-add requests come in.  It is OK to call this routine solely for reporting an error; just know that the
// list items will of course be deleted in that case; this is the design of the list, that no simultaneous contents + message are supported.
// The null option should be used to clean up any old display when doing a hard change such as a league switch for example.
//
{
	var dataDiv = document.getElementById ("iNewsData");
	var messageDiv = document.getElementById ("iNewsMessage");
	
	// Loop for our entire list
	//
	for (var i = 0;   i < gNewsListItemsArray.length;   i++)
	{
		if (gNewsListItemsArray[i].isActive == true)
		{
			// remove from screen
			dataDiv.removeChild (gNewsListItemsArray[i].htmlElement);
			
			// set our accounting; setting inactive means all other fields are invalid
			gNewsListItemsArray[i].isActive = false;
		}
	}
	
	// Call scroll area refresh to be sure the area and scroll bar show/hide/size are updated (empty area now):
	//
	scrollAreaRefresh ();
	
	// Affect message display mode as desired:
	//
	if (null != gNewsListMessageDelayTimer) clearTimeout (gNewsListMessageDelayTimer);
	gNewsListMessageStr = inAutomaticDelayedMessageStrOrNullToClear;
	if (null == gNewsListMessageStr)
	{
		messageDiv.innerText = "";
		messageDiv.display = "none";
	}
	else
	{
		gNewsListMessageDelayTimer = setTimeout (newsListDelayedMessageHandler, kDelayBeforeWhyIsListEmptyMessageMs);
	}
}



function newsListShow (inShowing)
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Passing TRUE turns on the news area; FALSE turns it off.
//
{
	if (inShowing)
	{
		document.getElementById ("iNewsContainer").style.display = "block";
		newsListRefresh ();
	}
	else
	{
		document.getElementById ("iNewsContainer").style.display = "none";
	}
}



function newsListDelayedMessageHandler ()
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Internal routine.
//
{
	var messageDiv = document.getElementById ("iNewsMessage");
	
	gNewsListMessageDelayTimer = null;
	messageDiv.style.display = "block";
	messageDiv.innerText = gNewsListMessageStr;
}



function newsListOnClickedItem (inEvent, inURL)
//
// News-List API: "Class" that displays a list of clickable news headlines.
//
// Internal routine.
//
{
	if (window.widget)
	{
		widget.openURL (inURL);	
	}
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function scoresHeaderSetLeague (inLeague, inSubevent)
//
// Scores-Header API: "Class" that displays the legend of what the columns in a scores-list signify.
//
// Visually switch the header to that of a sport kind for the sports league that is given.  For some sport kinds, there are
// subevent names such as "Mens Quarterfinals", so if that string is given (can be null) it is added to the layout.
//
{
	var desiredKindName = getKindNameFromLeagueName (inLeague);
	var containerDiv = document.getElementById ("iScoresHeaderContainer");
	var newHeaderDiv;
	
	// Clear out any old header div and its subdivs that might be there or not:
	//
	while (containerDiv.hasChildNodes ())
		containerDiv.removeChild (containerDiv.firstChild);
	
	// Create a new header div and install in the HTML hierarchy that's hardcoded in the html file:
	//
	newHeaderDiv = addNewElement (containerDiv, 'div', null, null, null);
	
	// Populate header div with kind-specific layout and data:
	//
	switch (desiredKindName)
	{
	case "baseball":
		// Future expasion: Draw legend header for inning numbers (1 2 3 4 5 6 7 8 9) and R H E (run hits errors),
		// but beware with such a layout for overtime innings.
	break;
	
	case "football":
		// Future expasion: Draw legend header for quarter numbers (1 2 3 4) and overtime (OT) and total (T).
	break;
	
	case "basketball":
		// Future expasion: Draw legend header for quarter numbers (1 2 3 4) and overtime (OT) and total (T).
	break;
	
	case "soccer":
		// Future expasion: Draw legend header for Team - Score - Team.
	break;
	
	case "hockey":
		// Future expasion: Draw legend header for period numbers (1 2 3) and overtime (OT) and total (T).
	break;
	
	case "golf":
		// Do not draw legend headers for name and start, currently.
		addNewElement (newHeaderDiv, 'div', "sScoresHeader-golf-thru", getLocalizedString ("Thru"), null);
		addNewElement (newHeaderDiv, 'div', "sScoresHeader-golf-score", getLocalizedString ("Score"), null);
	break;
	
	case "racing":
		// Do not draw legend headers for name (driver) and rank and points, currently.
	break;
	
	case "tennissingles":
		addNewElement (newHeaderDiv, 'div', "sScoresHeader-tennissingles-description", inSubevent, null);
	break;
	
	case "tennisdoubles":
		addNewElement (newHeaderDiv, 'div', "sScoresHeader-tennisdoubles-description", inSubevent, null);
	break;
	}
}



function scoresHeaderShow (inShowing)
//
// Scores-Header API: "Class" that displays the legend of what the columns in a scores-list signify.
//
// Passing TRUE turns on the scores header; FALSE turns it off.
//
{
	if (inShowing)
		document.getElementById ("iScoresHeaderContainer").style.display = "block";
	else
		document.getElementById ("iScoresHeaderContainer").style.display = "none";
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function scoresListInit ()
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// One-time routine to be called to initialize.
//
// This scores list "class" is what is filled with game results, and is what is attached to the scrollable area.
// There is only one global scores list, so when switching leagues, it must be cleared and slowly repopulated.
//
{
	var i;
	
	// We use a global next-sequence-number to know which item is the oldest:
	//
	gScoresListAddSequence = 0;
	
	// We have an array of data records per-item (we could store them as user-defined attributes
	// of the item DIVs as well but beware multiple DIVs that are related to a single item):
	//
	for (i = 0;   i < gScoresListItemsArray.length;   i++)
	{
		var aNewArrayItem =
		{
			// Kept across clears:
			index:								i,				// 0..N index for item vert coordinate calc and general use
			
			// Indicates validity of the rest:
			isActive:							false,			// whether this array slot is in use (only list-clear-all clears it)
			
			// Valid only if active; initialized when activated:
			sequence:							0,				// the "born on" "date" of this item (lower values = older)
			gameId:								null,			// the ESPN unique identifier of this game event
			gameUrl:							null,			// a URL to a web page with more information
			htmlElementOfElements:				null,			// for accessing graphical representation: populated with a hierarchy
			htmlElementSeparatorExtender:		null,			// the separator extender element, one of many within the hierarchy
			htmlElementSelectionHighlighter:	null,			// the highligher overlay element, one of many within the hierarchy
			layoutRowType:						null,			// the "1row" or "2row" tallness type
			y1:									0,				// the upper/lower coordinates of the graphical representation
			y2:									0,				// within the coord system of the entire div that is scrolled
			isSelected:							false			// whether the user clicked to select this entire item
		};
		gScoresListItemsArray[i] = aNewArrayItem;
	}
	
	// There can be a user-selected game, or none.  If none, then null, else a game id string:
	//
	gScoresListSelectedGameId = null;
	
	// We have a global that carries whether or not we are showing a message or content, but never both:
	//
	gScoresListMessageStr = null;
	gScoresListMessageDelayTimer = null;
}



function scoresListSetOnClickedItemClientCallback (inCallback)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Set the proc to be called when the user clicks on an item; it is called with a bunch of parameters
// (DOMEvent, GameID or NULL that is now current as result of click, GameID clicked on, URL clicked on):
//
{
	gScoresListOnClickedItemClientCallback = inCallback;
}



function scoresListAddOrUpdate (inGameId, inKind, inPhase, inWhen,
								inTeamA, inTeamB, inScoreA, inScoreB, inIntraGameDataArrayA, inIntraGameDataArrayB,
								inGameUrl)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Adds-new or updates-existing game to the score list.  If it was existing and highlighted, that is preserved.
//
// Multiple sports kinds ("baseball", "football", etc) may NOT be mixed within a list.  Once this routine is
// called with a specific kind after an init or clear, all other add/update calls MUST be of the same kind.
//
// If the game already exists, it is updated, even if it is currently in view (in-view-ness depends on the
// current scoller position).
//
// If the game does not already exist, it is added.  If the hardcoded maximum number of games has been reached,
// a victim is chosen for replacement with the given one.  If at all possible, the victim will never be one that
// is currently in view (depending on the current scroller position) and then, all other things being equal,
// attempts to be least-recently-added.
//
// "Game ID" should be passed as the EPSN unique tag that identifies this game = a unique team-pairing event at
// a specific location in time.
//
// "Kind" is the activity-identifier-string used throughtout this widget (ie, "football", "baseball", etc); this
// determines the layout format.
//
// "Phase" should be one of "unknown"/"upcoming"/"inprogress"/"final".  This will determine the visiblity and
// color of the "When" display.
//
// "When" should be passed as an UNLOCALIZED string indicating the current time-stage of the game such as "Final",
// "Halftime", "3rd Quarter", or even a start time such as "7:30 PM ET".  It will be localized prior to display.
//
// "TeamA" and "TeamB" are the team name strings; for individual sports, pass null for TeamB.
//
// "ScoreA" and "ScoreB" are the current master scores; for individual sports, pass null for ScoreB.
//
// "IntraGameDataArrayA" and "IntraGameDataArrayB" can be variable-length arrays of strings; their string
// members are used to populate kind-specific details of events within a game.  Array positions from 0-to-N will
// always correspond to score-header-columns from left-to-right and will never include the master scores.  The
// possibilities are quite varied; here are some examples: per-quarter-scores (football); start tee (golf); inning
// score numbers plus hits plus errors (baseball); set/game details (tennis); rank (racing); per-period-scores
// (hockey); etc.
//
// "Game URL" should be a string for a URL that the user can go to for more information about this game.
//
{
	var dataDiv = document.getElementById ("iScoresData");
	var messageDiv = document.getElementById ("iScoresMessage");
	var aVictimArrayItem;
	var theArrayItemToFillIn;
	var theNewElementOfElementsThatIsAnItemInScrollableArea;
	var i;
	
	// Reset from any message showing mode:
	//
	gScoresListMessageStr = null;
	messageDiv.style.display = "none";
	if (null != gScoresListMessageDelayTimer) clearTimeout (gScoresListMessageDelayTimer);
	gScoresListMessageDelayTimer = null;
	
	// Find a slot in our array to put the new data in.  This can either be that of an existing game, or
	// else the first available one if the array is not full, or else a replacement victim if it is full.
	// After this, "theArrayItemToFillIn" will be set to the correct slot in our accounting array: 
	//
	theArrayItemToFillIn = null;
	for (i = 0;   i < kScoresListMaxNumItems;   i++)						// before anything else, look for pre-existing game
	{
		if ((true == gScoresListItemsArray[i].isActive) &&
			(inGameId == gScoresListItemsArray[i].gameId))
		{
			theArrayItemToFillIn = gScoresListItemsArray[i];				// active and matching game, so we will be using-that
			break;
		}
	}
	if (null == theArrayItemToFillIn)										// didn't find a matching game
	{
		for (i = 0;   i < kScoresListMaxNumItems;   i++)					// so try to find an empty slot
		{
			if (false == gScoresListItemsArray[i].isActive)					// empty slot in array, so we will be adding-new
			{
				theArrayItemToFillIn = gScoresListItemsArray[i];
				break;
			}
		}
	}
	if (null == theArrayItemToFillIn)										// found no matching game, found no empty slot
	{
		aVictimArrayItem = getOldestUnseenActiveItemInItemsArray			// so try to find a victim slot
			(gScoresListItemsArray,
				gScrollAreaNowViewingFromThisContentTop,
				gScrollAreaNowViewingFromThisContentTop + 
				getRenderValue (null, "iMiddleOfVaryingHeightContainer", "height"));
		if (null != aVictimArrayItem)
		{																	// got a victim, so we will be using-that
			theArrayItemToFillIn = aVictimArrayItem;
		}
	}
	if (null == theArrayItemToFillIn)										// found no matching game, no empty slot, and unable to find
	{																		// a victim; this should never happen; fallback using-slot-0
		theArrayItemToFillIn = gScoresListItemsArray[0];
	}
	
	// The array item found above may or may not be already-active.  If it is, we are about to recycle it,
	// so clear its contents (delete its element tree from the render, for example):
	//
	if (true == theArrayItemToFillIn.isActive)
	{
		dataDiv.removeChild (theArrayItemToFillIn.htmlElementOfElements);	// remove the collection that make up visible parts
		theArrayItemToFillIn.htmlElementOfElements = null;					// that made up the old team A vs team B "line" item
		theArrayItemToFillIn.isActive = false;								// and also clear array items for now
	}
	
	// Make element and add to visible render of scrollable area.  We will be modifying it and adding to it; see below:
	//
	theNewElementOfElementsThatIsAnItemInScrollableArea = addNewElement (dataDiv, 'div', "sScoresListItem", null, null);
	
	// Re-create the highlight status if this Game ID already existed in the visible list and was highlighted:
	//
	var initWithHighlightOn = (inGameId == gScoresListSelectedGameId);
	
	// Call helper routine to put up the graphics per kind-specific layout presentation and also init all the
	// accounting for this data item.  This includes but is not limited to these things:  Modify the item element
	// for correct 1row/2row-height (to affect scroll calc); add lots of sub-elements and sub-sub-elements with
	// styles; fill with data; set data items in our accounting array; arrange code to be called when clicked on:
	//
	scoresListItemInit (theArrayItemToFillIn, theNewElementOfElementsThatIsAnItemInScrollableArea,
						initWithHighlightOn,
						inGameId, inKind,
						inPhase, inWhen,
						inTeamA, inTeamB, inScoreA, inScoreB, inIntraGameDataArrayA, inIntraGameDataArrayB,
						inGameUrl);
	
	// Call scroll area refresh to be sure the area and scroll bar show/hide/size are updated as per content:
	//
	scrollAreaRefresh ();
	
	// Call our refresh routine to be sure our content is fixed up depending on scroll bar visibility, etc:
	//
	scoresListRefresh ();
}



function scoresListRefresh ()
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Ensure the scores list is in good shape for display based on what's been actually happening with the shared scroll area.
// For example, depending on how big vertically the containing DIV is right now (possibly after a recent add of an item, or
// a switch from another use of the scroll area), there may or may not be a scroll bar visible, etc, and we want to cause
// those things to affect how list items look. 
//
{
	var i;
	var showHideExtender;
	
	//  For entire list, turn on/off the separator-line-extender images if scroll bar absent/present, respectively:
	//
	if (false == scrollAreaIsScrollBarVisible ())
		showHideExtender = "block";
	else
		showHideExtender = "none";
	for (i = 0;   i < gScoresListItemsArray.length;   i++)
	{
		if (gScoresListItemsArray[i].isActive == true)
			gScoresListItemsArray[i].htmlElementSeparatorExtender.style.display = showHideExtender;
	}
}



function scoresListClear (inAutomaticDelayedMessageStrOrNullToClear)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Instantly removes all games from the list, both visually and accounting-wise.
//
// Since the user will be left with an empty list, the given message string will be shown.  If it is null, any previously-showing string
// is cleared from the display.  If non-null, the string will be scheduled to be shown after a second or so of delay, unless, before that
// delay is up, one or more list-add requests come in.  It is OK to call this routine solely for reporting an error; just know that the
// list items will of course be deleted in that case; this is the design of the list, that no simultaneous contents + message are supported.
// The null option should be used to clean up any old display when doing a hard change such as a league switch for example.
//
{
	var dataDiv = document.getElementById ("iScoresData");
	var messageDiv = document.getElementById ("iScoresMessage");
	
	// Loop for our entire list
	//
	for (var i = 0;   i < gScoresListItemsArray.length;   i++)
	{
		if (gScoresListItemsArray[i].isActive == true)
		{
			// remove from screen
			dataDiv.removeChild (gScoresListItemsArray[i].htmlElementOfElements);
			
			// set our accounting; setting inactive means all other fields are invalid
			gScoresListItemsArray[i].isActive = false;
		}
	}
	
	// Call scroll area refresh to be sure the area and scroll bar show/hide/size are updated (empty area now):
	//
	scrollAreaRefresh ();
	
	// Clear the globals that indicate the 0 or 1 game that is selected:
	//
	gScoresListSelectedGameId = null;
	
	// Affect message display mode as desired:
	//
	if (null != gScoresListMessageDelayTimer) clearTimeout (gScoresListMessageDelayTimer);
	gScoresListMessageStr = inAutomaticDelayedMessageStrOrNullToClear;
	if (null == gScoresListMessageStr)
	{
		messageDiv.innerText = "";
		messageDiv.display = "none";
	}
	else
	{
		gScoresListMessageDelayTimer = setTimeout (scoresListDelayedMessageHandler, kDelayBeforeWhyIsListEmptyMessageMs);
	}
}



function scoresListShow (inShowing)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Passing TRUE turns on the scores listing area; FALSE turns it off.
//
{
	if (inShowing)
	{
		document.getElementById ("iScoresContainer").style.display = "block";
		scoresListRefresh ();
	}
	else
	{
		document.getElementById ("iScoresContainer").style.display = "none";
	}
}



function scoresListDelayedMessageHandler ()
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine.
//
{
	var messageDiv = document.getElementById ("iScoresMessage");
	
	gScoresListMessageDelayTimer = null;
	messageDiv.style.display = "block";
	messageDiv.innerText = gScoresListMessageStr;
}



function scoresListItemInit (inScoresListArrayItem, inItemRootElement, inInitiallyHighlighted,
							inGameId, inKind,
							inPhase, inWhen,
							inTeamA, inTeamB, inScoreA, inScoreB, inIntraGameDataArrayA, inIntraGameDataArrayB,
							inGameUrl)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: For a new Item, for a specific sport-kind, fill in accounting data and add to the HTML render. 
//
{
	// To the item's all-encompassing HTML element: Add a datum so that we can refer back to this item's accounting when
	// given the element; note that we do this by adding our own property to its stock properties:
	//
	inItemRootElement.myScoresListArrayIndex = inScoresListArrayItem.index;
	
	// To the item's entry in our accounting array: Keep the vertical coordinates of where this item is among all items;
	// leave inScoresListArrayItem.y1/y2 and theItemHeightPx set up for code below; NOTE: We assume no mixed-sports within
	// a list (no mixed heights):
	//
	var theItemHeightPx;
	if (gKindsArray[inKind].layoutRowType == "1row") theItemHeightPx = kScoresList_1row_HeightPx;
	if (gKindsArray[inKind].layoutRowType == "2row") theItemHeightPx = kScoresList_2row_HeightPx;
	inScoresListArrayItem.y1 = (inScoresListArrayItem.index + 0) * theItemHeightPx;
	inScoresListArrayItem.y2 = (inScoresListArrayItem.index + 1) * theItemHeightPx;
	
	// To the item's all-encompassing HTML element: Set the positioning, now that we have coord limits found out above
	// (we are handling it; we are not relying on CSS/HTML flow) of the item element:
	//
	inItemRootElement.style.top = (inScoresListArrayItem.y1).toString() + "px";
	inItemRootElement.style.height = theItemHeightPx + "px";
	// to test: alert ("\n\nscoresListItemInit: y1="+inScoresListArrayItem.y1 + " y2=" + inScoresListArrayItem.y2 +"   h="+theItemHeightPx);
	
	// To the item's all-encompassing HTML element: Add the (correct type of) separator-line HTML image; the image is
	// kind-specific, and style is layoutrowtype-specific:
	//
	addNewElement (inItemRootElement, 'img',
		"sScoresListDivider-" + (gKindsArray[inKind].layoutRowType),
		null, "Images/dividers/divider_" + inKind + ".png");
	
	// To the item's all-encompassing HTML element: Add the separator-line-extender HTML image for use if there are not
	// enough items currently visible to make the scroll bar appear and thus we want to extend the separator line all
	// the way out to the right side; we turn it off for now, it is turned on as needed, later, by our caller:
	//
	var theSeparatorExtenderElementWithinTheElements = addNewElement (inItemRootElement, 'img',
		"sScoresListDividerExtender-" + gKindsArray[inKind].layoutRowType,
		null, "Images/dividers/divider_extension.png");
	theSeparatorExtenderElementWithinTheElements.style.display = "none";
	
	// To the item's all-encompassing HTML element: Add the (correct type of) highlighter HTML image for use if selected;
	// it will be on or off, initially, as per param; leave var theSelectionHighligherElementWithinTheElements set up for
	// use below:
	//
	var theSelectionHighligherElementWithinTheElements = addNewElement (inItemRootElement, 'img',
		"sScoresListHighlighter", null, "Images/selection_" + (gKindsArray[inKind].layoutRowType) + ".png");
	if (false == inInitiallyHighlighted)
		theSelectionHighligherElementWithinTheElements.style.display = "none";
	else
		theSelectionHighligherElementWithinTheElements.style.display = "block";
	
	// To the item's entry in our accounting array: Keep a pointer to the HTML element for access, keep pointers to the
	// separator-extender and highlighter HTML elements (obtained above) for access (they are within the previous element
	// hierarchy so no need to separately delete when that time comes), keep game ID for matching, keep game URL for
	// click-through, clear selected state bit:
	//
	inScoresListArrayItem.htmlElementOfElements = inItemRootElement;
	inScoresListArrayItem.gameId = inGameId;
	inScoresListArrayItem.gameUrl = inGameUrl;
	inScoresListArrayItem.htmlElementSeparatorExtender = theSeparatorExtenderElementWithinTheElements;
	inScoresListArrayItem.htmlElementSelectionHighlighter = theSelectionHighligherElementWithinTheElements;
	inScoresListArrayItem.layoutRowType = gKindsArray[inKind].layoutRowType;
	inScoresListArrayItem.isSelected = false;
	
	// To the item's entry in our accounting array: Keep a "born on" "date" to use for least-recent (LRU) replacement:
	//
	inScoresListArrayItem.sequence = gScoresListAddSequence;
	gScoresListAddSequence++;
	
	// To the item's all-encompassing HTML element: Arrange to be called when the user clicks anywhere in it:
	//
	inItemRootElement.setAttribute ('onclick', "scoresListOnClickedItem (event, this);");
	
	// To the item's all-encompassing HTML element: Add the following HTML items to the render (by using a kind-specific
	// routine): Team(s); Master score(s); detailed intra-game data; "When" (game start or time-in-game).  The various sport
	// kinds are different enough that this is best done this way in code instead of being fully data-driven:
	//
	var functionCallStr = "scoresListItemInit_" + inKind +
		"(inItemRootElement, inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB, inIntraGameDataArrayA, inIntraGameDataArrayB)";
	eval (functionCallStr);
		
	// To the item's entry in our accounting array:  This item now fully done, so set active state bit:
	//
	inScoresListArrayItem.isActive = true;
}



function scoresListOnClickedItem (inEvent, inHTMLElement)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Gets called by system when user clicks on a list item, so do the graphical highlighting
// process and make the callback to our client.
//
{
	// Identify which array item this is; get data from it; sanity check to exit if inactive (should never happen):
	//
	var clickedId = gScoresListItemsArray[inHTMLElement.myScoresListArrayIndex].gameId;
	var clickedEl = gScoresListItemsArray[inHTMLElement.myScoresListArrayIndex].htmlElementSelectionHighlighter;
	var clickedUr = gScoresListItemsArray[inHTMLElement.myScoresListArrayIndex].gameUrl;
	if (false == gScoresListItemsArray[inHTMLElement.myScoresListArrayIndex].isActive) return;
	
	// We can have zero, or one exclusive, item selected:
	//
	if (clickedId == gScoresListSelectedGameId)
	{
		// Clicked item already selected, so unselect it: turn off highlight and unset globals:
		//
		clickedEl.style.display = "none";
		gScoresListSelectedGameId = null;
	}
	else
	{
		// Clicked item was dark, so set it as current: turn off highlight of any old one first,
		// then turn on highlight and set globals to it:
		//
		if (null != gScoresListSelectedGameId)
		{
			for (var i = 0;   i < gScoresListItemsArray.length;   i++)
				if (true == gScoresListItemsArray[i].isActive)
					if (gScoresListItemsArray[i].gameId == gScoresListSelectedGameId)
						gScoresListItemsArray[i].htmlElementSelectionHighlighter.style.display = "none";
		}
		clickedEl.style.display = "block";
		gScoresListSelectedGameId = clickedId;
	}
	
	// Call the client to indicate the click, passing the DOM event, the ID-if-selected-or-NULL-if-none, the
	// ID clicked on regardless of select/unselect, and the URL clicked on regardless:
	//
	if (null != gScoresListOnClickedItemClientCallback)
		gScoresListOnClickedItemClientCallback (inEvent, gScoresListSelectedGameId, clickedId, clickedUr);
}



function scoresListItemInitBasicTwoTeamNamesAndWhen (inKind, inItemRootElement, inPhase, inWhen, inTeamA, inTeamB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Helper for many of the more common cases found in the scoresListItemInit_* routines below;
// we do accept one layout-modifying parameter: the X coordinate of where the styled "When" element should go.
//
{
	var subDivElement, subSubSpanElement;
	
	// Fill in two team names, note the use of two CSS declarations, sScoresList-Common-Team, and
	// sScoreList-Common-kindnamefilledinhere, that will both apply:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-" + inKind + "-TeamA", inTeamA, null);
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-" + inKind + "-TeamB", inTeamB, null);
	
	// Fill in the When datum, which is either when the game is scheduled to start or what phase if in-progress;
	// its placement and centering is set according to the kind, and its color is set based on the phase info.
	// Note that we add an encompassing DIV element for css-driven placement, and then a SPAN within that for css-driven
	// color.  Note that the DIV has a programmaticaly-chosen CSS style and the SPAN has a static style plus a
	// programmatically-chosen style:
	//
	subDivElement = addNewElement (inItemRootElement, 'div', "sScoresList-" + inKind + "-When", null, null);

	//special case for "Final - 2nd OT" and similar strings to spread them onto two lines. 4387615
	if(inWhen.length > 12 && inWhen.indexOf("-") != -1)
	{
		inWhen = inWhen.replace(/-/, "\n")
		subDivElement.style.top = "6px"
	}

	subSubSpanElement = addNewElement (null, 'span',
		"sScoresListWhenSpan-Common + sScoresListWhenSpan-" + inPhase,
		getLocalizedString (inWhen), null);
	subDivElement.appendChild (subSubSpanElement);
}



function scoresListItemInit_baseball (inItemRootElement,
										inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
										inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	var subDivElement, subSubSpanElement;
	
	// This is a basic team sport with the usual two teams and the usual time info:
	//
	scoresListItemInitBasicTwoTeamNamesAndWhen ("baseball", inItemRootElement, inPhase, inWhen, inTeamA, inTeamB);
	
	// If the game has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// We only consider Runs are passed in Score.  Future expansion: We will consider RHE (Runs, Hits, Errors).
	// This why we add to the given root element, a 2-level hierarchy of DIV/SPAN, giving the higher-level DIV two
	// CSS style influences, and the lower level SPAN one:
	//
	subDivElement = addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-baseball-RHEA", null, null);
	subSubSpanElement = addNewElement (null, 'span', "sScoresList-baseball-RHE-span", inScoreA, null);
	subDivElement.appendChild (subSubSpanElement);
	
	// Same as above but for team B:
	//
	subDivElement = addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-baseball-RHEB", null, null);
	subSubSpanElement = addNewElement (null, 'span', "sScoresList-baseball-RHE-span", inScoreB, null);
	subDivElement.appendChild (subSubSpanElement);
	
	// Future expansion: Inning-score intra-game data can be obtained from the intra game data parameters
	// and styled with new CSS entries such as "sScoresList-Common-IntraGameData + sScoresList-baseball-InningsA/B".
}



function scoresListItemInit_football (inItemRootElement,
										inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
										inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	// This is a basic team sport with the usual two teams and the usual time info:
	//
	scoresListItemInitBasicTwoTeamNamesAndWhen ("football", inItemRootElement, inPhase, inWhen, inTeamA, inTeamB);
	
	// If the game has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// Team A: Set up the given master score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-football-ScoreA", inScoreA, null);
	
	// Future expansion: Quarter detail data: Quarter-1..4-subscores can be passed passed in intra game data index
	// 0..3; and then the overtime detail score given in intra game data index 4 can be added.  A CSS style invocation
	// with data added to the CSS file might look like: "sScoresList-Common-IntraGameData + sScoresList-football-QuartersA".
	
	// Same as above but for team B: Master score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-football-ScoreB", inScoreB, null);
}



function scoresListItemInit_basketball (inItemRootElement,
										inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB, inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	// This is a basic team sport with the usual two teams and the usual time info:
	//
	scoresListItemInitBasicTwoTeamNamesAndWhen ("basketball", inItemRootElement, inPhase, inWhen, inTeamA, inTeamB);
	
	// If the game has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// Team A: Set up the given master score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-basketball-ScoreA", inScoreA, null);
	
	// Future expansion: Quarter detail data: Quarter-1..4-subscores could be passed in intra game data index 0..3; also
	// the overtime detail score given in intra game data index 4; we would add to given root element a div with a style
	// like "sScoresList-Common-IntraGameData + sScoresList-basketball-QuartersA/B" and subelements within that.
	
	// Same as above but for team B: Master score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-basketball-ScoreB", inScoreB, null);
	
}



function scoresListItemInit_soccer (inItemRootElement,
									inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
									inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	var subDivElement, subSubSpanElement;
	
	// Fill in A and B team names:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-soccer-TeamA", inTeamA, null);
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-soccer-TeamB", inTeamB, null);
	
	// Fill in the When datum, which is either when the game is scheduled to start or what phase it is in if in-progress;
	// its placement and centering is set in a soccer-specific way, and its color is set based on the phase info:
	//
	subDivElement = addNewElement (inItemRootElement, 'div', "sScoresList-soccer-When", null, null);
	subSubSpanElement = addNewElement (null, 'span',
		"sScoresListWhenSpan-RightJust + sScoresListWhenSpan-" + inPhase,
		getLocalizedString (inWhen), null);
	subDivElement.appendChild (subSubSpanElement);
	
	// If the game has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// Set up the master score in "A - B" format:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-soccer-ScoresAB", inScoreA + " - " + inScoreB, null);
}



function scoresListItemInit_hockey (inItemRootElement,
									inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB, inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	// This is a basic team sport with the usual two teams and the usual time info:
	//
	scoresListItemInitBasicTwoTeamNamesAndWhen ("hockey", inItemRootElement, inPhase, inWhen, inTeamA, inTeamB);
	
	// If the game has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// Team A and B: Set up the given master score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-hockey-ScoreA", inScoreA, null);
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-hockey-ScoreB", inScoreB, null);
	
	// Future expansion: Team A and B period detail data: Passed in intra game data parameters, can be laid out
	// using a CSS style of "sScoresList-Common-IntraGameData + sScoresList-hockey-PeriodsA" and "-B", plus one
	// of overtime, for example.
}



function scoresListItemInit_golf (inItemRootElement,
									inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
									inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	var subDivElement, subSubSpanElement;
	
	// Fill team (player) name:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-golf-Name", inTeamA, null);
	
	// There is no "When" supported in the golf layout.
	
	// Fill in the Thru datum, which is something mysterious and maybe sort of like "When"; its placement and centering
	// is set in a golf-specific way, and its color is set based on the unlocalized string that we try to parse:
	//
	subDivElement = addNewElement (inItemRootElement, 'div', "sScoresList-golf-Thru", null, null);
	subSubSpanElement = addNewElement (null, 'span',
		"sScoresListWhenSpan-Common + sScoresListWhenSpan-" + inPhase,
		getLocalizedString (inWhen), null);
	subDivElement.appendChild (subSubSpanElement);
	
	// Set up the start field from intra game data index 0, styled like a score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-golf-Start", inIntraGameDataArrayA[0], null);
	
	// If the game has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// Set up the master score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-golf-Score", inScoreA, null);
}



function scoresListItemInit_racing (inItemRootElement,
									inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
									inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	// Fill team (driver) name:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-racing-Driver", inTeamA, null);
	
	// There is no "When" supported in the racing layout.
	
	// If the game (race) has not happened yet, then exit now before adding any score data:
	//
	if ("upcoming" == inPhase) return;
	
	// Set up the master score (points):
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-racing-Points", inScoreA, null);
	
	// Set up the rank field from intra game data index 0, styled like a score:
	//
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-racing-Rank", inIntraGameDataArrayA[0], null);
}



function scoresListItemInit_tennissingles (inItemRootElement,
											inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
											inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	var aStr, subDivElement, subSubSpanElement, i;
	
	// Fill in A and B team names (player names) in a rather conversational When-dependent format: "A versus B" if upcoming,
	// "A leads B" format if in-progress, or "A defeats B" if final.  Styled like other kinds' team names:
	//
	var valueA = parseInt (inScoreA, 10);
	var valueB = parseInt (inScoreB, 10);
	aStr = "";
	if ("upcoming" == inPhase)
	{
		aStr = inTeamA + " " + getLocalizedString ("versus") + " " + inTeamB;
	}
	if ("inprogress" == inPhase)
	{
		if (valueA == valueB)
			aStr = inTeamA + " " + getLocalizedString ("versus") + " " + inTeamB;
		if (valueA > valueB)
			aStr = inTeamA + " " + getLocalizedString ("leads") + " " + inTeamB;
		if (valueA < valueB)
			aStr = inTeamB + " " + getLocalizedString ("leads") + " " + inTeamA;
	}
	if ("final" == inPhase)
	{
		if (valueA == valueB)
			aStr = inTeamA + " " + getLocalizedString ("ties") + " " + inTeamB;
		if (valueA > valueB)
			aStr = inTeamA + " " + getLocalizedString ("defeats") + " " + inTeamB;
		if (valueA < valueB)
			aStr = inTeamB + " " + getLocalizedString ("defeats") + " " + inTeamA;
	}
	addNewElement (inItemRootElement, 'div', "sScoresList-Common-Team + sScoresList-tennissingles-NamesInfoLine", aStr, null);
	
	// Fill in the When datum, which is either when the game is scheduled to start or what phase it is in if in-progress;
	// its placement and centering is set in a tennis-specific way, and its color is set based on the phase info:
	//
	subDivElement = addNewElement (inItemRootElement, 'div', "sScoresList-tennissingles-When", null, null);
	subSubSpanElement = addNewElement (null, 'span',
		"sScoresListWhenSpan-Common + sScoresListWhenSpan-" + inPhase,
		getLocalizedString (inWhen), null);
	subDivElement.appendChild (subSubSpanElement);
	
	// If the game has started or finished, fill in the scores detail list (sets) from the intra game index arrays.
	// Styled like other kinds' master scores:
	//
	if ("upcoming" != inPhase)
	{
		aStr = "";
		var aIntraScoreOrNot;
		var bIntraScoreOrNot;
		var addCommaOrNot = "";
		for (i = 0;   i <= 10;   i++)
		{
			aIntraScoreOrNot = inIntraGameDataArrayA[i];
			bIntraScoreOrNot = inIntraGameDataArrayB[i];
			if ((aIntraScoreOrNot != undefined) && (bIntraScoreOrNot != undefined))
			{
				aStr = aStr + addCommaOrNot + aIntraScoreOrNot.toString() + "-" + bIntraScoreOrNot.toString();
				addCommaOrNot = ", ";
			}
		}
		addNewElement (inItemRootElement, 'div', "sScoresList-Common-Score + sScoresList-tennissingles-ScoresInfoLine", aStr, null);
	}
}



function scoresListItemInit_tennisdoubles (inItemRootElement,
											inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
											inIntraGameDataArrayA, inIntraGameDataArrayB)
//
// Scores-List API: "Class" that displays a list of clickable scores in a sport-kind-specific layout format.
//
// Internal routine: Render given data into kind-specific format.
//
{
	// For now, exactly the same as tennis singles:
	//
	scoresListItemInit_tennissingles (inItemRootElement,
										inPhase, inWhen, inTeamA, inTeamB, inScoreA, inScoreB,
										inIntraGameDataArrayA, inIntraGameDataArrayB);
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function crawlAreaInit ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// One-time routine to be called to initialize.
// This crawl "class" maintains the crawling ticker-tape like thing on at the bottom; it supports being
// added to and subtracted from and an oldest-replacement feature.
// There is only one global crawl, so when switching sports, it must be cleared and slowly repopulated.
//
{
	var i, aNewArrayItem;
	
	// Init for global and local reference:
	//
	gCrawlDataAreOnRequest = false;
	gCrawlContainerElement = document.getElementById ("iCrawlContainer");
	var crawlDataDiv = document.getElementById ("iCrawlData");
	
	// Clear out any old:
	//
	while (crawlDataDiv.hasChildNodes ())
		crawlDataDiv.removeChild (crawlDataDiv.firstChild);
	
	// Fill a global array with N slots for items on the crawl; they can be inactive or active; when all are
	// active, any new one to be added will cause the oldest one to get reused:
	//
	for (i = 0;   i < gCrawlItemsArray.length;   i++)
	{
		aNewArrayItem = { isShowing:false, x1:0, x2:0, tagStr:null, htmlElement:null, htmlElementSub1:null, htmlElementSub2:null, htmlElementSub3:null };
		
		aNewArrayItem.htmlElement = document.createElement ('div');
		aNewArrayItem.htmlElement.setAttribute ("class", "sCrawlItem");
		aNewArrayItem.htmlElementSub1 = document.createElement ('span');
		aNewArrayItem.htmlElementSub2 = document.createElement ('span');
		aNewArrayItem.htmlElementSub3 = document.createElement ('span');
		aNewArrayItem.htmlElement.appendChild (aNewArrayItem.htmlElementSub1);
		aNewArrayItem.htmlElement.appendChild (aNewArrayItem.htmlElementSub2);
		aNewArrayItem.htmlElement.appendChild (aNewArrayItem.htmlElementSub3);
		
		crawlDataDiv.appendChild (aNewArrayItem.htmlElement);
		
		gCrawlItemsArray[i] = aNewArrayItem;
	}
	
	// Set up for using AppleAnimator class to support fade in/out:
	//
	gCrawlFadeState = "none";
	gCrawlFadeAnimator = new AppleAnimator (kCrawlFadeDurationMs, kCrawlFadeIntervalMs);
	gCrawlFadeAnimation = new AppleAnimation (0, 100, crawlAreaFadeFrameHandler);
	gCrawlFadeAnimator.addAnimation (gCrawlFadeAnimation);
}



function crawlAreaStart ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Start (or unfreeze) movement.
//
{
	// Start handler; if there is nothing existing yet or since last clear then the handler may turn it off again
	// almost immediately, otherwise with data existing, motion will resume:
	//
	crawlAreaTimerEnsureOnOff ("on");
}



function crawlAreaStop ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Stop (freeze) movement but leave any current in-view marquee contents visible.
//
{
	// Stop handler to save CPU time, etc:
	//
	crawlAreaTimerEnsureOnOff ("off");
}



function crawlAreaClear ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Instantly remove all current and queued items, ie, for use when switching sports.  Any in-view
// items disappear from the marquee, and the internal items-list is emptied.
//
{
	// Clear the flag that is used to turn the handler off to save CPU time:
	//
	gCrawlDataAreOnRequest = false;
	
	// Erase the normal queue and zap the accounting+visuals.  Note that we don't turn off the handler but it
	// will soon turn itself off if no data are on request:
	//
	crawlAreaKillNormalQueueAndActivesAndVisuals ();
}



function crawlAreaDipToBlackClear ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Fades the moving crawl to black (transparent), clears all current items, and fades it back up to full intensity.
// The moment this routine is called, any new crawlAreaAdd() calls are redirected to a special queue; when the
// fade reaches full-black, all (old) crawl items are cleared and the special queue is flushed into the normal
// queue.  In this way, this call can be made and can immediately be followed by new crawlAreaAdd() calls, and
// nothing will be lost.
//
{
	// Clear the flag that is used to turn the handler off to save CPU time; exactly like crawlAreaClear
	// so that if there are no subsequent crawlAreaAdd calls then the handler will eventually shut itself
	// off when the time comes (and that time is later than with the simpler crawlAreaClear):
	//
	gCrawlDataAreOnRequest = false;
	
	if ("none" == gCrawlFadeState)
	{
		// No dip to black was already in progress (normal case), so proceed to start normally:
		//
		gCrawlFadeState = "started";
		gCrawlFadeAnimator.start ();
	}
	else
	{
		// We got called with a dip to black request, with another dip to black request already in progress!
		// Stop the in-progress one completely, and make this one just like a hard clear:
		//
		gCrawlFadeState = "none";
		gCrawlFadeAnimator.stop ();
		crawlAreaTransitionQueueFlush ();
		crawlAreaKillNormalQueueAndActivesAndVisuals ();
		gCrawlContainerElement.style.opacity = 1.0;
	}
}



function crawlAreaAdd (inTagStr, inDataStr1, inStyleClassStr1, inDataStr2, inStyleClassStr2, inDataStr3, inStyleClassStr3)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Add item string(s) with the given style; place incoming item(s) on a queue.  If the queue is full, the request is
// ignored.  The item is placed at the end of the queue where it competes with items falling off the edge of the crawl.
//
// Up to 3 strings can be added at a time (pass NULL for the 2nd and 3rd strings and classes if not needed, but if a
// string is specified then its class must be also); the group is guaranteed to be atomic.  That is, the group's
// sequence will never be interrupted in the middle with something else; if it is deleted for example due to age, the
// entire group is deleted.
//
// The "tagStr" parameter (pass NULL if this feature not needed) can be used to REPLACE, not just add, a specific item.
// If a tag string is given, we check if it was given before, and if so, the item strings are replaced rather than a
// new item being created (there will not be a net increase in the total number of items known to the crawl).  If the
// item is currently being visibly displayed, this replacement will happen only after it has fallen off the edge.
//
{
	// Set the flag that is used to know when to turn the handler off to save CPU time; setting it will prevent
	// this from happening until one of the clear calls is made:
	//
	gCrawlDataAreOnRequest = true;
	
	// The handler might not be running, so we have to make sure that it is:
	//
	crawlAreaTimerEnsureOnOff ("on");
	
	// Deal with NULL inputs:
	//
	if (null == inDataStr2) { inDataStr2 = ""; inStyleClassStr2 = "sCrawlItem-TypeNull"; }
	if (null == inDataStr3) { inDataStr3 = ""; inStyleClassStr3 = "sCrawlItem-TypeNull"; }
	
	// Normally, put the request on the queue to fight it out with already-existing crawl items in the rotation;
	// if a fade-down-fade-up is in progress, then put it on the special queue that will be flushed later:
	//
	if ("none" == gCrawlFadeState)
	{
		crawlAreaQueueEnqueue (inTagStr, "replace", inDataStr1, inStyleClassStr1, inDataStr2, inStyleClassStr2, inDataStr3, inStyleClassStr3);
	}
	else
	{
		crawlAreaTransitionQueueEnqueue (inTagStr, inDataStr1, inStyleClassStr1, inDataStr2, inStyleClassStr2, inDataStr3, inStyleClassStr3);
	}
}



function crawlAreaSetOrClearURL (inURLStrOrNull)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Add or remove the ability to click on the crawl area and have it open the web browser with that URL.  If a non-null
// string is passed, the mouseover cursor while in the crawl area will become the "link hand" and a click will open the
// web browser; if null is passed, then the mouseover cursor will be the "normal arrow" and clicking does nothing.
//
{
	gCrawlClickableUrl = inURLStrOrNull;
	if (null == inURLStrOrNull)
		gCrawlContainerElement.style.cursor = "arrow";
	else
		gCrawlContainerElement.style.cursor = "pointer";
}



function crawlAreaTimerEnsureOnOff (inOnOff)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.  Turn the periodic calling of the handler on or off.  It can be called in an out-of-balance fashion
// to ensure on or off state; that is, multiple consecutive on requests or off requests; simply the last one wins.
//
{
	if ("on" == inOnOff)
	{
		if (null == gCrawlTimer)
		{
			gCrawlTimer = setInterval (crawlAreaHandler, kCrawlIntervalMs);
		}
	}
	if ("off" == inOnOff)
	{
		if (null != gCrawlTimer)
		{
			clearInterval (gCrawlTimer);
			gCrawlTimer = null;
		}
	}
}



function crawlAreaKillNormalQueueAndActivesAndVisuals ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine. Zero the normal queue, zero the array (set all items to inactive), visually hide all in the render.
//
{
	gCrawlQueue.splice (0, gCrawlQueue.length);
	for (var i = 0;   i < gCrawlItemsArray.length;   i++)
	{
		gCrawlItemsArray[i].isShowing = false;
		gCrawlItemsArray[i].tagStr = null;
		gCrawlItemsArray[i].htmlElementSub1.innerText = "";
		gCrawlItemsArray[i].htmlElementSub2.innerText = "";
		gCrawlItemsArray[i].htmlElementSub3.innerText = "";
	}
}



function crawlAreaQueueEnqueue (inTagStr, inWhatIfDupTag, inDataStr1, inStyleClassStr1, inDataStr2, inStyleClassStr2, inDataStr3, inStyleClassStr3)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.
// Add an entry to the queue, growing it as needed; the new queue-item is created and initialized with the given parameters.
// However, if a non-NULL tag was given, we first check if there already is an item existing in the queue with that tag.
// If not, the item (and its tag) is added normally.  If so, then depending on the "whatIfDupTag" parameter, two things can
// happen: if "replace", then the item contents are replaced in-place; the item remains in the same queue position; if "ignore",
// then this entire enqueue request is aborted such that the old item contents are kept.
// Finally, there is a cut-off limit placed on the total queue size.
//
{
	var i;
	var tagGivenAndTagFoundAtIndex;
	
	// If a tag was given, search already-existing queue entries.  Leave tagGivenAndTagFoundAtIndex set up with index
	// if found, or -1 if not found or also -1 if no tag to check for was specified:
	//
	tagGivenAndTagFoundAtIndex = -1;
	if (null != inTagStr)
	{
		for (i = 0;   i < gCrawlQueue.length;   i++)
			if (gCrawlQueue[i].dataTagStr == inTagStr)
				tagGivenAndTagFoundAtIndex = i;
	}
	
	if (-1 == tagGivenAndTagFoundAtIndex)
	{
		// Here if no tag was given, or it was given but no pre-existing duplicate was found.
		// Create a record and place at the end of the queue:
		//
		var newObj = {	dataTagStr:inTagStr,
						dataDataStr1:inDataStr1, dataStyleClassStr1:inStyleClassStr1,
						dataDataStr2:inDataStr2, dataStyleClassStr2:inStyleClassStr2,
						dataDataStr3:inDataStr3, dataStyleClassStr3:inStyleClassStr3 };
		gCrawlQueue.push (newObj);
	}
	else
	{
		// Here if a tagged item already exists in the queue.  If we are directed to replace, do so; if ignore, do
		// nothing (thus causing the queue request to disappear now):
		//
		if ("replace" == inWhatIfDupTag)
		{
			i = tagGivenAndTagFoundAtIndex;
			gCrawlQueue[i].dataDataStr1 = inDataStr1;   gCrawlQueue[i].dataStyleClassStr1 = inStyleClassStr1;
			gCrawlQueue[i].dataDataStr2 = inDataStr2;   gCrawlQueue[i].dataStyleClassStr2 = inStyleClassStr2;
			gCrawlQueue[i].dataDataStr3 = inDataStr3;   gCrawlQueue[i].dataStyleClassStr3 = inStyleClassStr3;
		}
	}
	
	// No matter what else happens, if the queue is getting too big, delete from the front of the line, thus tending to favor newer
	// over older. This is not precise: a precise way would be to initialize queue items with "born on" sequence numbers so we could
	// look for the true oldest ones and delete them:
	//
	if (gCrawlQueue.length >= kCrawlMaxNumEnqueuedItems)
		gCrawlQueue.splice (0, kCrawlCullNumEnqueuedItems);
}



function crawlAreaQueueDequeue ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.  Remove an item from the queue and return it, shrinking the array as needed; returns (undefined)
// if empty; the queue-entry-object (see enqueue routine above for definition) is returned whole.
//
{
	return gCrawlQueue.shift();
}



function crawlAreaQueuePreviewUpcomingTag ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.  Return the tag of the item that will be dequeued on the next call to crawlAreaQueueDequeue
// but without actually dequeueing it.  If the item doesn't have a tag set, NULL is returned; if the queue is
// empty, UNDEFINED is returned.
//
{
	var headElement = gCrawlQueue[0];
	
	if (undefined != headElement)
		return headElement.dataTagStr;
	else
		return undefined;
}



function crawlAreaTransitionQueueEnqueue (inTagStr, inDataStr1, inStyleClassStr1, inDataStr2, inStyleClassStr2, inDataStr3, inStyleClassStr3)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.  Just like our normal enqueue routine, but puts in on a special different queue, which is a
// temporary holding place while the fade transition is going on.
//
{
	var newObj = {	dataTagStr:inTagStr,
					dataDataStr1:inDataStr1, dataStyleClassStr1:inStyleClassStr1,
					dataDataStr2:inDataStr2, dataStyleClassStr2:inStyleClassStr2,
					dataDataStr3:inDataStr3, dataStyleClassStr3:inStyleClassStr3 };
	gCrawlTransitionQueue.push (newObj);
}



function crawlAreaTransitionQueueFlush ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.  Takes items that were put on the special queue and 1) calls our routine to add them all to the
// normal queue and 2) then flushes the special queue.  No effort is made to add them in the reverse/original order.
//
{
	for (var i = 0;   i < gCrawlTransitionQueue.length;   i++)
		crawlAreaQueueEnqueue (	gCrawlTransitionQueue[i].dataTagStr, "replace",
								gCrawlTransitionQueue[i].dataDataStr1, gCrawlTransitionQueue[i].dataStyleClassStr1,
								gCrawlTransitionQueue[i].dataDataStr2, gCrawlTransitionQueue[i].dataStyleClassStr2,
								gCrawlTransitionQueue[i].dataDataStr3, gCrawlTransitionQueue[i].dataStyleClassStr3 );
	
	gCrawlTransitionQueue.splice (0, gCrawlTransitionQueue.length);
}



function crawlAreaHandler ()
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.
//
{
	var i, aCrawlItem;
	var theFirstNonShowingItemAvailableForReuseIfAny = null;
	var theFarthestRightShowingItemIfAny = -1;
	var shouldRefuseToDequeue = false;
	
	// Stop the periodic calling of this routine (until a crawlAreaAdd API request turns it back on, or a crawlAreaStart
	// turns it back on (possibly very temporarily)) if we are not doing anything.  We determine this by making sure no
	// crawlAreaAdd API requests have been made since the last crawlAreaClear or crawlAreaDipToBlackClear.  We make sure
	// that we don't stop ourselves in the middle of a fade to black in progress:
	//
	if (false == gCrawlDataAreOnRequest)
		if ("none" == gCrawlFadeState)
			crawlAreaTimerEnsureOnOff ("off");
	
	// Loop for all slots in the array that we use to keep track of visible items; they will not all be in use (isShowing);
	// we animate those that are showing, possibly make not-showing and re-enqueue items falling off the edge; and collect
	// statistics to guide the feeding of new items to be dequeued and made-showing:
	//
	for (i = 0;   i < gCrawlItemsArray.length;   i++)
	{
		aCrawlItem = gCrawlItemsArray[i];
		
		if (true == aCrawlItem.isShowing)
		{
			// Update: Set (new) positions on screen for all currently showing crawl items:
			//
			aCrawlItem.htmlElement.style.left = aCrawlItem.x1 + "px";
			
			// Animate: Move all currently active crawl items left one frame:
			//
			aCrawlItem.x1 -= kCrawlMovePerIntervalPx;
			aCrawlItem.x2 -= kCrawlMovePerIntervalPx;
			
			// Falloff and re-enqueue: For items that are completely off the left edge of the area (should be
			// just one; they should not be bunched up on top of each other) if so, make them inactive in the
			// array (for re-use) and enqueue a clone (that is, re-enqueue it).  When re-enqueueing, use the
			// "ignore" way of tag replacement so that if a tag was specified and a duplicate was indeed found,
			// we use the existing one that is known to be newer and more authoritative because it must have
			// been added by CrawlAreaAdd:
			//
			if (aCrawlItem.x2 <= -1)
			{
				aCrawlItem.isShowing = false;
				crawlAreaQueueEnqueue (	aCrawlItem.tagStr, "ignore",
										aCrawlItem.htmlElementSub1.innerText, aCrawlItem.htmlElementSub1.className,
										aCrawlItem.htmlElementSub2.innerText, aCrawlItem.htmlElementSub2.className,
										aCrawlItem.htmlElementSub3.innerText, aCrawlItem.htmlElementSub3.className);
			}
			
			// Find statistic: Get to know the position of the right edge of the rightmost-currently-showing item;
			// if this never is found it will be left -1:
			//
			if (aCrawlItem.x2 >= theFarthestRightShowingItemIfAny) theFarthestRightShowingItemIfAny = aCrawlItem.x2;
			
			// Find statistic: Set shouldRefuseToDequeue if any of the currently-showing items has a tag set, and also
			// that tag matches what is next-on-queue right at this moment.  This case is rare in practice; it only is an
			// issue if there are so few items such that nothing is in the queue and everything is in the array (thus visible),
			// AND then at that very moment, an update (crawl add request with the same tag) to something visible happens.
			// Note that items that don't have tags aren't subject to this strictness:
			//
			if (null != aCrawlItem.tagStr)
				if (undefined != crawlAreaQueuePreviewUpcomingTag())
					if (aCrawlItem.tagStr == crawlAreaQueuePreviewUpcomingTag())
						shouldRefuseToDequeue = true;
		}
		else
		{
			// Find statistic: Setup theFirstNonShowingItemAvailableForReuseIfAny to non-null if we can, ie, if we found
			// an unused slot in array for re-use; if this is never found it will be left null:
			//
			if (null == theFirstNonShowingItemAvailableForReuseIfAny) theFirstNonShowingItemAvailableForReuseIfAny = aCrawlItem;
		}
	}
	
	// Take-up on the right and de-queue: If the crawl is hungry for a new one, see if there is a request on the queue, and
	// if so, fill it into a slot in the array.  But only dequeue into the array if we have space in the array, if there would
	// not be any duplicate tags in the array and thus visible, and of course only if the display has scrolled far enough
	// left to be in need of it.  This is the place where items are read/removed from the QUEUE and added to the ARRAY for display:
	//
	if
	(
		(theFarthestRightShowingItemIfAny == -1)				// There are no showing-items, so feed to prime the showing-area.
		||
		(														// Yes there were active showing-item(s), but we only want to feed
			(theFarthestRightShowingItemIfAny != -1)			// a new item into the showing-area if there is a big enough gap
			&&													// that has opened up between the trailing edge of the rightmost
			(theFarthestRightShowingItemIfAny <=				// showing-item and the right edge of the showing-area.  Since there
			 kCrawlRightLimitOfAreaPx)							// is a trailing padding built into the item, this equals it.
		)
	)
	{
		if (null != theFirstNonShowingItemAvailableForReuseIfAny)								// Empty slot in array available?
		{																						// If not, in trouble, need bigger array.
			if (false == shouldRefuseToDequeue)													// Ensure the item we are about to get from queue
			{																					// is not of same tag as something showing now.
				var itemFromQueueIfAny = crawlAreaQueueDequeue ();								// Otherwise, normal, get from queue.
				if (undefined != itemFromQueueIfAny)											// If nothing on queue, ok, will be gap, ok.
				{																				// Otherwise, init a new item in array.
					crawlAreaItemInit (theFirstNonShowingItemAvailableForReuseIfAny,			// It will have been taken off the queue.
						itemFromQueueIfAny.dataTagStr,
						itemFromQueueIfAny.dataDataStr1, itemFromQueueIfAny.dataStyleClassStr1,
						itemFromQueueIfAny.dataDataStr2, itemFromQueueIfAny.dataStyleClassStr2,
						itemFromQueueIfAny.dataDataStr3, itemFromQueueIfAny.dataStyleClassStr3);
				}
			}
		}
	}
}



function crawlAreaItemInit (inArrayItemToFill, inTagStr, inStr1, inClass1, inStr2, inClass2, inStr3, inClass3)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.
//
{
	// Set given class (font style, etc) and actual text in the user-visible rendering; do this before measurement below:
	//
	inArrayItemToFill.htmlElementSub1.setAttribute ("class", inClass1);
	inArrayItemToFill.htmlElementSub1.innerText = inStr1;
	inArrayItemToFill.htmlElementSub2.setAttribute ("class", inClass2);
	inArrayItemToFill.htmlElementSub2.innerText = inStr2;
	inArrayItemToFill.htmlElementSub3.setAttribute ("class", inClass3);
	inArrayItemToFill.htmlElementSub3.innerText = inStr3;
	
	// Init our accounting of the tag string or null:
	//
	inArrayItemToFill.tagStr = inTagStr;
	
	// Init our accounting of the new item's initial left position (set it to the right edge of the crawl display area):
	//
	inArrayItemToFill.x1 = kCrawlRightLimitOfAreaPx;
	
	// Init the position in the user-visible rendering:
	//
	inArrayItemToFill.htmlElement.style.left = inArrayItemToFill.x1 + "px";
	
	// Init our accounting of the new item's right edge by measuring actual pixel width of the entire filled-in-with-given-text item:
	//
	inArrayItemToFill.x2 = inArrayItemToFill.x1 + getRenderValue (inArrayItemToFill.htmlElement, null, "width");
	
	// Set accounting info that this slot in the possibly-visible-items-array is now in use:
	//
	inArrayItemToFill.isShowing = true;
}



function crawlAreaFadeFrameHandler (inAnimation, inNow, inFirst, inDone)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.
//
{
	// We get called with inNow values from 0..100; we use lopsided parts of the animation range to fade out, then in,
	// the entire crawl (style.opacity api ranges from 0 to 1):
	//
	if (inNow < kCrawlFadeLopsidedPct)
	{
		gCrawlContainerElement.style.opacity =										// fade out: affect graphics
			((kCrawlFadeLopsidedPct - inNow) * (100 / kCrawlFadeLopsidedPct)) / 100;
		if ("started" == gCrawlFadeState)
		{
			gCrawlFadeState	= "down";												// we are in 1st frame of fade out
		}
	}
	else
	{
		gCrawlContainerElement.style.opacity =										// fade in: affect graphics
			((inNow - kCrawlFadeLopsidedPct) * (100 / (100 - kCrawlFadeLopsidedPct))) / 100;
		if ("down" == gCrawlFadeState)
		{
			gCrawlFadeState	= "up";													// we are in 1st frame of fade in
			crawlAreaKillNormalQueueAndActivesAndVisuals ();
			crawlAreaTransitionQueueFlush ();
		}
	}
	
	if (true == inDone)
	{
		gCrawlFadeState = "none";													// we are in last frame (of fade in)
		gCrawlContainerElement.style.opacity = 1.0;
	}
}



function onRequestClickedOnCrawlContainer (inEvent)
//
// Crawl-Area API: "Class" that displays a crawling ticker tape text stream with individually-scheduled items.
//
// Internal routine.
//
{
	if (null != gCrawlClickableUrl)
		if (window.widget)
			widget.openURL (gCrawlClickableUrl);
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function dataGetterStart (inClientCallbackForNews, inClientCallbackForScores, inDelayBeforeStart)
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
{
	gDataGetterClientCallback_News = inClientCallbackForNews;
	gDataGetterClientCallback_Scores = inClientCallbackForScores;
	
	dataGetterKillPending (true, true, true, true);
	
	gDataGetterRefreshTimer_News = setTimeout (dataGetterRefreshTimerHandler_News, inDelayBeforeStart);
	gDataGetterRefreshTimer_Scores = setTimeout (dataGetterRefreshTimerHandler_Scores, inDelayBeforeStart);
}



function dataGetterStop ()
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
{
	dataGetterKillPending (true, true, true, true);
}



function dataGetterKillPending (inKillTimerNews, inKillTimerScores, inKillRequestNews, inKillRequestScores)
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
// Internal routine.
//
{
	if (inKillTimerNews)
		if (gDataGetterRefreshTimer_News != null)
		{
			clearTimeout (gDataGetterRefreshTimer_News);
			gDataGetterRefreshTimer_News = null;
		}
	
	if (inKillTimerScores)
		if (gDataGetterRefreshTimer_Scores != null)
		{
			clearTimeout (gDataGetterRefreshTimer_Scores);
			gDataGetterRefreshTimer_Scores = null;
		}
	
	if (inKillRequestNews)
		if (gDataGetterPendingRequest_News != null)
		{
			gDataGetterPendingRequest_News.abort ();
			gDataGetterPendingRequest_News = null;
		}
	
	if (inKillRequestScores)
		if (gDataGetterPendingRequest_Scores != null)
		{
			gDataGetterPendingRequest_Scores.abort ();
			gDataGetterPendingRequest_Scores = null;
		}
}



function dataGetterRefreshTimerHandler_News ()
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
// Internal routine.
//
{
	// Kill any pending feed request for news:
	//
	dataGetterKillPending (false, false, true, false);
	
	gDataGetterPendingRequest_News = fetchNews (gCurrentLeague, dataGetterDataConsumerCallback_News);
	
	// Indicate that we have fired:
	//
	gDataGetterRefreshTimer_News = null;
}



function dataGetterRefreshTimerHandler_Scores ()
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
// Internal routine.
//
{
	// Kill any pending feed request for scores:
	//
	dataGetterKillPending (false, false, false, true);
	
	gDataGetterPendingRequest_Scores = fetchScores (gCurrentLeague, dataGetterDataConsumerCallback_Scores);
	
	// Indicate that we have fired:
	//
	gDataGetterRefreshTimer_Scores = null;
}




function dataGetterDataConsumerCallback_News (inNewsObject)
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
// Internal routine: Data consumer called by parser code; we in turn call our client data consumer and set a timer
// to issue the next request.
//
{	
	// Log error to console even in production builds; note that it can come from downstream code from this
	// (in the case of a throw and we are being re-called) or it can be a network error or it can be an XML
	// parsing error.  Continue with everything below such as calling our client and re-scheduling:
	//
	if (inNewsObject.error) alert ("fetchNews completion reports error: " + inNewsObject.errorString);
	
	// Now that we have been called back, we no longer need to hold on to the XML request object, so set
	// to null will garbage collect it.  Saves memory:
	//
	gDataGetterPendingRequest_News = null;
	
	// If the feed is telling us how much time we should wait until refreshing, override our default with
	// that of the feed, but never less than a our minimum (that is, don't do it too often).  If not,
	// just use our default value:
	//
	var msToNextRefresh = kFeedFailureWaitBeforeNextRefreshMs;
	if (false == inNewsObject.error)
		if (inNewsObject.refresh > 0)
		{
			msToNextRefresh = inNewsObject.refresh;
			if (msToNextRefresh < kFeedOKMinimumWaitBeforeNextRefreshMs)
				msToNextRefresh = kFeedOKMinimumWaitBeforeNextRefreshMs;
		}
	
	// Call client:
	//
	gDataGetterClientCallback_News (inNewsObject);
	
	// Arrange to refresh (will re-issue the feed request) a while from now:
	//
	gDataGetterRefreshTimer_News = setTimeout (dataGetterRefreshTimerHandler_News, msToNextRefresh);
}



function dataGetterDataConsumerCallback_Scores (inScoresObject)
//
// Data-Getter: Routines that obtain data from feed and call the given callbacks with data objects as defined in
// the news and score parsers in parser.js.  Details like refresh timers and update from network of parser.js contents
// are taken care of.
//
// Internal routine: Data consumer called by parser code; we in turn call our client data consumer and set a timer
// to issue the next request.
//
{
	// Log error to console even in production builds; note that it can come from downstream code from this
	// (in the case of a throw and we are being re-called) or it can be a network error or it can be an XML
	// parsing error.  Continue with everything below such as calling our client and re-scheduling:
	//
	if (inScoresObject.error) alert ("fetchScores completion reports error: " + inScoresObject.errorString);
	
	// Now that we have been called back, we no longer need to hold on to the XML request object, so set
	// to null will garbage collect it.  Saves memory:
	//
	gDataGetterPendingRequest_Scores = null;
	
	// If the feed is telling us how much time we should wait until refreshing, override our default with
	// that of the feed, but never less than a our minimum (that is, don't do it too often).  If not,
	// just use our default value:
	//
	var msToNextRefresh = kFeedFailureWaitBeforeNextRefreshMs;
	if (false == inScoresObject.error)
		if (inScoresObject.refresh > 0)
		{
			msToNextRefresh = inScoresObject.refresh;
			if (msToNextRefresh < kFeedOKMinimumWaitBeforeNextRefreshMs)
				msToNextRefresh = kFeedOKMinimumWaitBeforeNextRefreshMs;
		}
	
	// Call client:
	//
	gDataGetterClientCallback_Scores (inScoresObject);
	
	// Arrange to refresh (will re-issue the feed request) a while from now:
	//
	gDataGetterRefreshTimer_Scores = setTimeout (dataGetterRefreshTimerHandler_Scores, msToNextRefresh);
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function newsModeStart (inWhy)
//
// News-Mode: Routines that get news data and scores data from feed and call our News-List and Crawl-Area with data,
// with the main screen emphasis on news.
//
// This routine begins or resumes various levels of continuous feed requesting and visual updating of the widget display depending
// on the occasion.  We call feed (parser) routines to get the data and news list / scores list / crawl area routines to show it.
//
{
	switch (inWhy)
	{
	case "init":
	break;
	
	case "first":
		newsListShow (true);
		newsListClear (null);
		crawlAreaStart ();
		crawlAreaSetOrClearURL (null);
		dataGetterStart (newsModeDataConsumerCallback_News, newsModeDataConsumerCallback_Scores, 0);
	break;
	
	case "wake":
		crawlAreaStart ();
		crawlAreaSetOrClearURL (null);
		dataGetterStart (newsModeDataConsumerCallback_News, newsModeDataConsumerCallback_Scores, kFeedResumeWaitBeforeNextRefreshMs);
	break;
	
	case "switchmode":
		newsListShow (true);
		crawlAreaStart ();
		crawlAreaSetOrClearURL (null);
		dataGetterStart (newsModeDataConsumerCallback_News, newsModeDataConsumerCallback_Scores, 0);
	break;
	
	case "switchleague":
		newsListShow (true);
		crawlAreaStart ();
		crawlAreaSetOrClearURL (null);
		dataGetterStart (newsModeDataConsumerCallback_News, newsModeDataConsumerCallback_Scores, 0);
	break;
	
	case "flip":
		setTimeout ("crawlAreaStart ();", kFlipToFrontCrawlStartDelayMs);
	break;
	}
}



function newsModeStop (inWhy)
//
// News-Mode: Routines that get news data and scores data from feed and call our News-List and Crawl-Area with data,
// with the main screen emphasis on news.
//
// This routine ends the continuous feed requesting and visual updating of the widget display.  Pending requests
// and timers are stopped, but the display is not cleared.
//
{
	switch (inWhy)
	{
	case "sleep":
		crawlAreaStop ();
		crawlAreaSetOrClearURL (null);
		dataGetterStop ();
	break;
	
	case "switchmode":
		newsListShow (false);						// our list is only hidden but not cleared when doing only a mode switch
		crawlAreaStop ();
		crawlAreaSetOrClearURL (null);
		crawlAreaDipToBlackClear ();
		dataGetterStop ();
	break;
	
	case "switchleague":
		newsListShow (false);
		newsListClear (null);
		scoresListClear (null);						// the opposite list is cleared in addition to "our" list when doing a league switch
		crawlAreaStop ();
		crawlAreaSetOrClearURL (null);
		dataGetterStop ();
		crawlAreaClear ();
	break;
	
	case "flip":
		crawlAreaStop ();
	break;
	}
}



function newsModeDataConsumerCallback_News (inNewsObject)
//
// News-Mode: Routines that get news data and scores data from feed and call our News-List and Crawl-Area with data,
// with the main screen emphasis on news.
//
// Internal routine:  This is a data consumer.  It is called when the feed request is complete.  The object that is
// passed-in comes from the code fetch_news_loaded routine in parser.js; see that source for a definition.
//
// This routine can be thought of as the "major" data consumer for this mode.  We are in NEWS mode now, and this is
// the data consumer that gets NEWS data from the feed>parser>datagetter.  We display the news in the news-list in the
// middle of the widget.
//
{
	// Do all of this if good data from parser, but if error, show a user message, since this is a major consumer:
	//
	if (false == inNewsObject.error)
	{
		// Do following only if (double check) this is in the league we want, else ignore; doing this
		// has the effect of rejecting very old requests:
		//
		if (inNewsObject.league == gCurrentLeague)
		{
			// If we have more than zero stories, show them; else show a message.  The problem here is that the
			// current parser fetch_news_loaded obtains an entire bunch of stories and passes it back in a single
			// array; that array may change all at once and it would be nice to add them one at a time instead:
			//
			if (inNewsObject.stories.length > 0)
			{
				newsListClear (null);
				for (var i = 0;   i < inNewsObject.stories.length;   i++) 
				{
					var headline = getHeadlineFromESPNHeadlineStr (inNewsObject.stories[i].headline); 
					if(headline)
						newsListAdd (headline, inNewsObject.stories[i].url);
				}
			}
			else
			{
				newsListClear (getLocalizedString ("No current news"));
			}
		}
	}
	else
	{
		// Here if the feed parser encountered an error: show a user message in the widget:
		//
		newsListClear (getLocalizedString ("Unable to retrieve news"));
	}
}



function newsModeDataConsumerCallback_Scores (inScoresObject)
//
// News-Mode: Routines that get news data and scores data from feed and call our News-List and Crawl-Area with data,
// with the main screen emphasis on news.
//
// Internal routine:  This is a data consumer.  It is called when the feed request is complete.  The object that is
// passed-in comes from the code fetch_scores_loaded routine in parser.js; see that source for a definition.
//
// This routine can be thought of as the "minor" data consumer for this mode.  We are in NEWS mode now, and this is
// the data consumer that gets SCORES data from the feed>parser>datagetter.  We format and display the scores in the
// crawl at the bottom of the widget.
//
{
	// Do all of this only if no error from parser; if error we do NOT show a user message in the widget since
	// this is a minor consumer; perhaps that means the crawl will just be left blank:
	//
	if (false == inScoresObject.error)
	{
		if (inScoresObject.games.length > 0)
		{
			for (var i = 0;   i < inScoresObject.games.length;   i++)
			{
				if ("upcoming" == getPhaseFromESPNStatusId (inScoresObject.games[i].statusId))
				{
					// The game has not happened yet, so add information about it to the crawl but not the score, which
					// will be 0 for both teams and that would look silly.  Give it a tag cookie that consists of a string
					// made up of both teams, so that any updates (and that includes this, the upcoming case, or in-progress
					// case below) will REPLACE, instead of ADD, this item in the crawl:
					//
					if (null == inScoresObject.games[i].away)
					{
						// Home "team" only (individual sport kind) case:
						// Do nothing.  Individual player with upcoming "when" info (ie, "Tiger Woods 9PM ET") is not supported.
						// Of course what is really desired is event info (ie, "US Open 9PM ET").
					}
					else
					{
						// Away at Home (team sport kind) case:
						crawlAreaAdd (	getTagFromTeamPair (inScoresObject.games[i].away.team, inScoresObject.games[i].home.team),		// tag cookie; see note above
										
										inScoresObject.games[i].away.team + " - " + inScoresObject.games[i].home.team,
										"sCrawlItem-TypeMain",
										
										getWhenFromESPNStatusStr (inScoresObject.games[i].statusStr),
										"sCrawlItem-TypeAlternate",
										
										"xx",
										"sCrawlItem-TypeSpacer" );
					}
				}
				else
				{
					// The game is in progress or is final, so add information about it to the crawl, including score.
					// Tag it in exactly the same way as game-not-happened yet case; see note above:
					//
					if (null == inScoresObject.games[i].away)
					{
						// Home "team" only (individual sport kind) case:
						crawlAreaAdd (	getTagFromTeamPair (null, inScoresObject.games[i].home.team),									// tag cookie; see note above
										
										inScoresObject.games[i].home.team + " " + inScoresObject.games[i].home.score,
										"sCrawlItem-TypeMain",
										
										getWhenFromESPNStatusStr (inScoresObject.games[i].statusStr),
										"sCrawlItem-TypeAlternate",
										
										"xx",
										"sCrawlItem-TypeSpacer" );
					}
						else
					{
						// Away at Home (team sport kind) case:
						crawlAreaAdd (	getTagFromTeamPair (inScoresObject.games[i].away.team, inScoresObject.games[i].home.team),		// tag cookie; see note above
										
										inScoresObject.games[i].away.team + " " + inScoresObject.games[i].away.score +
										" - " +
										inScoresObject.games[i].home.team + " " + inScoresObject.games[i].home.score,
										"sCrawlItem-TypeMain",
										
										getWhenFromESPNStatusStr (inScoresObject.games[i].statusStr),
										"sCrawlItem-TypeAlternate",
										
										"xx",
										"sCrawlItem-TypeSpacer" );
					}
				}
			}
		}
	}
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function scoresModeStart (inWhy)
//
// Scores-Mode: Routines that get scores and news data from feed and call our Scores-List and Crawl-Area with data,
// with the main screen emphasis on scores.
//
// This routine begins or resumes various levels of continuous feed requesting and visual updating of the widget display depending
// on the occasion.  We call feed (parser) routines to get the data and news list / scores list / crawl area routines to show it.
//
{
	switch (inWhy)
	{
	case "init":
	break;
	
	case "first":
		scoresListShow (true);
		scoresListSetOnClickedItemClientCallback (scoresModeOnListItemSelected);
		scoresListClear (null);
		crawlAreaStart ();
		if (null != gScoresModeFocusOnGameUrl) crawlAreaSetOrClearURL (gScoresModeFocusOnGameUrl);
		dataGetterStart (scoresModeDataConsumerCallback_News, scoresModeDataConsumerCallback_Scores, 0);
	break;
	
	case "wake":
		scoresListSetOnClickedItemClientCallback (scoresModeOnListItemSelected);
		crawlAreaStart ();
		if (null != gScoresModeFocusOnGameUrl) crawlAreaSetOrClearURL (gScoresModeFocusOnGameUrl);
		dataGetterStart (scoresModeDataConsumerCallback_News, scoresModeDataConsumerCallback_Scores, kFeedResumeWaitBeforeNextRefreshMs);
	break;
	
	case "switchmode":
		scoresListShow (true);
		scoresListSetOnClickedItemClientCallback (scoresModeOnListItemSelected);
		crawlAreaStart ();
		if (null != gScoresModeFocusOnGameUrl) crawlAreaSetOrClearURL (gScoresModeFocusOnGameUrl);
		dataGetterStart (scoresModeDataConsumerCallback_News, scoresModeDataConsumerCallback_Scores, 0);
	break;
	
	case "switchleague":
		scoresListShow (true);
		scoresListSetOnClickedItemClientCallback (scoresModeOnListItemSelected);
		crawlAreaStart ();
		if (null != gScoresModeFocusOnGameUrl) crawlAreaSetOrClearURL (gScoresModeFocusOnGameUrl);
		dataGetterStart (scoresModeDataConsumerCallback_News, scoresModeDataConsumerCallback_Scores, 0);
	break;
	
	case "flip":
		setTimeout ("crawlAreaStart ();", kFlipToFrontCrawlStartDelayMs);
	break;
	}
}



function scoresModeStop (inWhy)
//
// Scores-Mode: Routines that get scores and news data from feed and call our Scores-List and Crawl-Area with data,
// with the main screen emphasis on scores.
//
// This routine ends various levels of continuous feed requesting and visual updating of the widget display depending on the occasion.
//
{
	switch (inWhy)
	{
	case "sleep":
		crawlAreaStop ();
		crawlAreaSetOrClearURL (null);
		dataGetterStop ();
	break;
	
	case "switchmode":
		scoresListShow (false);						// our list is only hidden but not cleared when we do only a mode switch
		crawlAreaStop ();
		crawlAreaSetOrClearURL (null);
		crawlAreaDipToBlackClear ();
		dataGetterStop ();
	break;
	
	case "switchleague":
		scoresListShow (false);
		scoresListClear (null);
		newsListClear (null);						// the opposite list is cleared as well as "our" list at league switch
		crawlAreaStop ();
		crawlAreaSetOrClearURL (null);
		dataGetterStop ();
		crawlAreaClear ();
		gScoresModeFocusOnGameId = null;
		gScoresModeFocusOnGameUrl = null;
	break;
	
	case "flip":
		crawlAreaStop ();
	break;
	}
}



function scoresModeDataConsumerCallback_Scores (inScoresObject)
//
// Scores-Mode: Routines that get scores and news data from feed and call our Scores-List and Crawl-Area with data,
// with the main screen emphasis on scores.
//
// Internal routine:  This is a data consumer.  It is called when the feed request is complete.  The object that is passed-in
// comes from the sport-kind-specific parser routines in parser.js; see that source for a definition.
//
// This routine can be thought of as the "major" data consumer for this mode.  We are in SCORES mode now, and this is
// the data consumer that gets SCORES data from the feed>parser>datagetter.  We display the scores in the scores-list in
// the middle of the widget, and we also save this update of the entire list in a cache for our possible use in the crawl.
//
{
	// Do all of this only if good data from parser; if error, show a user message since this is a major consumer:
	//
	if (false == inScoresObject.error)
	{
		// Do following only if (double check) this is in the league we want, else ignore; doing this
		// has the effect of rejecting very old requests:
		//
		if (inScoresObject.league == gCurrentLeague)
		{
			// If we are given more than zero games, call our routine to add-or-update-to-our-list their scores;
			// otherwise show a no-games-therefore-no-scores message:
			//
			if (inScoresObject.games.length > 0)
			{
				// Update scores list on screen: Loop thru all games and call helper routine 1 game at a time:
				//
				var gameKind = getKindNameFromLeagueName (inScoresObject.league);
				for (var i = 0;   i < inScoresObject.games.length;   i++)
					scoresModeAddOrUpdateGame (inScoresObject.games[i], gameKind);
				
				// Save away a copy of this latest scores object full of games, for use in focus view in crawl:
				//
				gScoresModeCachedScoresObject = inScoresObject;
			}
			else
			{
				scoresListClear (getLocalizedString ("No current scores"));
			}
		}
	}
	else
	{
		// Here if the feed parser encountered an error: show a user message in the widget:
		//
		scoresListClear (getLocalizedString ("Unable to retrieve scores"));
	}
}



function scoresModeDataConsumerCallback_News (inNewsObject)
//
// Scores-Mode: Routines that get scores and news data from feed and call our Scores-List and Crawl-Area with data,
// with the main screen emphasis on scores.
//
// Internal routine:  This is a data consumer.  It is called when the feed request for news is complete; see the news
// parser routine in parser.js for a definition of the input parameter.  We now have news data use for the crawl.
//
// This routine can be thought of as the "minor" data consumer for this mode.  We are in SCORES mode now, and this is
// the data consumer that gets NEWS data from the feed>parser>datagetter.  We display the news in the crawl at the bottom
// of the widget, unless a game has been highlighted as the focus, in which case someone else will have filled the crawl
// with game-specific information.
//
{
	var i;
	
	// Do all of this only if good data from parser; if error, do nothing and do NOT show a user message,
	// since this is only a minor consumer. Perhaps this will cause the crawl to just be blank:
	//
	if (false == inNewsObject.error)
	{
		// Check if the highlight (focus) is on any game:
		//
		if (gScoresModeFocusOnGameId != null)
		{
			// FOCUS IS ON (level-sensitive): Do nothing: Crawl will have been populated with game-specific info already.
		}
		else
		{
			// FOCUS IS OFF (level-sensitive): Continuously populate crawl with all news headlines:
			//
			if (false == inNewsObject.error)
				if (inNewsObject.stories.length > 0)
				{
					for (i = 0;   i < inNewsObject.stories.length;   i++)
					{
						var headline = getHeadlineFromESPNHeadlineStr (inNewsObject.stories[i].headline);
						if(headline)
						crawlAreaAdd (null,
							headline + " . . . ", "sCrawlItem-TypeMain",
							null, null,
							null, null);
					}
				}
		}
		
		// Save away a copy of this latest news object full of headlines, for use when recovering from focus view in crawl:
		//
		gScoresModeCachedNewsObject = inNewsObject;
	}
}



function scoresModeAddOrUpdateGame (inGameObject, inGameKind)
//
// Scores-Mode: Routines that get scores and news data from feed and call our Scores-List and Crawl-Area with data,
// with the main screen emphasis on scores.
//
// Internal routine:  Called by our data consumer routine above to interpret a single game's data from parser.js
// and add it to our scores-list.  The basics (team or individual name, master scores) are the same for all sport kinds
// (though here we do pass them though some string filter routines), but the more sport-specific details may warrant more
// special treatment.
//
{
	// Future expansion: Fill in intra-game-details (box scores):
	//
	var intraGameDetailsA = Array (32);
	var intraGameDetailsB = Array (32);
	for (var i = 0;  i < 32;   i++)
	{
		intraGameDetailsA[i] = "x";
		intraGameDetailsB[i] = "x";
	}
	
	// Pass score data from score feed to list display, with a little bit of status filtering:
	//
	scoresListAddOrUpdate (inGameObject.id,									// Game ID
		inGameKind,															// Kind ("baseball", "football", etc)
		getPhaseFromESPNStatusId (inGameObject.statusId),					// Phase ("upcoming", "inprogress", etc)
		getWhenFromESPNStatusStr (inGameObject.statusStr),					// When ("Tue", "3rd Quarter", etc)
		getTeamFromESPNTeamStr (gCurrentLeague, inGameObject.away.team),	// Team A Name - away first
		getTeamFromESPNTeamStr (gCurrentLeague, inGameObject.home.team),	// Team B Name - home second
		inGameObject.away.score,											// Team A Master Score - away first
		inGameObject.home.score,											// Team B Master Score - home second
		intraGameDetailsA,													// Team A Intra Game Details (Box Score) - away first
		intraGameDetailsB,													// Team B Intra Game Details (Box Score) - home second
		inGameObject.url);													// Game URL with more info for user
}



function scoresModeOnListItemSelected (inEvent, inNowCurrentGameIdOrNull, inClickedOrUnclickedGameId, inClickedOrUnclickedGameUrl)
//
// Scores-Mode: Routines that get scores and news data from feed and call our Scores-List and Crawl-Area with data,
// with the main screen emphasis on scores.
//
// Internal routine:  Called by the list manager when user selects/selects-new/unselects one of our Scores-List items
// (edge-sensitive).  The input parameters are:  the DOM event; the now-current game ID (select) or null (unselect) which
// thus also carries the select-or-unselect choice; the game ID that's either now current or was the old one; and the
// game URL that's either now current or was the old one.
//
// We fill the crawl contents with game-specific data (going from no game selected to yes game selected case or also going
// from yes game selected to a different game selected case); or we (re)fill the crawl contents with cached news data.
//
{
	var i, j, numDetailItems;
	
	// Check if a game has been recently selected (edge-sensitive, since we're int the "on list item selected" routine):
	//
	if (null != inNowCurrentGameIdOrNull)
	{
		// SELECTED: Here if a game has been highlighted (possibly away from nothing, possibly away from old game).
		
		// Set our state to indicate this fact:
		//
		gScoresModeFocusOnGameId = inNowCurrentGameIdOrNull;
		gScoresModeFocusOnGameUrl = inClickedOrUnclickedGameUrl;
		
		// Begin the crawl fade sequence (any new contents don't display but get queued; fade to black starts; old cleared;
		// fade up starts with new contents; back to normal) and arm the crawl's clickable area to go to this game:
		//
		crawlAreaDipToBlackClear ();
		crawlAreaSetOrClearURL (inClickedOrUnclickedGameUrl);
		
		// Populate the crawl area with detailed information about this game: we try to find the game ID that's selected
		// in the object-full-of-games that we cached and if we find it populate the crawl area with detail text items if
		// any.  Often there are no detail items so a message is shown in that case:
		//
		if (gScoresModeCachedScoresObject != null)
		{
			for (i = 0;   i < gScoresModeCachedScoresObject.games.length;   i++)
			{
				if (gScoresModeCachedScoresObject.games[i].id == gScoresModeFocusOnGameId)
				{
					numDetailItems = gScoresModeCachedScoresObject.games[i].statusLineDetailStrs.length;
					if (0 == numDetailItems)
					{
						crawlAreaAdd (null,
							getLocalizedString ("Click here for more information"), "sCrawlItem-TypeMain",
							null, null,
							null, null);
					}
					else
					{
						for (j = 0;   j < numDetailItems;   j++)
						{
							crawlAreaAdd (null,
								gScoresModeCachedScoresObject.games[i].statusLineDetailStrs[j], "sCrawlItem-TypeMain",
								null, null,
								null, null);
						}
					}
				}
			}
		}
	}
	else
	{
		// UNSELECTED: Here if the highlight has been taken away (from old game given in inClickedOrUnclickedGameId).
		
		// Set our state to indicate this fact:
		//
		gScoresModeFocusOnGameId = null;
		gScoresModeFocusOnGameUrl = null;
		
		// Begin the crawl fade sequence (any new contents don't display but get queued; fade to black starts; old cleared;
		// fade up starts with new contents; back to normal) and disarm the crawl's clickable area:
		//
		crawlAreaDipToBlackClear();
		crawlAreaSetOrClearURL (null);
		
		// Immediately repopulate with cached news (will display during the fade up):
		//
		if (null != gScoresModeCachedNewsObject)
			if (gScoresModeCachedNewsObject.stories.length > 0)
			{
				for (i = 0;   i < gScoresModeCachedNewsObject.stories.length;   i++)
				{
					crawlAreaAdd (null,
						getHeadlineFromESPNHeadlineStr (gScoresModeCachedNewsObject.stories[i].headline) + " . . . ", "sCrawlItem-TypeMain",
						null, null,
						null, null);
				}
			}
	}
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function onRequestClickedOnLeagueTitle (inEvent)
//
// Handles a click in the league title area.  If alt/option key down while clicking on league title, rotate through all the
// leagues populated in the pop-up; if clicking without keys down, go to its web site.
//
{
	if (inEvent.altKey)
	{
		// Get pop-up menu object info:
		//
		var select = document.getElementById ("iSportPopupMenu");
		var options = select.options;
		var c = options.length;
		
		// Set "i" to the next-after-current index number in the pop-up menu, wrapping to top if past bottom.
		// Note that since the pop-up menu only contains statically-supported gLeagueArray items, whatever we come up
		// with will be safe for use; that is, options[i].value will be a "RPM", "mlb", "nba", etc index for gLeagueArray
		// that IS supported in this version of the widget:
		//
		var i;
		for (i = 0;   i < c;   i++)		if (options[i].value == gCurrentLeague)		break;		// find "i" that is current
		if (i == c || i == (c - 1))		i = 0;		else	i++;								// increment or wrap "i"
		
		// Set the pop-up menu's current setting to the new league we rotated to; switch to the new league:
		//
		select.selectedIndex = i;
		switchLeague (options[i].value, null);
	}
	else
	{
		// Open web browser and go to this league's page:
		//
		if (window.widget)
			widget.openURL (gLeagueArray[gCurrentLeague].url);
	}
}



function switchLeague (inLeague, inFunctionToRunWhenPictureLoaded)
//
// Switches all accounting and display to a new league.  A "league" is an ESPN coverage category such as
// "mlb", "nfl", "nhl", etc.  Note that a "league" will imply a "kind" such as "baseball", "soccer", etc.
// Note further that switching the "league" is not the same as switching the mode; the mode is News or Scores.
//
{
	// With old global league setting, stop all feeds and clear visuals that may have been going on:
	//
	if ("news" == gCurrentMode) newsModeStop ("switchleague");
	if ("scores" == gCurrentMode) scoresModeStop ("switchleague");
	
	// Now change the global; it is the always-current master reference:
	//
	gCurrentLeague = inLeague;
	
	// Visuals: Change the background picture, main mode buttons, dim-bottom-if-any, scores-legend-header-if any, etc:
	//
	beginLoadingBackgroundPictureAndSetTitle (gCurrentLeague, inFunctionToRunWhenPictureLoaded);
	hiliteNewsOrScoresButtons (gCurrentMode);
	adjustMiddleThings (gCurrentMode, gCurrentLeague);
	
	// Prefs: Save new league setting:
	//
	if (window.widget)
		setPreferenceForKey (gCurrentLeague, 'league');
	
	// With new global league setting, restart the mode again:
	//
	if ("news" == gCurrentMode) newsModeStart ("switchleague");
	if ("scores" == gCurrentMode) scoresModeStart ("switchleague");
}



function switchMode (inWhat)
//
// Switches all accounting and display to a new mode.  Our "mode" is either NEWS or SCORES.  This is not
// as harsh as switching the league; we can pause the old mode and resume the new mode; it is the mode we are
// switching but the league is staying the same, so previous data is more likely to be current.
//
{
	if ("fromscorestonews" == inWhat)
	{
		// SCORES -> NEWS mode switch: pause Scores, unpause News, keep going the Details:
		//
		scoresModeStop ("switchmode");
		newsModeStart ("switchmode");
	}
	
	if ("fromnewstoscores" == inWhat)
	{
		// NEWS -> SCORES mode switch: pause News, unpause Scores, keep going the Details:
		//
		newsModeStop ("switchmode");
		scoresModeStart ("switchmode");
	}
}



function adjustMiddleThings (inMode, inLeague)
//
// Change the rendering state for all things affected by news-view vs. scores-view.  We
// enable/disable the dimmed middle-widget-body.  We set the sport kind/league for the purposes
// of the sport-specific header (scores-view column legend) and show/hide it.  We enable/disable
// the newslist/scoreslist content so that only one occupies the scrollable area at once.  We then
// make sure the scroll area and scroll bar parameters reflect the new view.
//
{
	var showingScores = false;
	if ("scores" == inMode) showingScores = true;
	
	backgroundDimmerScoresOverlayShow (showingScores);
	scoresHeaderSetLeague (inLeague, null);
	scoresHeaderShow (showingScores);
	scoresListShow (showingScores);
	newsListShow ( ! showingScores );
	scrollAreaSetContentMode (inMode, inLeague);
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function onClickInfoButton (inEvent)
{
	var front = document.getElementById ("iFrontSide");
	var back = document.getElementById ("iBackSide");
	
	if (window.widget)
		widget.prepareForTransition ("ToBack");
	
	front.style.display = "none";
	back.style.display = "block";
	
	if ("news" == gCurrentMode) newsModeStop ("flip");
	if ("scores" == gCurrentMode) scoresModeStop ("flip");
	
	if (window.widget)
		setTimeout ('widget.performTransition();', 0);		
}



function onClickDoneButton (inEvent)
{
	var select = document.getElementById ("iSportPopupMenu");
	var selectedLeague = select.options[select.selectedIndex].value;
	if (selectedLeague != gCurrentLeague)
		switchLeague (selectedLeague, onClickDoneButton2);
	else
		onClickDoneButton2 ();
}



function onClickDoneButton2 ()
{
	var front = document.getElementById ("iFrontSide");
	var back = document.getElementById ("iBackSide");
	
	if (window.widget)
		widget.prepareForTransition ("ToFront");
	
	front.style.display = "block";
	back.style.display = "none";
	
	if ("news" == gCurrentMode) newsModeStart ("flip");
	if ("scores" == gCurrentMode) scoresModeStart ("flip");
	
	if (window.widget)
		setTimeout ('widget.performTransition();', 0);		
}



function onRequestClickedOnEspnLogo (inEvent)
{
	if (window.widget)
		widget.openURL (kESPNLogoClickedURL);
}



function beginLoadingBackgroundPictureAndSetTitle (inLeague, inFunctionToRunWhenPictureLoaded)
{
	var obj = gLeagueArray [inLeague];
	
	// Set the LEAGUE in "ESPN: LEAGUE" title at the top, trying to localize:
	//
	document.getElementById ("iLeagueTitle").innerText = getLocalizedString (obj.title);
	
	// Load the picture and call the given routine when done loading:
	//
	if (obj.background == gCurrentBackground)
	{
		// Here we are "changing" to the same picture, so don't have our HTML onload proc do anything (in fact,
		// the system won't call it); call the given proc now; and don't change the image source:
		//
		gFunctionToRunWhenPictureLoaded = null;
		if (null != inFunctionToRunWhenPictureLoaded) inFunctionToRunWhenPictureLoaded ();
	}
	else
	{
		// Change to a new picture, so arrange for the given proc to be called and change the image source:
		//
		gCurrentBackground = obj.background;
		gFunctionToRunWhenPictureLoaded = inFunctionToRunWhenPictureLoaded;
		document.getElementById ("iBackgroundPicture").src = "Images/backgrounds/" + obj.background;
	}
	
	// For the AppleInfoButton class we are using for the "i" button, adjust the i's foreground/background depending
	// on the picture (ok to check by league type for this):
	//
	if (gInfoButton != null)
	{
		if ((inLeague == "mlb") || (inLeague == "RPM"))
		{
			gInfoButton.setStyle ("black", "black");
		}
		else
		{
			gInfoButton.setStyle ("white", "black");
		}
	}
}



function onIMGBackgroundPictureLoaded ()
//
// This routine is called by the system when the background image has completed loading, but note that
// it is NOT called by the system if we are "loading" the same image that was already there.
//
{
	if (null != gFunctionToRunWhenPictureLoaded)
	{
		gFunctionToRunWhenPictureLoaded ();
		gFunctionToRunWhenPictureLoaded = null;
	}
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function emptyMouseMoveHandler (inEvent)
{
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function onScoresButtonMouseDown (inEvent, inDiv)
{
	if ("news" == gCurrentMode)
	{
		document.addEventListener("mousemove", emptyMouseMoveHandler, true);
		document.addEventListener("mouseup", scoresButtonMouseUpHandler, true);
		inDiv.addEventListener("mouseover", scoresButtonMouseOverHandler, true);
		inDiv.addEventListener("mouseout", scoresButtonMouseOutHandler, true);
		gMouseIsInButton = true;
		hiliteNewsOrScoresButtons ("scores");
	}

	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function scoresButtonMouseUpHandler (inEvent)
{
	document.removeEventListener("mousemove", emptyMouseMoveHandler, true);
	document.removeEventListener("mouseup", scoresButtonMouseUpHandler, true);
	var div = document.getElementById('iScoresButtonText');
	div.removeEventListener("mouseover", scoresButtonMouseOverHandler, true);
	div.removeEventListener("mouseout", scoresButtonMouseOutHandler, true);

	if (gMouseIsInButton)
	{
		gMouseIsInButton = false;
		
		// Do the work here; at this point the user has committed to switching from showing news to showing scores
		
		gCurrentMode = "scores";
		if (window.widget)
		{
			setPreferenceForKey (gCurrentMode, 'show-scores');
		}
		switchMode ("fromnewstoscores");
		adjustMiddleThings (gCurrentMode, gCurrentLeague);
	}
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function scoresButtonMouseOverHandler (inEvent)
{
	if (!gMouseIsInButton)
	{
		gMouseIsInButton = true;
		hiliteNewsOrScoresButtons ("scores");
		
	}
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function scoresButtonMouseOutHandler (inEvent)
{
	gMouseIsInButton = false;
	hiliteNewsOrScoresButtons ("news");
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function onNewsButtonMouseDown (inEvent, inDiv)
{
	if ("scores" == gCurrentMode)
	{
		document.addEventListener("mousemove", emptyMouseMoveHandler, true);
		document.addEventListener("mouseup", newsButtonMouseUpHandler, true);
		inDiv.addEventListener("mouseover", newsButtonMouseOverHandler, true);
		inDiv.addEventListener("mouseout", newsButtonMouseOutHandler, true);
		gMouseIsInButton = true;
		hiliteNewsOrScoresButtons ("news");
	}

	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function newsButtonMouseUpHandler (inEvent)
{
	document.removeEventListener("mousemove", emptyMouseMoveHandler, true);
	document.removeEventListener("mouseup", newsButtonMouseUpHandler, true);
	var div = document.getElementById('iNewsButtonText');
	div.removeEventListener("mouseover", newsButtonMouseOverHandler, true);
	div.removeEventListener("mouseout", newsButtonMouseOutHandler, true);

	if (gMouseIsInButton)
	{
		gMouseIsInButton = false;
		
		// Do the work here; at this point the user has committed to switching from showing scores to showing news
		
		gCurrentMode = "news";
		if (window.widget)
		{
			setPreferenceForKey (gCurrentMode, 'show-scores');
		}
		switchMode ("fromscorestonews");
		adjustMiddleThings (gCurrentMode, gCurrentLeague);
	}
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function newsButtonMouseOverHandler (inEvent)
{
	if (!gMouseIsInButton)
	{
		gMouseIsInButton = true;
		hiliteNewsOrScoresButtons ("news");
		
	}
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function newsButtonMouseOutHandler (inEvent)
{
	gMouseIsInButton = false;
	hiliteNewsOrScoresButtons ("scores");
	inEvent.stopPropagation();
	inEvent.preventDefault();
}



function hiliteNewsOrScoresButtons (inMode)
{
	var scoresButtonBack = document.getElementById('iScoresButton');
	var scoresButtonText = document.getElementById('iScoresButtonText');
	var newsButtonBack = document.getElementById('iNewsButton');
	var newsButtonText = document.getElementById('iNewsButtonText');
	
	if ("scores" == inMode)
	{
		scoresButtonBack.src = 'Images/buttons/button_white_on.png';
		scoresButtonText.setAttribute ("class", "sButton-TextOn");
		newsButtonBack.src = 'Images/buttons/button_white_off.png';
		newsButtonText.setAttribute ("class", "sButton-TextOff");
	}
	if ("news" == inMode)
	{
		scoresButtonBack.src = 'Images/buttons/button_white_off.png';
		scoresButtonText.setAttribute ("class", "sButton-TextOff");
		newsButtonBack.src = 'Images/buttons/button_white_on.png';
		newsButtonText.setAttribute ("class", "sButton-TextOn");
	}
}



// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------------------



function onWidgetHide ()
//
// This widget has just been hidden, so stop recurrent things to reduce CPU usage.
//
{
	if ("news" == gCurrentMode) newsModeStop ("sleep");
	if ("scores" == gCurrentMode) scoresModeStop ("sleep");
}



function onWidgetShow ()
//
// This widget has just been shown, or it had been started (this gets called after "onWidgetMain" runs),
// so (re)start our timers and adjust the interface as needed.
//
{
	if ("news" == gCurrentMode) newsModeStart ("wake");
	if ("scores" == gCurrentMode) scoresModeStart ("wake");
}



function onWidgetHTMLBodyLoaded ()
{
	if (!window.widget)
		onWidgetShow ();
}



function onWidgetRemove ()
//
// This widget has just been removed from the layer, so remove any preferences as needed.
//
{
	widget.setPreferenceForKey (null, getWidgetInstanceSpecificKey ('league'));
	widget.setPreferenceForKey (null, getWidgetInstanceSpecificKey ('show-scores'));
}



function onWidgetMain ()
//
// The main initialization routine for this widget.
//
{
	// Set up for using the standard "i" button and standard "done" button classes:
	//
	gInfoButton = new AppleInfoButton (document.getElementById ("iInfoButton"), document.getElementById ("iFrontSide"), "white", "black", onClickInfoButton);
	gDoneButton = new AppleGlassButton (document.getElementById ("iDoneButton"), getLocalizedString ("Done"), onClickDoneButton);
	
	// Populate all static titles everywhere with localized versions:
	//
	document.getElementById ("iNewsButtonText").innerText = getLocalizedString ('NEWS');
	document.getElementById ("iScoresButtonText").innerText = getLocalizedString ('SCORES');
	document.getElementById ("iSportPopupMenuTitle").innerText = getLocalizedString ('Sport:');
	
	// Initialize our various managers:
	//
	scrollAreaInit ();
	newsListInit ();
	scoresListInit ();
	crawlAreaInit ();
	
	loadPreferences();
	
}
	
function loadPreferences()
{
	// Read user preference settings for what-sport and news-vs-scores our-entire-widget mode; if these prefs
	// are not (yet) set then don't reset our globals (thus using their preinitialized settings as defaults):
	//
	if (window.widget)
	{
		var leagueFromPreference = getPreferenceForKey ('league');
		if (leagueFromPreference)
			gCurrentLeague = leagueFromPreference;
		
		var modeFromPreference = getPreferenceForKey ('show-scores');
		if (modeFromPreference)
			gCurrentMode = modeFromPreference;
	}
	
	// Populate the list of supported sports leagues in the pop-up menu and rotation.  Give the "value" fields the
	// league-array-index, and the "selectedIndex" (pop-up system API) an integer 0..N depending on the order in the
	// pop-up menu list.  Any unsupported (for this widget version) sport league is skipped.  If for any reason
	// (default or an older pref file), we end up with a league that is not supported in this widget version, we force
	// the gCurrentLeague to the first pop-up item.  So the menu will be populated only with safe items and gCurrentLeague
	// will be safe:
	//
	var select = document.getElementById ("iSportPopupMenu");
	var j = 0;
	for (var i in gLeagueArray)
	{
		if (true == gLeagueArray[i].staticEnable)
		{
			var option = document.createElement ('option');
			option.innerText = getLocalizedString (gLeagueArray[i].title);
			option.value = i;
			select.appendChild (option);
			
			if (i == gCurrentLeague)
				select.selectedIndex = j;
			
			j++;
		}
	}
	if (false == gLeagueArray[gCurrentLeague].staticEnable)
	{
		select.selectedIndex = 0;
		gCurrentLeague = select.options[select.selectedIndex].value;
	}
	
	// Set the visual state for everything on the front:
	//
	beginLoadingBackgroundPictureAndSetTitle (gCurrentLeague, null);
	hiliteNewsOrScoresButtons (gCurrentMode);
	adjustMiddleThings (gCurrentMode, gCurrentLeague);
	
	// Init the executive feeds and display masterminds; only one will be current:
	//
	newsModeStart ("init");
	scoresModeStart ("init");
	if ("news" == gCurrentMode) newsModeStart ("first");
	if ("scores" == gCurrentMode) scoresModeStart ("first");
}



//
// Direct code to run always as this Javascript file is loaded:
//

if (window.widget)
{
	widget.onremove = onWidgetRemove;
	widget.onhide = onWidgetHide;
	widget.onshow = onWidgetShow;
	widget.onsync = onWidgetSync;
}

function onWidgetSync()
{
	loadPreferences();
}