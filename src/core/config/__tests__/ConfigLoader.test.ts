/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ConfigDefaults } from "../ConfigDefaults";
import { ConfigLoader } from "../ConfigLoader";


const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock fs module
jest.mock("fs");

describe("ConfigLoader", () => {
    let tempDir: string;
    let configPath: string;

    beforeEach(() => {
        tempDir = path.join(os.tmpdir(), `config-loader-test-${Date.now()}`);
        configPath = path.join(tempDir, ConfigLoader.CONFIG_FILE_NAME);
        jest.clearAllMocks();
    });

    afterEach(() => {
        ConfigLoader.clearCache();
    });

    describe("CONFIG_FILE_NAME", () => {
        it("should have correct config file name", () => {
            expect(ConfigLoader.CONFIG_FILE_NAME).toBe("tsfmt.config.ts");
        });
    });

    describe("hasConfigFile", () => {
        it("should return true when config file exists", () => {
            mockedFs.existsSync.mockReturnValue(true);

            const result = ConfigLoader.hasConfigFile(tempDir);

            expect(result).toBe(true);
            expect(mockedFs.existsSync).toHaveBeenCalledWith(configPath);
        });

        it("should return false when config file does not exist", () => {
            mockedFs.existsSync.mockReturnValue(false);

            const result = ConfigLoader.hasConfigFile(tempDir);

            expect(result).toBe(false);
            expect(mockedFs.existsSync).toHaveBeenCalledWith(configPath);
        });

        it("should use current working directory by default", () => {
            const cwd = process.cwd();
            const expectedPath = path.join(cwd, ConfigLoader.CONFIG_FILE_NAME);
            mockedFs.existsSync.mockReturnValue(true);

            ConfigLoader.hasConfigFile();

            expect(mockedFs.existsSync).toHaveBeenCalledWith(expectedPath);
        });
    });

    describe("getConfigFilePath", () => {
        it("should return correct config file path", () => {
            const result = ConfigLoader.getConfigFilePath(tempDir);

            expect(result).toBe(configPath);
        });

        it("should use current working directory by default", () => {
            const cwd = process.cwd();
            const expected = path.join(cwd, ConfigLoader.CONFIG_FILE_NAME);

            const result = ConfigLoader.getConfigFilePath();

            expect(result).toBe(expected);
        });
    });

    describe("loadConfig", () => {
        it("should return default config when no config file exists", () => {
            mockedFs.existsSync.mockReturnValue(false);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
        });

        it("should load and merge user config when file exists", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            const configContent = `export default ${JSON.stringify(userConfig)};`;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(result.codeStyle?.enabled).toBe(true); // From defaults
        });

        it("should handle TypeScript config files", () => {
            const configContent = `
                import { CoreConfig } from "tsfmt";

                const config: CoreConfig = {
                    codeStyle: {
                        quoteStyle: "single",
                        semicolons: "never"
                    }
                };

                export default config;
            `;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(result.codeStyle?.semicolons).toBe("never");
        });

        it("should fall back to default config on load error", () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error("File read error");
            });

            const consoleSpy = jest.spyOn(console, "error").mockImplementation();

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error loading configuration"));

            consoleSpy.mockRestore();
        });

        it("should validate config by default", () => {
            const invalidConfig = {codeStyle: {quoteStyle: "invalid"}};
            const configContent = `export default ${JSON.stringify(invalidConfig)};`;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            const consoleSpy = jest.spyOn(console, "error").mockImplementation();

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it("should skip validation when requested", () => {
            const invalidConfig = {codeStyle: {quoteStyle: "invalid"}};
            const configContent = `export default ${JSON.stringify(invalidConfig)};`;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            const result = ConfigLoader.loadConfig(tempDir, false);

            expect(result.codeStyle?.quoteStyle).toBe("invalid");
        });
    });

    describe("loadConfigWithoutValidation", () => {
        it("should call loadConfig with validation disabled", () => {
            mockedFs.existsSync.mockReturnValue(false);

            const result = ConfigLoader.loadConfigWithoutValidation(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
        });
    });

    describe("reloadConfig", () => {
        it("should clear cache and reload config", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            const configContent = `export default ${JSON.stringify(userConfig)};`;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            // Load once to populate cache
            ConfigLoader.loadConfig(tempDir);

            // Clear call history
            jest.clearAllMocks();
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            const result = ConfigLoader.reloadConfig(tempDir);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(mockedFs.readFileSync).toHaveBeenCalled(); // Should read file again
        });
    });

    describe("clearCache", () => {
        it("should clear the configuration cache", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            const configContent = `export default ${JSON.stringify(userConfig)};`;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);

            // Load config to populate cache
            ConfigLoader.loadConfig(tempDir);

            // Clear cache
            ConfigLoader.clearCache();

            const stats = ConfigLoader.getCacheStats();
            expect(stats.size).toBe(0);
            expect(stats.keys).toHaveLength(0);
        });
    });

    describe("getCacheStats", () => {
        it("should return cache statistics", () => {
            const stats = ConfigLoader.getCacheStats();

            expect(stats).toHaveProperty("size");
            expect(stats).toHaveProperty("keys");
            expect(typeof stats.size).toBe("number");
            expect(Array.isArray(stats.keys)).toBe(true);
        });
    });

    describe("createSampleConfig", () => {
        it("should create a sample configuration file", () => {
            mockedFs.existsSync.mockReturnValue(false);

            ConfigLoader.createSampleConfig(tempDir);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                configPath,
                expect.stringContaining("const config: CoreConfig"),
                "utf-8"
            );
        });

        it("should throw error if file exists and overwrite is false", () => {
            mockedFs.existsSync.mockReturnValue(true);

            expect(() => {
                ConfigLoader.createSampleConfig(tempDir);
            }).toThrow("Configuration file already exists");
        });

        it("should overwrite existing file when overwrite is true", () => {
            mockedFs.existsSync.mockReturnValue(true);

            ConfigLoader.createSampleConfig(tempDir, true);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                configPath,
                expect.stringContaining("const config: CoreConfig"),
                "utf-8"
            );
        });

        it("should create config with proper TypeScript syntax", () => {
            mockedFs.existsSync.mockReturnValue(false);

            ConfigLoader.createSampleConfig(tempDir);

            const writtenContent = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(writtenContent).toContain('import { CoreConfig } from "tsfmt"');
            expect(writtenContent).toContain("const config: CoreConfig");
            expect(writtenContent).toContain("export default config");
            expect(writtenContent).toContain("indexGeneration:");
            expect(writtenContent).toContain("codeStyle:");
            expect(writtenContent).toContain("imports:");
            expect(writtenContent).toContain("sorting:");
        });
    });

    describe("caching behavior", () => {
        it("should cache loaded configurations", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            const configContent = `export default ${JSON.stringify(userConfig)};`;
            const mtime = new Date(Date.now());

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);
            mockedFs.statSync.mockReturnValue({mtime} as any);

            // Load config twice
            ConfigLoader.loadConfig(tempDir);
            ConfigLoader.loadConfig(tempDir);

            // Should only read file once due to caching
            expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
        });

        it("should reload config when file modification time changes", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            const configContent = `export default ${JSON.stringify(userConfig)};`;

            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configContent);

            // First load with initial mtime
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now() - 1000)} as any);
            ConfigLoader.loadConfig(tempDir);

            // Second load with newer mtime
            mockedFs.statSync.mockReturnValue({mtime: new Date(Date.now())} as any);
            ConfigLoader.loadConfig(tempDir);

            // Should read file twice due to mtime change
            expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
        });
    });
});