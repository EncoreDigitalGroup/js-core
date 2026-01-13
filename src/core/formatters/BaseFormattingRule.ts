/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../config";
import { Container } from "../di";
import { IFormattingRule } from "./IFormattingRule";


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
            this.config = this.container.resolve<CoreConfig>();
        }
    }

    /** Helper method to get the core configuration */
    protected getConfig(): CoreConfig {
        return this.config;
    }

    /** Helper method to get code style configuration */
    protected getCodeStyleConfig() {
        return this.getConfig().codeStyle;
    }

    /** Helper method to get spacing configuration */
    protected getSpacingConfig() {
        return this.getConfig().spacing;
    }

    /** Helper method to get imports configuration */
    protected getImportsConfig() {
        return this.getConfig().imports;
    }

    /** Helper method to get sorting configuration */
    protected getSortingConfig() {
        return this.getConfig().sorting;
    }

    /** Helper method to get index generation configuration */
    protected getIndexGenerationConfig() {
        return this.getConfig().indexGeneration;
    }

    /** Apply the formatting rule to the source code */
    abstract apply(source: string, filePath?: string): string;
}