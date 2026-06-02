import { validateSync } from 'class-validator';
import { SignupDto } from './src/auth/dto/requests/signup.dto';
import { AuthStrategy } from './src/auth/enums/auth-type.enum';

const testDto = (phone: string) => {
  const dto = new SignupDto();
  dto.method = AuthStrategy.PHONE;
  dto.phone = phone;
  const errors = validateSync(dto);
  console.log(`Validation errors for ${phone}:`, errors.length > 0 ? errors.map(e => e.constraints) : 'None (Valid!)');
};

console.log('--- Testing SignupDto with @Matches() ---');
testDto('+447455731149'); // without leading zero
testDto('+4407455731149'); // with leading zero
testDto('invalid_phone'); // invalid string
