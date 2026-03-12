import { Module } from '@nestjs/common';
import { FarmersController } from './farmers.controller.js';
import { AdminWithdrawalsController } from './withdrawals.controller.js';
import { FarmersService } from './farmers.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [FarmersController, AdminWithdrawalsController],
  providers: [FarmersService],
  exports: [FarmersService],
})
export class FarmersModule {}
