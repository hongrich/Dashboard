/*
	Copyright 2006, Apple Computer, Inc.  All rights reserved.
	NOTE:  Use of this source code is subject to the terms of the Software
	License Agreement for Mac OS X, which accompanies the code.  Your use
	of this source code signifies your agreement to such license terms and
	conditions.  Except as expressly granted in the Software License Agreement
	for Mac OS X, no other copyright, patent, or other intellectual property
	license or right is granted, either expressly or by implication, by Apple.
*/


var a = null;
var x = null;
var mem = 0;
var display = "0";
var lastOp = null;
var currentOp = null;
var hiliteOp = "";
var isFractional = false;
var isResult = false;
var resetDisplay = false;
var directInput = false;

var gDecimalSeparator = "";
var gThousandsSeparator = "";
var gDecimalCode = 0;
var gDecimalString = "";
var gError = false;

document.addEventListener("keydown", keyPressed, true);
document.addEventListener("keyup", keyReleased, true);

function getLocalizedString (key)
{
	try
	{
		var ret = localizedStrings[key];
		if (ret === undefined)
			ret = key;
		return ret;
	}
	catch (ex)
	{}
	return key;
}

function replace(s, t, u) 
{
	/*
	**  Replace a token in a string
	**    s  string to be processed
	**    t  token to be found and removed
	**    u  token to be inserted
	**  returns new String
	*/
	var i = s.indexOf(t);
	var r = "";
	if (i == -1) return s;
	r += s.substring(0,i) + u;
	if ( i + t.length < s.length)
		r += replace(s.substring(i + t.length, s.length), t, u);
	return r;
}

function evaluator (str)
{
	var result;
	if (gDecimalSeparator != ".")
	{
		str = replace(str, gDecimalSeparator, ".");
	}
		
	if (window.widget)
		result = widget.calculator.evaluateExpression (str, (directInput ? 16 : 8));
	else
		result = eval(str);
		
	if (gDecimalSeparator != ".")
	{
		result = replace(result, ".", gDecimalSeparator); 
		//alert("received: " + result);
	}
	return result;
}

function modeSwitch(e) {
// turn off mode switch because it stopped working.
/*	if (e.metaKey) {
		if (!directInput) {
			document.getElementById("calcDisplay").style["-khtml-user-modify"] = 'read-write';
			document.getElementById("calcDisplay").style["font"] = '16px HelveticaNeue';
			document.getElementById("calcDisplay").style["-khtml-user-select"] = 'text';
		} else {
			document.getElementById("calcDisplay").style["-khtml-user-modify"] = 'read';
			document.getElementById("calcDisplay").style["font"] = '20.25px \"DBLCDTempBlack\", HelveticaNeue, sans-serif';
			document.getElementById("calcDisplay").style["-khtml-user-select"] = "";
		}
		
		directInput = !directInput;
	}
*/
	event.stopPropagation();
	event.preventDefault();
}


function translateKey(e) {
	var key = "";
	
	switch(e.charCode) {
		case 3:
		case 13:
		case 61:
			key = "equal";
			break;
		
		case gDecimalCode:
		case 46:
			key = "decimal";
			break;
			
		case 63289:
		case 27:
			key = "c";
			break;
			
		case 8:
			key = "delete";
			break;
			
		default:
			key = String.fromCharCode(e.charCode);
	}
	
	// post translation
	switch (key) {
		case "/":
			key = "div";
			break;
		
		case "-":
			key = "sub";
			break;
		
		case "*":
		case "x":
			key = "mult";
			break;
		
		case "+":
			key = "add";
			break;
	}

	return key;
}

function keyReleased(event) {
	// if the command key is down just bail
	if (event.metaKey) return;

	var key = translateKey(event);
	if (key) 
	{
		var e = document.getElementById(key);
		
		if (key == "decimal")
			key = gDecimalString;
		
		if (e) {
			if (hiliteOp)
				setOpHilite();
			else
				e.src = "Images/"+key+".png";
		}
		
		if (directInput) {
  			if (key == "equal") {
				var eq = document.getElementById("calcDisplay").innerText;
				display = parseFloat(evaluator(eq.replace(/^[ \t\r\n]+|[ \t\r\n]+$/,"")));
				updateDisplay();
  			} else if (key == "clear")
  				clearAll();
  		}
  	}
  	
	event.stopPropagation();
	event.preventDefault();
}

