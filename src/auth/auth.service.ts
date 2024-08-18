// src/auth/auth.service.ts

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import * as crypto from 'crypto';
import { PrismaService } from '../common/services/prisma.service';
import { EmailService } from '../common/services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegistrationDto } from './dto/registration.dto';
import { OtpDto } from './dto/otp.dto';

@Injectable()
export class AuthService {
  private email: any;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  generateTokens(email: string) {
    return {
      access_token: this.jwtService.sign({ email }),
      refresh_token: this.jwtService.sign({ email }, { expiresIn: '7d' }),
    };
  }

  async login(user: LoginDto) {
    const existsUser = await this.prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existsUser) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = bcrypt.compare(
      user.password,
      existsUser.password,
    ) as boolean;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }
    delete existsUser.password;
    delete existsUser.refreshToken;
    const payload = { email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: existsUser,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async register(registrationDto: RegistrationDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registrationDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Generate OTP and save it
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // OTP expires in 15 minutes

    await this.prisma.otp.create({
      data: {
        email: registrationDto.email,
        hashedData: JSON.stringify(registrationDto),
        otp,
        expiresAt,
        verified: false,
      },
    });
    // Send OTP email
    await this.emailService.sendOtp(registrationDto.email, otp);

    return {
      message: `We send a otp in this email ${registrationDto.email}. Please verify it to complete registration.`,
    };
  }

  async verifyOtp(otpDto: OtpDto) {
    try {
      const record = await this.prisma.otp.findFirst({
        where: { otp: otpDto.otp },
        orderBy: { createdAt: 'desc' },
      });

      if (!record || record.expiresAt < new Date() || record.verified) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      const { email, password, name } = JSON.parse(
        record.hashedData,
      ) as RegistrationDto;

      const tokens = this.generateTokens(email);

      //Create user after OTP verification
      const hashedPassword = await this.hashPassword(password); // Just an example, use the real password
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name,
          role: 'USER',
          verified: true,
          refreshToken: tokens.refresh_token,
          // Other user fields
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,

          password: false,
          verified: false,
          refreshToken: false,
        },
      });

      await this.prisma.otp.delete({
        where: { id: record.id },
      });

      return {
        accessToken: tokens.access_token,
        reFreshToken: tokens.refresh_token,
        user: user,
      };
    } catch (err) {
      console.log(err);
    }
  }
}
