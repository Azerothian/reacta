(function() {
  var Promise, React, Reacta, ReactaRenderer, _, fs, glob, path, webpack;

  Promise = require("native-or-bluebird");

  React = require("react");

  webpack = require("webpack");

  path = require("path").posix;

  fs = require('fs-extra');

  glob = require("glob");

  _ = require("lodash");

  ReactaRenderer = (function() {
    function ReactaRenderer(name, options1, reacta) {
      this.name = name;
      this.options = options1;
      this.reacta = reacta;
      this.fileName = this.name.replace(/\//g, '-');
      this.sourceFile = "../" + this.reacta.options.components + "/" + this.name;
      if (this.options.dependencies == null) {
        this.options.dependencies = [];
      }
      this.options.dependencies.push("react");
      this.options.dependencies.push(this.sourceFile);
    }

    ReactaRenderer.prototype.createStartupFile = function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var d, deps, i, jsonDeps, jsonProps, len, ref, resolved, script;
          deps = [];
          ref = _this.options.dependencies;
          for (i = 0, len = ref.length; i < len; i++) {
            d = ref[i];
            if (d.indexOf(".") > -1) {
              resolved = path.join("../" + _this.reacta.options.components, d);
              deps.push(resolved);
            } else {
              deps.push(d);
            }
          }
          script = "";
          jsonDeps = JSON.stringify(deps);
          jsonProps = JSON.stringify(_this.options.props);
          script += "require.ensure(" + jsonDeps + ", function(require){ \r\n";
          script += "var React = require('react');\r\n";
          script += "var component = require('" + _this.sourceFile + "')\r\n";
          script += "React.render(React.createElement(component, " + jsonProps + "), document.getElementById('react-component'));\r\n";
          script += "});\r\n";
          return fs.writeFile(path.join(_this.reacta.startPath, _this.fileName) + "-startup.js", script, resolve);
        };
      })(this));
    };

    ReactaRenderer.prototype.use = function() {
      return (function(_this) {
        return function(req, res, next) {
          var options;
          options = {
            header: "",
            content: "<div id='react-component'></div>",
            scripts: ""
          };
          options.scripts += "<script src='" + _this.reacta.options["static"] + "/commons.js'></script>";
          options.scripts += "<script src='" + _this.reacta.options["static"] + "/" + _this.fileName + "-startup.bundle.js'></script>";
          if (_this.options.template != null) {
            options = _.merge(options, _this.options.templateProps);
          }
          return res.render("" + _this.options.view, options);
        };
      })(this);
    };

    return ReactaRenderer;

  })();

  Reacta = (function() {
    function Reacta(options1) {
      this.options = options1;
      this.cwd = this.options.cwd || process.cwd();
      this.tempPath = "./.reacta/";
      this.startPath = "./.reacta/";
      this.renderers = {};
    }

    Reacta.prototype["static"] = function(express, app) {
      return app.use(this.options["static"], express["static"](this.tempPath));
    };

    Reacta.prototype.create = function(componentName, options) {
      var renderer;
      if (this.renderers[componentName] == null) {
        renderer = new ReactaRenderer(componentName, options, this);
        this.renderers[componentName] = renderer;
      } else {
        renderer = this.renderers[componentName];
      }
      return renderer.use();
    };

    Reacta.prototype.createDirectory = function(path) {
      return new Promise(function(resolve, reject) {
        return fs.exists(path, function(exists) {
          if (exists) {
            fs.rmdir(path, (function(_this) {
              return function() {
                return fs.mkdir(path, resolve);
              };
            })(this));
          }
          return fs.mkdir(path, resolve);
        });
      });
    };

    Reacta.prototype.compile = function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return _this.createDirectory(_this.tempPath).then(function() {
            var entries, fileName, k, plugins, promises, ref, v;
            entries = {};
            promises = [];
            plugins = [
              new webpack.optimize.CommonsChunkPlugin({
                name: "commons",
                minChunks: Infinity
              }), new webpack.optimize.DedupePlugin()
            ];
            ref = _this.renderers;
            for (k in ref) {
              v = ref[k];
              promises.push(v.createStartupFile());
              fileName = v.fileName + "-startup";
              entries[fileName] = "./" + path.join(_this.startPath, fileName);
            }
            return Promise.all(promises).then(function() {
              var webpackOptions;
              webpackOptions = _.merge({
                context: _this.cwd,
                entry: entries,
                output: {
                  publicPath: _this.options["static"] + "/",
                  path: _this.tempPath,
                  filename: "[name].bundle.js",
                  chunkFilename: "[id].chunk.js"
                },
                plugins: plugins
              }, _this.options.webpack || {});
              _this.compiler = webpack(webpackOptions);
              return _this.compiler.run(function(err, stats) {
                if (err != null) {
                  console.log("err", err);
                  return reject(err);
                }
                console.log(stats.toString({
                  colors: true,
                  hash: true,
                  version: true,
                  timings: true,
                  assets: true,
                  chunks: false,
                  chunkModules: false,
                  modules: false,
                  cached: false,
                  reasons: false,
                  source: false,
                  errorDetails: true,
                  chunkOrigins: false
                }));
                return resolve(stats);
              });
            });
          });
        };
      })(this));
    };

    return Reacta;

  })();

  module.exports = function(options) {
    return new Reacta(options);
  };

}).call(this);
