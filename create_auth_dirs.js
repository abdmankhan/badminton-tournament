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

console.log('Directories created successfully!');
