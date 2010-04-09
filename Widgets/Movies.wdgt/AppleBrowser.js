/**
 *	DHTML equivalent of NSBrowserDelegate
 *	@constructor
 */
function AppleBrowserDelegate() {}

/**
 *	@param {AppleBrowser} browser
 *	@param {HTMLLiElement} cell
 *	@param {Number} rowIndex
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowserDelegate.prototype.willDisplayCellAtRowColumn = function(browser, cell, rowIndex, colIndex) {
};

/**
 *	@param {AppleBrowser} browser
 *	@param {Number} colIndex
 *	@returns {Number}
 */
AppleBrowserDelegate.prototype.numberOfRowsInColumn = function(browser, colIndex) {
	return 0;
};

/**
 *	@param {AppleBrowser} browser
 *	@param {Number} rowIndex
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowserDelegate.prototype.selectRowInColumn = function(browser, rowIndex, colIndex) {
};

/**
 *	@param {HTMLDivElement} cell
 *	@returns {void}
 */
AppleBrowserDelegate.prototype.scrollbarForDiv = function(scrollbarDiv) {
};

/**
 *	DHTML equivalent of NSBrowser
 *	@constructor
 *	@param {HTMLDivElement} cell
 *	@param {AppleBrowserDelegate} browser
 */
function AppleBrowser(el, delegate) {
	/** @private */
	this._div = el;
	this._div.className += " AppleBrowser";

	/** @private */
	var _self = this;
	/** @private */
	this._mouseDownHandler = function(event) { _self._mouseDown(event); };
	/** @private */
	this._keyDownHandler = function(event) { _self._keyDown(event); };
	/** @private */
	this._keyUpHandler = function(event) { _self._keyUp(event); };

	this._div.addEventListener("mousedown", this._mouseDownHandler, false);

	/** @private */
	this._delegate = delegate;

	/** @private */
	this._colWidth = 201;
	/** @private */
	this._scrollbarWidth = 19;
	
	/** @private */
	this._cols = [];
	/** @private */
	this._scrollAreas = [];
	/** @private */
	this._scrollbars = [];
	/** @private */
	this._path = [];
	this.render();
	this.refresh();
}

/**
 *	@returns {void}
 */
AppleBrowser.prototype.refresh = function() {
	var cell = this._cellsInColumn(0)[0];
	this._rowHeight = Utils.getEntireComputedHeight(cell, "");
	this._colHeight = Utils.getEntireComputedHeight(this._cols[0], "") - this._rowHeight;
	this._visibleRows = Math.floor(this._colHeight / this._rowHeight);
};

/**
 *	@returns {void}
 */
AppleBrowser.prototype.focus = function() {
	document.addEventListener("keydown", this._keyDownHandler, false);
	document.addEventListener("keyup", this._keyUpHandler, false);
	AppleBrowser._focusedInstance = this;
};

/**
 *	@returns {void}
 */
AppleBrowser.prototype.blur = function() {
	document.removeEventListener("keydown", this._keyDownHandler, false);
	document.removeEventListener("keyup", this._keyUpHandler, false);
	if (this == AppleBrowser._focusedInstance) {
		AppleBrowser._focusedInstance = null;
	}
};

/**
 *	returns copy of this browser's path. does not modify this browser's path
 *	@returns {Array}
 */
AppleBrowser.prototype.path = function() {
	var res = [this._path.length];
	if (this._path.length) {
		for (var i = 0; i < this._path.length; i++) {
			res[i] = this._path[i];
		}
	}
	return res;
};

/**
 *	@param {Array} newPath
 *	@returns {void}
 */
AppleBrowser.prototype.setPath = function(newPath) {
	for (var i = 0; i < newPath.length; i++) {
		this.selectRowInColumn(newPath[i], i);
	}
};

