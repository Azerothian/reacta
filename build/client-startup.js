(function() {
  var React, Router, debug, path, routerFactory, site;

  site = require("reacta/config");

  routerFactory = require("reacta/client/router");

  React = require("react");

  Router = require("react-router");

  debug = require("debug");

  path = require("path");

  debug.enable("*");

  module.exports = function() {
    var i, key, len, r, ref, ref1, router, value;
    site.components = {};
    ref = site.app.routes;
    for (key in ref) {
      value = ref[key];
      ref1 = value.components;
      for (i = 0, len = ref1.length; i < len; i++) {
        r = ref1[i];
        if (!site.components[r]) {
          site.components[r] = require("/" + (path.join(site.cwd, r)));
        }
      }
    }
    router = routerFactory(site);
    return router(site.app.name, site.app).then(function(element) {
      return Router.run(element, Router.HistoryLocation, function(Handler) {
        return React.render(React.createElement(Handler), document.getElementById('react-component'));
      });
    });
  };

}).call(this);
