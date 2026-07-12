const fs = require('fs');
const path = require('path');

const specsDir = path.join(__dirname, '../src/auth/specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace `entity === Auth` with `entity === 'Auth'` (but wait, entity is a token now! Actually we can just comment out these lines or fix them if we don't use them anymore)
  // Actually, replacing `new AuthService(...)` is tricky, let's fix `auth.service.spec.ts` first.
  
  if (file === 'auth.service.spec.ts') {
    // We need to add the new constructor parameters to new AuthService(...)
    // new AuthService(jwt, pass, oauth, sessionRepo, sessionLogRepo, authRepo, identifierRepo, otpProvider, mfaRepo, options, notification, eventEmitter)
    // Wait, the new constructor is:
    /*
        @Optional() private jwtService?: JwtService,
        @Optional() private passwordStrategy?: LocalAuthStrategy,
        @Optional() private oauthStrategy?: OAuthAuthStrategy,
        @Inject(SESSION_REPOSITORY_TOKEN) private sessionRepository: SessionRepository,
        @Inject(SESSION_LOG_REPOSITORY_TOKEN) private sessionLogRepo: SessionLogRepository,
        @Inject(AUTH_REPOSITORY_TOKEN) private authRepo: AuthRepository,
        @Inject(AUTH_IDENTIFIER_REPOSITORY_TOKEN) private authIdentifierRepo: AuthIdentifierRepository,
        @Inject(AUTH_OTP_PROVIDER) private otpProvider: AuthOtpProvider,
        @Inject(MFA_METHOD_REPOSITORY_TOKEN) private mfaRepo: MfaMethodRepository,
        @Inject(AUTH_MODULE_OPTIONS) private options: AuthModuleOptions,
        @Optional() @Inject(AUTH_NOTIFICATION_PROVIDER) private notificationProvider?: AuthNotificationProvider,
        @Optional() private readonly eventEmitter?: EventEmitter2,
    */
    content = content.replace(/new AuthService\(\s*mockJwtService as any,\s*mockPasswordStrategy as any,\s*mockOAuthStrategy as any,\s*mockSessionRepo as any,\s*mockSessionLogRepo as any,\s*mockAuthRepo as any,\s*mockOtpRepo as any,\s*mockMfaRepo as any,\s*({[^}]+} as any)(,[\s\S]*?)?\);/g, 
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
                $1$2
            );`);
    
    // Add missing mockIdentifierRepo and mockOtpProvider
    if (!content.includes('mockIdentifierRepo')) {
       content = content.replace('const mockAuthRepo = {', `const mockIdentifierRepo = { findWithAuthByValue: jest.fn(), save: jest.fn() };\n    const mockOtpProvider = { issue: jest.fn(), verify: jest.fn(), resend: jest.fn() };\n    const mockAuthRepo = {`);
    }

    content = content.replace(/\{ provide: getRepositoryToken\(OtpToken\), useValue: mockOtpRepo \},/g, `{ provide: 'AUTH_OTP_PROVIDER', useValue: mockOtpProvider },`);
    content = content.replace(/\{ provide: getRepositoryToken\(AuthIdentifier\), useValue: mockIdentifierRepo \},/g, `{ provide: 'AUTH_IDENTIFIER_REPOSITORY_TOKEN', useValue: mockIdentifierRepo },`);
  }

  // Find all remaining 'import { Auth } from' and if it's used as a value, change it. 
  // In strategies they use `module.get(getRepositoryToken(Auth))`, this was replaced to `module.get(AUTH_REPOSITORY_TOKEN)`
  // BUT they still try to do `entity === Auth` in some mocks if they used a factory.
  content = content.replace(/entity === Auth/g, "entity === 'AUTH_REPOSITORY_TOKEN'");
  content = content.replace(/entity === OAuthProvider/g, "entity === 'OAUTH_PROVIDER_REPOSITORY_TOKEN'");
  content = content.replace(/entity === AuthIdentifier/g, "entity === 'AUTH_IDENTIFIER_REPOSITORY_TOKEN'");
  content = content.replace(/entity === OtpToken/g, "entity === 'OTP_TOKEN_REPOSITORY_TOKEN'");
  content = content.replace(/entity === MfaMethod/g, "entity === 'MFA_METHOD_REPOSITORY_TOKEN'");
  content = content.replace(/entity === Session/g, "entity === 'SESSION_REPOSITORY_TOKEN'");

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Fixed advanced issues.');
