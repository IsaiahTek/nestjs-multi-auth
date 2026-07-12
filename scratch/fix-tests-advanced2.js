const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the broken AuthIdentifier
  content = content.replace(/AUTH_REPOSITORY_TOKENIdentifier/g, "AUTH_IDENTIFIER_REPOSITORY_TOKEN");

  // Fix all remaining `../entities/` imports to `../../database/typeorm/entities/`
  content = content.replace(/from\s*['"]\.\.\/entities\//g, "from '../../database/typeorm/entities/");

  // Remove `import { Auth }` etc if they are unused or still there from `../entities/auth.entity`
  content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]\.\.\/\.\.\/database\/typeorm\/entities\//g, "// removed entity import ");

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed advanced issues 2.');
