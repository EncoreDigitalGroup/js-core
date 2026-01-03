import {type CoreConfig, MemberType, ReactMemberType, DeclarationType} from "@encoredigitalgroup/core";

/**
 * Example configuration file for @encoredigitalgroup/core
 *
 * To use this configuration:
 * 1. Copy this file to your project root as `core.config.ts`
 * 2. Customize the settings to match your project's needs
 * 3. The package will automatically detect and use your configuration
 *
 * All configuration options are optional. If omitted, the default behavior will be used.
 */

const config: CoreConfig = {
    // Prettier configuration
    prettier: {
        // Whether to run Prettier (default: true)
        enabled: true,
        // Skip Prettier if a config file exists in the project (default: true)
        skipIfConfigExists: true,
        // Prettier options (used when no config file exists)
        options: {
            plugins: ["@trivago/prettier-plugin-sort-imports"],
            bracketSpacing: false,
            trailingComma: "all",
            arrowParens: "avoid",
            tabWidth: 4,
            printWidth: 120,
            importOrderSeparation: true,
            singleQuote: false,
            semi: true,
        },
        // File patterns to include
        include: ["**/*.{js,ts,jsx,tsx}"],
        // Additional directories to exclude (critical dirs are always excluded)
        exclude: [],
    },
    // package.json sorting configuration
    packageJson: {
        // Whether to sort package.json (default: true)
        enabled: true,
        // Custom sort order for package.json fields
        customSortOrder: [
            "name",
            "type",
            "author",
            "version",
            "description",
            "publishConfig",
            "keywords",
            "homepage",
            "engines",
            "dependencies",
            "devDependencies",
            "scripts",
            "types",
            "main",
            "module",
            "exports",
            "files",
            "repository",
            "bugs",
        ],
        // JSON indentation (default: 4)
        indentation: 4,
    },
    // tsconfig.json sorting configuration
    tsConfig: {
        // Whether to sort tsconfig.json (default: true)
        enabled: true,
        // JSON indentation (default: 4)
        indentation: 4,
    },
    // Code sorters configuration
    sorters: {
        // Class member sorting configuration
        classMembers: {
            // Whether to sort class members (default: true)
            enabled: true,
            // Custom order for class members
            order: [
                MemberType.StaticProperty,
                MemberType.InstanceProperty,
                MemberType.Constructor,
                MemberType.GetAccessor,
                MemberType.SetAccessor,
                MemberType.StaticMethod,
                MemberType.InstanceMethod,
            ],
            // Group members by visibility (default: false)
            groupByVisibility: false,
            // Respect dependencies between members (default: true)
            respectDependencies: true,
        },
        // React component member sorting configuration
        reactComponents: {
            // Whether to sort React component members (default: true)
            enabled: true,
            // Custom order for React component members
            order: [
                ReactMemberType.StaticProperty,
                ReactMemberType.State,
                ReactMemberType.InstanceProperty,
                ReactMemberType.Constructor,
                ReactMemberType.GetDerivedStateFromProps,
                ReactMemberType.ComponentDidMount,
                ReactMemberType.ShouldComponentUpdate,
                ReactMemberType.GetSnapshotBeforeUpdate,
                ReactMemberType.ComponentDidUpdate,
                ReactMemberType.ComponentWillUnmount,
                ReactMemberType.ComponentDidCatch,
                ReactMemberType.GetDerivedStateFromError,
                ReactMemberType.EventHandler,
                ReactMemberType.RenderHelper,
                ReactMemberType.GetAccessor,
                ReactMemberType.SetAccessor,
                ReactMemberType.Render,
                ReactMemberType.StaticMethod,
                ReactMemberType.InstanceMethod,
            ],
            // Group members by visibility (default: false)
            groupByVisibility: false,
            // Respect dependencies between members (default: true)
            respectDependencies: true,
        },
        // File-level declaration sorting configuration
        fileDeclarations: {
            // Whether to sort file-level declarations (default: true)
            enabled: true,
            // Custom order for file-level declarations
            order: [
                DeclarationType.Interface,
                DeclarationType.TypeAlias,
                DeclarationType.Enum,
                DeclarationType.HelperFunction,
                DeclarationType.HelperVariable,
                DeclarationType.ExportedFunction,
                DeclarationType.ExportedVariable,
                DeclarationType.ExportedClass,
                DeclarationType.DefaultExport,
                DeclarationType.Other,
            ],
            // Respect dependencies between declarations (default: true)
            respectDependencies: true,
        },
        // File patterns to include for sorting
        include: ["**/*.{ts,tsx}"],
        // Additional directories to exclude (critical dirs are always excluded)
        exclude: [],
    },
};

export default config;
