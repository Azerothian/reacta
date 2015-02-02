path = require "path"
client = require "./client"
React = require "react"
Router = require "react-router"

logger = require("../util/logger")("nodes:router:server:")
Promise = require "bluebird"

module.exports = (site) ->
  
  clientSite = client(site)
  
  
  getLayout = (name) ->
    return new Promise (resolve, reject) ->
      resolve site.components[site.layouts[name]]
  
  createLayout = (appName, app) ->
    return new Promise (resolve, reject) ->
      getLayout(app.layout).then (layout) ->
        resolve React.createClass {
          render: ->
            React.createElement layout, {}, [
              React.createElement("div", {id: "react-component"}, "REPLACEME"),
              React.createElement("script", {src: "/#{appName}-bundle.js", key: 'bundleScript'}),
              React.createElement("script", {src: "/#{appName}-start.js", key: 'startScript'})
            ]
        }
  createExpressRoute = (appName, app) ->
    return (req, res, next) ->
      createLayout(appName, app).then (element) ->
        layoutMarkup = React.renderToStaticMarkup React.createElement(element)
        
        clientSite(appName, app).then (element) ->
          logger.log "url2", req.baseUrl
          Router.run element, req.baseUrl, (Handler) ->
            logger.log "renderToString", req.url
            #inner_markup = #"<div class='react-component'></div>"
            inner_markup = React.renderToString React.createElement(Handler)
            markup = layoutMarkup.replace "REPLACEME", inner_markup
            res.send markup
            return

      
  return  {
    createApplication: (appName, app) ->
      gapp = {
        routeFunc: createExpressRoute(appName, app)
        routes: []
      }
      for routeName, routeObject of app.routes
        routePath = "#{app.path}"
        routePath += routeObject.path if routeObject.path?
        logger.info "creating route '#{routePath}'"
        gapp.routes.push routePath

      return gapp
  }