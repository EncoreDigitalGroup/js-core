/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import {CoreConfig, ConfigDefaults} from "../../../../config";
import {Container} from "../../../../di";
import {FormatContext} from "../../../FormatContext";
import {ClassMemberSortingRule} from "../ClassMemberSortingRule";

describe("ClassMemberSortingRule", () => {
    function run(source: string, filePath: string, config: CoreConfig): string {
        const container = new Container();
        container.singleton<CoreConfig>(config);

        const rule = new ClassMemberSortingRule(container);
        const context = new FormatContext(source, filePath);
        rule.applyToContext(context);

        return context.getText();
    }

    function defaultConfig(): CoreConfig {
        return {...ConfigDefaults.getDefaultConfig()};
    }

    describe("applyToContext", () => {
        it("reorders members and preserves the class body's indentation (never flattens to column 0)", () => {
            const input = `class Widget {
    render() {
        return 1;
    }

    constructor() {
        this.value = 0;
    }

    static defaultLabel = "widget";

    value: number;
}
`;

            const result = run(input, "widget.ts", defaultConfig());

            // Reordering did happen: the static property now comes first.
            expect(result.indexOf("static defaultLabel")).toBeLessThan(result.indexOf("value: number"));
            expect(result.indexOf("value: number")).toBeLessThan(result.indexOf("constructor()"));
            expect(result.indexOf("constructor()")).toBeLessThan(result.indexOf("render()"));

            // Every reordered member starts indented one level into the class body, not at column 0.
            expect(result).not.toMatch(/^static defaultLabel/m);
            expect(result).not.toMatch(/^value: number/m);
            expect(result).not.toMatch(/^constructor\(\)/m);
            expect(result).not.toMatch(/^render\(\)/m);
            expect(result).toContain("\n    static defaultLabel");
            expect(result).toContain("\n    value: number");
            expect(result).toContain("\n    constructor()");
            expect(result).toContain("\n    render()");
        });

        it("preserves a JSX render body verbatim (including its internal indentation) after reordering a .tsx class component's members", () => {
            const input = `class Widget extends React.Component {
    render() {
        return (
            <div className="widget">
                <span>{this.value}</span>
            </div>
        );
    }

    constructor(props: any) {
        super(props);
        this.value = 0;
    }

    static defaultLabel = "widget";

    value: number;
}
`;

            const result = run(input, "widget.tsx", defaultConfig());

            // Reordering happened (render is no longer the first member).
            expect(result.indexOf("static defaultLabel")).toBeLessThan(result.indexOf("render()"));

            // The render method itself is re-indented to the class body's indent, not column 0.
            expect(result).toContain("\n    render()");
            expect(result).not.toMatch(/^render\(\)/m);

            // The JSX inside the render body is byte-for-byte untouched, at its original indentation.
            const originalJsxBody = `        return (
            <div className="widget">
                <span>{this.value}</span>
            </div>
        );
    }`;

            expect(result).toContain(originalJsxBody);
        });

        it("leaves a plain .ts class untouched when no reordering is required — matching the pre-migration golden", () => {
            // Captured from the pre-migration `ClassMemberSortingRule.apply()` (ts.createSourceFile +
            // string-splice reconstruction) on this exact input, with the default sorting config,
            // before the rule was migrated to `applyToContext`. Members are already in the
            // configured order, so both the pre- and post-migration rule are a no-op here — the
            // migrated rule must still reproduce this byte-for-byte.
            const input = `class Widget {
    static defaultLabel = "widget";

    value: number;

    constructor() {
        this.value = 0;
    }

    render() {
        return 1;
    }
}
`;

            const golden = input;
            const result = run(input, "widget.ts", defaultConfig());
            expect(result).toBe(golden);
        });
    });
});