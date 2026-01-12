/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/**
* Interface for all formatting rules
* Each rule applies a specific code style transformation
*/

export interface IFormattingRule {
    /**
    * Name of the rule for logging and debugging
    */
    readonly name: string;

    /**
    * Apply the formatting rule to the source code
    * @param source - The source code to format
    * @param filePath - Optional file path for AST-based rules that need file extension info
    * @returns The formatted source code
    */
    apply(source: string, filePath?: string): string;
}
