// Milk the Cow
// - Dashboard Widget for Remember the Milk
// - Author: Rich Hong (hong.rich@gmail.com)
// - http://code.google.com/p/milkthecow/
//
// This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk.

// = RTM =
// Utility for interacting with Remember the Milk API
var RTM = {
    api_key: "127d19adab1a7b6922d8dfda3ef09645",
    shared_secret: "503816890a685753",
    methurl: "http://api.rememberthemilk.com/services/rest/",
    authurl: "http://www.rememberthemilk.com/services/auth/",
    variables: "frob token timeline " +
               "user_id user_username user_fullname " +
               "timezone dateformat timeformat defaultlist language"
};

RTM.undoStack = []; // stack of transaction id

// == Widget Functions ==

// ==== {{{ RTM.sync() }}} ====
RTM.sync = function sync () {
    $.each(RTM.variables.split(" "), function (i, o) {
        RTM[o] = p.v(o);
    });
};

// ==== {{{ RTM.remove() }}} ====
RTM.remove = function remove () {
    $.each(RTM.variables.split(" "), function (i, o) {
        RTM[o] = p.s(null, o);
    });
};

// == Utility Functions ==

// ==== {{{ RTM.signData(data) }}} ====
// Sign RTM requests
// [[http://www.rememberthemilk.com/services/api/authentication.rtm]]
// Each RTM request must have an api_sig parameter.
// The value of this parameter is the md5 hash of Milk the Cow's shared secret concatenated with all key/value pairs sorted by key name.
// api_sig parameter would be added to the input argument, data, and returned.
RTM.signData = function signData (data) {
    var arr = [];
    var str = RTM.shared_secret;

    // Turn object into array with concatenation of key/value pair
    $.each(data, function(key, value) { arr.push(key + value); });
    // Sort array
    arr.sort();
    // Concatenated shared secret with array
    str += arr.join("");
    
    // Generate md5 hash of the string
    data.api_sig = String(MD5(str));
    
    return data;
};

// ==== {{{ RTM.packData(data) }}} ====
// Pre-process data before sending any rtm requests.
//
// Throws an exception if data is not object or if data.method does not exist.
// Adds '_', 'api_key', 'format', 'token' (if exists), 'timeline' (if exists)
// then create and add signature to 'api_sig'.
// Content of the input argument, data, will be modified by this function.
// Modified version of data will also be returned.
RTM.packData = function packData (data) {
    if (typeof(data) != "object") throw "Need a data object";
    if (typeof(data.method) == "undefined") throw "Need a method name";

    data.api_key = RTM.api_key;
    data.format = "json";
    
    if (RTM.token) {data.auth_token = RTM.token;}
    if (RTM.timeline) {data.timeline = RTM.timeline;}
    
    return RTM.signData(data);
};

// ==== {{{ RTM.call(data, [callback(data, status)]) }}} ====
// Make a RTM API request with data as the parameters.
// If an optional callback function is provided, this function will be non-blocking. Otherwise, this function blocks.
RTM.call = function call (data, callback) {
    var r;
    var options = {
        url: RTM.methurl,
        data: RTM.packData(data),
        dataType: "json"
    };
    
    // blocking version
    if (callback === undefined) {
        options.async = false;
        callback = function (data, status) { r = data; };
    }
    
    // Wrap around callback function for error handling
    options.success = RTM.callbackWrapper(callback);
    
    // Actually send the request
    $.ajax(options);
    
    // resulting json if callback is undefined, otherwise, null.
    return r;
};

// ==== {{{ RTM.callbackWrapper(callback) }}} ====
// Wrapper for all RTM API callback functions.
// This wrapper will return a function that first checks to see if a failure response is encountered.
// If so, appropriate actions will be taken. Otherwise, callback function will be called.
RTM.callbackWrapper = function callbackWrapper (callback) {
    return function(data, status) {
        log(data);
        
        try {
            // Handle Errors first
            if (!data.rsp) throw "Network Error";

            if (data.rsp.stat == "fail") {
                log(data.rsp.err.msg);

                switch (data.rsp.err.code) {
                    case "98":
                        // 98: Login failed / Invalid auth token
                        // The login details or auth token passed were invalid.
                        RTM.token = p.s(null, "token");
                        break;
                    case "101":
                        // 101: Invalid frob - did you authenticate?
                        // The frob passed was not valid or has expired.
                        RTM.frob = p.s(null, "frob");
                        break;
                    default:
                        throw data.rsp.err.msg;
                }
            }else if (data.rsp.stat == "ok") {
                // Push transaction id onto the undo stack if transaction is undoable
                if (data.rsp.transaction && data.rsp.transaction.undoable == 1) {
                    RTM.undoStack.push(data.rsp.transaction.id);
                    $("#undo").show();
                }
            }else{
                throw "Bad API Response";
            }

            // Execute callback function
            callback(data, status);
        }catch (e){
            // TODO: show alert box
        }
    };
};

