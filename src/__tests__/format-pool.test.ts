/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {ConfigDefaults, DEFAULT_PARALLEL_WORKERS} from "../core";
import {getParallelWorkerCount, MINIMUM_PARALLEL_FILES} from "../format-pool";

describe("format pool", () => {
    it("uses the configured worker limit", () => {
        const files = ["a.ts", "b.ts", "c.ts", "d.ts"];
        const config = ConfigDefaults.getDefaultConfig();

        expect(DEFAULT_PARALLEL_WORKERS).toBe(3);
        expect(getParallelWorkerCount(files, config)).toBe(3);
        expect(getParallelWorkerCount(files, {...config, parallel: {workers: 2}})).toBe(2);
    });

    it("keeps small batches serial", () => {
        expect(MINIMUM_PARALLEL_FILES).toBe(4);
    });
});