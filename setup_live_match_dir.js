#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = __dirname;

// Directories to create
const dirs = [
  path.join(rootDir, "src", "app", "api", "tournaments", "[id]", "live-match"),
  path.join(rootDir, "src", "lib", "commentary"),
];

// Files to delete
const filesToDelete = [
  path.join(rootDir, "src", "app", "admin", "tournaments", "[id]", "matches", "[matchId]", "page.new.js"),
];

console.log("Creating directory structures...\n");

dirs.forEach((targetDir) => {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    if (fs.existsSync(targetDir)) {
      console.log(`✓ Created: ${targetDir}`);
    }
  } catch (error) {
    console.error(`✗ Error creating ${targetDir}: ${error.message}`);
  }
});

console.log("\nCleaning up stray files...\n");

filesToDelete.forEach((filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✓ Deleted: ${filePath}`);
    } else {
      console.log(`- File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error deleting ${filePath}: ${error.message}`);
  }
});

console.log("\nDone!");

