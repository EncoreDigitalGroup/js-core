/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig, ConfigDefaults} from "../../../../config";
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
    });
});