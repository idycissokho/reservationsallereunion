import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { AuditModule } from '@modules/audit/audit.module';
import { ResourceMutex } from '@common/concurrency';

@Module({
  imports: [AuditModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ResourceMutex],
  exports: [ReservationsService],
})
export class ReservationsModule {}
