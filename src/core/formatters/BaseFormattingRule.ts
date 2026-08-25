/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig} from "../config";
import {Container} from "../di";
import {FormatContext} from "./FormatContext";
import {IFormattingRule} from "./IFormattingRule";

/**
 * Base class for all formatting rules that provides container access
 * Eliminates the need for each rule to implement the container constructor boilerplate
 */
export abstract class BaseFormattingRule implements IFormattingRule {
    abstract readonly name: string;

    protected readonly config: CoreConfig;

    constructor(protected readonly container: Container, config?: CoreConfig) {
        // Use provided config or resolve from container
        if (config) {
            this.config = config;
        } else {
            // Simple resolution by name
            this.config = this.container.resolve<CoreConfig>("CoreConfig");
        }
    }

    /**
     * Apply the formatting rule to the shared, parse-once model in place.
     * Every rule implements this natively and mutates the shared model directly with no re-parse.
     */
    abstract applyToContext(context: FormatContext): void;

    /** Helper method to get the core configuration */
    protected getConfig(): CoreConfig {
        return this.config;
    }

    /** Helper method to get code style configuration */
    protected getCodeStyleConfig() {
        return this.getConfig().codeStyle;
    }

    /** Helper method to get imports configuration */
    protected getImportsConfig() {
        return this.getConfig().imports;
    }

    /** Helper method to get index generation configuration */
    protected getIndexGenerationConfig() {
        return this.getConfig().indexGeneration;
    }

    /** Helper method to get sorting configuration */
    protected getSortingConfig() {
        return this.getConfig().sorting;
    }

    /** Helper method to get spacing configuration */
    protected getSpacingConfig() {
        return this.getConfig().spacing;
    }
}