function keyPressed (event) {
	// if the command key is down just bail
	if (event.metaKey) return;
	
	// just show the graphic here becuase keypress generates three different events
	var key = translateKey(event);
	var e = document.getElementById(key);

	if (key == "decimal")
	{
		if (gDecimalString == "")
			loadNumberFormatInfo();
		key = gDecimalString;
	}
			
	if (e) {
		e.src = "Images/d"+key+".png";
	}

	if (buttonPress(key))
	{
		event.stopPropagation();
		event.preventDefault();
	}
}

function mouseDown(event, id) 
{	
	if (id == "decimal")
		id = gDecimalString;
		
	event.target.src = "Images/d"+id+".png";
	buttonPress(id);
	
	event.stopPropagation();
	event.preventDefault();
}

function mouseUp (event, id) 
{
	if (id == "decimal")
		id = gDecimalString;

	if (hiliteOp)
		setOpHilite();
	else
		event.target.src = "Images/"+id+".png";
}

function mouseOut (event, id) 
{
	if (id == "decimal")
		id = gDecimalString;

	if (!hiliteOp)
		event.target.src = "Images/"+id+".png";
}

function setOpHilite() {
	var e = document.getElementById(hiliteOp);
	e.src = "Images/a"+hiliteOp+".png";
}

function clearOpHilite() {
	if (hiliteOp) {
		var e = document.getElementById(hiliteOp);
		e.src = "Images/"+hiliteOp+".png";
	}
	
	hiliteOp = "";
}

function clearAll() {
	a = null;
	x = null;
	display = "0";
	lastOp = null;
	currentOp = null;
	hiliteOp = "";
	isFractional = false;
	isResult = false;
	resetDisplay = false;

	updateDisplay();
}

function clearDisplay() {
	display = "0";
	isFractional = false;
	resetDisplay = false;
}

function shrinkToFit(element, width)
{
    var changed = false;
	var computedStyle = document.defaultView.getComputedStyle(element,'');
    var fontSize = parseFloat(computedStyle.getPropertyValue("font-size"));
	var fontDelta;
	var elementWidth = parseInt(computedStyle.getPropertyValue("width"));;
	var newWidth = width;
	var diff = width, newDiff = 0;
	
	while (elementWidth > 2 * width)
	{
		fontSize /= 2;
		element.style.fontSize = fontSize.toString() + "px";
		computedStyle = document.defaultView.getComputedStyle(element,'');
		elementWidth = parseInt(computedStyle.getPropertyValue("width"));
		changed = true;
	}

	fontDelta = fontSize/2;

	if (elementWidth > width)
	{
		while (!(elementWidth >= .90 * width && elementWidth <= width))
		{
			fontDelta /= 2;
			if (elementWidth < .90 * width)
				fontSize += fontDelta;
			else
				fontSize -= fontDelta;
							
			element.style.fontSize = fontSize.toString() + "px";
			computedStyle = document.defaultView.getComputedStyle(element,'');
			newWidth = parseInt(computedStyle.getPropertyValue("width"));
			newDiff = Math.abs(newWidth - elementWidth);
			if (newDiff > diff || newDiff == 0)
				break;
			
			diff = newDiff;
			elementWidth = newWidth;
		}
		changed = true;
	}
    return changed;
}

function updateDisplay() {
	var disp = document.getElementById("calcDisplay");

	disp.innerText = filterErrorString(formatNumberWithDelimiters(display));
		
	disp.style.fontSize = "20.25px"; // needs to be in sync with css.
	if (shrinkToFit (disp, 128))
	{
		// might need to adjust margins
        var computedStyle = document.defaultView.getComputedStyle(disp,'');
        var fontSize = parseFloat(computedStyle.getPropertyValue("font-size"));
        
        //alert ("fontSize: " + fontSize);*/
        
        // if the font size is too small, it's hard to read so switch to sci and resize
        //var computedStyle = document.defaultView.getComputedStyle(disp,'');
        //var fontSize = parseFloat(computedStyle.getPropertyValue("font-size"));
        if (fontSize < 14)
        {
        	// set font size back to norm
        	disp.style.fontSize = "20.25px";	// needs to be in sync with css.
        	// convert value to sci
        	disp.innerText = filterErrorString(formatNumberWithScientificNotation(display));
        	shrinkToFit (disp, 128);
        }
		
	}
	
}

