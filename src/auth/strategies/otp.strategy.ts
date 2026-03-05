/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { Auth } from '../entities/auth.entity';

@Injectable()
export class OtpAuthStrategy {
  async registerCredentials(dto: SignupDto, uid?: string): Promise<Auth> {
    // Send OTP to phone, create user after verification
    throw new Error('Not implemented');
  }

  async login(dto: LoginDto): Promise<Auth> {
    // Verify OTP code
    throw new Error('Not implemented');
  }
}
