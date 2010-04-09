// = Milk the Cow =
// * Dashboard Widget for Remember the Milk
// * Author: Rich Hong (hong.rich@gmail.com)
// * http://code.google.com/p/milkthecow/
//
// This product uses the Remember The Milk API but is not endorsed or certified by Remember The Milk.

// == Global Variables ==
var version = "0.5.0";
var never = 2147483647000; // Magic constant for no due date
//var debug = true;

var p = new Prefs();

// Growl
var growl;               // Boolean: use growl
var growlBefore;         // Number: Number of mintues for default reminder before each task
var growlTimeouts = {};  // a dictionary of taskID -> timeoutID

var tasks = [];
var lists = [];          // user lists for tasks
var detailsOpen = false; // state of details box
var selectedList = "";   // selected list
var currentTask = null;  // the task with details box showing
var editing = false;     // currently editing a field

// Filter Settings
var magiclist;
var magicpriority;
var magicstatus;
var magictext;
var magictags;

var gMyScrollArea, gMyScrollbar;

// variables for widget dimensions
var defaultWidth = 280;
var defaultHeight = 380;
var taskWidth;
var taskHeight;
var detailsWidth = 0;
var resizeOffset;
var minWidth = 280;
var minHeight = 137;

// This is a hacky variable to makes sure that refresh() is called exactly
// once both on show and and on cmd-R refresh
var firstLoad = false;

// Dazzle globabl variable
var dazzle;

// == Debug ==

// === log(s) ===
// if debug is true, this function calls alert, otherwise it does nothing
// All debugging should use the log function instead of straight up alert
function log (s){
    if (typeof(debug) != "undefined" && debug) {
        console.log(s);
    }
}

// == Widget ==

// === remove ===
// Called when the widget has been removed from the Dashboard
function remove() {
    RTM.remove();

    // Dimension
    p.s(null, "taskWidth");
    p.s(null, "taskHeight");
    
    // Filter
    p.s(null, "magiclist");
    p.s(null, "magicpriority");
    p.s(null, "magicstatus");
    p.s(null, "magictext");
    p.s(null, "magictags");
    
    // Growl
    p.s(null, "growl");
    p.s(null, "growlBefore");
}

// === hide ===
// Called when the widget has been hidden
function hide() {
    dazzle.onHide();
}

// === show ===
// Called when the widget has been shown
function show() {
    if (firstLoad) {
        firstLoad = false;
    }else{
        $("#loading").hide();
        refresh();
    }
    
    dazzle.onShow();
}

// === sync ===
// Called when the widget has been synchronized with .Mac
function sync() {
    RTM.sync();

    // Dimension
    taskWidth     = p.v("taskWidth");
    taskHeight    = p.v("taskHeight");
    
    // Filter
    magiclist     = p.v("magiclist");
    magicpriority = p.v("magicpriority");
    magicstatus   = p.v("magicstatus");
    magictext     = p.v("magictext");
    magictags     = p.v("magictags");
    
    // Growl
    growl         = p.v("growl");
    growlBefore   = p.v("growlBefore");
}

// === showBack(event) ===
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
function showBack(event) {
    // resize widget to the max of front and back, so the transition would look smooth
    window.resizeTo(Math.max(taskWidth + detailsWidth, defaultWidth), Math.max(taskHeight, defaultHeight));
    
    if (window.widget) widget.prepareForTransition("ToBack");
    $("#front").css("display", "none");
    $("#back").css("display", "block");
    if (window.widget) {setTimeout('widget.performTransition();', 0);}
    
    // resize widget back to real size
    window.resizeTo(defaultWidth, defaultHeight);
}

