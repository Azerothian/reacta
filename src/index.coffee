
express = require "express"
React = require "react"
path = require "path"
debug = require "debug"
Promise = require "bluebird"

require 'coffee-react/register' # add cjsx require
require './util/cson-register'

temp = require "temp"
temp.track()

routerFactory = require "./router/server"
bros = require "./bros"
logger = require("./util/logger")("reacta:");
#link = require "promise-link"

#bros = link("./bros", undefined, __dirname)

# pathToConfigFile = "./"
#
# pathToConfigFile = process.argv[2] if process.argv[2]?
#
# sitePath = path.resolve process.cwd(), pathToConfigFile #, "index.cson"
# logger.info "Site found at '#{sitePath}'"
#
# site = require(sitePath)

listen = (o) ->
  logger.log "listen"
  return new Promise (resolve, reject) ->
    o.expressApp.use (req, res, next) ->
      res.status(404).send("404")
    o.expressApp.listen o.site.express.port
    logger.log "now listening on #{o.site.express.port}"
    return resolve()

createApp =  (site, appName, app, renderer) ->
  logger.log "createApp #{appName}"
  return new Promise (resolve, reject) ->
    o = {
      static: undefined
      routes: []
    }
    return temp.mkdir appName, (err, dirPath) ->
      return bros(site, appName, app, dirPath).then (tmpDir) ->
        logger.log "creating path to '#{tmpDir}"
        o.static = tmpDir
        modules = []
        if site.modules?
          modules = modules.concat site.modules
        if app.modules?
          modules = modules.concat app.modules
        appModules = []
        logger.debug "modules for route #{appName}", modules
        for m in modules
          if o.site.express.modules[m]?
            appModules.push o.site.express.modules[m]
        return renderer.createApplication(appName, app).then (newApp) ->
          {routes, routeFunc} = newApp

          for r in routes
            expressArgs = ["/#{r}"]
            if app.routes[r]?.modules?
              for mm in app.routes[r].modules
                logger.log "adding module to reacta route #{r} #{mm}"
                expressArgs.push site.express.modules[mm]
            expressArgs = expressArgs.concat appModules
            expressArgs.push routeFunc
            logger.debug "args for app #{appName}", expressArgs, r
            o.routes.push expressArgs
          return resolve(o)

generateApps = (o) ->
  logger.log "generate apps"
  return new Promise (resolve, reject) ->
    promises = []
    for appName, app of o.site.apps
      promises.push createApp(o.site, appName, app, o.renderer)

    Promise.all(promises).then (apps) ->
      for a in apps
        o.expressApp.use express.static(a.static)
        for args in a.routes
          o.expressApp.get.apply o.expressApp, args
      return resolve(o)

setupStatic = (o) ->
  logger.log "setupStatic"
  return new Promise (resolve, reject) ->
    if o.site.static?
      staticPath = path.resolve(o.site.cwd, o.site.static)
      logger.info "creating static handler at '#{staticPath}"
      o.expressApp.use express.static(staticPath)
    return resolve o

createRenderer = (o) ->
  logger.log "createRender"
  return new Promise (resolve, reject) ->
    logger.log "creating renderer from route factory"
    o.renderer = routerFactory(o.site)
    return resolve o


processAppRoutes = (o) ->
  logger.log "processAppRoutes"
  return new Promise (resolve, reject) ->
    o.site.components = {}
    for appName, app of o.site.apps
      if !app.disableServerRenderer
        for key, value of app.routes
          for r in value.components
            if !o.site.components[r]
              o.site.components[r] = require path.join(o.site.cwd, r)
    return resolve o

processServices = (o) ->
  logger.log "processServices"
  return new Promise (resolve, reject) ->
    if !o.site.api?
      return resolve() #service reference not found, act normal, should i reject?
    if typeof o.site.api is "string"
      servfile = path.resolve o.site.cwd, o.site.api
      p = require(servfile)
    else
      p = o.site.api
    return p(o.expressApp, o.site).then (services) ->
      o.site.express.modules = services.modules

      if services.routes?
        for apiName, apiObject of services.routes
          for apiPath, apiModules of apiObject
            apiModNames = []
            if services.global?
              apiModNames = apiModNames.concat services.global

            apiModNames = apiModNames.concat apiModules
            logger.log "api modules found", apiModNames, services.global
            apiMods = [apiPath]
            for am in apiModNames
              if o.site.express.modules[am]?
                apiMods.push o.site.express.modules[am]

            logger.log "creating api route #{apiName} - #{apiPath}", apiMods
            o.expressApp[apiName].apply o.expressApp, apiMods
      return resolve o



