(function() {
  var Promise, React, bros, cluster, cpuCount, debug, express, expressApp, i, logger, path, pathToConfigFile, routerFactory, site, sitePath, _i;

  express = require("express");

  React = require("react");

  path = require("path");

  debug = require("debug");

  Promise = require("bluebird");

  cluster = require("cluster");

  debug.enable("*");

  require('coffee-react/register');

  require('./util/cson-register');

  if (cluster.isMaster) {
    cpuCount = 1;
    for (i = _i = 0; 0 <= cpuCount ? _i < cpuCount : _i > cpuCount; i = 0 <= cpuCount ? ++_i : --_i) {
      cluster.fork();
    }
    return;
  }

  routerFactory = require("./router/server");

  bros = require("./bros");

  logger = require("./util/logger")("nodes:");

  pathToConfigFile = "./";

  if (process.argv[2] != null) {
    pathToConfigFile = process.argv[2];
  }

  sitePath = path.resolve(process.cwd(), pathToConfigFile);

  logger.info("Site found at '" + sitePath + "'");

  site = require(sitePath);

  site.cwd = sitePath;

  logger.info("site file loaded", site);

  if (!site.express) {
    site.express = {};
  }

  expressApp = express();

  require(path.resolve(sitePath, "express"))(expressApp).then(function(modules) {
    var am, apiModNames, apiMods, apiModules, apiName, apiObject, apiPath, app, appName, key, r, renderer, startup, value, _j, _k, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4;
    site.express.modules = modules;
    logger.info("express modules loaded", site.express.modules);
    if (site.api != null) {
      _ref = site.api;
      for (apiName in _ref) {
        apiObject = _ref[apiName];
        for (apiPath in apiObject) {
          apiModules = apiObject[apiPath];
          apiModNames = [];
          if (site.modules != null) {
            apiModNames = apiModNames.concat(site.modules);
          }
          apiModNames = apiModNames.concat(apiModules);
          logger.log("API MODULES", apiModNames, site.modules);
          apiMods = [apiPath];
          for (_j = 0, _len = apiModNames.length; _j < _len; _j++) {
            am = apiModNames[_j];
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
    _ref1 = site.layouts;
    for (key in _ref1) {
      value = _ref1[key];
      if (!site.components[value]) {
        site.components[value] = require(path.join(site.cwd, value));
      }
    }
    _ref2 = site.apps;
    for (appName in _ref2) {
      app = _ref2[appName];
      _ref3 = app.routes;
      for (key in _ref3) {
        value = _ref3[key];
        _ref4 = value.components;
        for (_k = 0, _len1 = _ref4.length; _k < _len1; _k++) {
          r = _ref4[_k];
          if (!site.components[r]) {
            site.components[r] = require(path.join(site.cwd, r));
          }
        }
      }
    }
    logger.log("site components", site.components);
    renderer = routerFactory(site);
    startup = function() {
      return new Promise(function(resolve, reject) {
        var p, promises, staticPath, _ref5;
        if (site["static"] != null) {
          staticPath = path.resolve(sitePath, site["static"]);
          logger.info("creating static handler at '" + staticPath);
          expressApp.use(express["static"](staticPath));
        }
        promises = [];
        _ref5 = site.apps;
        for (appName in _ref5) {
          app = _ref5[appName];
          p = bros(site, appName, app).then(function(tmpDir) {
            var appModules, expressArgs, m, routeFunc, routes, _l, _len2, _len3, _m, _ref6, _results;
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
            for (_l = 0, _len2 = modules.length; _l < _len2; _l++) {
              m = modules[_l];
              if (site.express.modules[m] != null) {
                appModules.push(site.express.modules[m]());
              }
            }
            _ref6 = renderer.createApplication(appName, app), routes = _ref6.routes, routeFunc = _ref6.routeFunc;
            _results = [];
            for (_m = 0, _len3 = routes.length; _m < _len3; _m++) {
              r = routes[_m];
              expressArgs = [r];
              expressArgs = expressArgs.concat(appModules);
              expressArgs.push(routeFunc);
              logger.debug("args for app " + appName, expressArgs);
              _results.push(expressApp.get.apply(expressApp, expressArgs));
            }
            return _results;
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
      return expressApp.listen(site.express.port);
    });
  });

}).call(this);
