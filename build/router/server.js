(function() {
  var Promise, React, Router, client, logger, path;

  path = require("path");

  client = require("./client");

  React = require("react");

  Router = require("react-router");

  logger = require("../util/logger")("nodes:router:server:");

  Promise = require("bluebird");

  module.exports = function(site) {
    var clientSite, createExpressRoute, createLayout, getLayout;
    clientSite = client(site);
    getLayout = function(name) {
      return new Promise(function(resolve, reject) {
        return resolve(site.components[site.layouts[name]]);
      });
    };
    createLayout = function(appName, app) {
      return new Promise(function(resolve, reject) {
        return getLayout(app.layout).then(function(layout) {
          return resolve(React.createClass({
            render: function() {
              return React.createElement(layout, {}, [
                React.createElement("div", {
                  id: "react-component"
                }, "REPLACEME"), React.createElement("script", {
                  src: "/" + appName + "-bundle.js",
                  key: 'bundleScript'
                }), React.createElement("script", {
                  src: "/" + appName + "-start.js",
                  key: 'startScript'
                })
              ]);
            }
          }));
        });
      });
    };
    createExpressRoute = function(appName, app) {
      return function(req, res, next) {
        return createLayout(appName, app).then(function(element) {
          var layoutMarkup;
          layoutMarkup = React.renderToStaticMarkup(React.createElement(element));
          return clientSite(appName, app).then(function(element) {
            logger.log("url2", req.baseUrl);
            return Router.run(element, req.baseUrl, function(Handler) {
              var inner_markup, markup;
              logger.log("renderToString", req.url);
              inner_markup = React.renderToString(React.createElement(Handler));
              markup = layoutMarkup.replace("REPLACEME", inner_markup);
              res.send(markup);
            });
          });
        });
      };
    };
    return {
      createApplication: function(appName, app) {
        var gapp, routeName, routeObject, routePath, _ref;
        gapp = {
          routeFunc: createExpressRoute(appName, app),
          routes: []
        };
        _ref = app.routes;
        for (routeName in _ref) {
          routeObject = _ref[routeName];
          routePath = "" + app.path;
          if (routeObject.path != null) {
            routePath += routeObject.path;
          }
          logger.info("creating route '" + routePath + "'");
          gapp.routes.push(routePath);
        }
        return gapp;
      }
    };
  };

}).call(this);