// === showFront(event) ===
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
function showFront(event) {
    // Invoke growlBefore change event if value have been changed
    if (growlBefore != parseInt($("#growlBefore").val(), 10)) $("#growlBefore").change();
    
    // resize widget to the max of front and back, so the transition would look smooth
    window.resizeTo(Math.max(taskWidth + detailsWidth, defaultWidth), Math.max(taskHeight, defaultHeight));
    if (window.widget) {widget.prepareForTransition("ToFront");}
    $("#front").css("display", "block");
    $("#back").css("display", "none");
    if (window.widget) {setTimeout('widget.performTransition();', 0);}
    
    // resize widget back to real size
    window.resizeTo(taskWidth + detailsWidth, taskHeight);
    refresh();
}

// == Filter ==

// === filterChange ===
// Called when magic filter is changed
function filterChange (){
    var s = "";
    var first = true;
    var values = ['magiclist','magicpriority','magicstatus'];
    for (var v in values){
        if ($("#" + values[v]).val()){
            if (first) {
                first = false;
            }else{
                s += " AND ";
            }
            s += $("#" + values[v]).val();
        }
    }
    if ($("#magictext").val()){
        if (first) {
            first = false;
        }else{
            s += " AND ";
        }
        s += "name:\"" + $("#magictext").val() + "\"";
    }
    if ($("#magictags").val()){
        if (first) {
            first = false;
        }else{
            s += " AND ";
        }
        s += "tag:" + $("#magictags").val();
    }
    $("#customtext").val(s);
    selectedList = $("#magiclist").val();
    
    p.s($("#magiclist").val(), "magiclist");
    p.s($("#magicpriority").val(), "magicpriority");
    p.s($("#magicstatus").val(), "magicstatus");
    p.s($("#magictext").val(), "magictext");
    p.s($("#magictags").val(), "magictags");
}

// == Dimension ==

//update css values the depend on the size of the widget
function updateWindow () {
    // TODO: do as much of these in css as possible
    $("#front").css("width", taskWidth - 30);
    $("#front").css("height", taskHeight - 20);
    $("#resize").css("left", taskWidth - 27);
    $("#info").css("right", detailsWidth + 18);
    $("#loading").css("left", taskWidth - 34);
    $("#taskDetails").css("left", taskWidth - 11);
    $("#taskDetails").css("top", taskHeight / 2 - 100);
    $("#inputDiv").css("width", taskWidth * 0.92);
    $("#listDiv").css("width", taskWidth - 40);
    $("#listScrollbar").css("left", taskWidth - 36);
    $("#taskList li .taskname").css("width", taskWidth - 78);
    gMyScrollArea.refresh();
    if (!gMyScrollbar.hidden && taskHeight - minHeight < gMyScrollbar.size) {
        gMyScrollbar.hide();
    }
}

//Event listeners for resizing the widget
function resizeMousemove (event) {
    taskHeight = Math.max(event.pageY + resizeOffset.y, minHeight);
    taskWidth = Math.max(event.pageX + resizeOffset.x, minWidth);
    
    window.resizeTo(taskWidth + detailsWidth, taskHeight);
    
    updateWindow();
    
    event.stopPropagation();
    event.preventDefault();
}
function resizeMouseup (event) {
    $(document).unbind("mousemove", resizeMousemove);
    $(document).unbind("mouseup", resizeMouseup);

    event.stopPropagation();
    event.preventDefault();

    p.s(taskWidth, "taskWidth");
    p.s(taskHeight, "taskHeight");
}
function resizeMousedown (event) {
    $(document).mousemove(resizeMousemove);
    $(document).mouseup(resizeMouseup);

    resizeOffset = {x:(window.innerWidth - detailsWidth - event.pageX), y:(window.innerHeight - event.pageY)};

    event.stopPropagation();
    event.preventDefault();
}

// == Details ==

