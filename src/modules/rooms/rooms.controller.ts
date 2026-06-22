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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard, RolesGuard } from '@common/guards';
import { AppRole, Roles } from '@common/decorators';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, RoomFilterDto } from './dto';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Get()
  findAll(@Query() filter: RoomFilterDto) {
    return this.roomsService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
