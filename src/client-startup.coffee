site = require "nodes/config"
routerFactory = require "nodes/client/router"
React = require "react"
Router = require "react-router"
debug = require "debug"
path = require "path"
debug.enable "*"

module.exports = () ->
  site.components = {}
  
  for key,value of site.layouts
    if !site.components[value]
      site.components[value] = require "/#{path.join(site.cwd, value)}"
  
  for key, value of site.app.routes
    for r in value.components
      if !site.components[r]
        site.components[r] = require "/#{path.join(site.cwd, r)}"
  
  router = routerFactory(site)
  router(site.app.name, site.app).then (element) ->
    Router.run element, Router.HistoryLocation, (Handler) ->
      React.render React.createElement(Handler), document.getElementById('react-component')