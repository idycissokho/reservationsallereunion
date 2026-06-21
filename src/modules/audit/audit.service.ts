import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

interface LogParams {
  action: AuditAction;
  entity: string;
  entityId: string;
  userId: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams): Promise<void> {
    await this.prisma.auditLog.create({ data: params });
  }
}
