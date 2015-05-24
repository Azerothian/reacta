path = require "path"
client = require "./client"
React = require "react"
Router = require "react-router"
ect = require "ect"
logger = require("../util/logger")("reacta:router:server:")
Promise = require "native-or-bluebird"
fs = require "fs"
module.exports = (site) ->

  clientSite = client(site)

  loadLayout = (appName, app) ->
    return new Promise (resolve, reject) ->
      layoutPath = site.layouts[app.layout]
      logger.log "loadLayout #{layoutPath}"
      fullLayoutPath = path.join(site.cwd, layoutPath)

      logger.log "loadLayout #{layoutPath} - #{fullLayoutPath}"
      fs.readFile "#{fullLayoutPath}.ect", 'utf8', (err,data) ->
        if err?
          return reject(err)
        resolve(data)

  createRenderer = (site, appName, app) ->
    return new Promise (resolve, reject) ->
      return loadLayout(appName, app).then (layoutMarkup) ->
        markup = "<% extend \"layout\" %>"
        markup += "<script src='/rr-bundle.js'></script>"
        markup += "<div id='react-component'><%- @reactContent %></div>\r\n"
        markup += "<script src='/#{appName}-bundle.js'></script>\r\n"
        markup += "<script src='/#{appName}-start.js'></script>\r\n"
        resolve ect({
          root:
            layout: layoutMarkup
            page: markup
        })

  createExpressRoute = (appName, app, renderer) ->
    return (req, res, next) ->
      return clientSite(appName, app).then (element) ->
        logger.log "url2", req.url
        Router.run element,  req.url, (Handler) ->
          logger.log "renderToString", req.url
          if app.disableServerRenderer
            inner_markup = ""
          else
            inner_markup = React.renderToString React.createElement(Handler)
          markup = renderer.render "page", {
            reactContent: inner_markup
            header: ""
            scripts: ""
          }
          res.send markup
          return


  return  {
    createApplication: (site, appName, app) ->
      return new Promise (resolve, reject) ->
        return createRenderer(site, appName, app).then (renderer) ->
          gapp = {
            routeFunc: createExpressRoute(appName, app, renderer)
            routes: {}
          }
          for routeName, routeObject of app.routes
            routePath = "#{app.path}"
            routePath = routeObject.path if routeObject.path?
            logger.info "creating route '#{routePath}'"
            gapp.routes[routePath] = routeObject

          return resolve gapp
  }
