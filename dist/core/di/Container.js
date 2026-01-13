"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("reflect-metadata");
class Container {
  constructor() {
    this.factories = /* @__PURE__ */ new Map();
    this.services = /* @__PURE__ */ new Map();
    this.singletons = /* @__PURE__ */ new Map();
  }
  /** Static method to declare dependencies for a class */
  static inject(...dependencies) {
    return function(target) {
      Reflect.defineMetadata("custom:inject", dependencies, target);
      return target;
    };
  }
  /** Clear all services (useful for testing) */
  clear() {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }
  /** Extract generic type name from call stack */
  extractGenericTypeName() {
    const stack = new Error().stack;
    if (!stack) {
      throw new Error("Cannot determine type name from stack");
    }
    const lines = stack.split("\n");
    for (const line of lines) {
      if (line.includes("Container.extractGenericTypeName") || line.includes("Container.resolve")) {
        continue;
      }
      const match = line.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        const [, filePath, lineNum] = match;
        try {
          const fs = require("fs");
          const sourceCode = fs.readFileSync(filePath, "utf8");
          const sourceLines = sourceCode.split("\n");
          const callLine = sourceLines[parseInt(lineNum) - 1];
          const typeMatch = callLine.match(/\.resolve<([^>]+)>\(\)/);
          if (typeMatch && typeMatch[1]) {
            return typeMatch[1].trim();
          }
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error("Cannot extract type name from resolve call. Use format: resolve<TypeName>()");
  }
  /** Extract generic type name for registration calls */
  extractGenericTypeNameForRegistration() {
    const stack = new Error().stack;
    if (!stack) {
      throw new Error("Cannot determine type name from stack");
    }
    const lines = stack.split("\n");
    for (const line of lines) {
      if (line.includes("Container.extractGenericTypeNameForRegistration") || line.includes("Container.singleton")) {
        continue;
      }
      const match = line.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        const [, filePath, lineNum] = match;
        try {
          const fs = require("fs");
          const sourceCode = fs.readFileSync(filePath, "utf8");
          const sourceLines = sourceCode.split("\n");
          const callLine = sourceLines[parseInt(lineNum) - 1];
          const typeMatch = callLine.match(/\.singleton<([^>]+)>\(/);
          if (typeMatch && typeMatch[1]) {
            return typeMatch[1].trim();
          }
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error("Cannot extract type name from singleton call. Use format: singleton<TypeName>(...)");
  }
  /** Check if a service is registered */
  has(name) {
    return this.services.has(name) || this.factories.has(name) || this.singletons.has(name);
  }
  /** Check if a value is a constructor function */
  isConstructorFunction(value) {
    return typeof value === "function" && value.prototype && value.prototype.constructor === value;
  }
  /** Register a service instance */
  register(name, instance) {
    this.services.set(name, instance);
  }
  /** Internal method to resolve by key */
  resolveByKey(name) {
    if (this.singletons.has(name)) {
      const instance = this.singletons.get(name);
      if (instance === void 0) {
        throw new Error(`Service '${name}' found but is undefined`);
      }
      return instance;
    }
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      if (factory === void 0) {
        throw new Error(`Factory for service '${name}' found but is undefined`);
      }
      const instance = factory();
      this.singletons.set(name, instance);
      this.factories.delete(name);
      return instance;
    }
    if (this.services.has(name)) {
      const instance = this.services.get(name);
      if (instance === void 0) {
        throw new Error(`Service '${name}' found but is undefined`);
      }
      return instance;
    }
    throw new Error(`Service '${name}' not found`);
  }
  resolve(name) {
    let key;
    if (name) {
      key = name;
    } else {
      key = this.extractGenericTypeName();
    }
    return this.resolveByKey(key);
  }
  /** Resolve constructor dependencies automatically */
  resolveDependencies(constructor) {
    const deps = Reflect.getMetadata("custom:inject", constructor);
    if (deps) {
      return deps.map((depName) => {
        if (depName === "Container") {
          return this;
        } else {
          return this.resolveByKey(depName);
        }
      });
    }
    if (constructor.name.endsWith("Rule")) {
      return [this];
    }
    return [];
  }
  singleton(nameOrInstanceOrConstructor, instance) {
    let key;
    let value;
    if (typeof nameOrInstanceOrConstructor === "string") {
      key = nameOrInstanceOrConstructor;
      value = instance;
    } else if (this.isConstructorFunction(nameOrInstanceOrConstructor)) {
      const constructor = nameOrInstanceOrConstructor;
      key = constructor.name;
      const factory = () => {
        const dependencies = this.resolveDependencies(constructor);
        return new constructor(...dependencies);
      };
      this.factories.set(key, factory);
      return;
    } else {
      key = this.extractGenericTypeNameForRegistration();
      value = nameOrInstanceOrConstructor;
    }
    if (typeof value === "function" && key !== value.name) {
      this.factories.set(key, value);
    } else {
      this.singletons.set(key, value);
    }
  }
}
exports.Container = Container;
