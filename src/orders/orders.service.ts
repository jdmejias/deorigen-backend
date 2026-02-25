import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrdersQueryDto,
} from './dto/orders.dto.js';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto.js';
import { Prisma, FulfillmentType, OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto, userId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }

    // Resolve products & prices
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no encontrados');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const orderItems: any[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.price;
      const total = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(total);

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        quantity: item.quantity,
        unitPrice,
        total,
        fulfillmentType:
          item.fulfillmentType ??
          dto.fulfillmentType ??
          FulfillmentType.LOCAL_WAREHOUSE,
      });
    }

    const orderNumber = `DO-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: userId ?? null,
        guestEmail: dto.guestEmail,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        fulfillmentType: dto.fulfillmentType ?? FulfillmentType.LOCAL_WAREHOUSE,
        countryCode: dto.countryCode,
        shippingName: dto.shippingName,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingState: dto.shippingState,
        shippingZip: dto.shippingZip,
        shippingCountry: dto.shippingCountry,
        shippingPhone: dto.shippingPhone,
        subtotal,
        shippingCost: 0,
        tax: 0,
        total: subtotal,
        currency: products[0].currency,
        items: { create: orderItems },
        events: {
          create: { status: OrderStatus.PENDING, note: 'Pedido creado' },
        },
      },
      include: {
        items: true,
        events: true,
      },
    });

    return order;
  }

  async findAll(query: OrdersQueryDto, pagination: PaginationDto, userId?: string) {
    const where: Prisma.OrderWhereInput = {};

    if (userId) where.userId = userId;
    if (query.status) where.status = query.status;
    if (query.countryCode) where.countryCode = query.countryCode;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { guestEmail: { contains: query.search, mode: 'insensitive' } },
        { guestName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { select: { id: true, productName: true, quantity: true, total: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                media: { take: 1, orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const data: any = { status: dto.status };

    if (dto.status === OrderStatus.SHIPPED) data.shippedAt = new Date();
    if (dto.status === OrderStatus.DELIVERED) data.deliveredAt = new Date();
    if (dto.status === OrderStatus.CONFIRMED) data.paidAt = new Date();

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: id,
        status: dto.status,
        note: dto.note,
      },
    });

    return updated;
  }

  /** Get orders assigned to a partner's country */
  async findByCountry(countryCode: string, query: OrdersQueryDto, pagination: PaginationDto) {
    const where: Prisma.OrderWhereInput = {
      countryCode,
      fulfillmentType: FulfillmentType.LOCAL_WAREHOUSE,
    };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }
}
