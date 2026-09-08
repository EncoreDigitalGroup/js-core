/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {ConfigTypes, CoreConfig, ImportRestrictionRule, PathsConfig} from "./ConfigTypes";

/** Validation result containing errors and warnings */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/** Validates CoreConfig configuration objects */
export class ConfigValidator {
    /**
     * Validate one `paths` sub-array: when present, it must be an array whose every element is a non-empty string.
     * Pushes an error onto `errors` when the field is present but malformed; a missing field is valid.
     */
    private static validatePathsArray(paths: PathsConfig, key: "include" | "exclude", errors: string[]): void {
        const value = paths[key];
        if (value === undefined) {
            return;
        }

        const ok = Array.isArray(value) && value.every(p => typeof p === "string" && p.length > 0);
        if (!ok) {
            errors.push(`Invalid paths.${key}: must be an array of non-empty strings.`);
        }
    }

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

        // Validate paths config
        if (config.paths) {
            this.validatePathsArray(config.paths, "include", errors);
            this.validatePathsArray(config.paths, "exclude", errors);
        }

        if (config.parallel?.workers !== undefined && (!Number.isInteger(config.parallel.workers) || config.parallel.workers < 1)) {
            errors.push("Invalid parallel.workers: must be a positive integer.");
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

    /**
     * Validate the restrictions.imports block. Returns error strings (empty => valid).
     * Invoked directly by the CLI gate, NOT by validate(): restriction errors must hard-fail
     * the gate (process.exit(1)) rather than be swallowed into a defaults-fallback by loadConfig.
     */
    static validateRestrictions(imports: ImportRestrictionRule[]): string[] {
        const errors: string[] = [];

        imports.forEach((rule, i) => {
            if (!Array.isArray(rule.files) || rule.files.length === 0) {
                errors.push(`Invalid restrictions.imports[${i}]: 'files' must be a non-empty array.`);
            }

            const hasForbid = Array.isArray(rule.forbid) && rule.forbid.length > 0;
            const hasAllow = Array.isArray(rule.allow) && rule.allow.length > 0;
            if (!hasForbid && !hasAllow) {
                errors.push(`Invalid restrictions.imports[${i}]: must have at least one of 'forbid' or 'allow'.`);
            }

            if (rule.allow !== undefined) {
                const allowOk = Array.isArray(rule.allow) && rule.allow.length > 0 && rule.allow.every(p => typeof p === "string" && p.length > 0);
                if (!allowOk) {
                    errors.push(`Invalid restrictions.imports[${i}]: 'allow' must be a non-empty array of strings.`);
                }
            }

            (rule.forbid ?? []).forEach((entry, j) => {
                const patternOk = typeof entry.pattern === "string"
                    ? entry.pattern.length > 0
                    : Array.isArray(entry.pattern) && entry.pattern.length > 0;

                if (!patternOk) {
                    errors.push(`Invalid restrictions.imports[${i}].forbid[${j}]: 'pattern' must be a non-empty string or array.`);
                }

                if (typeof entry.message !== "string" || entry.message.length === 0) {
                    errors.push(`Invalid restrictions.imports[${i}].forbid[${j}]: 'message' must be a non-empty string.`);
                }
            });
        });

        return errors;
    }
}