import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { CurrentUser } from '@common/decorators';
import { JwtAccessGuard, JwtRefreshGuard } from '@common/guards';
import { UserWithRole } from '@modules/users/interfaces';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  refresh(@Body() _dto: RefreshTokenDto, @CurrentUser() user: UserWithRole) {
    return this.authService.refresh(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }
}
