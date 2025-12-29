# @encoredigitalgroup/core

Opinionated code formatting and configuration standards for Encore Digital Group NPM packages.

## Overview

This package enforces company-wide standards for JavaScript and TypeScript projects. It automatically formats `package.json` and `tsconfig.json` files and applies
consistent Prettier settings across all source files. This tool is designed to run as part of your build process and is not meant to be configured on a per-project basis.

## Key Principles

- **Opinionated**: Provides non-configurable, company-wide formatting standards
- **Build-time Tool**: Designed to run in prebuild scripts, not used in runtime code
- **Zero Configuration**: No per-project configuration needed - install and use
- **Automatic**: Ensures consistent formatting across all Encore Digital Group projects

## Installation

Install as a development dependency:

```bash
npm install --save-dev @encoredigitalgroup/core
```

## Usage

### Recommended: Prebuild Script

Add to your `package.json` scripts:

```json
{
    "scripts": {
        "prebuild": "node node_modules/@encoredigitalgroup/core/bin/cli.js",
        "build": "tsc"
    }
}
```

This ensures your code is formatted before every build. The formatter will:

1. Sort your `package.json` fields in the standard company order
2. Alphabetically sort all keys in `tsconfig.json`
3. Format all `.js`, `.ts`, `.jsx`, and `.tsx` files with Prettier (unless you have a custom Prettier config)

### Manual Execution

Run the formatter directly:

```bash
npx @encoredigitalgroup/core
```

Preview changes without modifying files:

```bash
npx @encoredigitalgroup/core --dry
```

Format a specific directory:

```bash
npx @encoredigitalgroup/core /path/to/project
```

## Company Standards

### Package.json Formatting

All `package.json` files are automatically sorted according to company standards in the following order:

1. `name`
2. `type`
3. `author`
4. `version`
5. `description`
6. `publishConfig`
7. `keywords`
8. `homepage`
9. `engines`
10. `dependencies`
11. `devDependencies`
12. `scripts`
13. `types`
14. `main`
15. `module`
16. `exports`
17. `files`
18. `repository`
19. `bugs`

The `exports` field receives special handling to ensure consistent key ordering within the field itself.

### TSConfig.json Formatting

All keys in `tsconfig.json` files are sorted alphabetically, including nested objects. This ensures consistent configuration files across all projects.

### Prettier Configuration

When no Prettier configuration exists in your project, the following company-standard settings are applied:

```javascript
const config = {
    plugins: ["@trivago/prettier-plugin-sort-imports"],
    bracketSpacing: false,
    trailingComma: "all",
    arrowParens: "avoid",
    tabWidth: 4,
    editorconfig: true,
    useTabs: false,
    printWidth: 120,
    importOrderSeparation: true,
    singleQuote: false,
    semi: true
}
```

If your project already has a Prettier configuration file, this package will respect it and skip automatic Prettier formatting.