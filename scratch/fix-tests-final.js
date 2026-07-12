const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Repository<Entity> with any
  content = content.replace(/let (authRepo|oauthProviderRepo|identifierRepo|otpRepo|sessionRepo|mfaRepo|sessionLogRepo):\s*Repository<[^>]+>;/g, "let $1: any;");

  // Fix mock dependencies in Test.createTestingModule
  // If AUTH_REPOSITORY_TOKEN is provided but AUTH_IDENTIFIER_REPOSITORY_TOKEN is missing
  if (content.includes('AUTH_REPOSITORY_TOKEN') && !content.includes('AUTH_IDENTIFIER_REPOSITORY_TOKEN')) {
     content = content.replace(/\{\s*provide:\s*AUTH_REPOSITORY_TOKEN,\s*useValue:\s*([^ }]+)\s*\}/, 
       "{ provide: AUTH_REPOSITORY_TOKEN, useValue: $1 }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: { findWithAuthByValue: jest.fn(), save: jest.fn() } }");
     content = content.replace(/\{\s*provide:\s*AUTH_REPOSITORY_TOKEN,\s*useClass:\s*([^ }]+)\s*\}/, 
       "{ provide: AUTH_REPOSITORY_TOKEN, useClass: $1 }, { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: { findWithAuthByValue: jest.fn(), save: jest.fn() } }");
  }

  // Same for AUTH_OTP_PROVIDER
  if (content.includes('AUTH_REPOSITORY_TOKEN') && !content.includes('AUTH_OTP_PROVIDER')) {
     content = content.replace(/\{\s*provide:\s*AUTH_REPOSITORY_TOKEN,\s*useValue:\s*([^ }]+)\s*\}/, 
       "{ provide: AUTH_REPOSITORY_TOKEN, useValue: $1 }, { provide: 'AUTH_OTP_PROVIDER', useValue: { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() } }");
  }

  // Remove `import { Repository } from 'typeorm';` if present
  content = content.replace(/import\s*{\s*Repository\s*}\s*from\s*['"]typeorm['"];?\n?/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed dependencies');
