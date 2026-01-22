/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import { CoreConfig } from "../../../../config";
import { Container } from "../../../../di";
import { StructuralIndentationRule } from "../StructuralIndentationRule";


describe("StructuralIndentationRule", () => {
    let rule: StructuralIndentationRule;
    let container: Container;
    let config: CoreConfig;

    beforeEach(() => {
        container = new Container();
        config = {
            codeStyle: {
                enabled: true,
                indentStyle: "space",
                indentWidth: 4
            }
        } as CoreConfig;
        container.singleton<CoreConfig>(config);
        rule = new StructuralIndentationRule(container);
    });

    describe("apply", () => {
        it("should fix a single misaligned closing brace", () => {
            const input = `function test() {
    const obj = {
        a: 1
};
    return obj;
}`;

            const expected = `function test() {
    const obj = {
        a: 1
    };
    return obj;
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should fix nested misaligned closing braces", () => {
            const input = `function test() {
    const outer = {
        inner: {
            value: 1
}
};
    return outer;
}`;

            const expected = `function test() {
    const outer = {
        inner: {
            value: 1
        }
    };
    return outer;
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should fix deeply nested structures", () => {
            const input = `const obj = {
    a: {
        b: {
            c: {
                d: 1
}
}
}
};`;

            const expected = `const obj = {
    a: {
        b: {
            c: {
                d: 1
            }
        }
    }
};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should fix misaligned array brackets", () => {
            const input = `const arr = [
    1,
    2,
    3
];`;

            const expected = `const arr = [
    1,
    2,
    3
];`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should fix nested array brackets", () => {
            const input = `const matrix = [
    [1, 2],
    [3, 4]
];`;

            const expected = `const matrix = [
    [1, 2],
    [3, 4]
];`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should fix mixed bracket types", () => {
            const input = `function test() {
    const obj = {
        arr: [
            1,
            2
]
};
    return obj;
}`;

            const expected = `function test() {
    const obj = {
        arr: [
            1,
            2
        ]
    };
    return obj;
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should not modify correctly indented code", () => {
            const input = `function test() {
    const obj = {
        a: 1,
        b: 2
    };
    return obj;
}`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });

        it("should ignore braces inside string literals", () => {
            const input = `const str = "{ not a real brace }";
const obj = {
    value: 1
};`;

            const expected = `const str = "{ not a real brace }";
const obj = {
    value: 1
};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should ignore braces inside template literals", () => {
            const input = `const template = \`{
    fake brace
}\`;
const obj = {
    value: 1
};`;

            const expected = `const template = \`{
    fake brace
}\`;
const obj = {
    value: 1
};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should ignore braces inside single-line comments", () => {
            const input = `// { comment brace }
const obj = {
    value: 1
};`;

            const expected = `// { comment brace }
const obj = {
    value: 1
};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should ignore braces inside multi-line comments", () => {
            const input = `/*
 * { comment brace }
 */
const obj = {
    value: 1
};`;

            const expected = `/*
 * { comment brace }
 */
const obj = {
    value: 1
};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle class declarations", () => {
            const input = `class Example {
    method() {
        return {
            a: 1
};
}
}`;

            const expected = `class Example {
    method() {
        return {
            a: 1
        };
    }
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle if statements", () => {
            const input = `function test() {
    if (condition) {
        doSomething();
}
}`;

            const expected = `function test() {
    if (condition) {
        doSomething();
    }
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle arrow functions", () => {
            const input = `const fn = () => {
    return {
        value: 1
};
};`;

            const expected = `const fn = () => {
    return {
        value: 1
    };
};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle empty source code", () => {
            const result = rule.apply("");
            expect(result).toBe("");
        });

        it("should handle source code without braces", () => {
            const input = `const x = 1;
const y = 2;`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });

        it("should handle single-line objects (no change needed)", () => {
            const input = `const obj = { a: 1, b: 2 };`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });

        it("should handle multiple closing brackets on same line at column 0", () => {
            const input = `const obj = {
    nested: {
        value: 1
}};`;

            const expected = `const obj = {
    nested: {
        value: 1
    }};`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should preserve trailing content after closing braces", () => {
            const input = `const obj = {
    a: 1
}; // trailing comment`;

            const expected = `const obj = {
    a: 1
}; // trailing comment`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle interface declarations", () => {
            const input = `interface Example {
    prop: {
        nested: string;
};
}`;

            const expected = `interface Example {
    prop: {
        nested: string;
    };
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });

        it("should handle try-catch blocks", () => {
            const input = `function test() {
    try {
        doSomething();
} catch (e) {
        handleError();
}
}`;

            const expected = `function test() {
    try {
        doSomething();
    } catch (e) {
        handleError();
    }
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });
    });

    describe("with tab indentation", () => {
        beforeEach(() => {
            config = {
                codeStyle: {
                    enabled: true,
                    indentStyle: "tab",
                    indentWidth: 4
                }
            } as CoreConfig;
            container = new Container();
            container.singleton<CoreConfig>(config);
            rule = new StructuralIndentationRule(container);
        });

        it("should fix misaligned braces using tabs", () => {
            const input = `function test() {
\tconst obj = {
\t\ta: 1
};
\treturn obj;
}`;

            const expected = `function test() {
\tconst obj = {
\t\ta: 1
\t};
\treturn obj;
}`;

            const result = rule.apply(input);
            expect(result).toBe(expected);
        });
    });

    describe("disabled config", () => {
        it("should return source unchanged when indentStyle is not set", () => {
            config = {
                codeStyle: {
                    enabled: true,
                    indentWidth: 4
                }
            } as CoreConfig;
            container = new Container();
            container.singleton<CoreConfig>(config);
            rule = new StructuralIndentationRule(container);

            const input = `const obj = {
    a: 1
};`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });

        it("should return source unchanged when indentWidth is not set", () => {
            config = {
                codeStyle: {
                    enabled: true,
                    indentStyle: "space"
                }
            } as CoreConfig;
            container = new Container();
            container.singleton<CoreConfig>(config);
            rule = new StructuralIndentationRule(container);

            const input = `const obj = {
    a: 1
};`;

            const result = rule.apply(input);
            expect(result).toBe(input);
        });
    });
});
