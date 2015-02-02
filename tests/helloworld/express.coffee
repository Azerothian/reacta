
Promise = require "bluebird"

module.exports = () ->
  return new Promise (resolve, reject) ->

    resolve {
      "get-testmodule": () ->
        return (req, res, next) ->
          res.json {
            status: true
          }

      "post-testmodule": () ->
        return (req, res, next) ->
          res.json {
            status: true
          }
    }
