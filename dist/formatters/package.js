"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
function sortExportsKeys(exports$1) {
  if (!exports$1 || typeof exports$1 !== "object") {
    return exports$1;
  }
  const sortedExports = {};
  const exportKeyOrder = ["types", "import", "require"];
  for (const [key, value] of Object.entries(exports$1)) {
    if (typeof value === "object" && value !== null) {
      const sortedSubObject = {};
      exportKeyOrder.forEach((subKey) => {
        if (subKey in value) {
          sortedSubObject[subKey] = value[subKey];
        }
      });
      for (const subKey of Object.keys(value)) {
        if (!exportKeyOrder.includes(subKey)) {
          sortedSubObject[subKey] = value[subKey];
        }
      }
      sortedExports[key] = sortedSubObject;
    } else {
      sortedExports[key] = value;
    }
  }
  return sortedExports;
}
exports.sortExportsKeys = sortExportsKeys;
