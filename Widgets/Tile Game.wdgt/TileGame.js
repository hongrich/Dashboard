/*
Copyright ＿ 2005, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/
var nby = 4;
var pixelsPerSquare = 36;
var board = new Array(nby*nby);

var lastdragsrc = null;

//
// Tile class
// 
var tile_id = 0;
function Tile (index,isempty)
{
	this.index = index;
	this.originalIndex = index;
	this.sorter = 0;
	this.isempty = isempty;
	this.id = tile_id++;
}

Tile.prototype.topLeftInImage = function () 
{
	var top = (Math.floor(this.originalIndex / nby) * pixelsPerSquare);
	var left = (Math.floor(this.originalIndex % nby) * pixelsPerSquare);
	
	return {left:left, top:top};
}

Tile.prototype.topLeftNow = function ()
{
	var top = (Math.floor(this.index / nby) * pixelsPerSquare);
	var left = (Math.floor(this.index % nby) * pixelsPerSquare);

	return {left:left, top:top};
}

function load()
{
	setupBoard();
	layout();
}

//
// board routines
//
function setupBoard ()
{
	var c = (nby*nby) - 1;
	
	for (var i = 0; i < c; ++i)
	{
		board[i] = new Tile(i, false);	
	}
	board[c] = new Tile (c, true);
}


function layout ()
{
	//actual layout work is in layoutWithImage
	//test custom image here first, if that doesn't work
	
	var imgsrc = "Images/game.png";
	
	if (window.widget)
	{
		var newsrc = widget.preferenceForKey("saved-image");
		if (newsrc && newsrc.length > 0)
			imgsrc = newsrc;
	}
	
	lastdragsrc = imgsrc;

	var testImage = document.createElement('img');
	testImage.onerror = function() { 
		//the saved image is no longer there, or didnt work. Use default image
		widget.setPreferenceForKey (null, "saved-image");
		layoutWithImage("Images/game.png") 
		};
	testImage.onload = function() { layoutWithImage(imgsrc)};
	testImage.src = imgsrc;
}

function layoutWithImage(imgsrc)
{
	var c = (nby*nby);
	var tilesDiv = document.getElementById('tiles');
	
	// write the empty div
	c = c-1;
	for (var i = 0; i < c; ++i) // we know the first tile is the empty one
	{
		var tile = board[i];
		var imagePt = tile.topLeftInImage();
		var nowPt = tile.topLeftNow();
				
		tiles.innerHTML +=
		"<img class='tile' id='" + i + "_tile' src='" + imgsrc + "' height='144' width='144' onclick='click(event);' " +
		"style='top:" + ((nowPt.top - imagePt.top) + 11) + "px; left:" + ((nowPt.left - imagePt.left) + 14) + "px; " + 
			   "clip:rect(" + nowPt.top + "px, " + 
			   		      (nowPt.left + pixelsPerSquare) + "px, " + 
			   		      (nowPt.top + pixelsPerSquare) + "px, " +
			   		      nowPt.left + "px);'/>";
	}
	tiles.innerHTML += "<div class='empty' id='" + i + "_tile' style='top:0px; left:0px'></div>";	
	
	findImgs();	
}

function tileAtPoint (x, y)
{
	var tile;
	
	// translate point to the game surface
	x -= 15;
	y -= 11;
	var col = Math.floor(x / pixelsPerSquare);
	var row = Math.floor(y / pixelsPerSquare);
	
	return board[(row * nby) + col];
}

var firstTime = true;
function click(event)
{
	if (firstTime && event.shiftKey)
		firstTime = false;
		
	if (firstTime)
	{
		if (animation.onfinished == null)
		{
			initialAnimation();
		}
		else
		{
			firstTime = false;	
			animation.onfinished = null;
		}
	}
	else
	{
	
	// the event is caught by the grid image so we need to determine what element it is ourselves
	//	var element = event.target;
		var tile = tileAtPoint(event.clientX, event.clientY);
		var element = tile.element;
		var i = tile.index;
		
		if (tile != null) // always will be true
		{
			var col = i % nby;
			var row = Math.floor(i / nby);
			var c = nby*nby;
			
			function checkleft (i, row, col)
			{
				if (col > 0)
				{
					var array = new Array;
					var arraySize = 0;
					
					
					for (var j = i; col >= 0; --col, --j)
					{
						if (board[j].isempty)
						{
							array[arraySize++] = {from:j, to:i, tile:board[j]};
							return array;
						}
						else
						{
							array[arraySize++] = {from:j, to:j-1, tile:board[j]};
						}
					}
					
					return null;
				
				}
				else
					return null
			}
			
			function checkright(i, row, col)
			{

				if (col < (nby-1))
				{
					var array = new Array;
					var arraySize = 0;
					
					for (var j = i; col < nby; ++col, ++j)
					{
						if (board[j].isempty)
						{
							array[arraySize++] = {from:j, to:i, tile:board[j]};
							return array;
						}
						else
						{
							array[arraySize++] = {from:j, to:j+1, tile:board[j]};
						}
					}
					
					return null;
				
				}
				else
					return null
			}
			
			function checkup (i, row, col)
			{
				if (row > 0)
				{
					var array = new Array;
					var arraySize = 0;
					
					for (var j = i; row >= 0; --row, j = j-nby)
					{
						if (board[j].isempty)
						{
							array[arraySize++] = {from:j, to:i, tile:board[j]};
							return array;
						}
						else
						{
							array[arraySize++] = {from:j, to:j-nby, tile:board[j]};
						}
					}
					
					return null;
				
				}
				else
					return null
			}
			
			function checkdown(i, row, col)
			{
			
				if (row < (nby-1))
				{
					var array = new Array;
					var arraySize = 0;
					
					for (var j = i; row < nby; ++row, j = j+nby)
					{
						if (board[j].isempty)
						{
							array[arraySize++] = {from:j, to:i, tile:board[j]};
							return array;
						}
						else
						{
							array[arraySize++] = {from:j, to:j+nby, tile:board[j]};
						}
					}
					
					return null;
				
				}
				else
					return null;
			}
			
			// fetch the movement arrays
			var new_positions;
			new_positions = checkleft(i, row, col);
			if (new_positions == null)
			{
				new_positions = checkright(i, row, col);
				
				if (new_positions == null)
				{
					new_positions = checkup(i, row, col);
					if (new_positions == null)
					{
						new_positions = checkdown(i, row, col);	
					}
				}
			}
			
			// now move the items on a timer
			if (new_positions)
			{
				var c = new_positions.length;
				
				// last item in the array is always the empty piece				
				array = new Array;

				for (i = 0; i < c; ++i)
				{
					var from = new_positions[i].from;
					var top, left;
					tile = new_positions[i].tile;
					tile.index = new_positions[i].to;
					board[tile.index] = tile;  // move the tile to its correct place
					
					var nowPt = tile.topLeftNow();

					if (tile.isempty)
					{
						top = nowPt.top+11;
						left = nowPt.left+15;				
					}
					else
					{
						var imagePt = tile.topLeftInImage();
						
						top = (nowPt.top - imagePt.top) + 11;
						left = (nowPt.left - imagePt.left) + 14;
					}
					
					array[i] = {to:{x:left, y:top}, from:{x:parseInt(tile.element.style.left), y:parseInt(tile.element.style.top)}, element:tile.element};
				}
				
				if (animation.timer != null)
				{
					// if we already have a timer going finish the animation
					clearInterval(animation.timer);
					animation.timer = null;
					
					var array = animation.array;
					var c = array.length;
					var x, y;
					var element;
					for (i = 0; i < c; i++)
					{
						x = array[i].to.x;
						y = array[i].to.y;
						
						element = array[i].element;
						element.style.top = y.toString()+"px";
						element.style.left = x.toString()+"px";
					}
					
					animation.array = null;
				
				}

				var starttime = (new Date).getTime() - 13; // set it back one frame
				
				animation.duration = event.shiftKey ? 1000 : 100;
				animation.starttime = starttime;
				animation.array = array;
				animation.onfinished = null;
				animation.timer = setInterval ("animate();", 13);
				
				animate ();
				
				// check to see if the puzzle is solved
				var complete = true;
				for (i = 0; i < c; ++i)
				{
					tile = board[i];
					if (tile.originalIndex != tile.index)
					{
						complete = false;
						break;
					}
				}
				
				//if (complete)
				//	debug ("solved");
			}

		}
		else
		{
			debug ("horrible error");
		}
	}

}

function findImgs()
{
	var c = (nby*nby);
	
	for (var i=0; i < c; ++i)
		board[i].element = document.getElementById(i.toString() + "_tile");
}

var count = 0;
function randomizeBoard ()
{
	
	var c = (nby*nby);
	var element;
	var tile;
	var i;
	
	count++;
	
	for (i = 0; i < c; ++i)
	{
		board[i].sorter = Math.random();
	}
	board.sort (function(a,b) {return a.sorter-b.sorter;});

		
	for (i = 0; i < c; ++i)
	{
		tile = board[i];

		element = tile.element;
		tile.index = i; // set to the index of where it is in the board
		var nowPt = tile.topLeftNow();

		if (tile.isempty)
		{
			element.style.top = nowPt.top.toString() + "px";
			element.style.left = nowPt.left.toString() + "px";
			
		}
		else
		{
			var imagePt = tile.topLeftInImage();
			
			
			element.style.top = (nowPt.top - imagePt.top).toString() + "px";
			element.style.left = (nowPt.left - imagePt.left).toString() + "px";
		}
	}
	
	if (count < 8)	
		setTimeout ("randomizeBoard();", 80);
}


function findEmptyTile ()
{
	var c = (nby*nby);
	
	for (var i = 0; i < c; ++i)
	{
		if (board[i].isempty) return board[i];	
	}

	return null; // never happens
}

function dumpBoard ()
{
	var c = (nby*nby);
	
	for (var i = 0; i < c; ++i)
	{
		debug (i.toString() + "tile {empty: " + board[i].isempty + " id: " + board[i].id + " index: " + board[i].index + "}");
	}
}

var seed = (new Date).getSeconds();
function getRandomItemFromArray (array)
{
	var index = Math.round(Math.random(seed) * array.length);
	if (index == array.length) index = 0;
	
	return array[index];
}

function removeIfEqual (array, x)
{
	var c = array.length;
	
	for (var i = 0; i < c; ++i)
	{
		if (array[i] == x)
		{
			array.splice(i, 1); // remove it
			break;					
		}
	}	
}
var lastIndex = -1;
function initialAnimation()
{
	animation.duration = 100;
	animation.starttime = (new Date).getTime() - 13;
	animation.onfinished = initialAnimation;
	animation.timer = setInterval ("animate();", 13);

	var empty_tile = findEmptyTile();	
	var index = empty_tile.index;
	var col = index % nby;

	var row = Math.floor(index / nby);

	var rand = Math.random();

	var available_locations = new Array;
	var count = 0;
	
	// left
	if (col > 0)
		available_locations[count++] = index -1;	
	// right
	if (col < (nby-1))
		available_locations[count++] = index+1;
	// up
	if (row > 0)
		available_locations[count++] = index - nby;
	//down
	if (row < (nby-1))
		available_locations[count++] = index + nby;
	
	var newIndex;
	
	if (lastIndex != -1) // remove the last location
	{
		// remove the last place that the empty square
		// so that we do not jump back and forth.
		removeIfEqual(available_locations, lastIndex);
	}
		
	
	newIndex = getRandomItemFromArray(available_locations);
	lastIndex = index;

	var tile = board[newIndex];

	board[newIndex] = empty_tile;
	board[index] = tile;

	empty_tile.index = newIndex;
	tile.index = index;
	
	var nowPt = tile.topLeftNow();
	var imagePt = tile.topLeftInImage();

	var top = (nowPt.top - imagePt.top) + 11;
	var left = (nowPt.left - imagePt.left) + 14;

	animation.array = new Array ({to:{x:left, y:top}, from:{x:parseInt(tile.element.style.left), y:parseInt(tile.element.style.top)}, element:tile.element});
	animate();
}


//
// animation implementation
//

var animation = {duration:0, starttime:0, array:null, timer:null, onfinished:null};

function limit_3 (a, b, c)
{
    return a < b ? b : (a > c ? c : a);
}

function computeNextFloat (from, to, ease)
{
    return from + (to - from) * ease;
}


function animate()
{
	var T;
	var ease;
	var time = (new Date).getTime();
	var array = animation.array;
	var c = array.length;
	var i;
	var x, y, element;
		
	
	T = limit_3(time-animation.starttime, 0, animation.duration);
	ease = 0.5 - (0.5 * Math.cos(Math.PI * T / animation.duration));
	
	if (T >= animation.duration)
	{
		clearInterval (animation.timer);
		animation.timer = null;
		
		for (i = 0; i < c; ++i)
		{
			x = array[i].to.x;
			y = array[i].to.y;
			
			element = array[i].element;
			element.style.top = y.toString()+"px";
			element.style.left = x.toString()+"px";
		}

		if (animation.onfinished)
			setTimeout ("animation.onfinished();", 0); // call after the last frame is drawn
	}
	else
	{
		for (i = 0; i < c; ++i)
		{
			x = computeNextFloat (array[i].from.x, array[i].to.x, ease);
			y = computeNextFloat (array[i].from.y, array[i].to.y, ease);
			x = Math.floor(x);
			y = Math.floor(y);
			
			element = array[i].element;
			element.style.top = y.toString()+"px";
			element.style.left = x.toString()+"px";
		}
	}
}

function dragImageLoaded ()
{
	if (dragImage)
	{
		var c = (nby*nby);
		var img;
		
		for (var i = 0; i < c; ++i)
		{
			img = document.getElementById (i + "_tile");
			img.src = dragImage.src;
		}
	}
}

function dragImageError ()
{
	dragImage = null;
}

var dragImage = null;
var dropped = false;
function dragenter (event)
{
	var uri = null;
	dropped = false;
	try {
		var uriString = event.dataTransfer.getData("text/uri-list");
		var uriList = uriString.split("\n");
		uri = uriList[0];
	} catch (ex)
	{
	}
	
	if (uri)
	{
		dragImage = new Image (144, 144);
		
		dragImage.onload = dragImageLoaded;
		dragImage.onerror = dragImageError;
		dragImage.src = uri;
	}
		
	event.stopPropagation();
	event.preventDefault();

}

function dragover (event)
{	
	event.stopPropagation();
	event.preventDefault();
}

function dragdrop (event)
{
	if (dragImage != null)
	{
		if (window.widget)
			widget.setPreferenceForKey (dragImage.src, "saved-image");
		lastdragsrc = dragImage.src;
	}

	dropped = true;
	dragImage = null;
	event.stopPropagation();
	event.preventDefault();
}


function dragleave (event)
{
	if (!dropped)
	{
		var c = (nby*nby);
		var img;
		var src = lastdragsrc ? lastdragsrc : "Images/game.png";
		for (var i = 0; i < c; ++i)
		{
			img = document.getElementById (i + "_tile");
			img.src = src;
		}	
	}
	
	dragImage = null;
	event.stopPropagation();
	event.preventDefault();
	
}

function removed ()
{
	widget.setPreferenceForKey (null, "saved-image");
}

function hide ()
{
	if (firstTime && animation.onfinished != null)
	{
		firstTime = false;	
		animation.onfinished = null;
	}

}

if (window.widget)
{
	widget.onremove = removed;
	widget.onhide = hide;
}


function debug(msg) {
	if (!debug.box) {
		debug.box = document.createElement("div");
		debug.box.setAttribute("style", "background-color: white; " +
										"font-family: monospace; " +
										"border: solid black 3px; " +
										"position: absolute;top:300px;" +
										"padding: 10px;");
		document.body.appendChild(debug.box);
		debug.box.innerHTML = "<h1 style='text-align:center'>Debug Output</h1>";
	}
	
	var p = document.createElement("div");
	p.appendChild(document.createTextNode(msg));
	debug.box.appendChild(p);
}
