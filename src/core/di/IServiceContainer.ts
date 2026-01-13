/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

/**
 * Provider-agnostic service container interface
 * Enables clean API: container.singleton<FormatterPipeline>(() => new FormatterPipeline(...))
 * and container.resolve<FormatterPipeline>()
 */
export interface IServiceContainer {
    /**
     * Register a transient service with clean syntax
     * @param implementation - Service implementation or factory function
     */
    register<T>(implementation: T | (() => T) | (new (...args: any[]) => T)): IServiceContainer;

    /**
     * Register a singleton service with clean syntax
     * @param implementation - Service implementation or factory function
     */
    singleton<T>(implementation: T | (() => T) | (new (...args: any[]) => T)): IServiceContainer;

    /**
     * Register a scoped service with clean syntax
     * @param implementation - Service implementation or factory function
     */
    scoped<T>(implementation: T | (() => T) | (new (...args: any[]) => T)): IServiceContainer;

    /**
     * Resolve a service instance with clean syntax
     * Usage: container.resolve<FormatterPipeline>()
     */
    resolve<T>(): T;

    /**
     * Check if a service is registered
     */
    isRegistered<T>(): boolean;

    /**
     * Create a child container scope
     */
    createChildContainer(): IServiceContainer;
}

/**
 * Service token type - can be string, symbol, or constructor function
 */
export type ServiceToken<T = any> = string | symbol | (new (...args: any[]) => T);