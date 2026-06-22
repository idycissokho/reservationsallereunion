import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'Réunion hebdomadaire' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Point équipe' })
  @IsString()
  reason: string;

  @ApiProperty({ example: '2025-06-10T09:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2025-06-10T11:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'uuid-de-la-salle' })
  @IsUUID()
  roomId: string;
}
