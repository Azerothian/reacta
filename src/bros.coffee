browserify = require "browserify"
coffeeReact = require "coffee-reactify"
fs = require "fs"
Promise = require "bluebird"
logger = require("./util/logger")("reacta:browserify:")
path = require "path"

bgshim = require 'browserify-global-shim'

pushArray = (arr, item)->
  if arr.indexOf(item) == -1
    arr.push item
  return arr

module.exports = (site, appName, appObject, dirPath) ->
  return new Promise (resolve, reject) ->
    items = []
    #items = pushArray items, site.layouts[appObject.layout]
    for routeName, routeObject of appObject.routes
      for component in routeObject.components
        pushArray items, component

    opts = {
      basedir: site.cwd
      extensions: site.browserify.extensions
    }
    b = browserify(opts)

    globalShim = bgshim.configure site.browserify.globalshim

    b.transform coffeeReact, { global: true }

    b.transform globalShim, { global: true }
    if site.minify
      uglifyify = require "uglifyify"
      b.transform uglifyify, { global: true }

    for i in items
      expose = path.join("/#{appName}/", i).replace(/\\/g,"/")
      #for windows support
      logger.log "require #{i} - expose- #{expose}"
      b.require "#{i}", { expose: expose }

    clientStartUpPath = "#{__dirname}/client-startup"
    b.require clientStartUpPath, { expose: "reacta/client-startup" }

    clientRouterPath = "#{__dirname}/router/client"
    b.require clientRouterPath, { expose: "reacta/client/router" }


    clientSite = {
      cwd: "#{appName}/",
      "static": site.static
      layouts: site.layouts
      app: {}
    }
    for key, value of appObject
      if key != "modules"
        clientSite.app[key] = value
    clientSite.app.name = appName
    strClientSite =  "module.exports = #{JSON.stringify(clientSite)};"
    #because globals doesnt play nice with json files
    logger.log "site", strClientSite
    publicPath = path.join dirPath, "./public"
    configFile = path.join dirPath, "#{appName}-config.js"
    fs.mkdir publicPath, () ->
      target = path.join publicPath, "#{appName}-bundle.js"
      startFile = path.join publicPath, "#{appName}-start.js"
      fs.writeFile startFile, "require('reacta/client-startup')();", (err) ->
        fs.writeFile configFile, strClientSite, (err) ->
          if err
            throw err
          logger.log "file!!", configFile
          #b.add configFile
          b.require configFile, { expose:  "reacta/config" }

          stream = b.bundle()
          write = fs.createWriteStream(target)
          write.on "close", () ->
            logger.log "fin", target, publicPath
            resolve(publicPath)

          stream.pipe(write)
