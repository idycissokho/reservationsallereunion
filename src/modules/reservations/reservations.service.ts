import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { AuditAction, ReservationStatus, Prisma } from '@prisma/client';
import { UserWithRole } from '@modules/users/interfaces';
import { AppRole } from '@common/decorators';
import { AuditService } from '@modules/audit/audit.service';
import { CreateReservationDto, CancelReservationDto, ReservationFilterDto } from './dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateReservationDto, user: UserWithRole) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (end <= start) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (start < oneHourFromNow) {
      throw new BadRequestException('La réservation doit être effectuée au minimum 1 heure avant le début');
    }

    // Vérifier que la salle existe et est disponible
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room || !room.isAvailable) {
      throw new NotFoundException('Salle introuvable ou indisponible');
    }

    // RG-02 : vérifier conflit de créneau
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        roomId: dto.roomId,
        deletedAt: null,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
    });

    if (conflict) {
      throw new BadRequestException('La salle est déjà réservée sur ce créneau');
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        title: dto.title,
        reason: dto.reason,
        startTime: start,
        endTime: end,
        roomId: dto.roomId,
        userId: user.id,
      },
      include: { room: true, user: { omit: { password: true, refreshToken: true } } },
    });

    await this.audit.log({
      action: AuditAction.CREATE,
      entity: 'Reservation',
      entityId: reservation.id,
      userId: user.id,
      reservationId: reservation.id,
      metadata: { title: dto.title, roomId: dto.roomId, startTime: dto.startTime, endTime: dto.endTime },
    });

    return reservation;
  }

  async findAll(filter: ReservationFilterDto, user: UserWithRole) {
    const where: Prisma.ReservationWhereInput = { deletedAt: null };

    // Un USER ne voit que ses propres réservations
    if (user.role.name === AppRole.USER) {
      where.userId = user.id;
    } else if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.status) where.status = filter.status;
    if (filter.roomId) where.roomId = filter.roomId;
    if (filter.from || filter.to) {
      where.startTime = {};
      if (filter.from) where.startTime.gte = new Date(filter.from);
      if (filter.to) where.startTime.lte = new Date(filter.to);
    }

    return this.prisma.reservation.findMany({
      where,
      include: { room: true, user: { omit: { password: true, refreshToken: true } } },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, user: UserWithRole) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id, deletedAt: null },
      include: { room: true, user: { omit: { password: true, refreshToken: true } } },
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (user.role.name === AppRole.USER && reservation.userId !== user.id) {
      throw new ForbiddenException('Accès refusé');
    }

    return reservation;
  }

  async confirm(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id, deletedAt: null },
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Seules les réservations PENDING peuvent être confirmées');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CONFIRMED },
      include: { room: true, user: { omit: { password: true, refreshToken: true } } },
    });

    await this.audit.log({
      action: AuditAction.UPDATE,
      entity: 'Reservation',
      entityId: id,
      userId: updated.userId,
      reservationId: id,
      metadata: { status: ReservationStatus.CONFIRMED },
    });

    return updated;
  }

  async reject(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id, deletedAt: null },
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Seules les réservations PENDING peuvent être rejetées');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.REJECTED },
      include: { room: true, user: { omit: { password: true, refreshToken: true } } },
    });

    await this.audit.log({
      action: AuditAction.UPDATE,
      entity: 'Reservation',
      entityId: id,
      userId: updated.userId,
      reservationId: id,
      metadata: { status: ReservationStatus.REJECTED },
    });

    return updated;
  }

  async cancel(id: string, dto: CancelReservationDto, user: UserWithRole) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id, deletedAt: null },
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (user.role.name === AppRole.USER && reservation.userId !== user.id) {
      throw new ForbiddenException('Accès refusé');
    }

    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.REJECTED
    ) {
      throw new BadRequestException('Cette réservation est déjà annulée ou rejetée');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: user.id,
        cancelReason: dto.cancelReason,
      },
      include: { room: true, user: { omit: { password: true, refreshToken: true } } },
    });

    await this.audit.log({
      action: AuditAction.CANCEL,
      entity: 'Reservation',
      entityId: id,
      userId: user.id,
      reservationId: id,
      metadata: { cancelReason: dto.cancelReason },
    });

    return updated;
  }

  async remove(id: string, user: UserWithRole) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id, deletedAt: null },
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (user.role.name === AppRole.USER && reservation.userId !== user.id) {
      throw new ForbiddenException('Accès refusé');
    }

    await this.prisma.reservation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      action: AuditAction.DELETE,
      entity: 'Reservation',
      entityId: id,
      userId: user.id,
      reservationId: id,
    });
  }
}
