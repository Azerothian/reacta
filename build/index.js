(function() {
  var Promise, React, bros, createApp, createRenderer, debug, express, generateApps, listen, logger, path, processAppRoutes, processServices, routerFactory, setupStatic, temp;

  express = require("express");

  React = require("react");

  path = require("path");

  debug = require("debug");

  Promise = require("bluebird");

  require('coffee-react/register');

  require('./util/cson-register');

  temp = require("temp");

  temp.track();

  routerFactory = require("./router/server");

  bros = require("./bros");

  logger = require("./util/logger")("reacta:");

  listen = function(o) {
    logger.log("listen");
    return new Promise(function(resolve, reject) {
      o.expressApp.use(function(req, res, next) {
        return res.status(404).send("404");
      });
      o.http.listen(o.site.express.port);
      logger.log("now listening on " + o.site.express.port);
      return resolve();
    });
  };

  createApp = function(site, appName, app, renderer) {
    logger.log("createApp " + appName);
    return new Promise(function(resolve, reject) {
      var o;
      o = {
        "static": void 0,
        routes: []
      };
      return temp.mkdir(appName, function(err, dirPath) {
        return bros(site, appName, app, dirPath).then(function(tmpDir) {
          var appModules, i, len, m, modules;
          logger.log("creating path to '" + tmpDir);
          o["static"] = tmpDir;
          modules = [];
          if (site.modules != null) {
            modules = modules.concat(site.modules);
          }
          if (app.modules != null) {
            modules = modules.concat(app.modules);
          }
          appModules = [];
          logger.debug("modules for route " + appName, modules);
          for (i = 0, len = modules.length; i < len; i++) {
            m = modules[i];
            if (o.site.express.modules[m] != null) {
              appModules.push(o.site.express.modules[m]);
            }
          }
          return renderer.createApplication(appName, app).then(function(newApp) {
            var expressArgs, j, k, len1, len2, mm, r, ref, ref1, routeFunc, routes;
            routes = newApp.routes, routeFunc = newApp.routeFunc;
            for (j = 0, len1 = routes.length; j < len1; j++) {
              r = routes[j];
              expressArgs = ["/" + r];
              if (((ref = app.routes[r]) != null ? ref.modules : void 0) != null) {
                ref1 = app.routes[r].modules;
                for (k = 0, len2 = ref1.length; k < len2; k++) {
                  mm = ref1[k];
                  logger.log("adding module to reacta route " + r + " " + mm);
                  expressArgs.push(site.express.modules[mm]);
                }
              }
              expressArgs = expressArgs.concat(appModules);
              expressArgs.push(routeFunc);
              logger.debug("args for app " + appName, expressArgs, r);
              o.routes.push(expressArgs);
            }
            return resolve(o);
          });
        });
      });
    });
  };

  generateApps = function(o) {
    logger.log("generate apps");
    return new Promise(function(resolve, reject) {
      var app, appName, promises, ref;
      promises = [];
      ref = o.site.apps;
      for (appName in ref) {
        app = ref[appName];
        promises.push(createApp(o.site, appName, app, o.renderer));
      }
      return Promise.all(promises).then(function(apps) {
        var a, args, i, j, len, len1, ref1;
        for (i = 0, len = apps.length; i < len; i++) {
          a = apps[i];
          o.expressApp.use(express["static"](a["static"]));
          ref1 = a.routes;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            args = ref1[j];
            o.expressApp.get.apply(o.expressApp, args);
          }
        }
        return resolve(o);
      });
    });
  };

  setupStatic = function(o) {
    logger.log("setupStatic");
    return new Promise(function(resolve, reject) {
      var staticPath;
      if (o.site["static"] != null) {
        staticPath = path.resolve(o.site.cwd, o.site["static"]);
        logger.info("creating static handler at '" + staticPath);
        o.expressApp.use(express["static"](staticPath));
      }
      return resolve(o);
    });
  };

  createRenderer = function(o) {
    logger.log("createRender");
    return new Promise(function(resolve, reject) {
      logger.log("creating renderer from route factory");
      o.renderer = routerFactory(o.site);
      return resolve(o);
    });
  };

  processAppRoutes = function(o) {
    logger.log("processAppRoutes");
    return new Promise(function(resolve, reject) {
      var app, appName, i, key, len, r, ref, ref1, ref2, value;
      o.site.components = {};
      ref = o.site.apps;
      for (appName in ref) {
        app = ref[appName];
        if (!app.disableServerRenderer) {
          ref1 = app.routes;
          for (key in ref1) {
            value = ref1[key];
            ref2 = value.components;
            for (i = 0, len = ref2.length; i < len; i++) {
              r = ref2[i];
              if (!o.site.components[r]) {
                o.site.components[r] = require(path.join(o.site.cwd, r));
              }
            }
          }
        }
      }
      return resolve(o);
    });
  };

  processServices = function(o) {
    logger.log("processServices");
    return new Promise(function(resolve, reject) {
      var p, servfile;
      if (o.site.api == null) {
        return resolve();
      }
      if (typeof o.site.api === "string") {
        servfile = path.resolve(o.site.cwd, o.site.api);
        p = require(servfile);
      } else {
        p = o.site.api;
      }
      return p(o).then(function(services) {
        var am, apiModNames, apiMods, apiModules, apiName, apiObject, apiPath, i, len, ref;
        logger.log("services", services);
        o.site.express.modules = services.modules;
        if (services.routes != null) {
          ref = services.routes;
          for (apiName in ref) {
            apiObject = ref[apiName];
            for (apiPath in apiObject) {
              apiModules = apiObject[apiPath];
              apiModNames = [];
              if (services.global != null) {
                apiModNames = apiModNames.concat(services.global);
              }
              apiModNames = apiModNames.concat(apiModules);
              apiMods = [apiPath];
              for (i = 0, len = apiModNames.length; i < len; i++) {
                am = apiModNames[i];
                if (o.site.express.modules[am] != null) {
                  apiMods.push(o.site.express.modules[am]);
                }
              }
              logger.log("creating api route " + apiName + " - " + apiPath, apiMods.length);
              o.expressApp[apiName].apply(o.expressApp, apiMods);
            }
          }
        }
        return resolve(o);
      });
    });
  };

  module.exports = function(site) {
    var expressApp, http;
    site.cwd = process.cwd();
    logger.info("site file loaded", site);
    if (!site.express) {
      site.express = {};
    }
    expressApp = express();
    http = require('http').Server(expressApp);
    return processServices({
      site: site,
      expressApp: expressApp,
      http: http
    }).then(processAppRoutes).then(createRenderer).then(setupStatic).then(generateApps).then(listen).then(function() {
      return logger.log("finished");
    });
  };

}).call(this);
