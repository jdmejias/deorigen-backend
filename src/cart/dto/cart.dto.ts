import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FulfillmentType } from '@prisma/client';

export class AddToCartDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({ enum: FulfillmentType, default: FulfillmentType.LOCAL_WAREHOUSE })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType = FulfillmentType.LOCAL_WAREHOUSE;
}

export class UpdateCartItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;
}
