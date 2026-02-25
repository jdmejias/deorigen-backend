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
import { ProjectsService } from './projects.service.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateInvestmentDto,
} from './dto/projects.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar proyectos activos (público)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.projectsService.findAll(pagination);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Detalle de proyecto por slug (público)' })
  findBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Crear proyecto' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Actualizar proyecto' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Post('invest')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invertir en un proyecto' })
  invest(
    @Body() dto: CreateInvestmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.invest(dto, userId);
  }

  @Get('investments/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mis inversiones' })
  myInvestments(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.projectsService.getMyInvestments(userId, pagination);
  }
}
