import { resolve } from "path";
import { defineConfig } from "vite";
import { transformGenericsPlugin } from "./src";


export default defineConfig({
    build: {
        target: "node22",
        outDir: "dist",
        lib: {
            entry: {
                cli: resolve(__dirname, "src/cli.ts"),
                index: resolve(__dirname, "src/index.ts"),
                "sortPackage": resolve(__dirname, "src/sortPackage.ts"),
                "sortTSConfig": resolve(__dirname, "src/sortTSConfig.ts"),
            },
            formats: ["cjs"],
            fileName: (format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
            external: [
                "fs",
                "fs/promises",
                "path",
                "os",
                "glob",
                "reflect-metadata",
                "sort-package-json",
                "json-sort-cli",
                "typescript"
            ],
            output: {
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].js",
                format: "cjs",
                banner: (chunk) => {
                    if (chunk.name === "cli") {
                        return "#!/usr/bin/env node";
                    }
                    return "";
                },
            },
        },
        minify: false,
    },
    plugins: [transformGenericsPlugin()],
    esbuild: {
        target: "node22",
    },
})
