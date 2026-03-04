import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordAuthStrategy } from './strategies/password.strategy';
import { GoogleAuthStrategy } from './strategies/google.strategy';
import { AuthStrategy } from './auth-type.enum';
import { Auth } from './entities/auth.entity';
import { Session } from './entities/session.entity'; // Import the new entity
import { AUTH_USER_SERVICE, AuthUserService } from './interfaces/auth-user-service.interface';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private passwordStrategy: PasswordAuthStrategy,
    private googleStrategy: GoogleAuthStrategy,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @Inject(AUTH_USER_SERVICE) private authUserService: AuthUserService,
  ) { }

  // --- INTERNAL HELPER: Generate Token Pair ---
  private async generateTokens(userId: string, sessionId: string) {
    const payload = { sub: userId, sessionId }; // Embed sessionId in token

    const refreshJti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      // Short-lived (e.g., 15m)
      this.jwtService.signAsync(
        { sub: userId, sessionId }, // Access token doesn't strictly need sessionId, but can have it
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      ),
      // Long-lived (e.g., 7d)
      this.jwtService.signAsync(
        { ...payload, jti: refreshJti },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private fingerprint(userAgent: string) {
    return crypto.createHash('sha256').update(userAgent).digest('hex');
  }

  // --- INTERNAL HELPER: Create/Update Session in DB ---
  private async createSession(
    userId: string,
    userAgent: string = 'Unknown',
    ip: string = 'Unknown',
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // We create the session first to get the UUID
    const deviceFingerprint = this.fingerprint(userAgent);

    const session = this.sessionRepository.create({
      userId,
      deviceFingerprint,
      ipAddress: ip,
      expiresAt,
      refreshTokenHash: '',
    });

    await this.sessionRepository.save(session);

    // Generate tokens linked to this session ID
    const tokens = await this.generateTokens(userId, session.id);

    // Hash the refresh token and update the DB
    const hash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.sessionRepository.update(session.id, { refreshTokenHash: hash });

    return tokens;
  }

  async signup(dto: SignupDto, userAgent?: string, ip?: string) {
    let auth: Auth;
    if (!dto.method) throw new BadRequestException('Method is required');

    switch (dto.method) {
      case AuthStrategy.LOCAL:
        auth = await this.passwordStrategy.signup(dto);
        break;
      case AuthStrategy.OAUTH:
        auth = await this.googleStrategy.signup(dto);
        break;
      default:
        throw new Error('Unsupported signup provider');
    }

    // Auth successful, now create session
    const tokens = await this.createSession(auth.userId, userAgent, ip);

    // Fetch the user object completely
    const user = await this.authUserService.findById(auth.userId);

    return { ...tokens, user };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    let auth: Auth;
    if (!dto.method) throw new BadRequestException('Method is required');

    switch (dto.method) {
      case AuthStrategy.LOCAL:
        auth = await this.passwordStrategy.login(dto);
        break;
      case AuthStrategy.OAUTH:
        auth = await this.googleStrategy.login(dto);
        break;
      default:
        throw new Error('Unsupported login provider');
    }

    // Auth successful, now create session
    const tokens = await this.createSession(auth.userId, userAgent, ip);

    // Fetch the user object completely
    const user = await this.authUserService.findById(auth.userId);

    return { ...tokens, user };
  }

  // async refreshTokens(refreshToken: string) {
  //   try {
  //     // 1. Verify Signature
  //     const payload = await this.jwtService.verifyAsync<{ sessionId: string }>(
  //       refreshToken,
  //       {
  //         secret: process.env.JWT_REFRESH_SECRET,
  //       },
  //     );

  //     // 2. Check if Session exists in DB
  //     const session = await this.sessionRepository.findOne({
  //       where: { id: payload.sessionId },
  //       select: ['id', 'refreshTokenHash', 'expiresAt', 'user'],
  //       relations: ['user'],
  //     });

  //     if (!session) throw new ForbiddenException('Session not found');

  //     if (session.userAgent !== currentUserAgent) {
  //       throw new ForbiddenException('Device mismatch');
  //     }

  //     // 3. Check Expiry
  //     if (new Date() > session.expiresAt) {
  //       await this.sessionRepository.delete(session.id);
  //       throw new ForbiddenException('Session expired');
  //     }

  //     // 4. Compare Hash (Detect reuse/theft)
  //     const isMatch = await bcrypt.compare(
  //       refreshToken,
  //       session.refreshTokenHash,
  //     );
  //     if (!isMatch) {
  //       // SECURITY ALERT: Token reuse detected!
  //       // Best practice: Delete the session immediately to block the attacker.
  //       await this.sessionRepository.delete(session.id);
  //       throw new ForbiddenException('Invalid refresh token');
  //     }

  //     // 5. Rotate Tokens (Generate new pair)
  //     const tokens = await this.generateTokens(session.user.id, session.id);

  //     // 6. Update DB with new hash
  //     const newHash = await bcrypt.hash(tokens.refreshToken, 10);

  //     const newExpiry = new Date();
  //     newExpiry.setDate(newExpiry.getDate() + 7);

  //     await this.sessionRepository.update(session.id, {
  //       refreshTokenHash: newHash,
  //       expiresAt: newExpiry,
  //     });

  //     return tokens;
  //   } catch (e) {
  //     console.log('Error refreshing tokens', e);
  //     throw new ForbiddenException('Invalid request');
  //   }
  // }

  async refreshTokens(
    refreshToken: string,
    currentUserAgent: string,
    currentIp?: string,
  ) {
    try {
      // 1. Verify signature
      const payload = await this.jwtService.verifyAsync<{ sessionId: string }>(
        refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET },
      );

      // 2. Load session
      const session = await this.sessionRepository.findOne({
        where: { id: payload.sessionId },
        select: [
          'id',
          'refreshTokenHash',
          'expiresAt',
          'deviceFingerprint',
          'ipAddress',
        ],
        relations: ['user'],
      });

      if (!session) throw new ForbiddenException('Session not found');

      // 3. Fingerprint enforcement (HARD)
      const incomingFingerprint = this.fingerprint(currentUserAgent);

      if (session.deviceFingerprint !== incomingFingerprint) {
        // Kill compromised session
        await this.sessionRepository.delete(session.id);
        throw new ForbiddenException('Device mismatch');
      }

      // 4. Expiry check
      if (new Date() > session.expiresAt) {
        await this.sessionRepository.delete(session.id);
        throw new ForbiddenException('Session expired');
      }

      // 5. Refresh token reuse detection
      const isMatch = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );

      if (!isMatch) {
        await this.sessionRepository.delete(session.id);
        throw new ForbiddenException('Invalid refresh token');
      }

      // 6. Rotate tokens
      const tokens = await this.generateTokens(session.userId, session.id);

      const newHash = await bcrypt.hash(tokens.refreshToken, 10);

      // 7. Sliding expiry
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      await this.sessionRepository.update(session.id, {
        refreshTokenHash: newHash,
        expiresAt: newExpiry,
        ipAddress: currentIp ?? session.ipAddress, // optional update
      });

      return tokens;
    } catch (e) {
      console.log('Error refreshing tokens', e);
      throw new ForbiddenException('Invalid request');
    }
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.decode<{ sessionId: string }>(
        refreshToken,
      );
      if (payload && payload.sessionId) {
        await this.sessionRepository.delete(payload.sessionId);
      }
    } catch (e) {
      console.log('Error logging out', e);
      // Ignore errors during logout
    }
  }
}
