import { Module } from '@nestjs/common';
import {
  CountriesController,
  PartnersController,
  WarehousesController,
  InventoryController,
} from './partners.controller.js';
import { PartnersService } from './partners.service.js';

@Module({
  controllers: [
    CountriesController,
    PartnersController,
    WarehousesController,
    InventoryController,
  ],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
