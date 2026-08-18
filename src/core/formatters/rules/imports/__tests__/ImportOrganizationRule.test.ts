/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
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
