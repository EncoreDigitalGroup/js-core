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
     * Extract type name from the call stack for registration
     * This is the magic that enables the clean API
     */
    private getTypeNameFromStack(): string {
        const stack = new Error().stack;
        if (!stack) {
            throw new Error("Cannot determine type name from stack");
        }

        // Look for multiple patterns: container.singleton<TypeName>( or container.resolve<TypeName>()
        const patterns = [
            /\.(singleton|register|scoped|resolve|isRegistered)<([^>]+)>/,
            /(singleton|register|scoped|resolve|isRegistered)<([^>]+)>/,
            /<([^>]+)>.*at.*\.(singleton|register|scoped|resolve|isRegistered)/
        ];

        for (const pattern of patterns) {
            const match = stack.match(pattern);
            if (match) {
                // Find the type name in the match groups
                const typeName = match[2] || match[1];
                if (typeName && typeName.trim()) {
                    return typeName.trim();
                }
            }
        }

        // Fallback: try to extract from the method call line directly
        const lines = stack.split('\n');
        for (const line of lines) {
            if (line.includes('.singleton<') || line.includes('.resolve<') ||
                line.includes('.register<') || line.includes('.scoped<') ||
                line.includes('.isRegistered<')) {
                const typeMatch = line.match(/<([^>]+)>/);
                if (typeMatch && typeMatch[1]) {
                    return typeMatch[1].trim();
                }
            }
        }

        throw new Error("Cannot extract type name. Use explicit generic syntax: container.singleton<TypeName>(...)");
    }
}