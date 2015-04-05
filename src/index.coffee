
express = require "express"
React = require "react"
path = require "path"
debug = require "debug"
Promise = require "bluebird"

require 'coffee-react/register' # add cjsx require
require './util/cson-register'


routerFactory = require "./router/server"
bros = require "./bros"
logger = require("./util/logger")("reacta:");


# pathToConfigFile = "./"
#
# pathToConfigFile = process.argv[2] if process.argv[2]?
#
# sitePath = path.resolve process.cwd(), pathToConfigFile #, "index.cson"
# logger.info "Site found at '#{sitePath}'"
#
# site = require(sitePath)

module.exports = (site) ->

  site.cwd = process.cwd()

  logger.info "site file loaded", site

  if !site.express
    site.express = {}

  expressApp = express()

  require(path.resolve(site.cwd, "services"))(expressApp).then (modules) ->
    site.express.modules = modules
    logger.info "express modules loaded", site.express.modules

    if site.api?
      for apiName, apiObject of site.api
        for apiPath, apiModules of apiObject
          apiModNames = []
          if site.modules?
            apiModNames = apiModNames.concat site.modules

          apiModNames = apiModNames.concat apiModules
          logger.log "api modules found", apiModNames, site.modules
          apiMods = [apiPath]
          for am in apiModNames
            if site.express.modules[am]?
              apiMods.push site.express.modules[am]()

          logger.log "creating api route #{apiName} - #{apiPath}", apiMods
          expressApp[apiName].apply expressApp, apiMods

    site.components = {}

    for appName, app of site.apps
      for key, value of app.routes
        for r in value.components
          if !site.components[r]
            site.components[r] = require path.join(site.cwd, r)

    logger.log "creating renderer from route factory"
    renderer = routerFactory(site)

    startup = () ->
      return new Promise (resolve, reject) ->
        if site.static?
          staticPath = path.resolve(site.cwd, site.static)
          logger.info "creating static handler at '#{staticPath}"
          expressApp.use express.static(staticPath)

        promises = []
        for appName, app of site.apps

          p = bros(site, appName, app).then (tmpDir) ->
            logger.log "creating path to '#{tmpDir}"
            expressApp.use express.static(tmpDir)
            modules = []
            if site.modules?
              modules = modules.concat site.modules
            if app.modules?
              modules = modules.concat app.modules
            appModules = []
            logger.debug "modules for route #{appName}", modules
            for m in modules
              if site.express.modules[m]?
                appModules.push site.express.modules[m]()
            renderer.createApplication(appName, app).then (newApp) ->
              {routes, routeFunc} = newApp

              for r in routes
                expressArgs = ["/#{r}"]
                if app.routes[r]?.modules?
                  for mm in app.routes[r].modules
                    logger.log "adding module to reacta route #{r} #{mm}"
                    expressArgs.push site.express.modules[mm]()

                expressArgs = expressArgs.concat appModules
                expressArgs.push routeFunc

                logger.debug "args for app #{appName}", expressArgs, r
                expressApp.get.apply expressApp, expressArgs
          promises.push p

        Promise.all(promises).then resolve, reject

    startup().then () ->
      expressApp.use (req, res, next) ->
        res.status(404).send("404")
      expressApp.listen site.express.port
      logger.log "now listening on #{site.express.port}"
