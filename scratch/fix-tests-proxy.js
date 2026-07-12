const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace all the huge mockRepo objects with a simple proxy
  content = content.replace(/const mockRepo = \{[\s\S]*?\};\n/g, "");
  content = content.replace(/let mockRepo: any = \{[\s\S]*?\};\n/g, "");
  
  const proxyCode = `
const createMockRepo = () => new Proxy({}, {
    get: (target, prop) => {
        if (prop === 'then') return undefined; // Promise resolution
        if (typeof prop === 'symbol') return undefined;
        if (!target[prop]) {
            target[prop] = jest.fn();
        }
        return target[prop];
    }
});
let mockRepo: any = createMockRepo();
`;

  // We need to insert this proxyCode after the imports.
  // Find the last import
  const lastImportIndex = content.lastIndexOf('import ');
  const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
  
  if (!content.includes('createMockRepo')) {
    content = content.slice(0, nextLineIndex) + proxyCode + content.slice(nextLineIndex);
  }

  // Also fix mockIdentifierRepo, mockOtpProvider, mockSessionRepo, mockAuthRepo, etc if they exist
  // We can just replace their declarations with `createMockRepo()`
  const repoNames = [
    'mockIdentifierRepo', 
    'mockOtpProvider', 
    'mockSessionRepo', 
    'mockSessionLogRepo', 
    'mockAuthRepo', 
    'mockOtpRepo', 
    'mockMfaRepo',
    'oauthProviderRepo',
    'identifierRepo',
    'authRepo',
    'sessionRepo'
  ];

  repoNames.forEach(repoName => {
    // Replace const mockRepoName = { ... };
    const regexConst = new RegExp(`const\\s+${repoName}\\s*=\\s*\\{[\\s\\S]*?\\};`, 'g');
    content = content.replace(regexConst, `const ${repoName} = createMockRepo();`);
    
    // Replace let mockRepoName: any;
    const regexLet = new RegExp(`let\\s+${repoName}:\\s*any;`, 'g');
    content = content.replace(regexLet, `let ${repoName}: any = createMockRepo();`);
  });

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Added generic Proxy mocks.');
