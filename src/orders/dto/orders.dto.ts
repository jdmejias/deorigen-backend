import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FulfillmentType, OrderStatus } from '@prisma/client';

export class OrderItemInput {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ enum: FulfillmentType })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;
}

export class CreateOrderDto {
  /* ── Guest fields (when not logged in) ── */
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestPhone?: string;

  /* ── Fulfillment ── */
  @ApiPropertyOptional({ enum: FulfillmentType, default: FulfillmentType.LOCAL_WAREHOUSE })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  /* ── Shipping address ── */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingZip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingPhone?: string;

  // BUY-01: voluntary support contribution (not taxed, not a physical item)
  @ApiPropertyOptional({ description: 'Monto voluntario de apoyo/donación (no se aplica IVA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  supportAmount?: number;

  /* ── Items ── */
  @ApiProperty({ type: [OrderItemInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Tracking number' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class OrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;
}
