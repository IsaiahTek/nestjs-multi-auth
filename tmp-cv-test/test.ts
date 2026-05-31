import { validateSync, IsPhoneNumber } from 'class-validator';

class Test {
  @IsPhoneNumber()
  phone?: string;
}

const t1 = new Test();
t1.phone = '+447455731149';
const errors1 = validateSync(t1);
console.log('Errors without libphonenumber-js:', errors1.map(e => e.constraints));
