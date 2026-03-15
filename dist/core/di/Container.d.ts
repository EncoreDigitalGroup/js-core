import "reflect-metadata";
export declare class Container {
    private factories;
    private services;
    private singletons;
    static inject(...dependencies: string[]): (target: any) => any;
    clear(): void;
    private extractGenericTypeName;
    private extractGenericTypeNameForRegistration;
    has(name: string): boolean;
    private isConstructorFunction;
    register<T>(name: string, instance: T): void;
    private resolveByKey;
    resolve<T>(name?: string): T;
    private resolveDependencies;
    singleton<T>(nameOrInstanceOrConstructor: string | T | (() => T) | (new (...args: any[]) => T), instance?: T | (() => T)): void;
}
