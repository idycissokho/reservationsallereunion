import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'create' })
  @IsString()
  action: string;

  @ApiProperty({ example: 'reservation' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ example: 'Créer une réservation' })
  @IsOptional()
  @IsString()
  description?: string;
}