/**
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype.selectedCellInColumn = function(colIndex) {
	if (colIndex > this._cols.length-1) {
		return null;
	}
	var rowIndex = this._path[colIndex];
	var cells = this._cellsInColumn(colIndex);
	return cells[rowIndex];
};

/**
 *	@param {Number} rowIndex
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype.selectRowInColumn = function(rowIndex, colIndex) {
	if (isNaN(rowIndex)) {
		return;
	}
	var cells = this._cellsInColumn(colIndex);
	if (!cells || !cells.length) {
		return;
	}
	rowIndex = (rowIndex < 0) ? 0 : rowIndex;
	if (rowIndex > cells.length-1) { // don't try to select past the last item
		rowIndex = cells.length-1;
	}
	var oldSelectedIndex = this._path[colIndex];
	this._path[colIndex] = rowIndex;
	Utils.removeClassName(cells[oldSelectedIndex], "selected");
	var newSelectedCell = cells[rowIndex];
	Utils.addClassName(newSelectedCell, "selected");
	
	for (var i = this._cols.length-1; i > colIndex; i--) {
		if (i == colIndex+1) {
			if (oldSelectedIndex != rowIndex) {
				this._clearColumn(i);
			}
		} else {
			this._clearColumn(i);
		}
	}
	this.revealRowInColumn(rowIndex, colIndex);
	this._delegate.selectRowInColumn(this, rowIndex, colIndex);
	if (oldSelectedIndex != rowIndex) {
		this.renderColumn(colIndex+1);
	} else {
		this._deselectCellInColumn(colIndex+1);
	}
	this._path.length = colIndex+1;
};

/**
 *	@param {Number} rowIndex
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype.revealRowInColumn = function(rowIndex, colIndex) {
	var scrollArea = this._scrollAreas[colIndex];
	var scrollTop = scrollArea.content.scrollTop;
	var itemTop = this._rowHeight * rowIndex;
	if (itemTop <= scrollTop) { // check for selection above top visible row
		scrollArea.verticalScrollTo(itemTop);
	} else { // check for selection below bottom visible row
		var y = (this._colHeight) + scrollTop;
		if (itemTop >= y) {
			scrollArea.verticalScrollTo(itemTop - (this._colHeight));
		} 
	}
};

/**
 *	@returns {void}
 */
AppleBrowser.prototype.render = function() {
	this.renderColumn(0);
};

/**
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype.renderColumn = function(colIndex) {
	if (colIndex >= this._cols.length) {
		this._createColumn(colIndex);
	}
	var col = this._cols[colIndex];
	var numRows = this._delegate.numberOfRowsInColumn(this, colIndex);
	var cell;
	for (var rowIndex = 0; rowIndex < numRows; rowIndex++) {
		cell = document.createElement("li");
		cell.rowIndex = rowIndex;
		cell.isLeaf = true;
		this._delegate.willDisplayCellAtRowColumn(this, cell, rowIndex, colIndex);
		cell.className += (cell.isLeaf ? " AppleBrowserLeafCell" : " AppleBrowserParentCell");
		col.ul.appendChild(cell);
	}
	Utils.showElement(col);
	Utils.showElement(this._scrollbars[colIndex].scrollbar);
	this._scrollAreas[colIndex].refresh();
};

/**
 *	@returns {void}
 */
AppleBrowser.prototype.remove = function() {
	this.blur();
	delete this._cols;
	delete this._scrollAreas;
	this._div.innerHTML = "";
	this._path.length = 0;
};

/**
 *	@returns {void}
 */
AppleBrowser.prototype.clearAllColumns = function() {
	for (var i = 0; i < this._cols.length; i++) {
		this._clearColumn(i);
	}
	this._path.length = 0;
};

/**
 *	@private
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype._createColumn = function (colIndex) {
	if (this._cols.length > colIndex) {
		return;
	}	

	var col = document.createElement("div");
	col.style.left = (colIndex * this._colWidth) + "px";
	col.className = "AppleBrowserCol AppleBrowserCol" + colIndex;
	col.ul = document.createElement("ul");
	col.appendChild(col.ul);
	this._div.appendChild(col);
	this._cols[colIndex] = col;

	var scrollbarDiv = document.createElement("div");
	scrollbarDiv.className = "AppleBrowserScroll AppleBrowserScroll" + colIndex;
	scrollbarDiv.style.left = ((this._colWidth * (colIndex+1) + 1) - this._scrollbarWidth) + "px";
	this._div.appendChild(scrollbarDiv);
	var scrollbar = null;
	if (this._delegate.scrollbarForDiv) {
		scrollbar = this._delegate.scrollbarForDiv(scrollbarDiv);
	}
	if (!scrollbar) {
		scrollbar = new AppleVerticalScrollbar(scrollbarDiv);
	}
	var scrollArea = new AppleScrollArea(col);
	scrollArea.addScrollbar(scrollbar);
	this._scrollAreas[colIndex] = scrollArea;
	this._scrollbars[colIndex] = scrollbar;
};

/**
 *	@private
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype._clearColumn = function(colIndex) {
	var col = this._cols[colIndex];
	if (!col || !col.ul) {
		return;
	}
	col.ul.innerHTML = "";
	var scrollArea = this._scrollAreas[colIndex];
	if (scrollArea) {
		scrollArea.refresh();
	}
	Utils.hideElement(col);
	Utils.hideElement(this._scrollbars[colIndex].scrollbar);
};

/**
 *	@private
 *	@param {Number} colIndex
 *	@returns {void}
 */
