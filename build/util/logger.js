(function() {
  var debug;

  debug = require("debug");

  module.exports = function(prefix, suffix) {
    if (prefix == null) {
      prefix = "";
    }
    if (suffix == null) {
      suffix = ":";
    }
    return {
      log: debug("" + prefix + "log" + suffix),
      debug: debug("" + prefix + "debug" + suffix),
      info: debug("" + prefix + "info" + suffix),
      error: debug("" + prefix + "error" + suffix)
    };
  };

}).call(this);
