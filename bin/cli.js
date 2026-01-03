#!/usr/bin/env node
/*
 * Copyright (c) 2025. Encore Digital Group.
 * All Rights Reserved.
 */

const path = require("path");
const fs = require("fs");

// Path to the compiled CLI
const cliPath = path.join(__dirname, "..", "dist", "cli.js");

// Check if the compiled CLI exists
if (fs.existsSync(cliPath)) {
    // Load and run the compiled TypeScript CLI
    require(cliPath);
} else {
    // CLI hasn't been compiled yet (likely first build)
    console.warn("Warning: CLI has not been compiled yet. Run 'npm run build' first.");
    console.warn("Skipping formatting for this build...");
    process.exit(0);
}