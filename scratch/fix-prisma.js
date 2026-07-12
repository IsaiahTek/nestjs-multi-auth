const fs = require('fs');
const path = require('path');

const prismaPath = path.join(__dirname, '../src/database/prisma/schema.prisma');
let content = fs.readFileSync(prismaPath, 'utf8');

// Fix OtpToken model
content = content.replace(/model OtpToken \{[\s\S]*?\}/, `model OtpToken {
  id              String   @id @default(uuid())
  uid             String?
  identifier      String
  codeHash        String
  purpose         String   // Enum: 'VERIFY_EMAIL', 'VERIFY_PHONE', 'MAGIC_LINK', 'MFA_LOGIN', 'RESET_PASSWORD'
  expiresAt       DateTime
  isUsed          Boolean  @default(false)
  requestIp       String?
  requestUserAgent String?
  requestUserId   String?
  requestAuthId   String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
}`);

fs.writeFileSync(prismaPath, content, 'utf8');

console.log('Fixed schema.prisma');
