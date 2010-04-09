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
// The "API" for code in this parser.js file must be kept in sync with the rest of the widget; however,
// it is allowed to revise from time to time: the contents of this file might be downloaded from the net.
// For the purposes of API interface rev X, and, within that interface rev, compatible release rev Y, here
// is a version number of the form X.Y:
//
// ESPN Parser Version 1.2
//



//
// The main website URL for clicking on the backside logo:
//

var kESPNLogoClickedURL = "http://www.espn.com";



//
// The Leagues Array contains data on all sports-"leagues" and refers to the Kinds Array.
// Carefully note that the index string ("mlb", etc) is the ESPN-coverage-category-league-name and is a
// naming convention that is passed around as a token and is thus more than simply an arbitrary index.
// The "staticEnable" fields can be used to turn off entire leagues from this widget version:
//

var gLeagueArray = new Array;

gLeagueArray ['RPM'] =				{
									staticEnable:	false,
									title:			"Auto Racing",
									kind:			'racing',
									feed:			'http://wu.apple.com/rpm/bottomline/xml/race',
									url:			'http://sports.espn.go.com/rpm/index',
									background:		'racing.png',
									scoreParser:	scoreParser_racing
									};
									
gLeagueArray ['mlb'] =				{
									staticEnable:	true,
									title:			"Baseball",
									kind:			'baseball',
									feed:			'http://wu.apple.com/mlb/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/mlb/index',
									background:		'baseball.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['nba'] =				{
									staticEnable:	true,
									title:			"Basketball",
									kind:			'basketball',
									feed:			'http://wu.apple.com/nba/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/nba/index',
									background:		'basketball.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['WNBA'] =				{
									staticEnable:	true,
									title:			"Basketball - Women's Pro",
									kind:			'basketball',
									feed:			'http://wu.apple.com/wnba/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/wnba/index',
									background:		'basketball.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['ncb'] =				{
									staticEnable:	true,
									title:			"Basketball - College",
									kind:			'basketball',
									feed:			'http://wu.apple.com/ncb/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/ncb/index',
									background:		'basketball.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['ncw'] =				{
									staticEnable:	true,
									title:			"Basketball - Women's",
									kind:			'basketball',
									feed:			'http://wu.apple.com/ncw/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/ncw/index',
									background:		'basketball.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['nfl'] =				{
									staticEnable:	true,
									title:			"Football",
									kind:			'football',
									feed:			'http://wu.apple.com/nfl/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/nfl/index',
									background:		'football.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['ncf'] =				{
									staticEnable:	true,
									title:			"Football - College",
									kind:			'football',
									feed:			'http://wu.apple.com/ncf/bottomline/xml/scores ',
									url:			'http://sports.espn.go.com/ncf/index',
									background:		'football.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['GOLF'] =				{
									staticEnable:	false,
									title:			"Golf",
									kind:			'golf',
									feed:			'http://wu.apple.com/golf/bottomline/xml/leaderboard',
									url:			'http://sports.espn.go.com/golf/index',
									background:		'golf.png',
									scoreParser:	scoreParser_golf
									};
									
gLeagueArray ['nhl'] =				{
									staticEnable:	true,
									title:			"Hockey",
									kind:			'hockey',
									feed:			'http://wu.apple.com/nhl/bottomline/xml/scores',
									url:			'http://sports.espn.go.com/nhl/index',
									background:		'hockey.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['INTLSOC'] =			{
									staticEnable:	false,
									title:			"Soccer - International",
									kind:			'soccer',
									feed:			'http://wu.apple.com/bottomline/xml/scores?source=INTLSOC',
									url:			'http://soccernet.espn.go.com',
									background:		'soccer.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['EUROSOC'] =			{
									staticEnable:	false,
									title:			"Soccer - Europe",
									kind:			'soccer',
									feed:			'http://wu.apple.com/bottomline/xml/scores?source=EUROSOC',
									url:			'http://soccernet.espn.go.com/section?id=europe',
									background:		'soccer.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['UKSOC'] =			{
									staticEnable:	false,
									title:			"Soccer - UK",
									kind:			'soccer',
									feed:			'http://wu.apple.com/bottomline/xml/scores?source=UKSOC',
									url:			'http://soccernet.espn.go.com/section?id=england',
									background:		'soccer.png',
									scoreParser:	scoreParser_standard
									};
									
