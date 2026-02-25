import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('cart')
@Public() // Cart works for guests too
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  private ids(user: any, sessionId?: string) {
    return {
      userId: user?.id as string | undefined,
      sessionId: !user?.id ? sessionId : undefined,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Obtener carrito' })
  @ApiHeader({ name: 'x-session-id', required: false })
  getCart(
    @CurrentUser() user: any,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cartService.getCart(userId, sid);
  }

  @Post('items')
  @ApiOperation({ summary: 'Añadir producto al carrito' })
  @ApiHeader({ name: 'x-session-id', required: false })
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: any,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cartService.addItem(dto, userId, sid);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad de item' })
  @ApiHeader({ name: 'x-session-id', required: false })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: any,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cartService.updateItem(itemId, dto, userId, sid);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item del carrito' })
  @ApiHeader({ name: 'x-session-id', required: false })
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cartService.removeItem(itemId, userId, sid);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  @ApiHeader({ name: 'x-session-id', required: false })
  clearCart(
    @CurrentUser() user: any,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const { userId, sessionId: sid } = this.ids(user, sessionId);
    return this.cartService.clearCart(userId, sid);
  }
}
