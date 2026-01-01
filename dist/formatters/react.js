"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REACT_ORDER = exports.ReactMemberType = void 0;
exports.isReactComponent = isReactComponent;
exports.sortReactMembers = sortReactMembers;
exports.transformReactComponent = transformReactComponent;
const astTraversal_1 = require("../shared/astTraversal");
const classMemberTypes_1 = require("../shared/classMemberTypes");
const classMemberUtils_1 = require("../shared/classMemberUtils");
const dependencyAnalysis_1 = require("../shared/dependencyAnalysis");
const ts = __importStar(require("typescript"));
var ReactMemberType;
(function (ReactMemberType) {
    ReactMemberType["StaticProperty"] = "static_property";
    ReactMemberType["State"] = "state";
    ReactMemberType["InstanceProperty"] = "instance_property";
    ReactMemberType["Constructor"] = "constructor";
    ReactMemberType["ComponentDidMount"] = "componentDidMount";
    ReactMemberType["ShouldComponentUpdate"] = "shouldComponentUpdate";
    ReactMemberType["ComponentDidUpdate"] = "componentDidUpdate";
    ReactMemberType["ComponentWillUnmount"] = "componentWillUnmount";
    ReactMemberType["ComponentDidCatch"] = "componentDidCatch";
    ReactMemberType["GetDerivedStateFromProps"] = "getDerivedStateFromProps";
    ReactMemberType["GetDerivedStateFromError"] = "getDerivedStateFromError";
    ReactMemberType["GetSnapshotBeforeUpdate"] = "getSnapshotBeforeUpdate";
    ReactMemberType["EventHandler"] = "event_handler";
    ReactMemberType["RenderHelper"] = "render_helper";
    ReactMemberType["Render"] = "render";
    ReactMemberType["StaticMethod"] = "static_method";
    ReactMemberType["InstanceMethod"] = "instance_method";
    ReactMemberType["GetAccessor"] = "get_accessor";
    ReactMemberType["SetAccessor"] = "set_accessor";
})(ReactMemberType || (exports.ReactMemberType = ReactMemberType = {}));
function isEventHandler(name) {
    return /^(handle|on)[A-Z]/.test(name);
}
function isRenderHelper(name) {
    return /^render[A-Z]/.test(name) && name !== "render";
}
function getReactMemberType(member) {
    if (ts.isConstructorDeclaration(member)) {
        return ReactMemberType.Constructor;
    }
    const isStatic = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.StaticKeyword);
    const name = (0, classMemberUtils_1.getMemberName)(member);
    if (ts.isPropertyDeclaration(member)) {
        if (isStatic) {
            return ReactMemberType.StaticProperty;
        }
        if (name === "state") {
            return ReactMemberType.State;
        }
        return ReactMemberType.InstanceProperty;
    }
    if (ts.isGetAccessorDeclaration(member)) {
        return ReactMemberType.GetAccessor;
    }
    if (ts.isSetAccessorDeclaration(member)) {
        return ReactMemberType.SetAccessor;
    }
    if (ts.isMethodDeclaration(member)) {
        if (isStatic) {
            if (name === "getDerivedStateFromProps") {
                return ReactMemberType.GetDerivedStateFromProps;
            }
            if (name === "getDerivedStateFromError") {
                return ReactMemberType.GetDerivedStateFromError;
            }
            return ReactMemberType.StaticMethod;
        }
        if (name === "componentDidMount")
            return ReactMemberType.ComponentDidMount;
        if (name === "shouldComponentUpdate")
            return ReactMemberType.ShouldComponentUpdate;
        if (name === "getSnapshotBeforeUpdate")
            return ReactMemberType.GetSnapshotBeforeUpdate;
        if (name === "componentDidUpdate")
            return ReactMemberType.ComponentDidUpdate;
        if (name === "componentWillUnmount")
            return ReactMemberType.ComponentWillUnmount;
        if (name === "componentDidCatch")
            return ReactMemberType.ComponentDidCatch;
        if (name === "render")
            return ReactMemberType.Render;
        if (isEventHandler(name))
            return ReactMemberType.EventHandler;
        if (isRenderHelper(name))
            return ReactMemberType.RenderHelper;
        return ReactMemberType.InstanceMethod;
    }
    return ReactMemberType.InstanceMethod;
}
function analyzeReactMember(member, sourceFile, index, allMemberNames) {
    const type = getReactMemberType(member);
    const name = (0, classMemberUtils_1.getMemberName)(member);
    const isStatic = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.StaticKeyword);
    const isPublic = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.PublicKeyword) ||
        (!(0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.PrivateKeyword) && !(0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.ProtectedKeyword));
    const isProtected = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.ProtectedKeyword);
    const isPrivate = (0, classMemberUtils_1.hasModifier)(member, ts.SyntaxKind.PrivateKeyword);
    const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) : undefined;
    const hasDecorator = decorators ? decorators.length > 0 : false;
    const text = member.getFullText(sourceFile);
    const allDependencies = (0, astTraversal_1.extractClassMemberReferences)(member, allMemberNames);
    const dependencies = new Set(Array.from(allDependencies).filter(dep => dep !== name));
    return {
        node: member,
        type,
        name,
        isPublic,
        isProtected,
        isPrivate,
        isStatic,
        hasDecorator,
        text,
        dependencies,
        originalIndex: index,
    };
}
function isReactComponent(classNode) {
    if (!classNode.heritageClauses) {
        return false;
    }
    for (const clause of classNode.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            for (const type of clause.types) {
                const typeName = type.expression.getText();
                if (typeName === "Component" ||
                    typeName === "PureComponent" ||
                    typeName === "React.Component" ||
                    typeName === "React.PureComponent") {
                    return true;
                }
            }
        }
    }
    return false;
}
exports.DEFAULT_REACT_ORDER = [
    ReactMemberType.StaticProperty,
    ReactMemberType.State,
    ReactMemberType.InstanceProperty,
    ReactMemberType.Constructor,
    ReactMemberType.GetDerivedStateFromProps,
    ReactMemberType.ComponentDidMount,
    ReactMemberType.ShouldComponentUpdate,
    ReactMemberType.GetSnapshotBeforeUpdate,
    ReactMemberType.ComponentDidUpdate,
    ReactMemberType.ComponentWillUnmount,
    ReactMemberType.ComponentDidCatch,
    ReactMemberType.GetDerivedStateFromError,
    ReactMemberType.EventHandler,
    ReactMemberType.RenderHelper,
    ReactMemberType.GetAccessor,
    ReactMemberType.SetAccessor,
    ReactMemberType.Render,
    ReactMemberType.StaticMethod,
    ReactMemberType.InstanceMethod,
];
function sortReactMembers(members, config = {}) {
    const order = config.order || exports.DEFAULT_REACT_ORDER;
    return [...members].sort((a, b) => {
        const aTypeIndex = order.indexOf(a.type);
        const bTypeIndex = order.indexOf(b.type);
        return (0, classMemberTypes_1.compareMembers)(a, b, aTypeIndex, bTypeIndex, config);
    });
}
function transformReactComponent(classNode, sourceFile, config) {
    if (!classNode.members || classNode.members.length === 0) {
        return classNode;
    }
    const allMemberNames = new Set(classNode.members.map(m => (0, classMemberUtils_1.getMemberName)(m)).filter(n => n && n !== "constructor"));
    const analyzedMembers = classNode.members.map((member, index) => analyzeReactMember(member, sourceFile, index, allMemberNames));
    let sortedMembers = sortReactMembers(analyzedMembers, config);
    if (config.respectDependencies !== false) {
        sortedMembers = (0, dependencyAnalysis_1.reorderWithDependencies)(sortedMembers, m => m.name);
    }
    return ts.factory.updateClassDeclaration(classNode, ts.getModifiers(classNode), classNode.name, classNode.typeParameters, classNode.heritageClauses, sortedMembers.map(m => m.node));
}
