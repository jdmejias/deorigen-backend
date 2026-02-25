import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(dto: CreateProductDto) {
    const farmer = await this.prisma.farmerProfile.findUnique({
      where: { id: dto.farmerId },
    });
    if (!farmer) throw new NotFoundException('Productor no encontrado');

    const baseSlug = slugify(dto.name, { lower: true, strict: true });
    const slug = await this.uniqueSlug(baseSlug);

    return this.prisma.product.create({
      data: {
        farmerId: dto.farmerId,
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
        characteristics: dto.characteristics ?? undefined,
      },
      include: {
        category: true,
        brand: true,
        farmer: { select: { id: true, slug: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const data: any = { ...dto };
    if (dto.name) {
      data.slug = await this.uniqueSlug(
        slugify(dto.name, { lower: true, strict: true }),
        id,
      );
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        brand: true,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
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
