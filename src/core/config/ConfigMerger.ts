/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import {ConfigDefaults} from "./ConfigDefaults";
import {CoreConfig} from "./ConfigTypes";


/** Merges user configuration with default configuration */
export class ConfigMerger {
    /**
     * Deep merge two configuration objects
     * @param target - Target configuration (defaults)
     * @param source - Source configuration (user overrides)
     * @returns Merged configuration
     */
    private static deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
        const result = {...target};

        for (const key in source) {
            if (source[key] !== undefined) {
                if (typeof source[key] === "object" &&

                    source[key] !== null &&
                    !Array.isArray(source[key]) &&
                    typeof result[key] === "object" &&
                    result[key] !== null &&
                    !Array.isArray(result[key])) {
                    result[key] = this.deepMerge(result[key] as any, source[key] as any);
                } else {
                    result[key] = source[key] as T[Extract<keyof T, string>];
                }
            }
        }

        return result;
    }

    /**
     * Merge user config with default config
     * @param userConfig - Partial user configuration
     * @returns Complete merged configuration
     */
    static merge(userConfig: Partial<CoreConfig>): CoreConfig {
        return this.deepMerge(ConfigDefaults.getDefaultConfig(), userConfig);
    }

    /**
     * Merge multiple partial configs together
     * @param configs - Array of partial configurations to merge
     * @returns Merged configuration
     */
    static mergeMultiple(...configs: Partial<CoreConfig>[]): CoreConfig {
        let result = ConfigDefaults.getDefaultConfig();

        for (const config of configs) {
            result = this.deepMerge(result, config);
        }

        return result;
    }
}