gLeagueArray ['USASOC'] =			{
									staticEnable:	false,
									title:			"Soccer - US",
									kind:			'soccer',
									feed:			'http://wu.apple.com/bottomline/xml/scores?source=USASOC',
									url:			'http://soccernet.espn.go.com/index?ver=us',
									background:		'soccer.png',
									scoreParser:	scoreParser_standard
									};

gLeagueArray ['TENNIS'] =			{
									staticEnable:	false,
									title:			"Tennis",
									kind:			'tennissingles',
									feed:			'http://wu.apple.com/sports/tennis/bottomline/xml/scores',
									url:			'http://espn.go.com/tennis/index.html',
									background:		'tennis.png',
									scoreParser:	scoreParser_tennis
									};



//
// The Kinds Array defines sport-specific info and layout styles.  Note that the multiple sports leagues given in the main
// Sports Leagues Array above may share the same layout (for example US Soccer, International Soccer, etc).  Carefully
// note that the index string ("baseball", etc) is a naming convention that is passed around, is a suffix in HTML items,
// etc; it is thus more than simply an index.  Even though this is layout-specific, the list of leagues can be feed-specific
// so define it here in the parser:
//

var gKindsArray = new Array;

gKindsArray ['baseball'] =			{
									teamComposition:		"team",
									layoutRowType:			"2row"
									};
									
gKindsArray ['football'] =			{
									teamComposition:		"team",
									layoutRowType:			"2row"
									};
									
gKindsArray ['basketball'] =		{
									teamComposition:		"team",
									layoutRowType:			"2row"
									};
									
gKindsArray ['soccer'] =			{
									teamComposition:		"team",
									layoutRowType:			"1row"
									};
									
gKindsArray ['hockey'] =			{
									teamComposition:		"team",
									layoutRowType:			"2row"
									};
									
gKindsArray ['golf'] =				{
									teamComposition:		"individual",
									layoutRowType:			"1row"
									};
									
gKindsArray ['racing'] =			{
									teamComposition:		"individual",
									layoutRowType:			"1row"
									};

gKindsArray ['tennissingles'] =		{
									teamComposition:		"individual",
									layoutRowType:			"2row"
									};
									
gKindsArray ['tennisdoubles'] =		{
									teamComposition:		"team",
									layoutRowType:			"2row"
									};



function fetchNews (inLeague, inDataConsumerCallback)
//
// Called from the main ESPN.js code.
//
// Initiates XML feed request for NEWS.  When data is available, the given callback will be called by the
// news parser routine below (see comments therein for data format):
//
{
	var url = 'http://wu.apple.com/espn/bottomline/xml/news?news=';
	
	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {newsParser(e, xml_request, inDataConsumerCallback, inLeague, (new Date).getTime());}
	xml_request.overrideMimeType("text/xml");
	xml_request.open("GET", url+inLeague);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.send(null);
	
	return xml_request;
}



