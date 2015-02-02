(function() {
  var React, Router, debug, path, routerFactory, site;

  site = require("nodes/config");

  routerFactory = require("nodes/client/router");

  React = require("react");

  Router = require("react-router");

  debug = require("debug");

  path = require("path");

  debug.enable("*");

  module.exports = function() {
    var key, r, router, value, _i, _len, _ref, _ref1, _ref2;
    site.components = {};
    _ref = site.layouts;
    for (key in _ref) {
      value = _ref[key];
      if (!site.components[value]) {
        site.components[value] = require("/" + (path.join(site.cwd, value)));
      }
    }
    _ref1 = site.app.routes;
    for (key in _ref1) {
      value = _ref1[key];
      _ref2 = value.components;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        r = _ref2[_i];
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