// update detail box without closing it
function updateDetails (t){
    editing = false;
    $("#detailsName").html(tasks[t].name);
    $("#detailsName_edit").val($("#detailsName").html());
    sdate = "";
    if (tasks[t].date.getTime() == never) {
        sdate = "never"; //no due date
    }else{
        sdate = tasks[t].date.format("d mmm yy");
    }
    if (tasks[t].task.has_due_time == 1) {
        if (RTM.timeformat == 0) {
            sdate += " at "+ tasks[t].date.format("h:MM TT");
        }else{
            sdate += " at "+ tasks[t].date.format("H:MM");
        }
    }
    $("#detailsdue_span").html(sdate);
    $("#detailsdue_editfield").val($("#detailsdue_span").html());
    
    $("#detailslist_span").html(tasks[t].list_name);
    $("#detailslist_select").val(tasks[t].list_id);
    
    var tags = "";
    if (tasks[t].tags.length != 0) { // non-empty tags
        if (typeof(tasks[t].tags.tag) == "string") { // only one tag
            tags = tasks[t].tags.tag;
        }else{ // more than one tags
            tags = tasks[t].tags.tag.join(", ");
        }
    }
    $("#detailstags_span").html(tags);
    $("#detailstags_editfield").val($("#detailstags_span").html());
    
    $("#detailsurl_span").unbind('click');
    $("#detailsurl_span").click(function(){widget.openURL(tasks[t].url);});
    $("#detailsurl_span").html(tasks[t].url);
    $("#detailsurl_editfield").val($("#detailsurl_span").html());
    
    $("#more_details").unbind('click');
    $("#more_details").click(function() {
        widget.openURL('http://www.rememberthemilk.com/home/' + RTM.user_username +
                       '/' + tasks[t].list_id + '/' + tasks[t].task.id);
    });
    $("#detailsDiv").css("display","block");
    currentTask = t;
}

//close detail box
function closeDetails (){
    $("#detailsDiv").css("display","none");
    if (detailsOpen){
        detailsOpen = false;
        currentTask = null;
        detailsWidth = 0;
        $("#taskDetails").animate({width: detailsWidth+"px"},{duration:500,complete:function(){
            updateWindow();
            if (window.widget) {window.resizeTo(taskWidth + detailsWidth, taskHeight);}
            $("#taskDetails").css("border-style","none");
        }});
    }
}

//show details of tasks[t]
function showDetails (t){
    if (detailsOpen && currentTask == t){
        closeDetails();
        return;
    }
    
    // task box is currently animating, leave it alone
    if ($("#taskDetails:animated").length > 0) {return;}
    
    if (!detailsOpen){
        detailsOpen = true;
        detailsWidth = 200;
        $("#taskDetails").css("left", taskWidth - 11);
        if (window.widget) {window.resizeTo(taskWidth + detailsWidth, taskHeight);}
        updateWindow();
        $("#taskDetails").css("border-style","solid");
        updateDetails(t);
        $("#taskDetails:not(:animated)").animate({width: detailsWidth+"px"}, 500);
        return;
    }
    updateDetails(t);
}

//edit the name field in details
function editName (){
    if (editing) {return;}
    editing=true;
    $("#detailsName").css("display","none");
    $("#detailsName_edit").css("display","block");
    $("#detailsName_edit").val($(detailsName).html());
    $("#detailsName_edit").select();
}

//finish editing name
function nameEdit (){
    editing=false;
    $("#detailsName").css("display","block");
    $("#detailsName_edit").css("display","none");
    var old = $("#detailsName").html();
    var cur = $("#detailsName_edit").val();
    $("#detailsName").html($("#detailsName_edit").val());
    if (old!=cur) {RTM.tasks.setName(currentTask,{name:cur});}
}

//edit the date field in details
function editDate (){
    if (editing) {return;}
    editing=true;
    $("#detailsdue_span").css("display","none");
    $("#detailsdue_editfield").css("display","inline");
    $("#detailsdue_editfield").val($("#detailsdue_span").html());
    $("#detailsdue_editfield").select();
}

