/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

/**
 * Simple, purpose-built DI container for tsfmt
 * Supports magical syntax for type registration and resolution
 */
import "reflect-metadata";

export class Container {
    private factories = new Map<string, () => any>();
    private services = new Map<string, any>();
    private singletons = new Map<string, any>();

    /** Static method to declare dependencies for a class */
    static inject(...dependencies: string[]) {
        return function (target: any) {
            Reflect.defineMetadata("custom:inject", dependencies, target);

            return target;
        };
    }

    /** Clear all services (useful for testing) */
    clear(): void {
        this.services.clear();
        this.factories.clear();
        this.singletons.clear();
    }

    /** Extract generic type name from call stack */
    private extractGenericTypeName(): string {
        const stack = new Error().stack;
        if (!stack) {
            throw new Error("Cannot determine type name from stack");
        }

        // Parse stack to find the calling location
        const lines = stack.split("\n");
        for (const line of lines) {
            // Skip our own methods
            if (line.includes("Container.extractGenericTypeName") || line.includes("Container.resolve")) {
                continue;
            }

            // Find the first external call location
            const match = line.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
            if (match) {
                const [, filePath, lineNum] = match;
                try {
                    // Read the source file to extract the generic type
                    const fs = require("fs");
                    const sourceCode = fs.readFileSync(filePath, "utf8");
                    const sourceLines = sourceCode.split("\n");
                    const callLine = sourceLines[parseInt(lineNum) - 1];

                    // Extract the generic type from the resolve call
                    const typeMatch = callLine.match(/\.resolve<([^>]+)>\(\)/);
                    if (typeMatch && typeMatch[1]) {
                        return typeMatch[1].trim();
                    }
                } catch (error) {
                    // Continue to next line if file read fails
                }
            }
        }

        throw new Error("Cannot extract type name from resolve call. Use format: resolve<TypeName>()");
    }

    /** Extract generic type name for registration calls */
    private extractGenericTypeNameForRegistration(): string {
        const stack = new Error().stack;
        if (!stack) {
            throw new Error("Cannot determine type name from stack");
        }

        // Parse stack to find the calling location
        const lines = stack.split("\n");
        for (const line of lines) {
            // Skip our own methods
            if (line.includes("Container.extractGenericTypeNameForRegistration") || line.includes("Container.singleton")) {
                continue;
            }

            // Find the first external call location
            const match = line.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
            if (match) {
                const [, filePath, lineNum] = match;
                try {
                    // Read the source file to extract the generic type
                    const fs = require("fs");
                    const sourceCode = fs.readFileSync(filePath, "utf8");
                    const sourceLines = sourceCode.split("\n");
                    const callLine = sourceLines[parseInt(lineNum) - 1];

                    // Extract the generic type from the singleton call
                    const typeMatch = callLine.match(/\.singleton<([^>]+)>\(/);
                    if (typeMatch && typeMatch[1]) {
                        return typeMatch[1].trim();
                    }
                } catch (error) {
                    // Continue to next line if file read fails
                }
            }
        }

        throw new Error("Cannot extract type name from singleton call. Use format: singleton<TypeName>(...)");
    }

    /** Check if a service is registered */
    has(name: string): boolean {
        return this.services.has(name) || this.factories.has(name) || this.singletons.has(name);
    }

    /** Check if a value is a constructor function */
    private isConstructorFunction(value: any): value is new (...args: any[]) => any {
        return typeof value === "function"
            && value.prototype
            && value.prototype.constructor === value;
    }

    /** Register a service instance */
    register<T>(name: string, instance: T): void {
        this.services.set(name, instance);
    }

    /** Internal method to resolve by key */
    private resolveByKey<T>(name: string): T {
        // Check singletons first
        if (this.singletons.has(name)) {
            const instance = this.singletons.get(name);
            if (instance === undefined) {
                throw new Error(`Service '${name}' found but is undefined`);
            }

            return instance;
        }

        // Check if we have a factory for a singleton
        if (this.factories.has(name)) {
            const factory = this.factories.get(name);
            if (factory === undefined) {
                throw new Error(`Factory for service '${name}' found but is undefined`);
            }

            const instance = factory();
            this.singletons.set(name, instance);
            this.factories.delete(name); // Remove factory after first use

            return instance;
        }

        // Check regular services
        if (this.services.has(name)) {
            const instance = this.services.get(name);
            if (instance === undefined) {
                throw new Error(`Service '${name}' found but is undefined`);
            }

            return instance;
        }

        throw new Error(`Service '${name}' not found`);
    }

    resolve<T>(name?: string): T {
        let key: string;

        if (name) {
            key = name;
        } else {
            // Extract type name from generic parameter using stack trace
            key = this.extractGenericTypeName();
        }

        return this.resolveByKey<T>(key);
    }

    /** Resolve constructor dependencies automatically */
    private resolveDependencies(constructor: new (...args: any[]) => any): any[] {
        // Get parameter types from custom metadata (tsx-compatible approach)
        const deps = Reflect.getMetadata("custom:inject", constructor);
        if (deps) {
            // Use explicitly declared dependencies
            return deps.map((depName: string) => {
                if (depName === "Container") {
                    return this;
                } else {
                    return this.resolveByKey(depName);
                }
            });
        }

        // Fallback: For BaseFormattingRule-based classes, assume Container dependency
        if (constructor.name.endsWith("Rule")) {
            return [this];
        }

        // No dependencies
        return [];
    }

    singleton<T>(nameOrInstanceOrConstructor: string | T | (() => T) | (new (...args: any[]) => T), instance?: T | (() => T)): void {
        let key: string;
        let value: T | (() => T);

        if (typeof nameOrInstanceOrConstructor === "string") {
            key = nameOrInstanceOrConstructor;
            value = instance!;
        } else if (this.isConstructorFunction(nameOrInstanceOrConstructor)) {
            // Handle constructor function with automatic dependency injection
            const constructor = nameOrInstanceOrConstructor as new (...args: any[]) => T;
            key = constructor.name;

            // Create a factory that automatically resolves constructor dependencies
            const factory = () => {
                const dependencies = this.resolveDependencies(constructor);
                return new constructor(...dependencies);
            };

            this.factories.set(key, factory);

            return;
        } else {
            // Extract type name from the generic parameter using stack trace
            key = this.extractGenericTypeNameForRegistration();
            value = nameOrInstanceOrConstructor;
        }

        if (typeof value === "function" && key !== value.name) {
            this.factories.set(key, value as () => T);
        } else {
            this.singletons.set(key, value);
        }
    }
}