/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

/*
 * Sorts a parsed package.json object: orders the top-level fields and applies per-field ordering to
 * recognized nested structures (dependencies, scripts, exports, and so on). Callers always hand in an
 * already-parsed object, so there is no string/indentation handling here.
 */
type Transform = (x: any, ...args: any[]) => any;

interface Field {
    key: string;
    over?: Transform;
}

type AnyObject = Record<string, any>;

// --- dependencies -------------------------------------------------------------------------------
function getPackageName(ident: string): string {
    const index = ident.indexOf("@", ident.startsWith("@") ? 1 : 0);
    return index === -1 ? ident : ident.slice(0, index);
}

// `Object.hasOwn` equivalent that type-checks under the project's `lib` target.
const hasOwn = (object: any, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);

function hasDevDependency(dependency: string, packageJson: AnyObject): boolean {
    return hasOwn(packageJson, "devDependencies") && hasOwn(packageJson.devDependencies, dependency);
}

const runSRegExp = /(?<=^|[\s&;<>|(])(?:run-s|npm-run-all2? .*(?:--sequential|--serial|-s))(?=$|[\s&;<>|)])/;
const isSequentialScript = (command: string): boolean => command.includes("*") && runSRegExp.test(command);

function hasSequentialScript(packageJson: AnyObject): boolean {
    if (!hasDevDependency("npm-run-all", packageJson) && !hasDevDependency("npm-run-all2", packageJson)) {
        return false;
    }

    const scripts = ["scripts", "betterScripts"].flatMap((field) =>
        packageJson[field] ? Object.values(packageJson[field]) : []);

    return scripts.some((script: any) => isSequentialScript(script));
}

function isPlainObject(value: any): value is AnyObject {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null)
        && !(Symbol.toStringTag in value)
        && !(Symbol.iterator in value);
}

function objectGroupBy<T>(array: T[], callback: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = Object.create(null);

    for (const value of array) {
        const key = callback(value);
        if (result[key]) {
            result[key].push(value);
        } else {
            result[key] = [value];
        }
    }

    return result;
}

// --- exports (sortPackage re-applies sortExportsKeys afterward) ----------------------------------
function sortConditions(conditions: string[]): string[] {
    const {defaultConditions = [], restConditions = []} = objectGroupBy(conditions, (condition) =>
        condition === "default" ? "defaultConditions" : "restConditions");

    return [...restConditions, ...defaultConditions];
}

const onObject = (fn: (x: AnyObject, ...args: any[]) => any): Transform =>
    (x: any, ...args: any[]) => (isPlainObject(x) ? fn(x, ...args) : x);

// Order `object`'s keys by `sortWith`: a comparator, or a key-name list (unlisted keys fall back to
// default lexicographic order appended after the list). Only own keys present on the object survive.
function sortObjectKeys(object: AnyObject, sortWith?: ((a: string, b: string) => number) | string[]): AnyObject {
    let keys: string[] | undefined;
    let sortFn: ((a: string, b: string) => number) | undefined;

    if (typeof sortWith === "function") {
        sortFn = sortWith;
    } else {
        keys = sortWith;
    }

    const total: AnyObject = {};
    const objectKeys = [...(keys ?? []), ...Object.keys(object).sort(sortFn)];
    for (const key of objectKeys) {
        if (hasOwn(object, key)) {
            total[key] = object[key];
        }
    }

    return total;
}

function sortObjectBy(comparator?: ((a: string, b: string) => number) | string[], deep?: boolean): Transform {
    const over: Transform = onObject((object: AnyObject) => {
        if (deep) {
            object = Object.fromEntries(Object.entries(object).map(([key, value]) => [key, over(value)]));
        }

        return sortObjectKeys(object, comparator);
    });

    return over;
}

function sortObjectByIdent(a: string, b: string): number {
    const packageNameA = getPackageName(a);
    const packageNameB = getPackageName(b);
    if (packageNameA < packageNameB) {
        return -1;
    }

    if (packageNameA > packageNameB) {
        return 1;
    }

    return 0;
}

