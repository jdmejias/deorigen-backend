import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto.js';
import { FulfillmentType } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /** Get or create cart for user or session */
  private async getOrCreateCart(userId?: string, sessionId?: string) {
    let cart = userId
      ? await this.prisma.cart.findUnique({ where: { userId } })
      : sessionId
        ? await this.prisma.cart.findUnique({ where: { sessionId } })
        : null;

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId, sessionId },
      });
    }
    return cart;
  }

  async getCart(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);

    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                media: { take: 1, orderBy: { sortOrder: 'asc' } },
                farmer: {
                  select: {
                    slug: true,
                    user: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async addItem(dto: AddToCartDto, userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);

    // Check product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const fulfillmentType = dto.fulfillmentType ?? FulfillmentType.LOCAL_WAREHOUSE;

    // Upsert item
    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId_fulfillmentType: {
          cartId: cart.id,
          productId: dto.productId,
          fulfillmentType,
        },
      },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (dto.quantity ?? 1) },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity ?? 1,
          fulfillmentType,
        },
      });
    }

    return this.getCart(userId, sessionId);
  }

  async updateItem(
    itemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    sessionId?: string,
  ) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item) throw new NotFoundException('Item no encontrado');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
    }

    return this.getCart(userId, sessionId);
  }

  async removeItem(itemId: string, userId?: string, sessionId?: string) {
    await this.prisma.cartItem.delete({ where: { id: itemId } }).catch(() => {
      throw new NotFoundException('Item no encontrado');
    });
    return this.getCart(userId, sessionId);
  }

  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId, sessionId);
  }

  /** Merge guest cart into user cart upon login */
  async mergeCarts(userId: string, sessionId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await this.getOrCreateCart(userId);

    for (const item of guestCart.items) {
      const existing = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId_fulfillmentType: {
            cartId: userCart.id,
            productId: item.productId,
            fulfillmentType: item.fulfillmentType,
          },
        },
      });

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            fulfillmentType: item.fulfillmentType,
          },
        });
      }
    }

    // Remove guest cart
    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }
}
