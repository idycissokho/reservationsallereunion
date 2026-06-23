import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto';
import { UserWithRole } from './interfaces';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserWithRole> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
      include: { role: true },
      omit: { password: true, refreshToken: true },
    });
  }

  async findAll(): Promise<UserWithRole[]> {
    return this.prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      omit: { password: true, refreshToken: true },
    });
  }

  async findOne(id: string): Promise<UserWithRole> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
      omit: { password: true, refreshToken: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserWithRole> {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: true },
      omit: { password: true, refreshToken: true },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
