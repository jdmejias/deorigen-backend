import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto } from './dto/auth.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    let exists: any;
    try {
      exists = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
    } catch (err) {
      this.logger.error('Database unreachable during register', err);
      throw new InternalServerErrorException(
        'No se pudo conectar a la base de datos. ¿Está corriendo PostgreSQL?',
      );
    }
    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Only admins can create ADMIN or PARTNER roles (handled at controller level)
    const role = dto.role ?? Role.BUYER;

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          phone: dto.phone,
          role,
        },
        select: { id: true, email: true, name: true, role: true },
      });

      const token = this.signToken(user.id, user.email, user.role);
      return { accessToken: token, user };
    } catch (err) {
      this.logger.error('Database error during user creation', err);
      throw new InternalServerErrorException(
        'Error al crear el usuario en la base de datos.',
      );
    }
  }

  async login(dto: LoginDto) {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
    } catch (err) {
      this.logger.error('Database unreachable during login', err);
      throw new InternalServerErrorException(
        'No se pudo conectar a la base de datos. ¿Está corriendo PostgreSQL?',
      );
    }

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    const token = this.signToken(user.id, user.email, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatar: true,
          locale: true,
          createdAt: true,
        },
      });
    } catch (err) {
      this.logger.error('Database unreachable during getProfile', err);
      throw new InternalServerErrorException(
        'No se pudo conectar a la base de datos.',
      );
    }
  }

  private signToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}
