"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CLASS_ORDER = exports.MemberType = void 0;
exports.__compareMembers = __compareMembers;
var MemberType;
(function (MemberType) {
    MemberType["StaticProperty"] = "static_property";
    MemberType["InstanceProperty"] = "instance_property";
    MemberType["Constructor"] = "constructor";
    MemberType["StaticMethod"] = "static_method";
    MemberType["InstanceMethod"] = "instance_method";
    MemberType["GetAccessor"] = "get_accessor";
    MemberType["SetAccessor"] = "set_accessor";
})(MemberType || (exports.MemberType = MemberType = {}));
function __compareMembers(a, b, aTypeIndex, bTypeIndex, config) {
    if (aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex;
    }
    if (config.groupByVisibility) {
        if (a.isPublic !== b.isPublic)
            return a.isPublic ? -1 : 1;
        if (a.isProtected !== b.isProtected)
            return a.isProtected ? -1 : 1;
        if (a.isPrivate !== b.isPrivate)
            return a.isPrivate ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
}
exports.DEFAULT_CLASS_ORDER = [
    MemberType.StaticProperty,
    MemberType.InstanceProperty,
    MemberType.Constructor,
    MemberType.GetAccessor,
    MemberType.SetAccessor,
    MemberType.StaticMethod,
    MemberType.InstanceMethod,
];
