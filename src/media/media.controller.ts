import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MediaService } from './media.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Subir archivo (imagen/video)' })
  @ApiConsumes('multipart/form-data')
  async upload(
    @Req() req: any,
    @Query('farmerId') farmerId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    const data = await req.file();
    if (!data) {
      return { error: 'No se recibió ningún archivo' };
    }

    return this.mediaService.uploadFile(data, {
      farmerId,
      productId,
      type,
    });
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Media de un producto' })
  findByProduct(@Param('productId') productId: string) {
    return this.mediaService.findByProduct(productId);
  }

  @Get('farmer/:farmerId')
  @ApiOperation({ summary: 'Media de un productor' })
  findByFarmer(@Param('farmerId') farmerId: string) {
    return this.mediaService.findByFarmer(farmerId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar media (admin)' })
  remove(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
