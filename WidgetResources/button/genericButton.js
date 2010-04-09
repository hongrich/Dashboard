/*
Copyright ＿ 2004, Apple Computer, Inc.  All rights reserved.
NOTE:  Use of this source code is subject to the terms of the Software
License Agreement for Mac OS X, which accompanies the code.  Your use
of this source code signifies your agreement to such license terms and
conditions.  Except as expressly granted in the Software License Agreement
for Mac OS X, no other copyright, patent, or other intellectual property
license or right is granted, either expressly or by implication, by Apple.
*/

//
// createGenericButton
// minwidth is optional
function createGenericButton (div, title, onaction, minwidth)
{
	div.style.height = "23px";
	div.style.appleDashboardRegion = 'dashboard-region(control rectangle)';
	var element = document.createElement ('img');
	element.src = 'file:///System/Library/WidgetResources/button/glassbuttonleft.png';
	element.style.setProperty('white-space', 'nowrap', '');
	div.appendChild (element);
	
	element = document.createElement('div');
	element.setAttribute ("style", 'font:12px "Helvetica Neue";font-weight:bold;color:white;display:inline-block;vertical-align:bottom;text-align:center;line-height:23px;background:url(file:///System/Library/WidgetResources/button/glassbuttonmiddle.png) repeat-x top left;');	
	element.style.setProperty('white-space', 'nowrap', '');
	div.appendChild (element);
	element.innerHTML = title;
	if (minwidth !== undefined)
	{
		element.style.minWidth = (minwidth - 20 )+ "px"; // 20 hard code size of left and right
	}
	
	element = document.createElement ('img');
	element.src = 'file:///System/Library/WidgetResources/button/glassbuttonright.png';
	element.style.setProperty('white-space', 'nowrap', '');
	div.appendChild (element);
	
	div.setAttribute ("genericButtonOnAction", onaction);
	div.setAttribute ("onmousedown", "genericButtonMouseDownHandler(event, this);");
	div.genericButtonEnabled = true;
	div.genericButtonInside = true;
	div.genericButtonAction = onaction;
	
	// force the images to load.
	var img = new Image;
	img.src = 'file:///System/Library/WidgetResources/button/glassbuttonleftclicked.png';
	var img = new Image;
	img.src = 'file:///System/Library/WidgetResources/button/glassbuttonmiddleclicked.png';
	var img = new Image;
	img.src = 'file:///System/Library/WidgetResources/button/glassbuttonrightclicked.png';
}

function genericButtonSetEnabled (div, enabled)
{
	var span = div.childNodes[1];
	enabled = enabled ? true : false;
	
	if (enabled)
		span.style.color = "white";
	else
		span.style.color = "rgb(150,150,150)";	
	div.genericButtonEnabled = enabled;
}

// do not call the following methods directly
var genericButtonCurrentMouseDownButton = null;
function genericButtonMouseDownHandler(event, div)
{
	if (div.genericButtonEnabled)
	{
		div.childNodes[0].src = 'file:///System/Library/WidgetResources/button/glassbuttonleftclicked.png';
		div.childNodes[1].style.backgroundImage = 'url(file:///System/Library/WidgetResources/button/glassbuttonmiddleclicked.png)';
		div.childNodes[2].src = 'file:///System/Library/WidgetResources/button/glassbuttonrightclicked.png';
	}
	
	document.addEventListener("mousemove", genericButtonMouseMoveHandler, true);
	document.addEventListener("mouseup", genericButtonMouseUpHandler, true);
	div.addEventListener("mouseover", genericButtonMouseOverHandler, true);
	div.addEventListener("mouseout", genericButtonMouseOutHandler, true);
	
	div.genericButtonInside = true;
	genericButtonCurrentMouseDownButton = div;
	
	event.stopPropagation();
	event.preventDefault();

}

function genericButtonMouseMoveHandler (event)
{
	event.stopPropagation();
	event.preventDefault();
}

function genericButtonMouseOverHandler (event)
{
	if (genericButtonCurrentMouseDownButton && genericButtonCurrentMouseDownButton.genericButtonEnabled)
	{
		genericButtonCurrentMouseDownButton.childNodes[0].src = 'file:///System/Library/WidgetResources/button/glassbuttonleftclicked.png';
		genericButtonCurrentMouseDownButton.childNodes[1].style.backgroundImage = 'url(file:///System/Library/WidgetResources/button/glassbuttonmiddleclicked.png)';
		genericButtonCurrentMouseDownButton.childNodes[2].src = 'file:///System/Library/WidgetResources/button/glassbuttonrightclicked.png';
	}
	
	genericButtonCurrentMouseDownButton.genericButtonInside = true;

	event.stopPropagation();
	event.preventDefault();
}

function genericButtonMouseOutHandler (event)
{
	if (genericButtonCurrentMouseDownButton && genericButtonCurrentMouseDownButton.genericButtonEnabled)
	{
		genericButtonCurrentMouseDownButton.childNodes[0].src = 'file:///System/Library/WidgetResources/button/glassbuttonleft.png';
		genericButtonCurrentMouseDownButton.childNodes[1].style.backgroundImage = 'url(file:///System/Library/WidgetResources/button/glassbuttonmiddle.png)';
		genericButtonCurrentMouseDownButton.childNodes[2].src = 'file:///System/Library/WidgetResources/button/glassbuttonright.png';
	}

	genericButtonCurrentMouseDownButton.genericButtonInside = false;
	
	event.stopPropagation();
	event.preventDefault();
}

function genericButtonMouseUpHandler (event)
{
	if (genericButtonCurrentMouseDownButton && genericButtonCurrentMouseDownButton.genericButtonEnabled)
	{
		genericButtonCurrentMouseDownButton.childNodes[0].src = 'file:///System/Library/WidgetResources/button/glassbuttonleft.png';
		genericButtonCurrentMouseDownButton.childNodes[1].style.backgroundImage = 'url(file:///System/Library/WidgetResources/button/glassbuttonmiddle.png)';
		genericButtonCurrentMouseDownButton.childNodes[2].src = 'file:///System/Library/WidgetResources/button/glassbuttonright.png';
	}

	// callback to the client
	document.removeEventListener("mousemove", genericButtonMouseMoveHandler, true);
	document.removeEventListener("mouseup", genericButtonMouseUpHandler, true);	
	if (genericButtonCurrentMouseDownButton)
	{
		genericButtonCurrentMouseDownButton.removeEventListener("mouseover", genericButtonMouseOverHandler, true);
		genericButtonCurrentMouseDownButton.removeEventListener("mouseout", genericButtonMouseOutHandler, true);
	}
		
	event.stopPropagation();
	event.preventDefault();
		
	if (genericButtonCurrentMouseDownButton && genericButtonCurrentMouseDownButton.genericButtonAction && genericButtonCurrentMouseDownButton.genericButtonEnabled &&
	    genericButtonCurrentMouseDownButton.genericButtonInside)
	{
		genericButtonCurrentMouseDownButton.genericButtonAction();
	}
	
	genericButtonCurrentMouseDownButton = null;
	
}
