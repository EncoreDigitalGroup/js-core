/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import "reflect-metadata";
import { container, DependencyContainer } from "tsyringe";
import { IServiceContainer } from "./IServiceContainer";

/**
 * Type registry for clean API support
 * Maps type names extracted from stack traces to their tokens
 */
class TypeRegistry {
    private static typeMap = new Map<string, any>();
    private static reverseMap = new WeakMap<any, string>();

    static register(typeName: string, token: any): void {
        this.typeMap.set(typeName, token);
        this.reverseMap.set(token, typeName);
    }

    static getToken(typeName: string): any {
        return this.typeMap.get(typeName);
    }

    static getTypeName(token: any): string | undefined {
        return this.reverseMap.get(token);
    }

    static clear(): void {
        this.typeMap.clear();
    }
}

/**
 * TSyringe implementation with clean API:
 * container.singleton<FormatterPipeline>(() => new FormatterPipeline())
 * container.resolve<FormatterPipeline>()
 */
export class ServiceContainer implements IServiceContainer {
    private readonly container: DependencyContainer;

    constructor(containerInstance?: DependencyContainer) {
        this.container = containerInstance || container;
    }

    register<T>(implementation: T | (() => T) | (new (...args: any[]) => T)): IServiceContainer {
        const typeName = this.getTypeNameFromStack();
        const token = Symbol(typeName);
        TypeRegistry.register(typeName, token);

        if (typeof implementation === "function" && !this.isConstructor(implementation)) {
            // It's a factory function
            this.container.registerInstance(token, (implementation as () => T)());
        } else if (this.isConstructor(implementation)) {
            // It's a constructor - register for future instantiation
            this.container.register(token, implementation as new (...args: any[]) => T);
        } else {
            // It's a value
            this.container.registerInstance(token, implementation as T);
        }
        return this;
    }

    singleton<T>(implementation: T | (() => T) | (new (...args: any[]) => T)): IServiceContainer {
        const typeName = this.getTypeNameFromStack();
        const token = Symbol(typeName);
        TypeRegistry.register(typeName, token);

        if (typeof implementation === "function" && !this.isConstructor(implementation)) {
            // It's a factory function - register as singleton instance
            this.container.registerInstance(token, (implementation as () => T)());
        } else if (this.isConstructor(implementation)) {
            // It's a constructor
            this.container.registerSingleton(token, implementation as new (...args: any[]) => T);
        } else {
            // It's a value
            this.container.registerInstance(token, implementation as T);
        }
        return this;
    }

    scoped<T>(implementation: T | (() => T) | (new (...args: any[]) => T)): IServiceContainer {
        // TSyringe doesn't have explicit scoped lifecycle, treating as transient
        return this.register<T>(implementation);
    }

    resolve<T>(): T {
        const typeName = this.getTypeNameFromStack();
        const token = TypeRegistry.getToken(typeName);
        if (!token) {
            throw new Error(`Type '${typeName}' is not registered. Call container.singleton<${typeName}>(...) first.`);
        }
        return this.container.resolve(token);
    }

    isRegistered<T>(): boolean {
        const typeName = this.getTypeNameFromStack();
        const token = TypeRegistry.getToken(typeName);
        return token ? this.container.isRegistered(token) : false;
    }

    createChildContainer(): IServiceContainer {
        const childContainer = this.container.createChildContainer();
        return new ServiceContainer(childContainer);
    }

    /**
     * Get the underlying TSyringe container for advanced operations
     */
    getContainer(): DependencyContainer {
        return this.container;
    }

    private isConstructor(fn: any): boolean {
        return typeof fn === "function" && fn.prototype && fn.prototype.constructor === fn;
    }

    /**
     * Extract type name from the call stack by reading the source code at the call site
     * This works in tsx because we can read the actual TypeScript source files
     */
    private getTypeNameFromStack(): string {
        const stack = new Error().stack;
        if (!stack) {
            throw new Error("Cannot determine type name from stack");
        }

        // Parse stack to find the calling location
        const lines = stack.split('\n');
        for (const line of lines) {
            // Skip our own methods
            if (line.includes('ServiceContainer.getTypeNameFromStack') ||
                line.includes('ServiceContainer.singleton') ||
                line.includes('ServiceContainer.resolve') ||
                line.includes('ServiceContainer.register')) {
                continue;
            }

            // Find the first external call location
            const match = line.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
            if (match) {
                const [, filePath, lineNum] = match;
                try {
                    // Read the source file to extract the generic type
                    const fs = require('fs');
                    const sourceCode = fs.readFileSync(filePath, 'utf8');
                    const sourceLines = sourceCode.split('\n');
                    const callLine = sourceLines[parseInt(lineNum) - 1];

                    // Extract the generic type from the call line
                    const typeMatch = callLine.match(/\.(singleton|register|scoped|resolve|isRegistered)<([^>]+)>/);
                    if (typeMatch && typeMatch[2]) {
                        return typeMatch[2].trim();
                    }
                } catch (error) {
                    // Continue to next line if file read fails
                    continue;
                }
            }
        }

        throw new Error("Cannot extract type name from source code. Use explicit generic syntax: container.singleton<TypeName>(...)");
    }
}