/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { ConfigMerger, CoreConfig } from "./core/config";


/**
* Config helper for use in tsfmt.config.ts.
* Merges the provided config with defaults and provides full type safety.
*
* @example
* ```ts
* // tsfmt.config.ts
* import { tsfmt } from "tsfmt";
*
* export default tsfmt({
*     codeStyle: { quoteStyle: "single" },
*     spacing: { enabled: true },
* });
* ```
*/
export function tsfmt(config: Partial<CoreConfig> = {}): CoreConfig {
    return ConfigMerger.merge(config);
}