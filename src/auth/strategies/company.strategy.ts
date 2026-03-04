// import { Injectable } from '@nestjs/common';
// import { Repository } from 'typeorm';
// import { InjectRepository } from '@nestjs/typeorm';
// import { SignupDto } from 'src/auth/dto/signup.dto';
// import { Auth } from '../entities/auth.entity';

// @Injectable()
// export class CompanyAuthStrategy {
//   constructor(
//     @InjectRepository(Auth) private authRepo: Repository<Auth>,
//   ) {}

//   async signup(dto: SignupDto): Promise<Auth> {
//     // Send OTP to phone, create user after verification
//     // if(dto.)
//     const user = this.authRepo.create({
//       email: dto.email,
//       phone: dto.phone,
//       role: dto.role,
//       company: {
//         companyName: dto.companyName,
//         registrationNumber: dto.registrationNo,
//       },
//     });
//     return this.authRepo.save(user);
//   }
// }
