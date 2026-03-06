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

/**
 * Wompi sends this shape on every transaction.updated event:
 * {
 *   event: "transaction.updated",
 *   data: { transaction: { id, reference, status, amount_in_cents, currency, ... } },
 *   environment: "test" | "prod",
 *   timestamp: 1635966481,
 *   signature: { checksum: "sha256hex", properties: ["transaction.id", ...] }
 * }
 *
 * `data.transaction.reference` is the orderNumber we send in the widget/checkout session.
 * `data.transaction.status`    is  APPROVED | DECLINED | VOIDED | ERROR
 */
export class WompiWebhookDto {
  @ApiProperty({ example: 'transaction.updated' })
  event: string;

  @ApiProperty()
  data: {
    transaction: {
      id: string;
      reference: string;      // = our orderNumber
      status: string;         // APPROVED | DECLINED | VOIDED | ERROR
      amount_in_cents: number;
      currency: string;
      [key: string]: any;
    };
  };

  @ApiPropertyOptional()
  environment?: string;

  @ApiPropertyOptional()
  timestamp?: number;

  @ApiPropertyOptional()
  signature?: {
    checksum: string;
    properties: string[];
  };
}
