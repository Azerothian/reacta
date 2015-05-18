(function() {
  var Promise, React, bros, copyReactToTemp, createApp, createRenderer, debug, express, fs, generateApps, listen, logger, merge, path, processAppRoutes, processServices, resolveModules, routerFactory, setupStatic, temp;

  express = require("express");

  React = require("react");

  path = require("path");

  debug = require("debug");

  merge = require("deepmerge");

  Promise = require("bluebird");

  require('coffee-react/register');

  require('./util/cson-register');

  fs = require("fs-extra");

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

  resolveModules = function(moduleName, service, modules) {
    var i, j, k, l, len, len1, ref, ref1;
    if (modules == null) {
      modules = [];
    }
    if (service.deps[moduleName] != null) {
      ref = service.deps[moduleName];
      for (j = 0, len = ref.length; j < len; j++) {
        k = ref[j];
        ref1 = resolveModules(k, service, modules);
        for (l = 0, len1 = ref1.length; l < len1; l++) {
          i = ref1[l];
          if (modules.indexOf(i) === -1) {
            modules.push(i);
          }
        }
      }
    }
    if (modules.indexOf(moduleName) === -1) {
      modules.push(moduleName);
    }
    return modules;
  };

  copyReactToTemp = function(tmpDir) {
    return new Promise(function(resolve, reject) {
      var reactDistPath, reactPath, reactRouterDistPath, reactRouterPath, reactRouterTargetPath, reactTargetPath;
      reactPath = path.dirname(require.resolve("react"));
      reactRouterPath = path.dirname(require.resolve("react-router"));
      reactDistPath = path.resolve(reactPath, "./dist/");
      reactRouterDistPath = path.resolve(reactRouterPath, "../umd/");
      reactTargetPath = path.resolve(tmpDir, "./react/");
      reactRouterTargetPath = path.resolve(tmpDir, "./react-router/");
      logger.log("starting copy", reactDistPath, reactTargetPath);
      return fs.copy(reactDistPath, reactTargetPath, function(err) {
        if (err != null) {
          return reject(err);
        }
        logger.log("starting copy 2", reactRouterDistPath, reactRouterTargetPath);
        return fs.copy(reactRouterDistPath, reactRouterTargetPath, function(err) {
          if (err != null) {
            return reject(err);
          }
          return resolve();
        });
      });
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
          logger.log("creating path to '" + tmpDir);
          return copyReactToTemp(tmpDir).then(function() {
            var appModules, j, len, m, modules;
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
            for (j = 0, len = modules.length; j < len; j++) {
              m = modules[j];
              appModules = resolveModules(m, site._services, appModules);
            }
            return renderer.createApplication(site, appName, app).then(function(newApp) {
              var expressArgs, l, len1, len2, moduleName, n, obj, r, ref, routeFunc, routeModules, routes;
              routes = newApp.routes, routeFunc = newApp.routeFunc;
              for (r in routes) {
                obj = routes[r];
                logger.log("processing route " + r, app);
                expressArgs = ["/" + r];
                routeModules = appModules.concat([]);
                if (obj.modules != null) {
                  ref = obj.modules;
                  for (l = 0, len1 = ref.length; l < len1; l++) {
                    m = ref[l];
                    logger.log("mods", m);
                    routeModules = resolveModules(m, site._services, routeModules);
                  }
                }
                logger.log("route modules", routeModules);
                for (n = 0, len2 = routeModules.length; n < len2; n++) {
                  moduleName = routeModules[n];
                  if (site._services.modules[moduleName] != null) {
                    expressArgs.push(site._services.modules[moduleName]);
                  }
                }
                expressArgs.push(routeFunc);
                logger.debug("args for app " + appName, expressArgs, r);
                o.routes.push(expressArgs);
              }
              return resolve(o);
            });
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
        var a, args, j, l, len, len1, ref1;
        for (j = 0, len = apps.length; j < len; j++) {
          a = apps[j];
          o.expressApp.use(express["static"](a["static"]));
          ref1 = a.routes;
          for (l = 0, len1 = ref1.length; l < len1; l++) {
            args = ref1[l];
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
      var app, appName, j, key, len, r, ref, ref1, ref2, value;
      o.site.components = {};
      ref = o.site.apps;
      for (appName in ref) {
        app = ref[appName];
        if (!app.disableServerRenderer) {
          ref1 = app.routes;
          for (key in ref1) {
            value = ref1[key];
            ref2 = value.components;
            for (j = 0, len = ref2.length; j < len; j++) {
              r = ref2[j];
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
      return p(o).then(function(res) {
        return Promise.all(res).then(function(results) {
          var am, apiModNames, apiMods, apiModules, apiName, apiObject, apiPath, j, l, len, len1, len2, len3, len4, m, mods, n, q, r, ref, ref1, s, servicea, services;
          logger.log("results", results);
          services = {};
          if (results instanceof Array) {
            for (j = 0, len = results.length; j < len; j++) {
              r = results[j];
              services = merge(r, services);
            }
          } else {
            servicea = results;
          }
          if (services.routes != null) {
            ref = services.routes;
            for (apiName in ref) {
              apiObject = ref[apiName];
              for (apiPath in apiObject) {
                apiModules = apiObject[apiPath];
                mods = [];
                if (services.global != null) {
                  mods = services.global.concat(apiModules);
                } else {
                  mods = apiModules.concat([]);
                }
                for (l = 0, len1 = mods.length; l < len1; l++) {
                  m = mods[l];
                  mods = resolveModules(m, services, mods);
                }
                apiModNames = [];
                if (services.global != null) {
                  ref1 = services.global;
                  for (n = 0, len2 = ref1.length; n < len2; n++) {
                    m = ref1[n];
                    apiModNames = resolveModules(m, services, apiModNames);
                  }
                }
                for (q = 0, len3 = apiModules.length; q < len3; q++) {
                  m = apiModules[q];
                  apiModNames = resolveModules(m, services, apiModNames);
                }
                apiMods = [apiPath];
                for (s = 0, len4 = apiModNames.length; s < len4; s++) {
                  am = apiModNames[s];
                  if (services.modules[am] != null) {
                    apiMods.push(services.modules[am]);
                  }
                }
                logger.log("creating api route " + apiName + " - " + apiPath, apiMods.length);
                o.expressApp[apiName].apply(o.expressApp, apiMods);
              }
            }
          }
          o.site._services = services;
          return resolve(o);
        });
      });
    });
  };

  module.exports = function(site) {
    var expressApp, http;
    site.cwd = process.cwd();
    logger.info("site file loaded", site.cwd);
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
