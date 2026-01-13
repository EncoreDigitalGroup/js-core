"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
class DependencyResolver {
  /**
  * Find strongly connected components (circular dependency groups)
  * Using Tarjan's algorithm
  */
  static findStronglyConnectedComponents(nodes) {
    const index = /* @__PURE__ */ new Map();
    const lowLink = /* @__PURE__ */ new Map();
    const onStack = /* @__PURE__ */ new Set();
    const stack = [];
    const sccs = [];
    let currentIndex = 0;
    function strongConnect(nodeName) {
      index.set(nodeName, currentIndex);
      lowLink.set(nodeName, currentIndex);
      currentIndex++;
      stack.push(nodeName);
      onStack.add(nodeName);
      const node = nodes.get(nodeName);
      for (const dep of node.dependencies) {
        if (!index.has(dep)) {
          strongConnect(dep);
          lowLink.set(nodeName, Math.min(lowLink.get(nodeName), lowLink.get(dep)));
        } else if (onStack.has(dep)) {
          lowLink.set(nodeName, Math.min(lowLink.get(nodeName), index.get(dep)));
        }
      }
      if (lowLink.get(nodeName) === index.get(nodeName)) {
        const scc = /* @__PURE__ */ new Set();
        let w;
        do {
          w = stack.pop();
          onStack.delete(w);
          scc.add(w);
        } while (w !== nodeName);
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
  /** Builds a dependency graph from a list of items */
  static buildGraph(items, getName, getDependencies) {
    const nodes = /* @__PURE__ */ new Map();
    items.forEach((item, index) => {
      const name = getName(item);
      if (!name)
        return;
      nodes.set(name, {
        name,
        dependencies: getDependencies(item),
        originalIndex: index,
        sortedIndex: index
      });
    });
    const allNames = new Set(nodes.keys());
    nodes.forEach((node) => {
      node.dependencies = new Set(Array.from(node.dependencies).filter((dep) => allNames.has(dep)));
    });
    const circularGroups = this.findStronglyConnectedComponents(nodes);
    return { nodes, circularGroups };
  }
  /**
  * Performs topological sort respecting the ideal sorted order
  * Returns array of names in dependency-aware order
  */
  static topologicalSort(graph, sortedNames) {
    const result = [];
    const visited = /* @__PURE__ */ new Set();
    const visiting = /* @__PURE__ */ new Set();
    const circularNodes = /* @__PURE__ */ new Set();
    graph.circularGroups.forEach((group) => {
      group.forEach((name) => circularNodes.add(name));
    });
    function visit(name) {
      if (visited.has(name))
        return true;
      if (visiting.has(name)) {
        return false;
      }
      const node = graph.nodes.get(name);
      if (!node)
        return true;
      visiting.add(name);
      for (const dep of node.dependencies) {
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
    for (const name of sortedNames) {
      visit(name);
    }
    return result;
  }
  /**
  * Reorders items to respect dependencies while minimizing changes
  * from the ideal sorted order
  */
  static reorderWithDependencies(items, getName) {
    const getDeps = (item) => {
      const member = item;
      return member.dependencies || /* @__PURE__ */ new Set();
    };
    const graph = this.buildGraph(items, getName, getDeps);
    const sortedNames = items.map(getName);
    const dependencyOrder = this.topologicalSort(graph, sortedNames);
    const nameToItem = /* @__PURE__ */ new Map();
    items.forEach((item) => {
      const name = getName(item);
      if (name)
        nameToItem.set(name, item);
    });
    const result = [];
    for (const name of dependencyOrder) {
      const item = nameToItem.get(name);
      if (item) {
        result.push(item);
      }
    }
    items.forEach((item) => {
      if (!result.includes(item)) {
        result.push(item);
      }
    });
    return result;
  }
}
exports.DependencyResolver = DependencyResolver;
