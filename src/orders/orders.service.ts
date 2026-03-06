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
import { EmailService } from '../email/email.service.js';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

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

    // BUY-01: supportAmount is a voluntary contribution — excluded from tax base
    const supportAmount = new Prisma.Decimal(dto.supportAmount ?? 0);
    const total = subtotal.add(supportAmount);

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
        supportAmount,
        total,
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

  async findAllForRole(query: OrdersQueryDto, pagination: PaginationDto, user: any) {
    if (user.role === 'PARTNER') {
      const partner = await this.prisma.partner.findUnique({
        where: { userId: user.id },
        include: { country: true }
      });
      if (partner?.country?.code) {
        query.countryCode = partner.country.code;
      }
    }
    return this.findAll(query, pagination);
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

  // BUY-02: caller must provide their userId; ADMIN/PARTNER can read any order
  async findOne(id: string, requestUserId?: string, isAdminOrPartner = false) {
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

    // Enforce ownership: non-admin users can only view their own orders
    if (!isAdminOrPartner && requestUserId && order.userId !== requestUserId) {
      throw new NotFoundException('Pedido no encontrado');
    }

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

    if ((dto.status === OrderStatus.SHIPPED || dto.status === OrderStatus.DELIVERED) && !dto.trackingNumber && !order.trackingNumber) {
      throw new BadRequestException("El número de rastreo (trackingNumber) es obligatorio para marcar como Enviado o Entregado.");
    }

    const data: any = { status: dto.status };

    if (dto.trackingNumber) data.trackingNumber = dto.trackingNumber;

    if (dto.status === OrderStatus.SHIPPED) data.shippedAt = new Date();
    if (dto.status === OrderStatus.DELIVERED) data.deliveredAt = new Date();
    if (dto.status === OrderStatus.CONFIRMED) data.paidAt = new Date();

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true, events: { orderBy: { createdAt: 'asc' } }, user: { select: { email: true } } },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: id,
        status: dto.status,
        note: dto.note,
      },
    });

    // P0-03/P1-03: notify buyer on relevant status transitions
    const notifyStatuses: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];
    if (notifyStatuses.includes(dto.status)) {
      const buyerEmail = (updated as any).user?.email ?? order.guestEmail;
      if (buyerEmail) {
        // fire-and-forget — don't fail the status update if email fails
        this.email
          .sendOrderStatusUpdate(buyerEmail, updated.orderNumber, dto.status)
          .catch(() => undefined);
      }
    }

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
