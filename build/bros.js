(function() {
  var Promise, bgshim, browserify, coffeeReact, fs, logger, path, pushArray, temp;

  browserify = require("browserify");

  coffeeReact = require("coffee-reactify");

  temp = require("temp");

  fs = require("fs");

  Promise = require("bluebird");

  logger = require("./util/logger")("nodes:bros:");

  path = require("path");

  bgshim = require('browserify-global-shim');

  temp.track();

  pushArray = function(arr, item) {
    if (arr.indexOf(item) === -1) {
      arr.push(item);
    }
    return arr;
  };

  module.exports = function(site, appName, appObject) {
    return new Promise(function(resolve, reject) {
      var b, clientRouterPath, clientSite, clientStartUpPath, component, expose, i, items, key, opts, routeName, routeObject, strClientSite, value, _i, _j, _len, _len1, _ref, _ref1;
      items = [];
      items = pushArray(items, site.layouts[appObject.layout]);
      _ref = appObject.routes;
      for (routeName in _ref) {
        routeObject = _ref[routeName];
        _ref1 = routeObject.components;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          component = _ref1[_i];
          pushArray(items, component);
        }
      }
      opts = {
        basedir: site.cwd,
        extensions: [".js", ".coffee", ".json", ".cjsx", ".cson"]
      };
      b = browserify(opts);
      b.transform(coffeeReact, {
        global: true
      });
      for (_j = 0, _len1 = items.length; _j < _len1; _j++) {
        i = items[_j];
        expose = path.join("/" + appName + "/", i).replace(/\\/g, "/");
        logger.log("require " + i + " - expose- " + expose);
        b.require("" + i, {
          expose: expose
        });
      }
      clientStartUpPath = "" + __dirname + "/client-startup";
      b.require(clientStartUpPath, {
        expose: "nodes/client-startup"
      });
      clientRouterPath = "" + __dirname + "/router/client";
      b.require(clientRouterPath, {
        expose: "nodes/client/router"
      });
      clientSite = {
        cwd: "" + appName + "/",
        "static": site["static"],
        layouts: site.layouts,
        app: {}
      };
      for (key in appObject) {
        value = appObject[key];
        if (key !== "modules") {
          clientSite.app[key] = value;
        }
      }
      clientSite.app.name = appName;
      strClientSite = "module.exports = " + (JSON.stringify(clientSite)) + ";";
      logger.log("site", strClientSite);
      return temp.mkdir(appName, function(err, dirPath) {
        var configFile, publicPath;
        publicPath = path.join(dirPath, "./public");
        configFile = path.join(dirPath, "" + appName + "-config.js");
        return fs.mkdir(publicPath, function() {
          var startFile, target;
          target = path.join(publicPath, "" + appName + "-bundle.js");
          startFile = path.join(publicPath, "" + appName + "-start.js");
          return fs.writeFile(startFile, "require('nodes/client-startup')();", function(err) {
            return fs.writeFile(configFile, strClientSite, function(err) {
              var stream, write;
              if (err) {
                throw err;
              }
              logger.log("file!!", configFile);
              b.require(configFile, {
                expose: "nodes/config"
              });
              stream = b.bundle();
              write = fs.createWriteStream(target);
              write.on("close", function() {
                logger.log("fin", target, publicPath);
                return resolve(publicPath);
              });
              return stream.pipe(write);
            });
          });
        });
      });
    });
  };

}).call(this);