AppleBrowser.prototype._deselectCellInColumn = function(colIndex) {
	var cells = this._cellsInColumn(colIndex);
	if (!cells || !cells.length) {
		return;
	}
	var oldSelectedIndex = this._path[colIndex];
	var cell = cells[oldSelectedIndex];
	if (cell) {
		Utils.removeClassName(cell, "selected");
	}
};

/**
 *	@private
 *	@param {Number} colIndex
 *	@returns {NodeList}
 */
AppleBrowser.prototype._cellsInColumn = function(colIndex) {
	if (isNaN(colIndex)) {
		return null;
	}
	if (colIndex < 0) {
		return null;
	}
	var col = this._cols[colIndex];
	if (!col || !col.ul) {
		return null;
	}
	return col.ul.getElementsByTagName("li");
};

/**
 *	@private
 *	@param {MouseEvent} evt
 *	@returns {void}
 */
AppleBrowser.prototype._mouseDown = function(evt) {
	var cell = Utils.getFirstAncestorOrSelfByTagName(evt.target, "li");
	var clickedInWhitespace = (cell == null);
	var col;
	if (clickedInWhitespace) { // clicked on white space below last item in col. deselect cell in col
		col = Utils.getFirstAncestorOrSelfByTagName(evt.target, "div");
	} else {
		col  = Utils.getFirstAncestorOrSelfByTagName(cell, "div");		
	}
	var colIndex = parseInt(col.className.substring(col.className.length-1));
	if (clickedInWhitespace) {
		colIndex--;
		this.selectRowInColumn(this._path[colIndex], colIndex);
	} else {
		var rowIndex = cell.rowIndex;
		this.selectRowInColumn(rowIndex, colIndex);
	}
	Utils.consumeEvent(evt);
};

/**
 *	returns true for arrow keys, pageup, pagedown, home, end
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isNavKeyEvent	= function(evt) { 
	return (evt.keyCode >= 33 && evt.keyCode <= 40); 
};

/**
 *	returns true for a-z
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isAlphaKeyEvent = function(evt) { 
	return (evt.keyCode >= 65 && evt.keyCode <= 90); 
};

/**
 *	returns true for 0-9
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isNumericKeyEvent = function(evt) { 
	return (evt.keyCode >= 48 && evt.keyCode <= 57); 
};

/**
 *	returns true for pageup or option+uparrow
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isPageUpKeyEvent = function(evt) { 
	return (33 == evt.keyCode || (evt.altKey && AppleBrowser._isUpArrowKeyEvent(evt))); 
};

/**
 *	returns true for pagedown or option+downarrow
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isPageDownKeyEvent = function(evt) { 
	return (34 == evt.keyCode || (evt.altKey && AppleBrowser._isDownArrowKeyEvent(evt))); 
};

/**
 *	returns true for home or command+uparrow
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isHomeKeyEvent = function(evt) { 
	return (36 == evt.keyCode || (evt.metaKey && AppleBrowser._isUpArrowKeyEvent(evt))); 
};

/**
 *	returns true for end or command+downarrow
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isEndKeyEvent = function(evt) { 
	return (35 == evt.keyCode || (evt.metaKey && AppleBrowser._isDownArrowKeyEvent(evt))); 
};

/**
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isUpArrowKeyEvent 	= function(evt) { return (38 == evt.keyCode); };

/**
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isDownArrowKeyEvent 	= function(evt) { return (40 == evt.keyCode); };

/**
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isLeftArrowKeyEvent 	= function(evt) { return (37 == evt.keyCode); };

/**
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {Boolean}
 */
AppleBrowser._isRightArrowKeyEvent 	= function(evt) { return (39 == evt.keyCode); };

/**
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {void}
 */