function sortScriptNames(keys: string[], prefix = ""): string[] {
    const groupMap = new Map<string, string[]>();

    for (const key of keys) {
        const rest = prefix ? key.slice(prefix.length + 1) : key;
        const idx = rest.indexOf(":");
        if (idx > 0) {
            const base = key.slice(0, (prefix ? prefix.length + 1 : 0) + idx);
            if (!groupMap.has(base)) {
                groupMap.set(base, []);
            }

            groupMap.get(base)!.push(key);
        } else {
            if (!groupMap.has(key)) {
                groupMap.set(key, []);
            }

            groupMap.get(key)!.push(key);
        }
    }

    return Array.from(groupMap.keys())
        .sort()
        .flatMap((groupKey) => {
            const children = groupMap.get(groupKey)!;
            if (children.length > 1 && children.some((k) => k !== groupKey && k.startsWith(groupKey + ":"))) {
                const direct = children.filter((k) => k === groupKey || !k.startsWith(groupKey + ":")).sort();
                const nested = children.filter((k) => k.startsWith(groupKey + ":"));
                return [...direct, ...sortScriptNames(nested, groupKey)];
            }

            return children.sort();
        });
}

// --- scripts ------------------------------------------------------------------------------------
const defaultNpmScripts = new Set([
    "install",
    "pack",
    "prepare",
    "publish",
    "restart",
    "shrinkwrap",
    "start",
    "stop",
    "test",
    "uninstall",
    "version",
]);

const onStringArray = (fn: (x: string[]) => any): Transform =>
    (x: any) => (Array.isArray(x) && x.every((item: any) => typeof item === "string") ? fn(x) : x);

const uniq = onStringArray((xs: string[]) => [...new Set(xs)]);
const sortURLObject = sortObjectBy(["type", "url"]);
const sortPeopleObject = sortObjectBy(["name", "email", "url"]);
const onArray = (fn: (x: any[]) => any): Transform => (x: any) => (Array.isArray(x) ? fn(x) : x);
const sortExports: Transform = onObject((exports: AnyObject) => {
    const {paths = [], conditions = []} = objectGroupBy(Object.keys(exports), (key) =>
        key.startsWith(".") ? "paths" : "conditions");

    return Object.fromEntries(
        [...paths, ...sortConditions(conditions)].map((key) => [key, sortExports(exports[key])])
    );
});

const sortObject = sortObjectBy();
const sortDirectories = sortObjectBy(["lib", "bin", "man", "doc", "example", "test"]);
const sortScripts = onObject((scripts: AnyObject, packageJson: AnyObject) => {
    let names = Object.keys(scripts);
    const prefixable = new Set<string>();

    names = names.map((name) => {
        const omitted = name.replace(/^(?:pre|post)/, "");
        if (defaultNpmScripts.has(omitted) || names.includes(omitted)) {
            prefixable.add(omitted);

            return omitted;
        }

        return name;
    });

    if (!hasSequentialScript(packageJson)) {
        names = sortScriptNames(names);
    }

    names = names.flatMap((key) => (prefixable.has(key) ? [`pre${key}`, key, `post${key}`] : [key]));

    return sortObjectKeys(scripts, names);
});

// --- combinators --------------------------------------------------------------------------------
const pipe = (fns: Transform[]): Transform => (x: any, ...args: any[]) => fns.reduce((result, fn) => fn(result, ...args), x);
const wireitScriptProperties = ["command", "dependencies", "files", "output"];
const overProperty = (property: string, over: Transform): Transform =>
    onObject((object: AnyObject, ...args: any[]) =>
        hasOwn(object, property) ? {...object, [property]: over(object[property], ...args)} : object);

const sortWireitScript = pipe([
    sortObjectBy(wireitScriptProperties),
    overProperty("dependencies", onArray((deps: any[]) => deps.map(sortObjectBy(["script", "cascade"])))),
    overProperty(
        "env",
        onObject((env: AnyObject) =>
            sortObjectKeys(
                Object.fromEntries(
                    Object.entries(env).map(([key, value]) => [key, sortObjectBy(["external", "default"])(value)])
                )
            ))
    ),
    overProperty("service", pipe([sortObjectBy(["readyWhen"]), overProperty("readyWhen", sortObject)])),
]);

const sortWireit = onObject((wireit: AnyObject) =>
    sortObjectKeys(
        Object.fromEntries(Object.entries(wireit).map(([name, config]) => [name, sortWireitScript(config)]))
    ));

