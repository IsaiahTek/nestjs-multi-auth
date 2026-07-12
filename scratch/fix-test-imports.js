const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

const tokenMap = {
  'Auth': 'AUTH_REPOSITORY_TOKEN',
  'Session': 'SESSION_REPOSITORY_TOKEN',
  'OtpToken': 'OTP_TOKEN_REPOSITORY_TOKEN',
  'MfaMethod': 'MFA_METHOD_REPOSITORY_TOKEN',
  'SessionLog': 'SESSION_LOG_REPOSITORY_TOKEN',
  'AuthIdentifier': 'AUTH_IDENTIFIER_REPOSITORY_TOKEN',
  'OAuthProvider': 'OAUTH_PROVIDER_REPOSITORY_TOKEN'
};

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace getRepositoryToken(Entity) with ENTITY_REPOSITORY_TOKEN
  for (const [entity, token] of Object.entries(tokenMap)) {
    const regex = new RegExp(`getRepositoryToken\\(\\s*${entity}\\s*\\)`, 'g');
    content = content.replace(regex, token);
  }

  // Remove import { getRepositoryToken } from '@nestjs/typeorm';
  content = content.replace(/import\s*{\s*getRepositoryToken\s*}\s*from\s*['"]@nestjs\/typeorm['"];?\n?/g, '');

  // We need to import the tokens. Let's find out if any token is used.
  const usedTokens = Object.values(tokenMap).filter(token => content.includes(token));
  if (usedTokens.length > 0) {
    // Also include AUTH_OTP_PROVIDER if we mock OTP
    if (content.includes('OTP_TOKEN_REPOSITORY_TOKEN') || content.includes('mockOtpRepo')) {
       // if we also need OTP provider, we'll import it later manually or just import it now
    }
    
    // Add imports for the tokens
    const tokensImport = `import { ${usedTokens.join(', ')} } from '../interfaces/repository-tokens';\n`;
    if (!content.includes(tokensImport.trim())) {
      content = tokensImport + content;
    }
  }

  // Remove Entity imports from models.interface to prevent unused imports, 
  // but wait, they might be used as types. But we don't need to remove them if they are types.
  
  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Done replacing getRepositoryToken in specs.');
