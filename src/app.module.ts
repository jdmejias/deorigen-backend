import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { UsersModule } from './users/users.module.js';
import { FarmersModule } from './farmers/farmers.module.js';
import { ProductsModule } from './products/products.module.js';
import { CartModule } from './cart/cart.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PartnersModule } from './partners/partners.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { MediaModule } from './media/media.module.js';
import { EmailModule } from './email/email.module.js';
import { PostsModule } from './posts/posts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FarmersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PartnersModule,
    LeadsModule,
    ProjectsModule,
    PaymentsModule,
    MediaModule,
    EmailModule,
    PostsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global JWT guard — every route requires auth unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}