const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix type inference for createMockRepo()
  content = content.replace(/const\s+(mock[a-zA-Z]+|oauthProviderRepo|identifierRepo|authRepo|sessionRepo)\s*=\s*createMockRepo\(\);/g, "const $1: any = createMockRepo();");

  // Fix IdentifierType missing import in linking.spec.ts
  if (file === 'linking.spec.ts' && !content.includes('IdentifierType')) {
    content = "import { IdentifierType } from '../../enums/identifier-type.enum';\n" + content;
  }

  // Same for any other missing enums, we'll see if it complains.
  
  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed proxy types.');
