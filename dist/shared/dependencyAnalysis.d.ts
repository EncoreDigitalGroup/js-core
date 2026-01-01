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
export declare function buildDependencyGraph<T>(items: T[], getName: (item: T) => string, getDependencies: (item: T) => Set<string>): DependencyGraph;
export declare function topologicalSort(graph: DependencyGraph, sortedNames: string[]): string[];
export declare function reorderWithDependencies<T>(items: T[], getName: (item: T) => string): T[];
