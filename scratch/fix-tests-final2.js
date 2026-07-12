const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (file === 'repro-phone-login.spec.ts' || file === 'linking.spec.ts') {
    if (!content.includes("import { IdentifierType }")) {
      content = "import { IdentifierType } from '../../enums/identifier-type.enum';\n" + content;
    }
  }

  if (file === 'local-auth.strategy.spec.ts') {
    // Expected 3 arguments but got 4.
    // The arguments are: authRepo, identifierRepo, options.
    // Previously maybe it had something else.
    // Let's replace the constructor call to pass only 3
    content = content.replace(/new LocalAuthStrategy\(\s*mockAuthRepo as any,\s*mockIdentifierRepo as any,\s*([^,]+),\s*([^)]+)\)/g, "new LocalAuthStrategy(mockAuthRepo as any, mockIdentifierRepo as any, $2)");
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed final TS errors.');
