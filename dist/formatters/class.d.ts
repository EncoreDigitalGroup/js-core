import { ClassMember, SortConfig } from "../shared/classMemberTypes";
import * as ts from "typescript";
export declare function sortClassMembers(members: ClassMember[], config?: SortConfig): ClassMember[];
export declare function transformClass(classNode: ts.ClassDeclaration, sourceFile: ts.SourceFile, config: SortConfig): ts.ClassDeclaration;
