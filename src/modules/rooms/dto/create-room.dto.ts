import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Salle Einstein' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Salle de conférence principale' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: 'Bâtiment A - 2ème étage' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
