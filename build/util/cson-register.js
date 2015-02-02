(function() {
  var CSON, fs;

  fs = require("fs");

  CSON = require("cson");

  if (require.extensions) {
    require.extensions[".cson"] = function(module, filename) {
      var answer, csonObject, fileData, jsonStr;
      fileData = fs.readFileSync(filename);
      csonObject = CSON.parseSync("" + fileData);
      jsonStr = JSON.stringify(csonObject);
      answer = "module.exports = " + jsonStr + ";";
      return module._compile(answer, filename);
    };
  }

}).call(this);
