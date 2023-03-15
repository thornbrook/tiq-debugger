window.opener = window.opener || window;
window.event_history = [];
window.static_event_list = [];
window.utagmondb = true;
window.is_first_run = true;

function createOutput() {
  if(!document.getElementById("utag_debugger")) {
    var d = document.createElement("div");
    d.id = "utag_debugger";
    document.body.prepend(d);

    // CSS
    d.innerHTML +=
    '<style>' +
      '#utag_debugger { background:lightskyblue;padding:15px; }' +
      '#utag_debugger #message { background:lightsalmon;font-weight: bold; }'
    '</style>';

    // Top Message
    d.innerHTML += '<div id="message"></div>';

    // Event Counts
    d.innerHTML += '<div><strong>Views:</strong> <span id="utag_view_count">0</span></div>';
    d.innerHTML += '<div><strong>Links:</strong> <span id="utag_link_count">0</span></div>';

  }
}


function udb(a) {
  if (window.utagmondb === false) {
    return;
  }
  if (window.utagmondb === true) {
    try {
      console.log("UTAG DEBUGGER: ",a);
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

function cp(src, dst, c, d) {
  dst = {};
  for (c in src) {
    if (src.hasOwnProperty(c) && typeof src[c] != "function") {
      if (src[c] instanceof Array) {
        dst[c] = src[c].slice(0);
      } else {
        dst[c] = src[c];
      }
    }
  }
  return dst;
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
    udb("static list: preserve log");
    this_event_list = window.static_event_list;
  } else {
    udb("static list: no preserve log");
    this_event_list = [];
  }
  document.getElementById("utag_view_count").innerHTML = "0";
  document.getElementById("utag_link_count").innerHTML = "0";
  if (
    window.opener &&
    window.opener.utag &&
    typeof window.opener.utag.data != "undefined" &&
    (!preserve_log || (preserve_log && !window.opener.utag.data["_preserved"]))
  ) {
    var ev = new Object();
    if (preserve_log) window.opener.utag.data["_preserved"] = true;
    ev.data = cp(window.opener.utag.data);
    ev.code = "utag_view";
    ev.method = "utag.data";
    ev.url = window.opener.document.URL || "";
    this_event_list[this_event_list.length] = ev;
    document.getElementById("utag_view_count").innerHTML++;
  }
  return this_event_list.slice(0);
}

function get_live_events(utag_view, utag_link, preserve_log) {

  udb("GET LIVE EVENTS");

  if(window.is_first_run) {
    get_static_events(true);
  }

  var this_event_list = [];
  if (preserve_log) {
    udb("event list: preserve log");
    this_event_list = window.event_history;
    for (var i = 0; i < this_event_list.length; i++) {
      this_event_list[i].hidden = false;
    }
  } else {
    udb("event list: no preserve log");
    this_event_list = [];
  }
  if (this_event_list.length == 0) {
    document.getElementById("utag_view_count").innerHTML = "0";
    document.getElementById("utag_link_count").innerHTML = "0";
  }
  if (window.opener) {
    if (window.opener.utag && typeof window.opener.utag.db_log == "object") {
      var prev;
      for (
        var event_num = 0; event_num < window.opener.utag.db_log.length; event_num++
      ) {
        var l = window.opener.utag.db_log[event_num];
        if (
          typeof l == "object" &&
          (window.is_first_run || !l["_preserved"]) &&
          is_event_object("view", l, prev)
        ) {
          udb("utag.view event found");
          l["_preserved"] = true;
          var ev = new Object();
          ev.data = cp(l);
          ev.code = "utag_view";
          ev.method = "utag.view";
          ev.url = window.opener.document.URL || "";
          this_event_list[this_event_list.length] = ev;
          document.getElementById("utag_view_count").innerHTML++;
        }
        if (
          typeof l == "object" &&
          (window.is_first_run || !l["_preserved"]) &&
          is_event_object("link", l, prev)
        ) {
          udb("utag.link event found");
          l["_preserved"] = true;
          var ev = new Object();
          ev.data = cp(l);
          ev.code = "utag_link";
          ev.method = "utag.link";
          ev.url = window.opener.document.URL || "";
          this_event_list[this_event_list.length] = ev;
          document.getElementById("utag_link_count").innerHTML++;
        }
        prev = l;
      }
    }
  }
  for (var i = 0; i < this_event_list.length; i++) {
    var m = this_event_list[i].method;
    if (!window[m] && m != "utag.data") {
      udb("event is hidden");
      this_event_list[i].hidden = true;
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
    }, 500);
  };
}

window.tiq_db_update = function () {
  udb("UPDATE CALLED");
  var events = get_live_events(null,null,true);
  if(event_history.length === 0) {
    setTimeout(function (){
      udb("POLLING FOR FIRST EVENT");
      window.tiq_db_update();
    },1000);
  }
}

function init() {
  createOutput();
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
    },500)
  }
}
init();