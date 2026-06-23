import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '@prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  email: 'jean@test.com',
  password: 'hashed',
  firstName: 'Jean',
  lastName: 'Dupont',
  isActive: true,
  roleId: 'role-1',
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: {
    id: 'role-1',
    name: 'USER',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crée un utilisateur avec mot de passe hashé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'jean@test.com',
        password: 'password123',
        firstName: 'Jean',
        lastName: 'Dupont',
        roleId: 'role-1',
      });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('lève ConflictException si email déjà utilisé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'jean@test.com',
          password: 'password123',
          firstName: 'Jean',
          lastName: 'Dupont',
          roleId: 'role-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('retourne un utilisateur existant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toBeDefined();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('lève NotFoundException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('change le mot de passe si valide', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed' as never);

      await service.changePassword('user-1', {
        currentPassword: 'password123',
        newPassword: 'newPassword123',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { password: 'new-hashed' } }),
      );
    });

    it('lève UnauthorizedException si mot de passe actuel incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève NotFoundException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('inexistant', {
          currentPassword: 'password123',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it("désactive l'utilisateur (soft delete)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await service.remove('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('lève NotFoundException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
