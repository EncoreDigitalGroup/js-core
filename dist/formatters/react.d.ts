import { ClassMember, SortConfig } from "../shared/classMemberTypes";
import * as ts from "typescript";
export declare enum ReactMemberType {
    StaticProperty = "static_property",
    State = "state",
    InstanceProperty = "instance_property",
    Constructor = "constructor",
    ComponentDidMount = "componentDidMount",
    ShouldComponentUpdate = "shouldComponentUpdate",
    ComponentDidUpdate = "componentDidUpdate",
    ComponentWillUnmount = "componentWillUnmount",
    ComponentDidCatch = "componentDidCatch",
    GetDerivedStateFromProps = "getDerivedStateFromProps",
    GetDerivedStateFromError = "getDerivedStateFromError",
    GetSnapshotBeforeUpdate = "getSnapshotBeforeUpdate",
    EventHandler = "event_handler",
    RenderHelper = "render_helper",
    Render = "render",
    StaticMethod = "static_method",
    InstanceMethod = "instance_method",
    GetAccessor = "get_accessor",
    SetAccessor = "set_accessor"
}
export declare const DEFAULT_REACT_ORDER: ReactMemberType[];
export declare function sortReactMembers(members: ClassMember[], config?: SortConfig): ClassMember[];
export declare function transformReactComponent(classNode: ts.ClassDeclaration, sourceFile: ts.SourceFile, config: SortConfig): ts.ClassDeclaration;
export declare function isReactComponent(classNode: ts.ClassDeclaration): boolean;
