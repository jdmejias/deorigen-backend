import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
    this.baseUrl = this.config.get(
      'PUBLIC_UPLOADS_BASE_URL',
      'http://localhost:3001/uploads',
    );

    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadFile(
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream },
    options?: { farmerId?: string; productId?: string; type?: string },
  ) {
    const ext = path.extname(file.filename);
    const uniqueName = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadsDir, uniqueName);

    // Write file to disk
    const writeStream = fs.createWriteStream(filePath);
    await new Promise<void>((resolve, reject) => {
      (file.file as any).pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const url = `${this.baseUrl}/${uniqueName}`;
    const type = file.mimetype.startsWith('video') ? 'video' : 'image';

    const media = await this.prisma.media.create({
      data: {
        farmerId: options?.farmerId,
        productId: options?.productId,
        url,
        type: options?.type ?? type,
        altText: file.filename,
      },
    });

    return media;
  }

  async findByProduct(productId: string) {
    return this.prisma.media.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByFarmer(farmerId: string) {
    return this.prisma.media.findMany({
      where: { farmerId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async delete(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) return { deleted: false };

    // Try to remove file from disk
    try {
      const filename = media.url.split('/').pop();
      if (filename) {
        const filePath = path.join(this.uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not delete file for media ${id}`);
    }

    await this.prisma.media.delete({ where: { id } });
    return { deleted: true };
  }
}