//finish editing date
function dateEdit (){
    editing=false;
    $("#detailsdue_span").css("display","inline");
    $("#detailsdue_editfield").css("display","none");
    var old = $("#detailsdue_span").html();
    var cur = $("#detailsdue_editfield").val();
    var id = tasks[currentTask].task.id;
    if (old != cur) {
        $("#detailsdue_span").html(cur);
        RTM.tasks.setDueDate(currentTask, {parse:1,due:cur});
    }else{
        var sdate="";
        if (tasks[currentTask].date.getTime() == never) {
            sdate="never"; //no due date
        }else{
            sdate=tasks[currentTask].date.format("d mmm yy");
        }
        if (tasks[currentTask].task.has_due_time == 1) {
            if (RTM.timeformat == 0) {
                sdate += " at "+ tasks[currentTask].date.format("h:MM TT");
            }else{
                sdate += " at "+ tasks[currentTask].date.format("H:MM");
            }
        }
        $("#detailsdue_span").html(sdate);
    }
}

//edit the list field in details
function editList() {
    if (editing) {return;}
    editing=true;
    $("#detailslist_span").css("display","none");
    $("#detailslist_select").css("display","inline");
    $("#detailslist_select").val(tasks[currentTask].list_id);
    $("#detailslist_select").focus();
}

//finish editing list
function listEdit (){
    editing=false;
    $("#detailslist_span").css("display","inline");
    $("#detailslist_select").css("display","none");
    if (tasks[currentTask].list_id==$("#detailslist_select").val()) {return;}

    RTM.tasks.moveTo(currentTask, {
        from_list_id: tasks[currentTask].list_id,
        to_list_id: $("#detailslist_select").val()
    });

    // Update current task's list id and name
    tasks[currentTask].list_id = $("#detailslist_select").val();
    for (var l in lists) {
        if (lists[l].id == tasks[currentTask].list_id) {
            tasks[currentTask].list_name = lists[l].name;
            $("#detailslist_span").html(lists[l].name);
        }
    }
}

//edit the tags field in details
function editTags (){
    if (editing) {return;}
    editing=true;
    $("#detailstags_span").css("display","none");
    $("#detailstags_editfield").css("display","inline");
    $("#detailstags_editfield").val($("#detailstags_span").html());
    $("#detailstags_editfield").select();
}

//finish editing tags
function tagsEdit (){
    editing=false;
    $("#detailstags_span").css("display","inline");
    $("#detailstags_editfield").css("display","none");
    var old = $("#detailstags_span").html();
    var cur = $("#detailstags_editfield").val();
    $("#detailstags_span").html($("#detailstags_editfield").val());
    if (old != cur) {RTM.tasks.setTags(currentTask,{tags: cur});}
}

//edit the url field in details
function editURL (){
    if (editing) {return;}
    editing=true;
    $("#detailsurl_span").css("display","none");
    $("#detailsurl_editfield").css("display","inline");
    $("#detailsurl_editfield").val($("#detailsurl_span").html());
    $("#detailsurl_editfield").select();
}

//finish editing url
function urlEdit (){
    editing=false;
    $("#detailsurl_span").css("display","inline");
    $("#detailsurl_editfield").css("display","none");
    var old = $("#detailsurl_span").html();
    var cur = $("#detailsurl_editfield").val();
    $("#detailsurl_span").html(cur);
    if (old != cur) {RTM.tasks.setURL(currentTask,{url: cur});}
}

// ===== END OF Details =====

// == Growl ==

// Check if growl is installed
function check_growl_installed() {
     if(window.widget) {
        var output = widget.system("/usr/bin/osascript -e " +
            "'tell application \"System Events\" to return count of " +
            "(every process whose name is \"GrowlHelperApp\")'",
            null).outputString;
        if (output > 0) {
            return true;
        }else{
            return false;
        }
    } else {
        return false;
    }
}

// Register our notifications as "Task Reminder"
// Must be called before growl_notify() is used.
function register_with_growl() {
    widget.system("/usr/bin/osascript " +
        "-e 'set allN to { \"Task Reminder\" }' " +
        "-e 'tell application \"GrowlHelperApp\"' " +
        "-e 'register as application \"Milk the Cow\" " +
        "all notifications allN " +
        "default notifications allN " +
        "icon of application \"Dashboard\"' " +
        "-e 'end tell'",
        null);
}

