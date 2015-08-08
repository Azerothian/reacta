# Reacta

A middleware component for express for rendering react components

## Example


Files:
- public/
- views/main.ect
```
<html>
  <head>
    <title>Reacta Test</title>
    <%- @header %>
  </head>
  <body>
    <%- @content %>
    <%- @scripts %>
  </body>
</html>
```

- components/home.cjsx
```
React = require "react"
module.exports = React.createClass {
  render: () ->
    <div>{"Home"}</div>
}
```

- index.coffee
```
express = require 'express'
reacta = require "reacta"
app = express()

ECT = require('ect')
ectRenderer = ECT({ watch: true, root: __dirname + '/views', ext : '.ect' })
app.set('view engine', 'ect')
app.engine('ect', ectRenderer.render)



rc = reacta {
  static: "/libs"
  env: "development"
  components: "components"
  webpack:
    resolve:
      extensions: ['', '.js', '.cjsx', '.coffee']
    module:
      loaders: [
        { test: /\.cjsx$/, loaders: ['coffee', 'cjsx'] },
        { test: /\.coffee$/, loader: 'coffee' }
      ]
}

app.use express.static(__dirname + '/public')
rc.static(express, app);

app.get '/', rc.create "home", {
  view: "main"
  props: {}
  templateProps: {}
  dependencies: ["./next"]
}



rc.compile().then () ->
  console.log "listening on 3030"
  app.listen(3030)

```

## Changelog
0.0.11
- Re-written to just be a piece of middleware for express using webpack.
- React Router has been moved and will be reimplemented in separate package reacta-router
- same with the express api deps tree code
0.0.11 <
- removed as has no reference any more
