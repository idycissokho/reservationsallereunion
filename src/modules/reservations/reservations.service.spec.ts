import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReservationStatus, AuditAction } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '@prisma/prisma.service';
import { AuditService } from '@modules/audit/audit.service';
import { ResourceMutex } from '@common/concurrency';

const mockRole = {
  id: 'role-1',
  name: 'USER',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockAdminRole = { ...mockRole, id: 'role-2', name: 'ADMIN' };

const mockUser = {
  id: 'user-1',
  email: 'user@test.com',
  password: 'hashed',
  firstName: 'Jean',
  lastName: 'Dupont',
  isActive: true,
  roleId: 'role-1',
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: mockRole,
};

const mockAdmin = {
  ...mockUser,
  id: 'admin-1',
  roleId: 'role-2',
  role: mockAdminRole,
};

const mockRoom = {
  id: 'room-1',
  name: 'Salle Einstein',
  description: null,
  capacity: 20,
  location: null,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h
const futureEnd = new Date(Date.now() + 4 * 60 * 60 * 1000); // +4h

const mockReservation = {
  id: 'resa-1',
  title: 'Réunion',
  reason: 'Point équipe',
  startTime: futureStart,
  endTime: futureEnd,
  status: ReservationStatus.PENDING,
  roomId: 'room-1',
  userId: 'user-1',
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTx = {
  room: { findUnique: jest.fn() },
  reservation: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  auditLog: { create: jest.fn() },
};

const mockPrisma = {
  reservation: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockTx)),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

const mockMutex = {
  acquire: jest.fn((_, fn) => fn()),
};

describe('ReservationsService', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ResourceMutex, useValue: mockMutex },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
    mockMutex.acquire.mockImplementation((_, fn) => fn());
    mockPrisma.$transaction.mockImplementation((fn) => fn(mockTx));
  });

  describe('create — Règles métier', () => {
    it('RG-01 : lève BadRequest si startTime < 1h dans le futur', async () => {
      const pastStart = new Date(Date.now() + 30 * 60 * 1000); // +30min
      const pastEnd = new Date(Date.now() + 90 * 60 * 1000);

      await expect(
        service.create(
          {
            title: 'Test',
            reason: 'Test',
            startTime: pastStart.toISOString(),
            endTime: pastEnd.toISOString(),
            roomId: 'room-1',
          },
          mockUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('RG-01 : lève BadRequest si startTime dans le passé', async () => {
      const pastStart = new Date(Date.now() - 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() + 60 * 60 * 1000);

      await expect(
        service.create(
          {
            title: 'Test',
            reason: 'Test',
            startTime: pastStart.toISOString(),
            endTime: pastEnd.toISOString(),
            roomId: 'room-1',
          },
          mockUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequest si endTime <= startTime', async () => {
      await expect(
        service.create(
          {
            title: 'Test',
            reason: 'Test',
            startTime: futureEnd.toISOString(),
            endTime: futureStart.toISOString(),
            roomId: 'room-1',
          },
          mockUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('RG-02 : lève NotFoundException si salle indisponible', async () => {
      mockTx.room.findUnique.mockResolvedValue({
        ...mockRoom,
        isAvailable: false,
      });

      await expect(
        service.create(
          {
            title: 'Test',
            reason: 'Test',
            startTime: futureStart.toISOString(),
            endTime: futureEnd.toISOString(),
            roomId: 'room-1',
          },
          mockUser as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('RG-03 : lève BadRequest si créneau en conflit', async () => {
      mockTx.room.findUnique.mockResolvedValue(mockRoom);
      mockTx.reservation.findFirst.mockResolvedValue(mockReservation);

      await expect(
        service.create(
          {
            title: 'Test',
            reason: 'Test',
            startTime: futureStart.toISOString(),
            endTime: futureEnd.toISOString(),
            roomId: 'room-1',
          },
          mockUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée la réservation et génère un audit log', async () => {
      mockTx.room.findUnique.mockResolvedValue(mockRoom);
      mockTx.reservation.findFirst.mockResolvedValue(null);
      mockTx.reservation.create.mockResolvedValue(mockReservation);
      mockTx.auditLog.create.mockResolvedValue({});

      const result = await service.create(
        {
          title: 'Réunion',
          reason: 'Point équipe',
          startTime: futureStart.toISOString(),
          endTime: futureEnd.toISOString(),
          roomId: 'room-1',
        },
        mockUser as any,
      );

      expect(result).toBeDefined();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.CREATE }),
        mockTx,
      );
    });
  });

  describe('cancel — RG-07 + RG-08', () => {
    it("RG-07 : lève ForbiddenException si USER annule la réservation d'un autre", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        userId: 'autre-user',
      });

      await expect(
        service.cancel('resa-1', {}, mockUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lève BadRequest si réservation déjà annulée', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      });

      await expect(
        service.cancel('resa-1', {}, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('RG-08 : annule et crée un audit log', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.reservation.update.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      });

      await service.cancel(
        'resa-1',
        { cancelReason: 'Reportée' },
        mockUser as any,
      );

      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReservationStatus.CANCELLED,
          }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.CANCEL }),
      );
    });

    it("ADMIN peut annuler la réservation d'un autre utilisateur", async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        userId: 'autre-user',
      });
      mockPrisma.reservation.update.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      });

      await expect(
        service.cancel('resa-1', {}, mockAdmin as any),
      ).resolves.not.toThrow();
    });
  });

  describe('confirm', () => {
    it('confirme une réservation PENDING', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.reservation.update.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      });

      const result = await service.confirm('resa-1');

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
    });

    it('lève BadRequest si réservation déjà confirmée', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      });

      await expect(service.confirm('resa-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove — RG-09', () => {
    it('soft delete via deletedAt', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.reservation.update.mockResolvedValue({
        ...mockReservation,
        deletedAt: new Date(),
      });

      await service.remove('resa-1', mockUser as any);

      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
