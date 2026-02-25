import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { CreateCheckoutDto } from './dto/payments.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Post('checkout')
  @ApiOperation({ summary: 'Iniciar pago para un pedido' })
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(dto);
  }

  @Public()
  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Webhook de pago (provider: stripe, paypal, etc.)' })
  webhook(
    @Param('provider') provider: string,
    @Body() body: any,
  ) {
    const externalId = body.id || body.externalId || '';
    const status = body.status || body.type || '';
    return this.paymentsService.handleWebhook(provider, externalId, status, body);
  }

  @Get('transaction/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener transacción por ID' })
  getTransaction(@Param('id') id: string) {
    return this.paymentsService.getTransaction(id);
  }

  @Patch('confirm/:paymentId')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Confirmar pago manualmente (admin)' })
  confirmManual(@Param('paymentId') paymentId: string) {
    return this.paymentsService.confirmManual(paymentId);
  }

  @Get('qr/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar QR para un pedido' })
  generateQR(@Param('orderId') orderId: string) {
    return this.paymentsService.generateQR(orderId);
  }
}
