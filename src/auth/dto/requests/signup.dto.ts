/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  IsObject,
} from 'class-validator';
import { AuthStrategy, OAuthProviderType } from '../../enums/auth-type.enum';

export class SignupDto {
  @ApiProperty({
    enum: AuthStrategy,
    example: AuthStrategy.LOCAL,
    description: 'Authentication method chosen by the user',
    type: () => AuthStrategy,
  })
  @IsEnum(AuthStrategy)
  method: AuthStrategy;

  @ApiProperty({
    enum: OAuthProviderType,
    example: OAuthProviderType.GOOGLE,
    description: 'OAuth provider (required if method is OAUTH)',
    required: false,
  })
  @IsEnum(OAuthProviderType)
  @IsOptional()
  provider?: OAuthProviderType;


  @ApiProperty({ example: '+2347035742844', required: false })
  @IsPhoneNumber('NG')
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'john_doe', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'securePassword123', required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;

  /**
   * For OAuth / OTP verification
   */
  @IsOptional()
  @IsString()
  token?: string;

  /**
   * Extra data to be returned along the signup event payload.
   * This is useful for passing additional information about the user
   * that may be needed for other purposes.
   */
  @ApiProperty({
    description: `Extra data to be returned along the signup event payload. \n` +
      `This is useful for passing additional information about the user\n` +
      `that may be needed for other purposes. \n` +
      `No extra validation is done on this data and it is not stored anywhere by the library, it is simply passed along to the event payload. \n` +
      `The extraData field can be used to pass any additional data that may be needed for other purposes. \n` +
      `For example, if you are using the signup event to create a new user profile in your application, you can pass the user's profile data in the extraData field. \n` +
      `The extraData field is optional and can be omitted if no extra data is needed.`,
    required: false,
    example: { name: 'John Doe', role: 'user', avatar: 'https://example.com/avatar.jpg', username: 'johndoe', bio: 'Software Engineer' },
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;
}
