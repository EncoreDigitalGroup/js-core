export interface DependencyNode {
    name: string;
    dependencies: Set<string>;
    originalIndex: number;
    sortedIndex: number;
}
export interface DependencyGraph {
    nodes: Map<string, DependencyNode>;
    circularGroups: Set<string>[];
}
export declare class DependencyResolver {
    private static findStronglyConnectedComponents;
    static buildGraph<T>(items: T[], getName: (item: T) => string, getDependencies: (item: T) => Set<string>): DependencyGraph;
    static topologicalSort(graph: DependencyGraph, sortedNames: string[]): string[];
    static reorderWithDependencies<T>(items: T[], getName: (item: T) => string): T[];
}
