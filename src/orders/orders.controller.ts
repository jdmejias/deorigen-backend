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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service.js';
import { PdfService } from './pdf.service.js';
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
  constructor(
    private ordersService: OrdersService,
    private pdfService: PdfService,
  ) {}

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
  @Roles(Role.ADMIN, Role.PARTNER)
  @ApiOperation({ summary: 'Listar pedidos (admin/partner)' })
  findAll(
    @Query() query: OrdersQueryDto,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.findAllForRole(query, pagination, user);
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdminOrPartner = user?.role === 'ADMIN' || user?.role === 'PARTNER';
    // BUY-02: pass the caller's userId so the service can enforce ownership
    return this.ordersService.findOne(id, user?.id, isAdminOrPartner);
  }

  // BUY-03: Download PDF receipt/invoice for an order
  @Get(':id/pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Descargar PDF del pedido' })
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const isAdminOrPartner = user?.role === 'ADMIN' || user?.role === 'PARTNER';
    const order = await this.ordersService.findOne(id, user?.id, isAdminOrPartner);
    const pdfBuffer = await this.pdfService.generateOrderPdf(order);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pedido-${order.orderNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
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
