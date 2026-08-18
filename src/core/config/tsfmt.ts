/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {ConfigMerger} from "./ConfigMerger";
import {CoreConfig} from "./ConfigTypes";

export function tsfmt(config: Partial<CoreConfig> = {}): CoreConfig {
    return ConfigMerger.merge(config);
}
