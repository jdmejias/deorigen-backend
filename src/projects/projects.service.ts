import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateInvestmentDto,
} from './dto/projects.dto.js';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto.js';
import { ProjectStatus, InvestmentStatus, Prisma } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async findAll(pagination: PaginationDto) {
    const where: Prisma.ProjectWhereInput = { status: ProjectStatus.ACTIVE };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          farmer: {
            select: {
              id: true,
              slug: true,
              region: true,
              user: { select: { name: true } },
            },
          },
          _count: { select: { investments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  async findBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      include: {
        farmer: {
          include: { user: { select: { name: true } } },
        },
        investments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            note: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { investments: true } },
      },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async create(dto: CreateProjectDto) {
    const slug = await this.uniqueSlug(
      slugify(dto.title, { lower: true, strict: true }),
    );

    return this.prisma.project.create({
      data: {
        farmerId: dto.farmerId,
        title: dto.title,
        slug,
        description: dto.description,
        goalAmount: dto.goalAmount,
        currency: dto.currency ?? 'EUR',
        imageUrl: dto.imageUrl,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status: ProjectStatus.DRAFT,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const data: any = { ...dto };
    if (dto.title) {
      data.slug = await this.uniqueSlug(
        slugify(dto.title, { lower: true, strict: true }),
        id,
      );
    }
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);
    if (dto.status) data.status = dto.status as ProjectStatus;

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async invest(dto: CreateInvestmentDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Proyecto no está activo');
    }

    // INV-01: Create investment as PENDING — raisedAmount is only incremented on admin confirmation
    const investment = await this.prisma.investment.create({
      data: {
        projectId: dto.projectId,
        userId,
        amount: dto.amount,
        currency: project.currency,
        status: InvestmentStatus.PENDING,
        note: dto.note,
      },
      include: {
        user: { select: { email: true, name: true } },
        project: { select: { title: true } },
      },
    });

    // INV-03: Send confirmation email to investor
    try {
      await this.email.sendInvestmentConfirmation(
        investment.user.email,
        investment.project.title,
        investment.amount.toString(),
        investment.currency,
      );
    } catch (_) {
      // non-blocking — don't fail the request if email fails
    }

    return {
      id: investment.id,
      projectId: investment.projectId,
      amount: investment.amount,
      currency: investment.currency,
      status: investment.status,
      note: investment.note,
      createdAt: investment.createdAt,
    };
  }

  // INV-01 admin: confirm investment and credit raisedAmount
  async confirmInvestment(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
    });
    if (!investment) throw new NotFoundException('Inversión no encontrada');
    if (investment.status !== InvestmentStatus.PENDING) {
      throw new BadRequestException('La inversión no está en estado PENDING');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.investment.update({
        where: { id: investmentId },
        data: { status: InvestmentStatus.CONFIRMED },
      });
      await tx.project.update({
        where: { id: investment.projectId },
        data: { raisedAmount: { increment: investment.amount } },
      });
      return updated;
    });
  }

  // ADM-03: bulk confirm pending investments
  async bulkConfirmInvestments(ids: string[]) {
    const investments = await this.prisma.investment.findMany({
      where: { id: { in: ids }, status: InvestmentStatus.PENDING },
    });
    if (!investments.length) return { updated: 0 };

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.investment.updateMany({
        where: { id: { in: ids }, status: InvestmentStatus.PENDING },
        data: { status: InvestmentStatus.CONFIRMED },
      });
      for (const inv of investments) {
        await tx.project.update({
          where: { id: inv.projectId },
          data: { raisedAmount: { increment: inv.amount } },
        });
      }
      return { updated: result.count, action: 'confirmed' };
    });
  }

  async getMyInvestments(userId: string, pagination: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.investment.findMany({
        where: { userId },
        include: {
          project: {
            select: { id: true, title: true, slug: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.investment.count({ where: { userId } }),
    ]);

    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 0;
    while (true) {
      const existing = await this.prisma.project.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) break;
      counter++;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
