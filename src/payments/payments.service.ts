import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCheckoutDto } from './dto/payments.dto.js';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { EmailService } from '../email/email.service.js';
import * as QRCode from 'qrcode';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * MVP: create a payment record for the order.
   * In production, integrate with Stripe/PayPal here and return a redirect URL.
   */
  async createCheckout(dto: CreateCheckoutDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: dto.method ?? 'manual',
        method: dto.method,
        amount: order.total,
        currency: order.currency,
        status: PaymentStatus.PENDING,
      },
    });

    // For MVP, return payment info (in production → redirect to gateway)
    return {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      status: payment.status,
      // In production: checkoutUrl: 'https://stripe.com/...'
    };
  }

  /**
   * Handle webhook from payment provider.
   * MVP: manually confirm payment.
   */
  async handleWebhook(provider: string, externalId: string, status: string, rawBody?: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { externalId },
      include: { order: true },
    });

    if (!payment) {
      // Could be a new notification — log it
      return { received: true, matched: false };
    }

    const paymentStatus =
      status === 'completed' ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatus, rawResponse: rawBody },
    });

    if (paymentStatus === PaymentStatus.COMPLETED) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          paidAt: new Date(),
        },
      });

      await this.prisma.orderEvent.create({
        data: {
          orderId: payment.orderId,
          status: OrderStatus.CONFIRMED,
          note: `Pago confirmado vía ${provider}`,
        },
      });

      // Send confirmation email
      const email =
        payment.order.guestEmail ??
        (payment.order.userId
          ? (
              await this.prisma.user.findUnique({
                where: { id: payment.order.userId },
              })
            )?.email
          : null);

      if (email) {
        await this.emailService.sendOrderConfirmation(
          email,
          payment.order.orderNumber,
          `${payment.order.total} ${payment.order.currency}`,
        );
      }
    }

    return { received: true, matched: true, status: paymentStatus };
  }

  /** Confirm payment manually (admin) */
  async confirmManual(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.COMPLETED },
    });

    // Generate QR
    const qrData = `https://www.deorigencampesino.com/pedido/${payment.order.orderNumber}`;
    const qrDataUrl = await QRCode.toDataURL(qrData);

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        paidAt: new Date(),
        qrCode: qrDataUrl,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: payment.orderId,
        status: OrderStatus.CONFIRMED,
        note: 'Pago confirmado manualmente',
      },
    });

    return { confirmed: true, orderNumber: payment.order.orderNumber };
  }

  async getTransaction(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, total: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('Transacción no encontrada');
    return payment;
  }

  /** Generate QR for an order */
  async generateQR(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const qrData = `https://www.deorigencampesino.com/pedido/${order.orderNumber}`;
    const qrDataUrl = await QRCode.toDataURL(qrData);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { qrCode: qrDataUrl },
    });

    return { qrCode: qrDataUrl };
  }
}
