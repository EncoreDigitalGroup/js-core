/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import type {CoreConfig} from "../ConfigTypes";

/**
 * The `laravel` built-in preset. A preset carries only the values that differ from the tsfmt
 * defaults; for Laravel projects that is the quote style. Values equal to a tsfmt default are
 * never restated here.
 */
export const laravelPreset: Partial<CoreConfig> = {
    codeStyle: {
        quoteStyle: "single",
    },
    paths: {
        exclude: [
            "public",
            "resources/js/actions",
            "resources/js/routes",
            "resources/js/wayfinder"
        ]
    }
};