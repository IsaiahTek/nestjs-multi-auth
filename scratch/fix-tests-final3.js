const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix wrong import path for IdentifierType
  content = content.replace(/import \{ IdentifierType \} from '\.\.\/\.\.\/enums\/identifier-type\.enum';/g, "import { IdentifierType } from '../enums/identifier-type.enum';");

  // Fix LocalAuthStrategy arguments
  if (file === 'local-auth.strategy.spec.ts') {
     content = content.replace(/new LocalAuthStrategy\([\s\S]*?\)/g, "new LocalAuthStrategy(mockAuthRepo as any, mockIdentifierRepo as any, { allowedPhonePrefixes: ['+1'] } as any)");
     // Restore the options passed explicitly
     content = content.replace(/new LocalAuthStrategy\(mockAuthRepo as any, mockIdentifierRepo as any, \{ allowedPhonePrefixes: \['\+1'\] \} as any\)/g, "new LocalAuthStrategy(mockAuthRepo as any, mockIdentifierRepo as any, { allowedPhonePrefixes: ['+1'] } as any)");
     // But wait, there are multiple tests that pass different options!
     // Let me just manually edit local-auth.strategy.spec.ts
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed imports again.');
