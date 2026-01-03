export interface DependencyInfo {
    name: string;
    dependencies: Set<string>;
    originalIndex: number;
    sortedIndex: number;
}

/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
export interface DependencyGraph {
    nodes: Map<string, DependencyInfo>;
    circularGroups: Set<string>[];
}

/**
 * Find strongly connected components (circular dependency groups)
 * Using Tarjan's algorithm
 */
function findStronglyConnectedComponents(nodes: Map<string, DependencyInfo>): Set<string>[] {
    const index = new Map<string, number>();
    const lowLink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: Set<string>[] = [];
    let currentIndex = 0;
    function strongConnect(nodeName: string) {
        index.set(nodeName, currentIndex);
        lowLink.set(nodeName, currentIndex);
        currentIndex++;
        stack.push(nodeName);
        onStack.add(nodeName);
        const node = nodes.get(nodeName)!;
        for (const dep of node.dependencies) {
            if (!index.has(dep)) {
                strongConnect(dep);
                lowLink.set(nodeName, Math.min(lowLink.get(nodeName)!, lowLink.get(dep)!));
            } else if (onStack.has(dep)) {
                lowLink.set(nodeName, Math.min(lowLink.get(nodeName)!, index.get(dep)!));
            }
        }
        if (lowLink.get(nodeName) === index.get(nodeName)) {
            const scc = new Set<string>();
            let w: string;
            do {
                w = stack.pop()!;
                onStack.delete(w);
                scc.add(w);
            } while (w !== nodeName);
            // Only add if it's a real cycle (size > 1) or self-referential
            if (scc.size > 1 || node.dependencies.has(nodeName)) {
                sccs.push(scc);
            }
        }
    }
    for (const nodeName of nodes.keys()) {
        if (!index.has(nodeName)) {
            strongConnect(nodeName);
        }
    }

    return sccs;
}

/**
 * Builds a dependency graph from a list of items
 */
export function __buildDependencyGraph<T>(
    items: T[],
    getName: (item: T) => string,
    getDependencies: (item: T) => Set<string>,
): DependencyGraph {
    const nodes = new Map<string, DependencyInfo>();
    // Create nodes
    items.forEach((item, index) => {
        const name = getName(item);
        if (!name) return;
        nodes.set(name, {
            name,
            dependencies: getDependencies(item),
            originalIndex: index,
            sortedIndex: index,
        });
    });
    // Filter dependencies to only include symbols in our scope
    const allNames = new Set(nodes.keys());
    nodes.forEach(node => {
        node.dependencies = new Set(Array.from(node.dependencies).filter(dep => allNames.has(dep)));
    });
    // Detect circular dependency groups using Tarjan's algorithm
    const circularGroups = findStronglyConnectedComponents(nodes);

    return {nodes, circularGroups};
}

/**
 * Performs topological sort respecting the ideal sorted order
 * Returns array of names in dependency-aware order
 */
export function __topologicalSort(graph: DependencyGraph, sortedNames: string[]): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>(); // For cycle detection
    const circularNodes = new Set<string>();
    // Mark all nodes in circular groups
    graph.circularGroups.forEach(group => {
        group.forEach(name => circularNodes.add(name));
    });
    function visit(name: string): boolean {
        if (visited.has(name)) return true;
        if (visiting.has(name)) {
            // Cycle detected - this should be in circularNodes already
            return false;
        }
        const node = graph.nodes.get(name);
        if (!node) return true;
        visiting.add(name);
        // Visit dependencies first
        for (const dep of node.dependencies) {
            // Skip circular dependencies - we'll handle them specially
            if (circularNodes.has(dep) && circularNodes.has(name)) {
                continue;
            }
            if (!visit(dep)) {
                return false;
            }
        }
        visiting.delete(name);
        visited.add(name);
        result.push(name);

        return true;
    }
    // Process nodes in their sorted order preference
    // This ensures that within valid orderings, we respect the type/visibility/name sort
    for (const name of sortedNames) {
        visit(name);
    }

    return result;
}

/**
 * Reorders items to respect dependencies while minimizing changes
 * from the ideal sorted order
 */
export function __reorderWithDependencies<T>(items: T[], getName: (item: T) => string): T[] {
    // Build dependency graph
    const getDeps = (item: T) => {
        const member = item as any;

        return member.dependencies || new Set<string>();
    };
    const graph = __buildDependencyGraph(items, getName, getDeps);
    // Get ideal order (current sorted order)
    const sortedNames = items.map(getName);
    // Perform topological sort
    const dependencyOrder = __topologicalSort(graph, sortedNames);
    // Create name to item map
    const nameToItem = new Map<string, T>();
    items.forEach(item => {
        const name = getName(item);
        if (name) nameToItem.set(name, item);
    });
    // Reconstruct array in dependency order
    const result: T[] = [];
    for (const name of dependencyOrder) {
        const item = nameToItem.get(name);
        if (item) {
            result.push(item);
        }
    }
    // Add any items that weren't in the graph (shouldn't happen, but safety)
    items.forEach(item => {
        if (!result.includes(item)) {
            result.push(item);
        }
    });

    return result;
}
