import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FarmersService } from './farmers.service.js';
import {
  CreateFarmerProfileDto,
  UpdateFarmerProfileDto,
  FarmersQueryDto,
} from './dto/farmers.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('farmers')
@Controller('farmers')
export class FarmersController {
  constructor(private farmersService: FarmersService) {}

  @Public()
  @Get('featured')
  @ApiOperation({ summary: '20 productores destacados del mes' })
  getFeatured() {
    return this.farmersService.findFeatured();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar productores (público)' })
  findAll(@Query() query: FarmersQueryDto, @Query() pagination: PaginationDto) {
    return this.farmersService.findAll(query, pagination);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Perfil productor por slug (público)' })
  findBySlug(@Param('slug') slug: string) {
    return this.farmersService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear perfil productor (admin)' })
  create(@Body() dto: CreateFarmerProfileDto) {
    return this.farmersService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Actualizar perfil productor' })
  update(@Param('id') id: string, @Body() dto: UpdateFarmerProfileDto) {
    return this.farmersService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar perfil productor (admin)' })
  remove(@Param('id') id: string) {
    return this.farmersService.remove(id);
  }
}
