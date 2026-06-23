import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard, RolesGuard } from '@common/guards';
import { Roles, AppRole } from '@common/decorators';
import { RolesService } from './roles.service';
import {
  AssignPermissionsDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(AppRole.ADMIN)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── Roles ───────────────────────────────────────────────────────────────

  @Post()
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Get()
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  findOneRole(@Param('id') id: string) {
    return this.rolesService.findOneRole(id);
  }

  @Put(':id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRole(@Param('id') id: string) {
    return this.rolesService.removeRole(id);
  }

  @Put(':id/permissions')
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto);
  }

  // ─── Permissions ─────────────────────────────────────────────────────────

  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rolesService.createPermission(dto);
  }

  @Get('permissions/all')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePermission(@Param('id') id: string) {
    return this.rolesService.removePermission(id);
  }
}
