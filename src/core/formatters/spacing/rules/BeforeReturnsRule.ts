/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { SpacingConfig } from "../../../../config/types";
import { ISpacingRule } from "../ISpacingRule";


/**
* Adds blank lines before return statements
* Works at all brace depths (not just top level)
*/

export class BeforeReturnsRule implements ISpacingRule {

    readonly name = "BeforeReturnsRule";

    constructor(private config: SpacingConfig) {
    }

    apply(source: string): string {

        if (!this.config.beforeReturns) {

            return source;
        }

        const lines = source.split("\n");
        const result: string[] = [];

        for (let i = 0; i < lines.length; i++) {

            const currentLine = lines[i];
            const trimmedCurrentLine = currentLine.trim();
            const previousLine = i > 0 ? lines[i - 1] : "";
            const trimmedPreviousLine = previousLine.trim();
            // Check if current line is a return statement
            const isReturnStatement = trimmedCurrentLine.startsWith("return ");
            // Check if previous line is a comment or blank
            const previousIsComment = trimmedPreviousLine.startsWith("//") ||

                trimmedPreviousLine.startsWith("/*") ||
                trimmedPreviousLine.startsWith("*") ||
                trimmedPreviousLine.endsWith("*/");

            const previousIsBlank = trimmedPreviousLine === "";
            // Add blank line before return if:
            // - It's a return statement
            // - Previous line is not blank
            // - Previous line is not a comment
            // - We have at least one line before

            if (isReturnStatement && !previousIsBlank && !previousIsComment && i > 0) {

                result.push("");
            }
            result.push(currentLine);
        }

        return result.join("\n");
    }
}
