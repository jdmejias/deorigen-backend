import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BulkIdsDto } from '../common/dto/bulk.dto.js';

@ApiTags('admin/withdrawals')
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar retiros (admin)' })
  findAll() {
    // INV-02: Admin can view bankAccountInfo; safe select on user prevents exposing passwordHash etc.
    return this.prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        bankAccountInfo: true,  // visible to ADMIN only (needed to process transfer)
        createdAt: true,
        farmer: {
          select: {
            id: true,
            slug: true,
            region: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar y pagar retiro' })
  async approveWithdrawal(@Param('id') id: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal || withdrawal.status !== 'PENDING') throw new Error('Invalid withdrawal');
    
    return this.prisma.$transaction(async (tx) => {
      // mark paid
      const updated = await tx.withdrawal.update({
        where: { id },
        data: { status: 'PAID' }
      });
      // substract frozen balance
      await tx.farmerProfile.update({
        where: { id: withdrawal.farmerId },
        data: { lockedBalance: { decrement: withdrawal.amount } }
      });
      return updated;
    });
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rechazar retiro' })
  async rejectWithdrawal(@Param('id') id: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal || withdrawal.status !== 'PENDING') throw new Error('Invalid withdrawal');
    
    return this.prisma.$transaction(async (tx) => {
      // mark rejected
      const updated = await tx.withdrawal.update({
        where: { id },
        data: { status: 'REJECTED' }
      });
      // restore balance
      await tx.farmerProfile.update({
        where: { id: withdrawal.farmerId },
        data: { 
          lockedBalance: { decrement: withdrawal.amount },
          availableBalance: { increment: withdrawal.amount }
        }
      });
      return updated;
    });
  }

  // ADM-03: Bulk approve withdrawals
  @Patch('bulk-approve')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar retiros en bulk (admin)' })
  async bulkApprove(@Body() dto: BulkIdsDto) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { id: { in: dto.ids }, status: 'PENDING' },
    });
    if (!withdrawals.length) return { updated: 0 };

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.withdrawal.updateMany({
        where: { id: { in: dto.ids }, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      // Deduct locked balance for each farmer
      for (const w of withdrawals) {
        await tx.farmerProfile.update({
          where: { id: w.farmerId },
          data: { lockedBalance: { decrement: w.amount } },
        });
      }
      return { updated: result.count, action: 'approved' };
    });
  }
}
