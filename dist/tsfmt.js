"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./core/config/ConfigDefaults.js");
require("./core/config/ConfigLoader.js");
const ConfigMerger = require("./core/config/ConfigMerger.js");
function tsfmt(config = {}) {
  return ConfigMerger.ConfigMerger.merge(config);
}
exports.tsfmt = tsfmt;