// ==== {{{ RTM.callback(data, status) }}} ====
// Most common callback used for most RTM functions.
// refresh() is called at the end to reload the list.
RTM.callback = function callback (data, status) {
    // Refresh list
    refresh();
};

// == RTM Functions ==
// === auth ===
RTM.auth = {};

// ==== {{{ RTM.auth.url(perms) }}} ====
// Return authentication URL
RTM.auth.url = function url (perms) {
    var data = {api_key: RTM.api_key, perms: perms, frob: RTM.auth.getFrob()};
    return RTM.authurl + "?" + $.param(RTM.signData(data));
};

// ==== {{{ RTM.auth.getFrob() }}} ====
RTM.auth.getFrob = function getFrob () {
    // Already have a frob, return it.
    if (RTM.frob || (RTM.frob = p.v("frob"))) {
        log("using frob: " + String(RTM.frob));
        return RTM.frob;
    }
    
    //ask for a new frob
    var res = RTM.call({method:"rtm.auth.getFrob"});
    
    return (RTM.frob = p.s(res.rsp.frob, "frob"));
};

// ==== {{{ RTM.auth.getToken() }}} ====
// Get token then create timelines
RTM.auth.getToken = function getToken () {
    var auth = RTM.call({method:"rtm.auth.getToken",frob:RTM.auth.getFrob()}).rsp;
    if (auth.stat != "ok") {
        return false;
    }

    auth = auth.auth;
    RTM.token = p.s(auth.token, "token");
    RTM.user_id = p.s(auth.user.id, "user_id");
    RTM.user_username = p.s(auth.user.username, "user_username");
    RTM.user_fullname = p.s(auth.user.fullname, "user_fullname");

    RTM.timelines.create();

    return true;
};

// === contacts ===
// === groups ===
// === lists ===
RTM.lists = {};

// ==== {{{ RTM.lists.getList(callback) }}} ====
RTM.lists.getList = function getList (callback) {
    $("#magiclist").empty();
    $("#magiclist").append("<option value=''>All</option>");
    $("#magiclist").append("<option disabled>---</option>");
    RTM.call({method:"rtm.lists.getList"}, function (data, status) {
        lists = data.rsp.lists.list;
        $("#taskinput_list").empty();
        $("#detailslist_select").empty();
        for (var l in lists){
            $("#magiclist").append("<option value='list:\"" + lists[l].name + "\"'>" + lists[l].name + "</option>");
            $("#detailslist_select").append("<option value='" + lists[l].id + "'>" + lists[l].name + "</option>");
            if (lists[l].smart == "1") continue;
            $("#taskinput_list").append("<option value='" + lists[l].id + "'>" + lists[l].name + "</option>");
        }
        $("#taskinput_list").val(RTM.defaultlist);
        
        callback();
    });
};

// === locations ===
// === reflection ===
// === settings ===
// * timezone: The user's Olson timezone. Blank if the user has not set a timezone.
// * dateformat: 0 indicates an European date format (e.g. 14/02/06), 1 indicates an American date format (e.g. 02/14/06).
// * timeformat: 0 indicates 12 hour time with day period (e.g. 5pm), 1 indicates 24 hour time (e.g. 17:00).
// * defaultlist: The user's default list. Blank if the user has not set a default list.
// * language: The user's language (ISO 639-1 code).
RTM.settings = {};

