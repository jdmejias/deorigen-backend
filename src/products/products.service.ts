import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductsQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
} from './dto/products.dto.js';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto.js';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /* ────────── CATEGORIES ────────── */

  async findAllCategories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.category.create({
      data: { name: dto.name, slug, icon: dto.icon, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    const data: any = { ...dto };
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  /* ────────── BRANDS ────────── */

  async findAllBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async createBrand(dto: CreateBrandDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.brand.create({
      data: { name: dto.name, slug, logoUrl: dto.logoUrl },
    });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca no encontrada');
    const data: any = { ...dto };
    if (dto.name) data.slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.brand.update({ where: { id }, data });
  }

  async deleteBrand(id: string) {
    await this.prisma.brand.delete({ where: { id } });
    return { deleted: true };
  }

  /* ────────── PRODUCTS ────────── */

  async findAll(query: ProductsQueryDto, pagination: PaginationDto) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    // PRT-03: hide B2B products from public B2C store unless explicitly requested
    if (!query.includeB2b) {
      where.isB2B = false;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.brand) {
      where.brand = { slug: query.brand };
    }
    if (query.farmerId) {
      where.farmerId = query.farmerId;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) (where.price as any).gte = query.minPrice;
      if (query.maxPrice !== undefined) (where.price as any).lte = query.maxPrice;
    }
    if (query.featured) {
      where.isFeatured = true;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          farmer: {
            select: { id: true, slug: true, user: { select: { name: true } } },
          },
          media: { orderBy: { sortOrder: 'asc' }, take: 3 },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        farmer: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        inventoryItems: {
          include: {
            warehouse: {
              include: { country: { select: { id: true, name: true, code: true } } },
            },
          },
          where: { quantity: { gt: 0 } },
        },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(dto: CreateProductDto, currentUserId?: string) {
    // Security: if caller is a FARMER, resolve and enforce their own FarmerProfile.id
    let resolvedFarmerId: string;
    if (currentUserId) {
      const profile = await this.prisma.farmerProfile.findUnique({ where: { userId: currentUserId } });
      if (!profile) throw new NotFoundException('Perfil de productor no encontrado para este usuario');
      resolvedFarmerId = profile.id;
    } else {
      const farmer = await this.prisma.farmerProfile.findUnique({ where: { id: dto.farmerId } });
      if (!farmer) throw new NotFoundException('Productor no encontrado');
      resolvedFarmerId = farmer.id;
    }

    // Validate categoryId before insert to return 400 instead of Prisma P2003 (500)
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException(`Categoría con id '${dto.categoryId}' no existe`);
    }

    // Validate brandId before insert
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new BadRequestException(`Marca con id '${dto.brandId}' no existe`);
    }

    const baseSlug = slugify(dto.name, { lower: true, strict: true });
    const slug = await this.uniqueSlug(baseSlug);

    const product = await this.prisma.product.create({
      data: {
        farmerId: resolvedFarmerId,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        currency: dto.currency ?? 'EUR',
        weight: dto.weight,
        weightUnit: dto.weightUnit ?? 'g',
        sku: dto.sku,
        stock: dto.stock ?? 0,
        isActive: false, // Products must be approved by admin (FRM-01)
        characteristics: dto.characteristics ?? undefined,
      },
      include: {
        category: true,
        brand: true,
        farmer: { select: { id: true, slug: true } },
      },
    });

    // If an imageUrl was provided, create a Media record linked to this product
    if (dto.imageUrl) {
      await this.prisma.media.create({
        data: {
          productId: product.id,
          url: dto.imageUrl,
          type: 'image',
          altText: dto.name,
          sortOrder: 0,
        },
      });
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    // Extract imageUrl before spreading to avoid passing it to Prisma Product update
    const { imageUrl, ...rest } = dto as UpdateProductDto & { imageUrl?: string };
    const data: any = { ...rest };
    if (dto.name) {
      data.slug = await this.uniqueSlug(
        slugify(dto.name, { lower: true, strict: true }),
        id,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        brand: true,
      },
    });

    // If an imageUrl was provided, upsert the first Media record for this product
    if (imageUrl) {
      const existing = await this.prisma.media.findFirst({ where: { productId: id }, orderBy: { sortOrder: 'asc' } });
      if (existing) {
        await this.prisma.media.update({ where: { id: existing.id }, data: { url: imageUrl, altText: dto.name ?? product.name } });
      } else {
        await this.prisma.media.create({ data: { productId: id, url: imageUrl, type: 'image', altText: dto.name ?? product.name, sortOrder: 0 } });
      }
    }

    return updated;
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  /* ── Admin bulk actions (ADM-03) ── */

  async findPendingApproval(pagination: PaginationDto) {
    const where: Prisma.ProductWhereInput = { isActive: false };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          farmer: { select: { id: true, slug: true, user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  async bulkApproveProducts(ids: string[]) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive: true },
    });
    return { updated: result.count, action: 'approved' };
  }

  async bulkRejectProducts(ids: string[]) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });
    return { updated: result.count, action: 'rejected' };
  }

  /* ── Helpers ── */
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) break;
      counter++;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
