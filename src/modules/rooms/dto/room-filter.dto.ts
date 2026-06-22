import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class RoomFilterDto {
  @ApiPropertyOptional({ example: '2025-06-01T09:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional({ example: '2025-06-01T11:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;
}
