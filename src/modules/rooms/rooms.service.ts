import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto, RoomFilterDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    const existing = await this.prisma.room.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`La salle "${dto.name}" existe déjà`);
    }

    return this.prisma.room.create({ data: dto });
  }

  async findAll(filter: RoomFilterDto) {
    const where: Prisma.RoomWhereInput = {
      isAvailable: true,
    };

    if (filter.minCapacity) {
      where.capacity = { gte: filter.minCapacity };
    }

    // RG-02 : exclure les salles ayant une réservation en conflit sur la période
    if (filter.startTime && filter.endTime) {
      where.reservations = {
        none: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          AND: [
            { startTime: { lt: filter.endTime } },
            { endTime: { gt: filter.startTime } },
          ],
        },
      };
    }

    return this.prisma.room.findMany({ where });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });

    if (!room) {
      throw new NotFoundException('Salle introuvable');
    }

    return room;
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.room.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Le nom "${dto.name}" est déjà utilisé`);
      }
    }

    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.room.update({
      where: { id },
      data: { isAvailable: false },
    });
  }
}
