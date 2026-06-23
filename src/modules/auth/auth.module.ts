import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy, JwtRefreshStrategy } from './strategies';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), AuditModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
