/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import {ConfigDefaults, CoreConfig, FormatterOrder} from "../../config";
import {Container, ServiceRegistration} from "../../di";
import {FormatterPipeline} from "../FormatterPipeline";

describe("FormatterPipeline", () => {
    let tempDir: string;
    let testFilePath: string;
    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "formatter-test-"));
        testFilePath = path.join(tempDir, "test.ts");
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, {recursive: true, force: true});
    });

    describe("initialization", () => {
        it("should initialize with default formatter order", () => {
            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                codeStyle: {enabled: true, quoteStyle: "double"},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const order = pipeline.getFormatterOrder();
            expect(order).toEqual([
                FormatterOrder.IndexGeneration,
                FormatterOrder.CodeStyle,
                FormatterOrder.ImportOrganization,
                FormatterOrder.ASTTransformation,
                FormatterOrder.Spacing,
            ]);
        });

        it("should initialize with custom formatter order", () => {
            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                formatterOrder: [FormatterOrder.Spacing, FormatterOrder.CodeStyle],
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const order = pipeline.getFormatterOrder();
            expect(order).toEqual([FormatterOrder.Spacing, FormatterOrder.CodeStyle]);
        });

        it("should initialize CodeStyleFormatter when enabled", () => {
            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "single"},
                sorting: {enabled: false},
                imports: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const formatters = pipeline.getRulesAtOrder(FormatterOrder.CodeStyle);
            expect(formatters.length).toBeGreaterThan(0);
            expect(formatters[0].name).toBe("QuoteStyleRule");
        });

        it("should initialize ImportOrganizer when enabled", () => {
            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                imports: {enabled: true, sortImports: true},
                sorting: {enabled: false},
                codeStyle: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const formatters = pipeline.getRulesAtOrder(FormatterOrder.ImportOrganization);
            expect(formatters.length).toBeGreaterThan(0);
            expect(formatters[0].name).toBe("ImportOrganizationRule");
        });

        it("should not initialize disabled formatters", () => {
            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: false},
                imports: {enabled: false},
                sorting: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            expect(pipeline.hasRules()).toBe(false);
        });
    });

    describe("formatFile", () => {
        it("should format a file with CodeStyleFormatter", async () => {
            const source = "const foo = 'single quotes';";
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                imports: {enabled: false}, // Disable imports to test only code style
                sorting: {enabled: false}, // Disable sorting for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, false);
            expect(context.changed).toBe(true);
            expect(context.currentSource).toContain('"single quotes"');

            // Should have multiple CodeStyle rule executions
            expect(context.executions.length).toBeGreaterThan(0);
            expect(context.executions[0].formatterName).toBe("QuoteStyleRule");
            expect(context.executions[0].changed).toBe(true);

            // Verify file was written
            const fileContent = await fs.readFile(testFilePath, "utf-8");
            expect(fileContent).toContain('"single quotes"');
        });

        it("should not write to disk in dry-run mode", async () => {
            const source = "const foo = 'single quotes';";
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false}, // Disable sorting for this test
                imports: {enabled: false}, // Disable imports for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, true);
            expect(context.changed).toBe(true);
            expect(context.dryRun).toBe(true);

            // Verify file was NOT written
            const fileContent = await fs.readFile(testFilePath, "utf-8");
            expect(fileContent).toBe(source);
        });

        it("should execute formatters in sequence", async () => {
            const source = `import {foo} from 'bar';\nconst x = 'test';`;
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double", bracketSpacing: true},
                imports: {enabled: true, sortImports: true},
                sorting: {enabled: false}, // Disable sorting for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, false);

            // Should have multiple rules from CodeStyle and ImportOrganization
            expect(context.executions.length).toBeGreaterThan(0);

            // Check that we have executions from both orders
            const codeStyleExecutions = context.executions.filter(e => e.order === FormatterOrder.CodeStyle);
            const importExecutions = context.executions.filter(e => e.order === FormatterOrder.ImportOrganization);

            expect(codeStyleExecutions.length).toBeGreaterThan(0);
            expect(importExecutions.length).toBeGreaterThan(0);
        });

        it("should preserve original source on formatter error (fail-fast)", async () => {
            const source = "const foo = 'test';";
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false}, // Disable sorting for this test
                imports: {enabled: false}, // Disable imports for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);

            // Mock a formatter error by using an invalid file path
            const invalidPath = path.join(tempDir, "nonexistent.ts");
            await expect(pipeline.formatFile(invalidPath, false)).rejects.toThrow();

            // Original file should be unchanged
            const fileContent = await fs.readFile(testFilePath, "utf-8");
            expect(fileContent).toBe(source);
        });

        it("should track unchanged files", async () => {
            const source = 'const foo = "already double quotes";';
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false}, // Disable sorting for this test
                imports: {enabled: false}, // Disable imports for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, false);
            expect(context.changed).toBe(false);
            expect(context.executions[0].changed).toBe(false);
        });

        it("should skip formatting files with // tsfmt-ignore comment", async () => {
            const source = "// tsfmt-ignore\nconst foo = 'single quotes';";
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false},
                imports: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, false);
            expect(context.changed).toBe(false);
            expect(context.executions).toHaveLength(0);
            expect(context.currentSource).toBe(source);

            const fileContent = await fs.readFile(testFilePath, "utf-8");
            expect(fileContent).toBe(source);
        });

        it("should skip formatting files with /* tsfmt-ignore */ comment", async () => {
            const source = "/* tsfmt-ignore */\nconst foo = 'single quotes';";
            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false},
                imports: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, false);
            expect(context.changed).toBe(false);
            expect(context.executions).toHaveLength(0);
        });

        it("should skip formatting files with tsfmt-ignore in header comment", async () => {
            const source = [
                "/*",
                "* Copyright notice",
                "* tsfmt-ignore",
                "*/",
                "const foo = 'single quotes';"
            ].join("\n");

            await fs.writeFile(testFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false},
                imports: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(testFilePath, false);
            expect(context.changed).toBe(false);
            expect(context.executions).toHaveLength(0);
        });

        it("should format a .tsx file through the full pipeline with valid, unbroken JSX", async () => {
            const tsxFilePath = path.join(tempDir, "component.tsx");
            const source = "function Component() {\n" +

                "    const label = 'hello';\n" +
                "    return <div className='wrapper' title=\"tooltip\">{'child text'}<span>literal jsx text</span></div>;\n" +
                "}";
            await fs.writeFile(tsxFilePath, source, "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                imports: {enabled: false},
                sorting: {enabled: false},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const context = await pipeline.formatFile(tsxFilePath, false);
            expect(context.changed).toBe(true);

            // Quote conversion applied to the code-level string literal
            expect(context.currentSource).toContain('const label = "hello";');

            // JSX attribute quotes are preserved, not touched by quote conversion
            expect(context.currentSource).toContain("className='wrapper'");
            expect(context.currentSource).toContain('title="tooltip"');

            // JSX structure remains valid and unbroken
            expect(context.currentSource).toContain("<span>literal jsx text</span>");
            expect(context.currentSource).toContain("</div>;");

            const fileContent = await fs.readFile(tsxFilePath, "utf-8");
            expect(fileContent).toBe(context.currentSource);
        });
    });

    describe("formatFiles", () => {
        it("should format multiple files", async () => {
            const file1 = path.join(tempDir, "file1.ts");
            const file2 = path.join(tempDir, "file2.ts");

            await fs.writeFile(file1, "const a = 'test';", "utf-8");
            await fs.writeFile(file2, "const b = 'test';", "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false}, // Disable sorting for this test
                imports: {enabled: false}, // Disable imports for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const contexts = await pipeline.formatFiles([file1, file2], false);
            expect(contexts).toHaveLength(2);
            expect(contexts[0].changed).toBe(true);
            expect(contexts[1].changed).toBe(true);
        });
    });

    describe("formatDirectory", () => {
        it("should format all files in a directory", async () => {
            const subDir = path.join(tempDir, "src");
            await fs.mkdir(subDir);

            const file1 = path.join(subDir, "file1.ts");
            const file2 = path.join(subDir, "file2.tsx");

            await fs.writeFile(file1, "const a = 'test';", "utf-8");
            await fs.writeFile(file2, "const b = 'test';", "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false}, // Disable sorting for this test
                imports: {enabled: false}, // Disable imports for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const contexts = await pipeline.formatDirectory(subDir, false);
            expect(contexts.length).toBeGreaterThanOrEqual(2);
        });

        it("should skip node_modules directory", async () => {
            const nodeModules = path.join(tempDir, "node_modules");
            await fs.mkdir(nodeModules);
            await fs.writeFile(path.join(nodeModules, "test.ts"), "const a = 'test';", "utf-8");

            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                spacing: {enabled: false},
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            const contexts = await pipeline.formatDirectory(tempDir, false);
            expect(contexts).toHaveLength(0);
        });
    });

    describe("error handling", () => {
        it("should throw error on file read failure", async () => {
            const invalidPath = path.join(tempDir, "nonexistent.ts");
            const config: CoreConfig = {
                ...ConfigDefaults.getDefaultConfig(),
                indexGeneration: {enabled: false},
                codeStyle: {enabled: true, quoteStyle: "double"},
                sorting: {enabled: false}, // Disable sorting for this test
                imports: {enabled: false}, // Disable imports for this test
                spacing: {enabled: false}, // Disable spacing for this test
            };

            const container = new Container();
            ServiceRegistration.registerServices(container, config);

            const pipeline = new FormatterPipeline(config, container);
            await expect(pipeline.formatFile(invalidPath, false)).rejects.toThrow();
        });
    });
});