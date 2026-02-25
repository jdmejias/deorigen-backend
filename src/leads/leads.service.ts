import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateLeadDto,
  CreateSupportTicketDto,
  UpdateTicketStatusDto,
} from './dto/leads.dto.js';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto.js';
import { TicketStatus } from '@prisma/client';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /* ────────── Leads ────────── */

  async createLead(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({ data: dto });

    // Notify admin
    this.emailService
      .sendAdminNotification(
        `Nuevo lead ${dto.type}: ${dto.name}`,
        `
        Tipo: ${dto.type}
        Nombre: ${dto.name}
        Email: ${dto.email}
        Empresa: ${dto.company || 'N/A'}
        País: ${dto.country || 'N/A'}
        Ciudad: ${dto.city || 'N/A'}
        Producto interés: ${dto.productInterest || 'N/A'}
        Volumen estimado: ${dto.estimatedVolume || 'N/A'}
        Mensaje: ${dto.message || 'N/A'}
        `,
      )
      .catch(() => {}); // Best-effort

    return lead;
  }

  async findAllLeads(type?: string, pagination?: PaginationDto) {
    const where = type ? { type } : {};
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async markLeadRead(id: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /* ────────── Support Tickets ────────── */

  async createTicket(dto: CreateSupportTicketDto, userId?: string) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ...dto,
        userId,
      },
    });

    // Notify admin
    this.emailService
      .sendAdminNotification(
        `Nuevo ticket de soporte: ${dto.subject}`,
        `De: ${dto.name} (${dto.email})\n\n${dto.message}`,
      )
      .catch(() => {});

    return ticket;
  }

  async findAllTickets(pagination?: PaginationDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count(),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async updateTicketStatus(id: string, dto: UpdateTicketStatusDto) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: dto.status as TicketStatus },
    });
  }
}
