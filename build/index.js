(function() {
  var Promise, React, bros, debug, express, logger, path, routerFactory;

  express = require("express");

  React = require("react");

  path = require("path");

  debug = require("debug");

  Promise = require("bluebird");

  require('coffee-react/register');

  require('./util/cson-register');

  routerFactory = require("./router/server");

  bros = require("./bros");

  logger = require("./util/logger")("reacta:");

  module.exports = function(site) {
    var expressApp;
    site.cwd = process.cwd();
    logger.info("site file loaded", site);
    if (!site.express) {
      site.express = {};
    }
    expressApp = express();
    return require(path.resolve(site.cwd, "services"))(expressApp).then(function(modules) {
      var am, apiModNames, apiMods, apiModules, apiName, apiObject, apiPath, app, appName, i, j, key, len, len1, r, ref, ref1, ref2, ref3, renderer, startup, value;
      site.express.modules = modules;
      logger.info("express modules loaded", site.express.modules);
      if (site.api != null) {
        ref = site.api;
        for (apiName in ref) {
          apiObject = ref[apiName];
          for (apiPath in apiObject) {
            apiModules = apiObject[apiPath];
            apiModNames = [];
            if (site.modules != null) {
              apiModNames = apiModNames.concat(site.modules);
            }
            apiModNames = apiModNames.concat(apiModules);
            logger.log("api modules found", apiModNames, site.modules);
            apiMods = [apiPath];
            for (i = 0, len = apiModNames.length; i < len; i++) {
              am = apiModNames[i];
              if (site.express.modules[am] != null) {
                apiMods.push(site.express.modules[am]());
              }
            }
            logger.log("creating api route " + apiName + " - " + apiPath, apiMods);
            expressApp[apiName].apply(expressApp, apiMods);
          }
        }
      }
      site.components = {};
      ref1 = site.apps;
      for (appName in ref1) {
        app = ref1[appName];
        ref2 = app.routes;
        for (key in ref2) {
          value = ref2[key];
          ref3 = value.components;
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            r = ref3[j];
            if (!site.components[r]) {
              site.components[r] = require(path.join(site.cwd, r));
            }
          }
        }
      }
      logger.log("creating renderer from route factory");
      renderer = routerFactory(site);
      startup = function() {
        return new Promise(function(resolve, reject) {
          var p, promises, ref4, staticPath;
          if (site["static"] != null) {
            staticPath = path.resolve(site.cwd, site["static"]);
            logger.info("creating static handler at '" + staticPath);
            expressApp.use(express["static"](staticPath));
          }
          promises = [];
          ref4 = site.apps;
          for (appName in ref4) {
            app = ref4[appName];
            p = bros(site, appName, app).then(function(tmpDir) {
              var appModules, k, len2, m;
              logger.log("creating path to '" + tmpDir);
              expressApp.use(express["static"](tmpDir));
              modules = [];
              if (site.modules != null) {
                modules = modules.concat(site.modules);
              }
              if (app.modules != null) {
                modules = modules.concat(app.modules);
              }
              appModules = [];
              logger.debug("modules for route " + appName, modules);
              for (k = 0, len2 = modules.length; k < len2; k++) {
                m = modules[k];
                if (site.express.modules[m] != null) {
                  appModules.push(site.express.modules[m]());
                }
              }
              return renderer.createApplication(appName, app).then(function(newApp) {
                var expressArgs, l, len3, len4, mm, n, ref5, ref6, results, routeFunc, routes;
                routes = newApp.routes, routeFunc = newApp.routeFunc;
                results = [];
                for (l = 0, len3 = routes.length; l < len3; l++) {
                  r = routes[l];
                  expressArgs = ["/" + r];
                  if (((ref5 = app.routes[r]) != null ? ref5.modules : void 0) != null) {
                    ref6 = app.routes[r].modules;
                    for (n = 0, len4 = ref6.length; n < len4; n++) {
                      mm = ref6[n];
                      logger.log("adding module to reacta route " + r + " " + mm);
                      expressArgs.push(site.express.modules[mm]());
                    }
                  }
                  expressArgs = expressArgs.concat(appModules);
                  expressArgs.push(routeFunc);
                  logger.debug("args for app " + appName, expressArgs, r);
                  results.push(expressApp.get.apply(expressApp, expressArgs));
                }
                return results;
              });
            });
            promises.push(p);
          }
          return Promise.all(promises).then(resolve, reject);
        });
      };
      return startup().then(function() {
        expressApp.use(function(req, res, next) {
          return res.status(404).send("404");
        });
        expressApp.listen(site.express.port);
        return logger.log("now listening on " + site.express.port);
      });
    });
  };

}).call(this);
