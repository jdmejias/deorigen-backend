import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service.js';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrdersQueryDto,
} from './dto/orders.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Crear pedido (guest o autenticado)' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.create(dto, user?.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos los pedidos (admin)' })
  findAll(@Query() query: OrdersQueryDto, @Query() pagination: PaginationDto) {
    return this.ordersService.findAll(query, pagination);
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mis pedidos' })
  findMy(
    @CurrentUser('id') userId: string,
    @Query() query: OrdersQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.ordersService.findAll(query, pagination, userId);
  }

  @Public()
  @Get('track/:orderNumber')
  @ApiOperation({ summary: 'Rastrear pedido por número de orden' })
  track(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener pedido por ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Actualizar estado del pedido' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Get('country/:countryCode')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Pedidos por país (partner)' })
  findByCountry(
    @Param('countryCode') countryCode: string,
    @Query() query: OrdersQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.ordersService.findByCountry(countryCode, query, pagination);
  }
}
