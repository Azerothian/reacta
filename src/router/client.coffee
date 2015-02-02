
logger = require("../util/logger")("nodes:router:client:")
path = require "path"
React = require "react"

Router = require("react-router")

Promise = require "bluebird"

{div} = React.DOM
{Route, DefaultRoute, RouteHandler} = Router

module.exports = (site) ->

  createRouteComponentClass = (components) -> 
    return new Promise (resolve, reject) ->
      resolve React.createClass {
        render: ->
          logger.log "component handler render", components
          if components.length == 1
            return React.createElement components[0]
          else
            return React.createElement "div", {}, components.map (c) ->
              return React.createElement c
      }

  
  createReactRoute = (components, isDefaultRoute, routeName, routeObject) ->
    return new Promise (resolve, reject) ->
      createRouteComponentClass(components).then (handler) ->
        if isDefaultRoute
          logger.log "returning default route"
          return resolve { type: DefaultRoute, props: { handler: handler,  key: routeName, name: routeName  } }
        else
          logger.log "returning a route", components, isDefaultRoute, routeName, routeObject
          return resolve  { type: Route, props: { key: routeName, name: routeName, path: routeObject.path,  handler: handler } }
    
  
  createRouteHandler = (app, routeName, routeObject) ->
    return new Promise (resolve, reject) ->
      logger.debug "init create route handler #{routeName}",  site.components
      components = []
      for componentPath in routeObject.components
        logger.debug "loading component at #{componentPath}"
        components.push site.components[componentPath]
      return createReactRoute(components, app.baseRoute == routeName, routeName, routeObject)
        .then resolve, reject
  
  return (appName, app) ->
    return new Promise (resolve, reject) ->
      mainApp = React.createClass {
        render: ->
          React.createElement(RouteHandler)
      }
      promises = []
      for routeName, routeObject of app.routes
        promises.push createRouteHandler(app, routeName, routeObject)
      Promise.all(promises).then (results) ->
        
        mainRouteProps = { 
          name: appName, 
          path: app.path, 
          handler: mainApp, 
          key: appName 
          
        }
        logger.log "main props", mainRouteProps
        r = React.createElement Route, mainRouteProps, results.map (r) ->
          return React.createElement r.type, r.props
        resolve r

          
          
            
          
  