// --- git hooks ----------------------------------------------------------------------------------
const gitHooks: string[] = [
    "applypatch-msg",
    "pre-applypatch",
    "post-applypatch",
    "pre-commit",
    "pre-merge-commit",
    "prepare-commit-msg",
    "commit-msg",
    "post-commit",
    "pre-rebase",
    "post-checkout",
    "post-merge",
    "pre-push",
    "pre-receive",
    "update",
    "post-receive",
    "post-update",
    "reference-transaction",
    "push-to-checkout",
    "pre-auto-gc",
    "post-rewrite",
    "sendemail-validate",
    "fsmonitor-watchman",
    "p4-changelist",
    "p4-prepare-changelist",
    "p4-post-changelist",
    "p4-pre-submit",
    "post-index-change",
];

const sortGitHooks = sortObjectBy(gitHooks);
const sortPrettierConfig = pipe([
    onObject((config: AnyObject) =>
        sortObjectKeys(config, [
            ...Object.keys(config).filter((key) => key !== "overrides").sort(),
            "overrides",
        ])),
    overProperty(
        "overrides",
        onArray((overrides: any[]) => overrides.map(pipe([sortObject, overProperty("options", sortObject)])))
    ),
]);

// --- eslint / prettier / volta / wireit / devEngines --------------------------------------------
const eslintBaseConfigProperties = [
    "files",
    "excludedFiles",
    "env",
    "parser",
    "parserOptions",
    "settings",
    "plugins",
    "extends",
    "rules",
    "overrides",
    "globals",
    "processor",
    "noInlineConfig",
    "reportUnusedDisableDirectives",
];

const sortEslintConfig: Transform = pipe([
    sortObjectBy(eslintBaseConfigProperties),
    overProperty("env", sortObject),
    overProperty("globals", sortObject),
    overProperty("overrides", onArray((overrides: any[]) => overrides.map((o: any) => sortEslintConfig(o)))),
    overProperty("parserOptions", sortObject),
    overProperty(
        "rules",
        sortObjectBy((rule1: string, rule2: string) =>
            rule1.split("/").length - rule2.split("/").length || rule1.localeCompare(rule2))
    ),
    overProperty("settings", sortObject),
]);

const sortDependencies = onObject((dependencies: AnyObject) => {
    if (Object.keys(dependencies).length < 2) {
        return dependencies;
    }

    return sortObjectKeys(dependencies, (a: string, b: string) => a.localeCompare(b, "en"));
});

const sortArray = onStringArray((array: string[]) => [...array].sort());
const uniqAndSortArray = pipe([uniq, sortArray]);
const sortDevEngines = overProperty("packageManager", sortObjectBy(["name", "version", "onFail"]));
const sortVolta = sortObject;
const sortVSCodeBadgeObject = sortObjectBy(["description", "url", "href"]);

