debug = require "debug"

module.exports = (prefix="", suffix=":") ->
  return {
    log: debug "#{prefix}log#{suffix}"
    debug:  debug "#{prefix}debug#{suffix}"
    info:  debug "#{prefix}info#{suffix}"
    error:  debug "#{prefix}error#{suffix}"
  }