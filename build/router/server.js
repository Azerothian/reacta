(function() {
  var Promise, React, Router, client, ect, fs, logger, path;

  path = require("path");

  client = require("./client");

  React = require("react");

  Router = require("react-router");

  ect = require("ect");

  logger = require("../util/logger")("reacta:router:server:");

  Promise = require("native-or-bluebird");

  fs = require("fs");

  module.exports = function(site) {
    var clientSite, createExpressRoute, createRenderer, loadLayout;
    clientSite = client(site);
    loadLayout = function(appName, app) {
      return new Promise(function(resolve, reject) {
        var fullLayoutPath, layoutPath;
        layoutPath = site.layouts[app.layout];
        logger.log("loadLayout " + layoutPath);
        fullLayoutPath = path.join(site.cwd, layoutPath);
        logger.log("loadLayout " + layoutPath + " - " + fullLayoutPath);
        return fs.readFile(fullLayoutPath + ".ect", 'utf8', function(err, data) {
          if (err != null) {
            return reject(err);
          }
          return resolve(data);
        });
      });
    };
    createRenderer = function(site, appName, app) {
      return new Promise(function(resolve, reject) {
        return loadLayout(appName, app).then(function(layoutMarkup) {
          var markup;
          markup = "<% extend \"layout\" %>";
          markup += "<script src='/rr-bundle.js'></script>";
          markup += "<div id='react-component'><%- @reactContent %></div>\r\n";
          markup += "<script src='/" + appName + "-bundle.js'></script>\r\n";
          markup += "<script src='/" + appName + "-start.js'></script>\r\n";
          return resolve(ect({
            root: {
              layout: layoutMarkup,
              page: markup
            }
          }));
        });
      });
    };
    createExpressRoute = function(appName, app, renderer) {
      return function(req, res, next) {
        return clientSite(appName, app).then(function(element) {
          logger.log("url2", req.url);
          return Router.run(element, req.url, function(Handler) {
            var inner_markup, markup;
            logger.log("renderToString", req.url);
            if (app.disableServerRenderer) {
              inner_markup = "";
            } else {
              inner_markup = React.renderToString(React.createElement(Handler));
            }
            markup = renderer.render("page", {
              reactContent: inner_markup,
              header: "",
              scripts: ""
            });
            res.send(markup);
          });
        });
      };
    };
    return {
      createApplication: function(site, appName, app) {
        return new Promise(function(resolve, reject) {
          return createRenderer(site, appName, app).then(function(renderer) {
            var gapp, ref, routeName, routeObject, routePath;
            gapp = {
              routeFunc: createExpressRoute(appName, app, renderer),
              routes: {}
            };
            ref = app.routes;
            for (routeName in ref) {
              routeObject = ref[routeName];
              routePath = "" + app.path;
              if (routeObject.path != null) {
                routePath = routeObject.path;
              }
              logger.info("creating route '" + routePath + "'");
              gapp.routes[routePath] = routeObject;
            }
            return resolve(gapp);
          });
        });
      }
    };
  };

}).call(this);
