javascript:(function() {
  var tiq_db_src = "http://localhost/tiq-debugger/bookmark.js";
  var tiq_db_el = document.querySelector("[src^='"+tiq_db_src+"']");
  if(!tiq_db_el) {
    var s = document.createElement("script");
    s.src = tiq_db_src + "?v="+Date.now();
    document.querySelector('head').appendChild(s);
  }
  else {
    window.tiq_db_update();
  }
})();