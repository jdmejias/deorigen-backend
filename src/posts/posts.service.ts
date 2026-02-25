import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto, UpdatePostDto } from './dto/posts.dto.js';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto.js';
import slugify from 'slugify';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAllPublic(pagination: PaginationDto) {
    const where = { isPublished: true };
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  async findAll(pagination: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.post.count(),
    ]);
    return new PaginatedResult(data, total, pagination.page!, pagination.limit!);
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException('Novedad no encontrada');
    return post;
  }

  async create(dto: CreatePostDto) {
    const slug = await this.uniqueSlug(
      slugify(dto.title, { lower: true, strict: true }),
    );
    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        imageUrl: dto.imageUrl,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Novedad no encontrada');

    const data: any = { ...dto };
    if (dto.title) {
      data.slug = await this.uniqueSlug(
        slugify(dto.title, { lower: true, strict: true }),
        id,
      );
    }
    if (dto.isPublished && !post.isPublished) {
      data.publishedAt = new Date();
    }

    return this.prisma.post.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.post.delete({ where: { id } });
    return { deleted: true };
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let counter = 0;
    while (true) {
      const existing = await this.prisma.post.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) break;
      counter++;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
