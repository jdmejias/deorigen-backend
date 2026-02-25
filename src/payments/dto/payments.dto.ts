import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'Payment method (stripe, paypal, etc.)' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Return URL after payment' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class PaymentWebhookDto {
  @ApiProperty()
  provider: string;

  @ApiProperty()
  externalId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  rawBody?: any;
}