// ==== {{{ RTM.settings.getList(callback) }}} ====
// Get user setting from RTM, then call the callback function.
// These settings currently include: timezone, dateformat, timeformat, defaultlist and language
RTM.settings.getList = function getList (callback) {
    // If we do not already have any of the settings, retrieve them from RTM
    if (!RTM.timezone || !RTM.dateformat || !RTM.timeformat || !RTM.defaultlist || !RTM.language) {
        RTM.call({method:"rtm.settings.getList"}, function (data, status) {
            var settings = data.rsp.settings;
            
            RTM.timezone    = p.s(settings.timezone,    "timezone");
            RTM.dateformat  = p.s(settings.dateformat,  "dateformat");
            RTM.timeformat  = p.s(settings.timeformat,  "timeformat");
            RTM.defaultlist = p.s(settings.defaultlist, "defaultlist");
            RTM.language    = p.s(settings.language,    "language");
            
            callback();
        });
    }else{
        callback();
    }
};

// === tasks ===
RTM.tasks = {};

// ==== {{{ RTM.tasks.add(name, [list_id]) }}} ====
// Add a task with name and an optional list_id
// [[http://www.rememberthemilk.com/services/smartadd/]]
RTM.tasks.add = function add (name, list_id) {
    // use defaultlist if list_id is undefined
    list_id = (list_id === undefined) ? RTM.defaultlist : list_id;
    
    // parse: "1" enables Smart Add
    var options = {method: "rtm.tasks.add", name: name, parse: "1"};
    
    if (list_id != "") {
        $.extend(options, {list_id: list_id});
    }
    
    RTM.call(options, RTM.callback);
};

// ==== {{{ RTM.tasks.addTags(t, {tags: [tags]}) }}} ====
// ==== {{{ RTM.tasks.complete(t) }}} ====
// ==== {{{ RTM.tasks.delete(t) }}} ====
// ==== {{{ RTM.tasks.moveTo(t, {from_list_id: [from_list_id], to_list_id: [to_list_id]}) }}} ====
// ==== {{{ RTM.tasks.postpone(t) }}} ====
// ==== {{{ RTM.tasks.removeTags(t, {tags: [tags]}) }}} ====
// ==== {{{ RTM.tasks.setDueDate(t, {parse: 1, due: [due]}) }}} ====
// ==== {{{ RTM.tasks.setEstimate(t, [{estimate: [estimate]}]) }}} ====
// ==== {{{ RTM.tasks.setLocation(t, [{location_id: [location_id]}]) }}} ====
// ==== {{{ RTM.tasks.setName(t, [{name: [name]}]) }}} ====
// ==== {{{ RTM.tasks.setPriority(t, {priority: [priority]}) }}} ====
// ==== {{{ RTM.tasks.setRecurrence(t, [{repeat: [repeat]}]) }}} ====
// ==== {{{ RTM.tasks.setTags(t, [{tags: [tags]}]) }}} ====
// ==== {{{ RTM.tasks.setURL(t, [{url: [url]}]) }}} ====
// ==== {{{ RTM.tasks.uncomplete(t) }}} ====

// These functions are similar enough that they can use the same code
$.each("addTags complete delete moveTo postpone removeTags setDueDate \
        setEstimate setLocation setName setPriority setRecurrence setTags \
        setURL uncomplete".split(" "), function (i,f) {
    RTM.tasks[f] = function (t, extra) {
        // Options that are common to most functions in rtm.tasks.*
        var options = {
            method: "rtm.tasks." + f,
            list_id: tasks[t].list_id,
            taskseries_id: tasks[t].id,
            task_id: tasks[t].task.id
        };
        
        // Extend options with extra parameters if any
        if (extra === undefined) {
            extra = {};
        }
        $.extend(options, extra);
        
        RTM.call(options, RTM.callback);
    };
});

// === tasks.notes ===
// === test ===
// === time ===
// === timelines ===
RTM.timelines = {};
// ==== {{{ RTM.timelines.create() }}} ====
RTM.timelines.create = function create () {
    RTM.timeline = p.s(RTM.call({method:"rtm.timelines.create"}).rsp.timeline, "timeline");
};

// === timezones ===
// === transactions ===
RTM.transactions = {};
// ==== {{{ RTM.transactions.undo() }}} ====
RTM.transactions.undo = function undo () {
    // Only undo if there is anything on the undoStack
    if (RTM.undoStack.length >= 1) {
        // undoStack will be empty, hide it
        if (RTM.undoStack.length == 1) {
            $("#undo").hide();
        }

        RTM.call({method:"rtm.transactions.undo",transaction_id:RTM.undoStack.pop()}, RTM.callback);
    }
};