// --- field table --------------------------------------------------------------------------------
const fields: Field[] = [
    {key: "$schema"},
    {key: "name"},
    {key: "displayName"},
    {key: "version"},
    {key: "stableVersion"},
    {key: "private"},
    {key: "description"},
    {key: "categories", over: uniq},
    {key: "keywords", over: uniq},
    {key: "homepage"},
    {key: "bugs", over: sortObjectBy(["url", "email"])},
    {key: "repository", over: sortURLObject},
    {key: "funding", over: sortURLObject},
    {key: "license", over: sortURLObject},
    {key: "qna"},
    {key: "author", over: sortPeopleObject},
    {key: "maintainers", over: onArray((maintainers: any[]) => maintainers.map(sortPeopleObject))},
    {key: "contributors", over: onArray((contributors: any[]) => contributors.map(sortPeopleObject))},
    {key: "publisher"},
    {key: "sideEffects"},
    {key: "type"},
    {key: "imports"},
    {key: "exports", over: sortExports},
    {key: "main"},
    {key: "svelte"},
    {key: "umd:main"},
    {key: "jsdelivr"},
    {key: "unpkg"},
    {key: "module"},
    {key: "source"},
    {key: "jsnext:main"},
    {key: "browser"},
    {key: "react-native"},
    {key: "types"},
    {key: "typesVersions"},
    {key: "typings"},
    {key: "style"},
    {key: "example"},
    {key: "examplestyle"},
    {key: "assets"},
    {key: "bin", over: sortObject},
    {key: "man"},
    {key: "directories", over: sortDirectories},
    {key: "files", over: uniq},
    {key: "workspaces"},
    {
        key: "binary",
        over: sortObjectBy(["module_name", "module_path", "remote_path", "package_name", "host"]),
    },
    {key: "scripts", over: sortScripts},
    {key: "betterScripts", over: sortScripts},
    {key: "wireit", over: sortWireit},
    {key: "l10n"},
    {key: "contributes", over: sortObject},
    {key: "activationEvents", over: uniq},
    {key: "husky", over: overProperty("hooks", sortGitHooks)},
    {key: "simple-git-hooks", over: sortGitHooks},
    {key: "pre-commit"},
    {key: "commitlint", over: sortObject},
    {key: "lint-staged"},
    {key: "nano-staged"},
    {key: "config", over: sortObject},
    {key: "nodemonConfig", over: sortObject},
    {key: "browserify", over: sortObject},
    {key: "babel", over: sortObject},
    {key: "browserslist"},
    {key: "xo", over: sortObject},
    {key: "prettier", over: sortPrettierConfig},
    {key: "eslintConfig", over: sortEslintConfig},
    {key: "eslintIgnore"},
    {key: "npmpkgjsonlint", over: sortObject},
    {key: "npmPackageJsonLintConfig", over: sortObject},
    {key: "npmpackagejsonlint", over: sortObject},
    {key: "release", over: sortObject},
    {key: "remarkConfig", over: sortObject},
    {key: "stylelint"},
    {key: "ava", over: sortObject},
    {key: "jest", over: sortObject},
    {key: "jest-junit", over: sortObject},
    {key: "jest-stare", over: sortObject},
    {key: "mocha", over: sortObject},
    {key: "nyc", over: sortObject},
    {key: "c8", over: sortObject},
    {key: "tap", over: sortObject},
    {key: "oclif", over: sortObjectBy(undefined, true)},
    {key: "resolutions", over: sortObject},
    {key: "overrides", over: sortDependencies},
    {key: "dependencies", over: sortDependencies},
    {key: "devDependencies", over: sortDependencies},
    {key: "dependenciesMeta", over: sortObjectBy(sortObjectByIdent, true)},
    {key: "peerDependencies", over: sortDependencies},
    {key: "peerDependenciesMeta", over: sortObjectBy(undefined, true)},
    {key: "optionalDependencies", over: sortDependencies},
    {key: "bundledDependencies", over: uniqAndSortArray},
    {key: "bundleDependencies", over: uniqAndSortArray},
    {key: "extensionPack", over: uniqAndSortArray},
    {key: "extensionDependencies", over: uniqAndSortArray},
    {key: "flat"},
    {key: "packageManager"},
    {key: "engines", over: sortObject},
    {key: "engineStrict", over: sortObject},
    {key: "devEngines", over: sortDevEngines},
    {key: "volta", over: sortVolta},
    {key: "languageName"},
    {key: "os"},
    {key: "cpu"},
    {key: "preferGlobal", over: sortObject},
    {key: "publishConfig", over: sortObject},
    {key: "icon"},
    {key: "badges", over: onArray((badge: any[]) => badge.map(sortVSCodeBadgeObject))},
    {key: "galleryBanner", over: sortObject},
    {key: "preview"},
    {key: "markdown"},
];

const defaultSortOrder = fields.map(({key}) => key);
const overFields = pipe(
    fields
        .map(({key, over}) => (over ? overProperty(key, over) : undefined))
        .filter(Boolean) as Transform[]
);

/**
 * Sort a parsed package.json object. Top-level keys are ordered by `options.sortOrder` (when given),
 * then the canonical field order, then remaining public keys alphabetically, with private
 * `_`-prefixed keys last; recognized fields are then sorted internally.
 */
export function sortPackageJsonObject(json: AnyObject, options: { sortOrder?: string[] } = {}): AnyObject {
    if (!isPlainObject(json)) {
        return json;
    }

    let sortOrder: string[] = options.sortOrder || defaultSortOrder;
    if (Array.isArray(sortOrder)) {
        const keys = Object.keys(json);
        const {privateKeys = [], publicKeys = []} = objectGroupBy(keys, (key) =>
            key[0] === "_" ? "privateKeys" : "publicKeys");
        sortOrder = [...sortOrder, ...defaultSortOrder, ...publicKeys.sort(), ...privateKeys.sort()];
    }

    return overFields(sortObjectKeys(json, sortOrder), json);
}