import { Module } from '@nestjs/common';
import { FarmersController } from './farmers.controller.js';
import { AdminWithdrawalsController } from './withdrawals.controller.js';
import { FarmersService } from './farmers.service.js';

@Module({
  controllers: [FarmersController, AdminWithdrawalsController],
  providers: [FarmersService],
  exports: [FarmersService],
})
export class FarmersModule {}
