import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@prisma/prisma.service';
import { AuditService } from '@modules/audit/audit.service';

const mockUser = {
  id: 'user-1',
  email: 'admin@test.com',
  password: 'hashed',
  firstName: 'Admin',
  lastName: 'Test',
  isActive: true,
  roleId: 'role-1',
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: {
    id: 'role-1',
    name: 'ADMIN',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
};

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('secret'),
};

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('retourne les tokens si les identifiants sont valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        email: 'admin@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN }),
      );
    });

    it('lève UnauthorizedException si utilisateur introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inconnu@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si utilisateur inactif', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({ email: 'admin@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si mot de passe incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('retourne de nouveaux tokens', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.refresh(mockUser as any);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout', () => {
    it('efface le refreshToken en base', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.logout('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGOUT }),
      );
    });
  });
});
