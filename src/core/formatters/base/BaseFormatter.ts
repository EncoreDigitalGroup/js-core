/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { IFormatter } from "./IFormatter";


/**
* Abstract base class for all formatters providing common functionality
*/

export abstract class BaseFormatter implements IFormatter {

    abstract readonly name: string;

    /**
    * Format source code - must be implemented by subclasses
    */
    abstract format(source: string, filePath: string, config?: any): Promise<string>;

    /**
    * Get list of supported file extensions
    * @returns Array of file extensions (e.g., ['.ts', '.tsx'])
    */
    protected abstract getSupportedExtensions(): string[];

    /**
    * Log formatting result
    * @param filePath - Path to the file being formatted
    * @param changed - Whether the file was changed
    */
    protected logFormat(filePath: string, changed: boolean): void {

        if (changed) {

            console.log(`✨ [${this.name}] Formatted: ${filePath}`);
        }
    }

    /**
    * Check if this formatter should process the given file based on extension
    */
    shouldFormat(filePath: string): boolean {

        const supportedExtensions = this.getSupportedExtensions();

        return supportedExtensions.some(ext => filePath.endsWith(ext));
    }

    /**
    * Default config validation - override in subclasses for specific validation
    */
    // @ts-ignore
    validateConfig(config: any): boolean {

        return true;
    }
}
