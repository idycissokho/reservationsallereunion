import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard, RolesGuard } from '@common/guards';
import { AppRole, CurrentUser, Roles } from '@common/decorators';
import { UserWithRole } from '@modules/users/interfaces';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  ReservationFilterDto,
} from './dto';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: UserWithRole) {
    return this.reservationsService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() filter: ReservationFilterDto,
    @CurrentUser() user: UserWithRole,
  ) {
    return this.reservationsService.findAll(filter, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserWithRole) {
    return this.reservationsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: UserWithRole,
  ) {
    return this.reservationsService.update(id, dto, user);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  confirm(@Param('id') id: string) {
    return this.reservationsService.confirm(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  reject(@Param('id') id: string) {
    return this.reservationsService.reject(id);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: UserWithRole,
  ) {
    return this.reservationsService.cancel(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: UserWithRole) {
    return this.reservationsService.remove(id, user);
  }
}
