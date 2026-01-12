/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { SpacingConfig } from "../../../config/types";
import { BaseFormatter } from "../base/BaseFormatter";
import { ISpacingRule } from "./ISpacingRule";
import { BeforeReturnsRule } from "./rules/BeforeReturnsRule";
import { BetweenDeclarationsRule } from "./rules/BetweenDeclarationsRule";
import { BetweenStatementTypesRule } from "./rules/BetweenStatementTypesRule";


/**
* Formats blank line spacing using composable rules
* Rules are applied in sequence
*/

export class BlankLineFormatter extends BaseFormatter {
    readonly name = "BlankLineFormatter";
    private rules: ISpacingRule[] = [];

    constructor(private readonly config: SpacingConfig) {
        super();
        this.initializeRules();
    }

    async format(source: string, filePath: string): Promise<string> {
        if (!this.config.enabled) {
            return source;
        }

        let formatted = source;
        // Apply all spacing rules in sequence

        for (const rule of this.rules) {
            formatted = rule.apply(formatted);
        }
        this.logFormat(filePath, formatted !== source);

        return formatted;
    }

    protected getSupportedExtensions(): string[] {
        return [".ts", ".tsx", ".js", ".jsx"];
    }

    /**
    * Initialize spacing rules based on configuration
    */
    private initializeRules(): void {
        // Add rules in order of execution
        // 1. Between declarations (same keyword = no blank line, different keyword = blank line)

        if (this.config.betweenDeclarations) {
            this.rules.push(new BetweenDeclarationsRule(this.config));
        }
        // 2. Between statement types (declaration vs control flow vs loops, etc.)

        if (this.config.betweenStatementTypes) {
            this.rules.push(new BetweenStatementTypesRule(this.config));
        }
        // 3. Before return statements

        if (this.config.beforeReturns) {
            this.rules.push(new BeforeReturnsRule(this.config));
        }
    }
}