function buttonPress(buttonTitle) {

	var handled = true;
	
	// [ouch] probably should not clear the op hilite
	// unless we actually handle the key
	clearOpHilite();
	
	switch (buttonTitle) {
		case "delete":
			if (display.length && !gError) {
				if (display[display.length-1] == gDecimalSeparator)
					isFractional = false;
					
				display = display.substring(0, display.length-1);
				
				if (display.length == 0)
				{
					//a = null;
					display = "0";
				}
			}
			break;
			
		case "c":
			clearAll();
			break;
			
		case "0":
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
		case "6":
		case "7":
		case "8":
		case "9":
			if (isResult)
				clearAll();
			else if (resetDisplay)
				clearDisplay();

			if (display == "0")
				display = buttonTitle;
			else if (display.length < 9)
				display = display + buttonTitle;
			break;

		case gDecimalSeparator:
		case gDecimalString:
			if (isResult)
				clearAll();
			else if (resetDisplay)
				clearDisplay();
			else if (isFractional)
				return;
						
			if (display && parseInt(display) != 0)
				display = display + gDecimalSeparator;
			else
				display = "0" + gDecimalSeparator;
			isFractional = true;
			break;
			
		case "add":
		case "sub":
		case "mult":
		case "div":
			if (a && !isResult && !resetDisplay) {
				performOp();
			} else {
				a = evaluator(display);
				isResult = false;
			}

			currentOp = buttonTitle;
			hiliteOp = buttonTitle;
			resetDisplay = true;
			
			break;

		case "equal":
			performOp();
			currentOp = null;
			isResult = true;
			break;
			
		case "m+":
			if (!gError)
			{
				mem = (mem ? evaluator(display + "+" + mem) : evaluator(display));
				resetDisplay = true;
			}
			break;
			
		case "m-":
			if (!gError)
			{
				mem = evaluator(mem + "-" + display);
				resetDisplay = true;
			}
			break;
			
		case "mr":
			display = mem;
			var val = parseFloat(mem);
			isFractional = (val - Math.floor(val) != 0);
			resetDisplay = true;
			break;
			
		case "mc":
			mem = "0";
			break;
			
		default:
			handled = false;
			break;
			
	}
	
	if (handled)
		updateDisplay();

	return handled
}

function performOp() {

	if ( currentOp || lastOp )
	{
		var tmp = evaluator(display);
	
		if (!currentOp) {
			a = tmp;
			eval(lastOp+"();");
		} else {
			x = tmp;
			eval(currentOp+"();");
			lastOp = currentOp;
		}
			
		display = a;
	}
}

function add() {
	a = evaluator(a+"+"+x);
}

function sub() {
	a = evaluator(a+"-"+x);
}

function mult() {
	a = evaluator(a+"*"+x);
}

function div() {
	a = evaluator(a+"/"+x);
}

function filterErrorString (inString)
//
// This is a filter function that leaves the incoming string untouched unless if it is one of
// several possible numerical error strings from either Javascript "eval" or Dashboard "evaluateExpression"
// math APIs.  In that case, if we detect it, we try to substitute a more user-acceptable string and
// then try to translate it into the current language.
//
{
	var outString = inString;
	var lookForUnacceptableString = inString.toUpperCase ();
	
	//////////////////////////////////////////////////////////////////////////////////////////////////////////
	// If this string encountered from math APIs: 	// Then subsitute this string:	// And localize it.		//
	if (lookForUnacceptableString == "ERROR")
	{
		outString = getLocalizedString ("ERROR");
		gError = true;
	}
	else if (lookForUnacceptableString == "NAN")			
	{
		outString = getLocalizedString ("ERROR");	
		gError = true;
	}
	else if (lookForUnacceptableString == "INFINITY")
	{
		outString = getLocalizedString ("ERROR");
		gError = true;
	}
	else if (lookForUnacceptableString == "DIVBYZERO")	
	{
		outString = getLocalizedString ("DIV BY ZERO");
		gError = true;
	}
	else if (lookForUnacceptableString == "OVERFLOW")
	{
		outString = getLocalizedString ("ERROR");
		gError = true;
	}
	else
		gError = false;
		
	// If this (number) is not one of the strings in first column above, then we will have done nothing.	//
	//////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	return outString;
}

