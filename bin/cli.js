#!/usr/bin/env node
/*
 * Copyright (c) 2026. Encore Digital Group.
 * All Rights Reserved.
 */

// This is the entry point for consumers of the package
// It uses tsx to run the TypeScript source directly without requiring a build step

const { register } = require('tsx/cjs/api');
const path = require('path');

// Register tsx to handle TypeScript files
const unregister = register();

// Load and run the CLI
require(path.join(__dirname, '../src/cli.ts'));

// Cleanup
process.on('exit', () => unregister());