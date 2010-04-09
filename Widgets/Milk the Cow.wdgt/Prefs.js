// Wrapper class for handling widget preferences
// This function sets up all the default values if there are any
function Prefs() {
    this.defaults = {};

    // Dimension
    this.defaults["taskWidth"]     = 280;
    this.defaults["taskHeight"]    = 380;

    // Filter
    this.defaults["magiclist"]     = "";
    this.defaults["magicpriority"] = "";
    this.defaults["magicstatus"]   = "status:incomplete";
    this.defaults["magictext"]     = "";
    this.defaults["magictags"]     = "";

    // Growl
    this.defaults["growl"]         = false;
    this.defaults["growlBefore"]   = 60;
}

// Return the default for a given key or null if no defaults are present for the given key
Prefs.prototype.defaultForKey = function(key) {
    if (this.defaults[key]) return this.defaults[key];
    return null;
};

// Wrapper for widget.preferenceForKey
// Return the value of a given key or the default if preference does not exist
// If used not as a widget, this function does nothing and returns null.
Prefs.prototype.v = function(key) {
    if (!window.widget || widget.preferenceForKey(key) == null) return this.defaultForKey(key);
    return widget.preferenceForKey(key);
};

// Wrapper for widget.setPreferenceForKey
// Returns the new value after setting preference
// If used not as a widget, this function does nothing and returns null.
Prefs.prototype.s = function(value, key) {
    if (!window.widget) return value;
    widget.setPreferenceForKey(value, key);
    return value;
};
