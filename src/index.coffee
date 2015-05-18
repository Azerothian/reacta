
express = require "express"
React = require "react"
path = require "path"
debug = require "debug"
merge = require "deepmerge"
Promise = require "bluebird"

require 'coffee-react/register' # add cjsx require
require './util/cson-register'

fs = require "fs-extra"

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


resolveModules = (moduleName, service, modules = []) ->
  if service.deps[moduleName]?
    for k in service.deps[moduleName]
      for i in resolveModules(k, service, modules)
        if modules.indexOf(i) is -1
          modules.push i
  if modules.indexOf(moduleName) is -1
    modules.push moduleName
  return modules;

copyReactToTemp = (tmpDir) ->
  return new Promise (resolve, reject) ->

    reactPath = path.dirname(require.resolve("react"))
    reactRouterPath = path.dirname(require.resolve("react-router"))

    reactDistPath = path.resolve(reactPath, "./dist/")
    reactRouterDistPath = path.resolve(reactRouterPath, "../umd/")

    reactTargetPath = path.resolve tmpDir, "./react/"
    reactRouterTargetPath = path.resolve tmpDir, "./react-router/"

    logger.log "starting copy", reactDistPath, reactTargetPath

    return fs.copy reactDistPath, reactTargetPath, (err) ->
      if err?
        return reject(err)

      logger.log "starting copy 2", reactRouterDistPath, reactRouterTargetPath
      return fs.copy reactRouterDistPath, reactRouterTargetPath, (err) ->
        if err?
          return reject(err)
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
        return copyReactToTemp(tmpDir).then () ->
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
            appModules = resolveModules(m, site._services, appModules)
          return renderer.createApplication(site, appName, app).then (newApp) ->
            {routes, routeFunc} = newApp
            for r, obj of routes
              logger.log "processing route #{r}", app
              expressArgs = ["/#{r}"]
              routeModules = appModules.concat([])
              if obj.modules?
                for m in obj.modules
                  logger.log "mods", m
                  routeModules = resolveModules(m, site._services, routeModules)

              logger.log "route modules", routeModules
              for moduleName in routeModules
                if site._services.modules[moduleName]?
                  expressArgs.push site._services.modules[moduleName]
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
    return p(o).then (res) ->
      return Promise.all(res).then (results) ->
        logger.log "results", results
        services = {}
        if results instanceof Array
          for r in results
            services = merge r, services
        else
          servicea = results

        if services.routes?
          for apiName, apiObject of services.routes
            for apiPath, apiModules of apiObject

              mods = []

              if services.global?
                mods = services.global.concat apiModules
              else
                mods = apiModules.concat []
              for m in mods
                mods = resolveModules(m, services, mods)


              apiModNames = []
              if services.global?
                for m in services.global
                  apiModNames = resolveModules(m, services, apiModNames)
              for m in apiModules
                apiModNames = resolveModules(m, services, apiModNames)

              apiMods = [apiPath]
              for am in apiModNames
                if services.modules[am]?
                  apiMods.push services.modules[am]

              logger.log "creating api route #{apiName} - #{apiPath}", apiMods.length

              o.expressApp[apiName].apply o.expressApp, apiMods

        o.site._services = services
        return resolve o



module.exports = (site) ->

  site.cwd = process.cwd()
  logger.info "site file loaded", site.cwd

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
