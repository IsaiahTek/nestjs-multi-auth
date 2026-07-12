const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // We check if a token is used in the file but not imported
  const tokens = [
    'AUTH_REPOSITORY_TOKEN',
    'SESSION_REPOSITORY_TOKEN',
    'MFA_METHOD_REPOSITORY_TOKEN',
    'SESSION_LOG_REPOSITORY_TOKEN',
    'AUTH_IDENTIFIER_REPOSITORY_TOKEN',
    'OAUTH_PROVIDER_REPOSITORY_TOKEN',
    'AUTH_OTP_PROVIDER'
  ];

  let missingTokens = [];
  tokens.forEach(token => {
    // If it's used in code but not imported
    if (content.includes(token) && !content.includes(`import { ${token}`)) {
      // Actually, my previous script grouped imports. Let's just find the existing repository-tokens import and add it, or add a new one.
      missingTokens.push(token);
    }
  });

  if (missingTokens.length > 0) {
    const importStr = `import { ${missingTokens.join(', ')} } from '../interfaces/repository-tokens';\n`;
    content = importStr + content;
    // Note: AUTH_OTP_PROVIDER should be from auth-otp-provider.interface if it's there, but actually we are mocking it via string 'AUTH_OTP_PROVIDER', so we don't necessarily need to import it if it's used as a string. But wait, `AUTH_IDENTIFIER_REPOSITORY_TOKEN` is used as a variable.
    
    // Let's fix the imports properly:
    content = content.replace(/import\s*{[^}]*}\s*from\s*['"]\.\.\/interfaces\/repository-tokens['"];?\n?/g, '');
    
    // Re-evaluate what's used
    const usedTokens = tokens.filter(t => content.includes(t) && t !== 'AUTH_OTP_PROVIDER');
    if (usedTokens.length > 0) {
      content = `import { ${usedTokens.join(', ')} } from '../interfaces/repository-tokens';\n` + content;
    }

    if (content.includes('AUTH_OTP_PROVIDER') && !content.includes("import { AUTH_OTP_PROVIDER }")) {
      content = `import { AUTH_OTP_PROVIDER } from '../interfaces/auth-otp-provider.interface';\n` + content;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed missing imports');
