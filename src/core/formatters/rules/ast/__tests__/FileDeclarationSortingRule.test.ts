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

        it("matches the pre-migration golden for a plain .ts file's reordered top-level declarations", () => {
            // Captured from the pre-migration `FileDeclarationSortingRule.apply()` (ts.createSourceFile
            // + string-splice reconstruction) on this exact input, with the default sorting config,
            // before the rule was migrated to `applyToContext`. Top-level declarations sit at zero
            // base indentation, so the pre-migration `.trim()` reconstruction and the migrated
            // leading-blank-line-only reconstruction coincide byte-for-byte here; the migrated rule
            // must still reproduce this exactly.
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

            const golden = "\n\ninterface Options {\n    flag: boolean;\n}\n\nfunction helper() {\n    return 1;\n}" +

                "\n\nexport function main() {\n    return helper();\n}\n";

            const result = run(input, "file.ts", defaultConfig());
            expect(result).toBe(golden);
        });
    });
});
