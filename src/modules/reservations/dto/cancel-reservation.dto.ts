import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelReservationDto {
  @ApiPropertyOptional({ example: 'Réunion reportée' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
