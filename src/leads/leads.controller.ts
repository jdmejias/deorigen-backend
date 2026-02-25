import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LeadsService } from './leads.service.js';
import {
  CreateLeadDto,
  CreateSupportTicketDto,
  UpdateTicketStatusDto,
} from './dto/leads.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

/* ── Leads (mayorista / participar) ── */
@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Enviar lead (mayorista/participar)' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar leads (admin)' })
  findAll(
    @Query('type') type: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.leadsService.findAllLeads(type, pagination);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Marcar lead como leído' })
  markRead(@Param('id') id: string) {
    return this.leadsService.markLeadRead(id);
  }
}

/* ── Support Tickets ── */
@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private leadsService: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Crear ticket de soporte (apoyo)' })
  create(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.createTicket(dto, user?.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar tickets (admin)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.leadsService.findAllTickets(pagination);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar estado de ticket' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.leadsService.updateTicketStatus(id, dto);
  }
}