AppleBrowser.prototype._keyDown = function(evt) {
	if (evt.ctrlKey || evt.shiftKey) {
		return;
	}
	var isNavKey	 = AppleBrowser._isNavKeyEvent(evt);
	var isAlphaKey	 = AppleBrowser._isAlphaKeyEvent(evt);
	var isNumericKey = AppleBrowser._isNumericKeyEvent(evt);
	if (evt.metaKey || evt.altKey) { // if opt or cmd is held down, only handle arrow keys
		if (!isNavKey) {
			return;
		}
	}
	var colIndex = this._path.length-1;
	var rowIndex = this._path[colIndex];
	try { // wrapping in try block to make sure repeating key press never runs away
		if (undefined === rowIndex) {
			this.selectRowInColumn(0, 0);
		} else if (isAlphaKey || isNumericKey) {
			// TODO impl binary search by alpha cell text
			var cells = this._cellsInColumn(colIndex);
			var text;
			for (var i = 0; i < cells.length; i++) {
				rowIndex = i;
				text = cells[i].textContent;
				if (text) {
					text = text.toLowerCase();
					if (text.charCodeAt(0) >= evt.charCode) {
						break;
					}
				}
			}
			this.selectRowInColumn(rowIndex, colIndex);		
		} else if (isNavKey) {
			if (AppleBrowser._isPageUpKeyEvent(evt)) {
				this.selectRowInColumn(this._path[colIndex] - this._visibleRows, colIndex);
			} else if (AppleBrowser._isPageDownKeyEvent(evt)) {
				this.selectRowInColumn(this._path[colIndex] + this._visibleRows, colIndex);
			} else if (AppleBrowser._isHomeKeyEvent(evt)) {
				this.selectRowInColumn(0, colIndex);
			} else if (AppleBrowser._isEndKeyEvent(evt)) {
				this.selectRowInColumn(Number.MAX_VALUE, colIndex);
			} else if (AppleBrowser._isUpArrowKeyEvent(evt)) {
				this.selectRowInColumn(rowIndex-1, colIndex);
			} else if (AppleBrowser._isDownArrowKeyEvent(evt)) {
				this.selectRowInColumn(rowIndex+1, colIndex);
			} else if (AppleBrowser._isLeftArrowKeyEvent(evt)) {
				this.selectRowInColumn(this._path[colIndex-1], colIndex-1);
			} else if (AppleBrowser._isRightArrowKeyEvent(evt)) {
				this.selectRowInColumn(0, colIndex+1);
			}
		}
	} catch (e) {
	}
	Utils.consumeEvent(evt);
};

/**
 *	@private
 *	@param {KeyEvent} evt
 *	@returns {void}
 */
AppleBrowser.prototype._keyUp = function(evt) {
	clearTimeout(AppleBrowser._keyDownTimeoutId);
	Utils.consumeEvent(evt);
};

var Utils = {};

/**
 *	Return first ancestor element or element itself with a
 *	tag name equal to tagName case-insensitive.
 */
Utils.getFirstAncestorOrSelfByTagName = function(element, tagName) {
	tagName = tagName.toLowerCase();
	do {
		if (element.nodeType == Node.ELEMENT_NODE && element.tagName.toLowerCase() == tagName) {
			return element;
		}
	} while (element = element.parentNode);
	return null;
};

/**
 *	Adds newClassName to list of whitespace-separated class names for node if 
 *	not already present. If newClassName is added, returns true, else false.
 */
Utils.addClassName = function(node, newClassName) {
	var oldClassName = Utils.collapseWhiteSpace(Utils.trimWhiteSpace(node.className));
	if (0 == oldClassName.indexOf(newClassName)) {	
		return false;
	}
	var index = oldClassName.indexOf(" " + newClassName);
	if (-1 == index) {
		newClassName = (oldClassName + " " + newClassName);
		node.className = newClassName;
		return true;
	}
	return false;
};

/**
 *	Removes removeClassName to list of whitespace-separated class names for node 
 *	if present. If removeClassName is removed, returns true, else false.
 */
Utils.removeClassName = function(node, removeClassName) {
	if (node && node.className) {
		var index = node.className.indexOf(removeClassName);
		if (-1 != index) {
			var len = removeClassName.length;
			node.className = node.className.substring(0,index) + node.className.substring(index+len);
			return true;
		}
	}
	return false;
};

Utils.consumeEvent = function(evt) {
	if (evt) {
		evt.stopPropagation();
		evt.preventDefault();
	}
};

Utils.showElement = function(el) {
	el.style.display = "block";
};

Utils.hideElement = function(el) {
	el.style.display = "none";
};

Utils.isShowing = function(el) {
	return el.style.display != "none";
};

Utils.getEntireComputedHeight = function(el, pseudoClass) {
	var style = document.defaultView.getComputedStyle(el, pseudoClass);
	var res = parseInt(style.height);
	res += parseInt(style.paddingTop);
	res += parseInt(style.paddingBottom);
	res += parseInt(style.marginTop);
	res += parseInt(style.marginBottom);
	res += parseInt(style.borderTopWidth);
	res += parseInt(style.borderBottomWidth);
	return res;
};


/** Trim all leading and trailing whitespace. */
Utils.trimWhiteSpace = function(str) {
	return str.replace(Utils.trimWhiteSpace.regex0, "")
		.replace(Utils.trimWhiteSpace.regex1, "");
};
Utils.trimWhiteSpace.regex0 = /^\s*/;
Utils.trimWhiteSpace.regex1 = /\s*$/;


/** Collapse all runs of whitespace chars in str to a single ' ' space char. */
Utils.collapseWhiteSpace = function(str) {
	return str.replace(Utils.collapseWhiteSpace.regex, " ");
};
Utils.collapseWhiteSpace.regex = /\s{2,}/;
