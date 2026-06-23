import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

type PrismaClient = PrismaService | Prisma.TransactionClient;

interface LogParams {
  action: AuditAction;
  entity: string;
  entityId: string;
  userId: string;
  reservationId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams, client?: PrismaClient): Promise<void> {
    const db = client ?? this.prisma;
    await db.auditLog.create({ data: params });
  }
}