function newsParser (inDOMEvent, inRequest, inDataConsumerCallback, inLeague, inTimeStamp)
//
// This routine is called when the XML request completes.  It parses the XML feed data (the feed data is DOM
// object compatible and thus can be traversed as if it were an HTML hierarchy) and then calls the
// given callback routine (which should be a data consumer for display) with an anonymous object like so:
//
// object
//		error:			Boolean false for success, true if error.
//		errorString:	Failure string if error.
//		refresh:		Number of millliseconds before you should refresh, or 0 if no recommendation.
//		league:			The sport league requested.
//		stamp:			Milliseconds stamp on receipt of request.
//		stories:		Array[n] of anonymous objects like so:
//			object
//				headline:	The text headline.
//				url:		URL for the headline.
//
{
	// In all cases, first pre-initialize output with zero/null state for not-fully-filled-out return especially if error:
	//
	var outObj = {error:false, errorString:null, refresh:0, league:inLeague, stamp:inTimeStamp, stories:new Array};
	
	if (inRequest.responseXML)
	{
		try
		{
			if (inRequest.readyState != 4)   { outObj.error = true;   outObj.errorString = "newsParser: readyState not 4";   inDataConsumerCallback (outObj);   return; }
			if (inRequest.status != 200)     { outObj.error = true;   outObj.errorString = "newsParser: status not 200";     inDataConsumerCallback (outObj);   return; }
			
			var Generator = findChild (inRequest.responseXML, 'Generator');
			if (Generator == null)   { outObj.error = true;   outObj.errorString = "newsParser: responseXML contains no <Generator>";     inDataConsumerCallback (outObj);   return; }
			
			var Session = findChild (Generator, 'Session');
			if (Session == null)   { outObj.error = true;   outObj.errorString = "newsParser: responseXML contains no <Session>";     inDataConsumerCallback (outObj);   return; }
			
			var Group = findChildWithAttribute (Session, 'Group', 'groupId', 'init');
			if (Group != null)
			{
				var delay = findChildWithAttribute (Group, 'Node', 'nodeId', 'delay');
				if (delay != null) outObj.refresh = parseInt (delay.firstChild.data, 10) * 1000;
			}
			
			Group = findChildWithAttribute (Session, 'Group', 'groupId', inLeague);
			if (Group != null)
			{
				for (var child = Group.firstChild; child != null; child = child.nextSibling)
				{
					if (child.nodeName == 'Node')
					{
						var Headline = findChild (child, 'Headline');
						var URL = findChild (child, 'URL');
						
						if (Headline != null)
						{
							var url = null;
							if (URL != null)
								url = URL.firstChild.data;
								
							outObj.stories[outObj.stories.length] = {headline:Headline.firstChild.data, url:url};
						}
					}
				}
			}
			
			try
			{
				inDataConsumerCallback (outObj);
			}
			catch (ex)
			{
				outObj.error = true;
				outObj.errorString = "newsParser: throw during data consumer callback (re-calling): " + ex;
				inDataConsumerCallback (outObj);
			}
		}
		catch (ex)
		{
			outObj.error = true;
			outObj.errorString = "newsParser: throw during parse: " + ex;
			inDataConsumerCallback (outObj);
		}
	}
	else
	{
		outObj.error = true;
		outObj.errorString = "newsParser: no responseXML";
		inDataConsumerCallback (outObj);
	}
}



function fetchScores (inLeague, inDataConsumerCallback)
//
// Called from the main ESPN.js code.
//
// Initiates XML feed request for SCORES.  When data is available, the given callback will be called by one
// of the league-specific (see league array) parser routines below (see comments therein for data format):
//
{
	var obj = gLeagueArray [inLeague];
	
	var xml_request = new XMLHttpRequest();
	xml_request.onload = function(e) {obj.scoreParser(e, xml_request, inDataConsumerCallback, inLeague, (new Date).getTime());}
	xml_request.overrideMimeType("text/xml");
	xml_request.open("GET", obj.feed);
	xml_request.setRequestHeader("Cache-Control", "no-cache");
	xml_request.send(null);
	
	return xml_request;
}



