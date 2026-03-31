const fs = require("fs");
const path = require("path");

// Create the directory structure for tournaments API
const dirPath = path.join(
  __dirname,
  "src",
  "app",
  "api",
  "tournaments",
  "[id]",
  "live-match",
);

try {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log("✓ Directory created successfully:");
  console.log(`  ${dirPath}`);
} catch (error) {
  console.error("✗ Error creating directory:");
  console.error(`  ${error.message}`);
  process.exit(1);
}
