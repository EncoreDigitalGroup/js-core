/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {sortExportsKeys} from "../package";

describe("sortExportsKeys", () => {
    it("orders types/import/require first inside a conditions object", () => {
        const result = sortExportsKeys({
            ".": {require: "./i.cjs", import: "./i.js", types: "./i.d.ts", custom: "./i.custom"},
        });

        expect(Object.keys(result["."])).toEqual(["types", "import", "require", "custom"]);
    });

    it("passes a string target through untouched", () => {
        const result = sortExportsKeys({"./x": "./resources/x.ts"});

        expect(result["./x"]).toBe("./resources/x.ts");
    });

    it("preserves a fallback array target as an array, not an object", () => {
        const target = ["./resources/ts/*.ts", "./resources/ts/*.tsx", "./resources/ts/*"];
        const result = sortExportsKeys({"./*": target});

        expect(Array.isArray(result["./*"])).toBe(true);
        expect(result["./*"]).toEqual(target);
    });
});
