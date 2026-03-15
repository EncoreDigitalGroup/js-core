import * as ts from "typescript";
import { BaseFormattingRule } from "../../BaseFormattingRule";
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
export declare const DEFAULT_CLASS_ORDER: MemberType[];
export declare class ClassMemberSortingRule extends BaseFormattingRule {
    readonly name = "ClassMemberSortingRule";
    private getMemberType;
    private analyzeClassMember;
    private createSourceFile;
    private compareMembers;
    private sortClassMembers;
    apply(source: string, filePath?: string): string;
}
