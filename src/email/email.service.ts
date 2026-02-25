import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly adminEmail: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.from = this.config.get('SMTP_FROM', 'noreply@deorigencampesino.com');
    this.adminEmail = this.config.get('ADMIN_EMAIL', 'admin@deorigencampesino.com');

    const host = this.config.get('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get('SMTP_PORT', '587')),
        secure: this.config.get('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn('SMTP not configured, emails will be logged only');
    }
  }

  async send(to: string, subject: string, html: string) {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({ from: this.from, to, subject, html });
      } else {
        this.logger.log(`[EMAIL-MOCK] To: ${to} | Subject: ${subject}`);
      }

      await this.prisma.emailLog.create({
        data: { to, subject, body: html, status: 'sent' },
      });
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}`, error.message);
      await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          body: html,
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  async sendAdminNotification(subject: string, body: string) {
    await this.send(
      this.adminEmail,
      `[DeOrigen Admin] ${subject}`,
      `<pre>${body}</pre>`,
    );
  }

  async sendOrderConfirmation(email: string, orderNumber: string, total: string) {
    const html = `
      <h2>¡Gracias por tu pedido!</h2>
      <p>Tu pedido <strong>${orderNumber}</strong> ha sido recibido.</p>
      <p>Total: <strong>${total}</strong></p>
      <p style="margin-top:20px;color:#666;">
        <em>"En DeOrigen, Conectamos el campo colombiano con el mundo"</em>
      </p>
    `;
    await this.send(email, `Pedido ${orderNumber} confirmado – DeOrigen`, html);
  }
}
