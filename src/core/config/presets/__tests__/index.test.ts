/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {PRESETS, resolvePreset} from "../index";
import {laravelPreset} from "../laravel";

describe("preset registry", () => {
    describe("PRESETS", () => {
        it("should contain the laravel preset", () => {
            expect(PRESETS).toHaveProperty("laravel");
            expect(PRESETS.laravel).toBe(laravelPreset);
        });
    });

    describe("resolvePreset", () => {
        it("should return the laravel preset for a known name", () => {
            expect(resolvePreset("laravel")).toBe(laravelPreset);
        });

        it("should throw for an unknown name, listing the valid presets", () => {
            expect(() => resolvePreset("laravl")).toThrow('Unknown preset "laravl". Valid presets: "laravel".');
        });
    });
});