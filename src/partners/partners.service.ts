import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCountryDto,
  UpdateCountryDto,
  CreatePartnerDto,
  UpdatePartnerDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  UpsertInventoryDto,
} from './dto/partners.dto.js';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  /* ────────── Countries ────────── */

  async findAllCountries() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        flag: dto.flag,
      },
    });
  }

  async updateCountry(id: string, dto: UpdateCountryDto) {
    return this.prisma.country.update({ where: { id }, data: dto });
  }

  /* ────────── Partners ────────── */

  async findAllPartners() {
    return this.prisma.partner.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        country: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPartner(dto: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: {
        userId: dto.userId,
        countryId: dto.countryId,
        companyName: dto.companyName,
        phone: dto.phone,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        country: true,
      },
    });
  }

  async updatePartner(id: string, dto: UpdatePartnerDto) {
    return this.prisma.partner.update({
      where: { id },
      data: dto,
      include: {
        user: { select: { id: true, name: true, email: true } },
        country: true,
      },
    });
  }

  /* ────────── Warehouses ────────── */

  async findWarehousesByPartner(partnerId: string) {
    return this.prisma.warehouse.findMany({
      where: { partnerId },
      include: {
        country: { select: { id: true, name: true, code: true } },
        _count: { select: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: {
        partnerId: dto.partnerId,
        countryId: dto.countryId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
      },
    });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  /* ────────── Inventory ────────── */

  async getInventory(warehouseId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { warehouseId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            sku: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertInventory(dto: UpsertInventoryDto) {
    return this.prisma.inventoryItem.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
        },
      },
      create: {
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        minStock: dto.minStock ?? 0,
      },
      update: {
        quantity: dto.quantity,
        minStock: dto.minStock ?? undefined,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /** Check stock availability in a specific country */
  async checkLocalStock(countryCode: string, productId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        productId,
        quantity: { gt: 0 },
        warehouse: {
          isActive: true,
          country: { code: countryCode, isActive: true },
        },
      },
      include: {
        warehouse: {
          select: { id: true, name: true, city: true },
        },
      },
    });
    return {
      available: items.length > 0,
      totalStock: items.reduce((sum, i) => sum + i.quantity, 0),
      warehouses: items,
    };
  }
}