function scoreParser_standard (inDOMEvent, inRequest, inDataConsumerCallback, inLeague, inTimeStamp)
//
// This routine is called when the XML request completes.  It parses the XML feed data (the feed data is DOM
// object compatible and thus can be traversed as if it were an HTML hierarchy) and then calls the
// given callback routine (which should be a data consumer for display) with an anonymous object like so.
// Here we assume that data is in the generic form for most sports:
//
// object
//		error:									Boolean false for success, true if error.
//		errorString:							Failure string if error.
//		refresh:								Integer millliseconds before you should refresh, or 0 if no recommendation.
//		league:									String of the sport league requested.
//		stamp:									Integer milliseconds stamp on receipt of request.
//		games:									Array[n] of anonymous objects like so:
//			object
//				id:								String ID for the game.
//				url:							String URL for the game.
//				away:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				home:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				statusId:						Integer 1=pre-game, 3=final, else=in-progress.
//				statusStr:						If pre-game, game start time; if in-progress, status with time-in-game emphasis.
//				statusLineDetailStrs:			Array[n] of strings that have extra detail or TV info about this game.
//
{
	// In all cases, first pre-initialize output with zero/null state for not-fully-filled-out return especially if error:
	//
	var outObj = {error:false, errorString:null, refresh:0, league:inLeague, stamp:inTimeStamp, games:new Array};
	
	if (inRequest.responseXML)
	{
		try
		{
			if (inRequest.readyState != 4)   { outObj.error = true;   outObj.errorString = "scoreParser_standard: readyState not 4";   inDataConsumerCallback (outObj);   return; }
			if (inRequest.status != 200)     { outObj.error = true;   outObj.errorString = "scoreParser_standard: status not 200";     inDataConsumerCallback (outObj);   return; }
			
			var SCORES = findChild (inRequest.responseXML, 'SCORES');
			if (SCORES == null)   { outObj.error = true;   outObj.errorString = "scoreParser_standard: responseXML contains no <SCORES>";     inDataConsumerCallback (outObj);   return; }
			
			var DELAY = findChild (SCORES, 'DELAY');
			if (DELAY != null) outObj.refresh = parseInt (DELAY.firstChild.data, 10) * 1000;
			
			for (var child = SCORES.firstChild;   child != null;   child = child.nextSibling)
			{
				if (child.nodeName == 'GAME')
				{
					var game = {id:null, url:null, away:null, home:null, statusId:0, statusStr:null, statusLineDetailStrs:new Array};
					
					var GAMEID = findChild (child, 'GAMEID');
					if (GAMEID == null) continue;
					game.id = trimWhiteSpace (GAMEID.firstChild.data);
					
					var URL = findChild (child, 'URL');
					if (URL != null)
					{
						game.url = trimWhiteSpace (URL.firstChild.data);
					}
					
					var AWAY = findChild (child, 'AWAY');
					if (AWAY == null) continue;				// bad entry: can't find AWAY: skip to next GAME
					game.away = createTeamObject (AWAY);
					if (game.away == null) continue;		// bad entry: TEAM and/or SCORE in AWAY: skip to next GAME
					
					var HOME = findChild (child, 'HOME');
					if (HOME == null) continue;				// bad entry: can't find HOME: skip to next GAME
					game.home = createTeamObject (HOME);
					if (game.home == null) continue;		// bad entry: TEAM and/or SCORE in HOME: skip to next GAME
					
					var STATUSID = findChild (child, 'STATUSID');
					if (STATUSID != null)
						game.statusId = parseInt (STATUSID.firstChild.data, 10);
					
					var STATUS = findChild (child, 'STATUS');
					if (STATUS != null)
						game.statusStr = trimWhiteSpace (STATUS.firstChild.data);
					
					var STATUSLINE = findChild (child, 'STATUSLINE');
					if (STATUSLINE != null)
					{
						for (var child2 = STATUSLINE.firstChild;   child2 != null;   child2 = child2.nextSibling)
						{
							if (child2.nodeName == 'DATA')
							{
								game.statusLineDetailStrs[game.statusLineDetailStrs.length] = trimWhiteSpace (child2.firstChild.data);
							}
						}
					}
					
					outObj.games[outObj.games.length] = game;
				}
			}
			
			try
			{
				inDataConsumerCallback (outObj);
			}
			catch (ex)
			{
				outObj.error = true;
				outObj.errorString = "scoreParser_standard: throw during data consumer callback (re-calling): " + ex;
				inDataConsumerCallback (outObj);
			}
		}
		catch (ex)
		{
			outObj.error = true;
			outObj.errorString = "scoreParser_standard: throw during parse: " + ex;
			inDataConsumerCallback (outObj);
		}
	}
	else
	{
		outObj.error = true;
		outObj.errorString = "scoreParser_standard: no responseXML";
		inDataConsumerCallback (outObj);
	}
}



function scoreParser_golf (inDOMEvent, inRequest, inDataConsumerCallback, inLeague, inTimeStamp)
//
// This routine is called when the XML request completes.  It parses the XML feed data (the feed data is DOM
// object compatible and thus can be traversed as if it were an HTML hierarchy) and then calls the
// given callback routine (which should be a data consumer for display) with an anonymous object like so
// (the parsing herein assumes the XML is in the special form for golf):
//
// object
//		error:									Boolean false for success, true if error.
//		errorString:							Failure string if error.
//		refresh:								Integer millliseconds before you should refresh, or 0 if no recommendation.
//		league:									String of the sport league requested.
//		stamp:									Integer milliseconds stamp on receipt of request.
//		games:									Array[n] of anonymous objects like so:
//			object
//				id:								String ID for the game.
//				url:							String URL for the game.
//				away:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				home:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				statusId:						Integer 1=pre-game, 3=final, else=in-progress.
//				statusStr:						If pre-game, game start time; if in-progress, status with time-in-game emphasis.
//				statusLineDetailStrs:			Array[n] of strings that have extra detail or TV info about this game.
//
{
	// In all cases, first pre-initialize output with zero/null state for not-fully-filled-out return especially if error:
	//
	var outObj = {error:false, errorString:null, refresh:0, league:inLeague, stamp:inTimeStamp, stories:new Array};
	
	outObj.error = true;
	outObj.errorString = "scoreParser_golf: not implemented";
	inDataConsumerCallback (outObj);
}



