import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class OtpDto {
  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  otp: string;
}