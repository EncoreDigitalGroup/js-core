/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {describe, expect, it} from "bun:test";
import {ConfigDefaults, CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {ImportOrganizationRule} from "../ImportOrganizationRule";

describe("ImportOrganizationRule", () => {
    function run(source: string, filePath: string, config: CoreConfig): string {
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new ImportOrganizationRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    function defaultConfig(overrides?: Partial<NonNullable<CoreConfig["imports"]>>): CoreConfig {
        return {
            ...ConfigDefaults.getDefaultConfig(),
            imports: {...ConfigDefaults.getDefaultImportConfig(), ...overrides},
        };
    }

    describe("applyToContext", () => {
        it("preserves an import used only inside JSX (not deleted as unused)", () => {
            // Under plain ts.ScriptKind.TS parsing (the pre-migration parser), adjacent sibling
            // JSX elements like this cause TypeScript's error-recovery parser to drop the
            // "Button" identifier entirely, so the old rule deleted this import as unused.
            // Parsing as TSX through the shared FormatContext fixes this at the root.
            const input = `import { Header } from "./Header";
import { Button } from "./Button";


export function App() {
    return <Layout><Header/><Button/></Layout>;
}
`;

            const config = defaultConfig();
            const result = run(input, "test.tsx", config);
            expect(result).toContain('import { Header } from "./Header";');
            expect(result).toContain('import { Button } from "./Button";');
        });

        it("removes a genuinely unused import", () => {
            const input = `import { used } from "./used";
import { unused } from "./unused";


export function run() {
    return used();
}
`;

            const config = defaultConfig();
            const result = run(input, "test.ts", config);
            expect(result).toContain('import { used } from "./used";');
            expect(result).not.toContain("unused");
        });

        it("preserves a side-effect import even when nothing references it", () => {
            const input = `import "./polyfill";
import { used } from "./used";


export function run() {
    return used();
}
`;

            const config = defaultConfig();
            const result = run(input, "test.ts", config);
            expect(result).toContain('import "./polyfill";');
        });

        it("preserves statements interleaved between imports and groups the imports at the top", () => {
            // A `vi.hoisted` const and a `vi.mock` call sit between two imports — common in Vitest
            // test files. The import-block span covers them, so they must be re-emitted (below the
            // organized imports), never dropped as the old whole-span replacement did.
            const input = `import {describe, test, vi} from "vitest";
import {expectVisit} from "../support";

const {routerVisit} = vi.hoisted(() => ({
    routerVisit: vi.fn(),
}));

vi.mock("@inertiajs/react", () => ({
    router: {visit: routerVisit},
}));

import {navigate} from "./navigate";

describe("navigate", (): void => {
    test("x", (): void => {
        navigate(1);
        expectVisit(routerVisit, 1);
    });
});
`;

            const config = defaultConfig();
            const result = run(input, "test.ts", config);

            expect(result).toContain("vi.hoisted");
            expect(result).toContain('vi.mock("@inertiajs/react"');
            expect(result).toContain('import {navigate} from "./navigate";');

            // All three imports are consolidated at the top, above the interleaved statements.
            const lastImportIndex = result.lastIndexOf("import {navigate}");
            const hoistedIndex = result.indexOf("vi.hoisted");
            const mockIndex = result.indexOf("vi.mock(");

            expect(lastImportIndex).toBeGreaterThan(-1);
            expect(lastImportIndex).toBeLessThan(hoistedIndex);
            expect(hoistedIndex).toBeLessThan(mockIndex);
        });

        it("groups imports according to the configured group order", () => {
            const input = `import { relB } from "./b";
import { relA } from "./a";
import { extB } from "extB";
import { extA } from "extA";
import { intB } from "@/b";
import { intA } from "@/a";


export function use() {
    return relB() + relA() + extB() + extA() + intB() + intA();
}
`;

            const config = defaultConfig({groupOrder: ["relative", "internal", "external"]});
            const result = run(input, "test.ts", config);
            const relIndex = result.indexOf('"./a"');
            const intIndex = result.indexOf('"@/a"');
            const extIndex = result.indexOf('"extA"');

            expect(relIndex).toBeGreaterThan(-1);
            expect(intIndex).toBeGreaterThan(-1);
            expect(extIndex).toBeGreaterThan(-1);
            expect(relIndex).toBeLessThan(intIndex);
            expect(intIndex).toBeLessThan(extIndex);
        });

        it("sorts named specifiers within a single import, placing an inline type by its name", () => {
            const input = `import {useEffect, useMemo, useRef, useState, type ReactElement} from "react";


export function C() {
    useEffect(useMemo(useRef(useState())));
    const x: ReactElement = null;
    return x;
}
`;

            const result = run(input, "test.tsx", defaultConfig());
            expect(result).toContain("import {type ReactElement, useEffect, useMemo, useRef, useState} from \"react\";");
        });

        it("sorts named specifiers by imported name for aliased specifiers", () => {
            const input = `import {zebra as z, apple as a} from "mod";


export function C() {
    return z() + a();
}
`;

            const result = run(input, "test.ts", defaultConfig());
            expect(result).toContain("import {apple as a, zebra as z} from \"mod\";");
        });

        it("leaves a multi-line named-import clause untouched (never collapsed onto one line)", () => {
            const input = `import {
    useState,
    useEffect,
} from "react";


export function C() {
    return useState(useEffect());
}
`;

            const result = run(input, "test.tsx", defaultConfig());
            expect(result).toContain("import {\n    useState,\n    useEffect,\n} from \"react\";");
        });

        it("merges multiple imports from the same module into one statement", () => {
            const input = `import D from "x";
import {a} from "x";
import {b, c} from "x";


export function C() {
    return D + a + b + c;
}
`;

            const result = run(input, "test.ts", defaultConfig());
            expect(result).toContain("import D, {a, b, c} from \"x\";");
            expect(result).not.toMatch(/import \{a\} from "x"/);
        });

        it("keeps value and type-only imports of the same module in separate merged statements", () => {
            const input = `import {a} from "x";
import type {T1} from "x";
import type {T2} from "x";


export function C() {
    const t: T1 | T2 = a;
    return t;
}
`;

            const result = run(input, "test.ts", defaultConfig());
            expect(result).toContain("import {a} from \"x\";");
            expect(result).toContain("import type {T1, T2} from \"x\";");
        });

        it("never drops an import when conflicting defaults block a merge", () => {
            const input = `import D from "x";
import Ns from "x";
import {a} from "x";


export function C() {
    return D + Ns + a;
}
`;

            const result = run(input, "test.ts", defaultConfig());
            expect(result).toContain("import D from \"x\";");
            expect(result).toContain("import Ns from \"x\";");
            expect(result).toContain("import {a} from \"x\";");
        });

        it("does not merge when mergeDuplicates is false", () => {
            const input = `import {a} from "x";
import {b} from "x";


export function C() {
    return a + b;
}
`;

            const result = run(input, "test.ts", defaultConfig({mergeDuplicates: false}));
            expect(result).toContain("import {a} from \"x\";");
            expect(result).toContain("import {b} from \"x\";");
        });

        describe("plain .ts output matches the pre-migration golden", () => {
            // Captured from the pre-migration `ImportOrganizationRule.apply()` (ts.createSourceFile
            // + hand-rolled printer reconstruction) on these exact inputs, with the default import
            // config, before the rule was migrated to `applyToContext`. The migrated rule must
            // reproduce this byte-for-byte for plain .ts files.
            it("matches the golden for an unused import removed among used ones", () => {
                const input = `import { readFile } from "fs";
import React from "react";
import { helper } from "./helper";
import "./styles.css";
import { unusedThing } from "./unused";


export function App() {
    readFile("x", () => {});
    return React.createElement("div", null, helper());
}
`;

                const golden = "import { readFile } from \"fs\";\nimport React from \"react\";" +

                    "\nimport { helper } from \"./helper\";\nimport \"./styles.css\";\n\n\n" +
                    "export function App() {\n    readFile(\"x\", () => {});\n" +
                    "    return React.createElement(\"div\", null, helper());\n}\n";

                const result = run(input, "test.ts", defaultConfig());
                expect(result).toBe(golden);
            });

            it("matches the golden for a side-effect import combined with alphabetical sort", () => {
                const input = `import "./polyfill";
import { z } from "zzz";
import { a } from "aaa";


export function use() {
    return z() + a();
}
`;

                const golden = "import { a } from \"aaa\";\nimport { z } from \"zzz\";\n" +

                    "import \"./polyfill\";\n\n\nexport function use() {\n" +
                    "    return z() + a();\n}\n";

                const result = run(input, "test.ts", defaultConfig());
                expect(result).toBe(golden);
            });

            it("matches the golden when separateGroups is enabled", () => {
                const input = `import { readFile } from "fs";
import React from "react";
import { helper } from "./helper";
import "./styles.css";
import { unusedThing } from "./unused";


export function App() {
    readFile("x", () => {});
    return React.createElement("div", null, helper());
}
`;

                const golden = "import { readFile } from \"fs\";\nimport React from \"react\";\n\n" +

                    "import { helper } from \"./helper\";\nimport \"./styles.css\";\n\n\n" +
                    "export function App() {\n    readFile(\"x\", () => {});\n" +
                    "    return React.createElement(\"div\", null, helper());\n}\n";

                const result = run(input, "test.ts", defaultConfig({separateGroups: true}));
                expect(result).toBe(golden);
            });

            it("matches the golden for default group order (external, internal, relative)", () => {
                const input = `import { relB } from "./b";
import { relA } from "./a";
import { extB } from "extB";
import { extA } from "extA";
import { intB } from "@/b";
import { intA } from "@/a";


export function use() {
    return relB() + relA() + extB() + extA() + intB() + intA();
}
`;

                const golden = "import { extA } from \"extA\";\nimport { extB } from \"extB\";" +

                    "\nimport { intA } from \"@/a\";\nimport { intB } from \"@/b\";" +
                    "\nimport { relA } from \"./a\";\nimport { relB } from \"./b\";\n\n\n" +
                    "export function use() {\n    return relB() + relA() + extB() + extA() + intB() + intA();\n}\n";

                const result = run(input, "test.ts", defaultConfig());
                expect(result).toBe(golden);
            });
        });
    });
});