// Send growl notification with title and description
// Then remove entry from growlTimeouts
function growl_notify(title, desc, id) {
    var img = (document.location.href+'').replace(/\/[^\/]*$/, "");
    img = img.replace(/^file:\//, "file:///") + "/Icon.png";

    widget.system("/usr/bin/osascript " +
        "-e 'tell application \"GrowlHelperApp\"' " +
        "-e 'notify with name \"Task Reminder\" title \"" + title +
        "\" description \"" + desc + "\" application name \"Milk the Cow\" " +
        "image from location \"" + img + "\"' " +
        "-e 'end tell'", $.noop);
        
    growlTimeouts[id].timeout = null;
}

// Create a new growl notification to be sent either now or later
function growl_create(id, date, name) {
    var d = new Date();
    var msg = "";
    var diff = date - d - growlBefore * 60000;
    
    // Task with no due date doesn't need a growl
    if (date.getTime() == never) {
        return;
    }
    
    // Create description message based on due date / time
    if (date < d) {
        msg = "Overdue";
    }else if (diff < 0) {
        msg = "Due in " + Math.floor((date - d) / 60000) + " min";
    }else{
        msg = "Due in " + growlBefore + " min";
    }

    // Store info in growlTimeouts and set a timeout for growl_notify
    growlTimeouts[id].date = date;
    growlTimeouts[id].name = name;
    growlTimeouts[id].timeout = window.setTimeout(growl_notify, diff, name, msg, id);
}

// ===== END OF Growl =====

//find the task with id
function lookUp (id){
    for (var t in tasks) {
        if (tasks[t].task.id == id) {
            return t;
        }
    }
    return null;
}

// compares prioritiies
function comparePriority(a, b){
    a = (a == "N") ? 4: a;
    b = (b == "N") ? 4: b;
    return a - b;
}

// compares strings
function compareString(a, b){
    if (a == b) {return 0;}
    return (a < b) ? -1 : 1;
}

//helper function to sort task
//first by date, then priority, finally name
function sortTasks (t1, t2){
    return t1.date-t2.date || 
                 comparePriority(t1.task.priority, t2.task.priority) || 
                 compareString(t1.name, t2.name);
}

//add a task to tasks array, also include list_id and date
function addTask (t,list_id) {
    var d, s, l;
    if (t.task.length === undefined){
        d = new Date();
        if (t.task.due===undefined || t.task.due=="") {
            d.setTime(never); //no due date
        }else{
            d.setISO8601(t.task.due);
        }
        t.date = d;
        t.list_id = list_id;
        for (l in lists) {
            if (lists[l].id == t.list_id) {
                t.list_name=lists[l].name;
            }
        }

        tasks.push(t);
    }else{
        // repeated task
        for (s in t.task){
            if (t.task.hasOwnProperty(s)) {
                var tt = $.extend({}, t); // clones the object
                tt.task = tt.task[s];
            
                d = new Date();
                if (tt.task.due===undefined || tt.task.due=="") {
                    d.setTime(never); //no due date
                }else{
                    d.setISO8601(tt.task.due);
                }
                tt.date = d;
                tt.list_id = list_id;
                for (l in lists) {
                    if (lists[l].id == tt.list_id) {
                        tt.list_name = lists[l].name;
                    }
                }
            
                tasks.push(tt);
            }
        }
    }
}

function displayTasks() {
    RTM.call({method:"rtm.tasks.getList",filter:$("#customtext").val()},function (r,textStatus) {
        var id;
        if (detailsOpen) {
            //currentTask might change
            id = tasks[currentTask].task.id;
        }
        tasks = [];
        temptasks = r.rsp.tasks;
        var l, s, t;
        if (temptasks.list) { //no tasks
            if (typeof(temptasks.list.length)=="undefined") { //only one list
                if (typeof(temptasks.list.taskseries.length)=="undefined") { //only one task
                    addTask(temptasks.list.taskseries,temptasks.list.id);
                }else{
                    for (s in temptasks.list.taskseries) { //for each task
                        if (temptasks.list.taskseries.hasOwnProperty(s)) {
                            addTask(temptasks.list.taskseries[s],temptasks.list.id);
                        }
                    }
                }
            }else{
                for (l in temptasks.list){ //for each list
                    if (typeof(temptasks.list[l].taskseries.length)=="undefined") { //only one task
                        addTask(temptasks.list[l].taskseries,temptasks.list[l].id);
                    }else{
                        for (s in temptasks.list[l].taskseries) { //for each task
                            if (temptasks.list[l].taskseries.hasOwnProperty(s)) {
                                addTask(temptasks.list[l].taskseries[s],temptasks.list[l].id);
                            }
                        }
                    }
                }
            }
        }
        tasks.sort(sortTasks);
        $("#taskList").empty();
        for (t in tasks){
            log(tasks[t].name + " " + tasks[t].date);
            var date = tasks[t].date.toString().split(" ");
            var sdate = date[1]+" "+date[2];
            var d = new Date();
            var today = new Date(d.getFullYear(),d.getMonth(),d.getDate());
            var tmr = new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
            var week = new Date(d.getFullYear(),d.getMonth(),d.getDate()+7);
            var name = tasks[t].name;
            if (tasks[t].date >= today && tasks[t].date < tmr){
                sdate = "Today"; //Today
                name = "<b>"+name+"</b>";
            }
            if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time == 1) {
                sdate = tasks[t].date.format("ddd"); //Within a week, short day
            }
            if (tasks[t].date>=tmr&&tasks[t].date<week&&tasks[t].task.has_due_time == 0) {
                sdate = tasks[t].date.format("dddd"); //Within a week, long day
            }
            if (tasks[t].task.has_due_time == 1){
                if (RTM.timeformat == 0) {
                    sdate += " @ "+ tasks[t].date.format("h:MM TT");
                }else{
                    sdate += " @ "+ tasks[t].date.format("H:MM");
                }
            }
            if (tasks[t].date<today) {
                name = "<u><b>"+name+"</b></u>"; //overdue
            }
            if (tasks[t].date.getTime() == never) {
                sdate = ""; //no due date
            }
            
            // priority
            var prio = tasks[t].task.priority;
            
            // growl
            if (growl) {
                // Set a new growl notification timeout
                if (!growlTimeouts[tasks[t].id]) {
                    growlTimeouts[tasks[t].id] = {};
                    growl_create(tasks[t].id, tasks[t].date, tasks[t].name);
                }
            
                // Due date has been changed, clear old timeout and set a new one
                if (growlTimeouts[tasks[t].id] && (growlTimeouts[tasks[t].id].date - tasks[t].date) != 0) {
                    window.clearTimeout(growlTimeouts[tasks[t].id].timeout);
                    growl_create(tasks[t].id, tasks[t].date, tasks[t].name);
                }
            }
            
            // add to list view
            $("#taskList").append("<li class='priority-" + prio +
            "'><input type='checkbox'/><span class='taskname'>" + name +
            "<span class='duedate'>" + sdate + "</span></span></li>");
        }
        
        // Assign event handlers for each task
        $("#taskList li").each(function (index) {
            // Click event handler for checkbox
            $(this).children("input[type='checkbox']").click(function(){ RTM.tasks.complete(index); });
            // Click event handler for taskname
            $(this).children(".taskname").click(function(){ showDetails(index); });
        });

        updateWindow();
        
        if (detailsOpen) {
            updateDetails(lookUp(id)); //show the new task detail
        }
    });
}

