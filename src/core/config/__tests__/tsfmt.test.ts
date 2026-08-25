/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {tsfmt} from "../tsfmt";

describe("tsfmt helper", () => {
    it("should apply a preset's values", () => {
        const config = tsfmt({preset: "laravel"});
        expect(config.codeStyle?.quoteStyle).toBe("single");
        expect(config.codeStyle?.enabled).toBe(true); // From defaults
    });

    it("should honor user overrides over the preset", () => {
        const config = tsfmt({preset: "laravel", codeStyle: {quoteStyle: "double"}});
        expect(config.codeStyle?.quoteStyle).toBe("double");
    });
});