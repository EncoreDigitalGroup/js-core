import { ClassMember, SortConfig } from "../shared/classMemberTypes";
import * as ts from "typescript";
export declare function __sortClassMembers(members: ClassMember[], config?: SortConfig): ClassMember[];
export declare function __transformClass(classNode: ts.ClassDeclaration, sourceFile: ts.SourceFile, config: SortConfig): ts.ClassDeclaration;