//gets the task list, displays them
function refresh (){
    if (!RTM.token && !RTM.auth.getToken()) {
        // Do not have a valid token and therefore this widget is not authorized

        // Disable deauthorize button if needed
        $("button:enabled").attr("disabled", "disabled");

        //show auth link
        $("#authDiv").show();
        $("#listDiv").hide();
        if (window.widget) {
            $("#authDiv").html("<span id='authurl' class='url' onclick='widget.openURL(\"" +
                               RTM.auth.url("delete") +
                               "\")'>Click Here</span> to authenticate.");
        }else{
            $("#authDiv").html("<a id='authurl' target='blank' href='" +
                                RTM.auth.url("delete") +
                                "'>Click Here</a> to authenticate.");
        }

        updateWindow();
    }else{
        // Have a valid token and therefore this widget is authorized

        // Enable deauthorize button if needed
        $("button:disabled").removeAttr("disabled");

        //get task list
        $("#authDiv").hide();
        $("#listDiv").show();
        // Do not have any list yet, get list then display tasks
        if (lists.length === 0) {
            RTM.settings.getList(function () {
                RTM.lists.getList(function () {
                    // Filter settings
                    magiclist     = p.v("magiclist");
                    magicpriority = p.v("magicpriority");
                    magicstatus   = p.v("magicstatus");
                    magictext     = p.v("magictext");
                    magictags     = p.v("magictags");
                    $("#magiclist").val(magiclist ? magiclist : "");
                    $("#magicpriority").val(magicpriority ? magicpriority : "");
                    $("#magicstatus").val(magicstatus);
                    $("#magictext").val(magictext);
                    $("#magictags").val(magictags);
                    filterChange();

                    displayTasks();
                });
            });
        }else{
            displayTasks();
        }
    }
}

