/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { LoginDto } from '../../dto/login.dto';
import { SignupDto } from '../../dto/signup.dto';
import { Auth } from '../../entities/auth.entity';
import { IOAuthStrategy } from './oauth-strategy.interface';

@Injectable()
export class AppleAuthStrategy implements IOAuthStrategy {
    async registerCredentials(dto: SignupDto, uid?: string): Promise<Auth> {
        // Verify apple token
        throw new Error('Apple OAuth Not implemented');
    }

    async login(dto: LoginDto): Promise<Auth> {
        // Verify apple token, return existing user
        throw new Error('Apple OAuth Not implemented');
    }
}
