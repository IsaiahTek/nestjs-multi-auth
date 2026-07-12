const fs = require('fs');
const path = require('path');

const specsToPatch = [
  'local-auth.strategy.spec.ts',
  'password-features.spec.ts',
  'mfa-logic.spec.ts'
];

specsToPatch.forEach(file => {
  const filePath = path.join('/home/isaiah/devspace/my-open-source-projects/nestjs-multi-auth/src/auth/specs', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Add findByValue
  if (!content.includes('findByValue: jest.fn(),')) {
    content = content.replace('findByUidAndNamespace: jest.fn(),', 'findByUidAndNamespace: jest.fn(),\n    findByValue: jest.fn(),');
  }
  
  // Add findByUidAndStrategies
  if (!content.includes('findByUidAndStrategies: jest.fn(),')) {
    content = content.replace('findByValue: jest.fn(),', 'findByValue: jest.fn(),\n    findByUidAndStrategies: jest.fn(),');
  }

  // Add findByUidAndType
  if (!content.includes('findByUidAndType: jest.fn(),')) {
    content = content.replace('findByUidAndStrategies: jest.fn(),', 'findByUidAndStrategies: jest.fn(),\n    findByUidAndType: jest.fn(),');
  }

  // For password-features.spec.ts
  if (file === 'password-features.spec.ts') {
    // otpProvider.verify should return success: true
    content = content.replace(
      /otpProvider\.verify\.mockResolvedValue\(\{ valid: true \}\);/g, 
      'otpProvider.verify.mockResolvedValue({ success: true, valid: true });'
    );
    content = content.replace(
      /expect\(otpRepo\.save\)\.toHaveBeenCalled\(\);/g,
      'expect(otpProvider.issue).toHaveBeenCalled();'
    );
    // authIdentifierRepo.findWithAuthByValue
    if (!content.includes('authIdentifierRepo.findWithAuthByValue.mockResolvedValue')) {
       content = content.replace(
         /authRepo\.query\.mockResolvedValue\(\[\{ value: 'test@test\.com'/g,
         "authIdentifierRepo.findWithAuthByValue.mockResolvedValue({ identifier: { value: 'test@test.com', type: 'EMAIL' }, auth: { id: 'auth-id', uid: 'user-uid' } });\n      authRepo.query.mockResolvedValue([{ value: 'test@test.com'"
       );
    }
  }

  fs.writeFileSync(filePath, content);
  console.log('Patched', file);
});
