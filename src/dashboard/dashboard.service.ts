import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminMetrics() {
    const [
      totalUsers,
      activeFarmers,
      totalProducts,
      totalOrders,
      salesAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.farmerProfile.count({ where: { isActive: true } }),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ['CANCELLED'] } },
      }),
    ]);

    return {
      totalUsers,
      activeFarmers,
      totalProducts,
      totalOrders,
      totalSales: salesAgg._sum.total?.toNumber() ?? 0,
    };
  }

  async getFarmerSummary(userId: string) {
    const farmer = await this.prisma.farmerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        isActive: true,
        bio: true,
        region: true,
        thumbnailUrl: true,
      },
    });

    if (!farmer) {
      return {
        activeProducts: 0,
        activeProjects: 0,
        totalSupport: 0,
        isPublished: false,
        profileComplete: false,
      };
    }

    const [activeProducts, activeProjects, supportAgg] = await Promise.all([
      this.prisma.product.count({ where: { farmerId: farmer.id, isActive: true } }),
      this.prisma.project.count({ where: { farmerId: farmer.id, status: 'ACTIVE' } }),
      this.prisma.investment.aggregate({
        _sum: { amount: true },
        where: { project: { farmerId: farmer.id }, status: 'CONFIRMED' },
      }),
    ]);

    const totalSupport = supportAgg._sum.amount?.toNumber?.() ?? Number(supportAgg._sum.amount ?? 0);

    const profileComplete = Boolean(farmer.bio && farmer.region && farmer.thumbnailUrl);

    return {
      activeProducts,
      activeProjects,
      totalSupport,
      isPublished: !!farmer.isActive,
      profileComplete,
    };
  }

  /** Returns ALL products for the authenticated farmer (including inactive/pending).
   *  Response is normalized to match the frontend Product dashboard type. */
  async getFarmerProducts(userId: string) {
    const farmer = await this.prisma.farmerProfile.findUnique({
      where: { userId },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!farmer) return [];

    const products = await this.prisma.product.findMany({
      where: { farmerId: farmer.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        media: {
          select: { url: true },
          where: { type: 'image' },
          orderBy: { sortOrder: 'asc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      category: p.category?.name ?? '',
      categoryId: p.categoryId ?? undefined,
      price: Number(p.price),
      stock: p.stock,
      farmerId: p.farmerId,
      farmerName: (farmer as any).user?.name ?? '',
      images: p.media.map((m) => m.url),
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /** Returns ALL products (active + inactive/pending) for the admin dashboard. */
  async getAdminProducts() {
    const products = await this.prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        farmer: {
          select: {
            id: true,
            slug: true,
            user: { select: { name: true, email: true } },
          },
        },
        media: {
          select: { url: true },
          where: { type: 'image' },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      category: p.category?.name ?? '',
      categoryId: p.categoryId ?? undefined,
      price: Number(p.price),
      stock: p.stock,
      farmerId: p.farmerId,
      farmerName: p.farmer?.user?.name ?? p.farmer?.slug ?? '',
      images: p.media.map((m) => m.url),
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }
}
