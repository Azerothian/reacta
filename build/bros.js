(function() {
  var Promise, bgshim, browserify, coffeeReact, fs, logger, path, pushArray, temp;

  browserify = require("browserify");

  coffeeReact = require("coffee-reactify");

  temp = require("temp");

  fs = require("fs");

  Promise = require("bluebird");

  logger = require("./util/logger")("reacta:browserify:");

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
      var b, clientRouterPath, clientSite, clientStartUpPath, component, expose, globalShim, i, items, j, k, key, len, len1, opts, ref, ref1, routeName, routeObject, strClientSite, uglifyify, value;
      items = [];
      ref = appObject.routes;
      for (routeName in ref) {
        routeObject = ref[routeName];
        ref1 = routeObject.components;
        for (j = 0, len = ref1.length; j < len; j++) {
          component = ref1[j];
          pushArray(items, component);
        }
      }
      opts = {
        basedir: site.cwd,
        extensions: site.browserify.extensions
      };
      b = browserify(opts);
      globalShim = bgshim.configure(site.browserify.globalshim);
      b.transform(coffeeReact, {
        global: true
      });
      b.transform(globalShim, {
        global: true
      });
      if (site.minify) {
        uglifyify = require("uglifyify");
        b.transform(uglifyify, {
          global: true
        });
      }
      for (k = 0, len1 = items.length; k < len1; k++) {
        i = items[k];
        expose = path.join("/" + appName + "/", i).replace(/\\/g, "/");
        logger.log("require " + i + " - expose- " + expose);
        b.require("" + i, {
          expose: expose
        });
      }
      clientStartUpPath = __dirname + "/client-startup";
      b.require(clientStartUpPath, {
        expose: "reacta/client-startup"
      });
      clientRouterPath = __dirname + "/router/client";
      b.require(clientRouterPath, {
        expose: "reacta/client/router"
      });
      clientSite = {
        cwd: appName + "/",
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
        configFile = path.join(dirPath, appName + "-config.js");
        return fs.mkdir(publicPath, function() {
          var startFile, target;
          target = path.join(publicPath, appName + "-bundle.js");
          startFile = path.join(publicPath, appName + "-start.js");
          return fs.writeFile(startFile, "require('reacta/client-startup')();", function(err) {
            return fs.writeFile(configFile, strClientSite, function(err) {
              var stream, write;
              if (err) {
                throw err;
              }
              logger.log("file!!", configFile);
              b.require(configFile, {
                expose: "reacta/config"
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
