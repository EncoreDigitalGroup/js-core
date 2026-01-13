/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { BaseFormattingRule } from "../../BaseFormattingRule";


/**
* Removes excessive blank lines inside blocks (interfaces, classes, enums, functions)
* - No blank line after opening brace
* - JSDoc comments stick to what they describe (no blank line after)
* - Single blank line between members/properties
*/

export class BlockSpacingRule extends BaseFormattingRule {
    readonly name = "BlockSpacingRule";

    apply(source: string, filePath?: string): string {
        let result = source;

        // Remove blank lines after opening braces of interfaces, classes, enums, functions
        // Pattern: { followed by newlines and whitespace before content

        result = result.replace(/\{\n\n+(\s*(?:\/\*\*|[a-zA-Z_]))/g, "{\n$1");

        // Remove blank lines between JSDoc comments and what they describe
        // Pattern: */ followed by multiple newlines before next line
        result = result.replace(/(\*\/)\n\n+(\s+[a-zA-Z_])/g, "$1\n$2");

        // Remove blank lines before closing braces (keep just one newline)
        result = result.replace(/\n\n+(\s*\})/g, "\n$1");

        return result;
    }
}