function formatNumberWithDelimiters(number) {
	var delimiter = gThousandsSeparator;
	//alert("format: " + number);
	var numString = number.toString();
	//alert("numstring: " + numString);
	if (!numString)
		return "0";
		
	var dot = numString.indexOf(gDecimalSeparator);
	if (dot == -1)
		dot = numString.length;
		
	var stop = numString.length-dot;
	var characteristic = numString.substr(0, dot);
	if (!parseInt(characteristic))
		return numString;

	// see if it's a negative number
	var numIsNegative =  (parseInt(characteristic) < 0)

	var newNumber = "";
	var delimiterCount = Math.floor((characteristic.length-1) / 3);
	var extras = characteristic.length % 3;
	if (!extras && characteristic.length > 2)
		extras = 3;

	if (extras)
		newNumber = newNumber + characteristic.substr(0, extras);

	for (var i=0;i< delimiterCount; i++) {
	
		if ( (0 == i) && numIsNegative && (extras == 1))
			newNumber = newNumber + characteristic.substr(extras + (i * 3), 3);
		else
			newNumber = newNumber + delimiter + characteristic.substr(extras + (i * 3), 3);
	}
	
	return (dot ? (newNumber + numString.substr(dot, stop)) : newNumber);
}

function formatNumberWithScientificNotation(number) {
	if (number == 0)
		return number;
		
	var numString = number.toString();
	if (!numString)
		return "0";

	var num = new Number(numString);
	var sci = num.toExponential(8);
	if (sci == "NaN")
		sci = formatNumberWithDelimiters(numString);
	if (!sci)
		return "0";
		
	return sci;
}

function loadNumberFormatInfo()
{
	if (window.widget) 
	{
		var calc = widget.calculator;
		gDecimalSeparator = calc.evaluateExpression ("decimal_string", 16);
		gThousandsSeparator = calc.evaluateExpression("thousands_separator", 16);
		if (gDecimalSeparator.length > 0)
			gDecimalCode = gDecimalSeparator.charCodeAt(0);
		if (gDecimalSeparator == ".")
			gDecimalString = "decimal";
		else
			gDecimalString = "comma";
		
		var e = document.getElementById("decimal");
		if (e)
		{
			e.src = "Images/"+gDecimalString+".png";
		}
	} else {
		gDecimalSeparator = ".";
		gDecimalCode = gDecimalSeparator.charCodeAt(0);
		gDecimalString = "decimal";
		gThousandsSeparator = ",";
	}
}

function load() {
	loadNumberFormatInfo();
}

function focus() {
	document.getElementById("lcd-backlight").style.display =  "block";
	document.getElementById("calcDisplay").setAttribute("class", "backlightLCD");
	loadNumberFormatInfo();
}

function blur() {
	document.getElementById("lcd-backlight").style.display = "";
	document.getElementById("calcDisplay").setAttribute("class", "nobacklightLCD");
}

function docut(event) {
	event.clipboardData.setData('text/plain', display);
	clearDisplay();
	updateDisplay();
	event.preventDefault();
	event.stopPropagation();

}

function docopy (event) {
	event.clipboardData.setData('text/plain', display);
	event.preventDefault();
	event.stopPropagation();
}

function dopaste (event) {
	var clip = event.clipboardData.getData('text/plain');
	
	// remove any commas
	clip = clip.replace(/,/g, '');

	if (!directInput) {
		display = evaluator(clip);
		updateDisplay();
	} else 
		document.getElementById("calcDisplay").innerText = clip;

	event.preventDefault();
	event.stopPropagation();
}

window.onload = load;
window.onfocus = focus;
window.onblur = blur;

function debug(msg) {
	if (!debug.box) {
		debug.box = document.createElement("div");
		debug.box.setAttribute("style", "background-color: white; " +
										"font-family: monospace; " +
										"border: solid black 3px; " +
										"position: absolute;top:50px;" +
										"padding: 5px;");
		document.body.appendChild(debug.box);
		debug.box.innerHTML = "<h3 style='text-align:center'>Debug Output</h1>";
	}
	
	var p = document.createElement("p");
	p.appendChild(document.createTextNode(msg));
	debug.box.appendChild(p);
}
