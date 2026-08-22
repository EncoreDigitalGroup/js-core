/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

/**
 * Interface for all formatting rules
 * Each rule applies a specific code style transformation
 */
import {FormatContext} from "./FormatContext";

export interface IFormattingRule {
    /** Name of the rule for logging and debugging */
    readonly name: string;

    /**
     * Apply the formatting rule to the shared, parse-once model in place.
     * This is the native entry point every rule is migrated to.
     * @param context - The shared FormatContext for the file being formatted
     */
    applyToContext(context: FormatContext): void;
}