window.opener = window.opener || window;
window.event_history = [];
window.static_event_list = [];
window.utagmondb = true;
window.is_first_run = true;
window.udb_prefix = "WX TEALIUM DEBUGGER:"

// TODO: HTML Output to show onscreen instead of in console
function renderOutput(views,links) {
  // if(!document.getElementById("utag_debugger")) {
  //   var d = document.createElement("div");
  //   d.id = "utag_debugger";
  //   document.body.prepend(d);
  //
  //   // CSS
  //   d.innerHTML +=
  //   '<style>' +
  //     '#utag_debugger { background:lightskyblue;padding:15px; }'
  //   '</style>';
  //
  //   // Event Counts
  //   d.innerHTML += '<div><strong>Views:</strong> <span id="utag_view_count"></span></div>';
  //   d.innerHTML += '<div><strong>Links:</strong> <span id="utag_link_count"></span></div>';
  //
  // }
  // document.getElementById("utag_view_count").innerHTML = views;
  // document.getElementById("utag_link_count").innerHTML = links;
}


function udb(a,b) {
  if (window.utagmondb === false) {
    return;
  }
  if (window.utagmondb === true) {
    try {
      b ? console.log(udb_prefix,a,b) : console.log(udb_prefix,a)
    } catch (e) {}
  }
}

udb("INITIALISED");

function activate_debug() {
  if(!window.opener.utag.cfg["utagdb"]) {
    window.opener.document.cookie = "utagdb=true;path=/";
    window.opener.utag.cfg["utagdb"] = true;
    window.alert("Tealium debug mode cookie 'utagdb' has not been set. \nPage needs to reload to turn Tealium debug mode on.");
    window.opener.location.reload();
  }
}

function copyEventData(b, copiedData, key, d) {
  copiedData = {};
  for (key in b) {
    if (b.hasOwnProperty(key) && typeof b[key] != "function") {
      if (b[key] instanceof Array) {
        copiedData[key] = b[key].slice(0);
      } else {
        copiedData[key] = b[key];
      }
    }
  }
  // Sort Keys Alphabetically
  copiedData = Object.keys(copiedData)
    .sort()
    .reduce(function (data, key) {
      data[key] = copiedData[key];
      return data;
    }, {});

  // OPTIONAL: Convert all values to strings
  for (var i = 0; i < Object.keys(copiedData).length; i++) {
    if(typeof copiedData[Object.keys(copiedData)[i]] != "undefined") {
      var d_type = typeof copiedData[Object.keys(copiedData)[i]];
      if(d_type!=="string") copiedData[Object.keys(copiedData)[i]] = JSON.stringify(copiedData[Object.keys(copiedData)[i]]);
    }
  }

  return copiedData;
}

function get_utag_version() {
  var v = window.opener.utag.cfg.v;
  if (v) {
    var rv = v.match(/4\.\d\d/);
    return rv.length == 1 ? rv[0] : "";
  }
}

function is_event_object(e, o, prev) {
  var p = "";
  if (prev && typeof prev != "object") {
    p = prev;
  }
  var is_trigger = p.indexOf("trigger:") == 0;
  var has_trigger_match = p === "trigger:" + e;
  if (is_trigger && !has_trigger_match) {
    return false;
  }
  var is_tag_object = p.indexOf("send:") > -1;
  var is_init_object = p == "Pre-INIT";
  var version = get_utag_version();
  return (
    o &&
    typeof o == "object" &&
    !is_tag_object &&
    e &&
    ((version >= 4.36 &&
      p == "All Tags EXTENSIONS" &&
      o["ut.event"] &&
      o["ut.event"] == e) ||
      (version < 4.36 &&
        (has_trigger_match ||
          (o["_utag_event"] && o["_utag_event"] == e) ||
          (o["ut.event"] && o["ut.event"] == e) ||
          is_init_object ||
          (!o["_utag_event"] && !o["ut.event"] && o["cp.utagdb"]))))
  );
}

function get_static_events(preserve_log) {
  var this_event_list;
  if (preserve_log) {
    this_event_list = window.static_event_list;
  } else {
    this_event_list = [];
  }
  if (
    window.opener &&
    window.opener.utag &&
    typeof window.opener.utag.data != "undefined" &&
    (!preserve_log || (preserve_log && !window.opener.utag.data["tealium_preserved"]))
  ) {
    var ev = new Object();
    if (preserve_log) window.opener.utag.data["tealium_preserved"] = true;
    ev.data = copyEventData(window.opener.utag.data);
    ev.code = "utag_view";
    ev.method = "utag.data";
    ev.data["tealium_event"] = "utag.data";
    ev.url = window.opener.document.URL || "";
    this_event_list[this_event_list.length] = ev;
  }
  return this_event_list.slice(0);
}

function get_live_events(utag_view, utag_link, preserve_log) {

  if(window.is_first_run) {
    get_static_events(true);
  }

  var this_event_list = [];
  if (preserve_log) {
    this_event_list = window.event_history;
    for (var i = 0; i < this_event_list.length; i++) {
      this_event_list[i].hidden = false;
    }
  } else {
    this_event_list = [];
  }
  if (window.opener) {
    if (window.opener.utag && typeof window.opener.utag.db_log == "object") {
      var prev;
      for (
        var event_num = 0; event_num < window.opener.utag.db_log.length; event_num++
      ){
        var l = window.opener.utag.db_log[event_num];
        var method = is_event_object("view",l,prev) ? "view" : (is_event_object("link",l,prev) ? "link" : null);
        if ( typeof l == "object" && (window.is_first_run || !l["tealium_preserved"]) && method !== null ) {
          l["tealium_preserved"] = true;
          var ev = new Object();
          ev.data = copyEventData(l);
          ev.method = method;
          ev.url = window.opener.document.URL || "";
          this_event_list[this_event_list.length] = ev;
          var consoleGrouping = udb_prefix + " tealium_event = " + ev.data["tealium_event"] + " (" + ev.method + ")";
          console.groupCollapsed(consoleGrouping);
          console.table(ev.data);
          console.groupEnd(consoleGrouping);
        }
        prev = l;
      }
    }
  }

  var rv = this_event_list.slice(0);
  if (window.static_event_list.length > 0) {
    rv.unshift(static_event_list[0]);
  }

  window.is_first_run = false;
  return rv;
}

function hijack_track() {
  var utag = window.utag;
  utag._dbtrack = utag.track;
  utag.track = function(a,b,c,d){
    utag._dbtrack(a,b,c,d);
    setTimeout(function(){
      window.tiq_db_update();
    },1000);
  };
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

window.tiq_history = window.tiq_history || [];

window.tiq_db_update = function () {
  // udb("UPDATE CALLED");
  var events = get_live_events(null,null,true);
  let eventHistory = events.map(({data})=>({ [data.tealium_event]: data }));

  if(!arraysEqual(eventHistory,window.tiq_history)) {
    window.tiq_history = eventHistory;
    udb("HISTORY:", eventHistory);
  }

  if(event_history.length === 0) {
    setTimeout(function (){
      udb("POLLING FOR FIRST EVENT");
      window.tiq_db_update();
    },1000);
  }
  else {
    // TODO: See if this causes issues
    // Flush the db_log
    window.opener.utag.db_log = [];
  }
}

function init() {
  // createOutput();
  if(typeof window.opener.utag != "undefined" && typeof window.opener.utag.cfg != "undefined") {
    if (window.is_first_run) {
      activate_debug();
      hijack_track();
    }
    window.tiq_db_update();
  }
  else {
    udb("utag is not ready.");
    setTimeout(function (){
      init();
    },1000);
  }
}
init();