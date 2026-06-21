import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import {
  AssignPermissionsDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Roles ───────────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Le rôle "${dto.name}" existe déjà`);
    }

    return this.prisma.role.create({ data: dto });
  }

  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async findOneRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }

    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.findOneRole(id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async removeRole(id: string): Promise<void> {
    await this.findOneRole(id);
    await this.prisma.role.delete({ where: { id } });
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    await this.findOneRole(roleId);

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    await this.prisma.rolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });

    return this.findOneRole(roleId);
  }

  // ─── Permissions ─────────────────────────────────────────────────────────

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: { action_subject: { action: dto.action, subject: dto.subject } },
    });

    if (existing) {
      throw new ConflictException(
        `La permission "${dto.action}:${dto.subject}" existe déjà`,
      );
    }

    return this.prisma.permission.create({ data: dto });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany();
  }

  async removePermission(id: string): Promise<void> {
    const existing = await this.prisma.permission.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Permission introuvable');
    }

    await this.prisma.permission.delete({ where: { id } });
  }
}
