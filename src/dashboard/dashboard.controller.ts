import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin/metrics')
  @Roles(Role.ADMIN)
  getAdminMetrics() {
    return this.dashboardService.getAdminMetrics();
  }

  @Get('admin/products')
  @Roles(Role.ADMIN)
  getAdminProducts() {
    return this.dashboardService.getAdminProducts();
  }

  @Get('farmer/summary')
  @Roles(Role.FARMER)
  getFarmerSummary(@CurrentUser('id') userId: string) {
    return this.dashboardService.getFarmerSummary(userId);
  }

  @Get('farmer/products')
  @Roles(Role.FARMER)
  getFarmerProducts(@CurrentUser('id') userId: string) {
    return this.dashboardService.getFarmerProducts(userId);
  }
}
