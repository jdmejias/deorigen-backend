import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFarmerProfileDto {
  @ApiProperty({ description: 'ID del usuario farmer' })
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'URL vídeo YouTube/Vimeo' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class UpdateFarmerProfileDto {
  @ApiPropertyOptional({ description: 'Nombre visible del productor (actualiza User.name)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Inicio periodo destacado (ISO)' })
  @IsOptional()
  @IsDateString()
  featuredFrom?: string;

  @ApiPropertyOptional({ description: 'Fin periodo destacado (ISO)' })
  @IsOptional()
  @IsDateString()
  featuredTo?: string;
}

export class FarmersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Solo activos del mes', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;
}

// ── Contact Farmer ──────────────────────────────────────────────
export class ContactFarmerDto {
  @ApiProperty({ description: 'Nombre de quien contacta' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email de quien contacta' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Mensaje' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Teléfono (opcional)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Nombre del producto de contexto (si aplica)' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Slug del producto de contexto (si aplica)' })
  @IsOptional()
  @IsString()
  productSlug?: string;
}
