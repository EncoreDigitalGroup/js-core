/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */

module.exports = {
    ignorePatterns: ["build", "node_modules", "dist/", "jest.config.ts", "jest.globalSetup.ts", "jest.global.mocks.ts"],
    env: {
        jest: true,
    },
    root: true,
    rules: {
        "prettier/prettier": [
            "error",
            {
                importOrder: ["<THIRD_PARTY_MODULES>", "^core/(.*)$", "^[./]"],
                importOrderSeparation: true,
                importOrderSortSpecifiers: true,
            },
        ],
        "n/no-unpublished-import": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
        "n/no-unsupported-features/es-builtins": [
            "error",
            {
                version: ">=20.0.0",
                ignores: [],
            },
        ],
        "@typescript-eslint/member-delimiter-style": [
            "warn",
            {
                multiline: {
                    delimiter: "semi",
                    requireLast: true,
                },
                singleline: {
                    delimiter: "semi",
                    requireLast: false,
                },
            },
        ],
    },
};
