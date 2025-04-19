/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */

module.exports = {
    plugins: [require.resolve("@trivago/prettier-plugin-sort-imports")],
    bracketSpacing: false,
    trailingComma: "all",
    arrowParens: "avoid",
    tabWidth: 4,
    useTabs: false,
    printWidth: 120,
    importOrderSeparation: true,
    singleQuote: false,
    semi: true,
};
