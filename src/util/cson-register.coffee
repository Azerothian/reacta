fs = require "fs"
CSON = require "cson"

#logger = require("./logger")("nodes:util:cson-register");
if require.extensions
  require.extensions[".cson"] = (module, filename) ->
    fileData = fs.readFileSync filename
    csonObject = CSON.parseSync("#{fileData}")
    jsonStr = JSON.stringify csonObject
    answer = "module.exports = #{jsonStr};" 
    module._compile answer, filename
# can i not stringify an object i have just parsed Oo cbf require.extensions 
# is apparently deprecated... but is not going away for a lonnnng time *crosses fingers