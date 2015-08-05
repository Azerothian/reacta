Promise = require "native-or-bluebird"
temp = require "temp"
React = require "react"
webpack = require "webpack"
path = require("path").posix
fs = require 'fs-extra'
glob = require "glob"
_ = require "lodash"

CommonsChunkPlugin = require "webpack/lib/optimize/CommonsChunkPlugin"

temp.track()

class ReactaRenderer
  constructor: (@name, @options, @reacta) ->
    @fileName = @name.replace /\//g, '-'
    @sourceFile = "../#{@reacta.options.components}/#{@name}"
    if !@options.dependencies?
      @options.dependencies = []
    @options.dependencies.push "react"
    @options.dependencies.push @sourceFile


  createStartupFile: () ->
    return new Promise (resolve, reject) =>
      deps = []
      for d in @options.dependencies
        if d.indexOf(".") > -1
          deps.push "../" + path.resolve "../#{@reacta.options.components}", d
        else
          deps.push d

      script = ""
      jsonDeps = JSON.stringify deps
      jsonProps = JSON.stringify @options.props
      script += "require.ensure(#{jsonDeps}, function(err){ \r\n"
      script += "if(err){ console.log('require.ensure error')}\r\n"
      script += "var React = require('react');\r\n"
      script += "var component = require('#{@sourceFile}')\r\n"
      script += "React.render(React.createElement(component, #{jsonProps}), document.getElementById('react-component'));\r\n"
      script += "});\r\n"

      return fs.writeFile path.join(@reacta.startPath, @fileName) + "-startup.js", script, resolve

  use: () ->
    return (req, res, next) =>
      options = {
        header: ""
        content: "<div id='react-component'></div>"
        scripts: ""
      }
      options.scripts += "<script src='#{@reacta.options.static}/commons.js'></script>"
      options.scripts += "<script src='#{@reacta.options.static}/#{@fileName}-startup.bundle.js'></script>"
      if @options.template?
        options = _.merge(options, @options.templateProps)
      res.render "#{@options.view}", options



class Reacta
  constructor: (@options) ->
    @cwd = @options.cwd || process.cwd()
    @tempPath = "./temp/"#temp.mkdirSync "reacta"
    @startPath = "./temp/"
    @renderers = {}

  static: (express, app) ->
    app.use @options.static, express.static(@tempPath)

  create: (componentName, options) ->
    if !@renderers[componentName]?
      renderer = new ReactaRenderer(componentName, options, @)
      @renderers[componentName] = renderer
    else
      renderer = @renderers[componentName]
    return renderer.use()



  compile: () ->
    return new Promise (resolve, reject) =>

      entries = {}
      promises = []
      for k,v of @renderers
        promises.push v.createStartupFile()
        entries["#{v.fileName}-startup"] = "./" + path.join @startPath, "#{v.fileName}-startup"
      Promise.all(promises).then () =>
        webpackOptions = _.merge {
          context: @cwd
          entry: entries
          output:
            publicPath: @options.static + "/"
            path: @tempPath
            filename: "[name].bundle.js"
            chunkFilename: "[id].chunk.js"
          plugins:
            [
              new CommonsChunkPlugin({
                name: "commons",
                minChunks: Infinity
              })
              new webpack.optimize.DedupePlugin()
            ]
        }, (@options.webpack || {})
        @compiler = webpack webpackOptions
        @compiler.run (err, stats) =>
          if err?
            console.log "err", err
            return reject(err)

          console.log stats.toString({
            colors: true
            hash: true
            version: true
            timings: true
            assets: true
            chunks: false
            chunkModules: false
            modules: false
            cached: false
            reasons: false
            source: false
            errorDetails: true
            chunkOrigins: false
          })
          return resolve(stats)



module.exports = (options) ->
  return new Reacta options
