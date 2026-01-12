/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/
/**
* Base interface that all formatters must implement
*/


export interface IFormatter {
    /**
    * Unique identifier for this formatter
    */
    readonly name: string;

    /**
    * Format source code
    * @param source - Source code string
    * @param filePath - Absolute path to the file being formatted
    * @param config - Formatter-specific configuration
    * @returns Formatted source code
    */
    format(source: string, filePath: string, config?: any): Promise<string>;

    /**
    * Check if this formatter should process the given file
    * @param filePath - Absolute path to the file
    * @returns true if this formatter can process the file
    */
    shouldFormat(filePath: string): boolean;

    /**
    * Validate configuration for this formatter
    * @param config - Configuration object to validate
    * @returns true if configuration is valid
    */
    validateConfig(config: any): boolean;
}
