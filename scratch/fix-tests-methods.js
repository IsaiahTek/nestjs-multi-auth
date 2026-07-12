const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add all new methods to mockRepo
  content = content.replace(/const mockRepo = \{\s*findOne: jest\.fn\(\),\s*create: jest\.fn\(\),\s*save: jest\.fn\(\),\s*delete: jest\.fn\(\),\s*\};/g, 
`const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
    findByUidAndEnabled: jest.fn(),
    findAllByUid: jest.fn(),
    findLatestUnusedByPurpose: jest.fn()
};`);

  content = content.replace(/let mockRepo: any;/g, `let mockRepo: any = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
    findByUidAndEnabled: jest.fn(),
    findAllByUid: jest.fn(),
    findLatestUnusedByPurpose: jest.fn()
};`);

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed mockRepo methods.');
