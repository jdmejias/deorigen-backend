import { Module } from '@nestjs/common';
import { LeadsController, SupportController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [LeadsController, SupportController],
  providers: [LeadsService],
})
export class LeadsModule {}
