import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return { ok: true, name: 'deorigen-api', ts: new Date().toISOString() };
  }
}