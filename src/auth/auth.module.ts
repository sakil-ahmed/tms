// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../common/services/prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, JwtStrategy, PrismaService, EmailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
