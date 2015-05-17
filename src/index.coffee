
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

listen = (o) ->
  logger.log "listen"
  return new Promise (resolve, reject) ->
    o.expressApp.use (req, res, next) ->
      res.status(404).send("404")
    o.http.listen o.site.express.port
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
          for r, obj of routes
            logger.log "processing route #{r}", app
            expressArgs = ["/#{r}"]
            if obj.modules?
              for mm in obj.modules
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
    return p(o).then (services) ->
      logger.log "services", services
      o.site.express.modules = services.modules

      if services.routes?
        for apiName, apiObject of services.routes
          for apiPath, apiModules of apiObject
            apiModNames = []
            if services.global?
              apiModNames = apiModNames.concat services.global

            apiModNames = apiModNames.concat apiModules
            apiMods = [apiPath]
            for am in apiModNames
              if o.site.express.modules[am]?
                apiMods.push o.site.express.modules[am]

            logger.log "creating api route #{apiName} - #{apiPath}", apiMods.length
            o.expressApp[apiName].apply o.expressApp, apiMods
      return resolve o



module.exports = (site) ->

  site.cwd = process.cwd()
  logger.info "site file loaded", site

  if !site.express
    site.express = {}

  expressApp = express()
  http = require('http').Server(expressApp);
  return processServices({site, expressApp, http})
    .then processAppRoutes
    .then createRenderer
    .then setupStatic
    .then generateApps
    .then listen
    .then () ->
      logger.log "finished"
