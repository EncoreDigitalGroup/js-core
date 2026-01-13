"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
function transformGenericsPlugin() {
  function discoverRuleMappings() {
    try {
      let sourceCode;
      const possiblePaths = [
        path.resolve(__dirname, "../core/pipeline/FormatterPipeline.ts"),
        path.resolve(__dirname, "../../src/core/pipeline/FormatterPipeline.ts"),
        path.resolve(process.cwd(), "src/core/pipeline/FormatterPipeline.ts")
      ];
      for (const path2 of possiblePaths) {
        try {
          sourceCode = fs.readFileSync(path2, "utf8");
          break;
        } catch {
        }
      }
      if (!sourceCode) {
        throw new Error("Could not find FormatterPipeline.ts");
      }
      const methodStart = sourceCode.match(/private\s+initializeRules\(\):\s*void\s*\{/);
      if (!methodStart || methodStart.index === void 0) {
        throw new Error("Could not find initializeRules method");
      }
      const startIndex = methodStart.index + methodStart[0].length;
      let braceCount = 1;
      let endIndex = startIndex;
      for (let i = startIndex; i < sourceCode.length && braceCount > 0; i++) {
        if (sourceCode[i] === "{") {
          braceCount++;
        } else if (sourceCode[i] === "}") {
          braceCount--;
        }
        endIndex = i;
      }
      const initRulesBody = sourceCode.substring(startIndex, endIndex);
      const orderToRuleMap = {};
      const addRuleRegex = /this\.addRule<([^>]+)>\(FormatterOrder\.([^)]+)\)/g;
      let match;
      while ((match = addRuleRegex.exec(initRulesBody)) !== null) {
        const ruleName = match[1].trim();
        const orderName = match[2].trim();
        const orderKey = `ConfigTypes.FormatterOrder.${orderName}`;
        if (!orderToRuleMap[orderKey]) {
          orderToRuleMap[orderKey] = [];
        }
        orderToRuleMap[orderKey].push(ruleName);
      }
      return orderToRuleMap;
    } catch (error) {
      throw new Error(`Failed to auto-discover rule mappings from FormatterPipeline.ts: ${error}`);
    }
  }
  return {
    name: "transform-generics",
    generateBundle(options, bundle) {
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === "chunk" && fileName.includes("FormatterPipeline.js")) {
          const orderToRuleMap = discoverRuleMappings();
          const orderIndices = {};
          for (const orderType of Object.keys(orderToRuleMap)) {
            orderIndices[orderType] = 0;
          }
          chunk.code = chunk.code.replace(/this\.addRule\s*\(\s*([^)]+)\s*\)/g, (match, orderParam) => {
            const orderKey = orderParam.trim();
            if (orderToRuleMap[orderKey]) {
              const rules = orderToRuleMap[orderKey];
              const currentIndex = orderIndices[orderKey] || 0;
              if (currentIndex < rules.length) {
                const ruleName = rules[currentIndex];
                orderIndices[orderKey] = currentIndex + 1;
                return `this.addRuleByName("${ruleName}", ${orderParam})`;
              }
            }
            return match;
          });
        }
      }
    }
  };
}
exports.transformGenericsPlugin = transformGenericsPlugin;
