#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = __dirname;

// Directories to create
const dirs = [
  path.join(rootDir, "src", "app", "api", "tournaments", "[id]", "live-match"),
  path.join(rootDir, "src", "app", "api", "upload"),
  path.join(rootDir, "src", "lib", "commentary"),
];

// Files to delete
const filesToDelete = [
  path.join(
    rootDir,
    "src",
    "app",
    "admin",
    "tournaments",
    "[id]",
    "matches",
    "[matchId]",
    "page.new.js",
  ),
];

// Upload API route content
const uploadRouteContent = `import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Upload to ImgBB
    const imgbbFormData = new FormData();
    imgbbFormData.append('key', process.env.IMGBB_API_KEY);
    imgbbFormData.append('image', base64);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbFormData,
    });

    const data = await response.json();

    if (!data.success) {
      console.error('ImgBB error:', data);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      url: data.data.url,
      thumb: data.data.thumb?.url || data.data.url,
      deleteUrl: data.data.delete_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

console.log("Setting up badminton tournament project...\n");

// Create directories
console.log("Creating directories...");
dirs.forEach(function (targetDir) {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log("  OK: " + path.relative(rootDir, targetDir));
  } catch (error) {
    console.error("  ERROR: " + error.message);
  }
});

// Delete stray files
console.log("\nCleaning up stray files...");
filesToDelete.forEach(function (filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("  Deleted: " + path.relative(rootDir, filePath));
    }
  } catch (error) {
    console.error("  ERROR: " + error.message);
  }
});

// Create upload API route
console.log("\nCreating API files...");
var uploadRoutePath = path.join(
  rootDir,
  "src",
  "app",
  "api",
  "upload",
  "route.js",
);
try {
  if (!fs.existsSync(uploadRoutePath)) {
    fs.writeFileSync(uploadRoutePath, uploadRouteContent);
    console.log("  Created: " + path.relative(rootDir, uploadRoutePath));
  } else {
    console.log("  Already exists: " + path.relative(rootDir, uploadRoutePath));
  }
} catch (error) {
  console.error("  ERROR: " + error.message);
}

console.log("\nSetup complete!");
console.log("\nNext steps:");
console.log("  1. Add IMGBB_API_KEY to your Vercel environment variables");
console.log("  2. Run: npm run dev");
console.log("  3. Create a tournament and upload photos!");
