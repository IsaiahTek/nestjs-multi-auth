const fs = require('fs');
const path = require('path');

const specs = [
  'apple.strategy.spec.ts',
  'facebook.strategy.spec.ts',
  'google.strategy.spec.ts'
];

specs.forEach(file => {
  const filePath = path.join('/home/isaiah/devspace/my-open-source-projects/nestjs-multi-auth/src/auth/specs', file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add findByValue, findWithAuthByValue, findWithIdentifiers to createMockRepo
  if (!content.includes('findByValue: jest.fn(),')) {
    content = content.replace('findWithAuthByValue: jest.fn(),', 'findWithAuthByValue: jest.fn(),\n    findByValue: jest.fn(),\n    findWithIdentifiers: jest.fn(),');
  } else if (!content.includes('findWithIdentifiers: jest.fn(),')) {
    content = content.replace('findByValue: jest.fn(),', 'findByValue: jest.fn(),\n    findWithIdentifiers: jest.fn(),');
  }

  if (!content.includes('findWithIdentifiers: jest.fn(),')) {
    content = content.replace('findByUidAndEnabled: jest.fn(),', 'findByUidAndEnabled: jest.fn(),\n    findWithIdentifiers: jest.fn(),');
  }

  // Google specific mocks
  if (file === 'google.strategy.spec.ts') {
    content = content.replace(
      'findOne: jest.fn(),',
      'findOne: jest.fn(),\n        findWithAuthByValue: jest.fn(),\n        findByValue: jest.fn(),'
    );
  }

  // Also replace `authRepo.findWithIdentifiers` in google test to avoid error
  content = content.replace(
    'const updatedAuth = await this.authRepo.findWithIdentifiers(auth.id);',
    'const updatedAuth = await this.authRepo.findWithIdentifiers(auth.id);'
  );

  fs.writeFileSync(filePath, content);
  console.log('Patched', file);
});
