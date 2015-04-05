(function() {
  var DefaultRoute, Promise, React, Route, RouteHandler, Router, div, logger, path;

  logger = require("../util/logger")("reacta:router:client:");

  path = require("path");

  React = require("react");

  Router = require("react-router");

  Promise = require("bluebird");

  div = React.DOM.div;

  Route = Router.Route, DefaultRoute = Router.DefaultRoute, RouteHandler = Router.RouteHandler;

  module.exports = function(site) {
    var createReactRoute, createRouteComponentClass, createRouteHandler;
    createRouteComponentClass = function(components) {
      return new Promise(function(resolve, reject) {
        return resolve(React.createClass({
          render: function() {
            logger.log("component handler render", components);
            if (components.length === 1) {
              return React.createElement(components[0]);
            } else {
              return React.createElement("div", {}, components.map(function(c) {
                return React.createElement(c);
              }));
            }
          }
        }));
      });
    };
    createReactRoute = function(components, isDefaultRoute, routeName, routeObject) {
      return new Promise(function(resolve, reject) {
        return createRouteComponentClass(components).then(function(handler) {
          if (isDefaultRoute) {
            logger.log("returning default route");
            return resolve({
              type: DefaultRoute,
              props: {
                handler: handler,
                key: routeName,
                name: routeName
              }
            });
          } else {
            logger.log("returning a route", isDefaultRoute, routeName, routeObject);
            return resolve({
              type: Route,
              props: {
                key: routeName,
                name: routeName,
                path: routeObject.path,
                ignoreScrollBehavior: routeObject.ignoreScrollBehavior,
                handler: handler
              }
            });
          }
        });
      });
    };
    createRouteHandler = function(app, routeName, routeObject) {
      return new Promise(function(resolve, reject) {
        var componentPath, components, i, isRoute, len, ref;
        logger.debug("init create route handler " + routeName, routeObject);
        components = [];
        ref = routeObject.components;
        for (i = 0, len = ref.length; i < len; i++) {
          componentPath = ref[i];
          logger.debug("loading component at " + componentPath);
          components.push(site.components[componentPath]);
        }
        isRoute = app.baseRoute === routeName;
        return createReactRoute(components, isRoute, routeName, routeObject).then(resolve, reject);
      });
    };
    return function(appName, app) {
      return new Promise(function(resolve, reject) {
        var mainApp, promises, ref, routeName, routeObject;
        mainApp = React.createClass({
          render: function() {
            return React.createElement(RouteHandler);
          }
        });
        promises = [];
        ref = app.routes;
        for (routeName in ref) {
          routeObject = ref[routeName];
          promises.push(createRouteHandler(app, routeName, routeObject));
        }
        return Promise.all(promises).then(function(results) {
          var mainRouteProps, r;
          mainRouteProps = {
            name: appName,
            path: app.path,
            handler: mainApp,
            key: appName
          };
          logger.log("main props", mainRouteProps);
          r = React.createElement(Route, mainRouteProps, results.map(function(r) {
            return React.createElement(r.type, r.props);
          }));
          return resolve(r);
        });
      });
    };
  };

}).call(this);
