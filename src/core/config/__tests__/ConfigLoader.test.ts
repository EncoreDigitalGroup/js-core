/*
* Copyright (c) 2026. Encore Digital Group.
* All Rights Reserved.
*/

import {afterEach, beforeEach, describe, expect, it, spyOn} from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {ConfigDefaults} from "../ConfigDefaults";
import {ConfigLoader} from "../ConfigLoader";


describe("ConfigLoader", () => {
    let tempDir: string;
    let configPath: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-loader-test-"));
        configPath = path.join(tempDir, ConfigLoader.CONFIG_FILE_NAME);
    });

    afterEach(() => {
        ConfigLoader.clearCache();
        fs.rmSync(tempDir, {recursive: true, force: true});
    });

    describe("CONFIG_FILE_NAME", () => {
        it("should have correct config file name", () => {
            expect(ConfigLoader.CONFIG_FILE_NAME).toBe("tsfmt.config.ts");
        });
    });

    describe("hasConfigFile", () => {
        it("should return true when config file exists", () => {
            fs.writeFileSync(configPath, "export default {};");

            const result = ConfigLoader.hasConfigFile(tempDir);

            expect(result).toBe(true);
        });

        it("should return false when config file does not exist", () => {
            const result = ConfigLoader.hasConfigFile(tempDir);

            expect(result).toBe(false);
        });

        it("should use current working directory by default", () => {
            const cwd = process.cwd();
            const expectedPath = path.join(cwd, ConfigLoader.CONFIG_FILE_NAME);
            const existsSpy = spyOn(fs, "existsSync").mockReturnValue(true);

            ConfigLoader.hasConfigFile();

            expect(existsSpy).toHaveBeenCalledWith(expectedPath);
            existsSpy.mockRestore();
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
            const result = ConfigLoader.loadConfig(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
        });

        it("should load and merge user config when file exists", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(userConfig)};`);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(result.codeStyle?.enabled).toBe(true);
        });

        it("should handle TypeScript config files", () => {
            const configContent = `
                import { tsfmt } from "tsfmt";

                export default tsfmt({
                    codeStyle: {
                        quoteStyle: "single",
                        semicolons: "never"
                    }
                });
            `;
            fs.writeFileSync(configPath, configContent);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(result.codeStyle?.semicolons).toBe("never");
        });

        it("should fall back to default config on load error", () => {
            fs.writeFileSync(configPath, "throw new Error('File read error');");

            const consoleSpy = spyOn(console, "error").mockImplementation(() => undefined);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error loading configuration"));

            consoleSpy.mockRestore();
        });

        it("should validate config by default", () => {
            const invalidConfig = {codeStyle: {quoteStyle: "invalid"}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(invalidConfig)};`);

            const consoleSpy = spyOn(console, "error").mockImplementation(() => undefined);

            const result = ConfigLoader.loadConfig(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it("should skip validation when requested", () => {
            const invalidConfig = {codeStyle: {quoteStyle: "invalid"}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(invalidConfig)};`);

            const result = ConfigLoader.loadConfig(tempDir, false);

            expect(result.codeStyle?.quoteStyle).toBe("invalid");
        });
    });

    describe("loadConfigWithoutValidation", () => {
        it("should call loadConfig with validation disabled", () => {
            const result = ConfigLoader.loadConfigWithoutValidation(tempDir);

            expect(result).toEqual(ConfigDefaults.getDefaultConfig());
        });
    });

    describe("reloadConfig", () => {
        it("should clear cache and reload config", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(userConfig)};`);

            ConfigLoader.loadConfig(tempDir);

            const readSpy = spyOn(fs, "readFileSync");

            const result = ConfigLoader.reloadConfig(tempDir);

            expect(result.codeStyle?.quoteStyle).toBe("single");
            expect(readSpy).toHaveBeenCalled();

            readSpy.mockRestore();
        });
    });

    describe("clearCache", () => {
        it("should clear the configuration cache", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(userConfig)};`);

            ConfigLoader.loadConfig(tempDir);

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
            ConfigLoader.createSampleConfig(tempDir);

            expect(fs.existsSync(configPath)).toBe(true);
            expect(fs.readFileSync(configPath, "utf-8")).toContain("export default tsfmt({");
        });

        it("should throw error if file exists and overwrite is false", () => {
            fs.writeFileSync(configPath, "export default {};");

            expect(() => {
                ConfigLoader.createSampleConfig(tempDir);
            }).toThrow("Configuration file already exists");
        });

        it("should overwrite existing file when overwrite is true", () => {
            fs.writeFileSync(configPath, "export default {};");

            ConfigLoader.createSampleConfig(tempDir, true);

            expect(fs.readFileSync(configPath, "utf-8")).toContain("export default tsfmt({");
        });

        it("should create config with proper TypeScript syntax", () => {
            ConfigLoader.createSampleConfig(tempDir);

            const writtenContent = fs.readFileSync(configPath, "utf-8");
            expect(writtenContent).toContain('import { tsfmt } from "tsfmt"');
            expect(writtenContent).toContain("export default tsfmt({");
            expect(writtenContent).toContain("indexGeneration:");
            expect(writtenContent).toContain("codeStyle:");
            expect(writtenContent).toContain("imports:");
            expect(writtenContent).toContain("sorting:");
        });
    });

    describe("caching behavior", () => {
        it("should cache loaded configurations", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(userConfig)};`);

            ConfigLoader.loadConfig(tempDir);

            const readSpy = spyOn(fs, "readFileSync");
            ConfigLoader.loadConfig(tempDir);

            expect(readSpy).toHaveBeenCalledTimes(0);
            readSpy.mockRestore();
        });

        it("should reload config when file modification time changes", () => {
            const userConfig = {codeStyle: {quoteStyle: "single" as const}};
            fs.writeFileSync(configPath, `export default ${JSON.stringify(userConfig)};`);

            ConfigLoader.loadConfig(tempDir);

            const later = new Date(Date.now() + 2000);
            fs.utimesSync(configPath, later, later);

            const readSpy = spyOn(fs, "readFileSync");
            ConfigLoader.loadConfig(tempDir);

            expect(readSpy).toHaveBeenCalled();
            readSpy.mockRestore();
        });
    });
});
