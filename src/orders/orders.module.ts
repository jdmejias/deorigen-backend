import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PdfService } from './pdf.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService, PdfService],
  exports: [OrdersService],
})
export class OrdersModule {}
