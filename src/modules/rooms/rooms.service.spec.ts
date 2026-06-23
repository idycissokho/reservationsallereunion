import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '@prisma/prisma.service';

const mockRoom = {
  id: 'room-1',
  name: 'Salle Einstein',
  description: 'Grande salle',
  capacity: 20,
  location: 'Bât A',
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  room: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crée une salle avec succès', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);
      mockPrisma.room.create.mockResolvedValue(mockRoom);

      const result = await service.create({
        name: 'Salle Einstein',
        capacity: 20,
      });

      expect(result).toBeDefined();
      expect(mockPrisma.room.create).toHaveBeenCalled();
    });

    it('lève ConflictException si nom déjà utilisé', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);

      await expect(
        service.create({ name: 'Salle Einstein', capacity: 20 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retourne les salles disponibles', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isAvailable: true }),
        }),
      );
    });

    it('filtre par capacité minimale', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);

      await service.findAll({ minCapacity: 10 });

      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ capacity: { gte: 10 } }),
        }),
      );
    });

    it('filtre par disponibilité sur un créneau', async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);
      const start = new Date('2026-12-01T09:00:00Z');
      const end = new Date('2026-12-01T11:00:00Z');

      await service.findAll({ startTime: start, endTime: end });

      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reservations: expect.any(Object) }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('retourne une salle existante', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);

      const result = await service.findOne('room-1');

      expect(result).toBeDefined();
    });

    it('lève NotFoundException si salle introuvable', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('met à jour une salle existante', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.room.update.mockResolvedValue({ ...mockRoom, capacity: 30 });

      const result = await service.update('room-1', { capacity: 30 });

      expect(result.capacity).toBe(30);
    });

    it('lève ConflictException si nouveau nom déjà pris', async () => {
      mockPrisma.room.findUnique
        .mockResolvedValueOnce(mockRoom)
        .mockResolvedValueOnce({ ...mockRoom, id: 'room-2' });

      await expect(
        service.update('room-1', { name: 'Salle Einstein' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('désactive la salle (soft delete)', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.room.update.mockResolvedValue({
        ...mockRoom,
        isAvailable: false,
      });

      await service.remove('room-1');

      expect(mockPrisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isAvailable: false } }),
      );
    });
  });
});
