import * as ts from "typescript";
export declare enum MemberType {
    StaticProperty = "static_property",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor"
}
export interface ClassMember {
    node: ts.ClassElement;
    type: MemberType;
    name: string;
    isPublic: boolean;
    isProtected: boolean;
    isPrivate: boolean;
    isStatic: boolean;
    hasDecorator: boolean;
    text: string;
    dependencies?: Set<string>;
    originalIndex?: number;
}
export interface SortConfig {
    order?: MemberType[];
    groupByVisibility?: boolean;
    dryRun?: boolean;
    respectDependencies?: boolean;
}
export declare function compareMembers(a: ClassMember, b: ClassMember, aTypeIndex: number, bTypeIndex: number, config: SortConfig): number;
export declare const DEFAULT_CLASS_ORDER: MemberType[];