function scoreParser_racing (inDOMEvent, inRequest, inDataConsumerCallback, inLeague, inTimeStamp)
//
// This routine is called when the XML request completes.  It parses the XML feed data (the feed data is DOM
// object compatible and thus can be traversed as if it were an HTML hierarchy) and then calls the
// given callback routine (which should be a data consumer for display) with an anonymous object like so
// (the parsing herein assumes the XML is in the special form for racing):
//
// object
//		error:									Boolean false for success, true if error.
//		errorString:							Failure string if error.
//		refresh:								Integer millliseconds before you should refresh, or 0 if no recommendation.
//		league:									String of the sport league requested.
//		stamp:									Integer milliseconds stamp on receipt of request.
//		games:									Array[n] of anonymous objects like so:
//			object
//				id:								String ID for the game.
//				url:							String URL for the game.
//				away:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				home:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				statusId:						Integer 1=pre-game, 3=final, else=in-progress.
//				statusStr:						If pre-game, game start time; if in-progress, status with time-in-game emphasis.
//				statusLineDetailStrs:			Array[n] of strings that have extra detail or TV info about this game.
//
{
	// In all cases, first pre-initialize output with zero/null state for not-fully-filled-out return especially if error:
	//
	var outObj = {error:false, errorString:null, refresh:0, league:inLeague, stamp:inTimeStamp, stories:new Array};
	
	outObj.error = true;
	outObj.errorString = "scoreParser_racing: not implemented";
	inDataConsumerCallback (outObj);
}



function scoreParser_tennis (inDOMEvent, inRequest, inDataConsumerCallback, inLeague, inTimeStamp)
//
// This routine is called when the XML request completes.  It parses the XML feed data (the feed data is DOM
// object compatible and thus can be traversed as if it were an HTML hierarchy) and then calls the
// given callback routine (which should be a data consumer for display) with an anonymous object like so
// (the parsing herein assumes the XML is in the special form for tennis):
//
// object
//		error:									Boolean false for success, true if error.
//		errorString:							Failure string if error.
//		refresh:								Integer millliseconds before you should refresh, or 0 if no recommendation.
//		league:									String of the sport league requested.
//		stamp:									Integer milliseconds stamp on receipt of request.
//		games:									Array[n] of anonymous objects like so:
//			object
//				id:								String ID for the game.
//				url:							String URL for the game.
//				away:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				home:							Anonymous object like so:
//					object
//						team:					String name of the team.
//						score:					String score.
//				statusId:						Integer 1=pre-game, 3=final, else=in-progress.
//				statusStr:						If pre-game, game start time; if in-progress, status with time-in-game emphasis.
//				statusLineDetailStrs:			Array[n] of strings that have extra detail or TV info about this game.
//
{
	// In all cases, first pre-initialize output with zero/null state for not-fully-filled-out return especially if error:
	//
	var outObj = {error:false, errorString:null, refresh:0, league:inLeague, stamp:inTimeStamp, stories:new Array};
	
	outObj.error = true;
	outObj.errorString = "scoreParser_tennis: not implemented";
	inDataConsumerCallback (outObj);
	return;
}



function createTeamObject (inParent)
{
	var TEAM = findChild (inParent, 'TEAM');
	var SCORE = findChild (inParent, 'SCORE');
	
	if (TEAM == null || SCORE == null)
		return null;
	else
		return { team:trimWhiteSpace (TEAM.firstChild.data), score:trimWhiteSpace (SCORE.firstChild.data) };
}



function findChild (inElement, inNodeName)
{
	var aChild;
	
	for (aChild = inElement.firstChild;   aChild != null;   aChild = aChild.nextSibling)
	{
		if (aChild.nodeName == inNodeName)
			return aChild;
	}
	
	return null;
}



function findChildWithAttribute (inElement, inNodeName, inAttribute, inValue)
{
	var aChild;
	
	for (aChild = inElement.firstChild;   aChild != null;   aChild = aChild.nextSibling)
	{
		if (aChild.nodeName == inNodeName && aChild.getAttribute(inAttribute) == inValue)
			return aChild;
	}
	
	return null;
}



function trimWhiteSpace (inString)
//
// Returns a string that is the same as the input string but without any leading and trailing white space
// characters.  Any white space within the string (after first nonwhite and before last nonwhite) is kept
// as-is, however.  We use this as a general safety filter.
//
{
	return inString.replace(/^\s*/, "").replace(/\s*$/, "");
}


