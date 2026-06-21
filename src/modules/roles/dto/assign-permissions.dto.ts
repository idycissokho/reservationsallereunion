import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ type: [String], example: ['uuid-permission-1', 'uuid-permission-2'] })
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}
