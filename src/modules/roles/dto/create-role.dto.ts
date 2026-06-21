import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'ADMIN' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Administrateur système' })
  @IsOptional()
  @IsString()
  description?: string;
}
