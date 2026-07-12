const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, 'src', 'auth', 'specs');

const filesToFix = ['auth.controller.spec.ts', 'jwt.strategy.spec.ts', 'account-linking.spec.ts'];

for (const file of filesToFix) {
  const filePath = path.join(specsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('SESSION_LOG_REPOSITORY_TOKEN } from')) {
       content = `import { SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';\n` + content;
       fs.writeFileSync(filePath, content, 'utf8');
       console.log(`Fixed import in ${file}`);
    }
  }
}

// Also fix mfa-logic.spec.ts syntax again because it was badly formatted:
const mfaPath = path.join(specsDir, 'mfa-logic.spec.ts');
let mfaContent = fs.readFileSync(mfaPath, 'utf8');
if (mfaContent.includes('useValue: { }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN')) {
    mfaContent = mfaContent.replace(/useValue: { }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN/g, 'useValue: { } }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN');
    fs.writeFileSync(mfaPath, mfaContent, 'utf8');
    console.log(`Fixed mfa-logic.spec.ts syntax again`);
}

// Ensure IdentifierType is in login-verification.spec.ts
const lvPath = path.join(specsDir, 'login-verification.spec.ts');
let lvContent = fs.readFileSync(lvPath, 'utf8');
if (!lvContent.includes('IdentifierType')) {
    lvContent = lvContent.replace(/import { AuthStrategy } from '\.\.\/enums\/auth-type.enum';/, "import { AuthStrategy } from '../enums/auth-type.enum';\nimport { IdentifierType } from '../enums/identifier-type.enum';");
    fs.writeFileSync(lvPath, lvContent, 'utf8');
    console.log(`Fixed IdentifierType import`);
}

// Ensure MfaType is in mfa-logic.spec.ts
if (!mfaContent.includes('MfaType')) {
    mfaContent = mfaContent.replace(/import { AuthStrategy } from '\.\.\/enums\/auth-type.enum';/, "import { AuthStrategy } from '../enums/auth-type.enum';\nimport { MfaType } from '../enums/mfa-type.enum';");
    if (!mfaContent.includes('MfaType')) {
       mfaContent = `import { MfaType } from '../enums/mfa-type.enum';\n` + mfaContent;
    }
    fs.writeFileSync(mfaPath, mfaContent, 'utf8');
    console.log(`Fixed MfaType import`);
}
