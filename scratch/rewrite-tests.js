const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove getRepositoryToken import
  content = content.replace(/import\s*{\s*getRepositoryToken\s*}\s*from\s*['"]@nestjs\/typeorm['"];?\n?/g, '');
  
  // Remove the old Entity imports that were used as values
  content = content.replace(/import\s*{\s*Auth\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*Session\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*OtpToken\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*MfaMethod\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*SessionLog\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*AuthIdentifier\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*OAuthProvider\s*}\s*from\s*['"]\.\.\/interfaces\/models\.interface['"];?\n?/g, '');

  // 2. Replace token usage
  content = content.replace(/getRepositoryToken\(\s*Auth\s*\)/g, 'AUTH_REPOSITORY_TOKEN');
  content = content.replace(/getRepositoryToken\(\s*Session\s*\)/g, 'SESSION_REPOSITORY_TOKEN');
  content = content.replace(/getRepositoryToken\(\s*OtpToken\s*\)/g, 'AUTH_OTP_PROVIDER');
  content = content.replace(/getRepositoryToken\(\s*MfaMethod\s*\)/g, 'MFA_METHOD_REPOSITORY_TOKEN');
  content = content.replace(/getRepositoryToken\(\s*SessionLog\s*\)/g, 'SESSION_LOG_REPOSITORY_TOKEN');
  content = content.replace(/getRepositoryToken\(\s*AuthIdentifier\s*\)/g, 'AUTH_IDENTIFIER_REPOSITORY_TOKEN');
  content = content.replace(/getRepositoryToken\(\s*OAuthProvider\s*\)/g, 'OAUTH_PROVIDER_REPOSITORY_TOKEN');

  // 3. Rename mockOtpRepo to mockOtpProvider in setups
  content = content.replace(/mockOtpRepo/g, 'mockOtpProvider');
  
  // If the file has mockOtpProvider = { ... }, we need to change it to have issue, verify, resend.
  content = content.replace(/const mockOtpProvider = {[\s\S]*?};/g, (match) => {
    if (match.includes('issue:') && match.includes('verify:')) return match; // Already fixed
    return `const mockOtpProvider = {
        issue: jest.fn(),
        verify: jest.fn(),
        resend: jest.fn(),
    };`;
  });

  // If the file has entity === Auth, etc inside a factory
  content = content.replace(/entity\s*===\s*Auth/g, "entity === AUTH_REPOSITORY_TOKEN");
  content = content.replace(/entity\s*===\s*OAuthProvider/g, "entity === OAUTH_PROVIDER_REPOSITORY_TOKEN");
  content = content.replace(/entity\s*===\s*AuthIdentifier/g, "entity === AUTH_IDENTIFIER_REPOSITORY_TOKEN");

  // 4. Update assertions: expect(mockOtpProvider.save) -> expect(mockOtpProvider.issue)
  content = content.replace(/expect\(mockOtpProvider\.save\)/g, 'expect(mockOtpProvider.issue)');
  content = content.replace(/expect\(mockOtpProvider\.create\)/g, 'expect(mockOtpProvider.issue)');

  // 5. Add required imports for tokens
  const tokenImports = [];
  if (content.includes('AUTH_REPOSITORY_TOKEN')) tokenImports.push('AUTH_REPOSITORY_TOKEN');
  if (content.includes('SESSION_REPOSITORY_TOKEN')) tokenImports.push('SESSION_REPOSITORY_TOKEN');
  if (content.includes('MFA_METHOD_REPOSITORY_TOKEN')) tokenImports.push('MFA_METHOD_REPOSITORY_TOKEN');
  if (content.includes('SESSION_LOG_REPOSITORY_TOKEN')) tokenImports.push('SESSION_LOG_REPOSITORY_TOKEN');
  if (content.includes('AUTH_IDENTIFIER_REPOSITORY_TOKEN')) tokenImports.push('AUTH_IDENTIFIER_REPOSITORY_TOKEN');
  if (content.includes('OAUTH_PROVIDER_REPOSITORY_TOKEN')) tokenImports.push('OAUTH_PROVIDER_REPOSITORY_TOKEN');

  if (tokenImports.length > 0) {
    const importStatement = `import { ${tokenImports.join(', ')} } from '../interfaces/repository-tokens';\n`;
    if (!content.includes(importStatement)) {
       content = importStatement + content;
    }
  }

  if (content.includes('AUTH_OTP_PROVIDER')) {
    const otpImport = `import { AUTH_OTP_PROVIDER } from '../interfaces/auth-otp-provider.interface';\n`;
    if (!content.includes(otpImport)) {
       content = otpImport + content;
    }
  }

  // Handle specific AuthService mock instantiation replacements
  if (file === 'auth.service.spec.ts') {
    content = content.replace(/new AuthService\(\s*mockJwtService as any,\s*mockPasswordStrategy as any,\s*mockOAuthStrategy as any,\s*mockSessionRepo as any,\s*mockSessionLogRepo as any,\s*mockAuthRepo as any,\s*mockOtpProvider as any,\s*mockMfaRepo as any,\s*([^)]+)\);/g, 
      `new AuthService(
                mockJwtService as any,
                mockPasswordStrategy as any,
                mockOAuthStrategy as any,
                mockSessionRepo as any,
                mockSessionLogRepo as any,
                mockAuthRepo as any,
                mockIdentifierRepo as any,
                mockOtpProvider as any,
                mockMfaRepo as any,
                $1
            );`);

    if (!content.includes('mockIdentifierRepo')) {
       content = content.replace('const mockAuthRepo = {', `const mockIdentifierRepo = { findWithAuthByValue: jest.fn(), save: jest.fn() };\n    const mockAuthRepo = {`);
    }
    
    // Add AUTH_IDENTIFIER_REPOSITORY_TOKEN to providers if missing
    if (!content.includes('{ provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN')) {
      content = content.replace(/\{ provide: AUTH_REPOSITORY_TOKEN, useValue: mockAuthRepo \},/g, `{ provide: AUTH_REPOSITORY_TOKEN, useValue: mockAuthRepo },\n                { provide: AUTH_IDENTIFIER_REPOSITORY_TOKEN, useValue: mockIdentifierRepo },`);
    }

    // Fix the otpProvider.verify expectation in verifyCode test
    content = content.replace(/mockOtpProvider\.findOne\.mockResolvedValue\({\s*codeHash: hash,\s*expiresAt: new Date\(Date\.now\(\) \+ 15 \* 60 \* 1000\),[\s\S]*?requestUserId: uid,\s*}\);/g, `mockOtpProvider.verify.mockResolvedValue({ success: true, authId: 1 });`);
    content = content.replace(/mockOtpProvider\.findOne\.mockResolvedValue\({\s*createdAt: new Date\(Date\.now\(\) - 30 \* 1000\),[\s\S]*?}\);/g, `mockOtpProvider.resend.mockResolvedValue({ handledDelivery: true });`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Done rewriting tests');
