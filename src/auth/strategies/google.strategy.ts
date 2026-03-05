/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { Auth } from '../entities/auth.entity';

@Injectable()
export class GoogleAuthStrategy {
  async registerCredentials(dto: SignupDto, uid?: string): Promise<Auth> {
    // Verify google token (use google-auth-library)
    // Extract email/name, create user if not exists
    throw new Error('Not implemented');
  }

  async login(dto: LoginDto): Promise<Auth> {
    // Verify google token, return existing user
    throw new Error('Not implemented');
  }
}
