import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PartnersService } from './partners.service.js';
import {
  CreateCountryDto,
  UpdateCountryDto,
  CreatePartnerDto,
  UpdatePartnerDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  UpsertInventoryDto,
} from './dto/partners.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

/* ── Countries ── */
@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private partnersService: PartnersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar países activos' })
  findAll() {
    return this.partnersService.findAllCountries();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear país (admin)' })
  create(@Body() dto: CreateCountryDto) {
    return this.partnersService.createCountry(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar país (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.partnersService.updateCountry(id, dto);
  }
}

/* ── Partners ── */
@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private partnersService: PartnersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar partners (admin)' })
  findAll() {
    return this.partnersService.findAllPartners();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear partner (admin)' })
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.createPartner(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar partner (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.updatePartner(id, dto);
  }
}

/* ── Warehouses ── */
@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private partnersService: PartnersService) {}

  @Get('partner/:partnerId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Bodegas de un partner' })
  findByPartner(@Param('partnerId') partnerId: string) {
    return this.partnersService.findWarehousesByPartner(partnerId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear bodega (admin)' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.partnersService.createWarehouse(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Actualizar bodega' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.partnersService.updateWarehouse(id, dto);
  }
}

/* ── Inventory ── */
@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private partnersService: PartnersService) {}

  @Get('warehouse/:warehouseId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Inventario de una bodega' })
  getInventory(@Param('warehouseId') warehouseId: string) {
    return this.partnersService.getInventory(warehouseId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Crear/actualizar inventario' })
  upsert(@Body() dto: UpsertInventoryDto) {
    return this.partnersService.upsertInventory(dto);
  }

  @Public()
  @Get('check/:countryCode/:productId')
  @ApiOperation({ summary: 'Verificar stock local en un país' })
  checkStock(
    @Param('countryCode') countryCode: string,
    @Param('productId') productId: string,
  ) {
    return this.partnersService.checkLocalStock(countryCode, productId);
  }
}
