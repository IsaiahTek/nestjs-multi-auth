const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, 'src', 'auth', 'specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.spec.ts'));

for (const file of files) {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add import
  if (content.includes('interfaces/repository-tokens') && !content.includes('SESSION_LOG_REPOSITORY_TOKEN')) {
    content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]\.\.\/interfaces\/repository-tokens['"];/, (match, p1) => {
      return `import { ${p1.trim()}, SESSION_LOG_REPOSITORY_TOKEN } from '../interfaces/repository-tokens';`;
    });
    changed = true;
  }

  // 2. Add provider
  if (content.includes('Test.createTestingModule') && content.includes('providers:') && !content.includes('SESSION_LOG_REPOSITORY_TOKEN,')) {
    const useValueStr = content.includes('mockRepo') ? 'mockRepo' : '{}';
    content = content.replace(/providers:\s*\[([\s\S]*?)\]/, (match, p1) => {
      if (!p1.includes('SESSION_LOG_REPOSITORY_TOKEN')) {
        return `providers: [${p1}  { provide: SESSION_LOG_REPOSITORY_TOKEN, useValue: ${useValueStr} },\n      ]`;
      }
      return match;
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
