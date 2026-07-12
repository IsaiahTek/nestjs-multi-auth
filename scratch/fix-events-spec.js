const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const filePath = path.join(specsDir, 'events.spec.ts');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/from\s*['"]\.\.\/entities\//g, "from '../../database/typeorm/entities/");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed events.spec.ts imports.');
}
