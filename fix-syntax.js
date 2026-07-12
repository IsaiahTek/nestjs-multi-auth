const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, 'src', 'auth', 'specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.spec.ts'));

for (const file of files) {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix syntax error from previous AI
  if (content.includes('useValue: { }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN')) {
    content = content.replace(/useValue: { }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN/g, 'useValue: { } }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN');
    changed = true;
  }
  
  if (content.includes('useValue: mockRepo }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN')) {
      // This one is actually syntactically okay but might be weirdly formatted:
      // { provide: AUTH_REPOSITORY_TOKEN, useValue: mockRepo }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, ... },
      // Wait, in events.spec.ts it was:
      // { provide: AUTH_REPOSITORY_TOKEN, useValue: mockRepo }, { provide: ... }
      // This is two elements on one line, which is valid JS!
  }

  // Fix IdentifierType missing
  if (file === 'login-verification.spec.ts' && !content.includes('IdentifierType')) {
    content = content.replace(/import { AuthStrategy } from '\.\.\/enums\/auth-type.enum';/, "import { AuthStrategy } from '../enums/auth-type.enum';\nimport { IdentifierType } from '../enums/identifier-type.enum';");
    changed = true;
  }

  // Fix MfaType missing
  if (file === 'mfa-logic.spec.ts' && !content.includes('MfaType')) {
    content = content.replace(/import { AuthStrategy } from '\.\.\/enums\/auth-type.enum';/, "import { AuthStrategy } from '../enums/auth-type.enum';\nimport { MfaType } from '../enums/mfa-type.enum';");
    if (!content.includes('MfaType')) {
       // if AuthStrategy wasn't imported
       content = `import { MfaType } from '../enums/mfa-type.enum';\n` + content;
    }
    changed = true;
  }
  
  // Fix missing imports in auth.controller.spec.ts
  if (file === 'auth.controller.spec.ts' && !content.includes('SESSION_LOG_REPOSITORY_TOKEN')) {
     content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]\.\.\/interfaces\/repository-tokens['"];/, (match, p1) => {
      return `import { ${p1.trim()}, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';`;
    });
    changed = true;
  }
  if (file === 'jwt.strategy.spec.ts' && !content.includes('SESSION_LOG_REPOSITORY_TOKEN')) {
     content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]\.\.\/interfaces\/repository-tokens['"];/, (match, p1) => {
      return `import { ${p1.trim()}, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';`;
    });
    changed = true;
  }
  if (file === 'account-linking.spec.ts' && !content.includes('SESSION_LOG_REPOSITORY_TOKEN')) {
     content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]\.\.\/interfaces\/repository-tokens['"];/, (match, p1) => {
      return `import { ${p1.trim()}, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';`;
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed syntax in ${file}`);
  }
}
