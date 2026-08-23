/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {ConfigDefaults, CoreConfig} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {FileDeclarationSortingRule} from "../FileDeclarationSortingRule";

describe("FileDeclarationSortingRule", () => {
    function run(source: string, filePath: string, config: CoreConfig): string {
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new FileDeclarationSortingRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    function defaultConfig(): CoreConfig {
        return {...ConfigDefaults.getDefaultConfig()};
    }

    describe("applyToContext", () => {
        it("reorders top-level declarations according to the configured type order", () => {
            const input = `function helper() {
    return 1;
}

export function main() {
    return helper();
}

interface Options {
    flag: boolean;
}
`;

            const result = run(input, "file.ts", defaultConfig());
            expect(result.indexOf("interface Options")).toBeLessThan(result.indexOf("function helper()"));
            expect(result.indexOf("function helper()")).toBeLessThan(result.indexOf("export function main()"));
        });

        it("places a .tsx component file's default-exported component last and its helper/interface declarations correctly, preserving JSX verbatim", () => {
            const input = `export default function App() {
    return (
        <div className="app">
            {helper()}
        </div>
    );
}

function helper() {
    return "hi";
}

interface Props {
    name: string;
}
`;

            const result = run(input, "App.tsx", defaultConfig());

            // Interface first, then the helper function, then the default-exported component last.
            expect(result.indexOf("interface Props")).toBeLessThan(result.indexOf("function helper()"));
            expect(result.indexOf("function helper()")).toBeLessThan(result.indexOf("export default function App()"));

            // The JSX inside the default export's body is byte-for-byte untouched.
            const originalJsxBody = `    return (
        <div className="app">
            {helper()}
        </div>
    );
}`;

            expect(result).toContain(originalJsxBody);
        });

        it("reorders a plain .ts file's top-level declarations without adding leading blank lines", () => {
            // This input has no imports and no leading comment, so the reordered output must begin
            // directly with the first sorted declaration — no spurious blank lines at the top of the
            // file (the pre-fix reconstruction prepended an unconditional "\n\n" here).
            const input = `function helper() {
    return 1;
}

export function main() {
    return helper();
}

interface Options {
    flag: boolean;
}
`;

            const golden = "interface Options {\n    flag: boolean;\n}\n\nfunction helper() {\n    return 1;\n}" +

                "\n\nexport function main() {\n    return helper();\n}\n";

            const result = run(input, "file.ts", defaultConfig());
            expect(result).toBe(golden);
        });

        it("keeps the file's leading comment header pinned at the top when there are no imports", () => {
            // The license/header block is the leading trivia of the first declaration in an
            // import-less file; sorting must not carry it away with that declaration.
            const input = `/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

/*
 * File-level doc.
 */
type AnyObject = Record<string, unknown>;

interface Field {
    key: string;
}
`;

            const result = run(input, "file.ts", defaultConfig());

            // Header stays at the very top; the interface still sorts ahead of the type alias below it.
            expect(result.startsWith("/*\n * Copyright (c) 2026. Encore Digital Group.")).toBe(true);
            expect(result.indexOf("interface Field")).toBeLessThan(result.indexOf("type AnyObject"));

            // Running the rule again is a no-op (the header does not drift on re-format).
            expect(run(result, "file.ts", defaultConfig())).toBe(result);
        });

        it("moves the first declaration's attached doc comment with it, keeping only the file header pinned", () => {
            // The first declaration (Zebra) owns a doc comment directly above it (no blank line) and
            // sorts after the interface below it. The file header — the copyright block, separated by
            // a blank line — must stay pinned at the top, but Zebra's own doc comment must travel with
            // Zebra rather than being left orphaned at the top. This reproduces the defect where the
            // first declaration's doc comment was absorbed into the pinned header.
            const input = `/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

/** Doc for Zebra enum. */
export enum Zebra {
    A = "a",
}

/** Doc for Alpha interface. */
export interface Alpha {
    x: number;
}
`;

            const result = run(input, "file.ts", defaultConfig());

            // The copyright header stays pinned at the very top.
            expect(result.startsWith("/*\n * Copyright (c) 2026. Encore Digital Group.")).toBe(true);

            // The interface sorts ahead of the enum, so the enum (originally first) moved.
            expect(result.indexOf("export interface Alpha")).toBeLessThan(result.indexOf("export enum Zebra"));

            // Each declaration's doc comment stays glued directly above it — nothing orphaned.
            expect(result).toContain("/** Doc for Zebra enum. */\nexport enum Zebra {");
            expect(result).toContain("/** Doc for Alpha interface. */\nexport interface Alpha {");

            // The copyright header is not duplicated, and the enum's doc comment did not stay behind
            // at the top of the file (it must sit with the enum, after the interface).
            expect(result.split("Copyright (c) 2026").length - 1).toBe(1);
            expect(result.indexOf("/** Doc for Zebra enum. */")).toBeGreaterThan(result.indexOf("export interface Alpha"));

            // Re-formatting is a no-op.
            expect(run(result, "file.ts", defaultConfig())).toBe(result);
        });
    });
});