import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateFarmerProfileDto,
  UpdateFarmerProfileDto,
  FarmersQueryDto,
} from './dto/farmers.dto.js';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto.js';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class FarmersService {
  constructor(private prisma: PrismaService) {}

  /* ── Featured (20 del mes) ── */
  async findFeatured() {
    const now = new Date();
    return this.prisma.farmerProfile.findMany({
      where: {
        isActive: true,
        featuredFrom: { lte: now },
        featuredTo: { gte: now },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        products: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, price: true, currency: true },
          take: 4,
        },
      },
      orderBy: { featuredFrom: 'desc' },
      take: 20,
    });
  }

  /* ── All farmers (public) ── */
  async findAll(query: FarmersQueryDto, pagination: PaginationDto) {
    const where: Prisma.FarmerProfileWhereInput = { isActive: true };

    if (query.search) {
      where.OR = [
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { region: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.region) {
      where.region = { contains: query.region, mode: 'insensitive' };
    }
    if (query.category) {
      where.products = {
        some: {
          category: { slug: query.category },
        },
      };
    }
    if (query.featured) {
      const now = new Date();
      where.featuredFrom = { lte: now };
      where.featuredTo = { gte: now };
    }

    const [data, total] = await Promise.all([
      this.prisma.farmerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.farmerProfile.count({ where }),
    ]);

    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  /* ── By slug (public) ── */
  async findBySlug(slug: string) {
    const farmer = await this.prisma.farmerProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, name: true, email: true } },
        products: {
          where: { isActive: true },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            media: { orderBy: { sortOrder: 'asc' }, take: 5 },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        projects: {
          where: { status: 'ACTIVE' },
          select: { id: true, title: true, slug: true, goalAmount: true, raisedAmount: true },
        },
      },
    });
    if (!farmer) throw new NotFoundException('Productor no encontrado');
    return farmer;
  }

  /* ── Create ── */
  async create(dto: CreateFarmerProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const existing = await this.prisma.farmerProfile.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) throw new ConflictException('El usuario ya tiene perfil de productor');

    const baseSlug = slugify(user.name || user.email.split('@')[0], {
      lower: true,
      strict: true,
    });
    const slug = await this.uniqueSlug(baseSlug);

    return this.prisma.farmerProfile.create({
      data: {
        userId: dto.userId,
        slug,
        bio: dto.bio,
        region: dto.region,
        department: dto.department,
        videoUrl: dto.videoUrl,
        thumbnailUrl: dto.thumbnailUrl,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /* ── Update ── */
  async update(id: string, dto: UpdateFarmerProfileDto) {
    const farmer = await this.prisma.farmerProfile.findUnique({ where: { id } });
    if (!farmer) throw new NotFoundException('Perfil de productor no encontrado');

    return this.prisma.farmerProfile.update({
      where: { id },
      data: {
        ...dto,
        featuredFrom: dto.featuredFrom ? new Date(dto.featuredFrom) : undefined,
        featuredTo: dto.featuredTo ? new Date(dto.featuredTo) : undefined,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  /* ── Delete ── */
  async remove(id: string) {
    const farmer = await this.prisma.farmerProfile.findUnique({ where: { id } });
    if (!farmer) throw new NotFoundException('Perfil de productor no encontrado');
    await this.prisma.farmerProfile.delete({ where: { id } });
    return { deleted: true };
  }

  /* ── Withdrawals ── */
  async createWithdrawal(farmerId: string, amount: number, bankAccountInfo: string) {
    const farmer = await this.prisma.farmerProfile.findUnique({ where: { id: farmerId } });
    if (!farmer) throw new NotFoundException('Productor no encontrado');
    if (farmer.availableBalance.toNumber() < amount) {
      throw new ConflictException('Saldo insuficiente para retirar');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create withdrawal request
      // INV-02: bankAccountInfo is stored but never returned to the API caller
      const withdrawal = await tx.withdrawal.create({
        data: {
          farmerId,
          amount,
          bankAccountInfo,
          status: 'PENDING',
        },
        select: {
          id: true,
          farmerId: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          // bankAccountInfo intentionally excluded from response
        },
      });
      // Freeze the balance
      await tx.farmerProfile.update({
        where: { id: farmerId },
        data: {
          availableBalance: { decrement: amount },
          lockedBalance: { increment: amount }
        }
      });
      return withdrawal;
    });
  }

  /* ── Helpers ── */
  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 0;
    while (await this.prisma.farmerProfile.findUnique({ where: { slug } })) {
      counter++;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
