const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'src', 'app');

// Create directories
const dirs = [
  'admin/login',
  'api/auth'
];

for (const dir of dirs) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  }
}

// Create auth API route
const authRouteContent = `import { NextResponse } from "next/server";

// Server-side only - credentials never sent to browser
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json({ 
        success: true, 
        message: "Authentication successful" 
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
`;

const authRoutePath = path.join(rootDir, 'api', 'auth', 'route.js');
fs.writeFileSync(authRoutePath, authRouteContent);
console.log('Created: api/auth/route.js');

console.log('\\nAuth setup complete!');
console.log('Credentials are now server-side only (not exposed to browser)');

