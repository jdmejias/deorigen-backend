import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root (works regardless of cwd)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import fstatic from '@fastify/static';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400, // Cache preflight for 24h — reduces OPTIONS calls
  });

  // Register multipart for file uploads
  await app.register(multipart as any, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  });

  // Serve uploaded files as static
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  await app.register(fstatic as any, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DeOrigen API')
    .setDescription(
      'API DeOrigen — Plataforma que conecta el campo colombiano con el mundo.\n\n' +
      'NestJS + Fastify + Prisma + PostgreSQL',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT ?? 3001}`, 'Local')
    .addServer('https://api.deorigencampesino.com', 'Producción')
    .build();

  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
bootstrap();