module.exports = (site) ->

  site.cwd = process.cwd()
  logger.info "site file loaded", site

  if !site.express
    site.express = {}

  expressApp = express()
  return processServices({site, expressApp})
    .then processAppRoutes
    .then createRenderer
    .then setupStatic
    .then generateApps
    .then listen
    .then () ->
      logger.log "finished"







#
#
# module.exports = (site) ->
#
#   site.cwd = process.cwd()
#   site.services
#   logger.info "site file loaded", site
#
#   if !site.express
#     site.express = {}
#
#   expressApp = express()

  # require(path.resolve(site.cwd, site.api))(expressApp, site).then (services) ->
  #   site.express.modules = services.modules
  #   logger.info "express modules loaded", services
  #
  #   if services.routes?
  #     logger.info "routes found"
  #     for apiName, apiObject of services.routes
  #       logger.info "apiName: #{apiName}", apiObject
  #       for apiPath, apiModules of apiObject
  #         apiModNames = []
  #         if services.global?
  #           apiModNames = apiModNames.concat services.global
  #
  #         apiModNames = apiModNames.concat apiModules
  #         logger.log "api modules found", apiModNames, services.global
  #         apiMods = [apiPath]
  #         for am in apiModNames
  #           if site.express.modules[am]?
  #             apiMods.push site.express.modules[am]
  #
  #         logger.log "creating api route #{apiName} - #{apiPath}", apiMods
  #         expressApp[apiName].apply expressApp, apiMods
  #
  #   site.components = {}
  #
  #   for appName, app of site.apps
  #     for key, value of app.routes
  #       for r in value.components
  #         if !site.components[r]
  #           site.components[r] = require path.join(site.cwd, r)
  #
  #   logger.log "creating renderer from route factory"
  #   renderer = routerFactory(site)

    # startup = () ->
    #   return new Promise (resolve, reject) ->
    #     if site.static?
    #       staticPath = path.resolve(site.cwd, site.static)
    #       logger.info "creating static handler at '#{staticPath}"
    #       expressApp.use express.static(staticPath)
    #
    #     gen = (_site, _appName, _app) ->
    #       return new Promise (resolve, reject) ->
    #         return temp.mkdir _appName, (err, dirPath) ->
    #           return bros(_site, _appName, _app, dirPath).then (tmpDir) ->
    #             logger.log "creating path to '#{tmpDir}"
    #             expressApp.use express.static(tmpDir)
    #             modules = []
    #             if site.modules?
    #               modules = modules.concat site.modules
    #             if app.modules?
    #               modules = modules.concat app.modules
    #             appModules = []
    #             logger.debug "modules for route #{appName}", modules
    #             for m in modules
    #               if site.express.modules[m]?
    #                 appModules.push site.express.modules[m]()
    #             renderer.createApplication(appName, app).then (newApp) ->
    #               {routes, routeFunc} = newApp
    #
    #               for r in routes
    #                 expressArgs = ["/#{r}"]
    #                 if app.routes[r]?.modules?
    #                   for mm in app.routes[r].modules
    #                     logger.log "adding module to reacta route #{r} #{mm}"
    #                     expressArgs.push site.express.modules[mm]()
    #
    #                 expressArgs = expressArgs.concat appModules
    #                 expressArgs.push routeFunc
    #
    #                 logger.debug "args for app #{appName}", expressArgs, r
    #                 expressApp.get.apply expressApp, expressArgs
    #                 resolve()
    #
    #     promises = []
    #     for appName, app of site.apps
    #
    #         p =
    #           promises.push p
    #
    #     Promise.all(promises).then resolve, reject
    #
    # startup().then () ->
    #   expressApp.use (req, res, next) ->
    #     res.status(404).send("404")
    #   expressApp.listen site.express.port
    #   logger.log "now listening on #{site.express.port}"
