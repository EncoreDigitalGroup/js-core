/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig, ConfigTypes } from "./ConfigTypes";


/** Validation result containing errors and warnings */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/** Validates CoreConfig configuration objects */
export class ConfigValidator {
    /**
    * Validate a CoreConfig object
    * @param config - Configuration to validate
    * @returns Validation result with errors and warnings
    */
    static validate(config: CoreConfig): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        // Validate code style config
        if (config.codeStyle) {
            if (config.codeStyle.enabled && config.codeStyle.quoteStyle) {
                if (!ConfigTypes.isValidQuoteStyle(config.codeStyle.quoteStyle)) {
                    errors.push(`Invalid quoteStyle: ${config.codeStyle.quoteStyle}. Must be ${ConfigTypes.getQuoteStyleOptions().map(s => `'${s}'`).join(" or ")}.`);
                }
            }

            if (config.codeStyle.enabled && config.codeStyle.semicolons) {
                if (!ConfigTypes.isValidSemicolonOption(config.codeStyle.semicolons)) {
                    errors.push(`Invalid semicolons: ${config.codeStyle.semicolons}. Must be ${ConfigTypes.getSemicolonOptions().map(s => `'${s}'`).join(" or ")}.`);
                }
            }

            if (config.codeStyle.indentWidth !== undefined) {
                if (!ConfigTypes.isValidIndentWidth(config.codeStyle.indentWidth)) {
                    errors.push(`Invalid indentWidth: ${config.codeStyle.indentWidth}. Must be between 1 and 8.`);
                }
            }

            if (config.codeStyle.lineWidth !== undefined) {
                if (config.codeStyle.lineWidth < 40 || config.codeStyle.lineWidth > 200) {
                    if (!ConfigTypes.isRecommendedLineWidth(config.codeStyle.lineWidth)) {
                        warnings.push(`Unusual lineWidth: ${config.codeStyle.lineWidth}. Recommended range is 80-120.`);
                    }
                }
            }
        }
        // Validate import config
        if (config.imports) {
            if (config.imports.groupOrder && config.imports.groupOrder.length > 0) {
                const validGroups = ConfigTypes.getImportGroupOptions();
                const invalidGroups = config.imports.groupOrder.filter(g => !validGroups.includes(g));

                if (invalidGroups.length > 0) {
                    errors.push(`Invalid group in groupOrder: ${invalidGroups.join(", ")}. Valid groups: ${validGroups.join(", ")}`);
                }
            }
        }
        // Validate sorting config

        if (config.sorting) {
            if (config.sorting.include && config.sorting.include.length === 0) {
                warnings.push("Sorting include patterns is empty - no files will be sorted.");
            }
        }
        // Validate spacing config (no specific validations needed currently)

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
    * Validate and throw if invalid
    * @param config - Configuration to validate
    * @throws Error if configuration is invalid
    */
    static validateOrThrow(config: CoreConfig): void {
        const result = this.validate(config);

        if (!result.valid) {
            throw new Error(`Invalid configuration:\n${result.errors.join("\n")}`);
        }
        // Log warnings if present

        if (result.warnings.length > 0) {
            console.warn("Configuration warnings:");
            result.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }
    }
}

