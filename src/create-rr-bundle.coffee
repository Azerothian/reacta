Promise = require "native-or-bluebird"
path = require "path"

glob = require "glob"
fs = require "fs-extra"

browserify = require "browserify"

logger = require("./util/logger")("reacta:rr-bundle:");
module.exports = (site, tmpDir) ->
  return new Promise (resolve, reject) ->
    reactPath = path.dirname(require.resolve("react"))
    contents = "module.exports = {};\r\n"
    contents += "module.exports.React = require('react');\r\n"
    contents += "module.exports.ReactRouter = require('react-router');\r\n"
    contents += "window.React = require('react');\r\n"
    contents += "window.ReactRouter = require('react-router');\r\n"

    contents += "module.exports.ReactLib = {\r\n"
    return glob path.resolve(reactPath, 'lib/*.js'), (err, files) ->
      globalShim = {
        "react": "require('rr-bundle').React"
        "react-router": "require('rr-bundle').ReactRouter"
      }
      for f in files
        fileName = path.basename(f, '.js')
        globalShim["react/lib/#{fileName}"] = "require('rr-bundle').ReactLib['#{fileName}']"
        contents += "  '#{fileName}': require('react/lib/#{fileName}'),\r\n"
      contents += "};\r\n"

      return fs.writeFile path.resolve(__dirname, "rr-bundle.js"), contents, (err) ->
        b = browserify {
          cwd: __dirname
          extensions: [".js"]
        }
        filePath = path.resolve(__dirname, "rr-bundle")
        b.require filePath, { expose: "rr-bundle" }

        if site.minify
          uglifyify = require "uglifyify"
          b.transform uglifyify, { global: true }
        logger.log "bundling rr-bundle"
        stream = b.bundle()
        target = path.resolve tmpDir, "rr-bundle.js"
        logger.log "starting building react bundle", target
        write = fs.createWriteStream(target)
        logger.log "stream created"
        write.on "close", () ->
          logger.log "fin", target
          return resolve(globalShim)
        stream.pipe(write)
