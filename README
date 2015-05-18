# Reacta

A platform using node.js for rendering and serving react components using express, reactjs and react-router

## Example


Files:
- public/
- layouts/main.ect
```
<html>
  <head>
    <title>Reacta Test</title>
    <%- @header %>
  </head>
  <body>
    <% content %>
    <%- @scripts %>
  </body>
</html>
```

- react/home.cjsx
```
React = require "react"
module.exports = React.createClass {
  render: () ->
    <div>{"Home"}</div>
}
```

- index.coffee
```
log = require("debug")("react-test:")

ReactaServiceExpress = require("reacta-service-express")({
  session:
    secret: "2#1"
  })


reacta = require("reacta")({
  env: "development"
  threads: 1
  minify: false
  express:
    port: process.env.PORT || 6655
  name: 'site'
  'static': './public'
  layouts:
    'main': './layouts/main'
  browserify:
    extensions: [".js", ".coffee", ".json", ".cjsx", ".cson"]
    globalshim: {}

  api: [
    ReactaServiceExpress,
    {
      deps:
        '/hit': ['/deps']
      routes:
        get:
          '/api/hit': ['/hit']
        post:
          '/api/hit': ['/hit']

      modules:
        "/hit": (req, res, next) ->
          console.log "test"
          res.send "Hello"
        "/deps": (req, res, next) ->
          console.log "depstest"
          next()
    }
  ]

  apps:
    'index':
      disableServerRenderer: true
      path: '/'
      layout: 'main'
      modules: []
      baseRoute: 'home'
      routes:
        'home':
          components: ['./react/home']
        'test':
          modules: ['/deps']
          path: 'test'
          components: ['./react/home']
})
```

## Changelog
0.0.8
- modules now has deps option in service definitions for resolution of dependencies
- updated readme with example
- added changelog to readme ^^
- added react and react router to the temp directory and added them to globalshim, this is so you don't need install react or react-router in your project
- fixed bug where if path didn't match route name it would not load the modules
