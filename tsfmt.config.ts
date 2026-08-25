/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {tsfmt} from "./src";

export default tsfmt({
    imports: {
        enabled: true
    },
    paths: {
        exclude: [
            "scripts/tsfmt-bin.js"
        ]
    }
});