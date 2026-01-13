/**
* Custom Vite plugin to transform generic addRule calls to explicit string-based calls
* This enables the clean developer experience of `this.addRule<RuleName>(order)`
* while ensuring it works in compiled JavaScript where generics are stripped
*
* Auto-discovers rule mappings by parsing the FormatterPipeline source code
*/

import { readFileSync } from "fs";
import { resolve } from "path";


export function transformGenericsPlugin() {
    // Move the discovery function outside the plugin object
    function discoverRuleMappings() {
        try {
            // Read the FormatterPipeline source file (try different paths)
            let sourceCode: string;
            const possiblePaths = [
                resolve(__dirname, "../core/pipeline/FormatterPipeline.ts"),
                resolve(__dirname, "../../src/core/pipeline/FormatterPipeline.ts"),
                resolve(process.cwd(), "src/core/pipeline/FormatterPipeline.ts")
            ];

            for (const path of possiblePaths) {
                try {
                    sourceCode = readFileSync(path, "utf8");
                    break;
                } catch {
                }
            }

            if (!sourceCode!) {
                throw new Error("Could not find FormatterPipeline.ts");
            }

            // Extract the initializeRules method using brace counting
            const methodStart = sourceCode.match(/private\s+initializeRules\(\):\s*void\s*\{/);
            if (!methodStart || methodStart.index === undefined) {
                throw new Error("Could not find initializeRules method");
            }

            // Find the matching closing brace using brace counting
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

            // Parse addRule calls to build mapping
            const orderToRuleMap: { [key: string]: string[] } = {};
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
        generateBundle(options: any, bundle: any) {
            // Find the FormatterPipeline chunk specifically
            for (const fileName in bundle) {
                const chunk = bundle[fileName];
                if (chunk.type === "chunk" && fileName.includes("FormatterPipeline.js")) {
                    // Auto-discover rule mappings by parsing the source FormatterPipeline
                    const orderToRuleMap = discoverRuleMappings();

                    // Track indices for each order type
                    const orderIndices: { [key: string]: number } = {};

                    // Initialize indices for all order types
                    for (const orderType of Object.keys(orderToRuleMap)) {
                        orderIndices[orderType] = 0;
                    }

                    // Transform all addRule calls in the file
                    chunk.code = chunk.code.replace(/this\.addRule\s*\(\s*([^)]+)\s*\)/g, (match: any, orderParam: any) => {
                        const orderKey = orderParam.trim();

                        if (orderToRuleMap[orderKey as keyof typeof orderToRuleMap]) {
                            const rules = orderToRuleMap[orderKey as keyof typeof orderToRuleMap];
                            const currentIndex = orderIndices[orderKey] || 0;

                            if (currentIndex < rules.length) {
                                const ruleName = rules[currentIndex];
                                orderIndices[orderKey] = currentIndex + 1;
                                return `this.addRuleByName("${ruleName}", ${orderParam})`;
                            }
                        }

                        return match; // Fallback for unmapped orders
                    });
                }
            }
        }
};
}