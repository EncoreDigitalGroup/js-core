/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */
import * as ts from "typescript";

export enum MemberType {
    StaticProperty = "static_property",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor",
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
}
export interface SortConfig {
    order?: MemberType[];
    groupByVisibility?: boolean;
    dryRun?: boolean;
}

export const DEFAULT_CLASS_ORDER: MemberType[] = [
    MemberType.StaticProperty,
    MemberType.InstanceProperty,
    MemberType.Constructor,
    MemberType.GetAccessor,
    MemberType.SetAccessor,
    MemberType.StaticMethod,
    MemberType.InstanceMethod,
];
/**
 * Compares two class members for sorting based on type index, visibility, and name
 */
export function compareMembers(
    a: ClassMember,
    b: ClassMember,
    aTypeIndex: number,
    bTypeIndex: number,
    config: SortConfig,
): number {
    // First, sort by member type according to the defined order
    if (aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex;
    }
    // Within the same type, sort by visibility if configured
    if (config.groupByVisibility) {
        if (a.isPublic !== b.isPublic) return a.isPublic ? -1 : 1;
        if (a.isProtected !== b.isProtected) return a.isProtected ? -1 : 1;
        if (a.isPrivate !== b.isPrivate) return a.isPrivate ? -1 : 1;
    }
    // Finally, maintain alphabetical order by name
    return a.name.localeCompare(b.name);
}
