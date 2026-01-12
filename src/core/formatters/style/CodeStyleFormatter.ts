/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CodeStyleConfig } from "../../../config/types";
import { BaseFormatter } from "../base/BaseFormatter";
import { IStyleRule } from "./IStyleRule";
import { BracketSpacingRule } from "./rules/BracketSpacingRule";
import { IndentationRule } from "./rules/IndentationRule";
import { QuoteStyleRule } from "./rules/QuoteStyleRule";
import { SemicolonRule } from "./rules/SemicolonRule";


/**
* Formats code style (quotes, semicolons, spacing, indentation)
*/

export class CodeStyleFormatter extends BaseFormatter {

    readonly name = "CodeStyleFormatter";
    private rules: IStyleRule[] = [];

    constructor(private readonly config: CodeStyleConfig) {
        super();
        this.initializeRules();
    }

    async format(source: string, filePath: string): Promise<string> {

        if (!this.config.enabled) {

            return source;
        }

        let formatted = source;
        // Apply all style rules in sequence

        for (const rule of this.rules) {

            formatted = rule.apply(formatted);
        }
        this.logFormat(filePath, formatted !== source);

        return formatted;
    }

    protected getSupportedExtensions(): string[] {

        return [".ts", ".tsx", ".js", ".jsx"];
    }

    private initializeRules(): void {
        // Add rules in order of execution

        if (this.config.quoteStyle) {

            this.rules.push(new QuoteStyleRule(this.config));
        }

        if (this.config.semicolons) {

            this.rules.push(new SemicolonRule(this.config));
        }

        if (this.config.bracketSpacing !== undefined) {

            this.rules.push(new BracketSpacingRule(this.config));
        }

        if (this.config.indentStyle && this.config.indentWidth) {

            this.rules.push(new IndentationRule(this.config));
        }
    }

    override validateConfig(config: any): boolean {

        if (!config || typeof config !== "object") {

            return false;
        }

        const codeStyleConfig = config as CodeStyleConfig;

        if (codeStyleConfig.quoteStyle && !["single", "double"].includes(codeStyleConfig.quoteStyle)) {

            return false;
        }

        if (codeStyleConfig.semicolons && !["always", "never"].includes(codeStyleConfig.semicolons)) {

            return false;
        }

        return true;
    }
}
