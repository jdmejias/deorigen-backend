import { Module } from '@nestjs/common';
import {
  ProductsController,
  CategoriesController,
  BrandsController,
} from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  controllers: [ProductsController, CategoriesController, BrandsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
