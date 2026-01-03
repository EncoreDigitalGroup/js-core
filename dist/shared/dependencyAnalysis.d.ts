export interface DependencyInfo {
    name: string;
    dependencies: Set<string>;
    originalIndex: number;
    sortedIndex: number;
}
export interface DependencyGraph {
    nodes: Map<string, DependencyInfo>;
    circularGroups: Set<string>[];
}
export declare function __buildDependencyGraph<T>(items: T[], getName: (item: T) => string, getDependencies: (item: T) => Set<string>): DependencyGraph;
export declare function __topologicalSort(graph: DependencyGraph, sortedNames: string[]): string[];
export declare function __reorderWithDependencies<T>(items: T[], getName: (item: T) => string): T[];