// call callback if either enter or return is pressed
function enterKeyPress (event,callback) {
    switch (event.keyCode) {
        case 13: // return
        case 3:  // enter
            callback();
            break;
    }
}

//done with filter, return to front
function filterKeyPress (event){
    enterKeyPress(event,function(){
        filterChange();
        showFront();
    });
}

// execute this when the widget is loaded
$(document).ready(function () {
    if (window.widget) {
        widget.onremove = remove;
        widget.onhide = hide;
        widget.onshow = show;
        widget.onsync = sync;
    }
    
    $.ajaxSetup({
        beforeSend: function (req) { $("#loading").show(); },
        complete: function (req, status) { $("#loading").fadeOut("slow"); },
        error: function (req, status, error) {
            log(req);
            log(status);
            if (error) log(error);
            this;
        }
    });
    
    //setup Apple buttons
    var done = new AppleGlassButton($("#done")[0], "Done", showFront);
    var info = new AppleInfoButton($("#info")[0], $("#front")[0], "black", "black", showBack);
    
    //setup Apple Scrollbar
    gMyScrollbar = new AppleVerticalScrollbar($("#listScrollbar")[0]);
    gMyScrollArea = new AppleScrollArea($("#listDiv")[0], gMyScrollbar);
    
    $("#me").text("Milk the Cow " + version + " by Rich Hong");
    
    // Load widget dimension settings
    taskWidth = p.v("taskWidth");
    taskHeight = p.v("taskHeight");
    if (window.widget) {
        window.resizeTo(taskWidth + detailsWidth, taskHeight);
        updateWindow();
    }
    
    // ==========================================================================
    // setup up event listeners
    $("#undo").click(RTM.transactions.undo);
    $("#deauth").click(function () {
        RTM.token = p.s(null,"token");
        RTM.frob = p.s(null,"frob");
        showFront();
    });
    $("#website").click(function(){widget.openURL('http://code.google.com/p/milkthecow/');});
    // keypress event helper for the entire widget
    $("body").keypress(function (event) {
        // Ignore keypresses if control, option or meta keys are pressed
        if (event.ctrlKey || event.altKey || event.metaKey) {return;}
        
        // z: undo even if details is not open
        if (event.keyCode == 122 && !editing) {
            RTM.transactions.undo();
            return;
        }
        if (!detailsOpen) {return;}
        switch (event.keyCode) {
            case 27: // <esc>
                if (editing) {
                    $("#detailsName_edit").val($("#detailsName").html());
                    nameEdit();
    
                    $("#detailsdue_editfield").val($("#detailsdue_span").html());
                    dateEdit();
                    
                    $("#detailslist_select").val(tasks[currentTask].list_id);
                    listEdit();
                    
                    $("#detailstags_editfield").val($("#detailstags_span").html());
                    tagsEdit();
                    
                    $("#detailsurl_editfield").val($("#detailsurl_span").html());
                    urlEdit();
                }else{
                    closeDetails();
                }
                break;
            // priority
            case 49: // 1
            case 50: // 2
            case 51: // 3
            case 52: // 4
                if (!editing) {
                    // update priority color before sending request to server
                    $("#taskList li:eq(" + currentTask + ")").attr('class', "priority-" + (event.keyCode - 48));
                    
                    RTM.tasks.setPriority(currentTask,{priority: event.keyCode - 48});
                }
                break;
            case 99: // c: complete
                if (!editing) {
                    event.stopPropagation();
                    event.preventDefault();
                    RTM.tasks.complete(currentTask);
                    closeDetails();
                }
                break;
            case 100: // d: due date
                if (!editing) {
                    event.stopPropagation();
                    event.preventDefault();
                    editDate();
                }
                break;
            case 112: // p: postpone
                if (!editing) {
                    event.stopPropagation();
                    event.preventDefault();
                    RTM.tasks.postpone(currentTask);
                }
                break;
            case 114: // r: rename
                if (!editing) {
                    event.stopPropagation();
                    event.preventDefault();
                    editName();
                }
                break;
            case 115: // s: tags
                if (!editing) {
                    event.stopPropagation();
                    event.preventDefault();
                    editTags();
                }
                break;
            case 117: // u: url
                if (!editing) {
                    event.stopPropagation();
                    event.preventDefault();
                    editURL();
                }
                break;
        }
    });
    // add a task when return or enter is pressed
    $("#taskinput,#taskinput_list").keypress(function (event) {
        enterKeyPress(event,function(){
            RTM.tasks.add($("#taskinput").val(), $("#taskinput_list").val());
            $("#taskinput").val("");
        });
    });
    
    // Enable or disable growl when the state of check box changes
    $("#growl").change(function () {
        growl = $("#growl").attr("checked");
        
        // If changed from disabled to enabled, register with growl
        if (growl && check_growl_installed()) {
            register_with_growl();
        }else{
            growl = false;
            $("#growl").attr("checked", false);
        }
        p.s(growl, "growl");
        
        // If changed from enabled to disabled, clear all current timeouts
        if (!growl) {
            for (var t in growlTimeouts) {
                if (growlTimeouts.hasOwnProperty(t)) {
                    window.clearTimeout(growlTimeouts[t].timeout);
                    growlTimeouts[t] = null;
                }
            }
        }
    });
    
    // Change the growl reminder time
    $("#growlBefore").change(function () {
        growlBefore = parseInt($("#growlBefore").val(), 10);
        p.s(growlBefore, "growlBefore");
        $("#growlBefore").val(growlBefore);
        
        if (growl) {
            // Update all timeouts
            for (var t in growlTimeouts) {
                if (growlTimeouts.hasOwnProperty(t)) {
                    // Skip ones that we have already sent growl notification
                    if (!growlTimeouts[t].timeout) continue;

                    // Clear old timeout and create a new growl notification
                    window.clearTimeout(growlTimeouts[t].timeout);
                    growl_create(t, growlTimeouts[t].date, growlTimeouts[t].name);
                }
            }
        }
    });
    // ==========================================================================
    
    // Growl
    // Get growl preferences
    growl = p.v("growl");
    growlBefore = p.v("growlBefore");
    $("#growlBefore").val(growlBefore);
    
    // Register with growl
    if (growl && check_growl_installed()) {
        register_with_growl();
    }else{
        growl = p.s(false, "growl");
    }
    $("#growl").attr("checked", growl);

    // Dazzle
    dazzle = new Dazzle({appcastURL: "http://milkthecow.googlecode.com/hg/appcast.xml"});

    // Load RTM variables from preferences
    RTM.sync();

    if (!firstLoad) {
        firstLoad = true;
        refresh();
    }
});
