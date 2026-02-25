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
import { ProductsService } from './products.service.js';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductsQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
} from './dto/products.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  /* ── Public endpoints ── */

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar productos (público)' })
  findAll(@Query() query: ProductsQueryDto, @Query() pagination: PaginationDto) {
    return this.productsService.findAll(query, pagination);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Detalle producto por slug (público)' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  /* ── Admin endpoints ── */

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar producto (admin)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

/* ── Categories ── */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar categorías' })
  findAll() {
    return this.productsService.findAllCategories();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear categoría (admin)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoría (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.productsService.updateCategory(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar categoría (admin)' })
  remove(@Param('id') id: string) {
    return this.productsService.deleteCategory(id);
  }
}

/* ── Brands ── */
@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar marcas' })
  findAll() {
    return this.productsService.findAllBrands();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear marca (admin)' })
  create(@Body() dto: CreateBrandDto) {
    return this.productsService.createBrand(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar marca (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.productsService.updateBrand(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar marca (admin)' })
  remove(@Param('id') id: string) {
    return this.productsService.deleteBrand(id);
  }
}
