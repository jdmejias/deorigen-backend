import { Injectable, NotFoundException, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCheckoutDto } from './dto/payments.dto.js';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { EmailService } from '../email/email.service.js';
import * as QRCode from 'qrcode';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * MVP: create a payment record for the order.
   * Returns { paymentId, orderId, orderNumber, amount, currency, status: PENDING }
   * TODO: Wompi integration — caller should open Wompi popup with orderNumber as reference.
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
      // TODO: Wompi — pass orderNumber as `reference` to WompiWidget
    };
  }

  /**
   * Wompi-specific webhook handler.
   *
   * Wompi payload (transaction.updated):
   * {
   *   event: "transaction.updated",
   *   data: { transaction: { id, reference, status, amount_in_cents, currency, ... } },
   *   timestamp: <unix>,
   *   signature: { checksum: "<sha256>", properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"] }
   * }
   *
   * `data.transaction.reference` = our orderNumber (passed as `reference` to WompiWidget).
   * `data.transaction.status`    = APPROVED | DECLINED | VOIDED | ERROR
   *
   * Signature: SHA256( prop_values_concatenated + WOMPI_EVENT_KEY ) == signature.checksum
   * Activate by setting WOMPI_EVENT_KEY env var.
   */
  async handleWompiWebhook(body: Record<string, any>): Promise<{ received: boolean; matched: boolean; status?: string }> {
    const transaction: Record<string, any> | undefined = body?.data?.transaction;

    if (!transaction) {
      this.logger.warn('[WOMPI] Payload missing data.transaction — ignoring');
      return { received: true, matched: false };
    }

    // ── Signature validation ────────────────────────────────────────────────
    // TODO: set WOMPI_EVENT_KEY in .env (from Wompi Dashboard → Developers → Events)
    const eventKey = process.env.WOMPI_EVENT_KEY;
    if (eventKey) {
      const sig = body?.signature as { checksum?: string; properties?: string[] } | undefined;
      if (!sig?.checksum || !Array.isArray(sig.properties)) {
        throw new UnauthorizedException('Missing Wompi signature');
      }
      const rawConcatenated =
        sig.properties
          .map((prop: string) => {
            // "transaction.id" → transaction["id"]
            const key = prop.split('.').slice(1).join('.');
            return String(transaction[key] ?? '');
          })
          .join('') + eventKey;
      const expected = crypto.createHash('sha256').update(rawConcatenated).digest('hex');
      if (expected !== sig.checksum) {
        this.logger.warn('[WOMPI] Invalid signature — request rejected');
        throw new UnauthorizedException('Invalid Wompi signature');
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    const wompiTxId: string   = String(transaction['id'] ?? '');
    const reference: string   = String(transaction['reference'] ?? ''); // = our orderNumber
    const wompiStatus: string = String(transaction['status'] ?? '');

    this.logger.log(`[WOMPI] event=${body.event} ref=${reference} txId=${wompiTxId} wompiStatus=${wompiStatus}`);

    // Find order by orderNumber (the reference passed to the Wompi widget)
    const order = await this.prisma.order.findUnique({ where: { orderNumber: reference } });
    if (!order) {
      this.logger.warn(`[WOMPI] matched=false — no order for reference=${reference}`);
      return { received: true, matched: false };
    }

    // Find the most recent PENDING payment for this order
    const payment = await this.prisma.payment.findFirst({
      where:   { orderId: order.id, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      this.logger.warn(`[WOMPI] matched=false — no PENDING payment for orderId=${order.id}`);
      return { received: true, matched: false };
    }

    const newStatus: PaymentStatus =
      wompiStatus === 'APPROVED' ? PaymentStatus.PAID : PaymentStatus.FAILED;

    // Store the Wompi transaction ID and update status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data:  { externalId: wompiTxId, status: newStatus, rawResponse: body },
    });

    if (newStatus === PaymentStatus.PAID) {
      await this.prisma.order.update({
        where: { id: order.id },
        data:  { status: OrderStatus.CONFIRMED, paidAt: new Date() },
      });
      await this.prisma.orderEvent.create({
        data: { orderId: order.id, status: OrderStatus.CONFIRMED,
                note: `Pago Wompi confirmado. TX: ${wompiTxId}` },
      });
      const email =
        order.guestEmail ??
        (order.userId
          ? (await this.prisma.user.findUnique({ where: { id: order.userId } }))?.email
          : null);
      if (email) {
        await this.emailService
          .sendOrderConfirmation(email, order.orderNumber, `${order.total} ${order.currency}`)
          .catch(() => undefined);
      }
      this.logger.log(`[WOMPI] ✅ matched=true ref=${reference} txId=${wompiTxId} → PAID, order CONFIRMED`);
    } else {
      // Failed — leave order PENDING so buyer can retry
      await this.prisma.orderEvent.create({
        data: { orderId: order.id, status: order.status,
                note: `Pago Wompi fallido (${wompiStatus}). TX: ${wompiTxId}` },
      });
      this.logger.warn(`[WOMPI] ❌ matched=true ref=${reference} txId=${wompiTxId} wompiStatus=${wompiStatus} → FAILED`);
    }

    return { received: true, matched: true, status: newStatus };
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
      status === 'APPROVED' ? PaymentStatus.PAID : PaymentStatus.FAILED;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatus, rawResponse: rawBody },
    });

    if (paymentStatus === PaymentStatus.PAID) {
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
      data: { status: PaymentStatus.PAID },
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
