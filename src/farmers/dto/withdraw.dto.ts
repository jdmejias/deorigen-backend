import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankAccountInfo: string;
}
